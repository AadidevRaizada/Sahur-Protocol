# Sahur Protocol: verified fact sheet

Source of truth: `Sahur_Protocol.html` at commit `a3e663a` (working tree identical), read in full through a copy with the data URIs stripped (`report/research/game-slim.html`, made by `report/research/scripts/slim.js`). Line numbers below refer to that file; they are the same in the original because each base64 blob sits on one line. Every number here comes from the code. Anything that is an inference is marked as one.

---

## 1. Overview

| Item | Fact |
|---|---|
| Title | `SAHUR PROTOCOL - prototype v0.2` (page `<title>`). The title screen shows "SAHUR PROTOCOL" with "TUNG TUNG TUNG" under it. |
| Genre as implemented | A **top-down 2D action roguelite** played in single-screen arenas. You clear rooms, pick upgrades after each room, fight a boss at the end of each biome, and finish with a scripted final boss and an ending. The source header calls it "A 2D roguelike: you + Tung Tung Tung Sahur vs. The AI Bubble." It is **not** a platformer (no gravity, no jump) and **not** a rhythm game (no timing input). |
| Perspective and movement | Top-down, free 8-direction movement inside a 960×540 arena. |
| Premise | The "feed" has taken over the world and The AI Bubble is consuming everything real. Sahur, a living wooden log with a bat, wakes the player and leads them through three biomes to "pop" the Bubble. At the core, Sahur sacrifices himself with three final TUNGs. In the epilogue the player wakes to a real dawn holding Sahur's bat. |
| Tone | Satire of AI and tech hype (enemy names include buzzword drones, yes-men and a "Valuation" boss), pixel-horror styling, and a sincere sacrifice ending. PRODUCT.md describes it as "Strange, urgent, heartfelt." |
| Speakers in cutscenes | `-` (narrator), `???`, `SAHUR`, `YOU`, `THE BUBBLE` |

**Characters**
- **The player ("YOU")**: unnamed. Drawn on the canvas as a cream circle (radius 15) with two eyes that face the movement direction.
- **Sahur (Tung Tung Tung Sahur)**: the companion. He is a wooden log with a bat, drawn from embedded PNG frames (3 idle, 4 attack, rendered at 92×92 px). He follows the player and hits automatically with a TUNG ground slam. He has no HP and cannot be hurt. He disappears after the finale.
- **Biome bosses**: ECHO, THE ENGAGEMENT WRAITH; THE SCRAPER; THE VALUATION.
- **The AI Bubble**: the final boss. On its HP bar it is named "THE AI BUBBLE"; in dialogue the speaker is "THE BUBBLE". It is an iridescent sphere with an "almost-right" face.
- **Enemies**: slopling, drone (buzzword drone), wraith (prompt wraith), hand (scraper hand), yesman (yes-man), golem (pivot golem).

Short quotes, if you need them: Sahur's last line is "Hey. It was a good walk." The victory screen reads "WE WON." / "BUT AT WHAT COST."

---

## 2. Tech stack and architecture

| Aspect | Fact (code reference) |
|---|---|
| Delivery | **One HTML file**, 1,083,785 bytes and 2,143 lines. Inline `<style>` and one inline classic `<script>` with `"use strict"`. No engine, no framework, no build step, no npm dependencies. The header comment says "No build step, no dependencies. Just open the file." |
| Language | Vanilla JavaScript (ES2015+: `const`/`let`, arrow functions, template literals, `Set`, spread), HTML5 and CSS3. |
| Code size | About 1,811 lines of JS (L329–2139), about 170 lines of CSS and about 130 lines of HTML. There are **81 named `function` declarations** plus **20 object-literal methods** (`Music` 8, `SceneSound` 6, `ChoirMusic` 6), so about 101 named routines, plus many inline arrow handlers. Without the base64 assets the file is about 103 KB. |
| Structure | The code is data-driven and procedural. There are **no ES6 classes** and no prototypes. It is made of data tables, one global run-state object, plain-object entities in arrays, and three singleton audio objects. Sections are marked with `==== DATA`, `==== SPRITE ASSETS`, `==== ENGINE`, `==== UPDATE` and `==== RENDER` banners. |
| Data tables | `POWERUPS` (legacy and **unused**), `RARITY_SCORE`, `SKILLS` (11), `DEFAULT_UNLOCKED_SKILLS` (9), `CHALLENGE_ROWS` (11), `ENEMY_TYPES` (6), `BIOMES` (3), `BOSSES` (4), `CUTSCENES` (7), `SAHUR_SPRITES`, `CUTSCENE_BG_DATA` (6), `TRACKS` (6), `BIOME_TRACKS`, `controlDefaults` |
| Global state | `mode` (state machine), `state` (run state from `newRun()`), `keys`, `touch`, `controlSettings`, `cut`/`typeT`/`typing` (cutscene typewriter), `beats`, `shake`, `flash`, `last`, `DT`, `AC` (AudioContext), `masterVolume` |
| Rendering | **Canvas 2D.** `#game` is `<canvas width=960 height=540>` with `getContext("2d",{alpha:false})`. The logical resolution is a fixed 960×540. CSS scales it to fit the window at **16:9** (`width:min(100vw, 100dvh*16/9)`, `aspect-ratio:16/9`, `image-rendering:pixelated`) with letterboxing. The backing store does not scale with devicePixelRatio. Cutscene art uses a second canvas, `#sceneCanvas`, at 960×600 (8:5), with a slow pan/zoom (Ken Burns) and drifting particles. A CSS `::after` scanline overlay gives a CRT look. All gameplay sprites (enemies, bosses, player, bullets, particles, HUD) are drawn procedurally with canvas primitives. Only Sahur uses bitmap frames. |
| UI layer | Menus, cutscene dialogue, upgrade cards, pause, end and rotate screens are **DOM overlays** (`.overlay` divs, `z-index` 5–9) above the canvas. The HUD itself is drawn on the canvas. |
| Game loop | `requestAnimationFrame(loop)` with a **variable timestep**: `dt = min(0.033, (now-last)/1000)`. Each frame runs `tickTyper(dt)`, `tickCutscene(dt)`, `update(dt)` (only when `mode==="play"`), `tickBeats(dt)` (only when `mode==="beats"`) and `render()` (always). There is no fixed timestep, no FPS cap and no FPS counter. The game runs at the display refresh rate, and below 30 FPS it slows down rather than skipping frames. |
| Collision | Circle-versus-circle distance checks (`Math.hypot`) for contact, bullets, swing and TUNG radius. Entities are clamped to the arena edges. |
| Audio | **Web Audio API, synthesised; no sound files except one.** `tone()` and `tung()` are one-shot oscillator SFX. `Music` is a lookahead step sequencer (`setInterval` every 60 ms, 16-step patterns) that plays one track per biome plus boss, core and dawn tracks (`TRACKS`: forest 104 BPM, wastes 122, boardroom 128, boss 142, core 62, dawn 76). `SceneSound` is a cutscene ambience pulse every 520 ms, keyed to the scene art. `typeBlip()` gives each speaker a per-character "talk blip" with its own pitch and timbre. The **only audio file** is the external `TUNG TUNG TUNG SAHUUUUUUR CHOIR (1).mp3` (1.3 MB). `ChoirMusic` plays it through an `HTMLAudioElement`: the title loop covers 0–85 s and starts on the first key or pointer press on the title (autoplay policy); the finale loop covers 40–85 s during the beats finale. |
| Fonts | Loaded from Google Fonts: "Press Start 2P" (titles, the Valuation number, the beats text) and "Pixelify Sans" (loaded but never used). Body and HUD text use Verdana. |
| Embedded assets | 13 base64 data URIs: 7 PNG Sahur frames (about 10–11 KB each) and 6 JPEG cutscene backgrounds: `apartment`, `fire`, `river`, `boardroom`, `core`, `dawn` (128–226 KB each). |
| External dependencies at runtime | The Google Fonts stylesheet and the choir mp3, loaded by relative URL. Everything else is inline, so the single-file claim is about 99% true. |
| Deployment | `index.html` redirects to `./Sahur_Protocol.html` through both a meta refresh and `location.replace`, with a fallback link. `vercel.json` (v2) sets `cleanUrls:true`, adds the header `X-Content-Type-Options: nosniff` to all routes, gives `*.mp3` the cache header `public, max-age=31536000, immutable`, and rewrites `/` to `/Sahur_Protocol.html`. It is a static Vercel deployment with no server code. |
| Git history | 4 commits, all on 2026-07-19: `a5d6a6f` first commit (game, mp3, PRODUCT.md, README), `0dbf952` "ready for deployment" (index.html, vercel.json), `fd5205a` "mobile better" (+96/−8 lines), `a3e663a` "menu thing + orientation locking + control switcher implemented" (+109/−4). README.md holds only the heading "Sahur-Protocol". PRODUCT.md is a design brief covering users, purpose, personality, anti-references, principles and accessibility. |

