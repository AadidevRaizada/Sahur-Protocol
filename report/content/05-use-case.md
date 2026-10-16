---
num: 5
title: Use Case Modelling
exp: Experiment 3
kicker: The user's view of the system - who plays, and what each of them gets out of it.
shot: shots/05-first-upgrade.png
objectives:
  - Analyse the game as a system and group the functions it offers
  - Identify the actors and the use cases each of them starts
  - Separate «include» from «extend» with one clear test
  - Draw the use case diagram and expand its two heaviest use cases
  - Review the model against the real build
---

This chapter looks at the game from the outside, as a set of goals that people and devices pursue through it, and records those goals as a UML use case model.

## Aim and Outcomes

**Aim.** To analyse Sahur Protocol from the user's point of view by identifying its actors and use cases and drawing the use case diagram. After the experiment the team should be able to find the functions a system offers, list its actors and use cases, relate the use cases with «include» and «extend» on a principled basis, and expand the key ones into structured descriptions. The procedure followed the lab sheet: analyse the system's functionality, list the use cases and actors, and then draw the diagram with its associations [@pressman].

## Theory

::: theory title="Scenario-based modelling and use cases" long="1"
Scenario-based modelling describes a system through the ways its users interact with it. In UML requirements modelling it begins with scenarios written as **use cases**, later refined with activity and swimlane diagrams [@pressman]. A use case records an interaction between the system and one or more **actors**: anything outside the system that produces or consumes information, whether a person, a device or another system [@booch; @uml251]. Each use case should deliver a result of value that its primary actor actually wants, so it is named after a goal rather than a key press [@cockburn]. Use cases are developed by listing the activities one actor performs for one function, repeating this for every actor and function, writing each as a narrative before mapping it onto a template, and finally reviewing each primary scenario for alternatives, errors and other behaviour [@pressman].
:::

