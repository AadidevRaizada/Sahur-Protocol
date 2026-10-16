---
num: 6
title: Activity Modelling
exp: Experiment 4
kicker: One run as a flow of actions - every decision between waking up and the two ways it can end.
shot: shots/09-upgrade-choice.png
objectives:
  - Identify the activities in one run and who performs them
  - Choose the right UML symbol for each action, decision, merge and end
  - Draw the gameplay-loop activity diagram (@fig:act-diagram)
  - Map each node to the game's real modes and functions
---

## Aim and Outcomes

**Aim.** To create an activity diagram for the Sahur Protocol gameplay loop (performed on 27/08/2026). The use case model of Chapter 5 lists what the player can do but not in what order; the activity diagram adds that order and the conditions that steer it. After the experiment the team should be able to understand the activities in the system and identify the actors who perform them. The procedure: identify the **activities**, their **associations**, the **conditions** that guard each branch and the **constraints** on the flow; arrange them into a mental layout of the whole flow; then draw the diagram.

## Theory

::: theory title="What is an activity diagram?" long="1"
An activity diagram describes the dynamic behaviour of a system as a flow of control from one **action** to the next [@uml251; @booch]. Sequence diagrams show the messages that pass between objects; an activity diagram instead shows the order of the actions and the conditions that steer it. Control may flow in sequence, branch at a decision, or split into concurrent flows that later join again [@fowler]. In UML 2 the meaning of every node is defined by **tokens** travelling along the edges, which gives decisions, merges, forks and joins precise semantics [@uml251; @fowler].

It resembles a flowchart but adds standard notation for concurrency, for responsibility (partitions, or swimlanes) and for several end points. It does not match the code line for line; it models workflows, the steps of a use case, and a high-level view of a system for non-technical readers [@pressman; @fowler].
:::

::: pagebreak
:::