### Input handling
- **Keyboard** (`keydown`/`keyup` on `window`, keys normalised with `e.key.toLowerCase()` into the `keys` map):
  - Move: **W A S D** or **arrow keys**, read every frame and normalised to a unit vector.
  - Swing: **Space** or **J**, on keydown only (`!e.repeat`, so holding does not auto-swing). This sets `state.attackQueued`, which is consumed on the next frame only if the swing cooldown has finished. There is no input buffering.
  - **Esc** toggles pause (only from `play` or `pause`). **M** toggles mute in any mode. **C** toggles the challenge panel (whenever a run exists).
  - **Space** or **Enter** advances a cutscene. Arrow keys and Space call `preventDefault`.
- **Mouse/pointer**: used for DOM buttons and cards, and a click anywhere on the cutscene overlay advances it. A pointer press in the top-right of the canvas (logical x ≥ 690, y ≤ 210) toggles the challenge panel. **The mouse never attacks.**
- **Touch** (enabled only when `matchMedia("(pointer:coarse)")` matches): a virtual joystick at bottom-left (`#stick`), a round **SWING** button at bottom-right (`#atkBtn`), and the challenge toggle when tapping the top-right. The control switcher (Options or Pause → CONTROLS) offers **"Joystick"** or **"Touch to move"** mode; in touch-to-move the stick is hidden and the player walks toward the finger. Sliders set joystick size (96–190 px, default 128), horizontal position (3–24 vw, default 8), height from bottom (3–24 vh, default 8) and swing button size (72–150 px, default 92). These settings persist.
- **Orientation lock**: with a coarse pointer in portrait, CSS shows the `#rotateOv` overlay "ROTATE DEVICE" ("Landscape gives the full arena, HUD, and touch controls enough room."). The game is **not** paused underneath it. `tryLandscapeLock()` also tries `requestFullscreen()` plus `screen.orientation.lock("landscape")` on coarse-pointer devices, at load, on the first pointer or touch, on visibility change, and on new game or continue, and it swallows any errors. The viewport meta sets `user-scalable=no, viewport-fit=cover`, and the controls respect `env(safe-area-inset-*)`.

---

## 3. Game-state / mode machine (`let mode`, L550)

The comment lists `title | cutscene | play | choose | beats | end`, but the code also uses **`pause`**. There are **7 modes**.

| Mode | What is shown | Input the mode owns | `update()` runs? |
|---|---|---|---|
| `title` | `#titleOv` main menu (title, WAKE UP, CONTINUE if a save exists, How to play / Story / Options panes, controls blurb). The canvas behind is empty, or shows the last run if you came from MAIN MENU. | Menu buttons. Any key or pointer press starts the choir menu music. | no |
| `cutscene` | `#cutOv`: illustrated panel (pan, zoom, particles) and a dialogue box with a speaker name, typewriter text (45 chars/s) and the hint "SPACE / CLICK >". The frozen game sits behind at 86% dim. | Space, Enter or click. The first press completes the line; the next press advances. **No skip-all.** | no |
| `choose` | `#chooseOv` cards: FIRST UPGRADE / CHOOSE AN UPGRADE / FINAL UPGRADE (3 cards), or SIGNAL ROLL (1 card that animates for 1.5 s and is then claimable). | Click or tap a card (they are `<button>`s). | no |
| `play` | Live arena with HUD | Move, swing, Esc/II pause, C challenges, M mute | **yes** |
| `pause` | `#pauseOv`: "PAUSED", "Progress is saved at room, boss, and reward checkpoints.", CONTROLS (expands the touch settings), RESUME, MAIN MENU, RESTART RUN. | Buttons, Esc to resume | no |
| `beats` | Scripted finale: the screen fades toward white (alpha up to 0.85) and "TUNG" is printed 1, 2, then 3 times with big shake and white flashes, over the choir finale loop. | **None** (non-interactive; only M mute) | no (`tickBeats` only) |
| `end` | `#endOv`: either game over **"ABSORBED"** or victory **"WE WON."** | One button (`#endBtn`) | no |

### Transitions (what triggers each)
```
(page load) -> title
title --WAKE UP (startGame: delete save, newRun)--> cutscene[prologue]
title --CONTINUE (continueGame: loadProgress)--> play  (startRoom at saved biome/room, or startFinalBoss if biome>=3)
cutscene[prologue]   --last line--> choose["FIRST UPGRADE"] --pick--> play (startRoom: biome1 room1)
play --room cleared (checkClear: no enemies/queue/pending, room<3; +450 ms)--> choose["CHOOSE AN UPGRADE"]
choose["CHOOSE AN UPGRADE"] --pick--> play (room++, startRoom -> combat room, or boss room when room==3)
play --biome boss HP<=0 (onBossDown, +900 ms)--> cutscene[biome1_end | biome2_end | biome3_end]
cutscene[biomeN_end] --last line--> choose["SIGNAL ROLL"] --claim--> biome++, room=0, save, then
      play (startRoom of next biome)                          if biome < 3
      cutscene[core_intro] --last line--> choose["FINAL UPGRADE"] --pick--> play (startFinalBoss)   if biome == 3
                                          (or straight to play if no upgrade is available)
play (Bubble) --HP<66%: PHASE 2--> --HP<33%: PHASE 3 COLLAPSE (Bubble invulnerable, stops attacking, music stops)
      --after 7 s--> cutscene[sacrifice] --last line--> beats
beats --3rd TUNG at t=4.2 s, +1.6 s--> cutscene[epilogue] --last line--> end (victory; save deleted)
play --HP<=0 and no Second Wind revive--> end (game over "ABSORBED"; save kept)
play --Esc or II button (pauseGame: saves)--> pause
pause --RESUME or Esc--> play
pause --MAIN MENU (goMainMenu: saves)--> title
pause --RESTART RUN (startGame: deletes save)--> cutscene[prologue]
end --button: "RETRY CHECKPOINT" if a save exists -> continueGame -> play
              "WAKE UP AGAIN" / "AGAIN - FOR HIM" if no save -> startGame -> cutscene[prologue]
```
The end screen has no MAIN MENU button.

