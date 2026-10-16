---
num: 3
title: Requirements Analysis & Specification
exp: Experiment 1 · Part II
kicker: What the game shall do, how well it shall do it, and where the wording still leaves gaps.
shot: shots/03-howto.png
objectives:
  - Identify the end users and stakeholders of the game
  - State 21 functional and 14 non-functional requirements
  - Separate user requirements from system requirements
  - Judge feasibility and find ambiguities, inconsistencies and gaps
  - Outline an SRS and a phased development plan
---

This chapter completes Experiment 1 by turning the project chosen in Chapter 2 into requirements, from end users to a development plan. Every requirement was checked against the delivered build, so each traces to behaviour a player can observe.

::: theory title="What makes a good requirement?"
A requirement specifies *what* the system should do, not how [@sommerville]; requirements engineering discovers what stakeholders expect and records it for design, implementation and testing [@pressman]. A good requirement set is:

- **Unambiguous**: each statement has one reading ("enough users" may mean 10 to one reader and 100 to another).
- **Consistent**: no two statements contradict each other.
- **Complete**: it says what the system should do *and* what it should not do.

By audience, requirements are **user** (natural language, for customers) or **system** requirements (technical, for developers and testers); by content, **functional** (reactions to inputs) or **non-functional** (qualities and constraints) [@sommerville; @ieee830].
:::

::: plain
Requirements are the rulebook you write before the game exists. "Make it fun" is not a requirement. "The swing recharges in 0.38 seconds" is. The difference: a tester can check the second one with a stopwatch.
:::

## End Users and Stakeholders

An end user interacts with the running system; a stakeholder has an interest in its outcome [@sommerville]. Four groups were identified: two play the game on different devices, and two judge or maintain it.

:::: cards cols="2"
::: card title="Desktop browser players" tag="PRIMARY USER · KEYBOARD" color="magenta"
- Play from a link on a laptop or desktop.
- Move with [[W]] [[A]] [[S]] [[D]] or arrows; swing with [[Space]] or [[J]].
- **Shapes:** gameplay FRs, usability, performance.
:::
::: card title="Mobile players" tag="PRIMARY USER · TOUCH" color="cyan"
- Play on a phone or tablet held in landscape.
- Use a joystick or touch-to-move, plus a SWING button.
- **Shapes:** touch and orientation FRs, portability.
:::
::: card title="Students and evaluators" tag="STAKEHOLDER · ACADEMIC" color="yellow"
- Faculty and peers assessing the mini-project.
- Play the build, read the report, inspect the repository.
- **Shapes:** the SRS, traceability, testability.
:::
::: card title="Development team" tag="STAKEHOLDER · BUILDERS" color="lime"
- Three Semester V students of Class E.
- Add content, fix defects and redeploy, at no cost.
- **Shapes:** maintainability, deployment, feasibility.
:::
::::

## Problem Statement

The problem statement fixes *what* is being built. Its account of the run (rooms, upgrades, bosses) and the automatic saving become the functional requirements; its constraints (no install, two input methods, static hosting) become the non-functional ones.

::: aside title="FINAL PROBLEM STATEMENT"
Design and develop **Sahur Protocol**, a browser-based, top-down 2D action roguelite in which the player, with the companion Sahur, clears enemy rooms across three biomes, chooses skill upgrades between rooms, defeats a boss at the end of each biome and confronts The AI Bubble in a scripted finale. The game shall run from a single HTML file using HTML5 Canvas, the Web Audio API and plain JavaScript, with no installation, engine or build step; support keyboard play on desktops and touch play on mobile devices in landscape; save progress automatically at checkpoints in browser storage; and be deployable as a static website.
:::

## Functional Requirements

Functional requirements were found by treating the game as a black box: for each input (a key, a tap, a menu choice) the observable output was recorded and refined [@pressman]. Priorities are the team's own assessment: **High** means a run cannot be completed without it, **Medium** that a complete experience needs it, **Low** that it is optional.

