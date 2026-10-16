---
type: front
title: Abstract
kicker: THE RUN IN 300 WORDS
tocLabel: ABSTRACT
---

Sahur Protocol is a browser-based, top-down 2D action roguelite in which the player and Sahur, a living wooden log with a bat, fight through three biomes to "pop" The AI Bubble, a satire of technology hype. A run consists of nine combat rooms, three biome bosses and a scripted final boss; the player picks eleven skill upgrades along the way, and the first two biome bosses each unlock a new skill.

This report documents the project as a Software Engineering case study. A literature survey compared five candidate domains and reviewed related roguelites and web game technologies before the game was selected. Requirements analysis produced 21 functional and 14 non-functional requirements, a feasibility study and an SRS outline, and found twelve ambiguities, inconsistencies and gaps, several of them in the game's own on-screen text. The non-functional requirements were then rewritten as ten agile user stories with 34 measurable acceptance criteria. The system was modelled with UML use case, activity, class and sequence diagrams.

The implementation is a single 2,143-line HTML file in vanilla JavaScript with no dependencies or build step. It renders with the Canvas 2D API, synthesises its music and sound effects with the Web Audio API, saves checkpoints to `localStorage`, supports keyboard and touch input, and is deployed as a static site on Vercel. Each model was verified against the build, and every difference was recorded as a model-review finding. The class diagram serves as a conceptual domain model, because the code is data-driven and contains no classes.

Fourteen black-box test cases derived from the use cases were executed: eleven passed, one failed (no warning before a save is overwritten) and two were recorded as limitations. Ten defects were logged with severities and suggested fixes; none prevents completing the game. The project shows that standard SE modelling remains valuable for a small, procedural game when its models are continually checked against the code.

**Keywords:** software engineering, UML, requirements engineering, user stories, roguelite, HTML5 Canvas, Web Audio API, browser game, verification, black-box testing.

::: stats
- 2,143 | Lines, one file
- 7 | Game modes
- 13 | Encounters per run
- 11 | Skills
:::
