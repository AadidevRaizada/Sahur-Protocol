---
num: 8
title: Sequence Modelling
exp: Experiment 6
kicker: One full run, replayed as a conversation between objects - one message at a time.
shot: shots/11-core-cutscene.png
objectives:
  - Identify the lifelines and give each one a stereotype
  - Model a complete run as four continuous sequence diagrams
  - Use loop and alt fragments for repetition and branching
  - Locate every save checkpoint and verify the model against the build
---

Experiment 6 was performed on 13/09/2026. Its aim was to draw the **behavioural view** of Sahur Protocol as a UML sequence diagram: where the class model of Chapter 7 says what the game is made of, the sequence model says who talks to whom, and in what order, during a run. A run is far too long for one drawing, so the model is split into four continuous parts.

## Theory: Behavioural Modelling

::: theory title="What is behavioural modelling?"
A behavioural (dynamic) model describes how a system acts over time: the sequence of its operations, the states its objects pass through and the interactions between them [@sommerville; @pressman]. **Data-driven models** show how data is processed as it moves through the system; **event-driven (state-machine) models** show how the system responds to events [@sommerville]. Sahur Protocol has both faces: its seven modes (title, cutscene, play, choose, pause, beats, end) form a state machine, while a run is a long chain of calls between components, which interaction diagrams, above all the sequence diagram, capture [@fowler].
:::

A sequence diagram shows the participants of one scenario as vertical **lifelines** and the messages between them as horizontal arrows, ordered top to bottom in time [@uml251; @booch]. Here it realises *Play Game (Run)* and *Start New Game* from Chapter 5; @tbl:seq-notation summarises the notation.

::: plain
A sequence diagram is a **group-chat screenshot turned sideways**: everyone gets a column, every message is an arrow, and time runs downwards. A `loop` box means "this keeps happening"; an `alt` box means "only one of these happens": you beat the boss, or the boss beats you.
:::