Table: UML use case notation used in this chapter [@uml251; @fowler] {#tbl:uc-notation}
| Element | Drawn as | Meaning |
|---|---|---|
| Actor | Stick figure outside the boundary | A role that interacts with the system |
| Use case | Oval inside the boundary | A goal that the system fulfils for an actor |
| System boundary | Labelled rectangle | Separates the system from its environment |
| Association | Solid line | The actor takes part in the use case |
| «include» | Dashed arrow, base → included | Behaviour that runs on **every** execution of the base |
| «extend» | Dashed arrow, extension → base | Optional behaviour inserted when a condition holds |

::: theory title="Include or extend?"
An **«include»** factors out behaviour that the base use case always needs, so the base is incomplete without it. An **«extend»** adds behaviour that may or may not happen: the base is complete on its own, and the extension is inserted at an extension point when its condition holds [@uml251; @booch]. That is why the arrows point in opposite directions. Fowler advises using both sparingly, only where they remove real duplication or make a real variation visible [@fowler]. The rule applied here: **a step that happens on every execution of the base is an «include»; a step that the player may or may not take is an «extend».**

The sheet also asks for **exceptions**, found by asking of each use case: is there a validation step, can a supporting actor fail to respond, and can poor performance lead to improper use? Handling an exception may need extra use cases [@pressman].
:::

::: plain
A use case is "a thing you can sit down and get done": beating The AI Bubble counts, pressing [[W]] does not. «include» is what always happens (the prologue on every WAKE UP); «extend» is the optional detour (RESTART RUN from the pause menu after a deeply embarrassing room).
:::

## Analysis of System Functionality

Treated as a system, the game offers four groups of functions, from which the use case list was derived.

:::: cards cols="2"
::: card title="Session control" tag="GROUP 1" color="magenta"
- Begin a fresh run (WAKE UP) or resume one (CONTINUE)
- Pause, resume, restart or return to the menu
- Leave the game
:::
::: card title="The run loop" tag="GROUP 2" color="cyan"
- Move and swing while Sahur's TUNG fires on its own
- Clear rooms, defeat each biome's boss, pick upgrades
- Complete optional challenges
:::
::: card title="Story and instruction" tag="GROUP 3" color="yellow"
- The prologue and the cutscenes between biomes
- The Story and How to play panes
:::
::: card title="Configuration and persistence" tag="GROUP 4" color="lime"
- Sound, volume and touch-control layout
- Automatic checkpoint saves, and reading them back
:::
::::

## Actors and Use Cases

One human actor drives the system. The other three are device-side actors that the game depends on but does not control, so each sits outside the system boundary.

Table: Actors identified for Sahur Protocol {#tbl:uc-actors}
| Actor | Type | Responsibility in the system |
|---|---|---|
| Player | Primary, human | Starts runs, moves, swings, picks upgrades, pauses and changes options. |
| Audio System | Secondary, device | Plays the synthesised music, effects and choir track [@mdnaudio]; combat never reads it. |
| File System (browser storage) | Secondary, device | Keeps the run checkpoint and the touch-control layout in `localStorage` [@mdnstorage]. |
| Display Device | Secondary, device | Shows the 960×540 canvas at 16:9, with menu overlays above it. |

@tbl:uc-primary lists the ten primary use cases, drawn as yellow ovals in the diagram.

Table: Primary use cases and their behaviour in the build {#tbl:uc-primary}
| ID | Use case | Actor | Description |
|---|---|---|---|
| UC1 | Start New Game | Player | **WAKE UP**: a fresh run in Hype Cycle Forest, room 1, no upgrades. |
| UC2 | Continue Game | Player | **CONTINUE**, shown only with a checkpoint; restarts the saved room. |
| UC3 | Play Game (Run) | Player | The session from room 1 until the Bubble or the player falls. |
| UC4 | Pause Game | Player | [[Esc]] or **II**: freezes the run, saves, opens the pause menu. |
| UC5 | View Story (Cutscenes) | Player | **Story**: a short premise paragraph with a Back button. |
| UC6 | View How to Play | Player | **How to play**: controls, tap-to-swing, the shape of a run. |
| UC7 | Configure Settings | Player | **Options**: sound on/off, volume, mobile control mode and layout. |
| UC8 | Exit Game | Player | Leaving the game, done by closing the browser tab. |
| UC9 | Save Progress | File System | Writes biome, room, skills, challenges and HP, automatically. |
| UC10 | Load Progress | File System | Reads the checkpoint, checks its version, rebuilds the run. |

::: stats
- 26 | Use cases
- 4 | Actors
- 12 | «include» links
- 3 | «extend» links
:::

:::: gallery cols="3"
::: figure src="shots/02-prologue.png" id="uc-prologue" frame="crt"
*Play Prologue Cutscene*, included in every Start New Game.
:::
::: figure src="shots/04b-pause.png" id="uc-pause" frame="crt"
*Pause Game* with its extending options.
:::
::: figure src="shots/18-challenges-panel.png" id="uc-challenges" frame="crt"
*Complete Challenges*: the panel opened with [[C]].
:::
::::

## Relationships Between Use Cases

The remaining sixteen use cases are never started on their own. Fourteen of them are included or extending use cases, related as shown in @tbl:uc-rel by the "every execution?" rule from the theory. The other two, *Play Music / Sound Effects* and *Render Game Graphics*, are the diagram's **supporting** use cases, each associated only with its device actor.

Table: Included and extending use cases, with the reason for each relationship {#tbl:uc-rel}
| Base use case | Relation | Related use case | Reason, as built |
|---|---|---|---|
| Start New Game | «include» | Play Prologue Cutscene | Every WAKE UP plays the prologue; it has no skip-all. |
| Start New Game | «include» | Enter First Room | Control always passes to the player in room 1. |
| Enter First Room | «include» | Choose First Upgrade | The FIRST UPGRADE pick precedes the first enemy. |
| Continue Game | «include» | Load Progress | Nothing resumes until the checkpoint is read. |
| Play Game (Run) | «include» | Move Character | [[W]] [[A]] [[S]] [[D]], arrows or the stick, read every frame. |
| Play Game (Run) | «include» | Attack Enemies | [[Space]], [[J]] or SWING: the player's own damage. |
| Play Game (Run) | «include» | Clear Room | A run advances only by emptying rooms. |
| Play Game (Run) | «include» | Fight Boss | Three biome bosses, then The AI Bubble. |
| Play Game (Run) | «include» | Choose Upgrade | Opens after every combat room; only the choice is free. |
| Play Game (Run) | «include» | Complete Challenges | Eleven goals, tracked automatically; [[C]] shows them. |
| View Story (Cutscenes) | «include» | Watch Cutscenes | As modelled, it presents the narrative (see Model review). |
| Configure Settings | «include» | Adjust Volume / Controls | The Options pane exists to change these values. |
| Pause Game | «extend» | Resume Game | RESUME or [[Esc]]: one optional way out. |
| Pause Game | «extend» | Restart Run | RESTART RUN: a second optional branch. |
| Pause Game | «extend» | Return to Main Menu | MAIN MENU; Pause Game is complete without all three. |

## The Use Case Diagram

::: figure src="diagrams/exp3-usecase.png" id="uc-diagram" size="full"
Use case diagram for the Sahur Protocol game system: the Player on the left, three device actors on the right, and 26 use cases inside the system boundary.
:::

The Player has association lines to seven primary use cases; Exit Game sits at the bottom without one. Start New Game heads a chain of includes, since Enter First Room in turn includes Choose First Upgrade. Play Game (Run) fans out into six included use cases, and the three extensions of Pause Game point back at it. On the right, each device actor is joined to the use case it serves. Load Progress appears twice, as the red oval included by Continue Game and the yellow oval beside the File System: one use case, drawn twice so that its connector does not cross the frame.

::: plain
Read it like a menu. The Player on the left can order seven things. The three gadgets on the right (speakers, storage, screen) never order anything; they just get handed work. Green ovals come free with your order, purple ones are optional sides, and the red ones are the kitchen.
:::

## Expanded Use Case Descriptions

The two use cases that carry the most behaviour are written out in a structured template, with the main flow kept apart from the alternate and exception flows [@cockburn; @pressman].

### UC1 Start New Game

Table: UC1 Start New Game: expanded description {#tbl:uc-new}
| Field | Detail |
|---|---|
| Actors | Player (primary); Audio System, Display Device, File System (secondary) |
| Pre-condition | The title screen is showing. |
| Main flow | **1.** The player selects WAKE UP. **2.** The system deletes any checkpoint without a prompt, creates a fresh run and stops the menu music. **3.** The prologue plays line by line; the first press of [[Space]], [[Enter]] or a click completes a line, the next advances it. **4.** FIRST UPGRADE offers three of the nine default skills. **5.** The player picks one, room 1 starts and control passes to Play Game (Run). |
| Alternate and exception flows | The same flow runs from RESTART RUN, from AGAIN - FOR HIM, and from WAKE UP AGAIN after a game over with no checkpoint. Touch devices also request fullscreen landscape; a refusal fails silently. |
| Post-condition | A run is active in room 1 with one upgrade and its first checkpoint. |

### UC3 Play Game (Run)

@tbl:uc-run-main gives the main flow of the run and @tbl:uc-run-sum the conditions around it.

Table: UC3 Play Game (Run): main flow {#tbl:uc-run-main}
| Step | Player | System |
|---|---|---|
| 1 | – | Starts the room and its music, writes a checkpoint, and sends enemies in one at a time from the edges, each after a "!" warning. |
| 2 | Moves and dodges. | Moves the player inside the arena; Sahur follows. |
| 3 | Taps [[Space]] or [[J]]. | If the 0.38 s cooldown has passed, every enemy in reach is hit; no timing window is involved. Sahur's TUNG fires on its own timer. |
| 4 | – | When nothing is left alive or queued, marks the room cleared and opens CHOOSE AN UPGRADE. |
| 5 | Picks one of up to three cards. | Applies it, saves and starts the next room. Steps 1 to 5 repeat for three combat rooms. |
| 6 | Defeats the biome boss and claims the rolled skill. | Plays the end-of-biome cutscene and the one-card Signal Roll, then saves and moves to the next biome. |
| 7 | Picks the FINAL UPGRADE and fights The AI Bubble. | After the third biome: core cutscene, final picker, three-phase Bubble fight. At one third HP the Bubble collapses; the sacrifice, the three-TUNG finale and the epilogue follow, then victory. |

Table: UC3 Play Game (Run): actors, conditions and alternate flows {#tbl:uc-run-sum}
| Field | Detail |
|---|---|
| Actors | Player (primary); Audio System, Display Device, File System (secondary) |
| Pre-condition | A run exists, created by Start New Game or restored by Continue Game. |
| Trigger | The first upgrade is picked, or CONTINUE or RETRY CHECKPOINT is pressed. |
| Alternate flows | **A1** [[Esc]] or the II button starts Pause Game, which writes a checkpoint. **A2** [[C]] or a tap at the top right toggles the challenge panel. **A3** At zero HP with Second Wind owned, the player revives at half HP. |
| Exception flow | **E1** At zero HP with no revive left, the run ends on **ABSORBED** and the checkpoint is kept for RETRY CHECKPOINT. Other exceptions are in @tbl:uc-exc. |
| Post-condition | Success: the ending plays, **WE WON.** is shown and the checkpoint is deleted. Failure: the game-over screen. |

## Exceptions Considered

Each primary use case was checked against the sheet's exception questions. The table records what the build does in each case.

Table: Exceptions brainstormed against the primary use cases {#tbl:uc-exc}
| Question | Situation in Sahur Protocol | How the build responds |
|---|---|---|
| Validation step? | Continue needs a checkpoint. | CONTINUE is hidden without one; bad records are rejected. |
| Audio System fails? | Sound is blocked until the user interacts. | Audio starts on the first press; combat never depends on it. |
| File System fails? | Storage is blocked or full. | Every storage call is wrapped in try/catch; the game keeps running. |
| Poor performance? | The frame rate drops. | The frame step is capped at 33 ms, so the game slows down instead of skipping; no input is timed. |
| Device context? | A phone is held in portrait. | A ROTATE DEVICE overlay appears. |

## Model Review

Reviewing a model against the implemented product is a normal verification activity: it checks that the model still describes the system that exists [@sommerville]. Comparing @fig:uc-diagram with the build gave the findings below.

Table: Model review: diagram elements compared with the build {#tbl:uc-review}
| Model element | Behaviour in the build | Revision to the model |
|---|---|---|
| Exit Game | No quit button; the player closes the tab. The oval has no association. | Move it outside the boundary, or remove it. |
| View Story, Watch Cutscenes | Story is a static premise; there is no cutscene gallery. Cutscenes play only inside a run. | Rename it *Read Premise*; include *Watch Cutscene* from Start New Game and Fight Boss. |
| Save Progress | Automatic at room start, upgrade pick, Signal Roll, challenge, biome change, pause, menu and Bubble start. | An «include» of those use cases. |
| Choose Upgrade | Boss rooms give a one-card Signal Roll; a FINAL UPGRADE precedes the Bubble. | Add *Claim Signal Roll* under Fight Boss. |
| Start New Game | WAKE UP and RESTART RUN delete the checkpoint unasked. | A confirmation would «extend» it. |
| Pause Game | The menu also offers CONTROLS for the touch layout. | Add *Adjust Controls* as a fourth «extend». |
| End of a run | RETRY CHECKPOINT reloads; AGAIN - FOR HIM starts over. | Add *View End Screen*. |
| Adjust Volume / Controls | Sound settings reset on load; only the touch layout is stored. | Note it in the description. |

::: plain
The diagram is the plan; the game is what shipped. Holding them side by side is like comparing the menu photo with the burger you actually got: mostly the same, but worth writing down where the cheese went.
:::

## Observations and Learning

It is tempting to give Move Character and Attack Enemies their own lines to the Player, since the player really presses those keys. A use case, however, must deliver an outcome that the actor values on its own [@cockburn], so both sit under Play Game (Run). Likewise, Choose Upgrade looks optional, but the picker appears after every cleared combat room, so it is an «include»; the pause options are the genuine extensions.

Separating the device actors from the Player made the boundary explicit: the game depends on the browser's storage and audio but controls neither, which is exactly why each needed an exception path. Because combat never reads the music, an audio failure lowers the experience but never breaks the game logic. The review of the drawing also closed two loose ends. Exit Game had no association, and Save Progress had nothing inside the system to trigger it; Load Progress, by contrast, only looks duplicated, since it is one use case drawn twice to keep the connectors short.

::: cleared
- Four groups of system functionality analysed; one human and three device actors identified.
- 26 use cases listed, with 12 «include» and 3 «extend» relationships assigned by the "every execution?" test.
- Use case diagram presented (@fig:uc-diagram); Play Game (Run) and Start New Game expanded.
- Exceptions checked against the build, and the model reviewed against the implementation.
:::
