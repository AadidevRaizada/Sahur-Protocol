---
num: 2
title: Literature Survey & Project Selection
exp: Experiment 1 · Part I
kicker: Five candidate projects walked in. Only one of them brought a bat.
shot: shots/01b-title-first-launch.png
objectives:
  - Survey five candidate domains and the nature of each problem
  - Review related roguelike and roguelite games and two game design frameworks
  - Compare four ways of building a 2D game for the browser
  - Select one problem and fix the scope of the selected problem
---

::: aside title="AIM OF EXPERIMENT 1"
Conduct a literature survey to identify candidate case studies and the nature of their problems, shortlist at least five, select one, and identify its scope. The requirements half of the experiment, which leads to the final problem statement, is reported in Chapter 3.

Requirements engineering begins with *inception*: a basic understanding of the problem, of the people who want a solution and of the kind of solution wanted [@pressman; @sommerville]. Comparing several candidates first guards against a problem too large to finish, too familiar to teach anything new, or too thin to model.
:::

## Survey of Candidate Domains

Five domains were shortlisted (@tbl:lit-domains). Four are information systems that appear often in software engineering coursework; the fifth, the game that became *Sahur Protocol*, is interactive.

Table: Candidate domains and the nature of each problem {#tbl:lit-domains}

| # | Domain | Nature of the problem | Scope |
|---|---|---|---|
| 1 | Library Management | Manual tracking of book issues, returns and fines | Small |
| 2 | Hospital Management | Patient records, appointments and billing | Medium |
| 3 | Food Delivery | Orders, payments and live delivery tracking | Large |
| 4 | Student Attendance | Recording and reporting attendance per lecture | Medium |
| 5 | 2D action roguelite | Real-time combat, enemy behaviour, progression, story | Medium |

Each domain was then rated on novelty, feasibility within one semester and learning value (@tbl:lit-assess). These ratings are the **team's qualitative assessment**, reached by discussion, not measured data.

Table: Qualitative comparison of the five domains (team assessment) {#tbl:lit-assess}

| Domain | Novelty | Feasible in a term | Learning value |
|---|---|---|---|
| Library Management | Low | High | Medium |
| Hospital Management | Low | Medium | Medium |
| Food Delivery | Medium | Low | High |
| Student Attendance | Low | High | Medium |
| 2D action roguelite | High | Medium | High |

The information systems share one shape (forms, records and reports), so their activity and sequence diagrams keep repeating one request-and-store pattern. Hospital management also involves domain experts and sensitive data, and food delivery brings payments, live maps and three client apps, too much for one term. Only the game has *behaviour over time* as its central problem: the hardest to specify, and the most useful to model.

::: plain
The library system is the "Hello, World!" of SE projects: respectable, but you have seen fifty. Food delivery is a startup disguised as a lab. Only the game needed diagrams of something that actually moves.
:::

## Related Work: Roguelikes and Roguelites

### Five reference games

Five published roguelikes and roguelites were studied for the specific ideas they contribute (@tbl:lit-games).

Table: Reference games and what Sahur Protocol learned from each {#tbl:lit-games}

| Game | Core contribution | Taken by Sahur Protocol |
|---|---|---|
| *Rogue* (1980) [@rogue] | Generated dungeons, permadeath, the run as the unit of play | Every WAKE UP starts a fresh run from zero upgrades |
| *The Binding of Isaac* (2011) [@isaac] | Top-down action, room by room; clear a room to move on | Defeat every enemy to clear the room |
| *Enter the Gungeon* (2016) [@gungeon] | Bullet-pattern combat; bosses known by their patterns | Bosses cycle radial bursts, aimed spreads, spirals |
| *Hades* (2020) [@hades] | Narrative roguelite; one of three blessings between rooms | One of three upgrades per room; story between fights |
| *Vampire Survivors* (2022) [@vampire] | Weapons attack on their own; the player steers and levels up | Sahur's automatic TUNG; skills with a level cap |

::::: columns
:::: col
::: figure src="shots/03b-story.png" id="lit-story" frame="crt"
The **Story** pane states the premise in one paragraph; cutscenes inside the run tell the rest.
:::
::::
:::: col
::: plain
Each game taught us one trick. *Isaac*: lock the room until it is clean. *Gungeon*: make boss bullets pretty but readable. *Hades*: offer three shiny choices. *Vampire Survivors*: let something else do the hitting. Our twist: the something else is a log with feelings.
:::
::::
:::::

The most distinctive idea in Sahur Protocol blends the last two rows of @tbl:lit-games. As in *Vampire Survivors*, much of the damage comes from an attack the player does not trigger; as in *Hades*, that attacker is a character with a voice and a story. Sahur is both the player's strongest weapon and the emotional centre of the plot, which is why the ending lands on him.

### Roguelike or roguelite?

::: theory title="The Berlin Interpretation"
The Berlin Interpretation (International Roguelike Development Conference, 2008) lists the factors that make a game more or less "roguelike" [@berlin]: random environment generation, permadeath, turn-based and grid-based play, non-modal play, complexity, resource management, hack'n'slash combat, and exploration. It describes a family resemblance, not a strict definition.
:::

Measured against these factors (@tbl:lit-berlin), Sahur Protocol keeps the run structure, the randomised rewards and the hack'n'slash core, but it is real-time, free-moving and forgiving. That is why it calls itself a *roguelite*.

Table: Sahur Protocol measured against the Berlin factors {#tbl:lit-berlin}

| Berlin factor | How it appears in Sahur Protocol | Match |
|---|---|---|
| Random environment | Fixed arena; random enemy mix, spawn edges and upgrade offers | Partly |
| Permadeath | Death ends the attempt, but the last checkpoint survives | Partly |
| Turn-based / grid-based | Real-time, free eight-direction movement in a 960 × 540 arena | No |
| Non-modal | Combat on one screen; upgrades and story in separate overlays | Partly |
| Complexity | 11 levelled skills, 6 enemy behaviours, 4 bosses | Partly |
| Resource management | Health is the only resource; no items or currency | Partly |
| Hack'n'slash | Clearing waves of enemies is the core activity | Yes |
| Exploration | Linear route; discovery lies in skill builds and boss patterns | Partly |

### Game design frameworks

::: theory title="MDA and the elemental tetrad"
The **MDA framework** describes a game in three layers [@mda]: *mechanics* (rules and data), *dynamics* (behaviour that emerges when mechanics meet player input) and *aesthetics* (the player's emotional responses, such as challenge, narrative or sensation). Designers build upward from mechanics; players meet the game from aesthetics down. Schell's **elemental tetrad** adds that every game is mechanics, story, aesthetics and technology, each supporting the others [@schell].
:::

Table: Sahur Protocol read through the MDA framework {#tbl:lit-mda}

| Layer | In Sahur Protocol |
|---|---|
| Mechanics | 0.38 s swing cooldown; TUNG on its own timer; weighted upgrade draws; fixed boss pattern cycles; boss timers |
| Dynamics | Staying near Sahur as his meter fills; dodging rings between swings; waiting for The Valuation to open up; builds that snowball because owned skills are offered more often |
| Aesthetics | **Challenge** (bosses against the clock), **narrative** (cutscenes), **fantasy** (a log as a best friend), **sensation** (screen shake, the bass TUNG) |

## Technology Survey

The tetrad's fourth element, technology, decides how the game is delivered and how much the team must build by hand. A game engine supplies rendering, physics, audio, animation, scene management and editing tools [@gregory]; for a single-screen 2D arena with circular collisions, most of that would sit unused. Four options were compared (@tbl:lit-tech).

Table: Technology options for a 2D browser game {#tbl:lit-tech}

| Criterion | Unity | Godot | Phaser | Vanilla Canvas |
|---|---|---|---|---|
| Language | C# | GDScript | JavaScript / TypeScript | JavaScript |
| Tooling | Hub and editor install | Standalone editor | Package or script tag | Text editor and browser |
| Web delivery | WebGL build [@unityweb] | WebAssembly + WebGL 2 [@godotweb] | In the page [@phaserdocs] | In the page [@mdncanvas] |
| Portability | Desktop, mobile, consoles; web by export | Desktop, mobile; web by export | Any browser with Canvas or WebGL | Any browser with Canvas 2D |
| Extra download | Engine runtime | Engine runtime | Framework library | None |
| Team learns | Editor workflow | Scene tree, signals | A framework's API | Loop, collision, states, audio |

Unity and Godot web builds ship an engine runtime with the game, and Godot's multi-threaded export even needs cross-origin isolation headers on the server [@godotweb]. Phaser is lighter, rendering through Canvas or WebGL [@phaserdocs]. Plain JavaScript on Canvas 2D [@mdncanvas], with sound from the Web Audio API [@mdnaudio], needs nothing beyond the browser. The team chose **vanilla Canvas and Web Audio in a single HTML file**, for four reasons:

- **Delivery:** one static file opens from a link on any device, with no install or runtime download.
- **Proportion:** the game loop, update method and state pattern cover everything needed [@nystrom].
- **Traceability:** every model element maps to a visible function or data table in the source.
- **Learning value:** building loop, timing and audio by hand teaches what an engine hides [@gregory].

The price, accepted knowingly, is no visual editor, no physics engine and one large file that is harder to maintain than modules (see future work in Chapter 10).

::: stats
- 0 | Dependencies
- 0 | Build steps
- 1 | HTML file
- 2 | Core browser APIs
:::

::: plain
Unity is a fully equipped restaurant kitchen. We needed to make toast. So we used a toaster, the browser, and spent the saved effort on the toast: the combat, the story and the diagrams.
:::

## Selection and Justification

Combining the three surveys, the team selected the fifth candidate: **Sahur Protocol, a top-down 2D action roguelite for the browser**. Three arguments carried the decision.

:::: cards cols="3"
::: card title="Novel" tag="NOT ANOTHER CRUD APP" color="magenta"
The only candidate with real-time behaviour, timed events and a story. The satire gives it a clear identity.
:::
::: card title="Model-rich" tag="EVERY UML VIEW" color="cyan"
Distinct actors, screens that form a state machine, many entity types and timed interactions.
:::
::: card title="Feasible" tag="ONE SEMESTER" color="lime"
Free tools, one file, no server, static hosting: a medium scope three people can build and model in a term.
:::
::::

::: aside title="RISKS ACCEPTED"
"Fun", "responsive" and "readable" are easy to say and hard to measure, and creative projects invite scope creep. So the scope was fixed early (below), and every quality was later rewritten as a measurable acceptance criterion.
:::

::: pagebreak
:::

## Scope of the Selected Problem

Within the project boundary of Section 1.5, the problem breaks into nine subsystems (@tbl:lit-scope). They became the vocabulary for the requirements in Chapter 3 and the models in Chapters 5 to 8.

Table: Subsystems within the scope of the selected problem {#tbl:lit-scope}

| Subsystem | What is in scope |
|---|---|
| Player control | Eight-direction movement; circular bat swing with a cooldown; health, post-hit invulnerability |
| Companion | Sahur follows the player and attacks on a timer; he cannot be harmed |
| Enemies and bosses | Six enemy behaviours; a pattern-cycling boss per biome; a scripted final boss |
| Progression | 3 biomes × (3 rooms + boss); upgrades after rooms; skill unlocks after bosses |
| Narrative | Illustrated cutscenes with typewriter dialogue at fixed points |
| Interface | Title menu and panes, pause menu, canvas HUD, end screens |
| Persistence | Automatic checkpoints; continue or retry from the last one |
| Audio | Synthesised music and effects, a choir theme, mute and volume |
| Platform | Keyboard on desktop; touch controls and a landscape prompt on phones |

::: cleared
- Surveyed five candidate domains and compared them on scope, novelty, feasibility and learning value.
- Placed the game in the roguelike tradition, learned from five reference games and read it through MDA.
- Compared Unity, Godot, Phaser and vanilla Canvas, and chose a single-file Canvas and Web Audio build.
- Selected Sahur Protocol and fixed its scope as nine subsystems, ready for requirements analysis.
:::