Table: Activity diagram notation [@uml251; @fowler] {#tbl:act-notation}
| Symbol | Name | Meaning |
|---|---|---|
| Filled black circle | Initial node | Where the flow starts |
| Rounded rectangle | Action | One step of work |
| Diamond with `[guards]` | Decision node | One flow in, several out; exactly one guard should hold |
| Diamond, several in, one out | Merge node | Rejoins alternative paths without waiting |
| Thick bar | Fork / join | Splits into concurrent flows / waits for all of them |
| Bull's-eye | Activity final | Ends the whole activity |
| Lanes | Partition (swimlane) | Groups the actions by who performs them |

::: plain
An activity diagram is a flowchart that went to university. Same boxes and arrows, plus proper rules for decisions, for merging paths, for things happening at the same time, and for having more than one way to end.
:::

## Activities and Actors

Two actors perform the activities of a run: the **Player**, who starts runs, fights and picks upgrades, and the **Game System**, which tracks rooms and HP, evaluates every decision and triggers the cutscenes, pickers and end screens. The diagram has no swimlanes, so the table records who performs each action.

Table: Activities identified by following one run from page load to its end {#tbl:act-list}
| Activity | Description | Actor | Where |
|---|---|---|---|
| Launch Game / Main Menu | The page loads and the title screen appears | Player | Title screen |
| Start New Run | A fresh run is created | Player | WAKE UP |
| Play Intro Cutscene | The prologue introduces Sahur, the companion | Game System | Prologue |
| Enter Next Room | The next room of the run begins | Game System | Arena |
| Fight Enemies | Combat until the room is empty | Player | Arena |
| Choose a Relic | One upgrade is picked from the cards offered | Player | Upgrade picker |
| Check Player HP | The run goes on only while HP stays above zero | Game System | During combat |
| Show Game Over Screen | The run has been lost | Game System | ABSORBED |
| Enter Boss Room | Reached once the regular rooms are cleared | Game System | Boss arena |
| Battle the AI Bubble | The final boss fight, with Sahur's help | Player | The Core |
| Play Finale Cutscene | The story resolves after the boss | Game System | Ending cutscenes |
| Show Victory / End Screen | The end of a successful run | Game System | WE WON. |

## The Activity Diagram

::: figure src="diagrams/exp4-activity.png" id="act-diagram" size="full"
Activity diagram of the Sahur Protocol gameplay loop: the initial node, the room-type branch, the HP and rooms-cleared decisions, the boss encounter, and the two activity final nodes (Game Over and Victory).
:::

### Walkthrough of the control flow

1. The **initial node** leads to *Launch Game / Main Menu*, *Start New Run* and *Play Intro Cutscene (Sahur Joins Player)*, which run once per run in strict sequence.
2. *Enter Next Room* heads the loop. The **Room Type?** decision sends `[combat]` to *Fight Enemies (Combat Encounter)* and `[relic]` to *Choose a Relic*, which corresponds to the game's upgrade picker. Both branches rejoin at a **merge node**, the small empty diamond, which does not wait: whichever branch was taken carries on.
3. **Player HP > 0?** checks survival; `[no]` leads to *Show Game Over Screen* and the first **activity final** node.
4. `[yes]` reaches **All Rooms Cleared?**. `[no, rooms remain]` follows the long edge on the right back to *Enter Next Room*. This guarded back edge is the loop that makes the game a roguelite; no special loop symbol is needed.
5. `[yes]` leaves the loop for *Enter Boss Room (The AI Bubble)* and *Battle the AI Bubble (with Sahur's Help)*, ending at **Boss Defeated?**. `[no]` joins the edge into *Show Game Over Screen*; `[yes]` continues to *Play Finale Cutscene*, *Show Victory / End Screen* and the second final node.

::: stats
- 11 | Actions
- 4 | Decisions
- 1 | Merge node
- 2 | Final nodes
:::

::: plain
One run, top to bottom: wake up, clear rooms until none are left, fight the big shiny Bubble, then either cry at the ending or get ABSORBED. The long arrow on the right is the "one more room" loop that every roguelite player knows far too well.
:::

:::: gallery cols="2"
::: figure src="shots/15-gameover.png" id="act-gameover" frame="crt"
The first final node, *Show Game Over Screen*: ABSORBED, with the checkpoint kept for RETRY CHECKPOINT.
:::
::: figure src="shots/14-victory.png" id="act-victory" frame="crt"
The second final node, *Show Victory / End Screen*: WE WON., listing the skills upgraded in the run.
:::
::::

## Mapping the Nodes to the Build

The diagram was drawn at the level of the player's experience, yet every node can be traced to the game's `mode` state machine and the functions that drive it. Chapter 8 follows the same flow message by message.

Table: Activity nodes mapped to the game's modes and functions {#tbl:act-map}
| Activity node | Mode | Function(s) in the code |
|---|---|---|
| Launch Game / Main Menu | `title` | page load, `updateContinueButton()` |
| Start New Run | `title` → `cutscene` | `startGame()`, `newRun()` |
| Play Intro Cutscene | `cutscene` | `playCut("prologue")`, `advanceCut()` |
| Enter Next Room; Room Type? | `play` | `startRoom()` and its `room < 3` test |
| Fight Enemies | `play` | `update(dt)`, `damageEnemy()` |
| Choose a Relic | `choose` | `openChoice()`, `applySkillLoadout()` |
| Player HP > 0? | `play` | `damagePlayer()`, on every hit |
| All Rooms Cleared? | `play` | `checkClear()` |
| Show Game Over Screen | `end` | `gameOver()` |
| Enter Boss Room to Boss Defeated? | `play` | `startFinalBoss()`, `finalPhaseCheck()` |
| Play Finale Cutscene | `cutscene`, `beats` | `playCut("sacrifice")`, `startBeats()`, `playCut("epilogue")` |
| Show Victory / End Screen | `end` | `showVictory()` |

## Model Review

Comparing the diagram with the build is a verification step: it checks that the model describes the game that actually runs [@sommerville]. The findings are listed with the revision each one implies.

Table: Model review: activity diagram compared with the build {#tbl:act-review}
| Model element | Behaviour in the build | Revision to the model |
|---|---|---|
| Room Type? `[relic]` → Choose a Relic | Only combat and boss rooms exist. The upgrade pick follows every cleared combat room, and the screen calls it an "upgrade" or "skill"; "relic" survives only as the internal list `state.relics`. | Guards `[combat room]` / `[boss room]`; *Choose an Upgrade* after *Fight Enemies*. |
| Player HP > 0?, once per room | HP is checked on every hit. At zero, Second Wind revives at half HP if owned; otherwise the run ends at once. | Move the check inside *Fight Enemies*, with a revive branch. |
| One boss room | Each of the three biomes ends with its own boss, a cutscene and a one-card Signal Roll; then come the core cutscene and a FINAL UPGRADE. | Add an outer `[biomes remain]` loop and the two pre-Bubble actions. |
| Boss Defeated? `[no]` | The BOSS TIMER only feeds challenges, so a fight is lost only through HP. The Bubble collapses on a script at one third HP. | Use the in-fight HP check; *Bubble collapses* leads on. |
| Play Finale Cutscene | Sacrifice cutscene, the non-interactive three-TUNG finale, then the epilogue. | Split into three actions. |
| Start of the flow | CONTINUE and RETRY CHECKPOINT re-enter at the saved room. | Add a `[new run]` / `[continue]` decision. |
| No concurrency | Swings, Sahur's TUNG timer and enemy spawning run in the same frame loop. | Fork *Fight Enemies* into three flows, joined at "room cleared". |
| Edges into one action | Under UML 2 token rules, an action with two incoming edges waits for both: an implicit join [@uml251; @fowler]. | Route the loop-back and the two Game Over edges through merge nodes. |

::::: columns
:::: col
::: aside title="REVISED FLOW, AS BUILT"
1. Main menu: `[new run]` prologue and FIRST UPGRADE, or `[continue]` load the checkpoint.
2. For each of three biomes: three combat rooms, each followed by an upgrade; then the boss, its cutscene and the Signal Roll.
3. Core cutscene, FINAL UPGRADE, The AI Bubble in three phases.
4. Sacrifice, three-TUNG finale, epilogue, victory.
5. At any hit: zero HP and no revive means game over.
:::
::::
:::: col
::: figure src="shots/13b-beats-first-tung.png" id="act-beats" frame="crt"
Inside *Play Finale Cutscene*: the first of three scripted TUNGs, during which the player gives no input.
:::
::::
:::::

::: plain
In the real game Sahur doesn't wait for you to finish swinging before he TUNGs; he is on his own clock. That's concurrency, and a fork bar is UML's way of saying "these happen at the same time". The diagram skipped it, and to be fair, so does everyone mid-fight.
:::

## Observations and Learning

The use case model said what the player can do; the activity diagram put those goals in order and made every condition explicit. Writing a guard on each outgoing edge forced each decision to be complete, and the room loop needed no special symbol, only a guarded back edge. Drawing at the level of the player's experience kept the diagram readable but hid where the checks really happen: HP is tested on every hit, and Sahur's TUNG runs concurrently with the player's swings, which is what fork and join bars are for. The right level of detail depends on who reads the diagram [@fowler]. Finally, the two final nodes match the game's two endings; in the build both end screens offer a way back in, but the diagram deliberately models a single run.

::: cleared
- Twelve activities and two actors identified for one run; eleven are drawn as actions and the HP check as a decision.
- Activity diagram presented (@fig:act-diagram) with one loop, four decisions, one merge and two final nodes.
- Every node mapped to a real `mode` and function of the build.
- Model reviewed against the build: per-biome bosses, per-hit HP checks, the three-part finale and the missing concurrency recorded as revisions.
:::