Table: Sequence diagram notation used in this chapter {#tbl:seq-notation}
| Element | Notation | Meaning |
|---|---|---|
| Lifeline | Head box `:Name` above a vertical line | One participant (object, role or actor) in the scenario |
| Synchronous message | Solid line, filled arrowhead | A call: the sender waits until the receiver finishes |
| Asynchronous message | Solid line, open arrowhead | A signal: the sender carries on without waiting |
| Return | Dashed line | Control, or a value, flowing back to the caller |
| Self-message | Arrow looping back to its own lifeline | An object calling one of its own operations |
| Activation bar | Thin rectangle on a lifeline | The time the object is busy handling a message |
| Combined fragment | Labelled frame (`loop`, `alt`, `opt`) with [guards] | Repetition, exclusive branches, or an optional block |

## Elements Identified

The participants were chosen from the class model and from the real structure of the code. Each lifeline carries one of the analysis stereotypes: a **boundary** object talks to the actor, a **control** object coordinates a scenario, and an **entity** object holds data that outlives a single interaction [@pressman]. Saving is treated as a separate **service**. @tbl:seq-lifelines lists the lifelines and the code each one stands for.

Table: Lifelines of the sequence model and their counterparts in the code {#tbl:seq-lifelines}
| Lifeline | Stereotype | Responsibility in the model | Real code |
|---|---|---|---|
| Player | Actor | Gives input; clicks menus and cards | The person at the keyboard or touch screen |
| :GameUI | Boundary | Title, cutscene, upgrade and end screens | DOM overlays (`#titleOv`, `#cutOv`, `#chooseOv`, `#pauseOv`, `#endOv`); HUD from `render()` |
| :GameCtrl | Control | Owns the mode and the frame loop | `mode`, `loop()`, `startGame()`, `continueGame()`, `pauseGame()`, `gameOver()`, `showVictory()` |
| :RoomMgr | Control | Rooms, spawning, clear detection | `startRoom()`, `queueSpawn()`, `spawnBoss()`, `checkClear()`, `onBossDown()`, `openChoice()`, `openSkillRoll()` |
| :Enemy / :Boss / :Bubble | Entity | Opponents of rooms, biome ends and the finale | `ENEMY_TYPES`, `BOSSES`, enemy and boss parts of `update()`; `startFinalBoss()`, `finalPhaseCheck()`, `startBeats()` |
| :RunState | Entity | Player, Sahur, skills, biome, room, challenges | The `state` object returned by `newRun()` |
| :SaveMgr | Service | Saves, loads and clears the run | `serializeRun()`, `saveProgress()`, `loadProgress()`, `storageGet/Set/Remove()` |

Some message labels are shorthand: `clearSave()` stands for `storageRemove(SAVE_KEY)`, `save()` for `saveProgress()`, `applySkills()` for `applySkillLoadout()`, `damage()` for `damageEnemy()`, `evalChallenges()` for `evaluateBossChallenges()`, `skillRoll()` for `openSkillRoll()` and `phaseCheck()` for `finalPhaseCheck()`; `onDone()` and `afterPick()` are the callbacks given to `playCut()` and `openChoice()`.

## The Four Parts at a Glance

The four parts are continuous: Parts 2 and 3 open with a "continued from" bar, and Part 4 continues the *[last biome cleared]* branch of Part 3. @tbl:seq-parts shows where each part begins and ends; walkthrough numbers refer to the numbered messages of each diagram. Three on-screen moments from Parts 3 and 4 are shown in @fig:seq-boardroom, @fig:seq-collapse and @fig:seq-beats.

Table: The four parts of the sequence model {#tbl:seq-parts}
| Part | Scenario covered | Begins with | Ends with | Messages and fragments |
|---|---|---|---|---|
| 1 | New run, prologue, first skill | WAKE UP on the title screen | Room 1 set up and saved | 15 messages; 1 `loop` |
| 2 | Room loop and biome boss | The first enemy spawning | The boss reaching 0 HP | 15 messages; 3 `loop` |
| 3 | Boss outcome | Challenges evaluated | Next biome, Part 4, or game over | 13 messages; 2 `alt` |
| 4 | The AI Bubble and the finale | The `core_intro` cutscene | Victory screen, save deleted | 15 messages; 1 `loop` |
| All | One complete run | | | 58 messages; 7 fragments |

:::: gallery cols="3"
::: figure src="shots/22-cutscene-boardroom.png" id="seq-boardroom" frame="crt"
`playCut(biomeEnd)` after The Valuation: the boardroom cutscene of Part 3.
:::
::: figure src="shots/12c-bubble-collapse.png" id="seq-collapse" frame="crt"
PHASE 3 - COLLAPSE: the Bubble stops attacking and cannot be hurt.
:::
::: figure src="shots/13-beats-finale.png" id="seq-beats" frame="crt"
`startBeats()`: three scripted TUNGs on a screen fading to white.
:::
::::

::: plain
Think of the four parts as four episodes of one season: Part 1 is the pilot, Part 2 the grind, Part 3 the cliffhanger (or the cancellation) and Part 4 the finale. Each episode starts exactly where the last one ended.
:::

## Part 1: New Run, Prologue and First Skill

::: figure src="diagrams/exp6-seq-part1.png" id="seq-part1" size="large"
Sequence diagram, Part 1 of 4: a new run clears the old save, creates a fresh RunState, plays the prologue line by line and takes the first upgrade before room 1 is set up and saved.
:::

- **1–5** NEW GAME (the WAKE UP button) runs `startGame()`: old save deleted, fresh `state` built.
- **6–9** `playCut("prologue")` types out the six prologue lines, one loop pass per line.
- **10–13** The FIRST UPGRADE pick is applied to RunState, and `afterPick()` hands control back.
- **14–15** `startRoom()` builds biome 1, room 1 and saves the first checkpoint.

::: plain
Part 1 is the "press start" bit. The game bins your old save without asking (bold), reads you the prologue line by line and hands you a free skill. Then it saves, because it has trust issues.
:::

## Part 2: The Room Loop and the Biome Boss

::: figure src="diagrams/exp6-seq-part2.png" id="seq-part2" size="large"
Sequence diagram, Part 2 of 4: in each room, enemies spawn, the per-frame loop trades damage, the clear is detected and an upgrade is picked and saved; then the biome boss is fought.
:::

- **1** `spawn()` brings in the room's 5 to 11 enemies one at a time, each after a 0.7 s "!" warning.
- **2–5** One pass of `update(dt)`: input is read, hits land via `damage()`, enemies hit back.
- **6–10** `checkClear()` sees an empty room; an upgrade is picked and saved; the next room starts.
- **11–15** After the third combat room, `spawnBoss()`; patterns such as `fireRadial()` run until the boss falls.

::: plain
Two loops, one inside the other: the **outer** one is "for each room", the **inner** one is every single frame (you swing, they hit, numbers go down). After three rooms, the landlord shows up. That is the boss.
:::

## Part 3: Boss Outcome, Next Biome or Game Over

::: figure src="diagrams/exp6-seq-part3.png" id="seq-part3" size="large"
Sequence diagram, Part 3 of 4: the boss falls and the run moves on, or the player dies.
:::

- **1** `evalChallenges()` ticks off the boss-down, speed and *No low HP boss* challenges.
- **2–5** After the biome-end cutscene, the Signal Roll card cycles for 1.5 s and is claimed.
- **6–9** `biome++`, `room = 0` and a save; the inner `alt` opens the next biome or Part 4.
- **10–13** [player died]: `gameOver()` shows ABSORBED (for the save, see the model review).

::: plain
The fork in the road. Win: a cutscene, a free skill from the slot machine, next biome. Lose: the Bubble "absorbs" you. The `alt` box means only one of these happens.
:::

## Part 4: The AI Bubble and the Finale

::: figure src="diagrams/exp6-seq-part4.png" id="seq-part4" size="large"
Sequence diagram, Part 4 of 4: the core cutscene, the final upgrade, the phased AI Bubble fight and the beats finale lead to victory, and the save is cleared.
:::

- **1–5** The `core_intro` cutscene plays, then the FINAL UPGRADE is picked and applied.
- **6** `startFinalBoss()` spawns The AI Bubble (1,350 HP) in the white Core arena.
- **7–9** `damage()` and `phaseCheck()` drive it through HYPE, SCALE (below 66%) and COLLAPSE.
- **10–15** `startBeats()`, then `showVictory()`: the save is deleted and WE WON. lists the skills.

::: plain
The final boss is a giant soap bubble with a face, about as threatening as AI hype. Sahur lands three last TUNGs, and the game deletes your save on the way out.
:::

## Save Checkpoints

The save is the only state that survives closing the tab, so it is worth tracing exactly where :SaveMgr is called. @tbl:seq-saves lists every event that writes, deletes or deliberately keeps the `sahurProtocolRunV1` record, and where it appears in the four parts.

Table: Events that write, delete or keep the save, and where they appear in the diagrams {#tbl:seq-saves}
| Event | Function in the build | Effect on the save | In the diagrams |
|---|---|---|---|
| Room start (combat and boss rooms) | `startRoom()` | Writes | Part 1 msg 15, Part 2 msg 10, inside Part 3 msg 8 |
| Upgrade card picked (FIRST, CHOOSE, FINAL) | Card handler in `openChoice()` | Writes | Folded into Part 1 msgs 11–13, Part 2 msgs 8–10, Part 4 msgs 4–5 |
| New challenge completed | `completeChallenge()` | Writes | Inside Part 3 msg 1 |
| Signal Roll claimed | Card handler in `openSkillRoll()` | Writes | Part 3 msg 5 |
| Biome advance | Callback in `onBossDown()` | Writes | Part 3 msgs 6–7 |
| Final boss start | `startFinalBoss()` | Writes | Part 4 msg 6 |
| Pause, or MAIN MENU from pause | `pauseGame()`, `goMainMenu()` | Writes | Outside the run scenario |
| WAKE UP or RESTART RUN | `startGame()` | Deletes, with no prompt | Part 1 msg 3 |
| Victory | `showVictory()` | Deletes | Part 4 msg 13 |
| Game over | `gameOver()` | Keeps; the button offers RETRY CHECKPOINT | Part 3 msg 11 (see the model review) |

The record holds the biome, room, skill levels, unlocked skills, completed challenges, rooms cleared, speed-cleared bosses and the player's HP; it does not hold enemies, boss HP, Sahur's state, the boss timer, the cutscene position or the audio settings. Loading therefore restarts the saved room from the beginning (`continueGame()`), or goes straight to The AI Bubble once all three biomes are done. Saving at every room start is what makes a checkpoint meaningful; the extra saves after picks and challenges make sure no reward is lost.

::: plain
The game saves like a nervous student hitting Ctrl+S: every room, every upgrade, every challenge, and whenever you pause. Winning wipes the slate clean. Losing does not: your last checkpoint is still there, which is why the button says RETRY CHECKPOINT and not "start over, loser".
:::

## Model Review

As with the class model, the four diagrams were walked through against the source of the delivered build. They are kept as drawn; @tbl:seq-review lists each finding and the revision it suggests.

Table: Model review: the sequence diagrams compared with the build {#tbl:seq-review}
| Where | Diagram shows | Build does | Revision |
|---|---|---|---|
| Part 3 · 10–13 | `gameOver()` clears the save; run summary | The save is kept; ABSORBED offers RETRY CHECKPOINT | Msg 11 becomes "checkpoint kept", msg 13 the retry |
| Part 3 · [player died] | Death as a boss-fight outcome | `damagePlayer()` can end any room, after a revive check | Move the branch into Part 2's frame loop |
| Part 4 · 10–12 | "bubble down", beats, victory | Invulnerable below 33% HP; then `sacrifice`, beats and `epilogue` | Add the collapse and both cutscenes |
| Part 4 · 3–4 | Always a final upgrade | Only while a skill can still level up | Wrap in `opt` [skills available] |
| All parts | Saves at room start and biome change | Also after picks, challenges, rolls, final boss, pause, menu | Add the missing `save()` calls (@tbl:seq-saves) |
| Part 2 · 2–5 | Input and hits as messages | Input is polled per frame; Sahur's TUNG hits on its own timer | Add a :Sahur lifeline with a timed `tung()` |
| Part 2 · 7, Part 3 · 2 | Immediate calls | Picker opens 450 ms after a clear; cutscene 900 ms after a boss | Draw as asynchronous (timer) messages |
| Not drawn | – | CONTINUE and RETRY CHECKPOINT reload via `continueGame()` | A separate *Continue Game* diagram |

::: plain
Plot twist: you never actually pop the Bubble. The diagram says "bubble down"; the code says "the Bubble collapses and Sahur finishes it", which is far sadder and much better writing.
:::

## Observations and Learning

- Drawing the run as messages made its control structure explicit: :GameCtrl owns the mode, :RunState is the shared entity, and the frames expose loops and branches.
- Reviewing it against the code found more differences than the class review: timers, callbacks and scripted story beats are where intent and implementation drift apart.

::: cleared
- Eight lifelines with analysis stereotypes; a complete run modelled in four continuous diagrams (58 messages, 7 fragments).
- Every save checkpoint traced, including the delete on victory and the keep on game over.
- Eight review findings recorded for the next revision of the behavioural model.
:::
