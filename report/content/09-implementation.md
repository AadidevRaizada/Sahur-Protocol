---
num: 9
title: Implementation, Testing & Results
exp: Build & Results
kicker: One HTML file, one canvas, one log with a bat. Here is how it works and how we checked it.
shot: shots/16b-mobile-cutscene.png
objectives:
  - Describe the technology stack and the single-file architecture
  - Explain the game loop, the mode state machine and the core systems
  - Show how persistence, input, audio and accessibility are handled
  - Verify the build with black-box test cases derived from the use cases
  - Record the defects and limitations found, with suggested fixes
---

The previous chapters modelled Sahur Protocol from the outside. This chapter looks at the finished build: how it is put together, the main design decisions in the code, and how it was checked against the use cases of Chapter 5. All facts come from the source file `Sahur_Protocol.html` at its final commit in the project repository [@repo].

## Technology Stack

Sahur Protocol is delivered as **one self-contained HTML file**. Markup, styles and the whole game script sit inline, and the sprite frames and cutscene paintings are embedded as base64 data URIs. There is no engine, framework, package manager or build step; the source header reads "No build step, no dependencies. Just open the file." Rendering uses the HTML5 Canvas 2D API [@mdncanvas], and all music and sound effects except one choir recording are synthesised at run time with the Web Audio API [@mdnaudio].

::: stats
- 2,143 | Lines in the file
- 1,811 | Lines of JavaScript
- 81 | Function declarations
- 0 | Dependencies
:::

