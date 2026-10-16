---
num: 10
title: Conclusion & Future Scope
exp: Wrap-up
kicker: Dawn breaks. Sahur is gone. Here is what we learned and what comes next.
shot: shots/24-cutscene-epilogue.png
objectives:
  - Summarise what each experiment produced
  - Reflect on what checking the models against the build taught us
  - State the limitations of the game and of this study
  - Set out the future scope of the project
---

This report followed Sahur Protocol from the choice of a problem to a deployed and tested build. Each experiment produced one view of the same system, and Chapter 9 checked those views against the code. This chapter draws the threads together.

## Summary of the Work

@tbl:conc-summary follows the usual path of a software project: understand the problem, state the requirements, model the system from several viewpoints, build it and verify it [@pressman; @sommerville].

Table: What each chapter produced {#tbl:conc-summary}
| Chapter | Experiment | Main output | Key takeaway |
|---|---|---|---|
| 2 Survey | Exp 1 · I | Five domains compared; tech survey | A small single-file game is feasible |
| 3 Requirements | Exp 1 · II | 21 FRs, 14 NFRs, feasibility, SRS outline | Ambiguities hide in game text too |
| 4 Agile NFRs | Exp 2 | 10 NFR stories, 34 acceptance criteria | A quality must be testable |
| 5 Use cases | Exp 3 | 26 use cases, 10 of them primary | Include always runs; extend is optional |
| 6 Activity | Exp 4 | Activity diagram of the gameplay loop | The room loop drives the game |
| 7 Class | Exp 5 | 10-class conceptual model, code mapping | Domain models work without classes |
| 8 Sequence | Exp 6 | Four-part sequence model, 58 messages | Message order shows when saves happen |
| 9 Implementation | Build | 2,143-line game; 14 tests; 10 defects | Requirements met; gaps are known |

::: plain
Eight chapters, one log. We started with five candidate projects, one of them a library management system (no), and ended up with a game where a piece of wood saves the world from a chatbot. Every diagram got a little more honest along the way, because the code kept checking our homework.
:::

## What Verification Taught Us

The most useful activity in the project was not drawing any single diagram but **comparing each model with the running build**. Every model review in Chapters 5 to 8 found something: a use case with no real trigger (*Exit Game*: the player simply closes the tab), a step drawn once that really happens continuously (the HP check, on every hit), a hierarchy that exists only in the domain (*Boss* as a kind of *Enemy*), and saves at more points than the sequence diagram showed. These are not failures of modelling but the normal result of verification, which asks "are we building the product right?" [@sommerville]. Three lessons stand out.

1. **Models and code answer different questions.** The class diagram describes the concepts of the game, which the data-driven script expresses as tables and plain objects. An explicit mapping gave the team a shared vocabulary without forcing the code into a shape it did not need.
2. **Words are requirements too.** Two defects (D‑05 and D‑06) came from on-screen text promising behaviour the code lacks, such as "Protect him" for a companion who cannot be hurt. Requirements analysis must read the interface copy as well as the specification.
3. **Test cases fall out of good use cases.** Because every flow and exception was written down in Chapter 5, the test cases of Chapter 9 needed little extra design, and the one failure had already been flagged as an incompleteness during requirements analysis.

## Limitations

::: patch title="KNOWN LIMITATIONS"
**Of the game.** No key remapping, gamepad support, colour-blind option or difficulty setting; audio settings are not remembered; reduced motion does not calm canvas shake and flashes; skill-unlock challenges are displayed but not enforced. The variable-timestep loop slows down rather than skipping on weak hardware. Chapter 9 lists all ten logged defects.

**Of the study.** Testing was black-box only: a scripted harness drove the build through its interface, but there are no unit tests inside the game's code. No frame-rate or load-time measurements were taken, so the report makes no performance claims. Playtesting was informal, with no structured user study. The class model is conceptual because the code is procedural.
:::

## Future Scope

@tbl:conc-future lists the enhancements the team would make next. Most come from the defect log and the model reviews; a few extend the game.

Table: Future scope {#tbl:conc-future}
| # | Enhancement | Why |
|---|---|---|
| 1 | Keyboard remapping | Other layouts and motor needs |
| 2 | Gamepad support (Gamepad API) | Comfortable play on a TV or handheld PC |
| 3 | Colour-blind palette | Enemies and bullets rely on magenta, cyan and green |
| 4 | Difficulty modes | Scale enemy HP and damage for new and expert players |
| 5 | Save-overwrite confirmation | Fixes the failed test and defect D‑09 |
| 6 | Persisted audio settings | Mute and volume survive a reload (D‑10) |
| 7 | Cutscene gallery | Lets *View Story* replay scenes already seen |
| 8 | Challenge rewards | Gives the challenges a mechanical purpose (D‑05) |
| 9 | Fixed-timestep loop | Identical simulation at any frame rate [@fiedler] |
| 10 | Progressive Web App, offline play | Installable, with the choir cached offline |
| 11 | Opt-in, anonymous balance telemetry | Data to tune bosses and skills, with privacy respected |
| 12 | Refactor into ES modules and classes | Aligns the code with the class model of Chapter 7 |

## Closing Remarks

Sahur Protocol began as a meme about a log with a bat and became a complete, playable system with a documented design. The course gave the project its structure: requirements before code, several models before implementation, and verification at the end. The game's story, in which a companion keeps the rhythm until there is nothing left to give, turned out to describe a semester project rather well. The run is over, and the save file has been deleted, as it should be after a victory.

::: cleared title="GAME COMPLETE"
- Built and deployed Sahur Protocol as a single-file HTML5 Canvas game with no dependencies.
- Produced the full set of course artefacts: survey, requirements, agile NFR stories, and use case, activity, class and sequence models.
- Verified every model against the build and tested the build with use-case-derived black-box tests.
- Identified twelve directions for future work, led by accessibility and save safety.
:::