---

## 4. Run structure

| # | Biome (`BIOMES[i].name`) | Arena bg / accent | Combat rooms | Enemy mix (random pick per spawn) | Boss | Stat scale | `sahurDrain` | Music |
|---|---|---|---|---|---|---|---|---|
| 1 | **HYPE CYCLE FOREST** | `#0b1410` / `#3dff9d` | 3 | slopling, slopling, drone | echo | 1.0 | none | `forest` 104 BPM |
| 2 | **SERVER FARM WASTES** | `#12100b` / `#ffb547` | 3 | hand, drone, wraith, hand | scraper | 1.35 | 1.3 | `wastes` 122 BPM |
| 3 | **BOARDROOM OF BROKEN PROMISES** | `#0c0f1a` / `#35e8ff` | 3 | yesman, golem, wraith, yesman | valuation | 1.7 | 1.6 | `boardroom` 128 BPM |
| final | **The Core** (white arena `#e9e9f2`) | none | none | Bubble summons | bubble | none | none | `core` 62 BPM |

- **Room types**: only two. A **combat room** is `room < 3`; a **boss room** is `room == 3`. The branch is in `startRoom()`. There are no shop, treasure or event rooms.
- **Enemies per combat room** = `5 + 2*biome + room`: 5/6/7 in biome 1, 7/8/9 in biome 2 and 9/10/11 in biome 3, for 63 in total (plus golem splits and boss summons). They enter **one at a time from a random arena edge**. Each spawn first shows a pulsing "!" telegraph ring for 0.7 s, and spawns are spaced 0.55–1.05 s apart.
- **Scaling**: enemy HP × statScale, contact damage × √statScale, speed unscaled.
- **A room is cleared** when there are no living enemies, nothing in the spawn queue and nothing pending. The game then marks challenges, applies room heal, and opens the upgrade picker after 450 ms.
- **A biome ends** when its boss reaches 0 HP. The game then plays the end-of-biome cutscene (campfire `fire` / coolant `river` / `boardroom`), runs the **SIGNAL ROLL** skill unlock, and moves to the next biome.
- **Progression to the finale**: after the third boss, `core_intro` plays, then the FINAL UPGRADE picker, then The AI Bubble. A full run is 9 combat rooms, 3 boss rooms and the Bubble: **13 encounters and 7 cutscenes**.
- Cutscenes (`CUTSCENES`): `prologue` (art apartment, 6 lines), `biome1_end` (fire, 2), `biome2_end` (river, 6), `biome3_end` (boardroom, 3), `core_intro` (core, 3), `sacrifice` (core, 5), `epilogue` (dawn, 4).

---

## 5. Enemies (`ENEMY_TYPES`, L415)

| Key | In-code description | HP | Speed (px/s) | Radius | Contact dmg | Colour | AI (`ai`) and behaviour |
|---|---|---|---|---|---|---|---|
| `slopling` | "generated filler given legs" | 30 | 95 | 14 | 8 | `#ff3df0` magenta | `chase`: walks straight at the player. Drawn as a wobbling blob with a drip. |
| `drone` | "buzzword drone - keeps its distance, fires jargon" | 22 | 70 | 12 | 10 | `#35e8ff` cyan | `shoot`: approaches if more than 260 px away and backs off if less than 180 px. Fires 1 aimed bullet every 2.1 s at 210 px/s. Diamond body with a spinning rotor. |
| `wraith` | "prompt wraith - drifts, then lunges" | 26 | 60 | 13 | 12 | `#c07bff` purple | `dash`: drifts toward the player, then every 1.6 s dashes for 0.4 s at 420 px/s. Translucent, flickering ghost. |
| `hand` | "scraper hand - winds up, then grabs. dodge the windup" | 34 | 120 | 13 | 11 | `#b0a4ff` lavender | `grab`: stalks, then within 190 px stops for a 0.45 s wind-up (turns red and shakes), lunges for 0.32 s at 520 px/s, and recovers for 1.0 s by backing away. |
| `yesman` | "yes-man - circles you agreeing, fires from safety" | 24 | 150 | 12 | 9 | `#3dff9d` green | `orbit`: circles the player at a 175 px radius and fires 1 aimed bullet every 2.6 s at 190 px/s. Small suit with a tie and a fixed smile. |
| `golem` | "pivot golem - slow, heavy, splits when it dies" | 85 | 42 | 20 | 16 | `#ffb547` amber | `tank`: walks at the player. **On death it splits into 2 sloplings** (with a "PIVOT!" popup). Stacked slabs with a crack. |

- Enemy bullets: radius 6, lifetime 6 s, drawn magenta, damage equal to the shooter's scaled damage.
- Enemies flash white for 0.12 s when hit. TUNG knocks enemies back 40 px.

---

## 6. Bosses (`BOSSES`, L446)

All bosses spawn at (480,130), drift sideways on a sine wave, deal 14 contact damage, and **cycle their patterns in a fixed order** (no randomness). Each shows a top HP bar with its name and a **BOSS TIMER** "m:ss / limit", which is cyan while under the limit and red once over it.

| Boss | Biome | HP | Radius | Colour | Pattern cycle (`patterns`) | Interval `patCD` | Timer limit | Special |
|---|---|---|---|---|---|---|---|---|
| **ECHO, THE ENGAGEMENT WRAITH** | 1 | 320 | 30 | magenta | `burst`: 10 radial bullets at 170 px/s, dmg 10. `summon`: 1 slopling (scale 1.0). `dash`: teleport-lunges 90 px toward the player. | 2.6 s | 0:55 | Masked wraith with trailing after-images |
| **THE SCRAPER** | 2 | 480 | 34 | purple | `spread`: 3 aimed bullets, 0.3 rad apart, 220 px/s, dmg 10. `summon`: 1 hand (scale 1.35). `offbeat`: banner "...tung. tung... tung?  WRONG.", 16 radial bullets at 140 px/s, dmg 12, plus a low sawtooth tone. | 2.4 s | 1:10 | A data core orbited by 6 grasping hands |
| **THE VALUATION** | 3 | 560 | 38 | cyan | `bigburst`: 20 radial bullets at 150 px/s, dmg 12. `spread`. `summon`: 1 yes-man (scale 1.7). | 2.2 s | 1:30 | **`overextend`: only damageable for 4 s after `bigburst`** (banner "OVEREXTENDED - STRIKE NOW"). Otherwise it is drawn translucent and hits show "NOT YET". It is drawn as a glowing "$NB" number that grows as it takes damage, over an up-only chart ("^ +inf% projected"). |
| **THE AI BUBBLE** (`final:true`) | Core | 1350 | 56 | magenta, iridescent | `burst` (14 at 205 px/s, dmg 12), `spread` (5 at 260 px/s, dmg 12), `summon` (2 enemies), `cross` (4 rotating bullets plus 3 aimed), `spiral` (18 bullets at 185 px/s), `chase` (6 aimed bullets 120 ms apart at 285 px/s) | 1.45 s × 0.9 = **1.305 s** in phase 1, × 0.62 = **0.90 s** in phase 2 | 2:00 (display only; no challenge) | Three phases (below). The arena turns white ("THE CORE. White."). |