Table: Functional requirements, part A: session, menus, persistence and devices {#tbl:req-fr-session}

| ID | The system shall … | Priority |
|---|---|---|
| FR-⁠01 | **New run:** start a run on **WAKE UP**, discarding any save and playing the prologue. | High |
| FR-⁠02 | **Continue:** show **CONTINUE** only if a save exists; resume at the saved room's start. | High |
| FR-⁠03 | **Information:** offer *How to play* and *Story* panes on the title screen. | Medium |
| FR-⁠04 | **Sound:** mute all sound (Options or [[M]]) and set volume 0–100, default 70. | Medium |
| FR-⁠05 | **Cutscenes:** play 7 cutscenes typed at 45 chars/s; [[Space]] or a click completes, then advances. | High |
| FR-⁠06 | **Pause:** pause on [[Esc]] or **II** and offer CONTROLS, RESUME, MAIN MENU, RESTART RUN. | High |
| FR-⁠07 | **Checkpoints:** save at room start, pick, challenge, biome change, pause; delete on victory. | High |
| FR-⁠08 | **End screens:** show **ABSORBED** (with RETRY CHECKPOINT) on death, **WE WON.** on victory. | High |
| FR-⁠09 | **Touch controls:** offer joystick or touch-to-move plus SWING, adjustable in size and place. | High |
| FR-⁠10 | **Orientation:** in portrait on touch devices, show ROTATE DEVICE and request landscape. | Medium |

Table: Functional requirements, part B: the run, combat and progression {#tbl:req-fr-run}

| ID | The system shall … | Priority |
|---|---|---|
| FR-⁠11 | **Movement:** move in 8 directions ([[W]][[A]][[S]][[D]] or arrows) at 225 px/s in a 960×540 arena. | High |
| FR-⁠12 | **Swing:** swing all around (radius 80 px, 13 damage) per [[Space]] or [[J]] press; 0.38 s cooldown. | High |
| FR-⁠13 | **Sahur's TUNG:** make Sahur follow and slam on his own timer (26 damage, radius 135 px). | High |
| FR-⁠14 | **Run structure:** build a run of 3 biomes × (3 combat rooms + boss), then The AI Bubble. | High |
| FR-⁠15 | **Enemies:** spawn 6 types (chase, shoot, dash, grab, orbit, split) after a 0.7 s edge warning. | High |
| FR-⁠16 | **Bosses:** cycle bosses through fixed attacks with HP bar and BOSS TIMER; end in a scripted finale. | High |
| FR-⁠17 | **Damage:** grant 0.7 s invulnerability per hit; end the run at 0 HP unless a revive is held. | High |
| FR-⁠18 | **Upgrades:** offer up to 3 weighted-random skill cards per combat room, plus FIRST and FINAL picks. | High |
| FR-⁠19 | **Signal Roll:** after each biome boss, roll a still-locked skill, if any, into the upgrade pool. | Medium |
| FR-⁠20 | **HUD:** show HP, owned upgrades, biome and room on the arena throughout play. | High |
| FR-⁠21 | **Challenges:** track 11 challenges, with toasts and a panel on [[C]] or a top-right tap. | Low |

:::: gallery cols="2"
::: figure src="shots/04-settings.png" id="req-options" frame="crt"
The Options pane: sound toggle and volume (FR-04) above the mobile-control switcher and sliders (FR-09).
:::
::: figure src="shots/16-mobile-touch.png" id="req-mobile" frame="crt"
Biome 1 on a phone: joystick and SWING (FR-09), Sahur's TUNG ring (FR-13) and the HUD (FR-20).
:::
::::

::: plain
Every row passes the "can a tester see it?" test. "Sahur helps you fight" is a vibe; "Sahur slams for 26 damage in a 135 px circle on his own timer" is a requirement. Grab a stopwatch and check.
:::

## Non-Functional Requirements

Non-functional requirements (NFRs) constrain *how well* the functions are delivered. @tbl:req-nfr groups them by ISO/IEC 25010 quality characteristics [@iso25010], each checkable by inspection, measurement or play; Chapter 4 turns the key ones into user stories.

Table: Non-functional requirements and how each is verified {#tbl:req-nfr}

| ID | Quality and requirement | Check |
|---|---|---|
| NFR-⁠01 | **Performance.** A `requestAnimationFrame` loop [@mdnraf]; each step capped at 33 ms. | Code review |
| NFR-⁠02 | **Performance.** Gameplay advances only in play; menus, cutscenes and pause freeze it. | Pause test |
| NFR-⁠03 | **Efficiency.** One 1.08 MB HTML file, fonts and one audio file; other sound synthesised [@mdnaudio]. | Network log |
| NFR-⁠04 | **Usability.** List all controls on the title screen and in *How to play*. | Review |
| NFR-⁠05 | **Usability.** Keep cutscenes self-paced; one press completes a line. | Play test |
| NFR-⁠06 | **Accessibility.** Sans-serif body text of 14 px or more on desktop, light on near-black. | CSS check |
| NFR-⁠07 | **Accessibility.** OS reduced motion stops CSS animation and cutscene pan and zoom [@wcag22]. | OS setting |
| NFR-⁠08 | **Reliability.** Guard all storage access; if it is blocked, the game runs unsaved [@mdnstorage]. | Private tab |
| NFR-⁠09 | **Reliability.** Version and validate saves; ignore a corrupt record instead of crashing. | Edited save |
| NFR-⁠10 | **Recoverability.** A loss costs at most the current room; game over keeps the checkpoint. | Die, retry |
| NFR-⁠11 | **Maintainability.** Skills, enemies, biomes, bosses, cutscenes and tracks in data tables. | Code review |
| NFR-⁠12 | **Portability.** Current desktop and mobile browsers, no install, arena scaled to fit at 16:9. | Browsers |
| NFR-⁠13 | **Portability.** Play in landscape on touch devices, with controls clear of notches. | Phone test |
| NFR-⁠14 | **Security.** Static files only, no accounts or personal data; send a `nosniff` header [@vercel]. | Headers |

::::: columns
:::: col
NFR-13 shows how a quality requirement can shape a feature. A 960×540 arena with HUD text in both lower corners and two thumb controls does not fit a phone held upright. Rather than design a second, portrait layout, the build asks the player to rotate (@fig:req-rotate) and, where the browser allows, requests fullscreen and a landscape lock itself [@mdnorientation].

::: plain
Phones in portrait get politely told to turn sideways. It is the one screen in the game that is not a fight, a menu or a cutscene, and it is still a requirement.
:::
::::
:::: col
::: figure src="shots/17-orientation-lock.png" id="req-rotate" size="small" frame="crt"
Portrait on a touch device: the ROTATE DEVICE overlay (FR-10, NFR-13).
:::
::::
:::::

## User and System Requirements

User requirements state in plain language what the player must be able to do, so that a non-technical reader can confirm them [@sommerville]. @tbl:req-user traces each one to the functional requirements that deliver it.

Table: User requirements traced to functional requirements {#tbl:req-user}

| ID | The player should be able to … | Delivered by |
|---|---|---|
| UR-⁠01 | start a new run, or continue a saved one, from the title screen | FR-01, FR-02 |
| UR-⁠02 | learn the controls and the premise before playing | FR-03 |
| UR-⁠03 | move, swing and dodge with a keyboard or a touchscreen | FR-09, FR-11, FR-12 |
| UR-⁠04 | fight alongside Sahur, who attacks on his own | FR-13 |
| UR-⁠05 | clear rooms, beat bosses and grow stronger through upgrades | FR-14 to FR-19 |
| UR-⁠06 | follow the story through cutscenes at their own pace | FR-05 |
| UR-⁠07 | see health, upgrades, location and challenges at a glance | FR-20, FR-21 |
| UR-⁠08 | pause, adjust sound or controls, and return to the menu | FR-04, FR-06 |
| UR-⁠09 | resume after closing the browser or losing a fight | FR-02, FR-07, FR-08 |
| UR-⁠10 | reach the end of the story and see an ending | FR-08, FR-16 |

System requirements describe the environment for running and building the game (@tbl:req-system). No hardware was benchmarked, so the player's side is stated as a capability; "e.g." marks typical, not mandatory, choices.

Table: System requirements for players and for the development team {#tbl:req-system}

| Item | Player (runtime) | Team (development) |
|---|---|---|
| Hardware | Any computer, phone or tablet running a current browser | Any computer that runs an editor and a browser |
| Software | A current browser (e.g. Chrome, Edge, Firefox, Safari) | Editor (e.g. VS Code), DevTools, Git, GitHub, Vercel |
| Input | Keyboard, or a touchscreen in landscape | Keyboard, mouse; phone or DevTools emulation for touch |
| Network | Once, to load the page, fonts and choir audio | GitHub and Vercel for deployment |
| Install | None; saving needs a few kilobytes of storage | None: no build step, no package dependencies |

## Feasibility Study

A feasibility study judges, early in the life cycle and before design commits resources, whether a project can succeed within its technical, economic, operational and schedule constraints [@pressman; @sommerville]. @tbl:req-feasibility records the judgements for Sahur Protocol.

Table: Feasibility assessment {#tbl:req-feasibility}

| Dimension | Assessment | Verdict |
|---|---|---|
| Technical | Canvas 2D, Web Audio and `localStorage` are standard APIs [@mdncanvas; @mdnaudio; @mdnstorage]; the engine is small enough to hand-write [@nystrom]. | Feasible |
| Economic | All tools and Vercel static hosting are free; art is drawn in code, music synthesised. | Feasible |
| Operational | Opens from a link, no account, keyboard or touch, saves itself. | Feasible |
| Schedule | Scope capped at 3 biomes, 4 bosses, 11 skills; each phase ends playable. | Feasible, scope fixed |

::: stats
- ₹0 | Licence and tooling cost
- 0 | Runtime dependencies
- 1 | HTML file to ship
- 0 | Install steps for players
:::

## Ambiguities, Inconsistencies and Incompleteness

The requirements, on-screen text and design brief were reviewed against each other and against the build, using the three properties defined at the start of the chapter; @tbl:req-ambig, @tbl:req-incons and @tbl:req-incomp list the findings and resolutions [@sommerville].

::: plain
Best catch of the review: the title screen begs you to "Protect him", and Sahur is the one character in the game who literally cannot take damage. Reviews exist to spot where the story and the code stop agreeing.
:::

Table: Ambiguities: statements open to more than one reading {#tbl:req-ambig}

| ID | Observation | Resolution |
|---|---|---|
| A-⁠1 | "His TUNG is on a rhythm", *Faster Rhythm* and *Borrowed Beat* suggest beat-timed input, but TUNG fires on a timer and swings land whenever off cooldown. | State it in numbers (TUNG about every 3.5, 4.3, 5.1 s by biome); call the bar a cooldown meter. |
| A-⁠2 | "Level" is used loosely; the game speaks of biomes and rooms ("ROOM n/3"). | Define run, biome, room and encounter in a glossary (Section 3.8). |
| A-⁠3 | "Difficulty should climb towards the final fight" has no measure. | Enemy HP ×1.0, ×1.35, ×1.7 per biome; 5 to 11 enemies per room. |
| A-⁠4 | "Controls should be easy to understand" cannot be tested. | Replace with checkable NFR-04 and NFR-05. |

Table: Inconsistencies: statements that contradict each other or the build {#tbl:req-incons}

| ID | Observation | Resolution |
|---|---|---|
| I-⁠1 | The title screen says "Protect him", yet Sahur has no HP and cannot be targeted. | Give Sahur health and a fail state, or reword the line. |
| I-⁠2 | *Faster Rhythm* says "It costs him.", but the code applies no cost. | Implement a visible cost or drop the sentence. |
| I-⁠3 | Signal Roll cards print an "unlock" challenge, but nothing checks it; locked skills are handed out regardless. | Enforce the condition, or label it a suggested challenge. |
| I-⁠4 | The design brief says "relics"; every screen says "upgrade" or "skill". | Use "skill upgrade" in all documents. |

Table: Incompleteness: behaviour the requirements leave unstated {#tbl:req-incomp}

| ID | Observation | Resolution |
|---|---|---|
| N-⁠1 | Nothing says what happens to an existing save on a new run; WAKE UP and RESTART RUN delete it without asking. | Add: "If a save exists, ask before discarding it." |
| N-⁠2 | Settings persistence is unspecified: touch layouts are remembered, mute and volume reset on reload. | Persist all Options, or name those that do not persist. |
| N-⁠3 | Portrait handling ignores a fight in progress; the rotate overlay does not pause play. | Add: "Showing the rotate overlay shall pause the game." |
| N-⁠4 | Reduced motion has no stated scope; menus and cutscenes calm down, combat shake and flashes do not. | Extend NFR-07 to the canvas, or record the exception. |

## SRS Excerpt

A Software Requirements Specification (SRS) records a system's requirements, interfaces and constraints; it is the agreement between stakeholders and developers and the baseline for testing [@ieee830; @iso29148]. The glossary resolves ambiguity A-2, and @tbl:req-srs fills in the IEEE 830 outline.

::: aside title="GLOSSARY (SRS 1.2)"
- **Run**: one attempt, from WAKE UP to the end screen. **Biome**: one of three areas of four rooms.
- **Room**: one arena; rooms 1–3 are combat, room 4 the boss. **Encounter**: any room or the final arena.
- **Skill upgrade**: one of 11 levelled bonuses (`relics` in code). **Signal Roll**: the post-boss skill unlock.
- **TUNG**: Sahur's automatic slam, on a cooldown. **Checkpoint**: the automatic save in browser storage.
:::

Table: SRS outline for Sahur Protocol (after IEEE 830) {#tbl:req-srs}

| Section | Content for Sahur Protocol |
|---|---|
| 1.1 Purpose, scope | Prototype v0.2: single-player browser roguelite; 3 biomes, 4 bosses, 11 skills; no accounts. |
| 1.2 Definitions | Glossary above; references: IEEE 830, ISO/IEC 25010, MDN Web APIs, the repository [@repo]. |
| 2.1 Perspective | One self-contained HTML file: DOM menus over a Canvas 2D arena, hosted as static files. |
| 2.2 Functions | Session control, run loop, story, configuration and persistence (FR-01 to FR-21). |
| 2.3 Constraints | Browser sandbox; no build or dependencies; landscape on touch; network on first load. |
| 3.1 Interfaces | Keyboard, pointer and touch input; 960×540 canvas; audio output; two `localStorage` keys. |
| 3.2 Requirements | Functional: @tbl:req-fr-session, @tbl:req-fr-run. Quality attributes: @tbl:req-nfr. |

## Development Plan

The plan is iterative and incremental [@pressman; @boehm]: each phase ends in a playable build or a reviewable document, and later findings feed back into earlier artefacts (@tbl:req-plan; no calendar dates are attached).

Table: Phased development plan {#tbl:req-plan}

| # | Phase | Key activities | Deliverable |
|---|---|---|---|
| 1 | Requirements | Survey, FRs, NFRs, feasibility, NFR stories (Exp 1–2) | Requirement set |
| 2 | Core engine | Canvas, capped-step loop, input, mode state machine | Empty arena |
| 3 | Combat | Swing, TUNG, six enemy behaviours, bullets, damage | One playable room |
| 4 | Progression | Biomes, bosses, skills, pickers, Signal Roll, challenges | Full run |
| 5 | Story and audio | Cutscene player, art panels, synth tracks, choir | Story and sound |
| 6 | Persistence and menus | Checkpoints, CONTINUE, pause, Options, end screens | Resumable game |
| 7 | Mobile | Touch controls, control switcher, landscape lock | Phone play |
| 8 | Deployment | Vercel static hosting, headers, root redirect | Public URL |
| 9 | Modelling | Exp 3–6 models, each checked against the build | Review notes |
| 10 | Testing and report | Black-box tests, defect list, documentation | This report |

## Questions of Curiosity

The lab sheet closes Experiment 1 with four questions, answered in @tbl:req-questions.

Table: Questions of curiosity from Experiment 1 {#tbl:req-questions}

| Question | Answer |
|---|---|
| Why understand user requirements first? | Design, code and tests are built on them, so an early misunderstanding spreads and costs more the longer it survives [@pressman; @sommerville]. Reading "rhythm" as beat-timed attacks would have reshaped combat and every combat test. |
| What is an SRS? | A formal document of a system's requirements, interfaces, constraints and assumptions; the baseline for review and testing [@ieee830; @iso29148]. See Section 3.8. |
| What is a feasibility study, and when? | A check that a project can succeed technically, economically, operationally, legally and on schedule, made in initial planning before design commits resources [@pressman]. See Section 3.6. |
| How do FRs and NFRs differ? | An FR states *what* the system does and is checked by a test case (FR-12); an NFR states *how well* and is checked by measurement or inspection (NFR-01). Chapter 4 compares them in detail. |

## Observations and Learning

Writing each requirement against the real build forced precision: "the companion helps you" only became a requirement once it carried numbers. The review in Section 3.7 taught the most. Its findings were rarely missing code; they were words promising what the code does not do, such as a companion who needs protecting or a rhythm with no beat. Such gaps are cheap to fix on paper and costly to find in a playtest.

::: cleared
- Four user and stakeholder groups identified; final problem statement framed.
- 21 functional and 14 non-functional requirements stated, prioritised and made verifiable.
- User and system requirements separated; feasibility confirmed on all four dimensions.
- 12 ambiguities, inconsistencies and gaps found, each with a resolution.
- SRS outline, glossary and a ten-phase development plan prepared.
:::
