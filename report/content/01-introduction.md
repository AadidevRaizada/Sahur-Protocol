---
num: 1
title: Introduction
exp: Overview
kicker: Wake up. The feed has eaten the world, and a wooden log with a bat is at the window.
shot: shots/02b-prologue-opening.png
objectives:
  - Set the background, from roguelites and browser games to the Sahur meme
  - Describe the game and its core loop on a single page
  - State the problem, the objectives and the scope of the project
  - Explain the development method and how this report is organised
---

This report documents the Software Engineering mini-project of a three-member team from Class E, Semester V. The product is **Sahur Protocol**, a top-down 2D action roguelite that runs entirely in a web browser [@repo]. The project had two aims: to build a complete, playable game, and to carry it through the software engineering process, from requirements to UML models, checking each model against the working build.

## Background

**Roguelikes and roguelites.** The word *roguelike* comes from *Rogue* [@rogue], a 1980 dungeon crawler in which every new game generated a fresh dungeon and death was final. Its descendants were later characterised by the **Berlin Interpretation** [@berlin], a list of factors such as random environment generation, permadeath, turn-based grid play and resource management. Many modern games keep the self-contained *run* and its randomised rewards but replace the turn-based grid with real-time action; these are informally called **roguelites**. In both, the unit of play is the run: one attempt that starts from a known state, grows stronger through choices, and ends in victory or defeat.

**Games in the browser.** The HTML `<canvas>` element and its Canvas 2D API give JavaScript an immediate-mode drawing surface [@mdncanvas], and the Web Audio API synthesises music and sound in real time [@mdnaudio]. A game built only on these standards needs no installer, plug-in or app store: the player opens a link, on a laptop or a phone, and the game starts. Sahur Protocol uses the two APIs directly, without a game engine.

**The meme and the meal.** *Sahur* (or *suhur*) is the meal eaten before dawn on fasting days during Ramadan. In Indonesia, neighbourhood groups traditionally walk the streets in the small hours, beating drums and calling "sahur!" to wake people in time to eat. In 2025 this wake-up call became the meme **"Tung Tung Tung Sahur"**: a wooden, log-shaped figure carrying a bat, named after the sound of the drum [@sahurmeme]. The game takes the meme at its word. Sahur is still the one who wakes you up; this time you have been asleep inside an endless feed.

::: plain
A **roguelike** says "you died, start again from nothing". A **roguelite** says "you died, but here is your checkpoint, maybe have a snack". Sahur Protocol is the second kind, and the snack is the pre-dawn meal the hero is named after.
:::

## The Game in One Page

The world has been swallowed by the feed, and **The AI Bubble** is consuming everything that is still real. Sahur, a living wooden log with a bat, appears at the shattered window of the player's grey apartment and leads them through three biomes to pop the Bubble. The tone is a satire of technology hype: the enemies are *sloplings*, *buzzword drones*, *prompt wraiths*, *scraper hands*, *yes-men* and *pivot golems*, and the bosses are **Echo, the Engagement Wraith**, **The Scraper** and **The Valuation**. The ending is played straight: at the core, Sahur spends the last of himself on three final TUNGs, and the epilogue wakes the player to a real dawn.

:::: gallery cols="3"
::: figure src="shots/06-biome1-combat.png" id="int-biome1" frame="crt"
**Hype Cycle Forest**, biome 1. Boss: Echo.
:::
::: figure src="shots/07-biome2-combat.png" id="int-biome2" frame="crt"
**Server Farm Wastes**, biome 2. Boss: The Scraper.
:::
::: figure src="shots/08-biome3-combat.png" id="int-biome3" frame="crt"
**Boardroom of Broken Promises**, biome 3. Boss: The Valuation.
:::
::::

Play takes place in a single-screen arena seen from above (@fig:int-biome1 to @fig:int-biome3). The player moves freely in eight directions with [[W]] [[A]] [[S]] [[D]] or the arrow keys and swings a bat with [[Space]] or [[J]]; the swing hits everything in a circle around the player and recovers in 0.38 s. Sahur follows close behind and fights on his own: every few seconds he slams the ground with a **TUNG** that damages and knocks back every enemy in his radius (the gold rings above). There is no jump, no score and no timing input. Despite the drum-beat theme, nothing in combat is synchronised to the music; the TUNG runs on its own cooldown timer.

A run follows a fixed route. **WAKE UP** plays the prologue and offers a *first upgrade*. Each biome then has **three combat rooms**, in which enemies enter one at a time from the edges of the arena; clearing a room offers a choice of up to three upgrade cards. A **biome boss** follows, and defeating it plays a cutscene and a one-card **Signal Roll**, which unlocks a new skill while any remain locked. After the third biome come the core, a *final upgrade* and **The AI Bubble**, whose last phase is a scripted story finale rather than a fight won by damage.

::: stats
- 3 | Biomes
- 13 | Encounters per run
- 4 | Bosses
- 11 | Skills
- 7 | Cutscenes
:::