**AI Bubble phases (`finalPhaseCheck`)**
1. **PHASE 1 - HYPE** (HP 100–66%): summons slopling or drone at about 2.0–2.25× stats.
2. **PHASE 2 - SCALE** (below 66%): attacks faster, summons yes-man, wraith or drone at about 2.2–2.5× stats, and Sahur's `degrade` becomes 2.0, so his TUNG slows sharply.
3. **PHASE 3 - COLLAPSE** (below 33%): the music stops, the Bubble becomes **invulnerable**, stops attacking, and all bullets are cleared. It starts "leaking", and Sahur's TUNG stops (`degrade = 99`). After **7 s** the `sacrifice` cutscene plays, followed by `beats`, the epilogue and victory.

So the **player can never kill the Bubble**. The last third of its HP is a scripted story beat.

---

## 7. Player and combat

**Player base stats** (`newRun()` / `applySkillLoadout()`): HP 100 / max 100, speed **225 px/s**, radius 15, swing damage **13**, swing cooldown **0.38 s**, crit chance 0, armor 0, lifesteal 0, revives 0.

- **Attack ("swing")**: a **360° circular hit around the player, radius 80 px** (plus the enemy's radius). It hits every enemy, and the boss, inside that circle; it is not directional. A white ring flashes. Crits deal ×2. While the Borrowed Beat buff is active, damage is × `beatMult` and the ring turns magenta. Lifesteal heals on each enemy hit but not on boss hits. Damage numbers float above targets, gold when boosted.
- **Taking damage**: from contact (each enemy's `dmg`, boss 14) and bullets. The damage is multiplied by `(1 − armor)` and followed by **0.7 s of invulnerability**, shown as player blinking, plus screen shake and a hit tone. At 0 HP, if a revive is available ("SECOND WIND") HP is set to half of max; otherwise the run ends in game over.
- **Sahur (companion)**:
  - Follows the player at 46 px behind the facing direction (smoothed by lerp) and mirrors his sprite to face the same way.
  - **TUNG** is an automatic ground slam on a **cooldown timer** (`slamT`). It deals **26 damage** to every enemy and boss within **radius 135** (plus the target's radius), knocks enemies back 40 px, and triggers screen shake, a "TUNG!" popup, a gold ring, a particle burst and the bass `tung()` sound. If Borrowed Beat is owned, it starts the 3 s player damage buff.
  - **Cooldown** = `max(2.2, (3.5 + 0.8×biome) × cdMult × degrade-factor)`. In normal rooms the biome drain cancels out, so the cooldown is about **3.5 s (biome 1), 4.3 s (biome 2), 5.1 s (biome 3)**, reduced by Faster Rhythm. In the Bubble fight it becomes about **9.4 s in phase 1** and **14.8 s in phase 2**, and stops entirely in phase 3. If the player continues from a save directly into the Bubble, it is about 3.7 s in phase 1. The first TUNG of a run comes 2.5 s in.
  - A small **"rhythm meter"** bar above his head fills toward the next TUNG and turns red once his rhythm is gone.
  - From biome 2 onward his sprite occasionally **flickers** to 35% alpha, a story cue that he is fading.
  - He has **no HP**, cannot be targeted, and needs no protecting despite the title-screen line "Protect him". He is removed (`alive=false`) after the beats finale.

### Is there any beat- or rhythm-synchronised mechanic in combat? **No.**
- The background music is a Web Audio step sequencer running on its own `setInterval` clock. Nothing in `update()` reads the music position, BPM or step.
- Sahur's TUNG fires on its own countdown (`slamT -= dt`), which is not tied to the music tempo.
- There are no timing windows, no "on-beat" bonus and no input judged against a beat. The player can swing whenever the 0.38 s cooldown allows, and damage always applies.
- The rhythm theme lives only in **flavour and naming**: the TUNG "rhythm meter", the skills "Faster Rhythm" (shorter TUNG cooldown) and "Borrowed Beat" (+35% or +70% player damage for 3 s after each TUNG, a time-window buff), the Scraper's "offbeat" pattern (a banner plus a bullet ring), and story text ("keep the rhythm").
- **`beats` mode** is the **non-interactive scripted finale**. After the `sacrifice` cutscene, `startBeats()` stops all other audio and starts the choir finale loop. `tickBeats()` fires three huge TUNGs at **t = 1.2 s, 2.6 s and 4.2 s**, each with a white flash, escalating shake and another "TUNG" word on a screen fading to white. At 4.2 s + 1.6 s the Bubble is removed, Sahur is gone, and the `epilogue` cutscene plays. The player gives no input during it.

---

## 8. Skills, upgrades and "relics"

**On-screen terminology**: the game says **"upgrade"** and **"skill"**: "FIRST UPGRADE", "CHOOSE AN UPGRADE", "FINAL UPGRADE", "Pick one unlocked skill to upgrade", the HUD line "UPGRADES: Louder Voice Lv.2 | …", the toast "SKILL UNLOCKED", the challenge panel "SKILLS 10/11 UNLOCKED", and on victory "Skills upgraded: …". The word **"relic" never appears on screen**. It survives only in code (`state.relics`, a string list like `"Wider Bat Lv.2"` that feeds the HUD), the header comment, the unused `POWERUPS` table and PRODUCT.md.

**The 11 skills** (`SKILLS`, L350). Each has a family, rarity and max level, and its effect scales with level *l*:

| Skill | Family | Rarity | Max Lv | Effect at level *l* | Default unlocked? | Linked "unlock" challenge text (display only) |
|---|---|---|---|---|---|---|
| Louder Voice | SIGNAL | common | 4 | Swing damage +20%×l | yes | Clear your first room. |
| Quick Wit | SIGNAL | common | 4 | Swing cooldown −12%×l (floor 0.42×) | yes | Defeat Echo. |
| Sharp Take | SIGNAL | rare | 3 | Crit chance +12%×l | yes | Defeat Echo in under 55 seconds. |
| Touch Grass | GROUNDING | uncommon | 3 | Max HP +18×l | yes | Defeat The Scraper. |
| Good Shoes | GROUNDING | rare | 3 | Move speed +8%×l | yes | Defeat The Scraper in under 70 seconds. |
| Thick Skin | GROUNDING | rare | 3 | Damage taken −8%×l | yes | Defeat The Valuation. |
| Mixtape '07 | NOSTALGIA | epic | 3 | Hits restore *l* HP | yes | Defeat The Valuation under 90s without reviving. |
| Second Wind | NOSTALGIA | legendary | 2 | Survive death *l* time(s), reviving at 50% HP | **no (locked)** | Reach The Bubble with 5 or more challenge clears. |
| Wider Bat | CHAOS | uncommon | 3 | Sahur TUNG radius +15%×l | yes | Clear 4 rooms. |
| Faster Rhythm | CHAOS | epic | 3 | Sahur TUNG cooldown −10%×l (floor 0.55×). The text adds "It costs him.", but **the code applies no cost**. | yes | Defeat any boss without dropping below 40 HP. |
| Borrowed Beat | CHAOS | legendary | 2 | After each TUNG, player damage +35%×l for 3 s | **no (locked)** | Beat all three biome bosses under their challenge timers. |

Families are colour-coded: SIGNAL red, GROUNDING cyan, NOSTALGIA amber, CHAOS magenta. Rarities: common (white), uncommon (green), rare (cyan), epic (purple), legendary (gold).

**How upgrades are offered**
- **FIRST UPGRADE**, after the prologue and before room 1: "Nine core skills are already in your pool. Choose one to begin the run."
- **CHOOSE AN UPGRADE**, after every cleared **combat** room (9 per run): up to **3 distinct cards**, drawn by weighted random from unlocked, non-maxed skills. The weight is `rarityScore + currentLevel`, so rarer skills and skills you already own are *more* likely to appear. Each card shows rarity, family, name, the next-level effect and "Level x/max -> x+1/max". If nothing is left, a single "No upgrades available" card appears.
- **SIGNAL ROLL**, after each **biome boss** (3 per run): one card cycles through the locked skills for 1.5 s, then reveals the rolled skill ("LEGENDARY UNLOCK"), and **"Claim skill"** adds it to the pool. The weight is `max(1, 7 − rarityScore)`. Only 2 skills start locked, so the roll after Echo unlocks Second Wind or Borrowed Beat, the roll after the Scraper unlocks the other, and the roll after the Valuation shows "All skills unlocked".
- **FINAL UPGRADE**, after `core_intro` and before the Bubble: "Spend one last upgrade before The Bubble starts."
- **Total upgrade picks per full run: 11.**
- Every pick recomputes stats from scratch with `applySkillLoadout()` and keeps the current HP *percentage*.
- **Legacy `POWERUPS` table** (12 entries, L334): its entries are flat bonuses, and it also contains **Old Bootleg** ("Heal 20 HP after every room") with no `SKILLS` counterpart. **No code reads this array.** As a result `player.roomHeal` is always 0 and the room-clear heal never happens.

---

## 9. Challenges (`CHALLENGE_ROWS`, L401; checked in `checkClear`, `evaluateBossChallenges`, `startFinalBoss`)

| id | Panel label | Condition in code |
|---|---|---|
| `first_room` | First room | First combat room cleared |
| `rooms_4` | 4 rooms | 4 combat rooms cleared in total (`roomsCleared ≥ 4`) |
| `echo_defeated` | Echo down | Echo defeated |
| `echo_speed` | Echo speed | Echo defeated in ≤ 55 s (also counts toward `speedBosses`) |
| `scraper_defeated` | Scraper down | The Scraper defeated |
| `scraper_speed` | Scraper speed | The Scraper defeated in ≤ 70 s (`speedBosses`) |
| `valuation_defeated` | Valuation down | The Valuation defeated |
| `valuation_clean` | Valuation clean | The Valuation defeated in ≤ 90 s with 0 revives used (≤ 90 s also counts toward `speedBosses`) |
| `boss_no_heal` | No low HP boss | Any biome boss defeated without HP dropping below 40 |
| `three_speed_bosses` | 3 speed bosses | `speedBosses ≥ 3` (all three under their timers) |
| `perfect_bubble_entry` | Bubble entry | Reaching the Bubble with ≥ 5 challenges completed |

- **UI**: a slide-in toast "CHALLENGE COMPLETE / <label>" at the top-right, a compact toggle "C CHALLENGES n/11", and an expanded panel opened with **C** or by tapping the top-right. The panel lists "[x]/[ ]" rows and "SKILLS n/11 UNLOCKED".
- **Rewards: none mechanical.** Each skill's `unlock` field names a challenge, and that text is printed on the Signal Roll card. However, **nothing checks it**: 9 skills start unlocked and the 2 locked ones are handed out by the post-boss roll whether or not their challenge is done. Completing a challenge triggers a save.

---

## 10. Menus and UI

**Title screen (`#titleOv`)**
- Buttons: **WAKE UP** (new game), **CONTINUE** (shown only when a save exists), **How to play**, **Story**, **Options**. There is **no Exit/Quit** and **no cutscene gallery**.
- Below the buttons is a controls blurb: "WASD / Arrows move | SPACE / J tap swing | C challenges | M mute", touch instructions, and "Sahur fights beside you. His TUNG is on a rhythm."
- **How to play** pane: Move: WASD or Arrow keys. Swing: tap Space or J (holding does not auto-swing). Touch: left stick moves, right button swings. Then: clear rooms, choose upgrades, beat bosses to roll new skills into your pool; Sahur's TUNG "costs him more near the core". Back.
- **Story** pane: one static paragraph of premise. Back.
- **Options** pane: "Music and sound: On/Off" toggle; **Volume** slider (0–100, default 70); **Mobile controls**: Joystick / Touch to move, joystick size, horizontal position, height from bottom, and swing button size; a note that cutscenes, levels, bosses and finale use separate audio states. Back.

**Pause (`#pauseOv`)**: opened with the **II** button (top-left) or Esc. It shows "PAUSED", the line "Progress is saved at room, boss, and reward checkpoints.", **CONTROLS** (expands the same touch-control switcher and sliders), **RESUME**, **MAIN MENU** and **RESTART RUN**. Pausing triggers a save.

**HUD (canvas)**
- Bottom-left: HP bar ("HP 97/118"; green, turning red below 30%).
- Above it: the line "UPGRADES: Name Lv.N | …".
- Bottom-right: "<BIOME NAME> | ROOM n/3", with the room part hidden during a boss.
- Top-right: challenge toast plus the "C CHALLENGES n/11" toggle or the full panel.
- Top-left: the **II** pause button (DOM).
- Boss fights: name, HP bar and BOSS TIMER at top-centre.
- Effects:
  - spawn telegraph "!" rings at the arena edges
  - floating damage numbers
  - "TUNG!" popups and rings, and Sahur's rhythm meter
  - toasts: "HYPE CYCLE FOREST - ROOM 1/3", "! ECHO, THE ENGAGEMENT WRAITH", "SECOND WIND", "PIVOT!", "NOT YET"
  - banners: "PHASE 1 - HYPE", "PHASE 2 - SCALE", "PHASE 3 - COLLAPSE", "OVEREXTENDED - STRIKE NOW", "...tung. tung... tung?  WRONG."
- Screen shake runs throughout.

**End screens (`#endOv`)**
- **Game over**: **"ABSORBED"** (magenta) with "The Bubble made a copy of you. The copy is easier. Your last checkpoint is still intact." The button reads **"RETRY CHECKPOINT"** if a save exists, otherwise "WAKE UP AGAIN".
- **Victory**: **"WE WON."** (gold) with "BUT AT WHAT COST.", then "Skills upgraded: <list>" and "Somewhere, very far away... a fourth tung?". The button reads **"AGAIN - FOR HIM"** and starts a new run.

---

## 11. Persistence (localStorage, all access wrapped in try/catch)

| Key | Content | Written | Removed |
|---|---|---|---|
| `sahurProtocolRunV1` | JSON `{v:1, savedAt, biome, room, relics, skillLevels, unlockedSkills[], completedChallenges[], roomsCleared, speedBosses, playerHp, playerMaxHp}` (`serializeRun`) | `saveProgress()` is called from: **every `startRoom()`** (combat and boss rooms), **every new challenge**, **every upgrade card picked**, **Signal Roll claim**, **biome advance** (in `onBossDown`), **`startFinalBoss()`**, **`pauseGame()`** and **`goMainMenu()`** | `startGame()` (WAKE UP, RESTART RUN, or new run after victory) **with no confirmation**, and `showVictory()` |
| `sahurProtocolControlsV1` | `{stickSize, stickLeft, stickBottom, attackSize, moveMode}` | On any control slider or mode change | Never |

- **Load / continue**: `loadProgress()` checks `v===1`, clamps the values, rebuilds the run with `newRun()`, re-applies skills through `applySkillLoadout()`, and restores HP (`playerMaxHp` is saved but recomputed). `continueGame()` then **restarts the saved room from the beginning** (`startRoom`), or goes straight to the Bubble if `biome ≥ 3`, skipping `core_intro`.
- **Not saved**: enemies and boss HP mid-fight, Sahur's state, boss timer, cutscene position, mute/volume. Mute and volume reset on every load.
- **Game over keeps the save**, so "RETRY CHECKPOINT" reloads it. **Victory deletes it.** The CONTINUE button is shown or hidden by `updateContinueButton()` according to whether the key exists.

---

## 12. Accessibility and mobile

- **Readability**: menus and dialogue use Verdana rather than pixel type; pixel type ("Press Start 2P") is reserved for big titles. DOM text is 12–21 px: dialogue `clamp(17px, 2.3vw, 21px)` with a line height of 1.75, menu text 16 px, buttons 17 px, card descriptions 14 px. Canvas HUD text is 10–13 px at the logical 960×540 size and scales with the canvas. Colours are high-contrast on near-black panels. PRODUCT.md states readability is prioritised over retro authenticity. There is **no in-game text-size or contrast setting**.
- **Reduced motion**: the game respects the OS `prefers-reduced-motion` setting. It disables all CSS animations and transitions (menu drift, card pulses, dialogue pop) and turns off the cutscene pan/zoom and particles. Canvas screen shake and white flashes in gameplay are **not** reduced. There is no in-game toggle.
- **Audio**: a global mute (M key or Options button) covers music, SFX, cutscene ambience and the choir, plus a master volume slider. Neither setting persists.
- **Cutscenes** are self-paced. Text stays until the player advances, and one press completes the typewriter.
- **Touch/mobile**: virtual joystick or touch-to-move, a SWING button, and customisable control size and position (persisted). Controls respect safe-area insets. The landscape layout uses smaller text and cards.
- **Orientation**: in portrait on touch devices a full-screen "ROTATE DEVICE" overlay appears, and the game tries a fullscreen plus landscape orientation lock.
- **Missing**: key remapping, colour-blind options, difficulty settings and gamepad support.

---

## 13. Validation of previous lab claims

### Exp 1
| Claim | Verdict | Correct fact |
|---|---|---|
| Built in Unity / C# | **FALSE** | Single-file HTML5 game in vanilla JavaScript, using the Canvas 2D and Web Audio APIs. No engine, no build. |
| Player can jump | **FALSE** | No jump or gravity. Top-down 8-direction movement. |
| Platformer | **FALSE** | Top-down arena action roguelite (room clearing with bullet patterns). |
| Multiple levels | **PARTLY** | 3 biomes, each with 3 combat rooms and 1 boss room, plus the final Bubble arena (13 encounters). The game says "biome"/"room", not "level". |
| Score display | **FALSE** | No score. The HUD shows HP, upgrades, biome/room, challenge count, and the boss HP bar with timer. |
| Pause / resume | **TRUE** | Esc or the II button. PAUSED menu: CONTROLS, RESUME, MAIN MENU, RESTART RUN. |
| Save progress is a future enhancement | **FALSE** | Already implemented: localStorage checkpoints (`sahurProtocolRunV1`) plus CONTINUE and RETRY CHECKPOINT. |
| Game Over + Victory screens | **TRUE** | "ABSORBED" (game over) and "WE WON." (victory). |
| Runs at 60 FPS | **PARTLY** | `requestAnimationFrame` loop with a variable timestep (dt capped at 33 ms). It follows the display refresh (usually 60 Hz); there is no explicit 60 FPS target or counter. |

### Exp 3 (use cases)
| Claim | Verdict | Correct fact |
|---|---|---|
| Start New Game | **TRUE** | The button is labelled **"WAKE UP"**. |
| Continue Game | **TRUE** | "CONTINUE", visible only when a save exists. |
| Play Game (Run) | **TRUE** | |
| Pause Game (Resume / Restart Run / Return to Main Menu) | **TRUE** | Labels are RESUME, RESTART RUN and MAIN MENU, plus CONTROLS. |
| View Story (cutscene gallery) | **PARTLY** | "Story" is a static text paragraph. There is **no cutscene gallery or replay**. |
| View How to Play | **TRUE** | "How to play" pane |
| Configure Settings (volume/controls) | **TRUE** | Called **"Options"**: sound on/off, volume, mobile control mode and layout. Touch controls are also editable from Pause → CONTROLS. There is no keyboard rebinding. |
| Exit Game | **FALSE** | There is no exit/quit option; the player closes the browser tab. |
| Save Progress | **PARTLY** | **Automatic only** (checkpoints). There is no manual save action; model it as a system «include», not an actor use case. |
| Load Progress | **TRUE** | Automatic through CONTINUE and RETRY CHECKPOINT |
| Play Prologue Cutscene (skippable?) | **TRUE / not skippable** | Plays on every new game (6 lines). It is advanced line by line with Space/Enter/click (the first press completes the typewriter). There is no skip-all. |
| Choose First Upgrade before first room | **TRUE** | "FIRST UPGRADE" picker right after the prologue |
| Three randomised upgrades after each cleared room | **TRUE** (combat rooms) | Up to 3 weighted-random cards after each of the 9 combat rooms. **Boss rooms instead give a 1-card "SIGNAL ROLL" skill unlock.** There is also a FINAL UPGRADE before the Bubble. |
| Complete Challenges | **TRUE** | 11 auto-tracked challenges, viewed with C or a tap. **No mechanical reward.** |
| Upgrades named Touch Grass, Wider Bat, Faster Rhythm | **TRUE** | All three exist (GROUNDING uncommon; CHAOS uncommon; CHAOS epic). |
| Attacks bound to Space and left mouse | **PARTLY** | **Space or J** (and the touch SWING button). **The left mouse does not attack.** |
| WASD / arrow movement | **TRUE** | Also the touch joystick or touch-to-move |
| Damage only on the beat | **FALSE** | No beat sync. Swings always deal damage, limited only by a 0.38 s cooldown. Sahur's TUNG is on its own timer. |
| Warning before overwriting a save | **FALSE** | WAKE UP and RESTART RUN delete the save immediately with no prompt. |

### Exp 4 (activity diagram)
| Claim | Verdict | Correct fact |
|---|---|---|
| "Relics" | **PARTLY** | The internal array is `state.relics`, and the comment and PRODUCT.md say relics, but **the UI says "upgrade"/"skill"**. Use "skill upgrades". |
| Check Player HP after room | **FALSE** (as a step) | HP is checked **continuously on every hit** (`damagePlayer` → revive or `gameOver`). After a room there is only a room-heal step, which is always 0 in the current code. |
| Room-type branch | **TRUE** | `startRoom()`: `room < 3` gives a combat room, otherwise a boss room. Those are the only two types. |
| Boss room after all rooms | **TRUE** | After 3 combat rooms in each biome |
| Finale cutscene | **TRUE** | `core_intro` before the Bubble; `sacrifice`, then the `beats` finale, then the `epilogue` after it |
| Victory screen | **TRUE** | "WE WON." |

### Exp 5 (class diagram): what actually exists
There are **no classes** in the code. Each conceptual class maps to an object literal, a data table or a function group:

| Lab class | Real code construct |
|---|---|
| GameState | `let mode` (7-state string) plus `let state` (the run-state object returned by `newRun()`), with flow controlled by `startGame`, `continueGame`, `pauseGame`, `resumeGame`, `goMainMenu`, `gameOver` and `showVictory` |
| Player | `state.player` plain object `{x,y,r,hp,maxHp,speed,dmg,atkCD,atkT,crit,armor,lifesteal,roomHeal,revives,inv,beatBuff,beatMult,buffT,swing,fx,fy}`; logic in `update()` and `damagePlayer()` |
| Companion (Sahur) | `state.sahur` object `{x,y,r,alive,slamT,radius,cdMult,flicker,degrade,anim,animF,animT,facing,ring}`, sprites `SAHUR_SPRITES`/`SAHUR_IMGS`; TUNG logic inline in `update()`; `tung()` sound |
| Enemy | Plain objects in `state.enemies[]` created by `spawnEnemyAt(type,x,y,scale)` from the `ENEMY_TYPES` table. Behaviour branches on `e.ai` in `update()`; drawn by `drawEnemy()`. |
| Boss (inherits Enemy) | **No inheritance.** A separate `state.boss` object built by `spawnBoss(id)` from `{...BOSSES[id]}`; patterns in `update()`; drawn by `drawBoss()`. It shares `damageEnemy()` with enemies through duck typing. |
| Bullet | Plain objects `{x,y,vx,vy,r,dmg,t}` in `state.bullets[]`, created by `fireRadial()`, `fireAimed()` and the boss patterns |
| Skill | Entries of the `SKILLS` array `{name,family,rarity,max,unlock:{id,text},desc(l),apply(state,l)}`; player levels in `state.skillLevels`; applied by `applySkillLoadout()` (legacy unused `POWERUPS`) |
| Biome | Entries of the `BIOMES` array `{name,bg,accent,rooms,mix,boss,statScale,sahurDrain}`; accessor `biome()` |
| Challenge | `CHALLENGE_ROWS` `{id,label}` plus the `state.completedChallenges` Set; `completeChallenge()`, `evaluateBossChallenges()` |
| AudioManager | Three singletons, **`Music`** (procedural sequencer plus `TRACKS`), **`SceneSound`** (cutscene ambience) and **`ChoirMusic`** (mp3), plus the free functions `audio()`, `tone()`, `tung()`, `typeBlip()` and `updateVolume()` |
| (missing from lab) | Cutscene system (`CUTSCENES`, `playCut`, `showLine`, `advanceCut`, `tickTyper`, `drawSceneArt`); Input/Touch (`keys`, `touch`, `initTouch`, `controlSettings`); Particles/Texts (`state.parts`, `state.texts`) |

### Exp 6 (sequence-diagram objects)
| Lab object | Real code |
|---|---|
| GameUI | The DOM overlays `#titleOv`, `.menuPane` (#menuHow/#menuStory/#menuOptions), `#cutOv`, `#chooseOv`, `#pauseOv`, `#endOv`, `#rotateOv` and `#touchUI`, with their click handlers; canvas HUD from `render()` and `drawChallengeHud()` |
| GameCtrl | The `mode` variable, `loop()`, `startGame()`, `continueGame()`, `togglePause()`, `pauseGame()`, `resumeGame()`, `goMainMenu()`, `gameOver()` and `showVictory()` |
| RoomMgr | `startRoom()`, `borderPoint()`, `queueSpawn()`, `spawnEnemyAt()`, `spawnBoss()`, `checkClear()`, `onBossDown()`, `openChoice()` and `openSkillRoll()` |
| Enemy / Boss / Bubble | `ENEMY_TYPES` and `BOSSES` data plus the enemy/boss sections of `update()`; for the Bubble, `startFinalBoss()`, `finalPhaseCheck()`, `startBeats()` and `tickBeats()` |
| RunState | The `state` object from `newRun()` |
| SaveMgr | `SAVE_KEY`, `serializeRun()`, `saveProgress()`, `loadProgress()`, `storageGet/Set/Remove()` and `updateContinueButton()` (and `CONTROL_KEY` with `save/loadControlSettings()`) |

Claim check, "saves at room start, room clear, biome change, end of run":
- **Room start: TRUE** (`startRoom` calls `saveProgress`).
- **Room clear: PARTLY.** There is no dedicated save at the clear itself, but the save happens moments later when the upgrade card is picked. It also happens at the clear if a new challenge such as `first_room` completes.
- **Biome change: TRUE** (after the Signal Roll in `onBossDown`).
- **End of run: FALSE.** Victory **deletes** the save; game over does **not** save and keeps the last checkpoint.
- Also missing from the claim: saves on **pause**, **main menu**, **every challenge**, **every upgrade pick** and **final-boss start**.

---

## 14. Key identifiers (for the Implementation chapter)

| Identifier | Line | What it does |
|---|---|---|
| `loop(now)` | L2130 | rAF main loop: computes the capped dt, ticks the typewriter and cutscene, calls `update` in play, `tickBeats` in beats, and `render` always |
| `update(dt)` | L1598 | All gameplay simulation: player movement and swing, Sahur follow and TUNG, staggered spawning, the 5 enemy AIs, golem splitting, boss patterns, bullets, particles, then `checkClear()` |
| `render()` | L2008 | Draws the arena, telegraphs, enemies, boss, HP bar and timer, Sahur sprite and meter, player, swing ring, particles, text, HUD, beats overlay and flash |
| `drawEnemy(e,p)` / `drawBoss(b)` | L1785 / L1853 | Procedural sprites for each enemy type and each boss |
| `newRun()` | L761 | Creates a fresh run-state object (player, Sahur, arrays, counters) |
| `startGame()` | L1046 | New run: deletes the save, `newRun()`, stops audio, plays the prologue, then FIRST UPGRADE, then `startRoom()` |
| `continueGame()` | L1058 | `loadProgress()`, then `startRoom()` or `startFinalBoss()` |
| `startRoom()` | L1221 | Builds a combat room's spawn queue or spawns the biome boss, starts the biome music, saves |
| `queueSpawn()` / `spawnEnemyAt()` / `borderPoint()` | L1248 / L1252 / L1241 | Edge-telegraphed staggered enemy spawning |
| `spawnBoss(id)` | L1258 | Creates the boss object, resets the boss timer and stats, starts the boss or core music |
| `damagePlayer(d)` / `damageEnemy(e,d,fromPlayer)` | L1285 / L1297 | Damage resolution (armor, i-frames, revive, game over / crit, buff, lifesteal, the "NOT YET" invulnerability) |
| `checkClear()` | L1343 | Room-clear and boss-death detection, which triggers the upgrade picker or `onBossDown()` |
| `onBossDown()` | L1360 | Boss defeat: challenges, cutscene, Signal Roll, next biome or the core path |
| `evaluateBossChallenges(boss)` / `completeChallenge(id)` | L1390 / L1314 | Challenge logic, toast and save |
| `openChoice(afterPick,title,sub)` | L1423 | Builds the 3-card weighted upgrade picker (`mode="choose"`) |
| `openSkillRoll(afterRoll)` | L1467 | The 1-card animated SIGNAL ROLL unlock |
| `applySkillLoadout()` | L1328 | Recomputes all player and Sahur stats from skill levels |
| `startFinalBoss()` / `finalPhaseCheck()` | L1537 / L1544 | The AI Bubble fight and its 3 phases, then the sacrifice |
| `startBeats()` / `tickBeats(dt)` | L1568 / L1569 | The scripted three-TUNG finale |
| `showVictory()` / `gameOver()` | L1583 / L1526 | End screens (victory deletes the save) |
| `playCut(id,done)` / `showLine()` / `advanceCut()` / `tickTyper(dt)` / `typeBlip()` | L1105–1160 | Cutscene player: typewriter, per-speaker blips, completion callback |
| `drawSceneArt(id,t)` / `tickCutscene(dt)` | L1170 / L1208 | Cutscene panel with pan/zoom, particles and vignette (reduced-motion aware) |
| `serializeRun()` / `saveProgress()` / `loadProgress()` / `updateContinueButton()` | L787–831 | Save system |
| `loadControlSettings()` / `applyControlSettings()` / `saveControlSettings()` | L834–874 | Touch-control preferences, mirrored to CSS variables |
| `initTouch()` (IIFE) / `endTouchMove()` / `clearTouchState()` | L892 / L957 / L1042 | Joystick, SWING button and touch-to-move |
| `tryLandscapeLock()` / `primeMobileLandscape()` | L1029 / L1035 | Fullscreen and orientation lock |
| `togglePause()` / `pauseGame()` / `resumeGame()` / `goMainMenu()` | L1071–1100 | Pause flow |
| `Music` / `TRACKS` / `SceneSound` / `ChoirMusic` / `tone()` / `tung()` / `audio()` / `updateVolume()` | L559–758, L1023 | Audio subsystem |

**Code quirks worth knowing** (useful for a testing or limitations section; all observed in code, several also visible in the screenshots):
1. During the Signal Roll after a boss, the HUD reads **"ROOM 4/3"**, because `room` is still 3 once the boss is gone (see `09b`/`09c`).
2. In the Bubble fight the boss-name label is drawn in near-white `#e8e4d8` on the white core background, so "THE AI BUBBLE" is almost invisible (`12-bubble.png`). The bottom-right label still says "BOARDROOM OF BROKEN PROMISES", because `biome()` clamps the index.
3. `Music.play("dawn")` in `tickBeats` is immediately cancelled by `playCut()`, which calls `Music.stop()` first. The dawn track never sounds, and the choir finale loop keeps playing through the epilogue and the victory screen.
4. The `POWERUPS` table and Old Bootleg's `roomHeal` are dead code. The "Pixelify Sans" font is loaded but unused.
5. The skill "unlock" challenges are shown but never enforced, and "Faster Rhythm … It costs him." has no cost in code.
6. `sahurDrain` cancels out in normal rooms; it only matters in the final fight.
7. The rotate overlay does not pause the game. Reduced motion does not affect canvas shake and flash.

---

## 15. Screenshot recipe (repeatable)

- **Tooling**: `report/node_modules/puppeteer-core` 23.11.1 with Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, `headless:true`, args `--autoplay-policy=no-user-gesture-required --mute-audio --hide-scrollbars`. The game is loaded **unmodified** from `file:///…/Sahur_Protocol.html`; file:// works, and the Google Fonts load online.
- **Scripts** (run from `report/`): `node research/scripts/capture.js [desktop|mobile|all] [file.png …]`. Adding file names re-runs the flow but writes only those files, then exits. `research/scripts/slim.js` builds the slim source copy. `research/scripts/probe.js` checks touch emulation.
- **Desktop viewport**: 1280×720 at deviceScaleFactor 1.5, so PNGs are 1920×1080 (native 16:9). **Mobile**: 844×390 landscape at DSF 2 with `isMobile` and `hasTouch` (Chrome then matches `(pointer:coarse)`, enabling the touch UI). **Portrait**: 390×844 at DSF 2, which shows the rotate overlay.
- **Driving the game**:
  - Real input wherever possible: `page.click` on the menu buttons, cards, CONTROLS and RESUME; `keyboard.press('Space')` to advance cutscenes; `Escape` to pause; `touchscreen.touchStart/touchMove` on the joystick.
  - A small in-page "autopilot" (`setInterval` inside `page.evaluate`) writes the game's own joystick vector `touch.dx/dy` to keep the player moving and dodging, and sets `state.attackQueued` to swing when enemies are near.
  - Three screenshot-only assists, none of them visible in the HUD except as plausible HP values: `state.player.armor = 0.7`; a slow HP top-up when HP falls under about 50–60%; and, to fast-forward, killing remaining enemies (`hp = 0`) or bosses so the game's **own** `checkClear()` and `onBossDown()` flows run.
  - For the phase shots, the Bubble's HP is set to 60% and then 30% so the real `finalPhaseCheck()` fires. Every cutscene, picker, signal roll, beats finale and end screen is reached through the real flow.
  - The game-over shot sets HP to 3 and lets an enemy land a hit.
- **Freeze-frame**: combat shots wait for a moment such as a TUNG ring, `state.sahur.ring>0.27` with N enemies on screen, then set `mode='pause'` without opening the pause overlay. This stops `update()` while `render()` keeps drawing. The script takes the screenshot and restores the mode.
- Every PNG was opened and checked visually. Enemy counts differ slightly between runs, and upgrade cards are random.