Table: Technology stack of the final build {#tbl:impl-stack}
| Layer | Choice in the build | Notes |
|---|---|---|
| Language | Vanilla JavaScript (ES2015+), HTML5, CSS3 | One inline `<script>` in strict mode |
| Rendering | Canvas 2D, fixed 960×540 logical size | CSS scales it to the window at 16:9 |
| Audio | Web Audio API synthesis + one MP3 | Sequencer, one-shot effects, choir |
| Persistence | `localStorage` | Run checkpoint and touch-control layout |
| Hosting | Vercel static deployment | `vercel.json` sets headers and a rewrite |
| Tooling | Any text editor, Chrome DevTools, Git, GitHub | No compiler or bundler needed |

The file weighs about 1.08 MB, almost all of it 13 embedded images; without them it is about 103 KB. Only the Google Fonts stylesheet and the 1.3 MB choir MP3 are fetched separately.

::: plain
Think of a game cartridge that is just a web page. Double-click it and it runs: no installer, no `npm install` that downloads half the internet. The whole game is one file you could email to a friend.
:::

## Architecture

The code is **data-driven and procedural**, with no ES6 classes and no prototypes. It is built from constant *data tables* that describe content, one global *run-state* object created by `newRun()`, and *functions* that read the tables and change the state. Adding content therefore means adding a table row rather than a new type, a common pattern in small games [@nystrom; @gregory]. Enemies, bullets and bosses are plain objects in arrays inside the run state. Chapter 7 maps each conceptual class of the class diagram onto these constructs. Banner comments divide the script into five regions: **DATA** (content tables such as `SKILLS`, `ENEMY_TYPES`, `BIOMES`, `BOSSES` and `CUTSCENES`), **SPRITE ASSETS** (the embedded images), **ENGINE** (audio, saving, input, menus, rooms and cutscenes), **UPDATE** (all simulation, in `update(dt)`) and **RENDER** (all drawing, in `render()`).

The screen has two layers. Gameplay and the HUD are drawn on the canvas every frame, while menus, cutscene dialogue, upgrade cards and end screens are HTML overlays stacked above it, which keeps text crisp and lets the browser handle buttons and taps.

## Game Loop and Timing

::: theory title="The game loop"
A game loop runs for as long as the game is open: each pass reads input, advances the simulation by the elapsed time and draws the result [@nystrom]. In a browser it is driven by `requestAnimationFrame()`, which calls back once per display refresh [@mdnraf]. The elapsed time `dt` can be used directly (a *variable* timestep), or the simulation can advance in constant slices (a *fixed* timestep), which is more repeatable but more complex [@fiedler].
:::

Sahur Protocol's `loop()` uses a variable timestep with a cap: `dt = min(0.033, elapsed)`. Each frame it advances the cutscene typewriter and panel, runs `update(dt)` only in `play` mode (or `tickBeats(dt)` during the finale), and always calls `render()`. Because of the cap, one frame can never move an entity further than one 30 FPS step: on a slow or stalled device the game *slows down* instead of letting bullets jump through the player. Since simulation runs only in `play`, pausing, reading a cutscene or choosing an upgrade freezes the world while it stays visible behind the overlay. Collision is circle-against-circle using `Math.hypot`.

::: plain
The cap is a seatbelt. If your laptop hiccups for half a second, a naive loop would teleport every bullet half a second forward and you would die without seeing why. With the cap, the game just runs in slow motion for a moment. Slightly odd, but fair.
:::

## Mode State Machine

The variable `mode` holds one of seven values and decides which input is accepted and which tick functions run. @tbl:impl-modes lists the transitions and the function that performs each one.

Table: Transitions of the `mode` state machine {#tbl:impl-modes}
| From | Trigger | To | Function |
|---|---|---|---|
| `title` | WAKE UP | `cutscene` (prologue) | `startGame()` |
| `title` | CONTINUE | `play` | `continueGame()` |
| `cutscene` | Last line advanced | next step of the script | callback of `playCut()` |
| `choose` | Card picked or skill claimed | `play` or `cutscene` | `openChoice()`, `openSkillRoll()` |
| `play` | Combat room cleared | `choose` | `checkClear()` |
| `play` | Biome boss reaches 0 HP | `cutscene` (biome end) | `onBossDown()` |
| `play` | Bubble in Phase 3 for 7 s | `cutscene`, then `beats` | `finalPhaseCheck()` |
| `play` | HP 0 and no revive left | `end` ("ABSORBED") | `gameOver()` |
| `play` ↔ `pause` | [[Esc]], II button or RESUME | `pause` / `play` | `pauseGame()`, `resumeGame()` |
| `pause` | MAIN MENU / RESTART RUN | `title` / `cutscene` | `goMainMenu()` / `startGame()` |
| `beats` | 1.6 s after the third TUNG | `cutscene` (epilogue) | `tickBeats()` |
| `end` | RETRY CHECKPOINT / AGAIN | `play` / `cutscene` | `continueGame()` / `startGame()` |

Cutscenes are chained with callbacks: `playCut(id, done)` calls `done` after the last line, which is how the prologue leads to the first upgrade and the epilogue to the victory screen.

## Combat and Entities

The player has 100 HP, moves at 225 px/s and swings a bat that hits **every** enemy within 80 px for 13 damage, with a 0.38 s cooldown; the swing is circular, so positioning matters more than aim. Each hit taken gives 0.7 s of invulnerability, and HP is checked on every hit. Sahur has no HP and cannot be hurt. He follows the player and performs the **TUNG** slam on his own countdown, dealing 26 damage to every enemy within 135 px. His cooldown is

> *cooldown* = max(2.2 s, (3.5 + 0.8 × *biome index*) × *skill multiplier* × *drain factor*)

which is about 3.5 s, 4.3 s and 5.1 s in the three biomes. In the final fight the drain factor stretches it to about 9.4 s in Phase 1 and 14.8 s in Phase 2, and in Phase 3 he stops. In the story he burns faster near the core; the code makes the player feel it.

Each enemy type is a row of `ENEMY_TYPES`, and one field, `ai`, selects its behaviour inside `update()` (@tbl:impl-enemies), so all six share one movement, collision and damage path. A combat room holds `5 + 2 × biome + room` enemies (63 per run), each entering from a random edge after a 0.7 s warning ring, and enemy HP is scaled by the biome (×1.0, ×1.35, ×1.7).

Table: Enemy behaviours, selected by the `ai` field {#tbl:impl-enemies}
| Enemy | AI type | Behaviour in one line |
|---|---|---|
| Slopling | chase | Walks straight at the player |
| Buzzword drone | shoot | Keeps 180–260 px away; aimed bullet every 2.1 s |
| Prompt wraith | dash | Drifts closer, then lunges at 420 px/s every 1.6 s |
| Scraper hand | grab | Red 0.45 s wind-up, then a grab at 520 px/s |
| Yes-man | orbit | Circles at 175 px; fires from safety every 2.6 s |
| Pivot golem | tank | Slow and heavy; splits into two sloplings on death |

Bosses from the `BOSSES` table cycle through their patterns in a fixed order, so they can be learned: Echo (320 HP), The Scraper (480 HP), The Valuation (560 HP, hurt only for 4 s after its big burst) and The AI Bubble (1,350 HP, three phases). Appendix B gives full statistics.

::: plain
The enemies are satire with hitboxes. The yes-man literally circles you agreeing and shoots from a safe distance. The Valuation cannot be hurt until it overextends itself, which is the most accurate thing anyone has said about a startup.
:::

## Upgrades and Progression

After every cleared combat room `openChoice()` offers up to **three distinct cards**, drawn by weighted random from unlocked, non-maxed skills. A skill's weight is its rarity score (1 to 5) plus its current level, so rarer and already-owned skills appear *more* often, helping a run build an identity. Each pick triggers `applySkillLoadout()`, which recomputes all stats while keeping the HP percentage.

Table: How skill upgrades are offered during a run {#tbl:impl-offers}
| Offer screen | When it appears | Cards | Per run |
|---|---|---|---|
| FIRST UPGRADE | After the prologue | 3 | 1 |
| CHOOSE AN UPGRADE | After each cleared combat room | up to 3 | 9 |
| SIGNAL ROLL | After each biome boss | 1 (animated) | 3 |
| FINAL UPGRADE | Before The AI Bubble | up to 3 | 1 |

The **Signal Roll** *unlocks* a skill instead of levelling one: a card cycles through the locked skills for 1.5 s and lands on one. Nine of the eleven skills start unlocked, so the first two rolls hand out the two legendaries (Second Wind and Borrowed Beat) and the third reports that every skill is in the pool.

:::: gallery cols="2"
::: figure src="shots/09c-signal-roll-unlock.png" id="impl-signal-roll" frame="crt"
Signal Roll after Echo, revealing the legendary skill *Second Wind*.
:::
::: figure src="shots/05b-final-upgrade.png" id="impl-final-upgrade" frame="crt"
The FINAL UPGRADE picker before The AI Bubble.
:::
::::

## Input, Touch and Orientation

Movement ([[W]] [[A]] [[S]] [[D]] or arrows) is read every frame and normalised; the swing ([[Space]] or [[J]]) fires on key-down only, so holding does not auto-attack, and the mouse never attacks. When the media query `(pointer:coarse)` detects a touch screen, a virtual joystick (or *Touch to move* mode) and a SWING button appear, with adjustable sizes and positions [@mdntouch]. In portrait a "ROTATE DEVICE" overlay appears, and `tryLandscapeLock()` requests full screen and a landscape lock [@mdnorientation]. Appendix A lists every control.

## Audio

The game has four audio sources (@tbl:impl-audio). All except the choir are generated in code with the Web Audio API [@mdnaudio], so the file needs no sound assets. Because browsers block audio until the user interacts, the title choir starts on the first key or pointer press. The tempo is purely atmospheric: nothing in `update()` reads the sequencer, and Sahur's TUNG runs on its own timer.

Table: The four audio sources {#tbl:impl-audio}
| Source | Technique | Used for |
|---|---|---|
| `Music` | Look-ahead sequencer: a 60 ms timer schedules 16-step patterns (62–142 BPM) | A track per biome, plus boss, core, dawn |
| `tone()`, `tung()` | One-shot oscillators with gain envelopes | Hits, menus and the bass TUNG |
| `SceneSound`, `typeBlip()` | Ambient pulse every 520 ms; a blip per character, pitched per speaker | Cutscene atmosphere and "talking" text |
| `ChoirMusic` | The one MP3, played through an `HTMLAudioElement` | Title loop and finale loop |

## Persistence

Progress is stored in `localStorage` [@mdnstorage] under two keys (@tbl:impl-storage). Saves are *checkpoints*: a loaded run restarts the saved room with the saved skills and HP, and a game over keeps the checkpoint. Every access is wrapped to catch exceptions, so a browser that blocks storage still runs the game.

Table: Keys written to `localStorage` {#tbl:impl-storage}
| Key | Holds | Written | Removed |
|---|---|---|---|
| `sahurProtocolRunV1` | Biome, room, skills, challenges, counters, HP | Room start, upgrade pick, Signal Roll, new challenge, biome change, final boss, pause, main menu | WAKE UP, RESTART RUN, victory |
| `sahurProtocolControlsV1` | Touch layout and move mode | Any control change | Never |

## Accessibility

@tbl:impl-a11y summarises accessibility, with WCAG 2.2 [@wcag22] as a reference, not a formal audit.

Table: Accessibility features and remaining gaps {#tbl:impl-a11y}
| Area | What the build does | Gap |
|---|---|---|
| Readable text | Verdana at 14–21 px on desktop; pixel font only for titles | No text-size or contrast option |
| Motion | `prefers-reduced-motion` stops CSS animation and cutscene pan | Canvas shake and flashes remain |
| Pacing | Cutscene text waits for the player | No skip-all |
| Sound | [[M]] mutes all four audio sources; master volume | Not remembered |
| Input | Keyboard, joystick or touch-to-move; adjustable layout | No remapping or gamepad |

## Deployment

The game is a static Vercel site [@vercel] with no server code: a root `index.html` redirects to the game, and `vercel.json` adds the settings in @tbl:impl-vercel.

Table: Settings in `vercel.json` {#tbl:impl-vercel}
| Setting | Value | Purpose |
|---|---|---|
| `cleanUrls` | `true` | Serve pages without `.html` |
| Header, all routes | `X-Content-Type-Options: nosniff` | Stop content-type guessing |
| Header, `*.mp3` | `Cache-Control: public, max-age=31536000, immutable` | Cache the choir for a year |
| Rewrite | `/` → `/Sahur_Protocol.html` | Open the game at the root |

The redirect uses both a meta refresh and `location.replace()`, with a plain link as fallback. The Git history has four commits: the game itself, the deployment files, and two rounds of mobile improvements (menus, orientation lock and the control switcher).

## Testing

::: theory title="Black-box testing"
Black-box (behavioural) testing checks a system against its specification without looking at its code. Test cases are derived from requirements or use cases: each main, alternate and exception flow suggests an input and an expected outcome, and the tester records what actually happens [@pressman; @sommerville].
:::

The test cases in @tbl:impl-tests were derived from the use cases and flows of Chapter 5 and the requirements of Chapters 3 and 4, and executed against the unmodified final build with a small black-box harness: a script that drives the game in headless Chrome through its own menus, keys and touch emulation, on a desktop viewport and on an emulated phone in landscape and portrait, and reads the game's state to record each outcome. Where a case needs a late point of a run (a boss, the finale), the harness fast-forwards through the game's own functions rather than playing every room. The script and its run log are kept with the report sources, so every verdict can be re-run. **Pass** means the observed behaviour matched the expected one, **Fail** means it did not, and **Observed** marks behaviour that is correct by the current specification but recorded as a limitation.

::: stats
- 14 | Test cases
- 11 | Pass
- 1 | Fail
- 2 | Observed
:::

Table: Black-box test cases derived from the use cases {#tbl:impl-tests}
| ID | Use case: scenario | Expected result | Observed result | Verdict |
|---|---|---|---|---|
| TC‑01 | Start New Game | Prologue, FIRST UPGRADE, room 1/3 | As expected | Pass |
| TC‑02 | Advance the prologue | 1st press completes line, 2nd advances | As expected; no skip-all | Pass |
| TC‑03 | Move and attack | 8-way move; one swing per tap | As expected; no auto-repeat | Pass |
| TC‑04 | Clear Room | Up to 3 distinct upgrade cards | As expected | Pass |
| TC‑05 | Fight Boss: Echo | Cutscene, Signal Roll, biome 2 | As expected; see D‑01 | Pass |
| TC‑06 | Fight Boss: Valuation | "NOT YET" until its big burst | Damage only in 4 s window | Pass |
| TC‑07 | Pause, resume, main menu | World freezes; CONTINUE shown | As expected | Pass |
| TC‑08 | Continue Game | Saved room, skills and HP | As expected | Pass |
| TC‑09 | New game over a save | Warning before overwriting | No prompt (D‑09) | Fail |
| TC‑10 | HP reaches 0 | ABSORBED; RETRY CHECKPOINT | As expected | Pass |
| TC‑11 | HP 0 with Second Wind | Revive at 50% HP | As expected | Pass |
| TC‑12 | Mute and volume | All audio silenced or scaled | Resets on reload (D‑10) | Observed |
| TC‑13 | Touch layout, then reload | Layout kept | As expected | Pass |
| TC‑14 | Phone in portrait | ROTATE DEVICE overlay | Play not paused (D‑07) | Observed |

Two further runs also passed: an end-to-end finale (sacrifice, the three-TUNG beats, epilogue and WE WON., after which the save is deleted and CONTINUE disappears), and a run with every `localStorage` call forced to fail, in which a new run, a room clear, an upgrade, pause and the main menu all worked with no uncaught errors.

::: plain
Testing a game means playing it with a clipboard, except here a script holds the clipboard and never gets bored. Eleven things worked exactly as the use cases said. One did not: the game wipes your save without asking. Two more work as built but deserve a fix, like the phone overlay that asks you to rotate while enemies keep chewing on you.
:::

### Defects and limitations

Reading the source alongside the test results produced the defect log in @tbl:impl-defects. **High** severity would block completing a run (none found), **Medium** harms usability, accessibility or design consistency, and **Low** is cosmetic, a wording issue or affects only maintainability.

Table: Defects and limitations found during testing and code review {#tbl:impl-defects}
| ID | Defect or limitation | Severity | Suggested fix |
|---|---|---|---|
| D‑01 | HUD shows "ROOM 4/3" during the post-boss Signal Roll | Low | Hide the room label after a boss |
| D‑02 | Bubble's name near-invisible on the white arena; old area label | Low | Dark label and a "THE CORE" name |
| D‑03 | Dawn track cancelled by `playCut()`; the choir plays on | Low | Start it in the epilogue callback |
| D‑04 | Dead code: `POWERUPS`, `roomHeal`, an unused web font | Low | Remove, or revive as a skill |
| D‑05 | Unlock challenges shown but never checked; no rewards | Medium | Gate the roll, or reword cards |
| D‑06 | "It costs him." and "Protect him" promise missing behaviour | Low | Implement it, or edit the text |
| D‑07 | ROTATE DEVICE overlay does not pause the game | Medium | Pause on turning to portrait |
| D‑08 | Reduced motion leaves canvas shake and flashes | Medium | Scale them by the motion flag |
| D‑09 | WAKE UP and RESTART RUN delete a save without asking | Medium | Confirm before overwriting |
| D‑10 | Mute and volume reset on every load | Low | Save them with the controls |

::: patch title="FOUND IN REVIEW"
No defect stops a player finishing the game, and most are small fixes. D‑08 (an accessibility gap for players sensitive to flashing) and D‑07 (damage the player cannot respond to) matter most.
:::

## Results

The final build meets the 21 functional requirements of Chapter 3, from new and continued runs through three biomes, eleven skills, eleven challenges and seven cutscenes to the scripted finale, checkpoints and full touch play, in one file that runs in a current browser without installation. @fig:impl-results shows the late game.

:::: gallery cols="2"
::: figure src="shots/21-cutscene-river.png" id="impl-river" frame="crt"
Biome 2 ending by the coolant river: Sahur explains why he burns faster near the core.
:::
::: figure src="shots/23-cutscene-sacrifice.png" id="impl-sacrifice" frame="crt"
The sacrifice cutscene before the three-TUNG finale.
:::
::: figure src="shots/12-bubble.png" id="impl-results" frame="crt"
The AI Bubble in the white core arena; the faint boss label at the top is defect D‑02.
:::
::: figure src="shots/09d-signal-roll-all-unlocked.png" id="impl-all-unlocked" frame="crt"
The third Signal Roll: every skill is now in the pool.
:::
::::

::: cleared
- Described the zero-dependency, single-file stack and its data-driven architecture, loop and state machine.
- Ran 14 use-case-derived black-box tests: 11 passed, 1 failed, 2 recorded as limitations.
- Logged 10 defects with severity and a fix each; none blocks a full run.
:::
