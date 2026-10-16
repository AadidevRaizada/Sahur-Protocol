---
num: 4
title: Agile Non-Functional Requirements
exp: Experiment 2
kicker: How well the game must run, written as stories a tester can check.
shot: shots/04d-settings-scrolled.png
objectives:
  - Distinguish functional from non-functional requirements
  - Elicit quality requirements with a fourteen-point checklist
  - Write NFRs as user stories with testable acceptance criteria
  - Define system-wide constraints and a Definition of Done
  - Link each quality to a design decision in the build
---

**Aim.** To identify the non-functional requirements (NFRs) of a software project and capture them in agile form: as user stories with acceptance criteria, as system-wide constraints and in a Definition of Done, and to link design decisions to the qualities they deliver. Sections 4.1 to 4.4 condense the theory (Part A); Section 4.5 is the NFR document for Sahur Protocol (Part B).

## Functional versus Non-Functional Requirements

A functional requirement says what the system does; a non-functional requirement says how well it does it, or under which constraints [@sommerville]. @tbl:nfr-fr-vs-nfr condenses the lab sheet's comparison and adds an example from this project.

Table: Functional versus non-functional requirements {#tbl:nfr-fr-vs-nfr}

| # | Functional | Non-functional |
|---|---|---|
| 1 | Defines *what* the customer needs | Defines *how* the system must deliver it |
| 2 | Elicited by analysts, specified by the customer | Defined by the technical team (architects, developers) |
| 3 | Recorded in the requirements document | Recorded in technical documents |
| 4 | Describes a function of the system | Describes a quality attribute of the system |
| 5 | Captured as a user story | Captured as a story, or as acceptance criteria of one |
| 6 | Tested and validated by the customer | Experienced by the customer rather than tested |
| 7 | Easy for customers to state | Hard for customers to state |
| 8 | Defines product features | Defines product properties |
| e.g. | WAKE UP starts a new run (FR-01) | No simulation step exceeds 33 ms (NFR-01) |

::: plain
FRs are the move list: swing, dodge, pick an upgrade. NFRs are whether the controller lags. Nobody writes "please don't stutter" on a wish list, but every player notices within ten seconds.
:::

## Quality Attributes

::: theory title="Quality as softgoals"
ISO/IEC 25010 describes product quality through eight characteristics: functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability and portability [@iso25010]. Chung et al. treat NFRs as *softgoals* that are satisficed to an acceptable degree rather than simply met, where improving one often costs another [@chung]. The lab sheet stresses the first five attributes below [@sommerville]; portability is added because a browser game depends on it.
:::

:::: cards cols="3"
::: card title="Usability" tag="LEARN · USE · RECOVER" color="magenta"
Easy to learn, efficient to use, forgiving of errors. **Here:** controls on the title screen; self-paced cutscenes.
:::
::: card title="Efficiency" tag="CPU · MEMORY · NETWORK" color="cyan"
Little use of processor, memory and bandwidth. **Here:** one 1.08 MB file; music synthesised in code.
:::
::: card title="Reliability" tag="FEW FAILURES" color="yellow"
Few failures, handled gracefully. **Here:** guarded storage; checkpoints survive a game over.
:::
::: card title="Maintainability" tag="EASE OF CHANGE" color="lime"
Cheap to change because change was anticipated. **Here:** content lives in data tables.
:::
::: card title="Reusability" tag="USE ELSEWHERE" color="violet"
Parts work in other systems with little change. **Here:** sequencer, cutscene player, storage helpers.
:::
::: card title="Portability" tag="ANY BROWSER" color="orange"
Runs in other environments without rework. **Here:** desktop keyboard or phone touch, one file.
:::
::::

## Eliciting Non-Functional Requirements

Stakeholders state functions readily but assume qualities without saying so; NFRs are implicit, and the analyst must draw them out with the right questions [@sommerville; @chung]. The lab sheet's fourteen-point checklist was put to this project, and @tbl:nfr-elicit records the answers as built.

Table: NFR elicitation checklist applied to Sahur Protocol {#tbl:nfr-elicit}

| Attribute | Question asked | Answer for Sahur Protocol |
|---|---|---|
| Performance | How fast? | Input is read every frame; each simulation step is capped at 33 ms. |
| Availability | What if it is down? | Static files on Vercel; once loaded no server is needed, and a copy runs from disk. |
| Security | Who is kept out? | No accounts, server code or personal data; `nosniff` header on every response. |
| Data retention | Kept how long? | One checkpoint until the next new run or victory; control settings until the browser clears them. |
| Usability | How easy? | Controls on the title screen and in *How to play*; each mode owns its input. |
| Stability | Stays stable? | New content is a data-table entry; no dependencies can break. |
| Compliance | Which rules apply? | No personal data collected; accessibility choices guided by WCAG 2.2 [@wcag22]. |
| Reliability | Failure rate? | Storage and audio failures are caught; play simply continues. |
| Recoverability | Recovers how? | Game over keeps the checkpoint; RETRY CHECKPOINT restarts that room. |
| Serviceability | How easily fixed? | Edit one file, commit, redeploy; no build step. |
| Data integrity | Data correct? | Versioned saves; values clamped on load; corrupt JSON rejected. |
| Scalability | Can it grow? | Client-side and single-player: more players add no server load. |
| Capacity | How much to store? | Two small JSON records, far below the storage quota [@mdnstorage]. |
| Accessibility | Who is excluded? | Reduced motion, plain text, global mute, resizable controls; no remapping. |

## NFRs in Agile: Stories, Constraints and Done

::: theory title="Capturing NFRs in an agile backlog"
- A **user story** states a need from a user's view: *As a* role, *I want* goal, *so that* benefit [@cohn]. An NFR can be its own story or an **acceptance criterion** on a functional story.
- Each criterion is a **story test**: quantified and checkable. One that cannot be quantified is usually too vague to build. Stories say *what*, never *how*.
- An NFR that applies to many future stories becomes a **constraint**, and constraints join the **Definition of Done**, the shared standard an increment must meet before it counts as done [@scrumguide; @agilemanifesto].
:::

Table: Where an NFR is recorded {#tbl:nfr-placement}

| Placement | Use when | Example in this project |
|---|---|---|
| Own user story | The quality is user-visible and needs its own work | Phone-ready (NFR-US-08) |
| Acceptance criterion | It qualifies one feature only | "CONTINUE is shown only when a save exists" |
| Constraint | It applies to many future stories | C-03: every storage access is guarded |
| Definition of Done | Every increment must meet it | Played on desktop and phone, no console errors |

## Part B: NFR Document for Sahur Protocol

The ten stories below are the NFR document for Sahur Protocol. Every criterion describes behaviour the build already shows, so the criteria double as regression tests; a *Backlog* note records any gap instead of weakening a criterion.

::: stats
- 10 | NFR user stories
- 34 | Acceptance criteria
- 7 | System-wide constraints
- 7 | Backlog notes
:::

::::: columns
:::: col
::: story id="NFR⁠-⁠US⁠-⁠01" title="Instant play" tag="PORTABILITY"
**As a** player, **I want** to start from a link with nothing to install, **so that** trying the game costs me nothing.

#### Acceptance criteria
1. The site root opens the game (Vercel rewrites `/` to the game file; `index.html` also redirects) [@vercel].
2. The game is one HTML file with inline code and 13 embedded images; at runtime it fetches only fonts and the choir audio.
3. No plug-in, account or build step is needed, and the file also runs when opened from disk.
:::
::::
:::: col
::: story id="NFR⁠-⁠US⁠-⁠02" title="Steady frames" tag="PERFORMANCE"
**As a** player on a slow device, **I want** the action to stay fair when the frame rate dips, **so that** a hitch never throws an enemy across the arena at me.

#### Acceptance criteria
1. The game draws on every display refresh through `requestAnimationFrame` [@mdnraf].
2. Each simulation step uses at most 33 ms, so a long frame moves nothing further than one 30 FPS step; below 30 FPS the game slows rather than skips.
3. A hidden tab gets no frames, and on return the first step is still capped, so play resumes without a jump.
4. Menus, cutscenes, upgrade pickers and pause advance no enemy, bullet or timer.

*Backlog:* a fixed timestep would also make the simulation deterministic [@fiedler].
:::
::::
:::::

:::: gallery cols="3"
::: figure src="shots/16a-mobile-title.png" id="nfr-mobile-title" frame="crt"
Title on a phone: one file, no install, controls listed (US-01).
:::
::: figure src="shots/16c-mobile-upgrade.png" id="nfr-mobile-upgrade" frame="crt"
FIRST UPGRADE in phone landscape, at reduced text size (US-05).
:::
::: figure src="shots/04c-pause-controls.png" id="nfr-pause-controls" frame="crt"
Pause → CONTROLS: movement mode and four sliders (US-08).
:::
::::


::::: columns
:::: col
::: story id="NFR⁠-⁠US⁠-⁠03" title="Checkpoints" tag="RECOVERY"
**As a** player, **I want** my run saved automatically, **so that** closing the tab or losing costs me at most one room.

#### Acceptance criteria
1. A checkpoint is saved at each room start, upgrade pick, Signal Roll claim, challenge, final-boss start, pause and menu exit.
2. CONTINUE appears on the title screen exactly when a checkpoint exists.
3. After a game over the checkpoint survives, and RETRY CHECKPOINT restarts that room.
4. Victory deletes the checkpoint, so a finished story starts fresh.

*Backlog:* WAKE UP overwrites it without asking (N-1, Chapter 3).
:::
::::
:::: col
::: story id="NFR⁠-⁠US⁠-⁠04" title="Storage-proof" tag="RELIABILITY"
**As a** player in a private window, **I want** storage problems handled quietly, **so that** they never crash my game.

#### Acceptance criteria
1. With `localStorage` blocked, the game plays without errors; saves are skipped, CONTINUE stays hidden [@mdnstorage].
2. A save that is not version 1 or not valid JSON is rejected by the loader instead of raising an error.
3. On load, biome and room are clamped, HP is kept between 1 and the maximum, and stats are rebuilt from skill levels.
4. If audio is blocked, play continues; title music starts on the first key press or tap.
:::
::::
:::::

::::: columns
:::: col
::: story id="NFR⁠-⁠US⁠-⁠05" title="Text I can read" tag="USABILITY"
**As a** player who needs clear text, **I want** menus and dialogue in a plain, large font, **so that** the story and upgrade choices are easy to follow.

#### Acceptance criteria
1. Menus, cards and dialogue use Verdana, light on near-black panels; the pixel font is kept for large titles.
2. On desktop, menu text is 16 px, buttons 17 px, card descriptions 14 px, dialogue 17–21 px.
3. Dialogue waits for the player, and one press completes the line being typed.

*Backlog:* phone landscape shrinks card and dialogue text to 12–14 px (@fig:nfr-mobile-upgrade); there is no text-size option.
:::
::::
:::: col
::: story id="NFR⁠-⁠US⁠-⁠06" title="Calm mode" tag="ACCESSIBILITY"
**As a** player sensitive to motion, **I want** the game to follow my system's reduced-motion setting, **so that** menus and story scenes stop drifting and pulsing.

#### Acceptance criteria
1. Under `prefers-reduced-motion: reduce`, all CSS animations and transitions are off [@wcag22].
2. Cutscene panels stop panning and zooming, and their particles are not drawn.
3. No in-game action is needed: the setting is read from the operating system.

*Backlog:* combat screen shake and white flashes are not yet reduced.
:::
::::
:::::

::::: columns
:::: col
::: story id="NFR⁠-⁠US⁠-⁠07" title="One mute" tag="USABILITY"
**As a** player in a quiet room, **I want** one control that silences everything, **so that** I never hunt for a stray sound layer.

#### Acceptance criteria
1. [[M]] in any mode, or the Options button, toggles mute for all four sources: music, effects and dialogue blips, cutscene ambience, choir [@mdnaudio].
2. One volume slider (0–100, default 70) scales the same four sources.
3. Starting a cutscene stops level music first, so tracks never overlap.

*Backlog:* mute and volume are not remembered between visits.
:::
::::
:::: col
::: story id="NFR⁠-⁠US⁠-⁠08" title="Phone-ready" tag="MOBILE"
**As a** phone player, **I want** controls and a layout that fit my hands and screen, **so that** nothing is cramped.

#### Acceptance criteria
1. Touch controls (joystick or touch-to-move, plus SWING) appear only on touch devices [@mdntouch].
2. Sliders set joystick size 96–190 px (default 128), position 3–24 vw/vh (8) and SWING size 72–150 px (92).
3. Settings persist under `sahurProtocolControlsV1` and can be edited mid-run (@fig:nfr-pause-controls).
4. In portrait a ROTATE DEVICE message appears and a landscape lock is requested; a refusal is harmless [@mdnorientation].

*Backlog:* play is not paused beneath the rotate message.
:::
::::
:::::

::::: columns
:::: col
::: story id="NFR⁠-⁠US⁠-⁠09" title="Nothing to steal" tag="SECURITY"
**As** the team, **I want** static files and no personal data, **so that** there is no server to attack and nothing to leak.

#### Acceptance criteria
1. The deployment has no server code, database, login or analytics.
2. Every response carries `X-Content-Type-Options: nosniff`, so browsers do not guess file types.
3. Only the checkpoint and control settings are stored, in the player's own browser.
:::
::::
:::: col
::: story id="NFR⁠-⁠US⁠-⁠10" title="Data tables" tag="MAINTAINABILITY"
**As a** developer, **I want** content in data tables, **so that** a new skill or enemy needs no engine rewrite.

#### Acceptance criteria
1. Skills, enemies, biomes, bosses and cutscenes are tables in a DATA section marked "edit freely", apart from ENGINE, UPDATE and RENDER code; music is a `TRACKS` table.
2. A new skill is one `SKILLS` entry with a description and an apply function.
3. There are no third-party packages to update.

*Backlog:* remove the unused legacy `POWERUPS` table.
:::
::::
:::::

## Constraints and Definition of Done

Seven NFRs apply to every future story rather than to one, so they are promoted to constraints (@tbl:nfr-constraints): story tests that any change must pass, each traced to its source story.

Table: System-wide constraints {#tbl:nfr-constraints}

| ID | Constraint (story test applied to every story) | Story |
|---|---|---|
| C-⁠01 | Every feature works by keyboard alone on desktop and by touch alone on phones. | 08 |
| C-⁠02 | Every new mode owns its input, and gameplay advances only in `play`. | 02 |
| C-⁠03 | Every storage access uses the guarded helpers; a failure never stops play. | 04 |
| C-⁠04 | Every new sound passes through the master volume and the global mute. | 07 |
| C-⁠05 | No new runtime dependency, build step or server code. | 01, 09 |
| C-⁠06 | New menu and dialogue text uses the body font at 14 px or more on desktop. | 05 |
| C-⁠07 | New motion in menus or cutscenes switches off under reduced motion. | 06 |

::: aside title="DEFINITION OF DONE"
A story is done when (1) its acceptance criteria pass and C-01 to C-07 hold; (2) it has been played by keyboard on desktop and by touch on a phone (or DevTools emulation) with no console errors; (3) CONTINUE and RETRY CHECKPOINT still restore the room; (4) it is committed to GitHub and the Vercel deployment loads from the root URL; and (5) Chapter 3's requirement tables reflect any change in behaviour.
:::

## Design Decisions that Deliver the Qualities

@tbl:nfr-decisions links each quality to its build decision and the trade-off accepted; every softgoal has a cost [@chung].

Table: Design decisions and the trade-offs they accept {#tbl:nfr-decisions}

| Quality | Decision in the build | Trade-off accepted |
|---|---|---|
| Portability | One self-contained HTML file, art embedded | A 1.08 MB file that is harder to review |
| Performance | Fixed 960×540 logical canvas, scaled by CSS | Soft on high-density screens |
| Robustness | Variable time step capped at 33 ms [@fiedler; @nystrom] | Not deterministic; slows below 30 FPS |
| Efficiency | Music and effects synthesised in code | Only one recorded track, the choir |
| Usability | DOM overlays for menus, cards and dialogue | Two rendering layers to keep in step |
| Reliability | Guarded storage; versioned, clamped saves | Mid-room progress is not saved |
| Maintainability | Data tables plus one stat-rebuild function | No classes; structure rests on convention |
| Security | Static hosting with a `nosniff` header | No server features such as leaderboards |

## Observations and Learning

Writing quality requirements as stories showed how much of a game's quality stays invisible until it fails: nobody asks for "storage wrapped in exception handlers", yet every player in a private window depends on it. Numbers (33 ms, 0–100, 96–190 px) turned wishes into tests, and honest backlog notes, rather than softened criteria, produced seven concrete improvements. Tracing qualities to decisions showed that the simplest choices (one file, no build, synthesised audio) carry most of the game's strengths, and most of its trade-offs.

::: plain label="TL;DR"
Ten promises about how the game should feel, each with tests the current build already passes, plus an honest list of the seven places where it does not yet.
:::

::: cleared
- Functional and non-functional requirements compared; six quality attributes defined for the game.
- Fourteen-point elicitation checklist answered for Sahur Protocol.
- NFR document written: 10 user stories with 34 testable acceptance criteria, all true of the build.
- Seven system-wide constraints and a Definition of Done defined.
- Each quality traced to the design decision that delivers it, with its trade-off.
:::