::::: columns
:::: col
::: figure src="shots/20-cutscene-fire.png" id="int-fire" frame="crt"
Illustrated cutscenes with typewriter dialogue tell the story between biomes: a campfire after the Hype Cycle Forest.
:::
::::
:::: col
::: plain
You are the cream-coloured circle. The log with the bat is Sahur, your best friend and the strongest thing on screen. You swing when you like; he goes TUNG when he is ready. Everything else is a tech buzzword with legs, or a bullet fired by one.
:::
::::
:::::

## Problem Statement and Motivation

::: aside title="PROBLEM STATEMENT"
To design, model and build a browser-based 2D action roguelite, *Sahur Protocol*, that runs from a single HTML file without installation on desktop and touch devices, and to carry it through a structured software engineering process (requirements analysis, agile non-functional requirements, and use case, activity, class and sequence modelling), verifying every model against the working build.
:::

Four motivations shaped this problem:

- **Behaviour-heavy.** Explicit states, timed events and many interacting entities exercise UML's behavioural diagrams far more than a record-keeping system does.
- **Qualities that players feel.** Responsiveness and readability on a cheap phone are noticed in seconds, so non-functional requirements become concrete and testable.
- **Zero install.** A link opens straight into the game on any device, for players and evaluators alike.
- **Verifiable.** The product exists, so every diagram can be checked against the code: was the product built right [@pressman]?

## Objectives

1. Survey candidate domains, related games and technologies, and justify the selection.
2. Specify the functional and non-functional requirements, with their ambiguities and gaps.
3. Rewrite the non-functional requirements as agile user stories with acceptance criteria.
4. Model the system with use case, activity, class and sequence diagrams.
5. Build the game as one HTML file on Canvas 2D and Web Audio, and deploy it on the web.
6. Verify every model against the build through black-box testing and model review.

## Scope

@tbl:int-scope draws the boundary of the project. Items on the right were left out on purpose, so that the in-scope work could be finished and modelled properly within one semester.

Table: Scope of the Sahur Protocol project {#tbl:int-scope}

| Area | In scope | Out of scope |
|---|---|---|
| Platform | Desktop and mobile browsers; keyboard, or touch in landscape | Native apps, consoles, gamepads |
| Content | 3 biomes × (3 combat rooms + boss), a final boss, 6 enemy types, 11 skills | Generated layouts, endless mode, difficulty levels |
| Players | Single player | Multiplayer, accounts, leaderboards |
| Persistence | Automatic checkpoints and touch-control layout in `localStorage` | Cloud saves, manual save slots |
| Accessibility | Reduced motion, readable menu type, mute and volume, resizable touch controls | Key remapping, colour-blind palettes, text-size settings |
| Engineering | Requirements, NFR stories, four UML models, black-box testing | Unit-test suites, formal metrics |

## Methodology

A software process model fixes the order in which specification, design, implementation and validation are carried out [@sommerville; @pressman]. @tbl:int-process summarises the four classic models and what each contributed to this project.

Table: Process models and how each shaped the project {#tbl:int-process}

| Model | Key idea | Where it shows up in Sahur Protocol |
|---|---|---|
| Waterfall [@royce] | Phases in order (Royce himself urged feedback between them) | The lab sequence: requirements first, then design models |
| Spiral [@boehm] | Each cycle tackles the biggest remaining risk | Mobile risks (touch input, orientation) handled in their own increments |
| Incremental [@sommerville] | Small working slices | Each commit adds a feature to a game that already runs |
| Agile [@agilemanifesto] | Working software; respond to change | NFRs as user stories; models reviewed against the build |

The project followed an **iterative and incremental** process with two parallel strands. The repository history shows the build growing in working increments: the playable game, then its deployment configuration, then better mobile support, and finally the menu, orientation lock and touch-control switcher [@repo]. Meanwhile each laboratory experiment added one engineering artefact, which was reviewed against the current build. Where a diagram and the code disagree, a short *model review* at the end of the chapter records the difference and states what the build actually does.

## Organisation of the Report

Table: Organisation of the report {#tbl:int-org}

| Ch. | Title | Lab | What it covers |
|---|---|---|---|
| 1 | Introduction | – | Background, the game, problem, objectives, scope, method |
| 2 | Literature Survey & Project Selection | Exp 1 (I) | Candidate domains, related games, technologies, selection |
| 3 | Requirements Analysis & Specification | Exp 1 (II) | Users, FRs and NFRs, feasibility, ambiguities, SRS |
| 4 | Agile Non-Functional Requirements | Exp 2 | Quality attributes; NFRs as user stories |
| 5 | Use Case Modelling | Exp 3 | Actors, use cases, «include» and «extend» |
| 6 | Activity Modelling | Exp 4 | Control flow of a run |
| 7 | Class Modelling | Exp 5 | Domain model and its mapping to code |
| 8 | Sequence Modelling | Exp 6 | Interactions over time, in four parts |
| 9 | Implementation, Testing & Results | Build | Architecture, subsystems, tests, defects |
| 10 | Conclusion & Future Scope | – | Outcomes, lessons, future work |
| A–C | Appendices | – | Controls, bestiary, skills and challenges |

::: cleared
- Placed the project in context: roguelites, browser-native games and the Sahur meme.
- Summarised the game, its satire and its fixed run of 13 encounters.
- Framed the problem statement, six objectives and an explicit scope boundary.
- Adopted an iterative, incremental process in which every model is checked against the build.
:::
