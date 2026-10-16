---
num: 7
title: Class Modelling
exp: Experiment 5
kicker: The static view of the game - what it is made of, and how the parts hold on to each other.
shot: shots/10-boss-valuation.png
objectives:
  - Select candidate classes with the six class-selection characteristics
  - Give each class its attributes and operations
  - Choose the right relationship for every pair of classes
  - Draw the class diagram and map it onto the real code
---

Experiment 5 was performed on 02/09/2026. Its aim was to create a **class diagram** for Sahur Protocol. The use case view (Chapter 5) and the activity view (Chapter 6) describe what the game does and in which order; the class view describes what the game *is made of*: the things it must remember, the data each one carries, the operations that act on that data, and the relationships that hold them together [@booch; @fowler]. The expected outcome was the ability to identify the classes of a system with their associations, and the attributes and operations of each class.

## Theory: Data Modelling and Class Selection

::: theory title="What is data modelling?"
Data modelling defines and analyses the data a system needs, and the relationships between those data, in a standard form that analysts, programmers, testers and users can all read [@pressman; @sommerville]. A data model is never final; it is a living document refined through three levels:

- **Conceptual model:** a technology-independent description of the things in the domain and how they relate, used to discuss requirements with stakeholders.
- **Logical model:** the conceptual model with structure added (attributes and types, multiplicities, operations), still independent of storage or language.
- **Physical model:** the logical model mapped onto real storage and code, with decisions about layout, access and performance.
:::

For Sahur Protocol, the conceptual level is the game world (player, Sahur, enemies, bosses, skills, biomes, challenges), the logical level is the class diagram of this chapter, and the physical level is plain JavaScript objects in memory plus one JSON record in `localStorage`. The diagram takes what Fowler calls a *conceptual perspective*: its boxes describe concepts of the domain, not necessarily classes in the code [@fowler].

::: plain
A class diagram is the game's **inventory screen for programmers**. Nothing moves in it. It just lists every kind of thing in the world, what is printed on its stat card, and who owns whom. Sahur's card, for example, has no HP line at all, because nothing in the game can hurt him.
:::

### Selecting classes

A noun found in the problem description is only a *potential* class. It is kept as a class when it satisfies all, or most, of six selection characteristics [@pressman], listed in @tbl:cls-criteria.

Table: The six class-selection characteristics, with an example from the game {#tbl:cls-criteria}
| Characteristic | Test applied to a candidate | Example from Sahur Protocol |
|---|---|---|
| Retained information | Must the system remember it over time? | The run's biome and room, kept between rooms and saved |
| Needed services | Does it have operations that change its attributes? | The player takes damage and heals |
| Multiple attributes | Does it carry more than one value? | An enemy has HP, speed, radius, damage, colour and AI type |
| Common attributes | Do the same attributes apply to every instance? | All six enemy kinds share one attribute list |
| Common operations | Do the same operations apply to every instance? | Every skill can be applied and described at a level |
| Essential requirements | Does it produce or consume needed information? | A challenge consumes boss times, produces completions |

### Attributes and operations

Attributes are the nouns of a grammatical parse that reasonably belong to a class, and they hold the values that describe an object's state. The guiding question is *which data items fully define this class in the context of the problem?* An item that occurs many times for one object is usually a class of its own, which is why bullets are a class rather than a list inside Enemy. Operations come from the verbs of the same parse; each one knows the state of its class and its associations [@pressman], and falls into one of the four categories of @tbl:cls-ops.

Table: The four categories of operations, with examples from the model {#tbl:cls-ops}
| Category | What it does | Example in the model |
|---|---|---|
| Manipulate | Changes the state of an object (add, delete, modify) | `Player.takeDamage(d)`, `Skill.apply(state, level)` |
| Compute | Performs a computation | `Skill.getDescription(level)`, which builds "Swing damage +40%." for level 2 |
| Inquire | Reports on the state of an object | `Bullet.isExpired()`, `Boss.checkVulnerability()` |
| Monitor | Watches for a controlling event | `GameState.checkClear()`, `Challenge.checkCompletion()` |

## Classes Identified

Applying the six characteristics to the vocabulary of the requirements (Chapter 3) and the use cases (Chapter 5) produced the ten classes of @tbl:cls-classes. Some nouns failed the tests and stayed attributes: **room** holds a single index from 0 to 3 and lives in GameState, while **HP**, **rarity** and **family** each describe another class with one value.

Table: Classes selected for Sahur Protocol and the characteristics that justify them {#tbl:cls-classes}
| Class | Role in the game | Characteristics met |
|---|---|---|
| GameState | The run in progress: biome, room, rooms cleared, phase | Retained information, needed services |
| Player | The character the person controls | Common attributes and operations |
| Companion (Sahur) | The log with a bat who lands the TUNG slam | Multiple attributes, needed services |
| Enemy | The general type behind the six enemy kinds | Common attributes and operations |
| Boss | A biome boss or The AI Bubble, with attack patterns | Needed services beyond Enemy |
| Bullet | A projectile that exists only while on screen | Multiple attributes |
| Skill | An upgrade that can be unlocked and levelled | Common attributes and operations |
| Biome | A themed stage: rooms, enemy mix, stat scale, boss | Common attributes, retained information |
| Challenge | An optional objective, such as *Echo speed* | Essential requirement |
| AudioManager | Owns all music and sound in one place | Needed services |

## Relationships Between Classes

UML defines several kinds of relationship between classes, and this model uses five of them [@booch; @uml251]. Choosing between them is mostly a question of **lifetime** and **ownership**: does the part die with the whole, can it exist on its own, or does one class only use another for a moment? @tbl:cls-rel records the decision for each link.

Table: Relationships used in the class diagram {#tbl:cls-rel}
| Relationship | UML notation | Where used (multiplicity) | Why this kind |
|---|---|---|---|
| Composition | Solid line, filled diamond at the whole | GameState *controls* Player (1) and is *accompanied by* Companion (1) | Both exist only while a run exists; each new run creates a new pair |
| Aggregation | Solid line, hollow diamond at the whole | GameState *unlocks* Skill, *spawns* Enemy, *tracks* Bullet (each `0..*`) | Collected by the run but created and removed on their own |
| Association | Solid line, open arrow | GameState to Biome (*current*, 1), Challenge (*tracks*, `0..*`), AudioManager (*uses*); Biome to Boss (*assigns*, 1) | A navigable "knows about" link with no ownership |
| Generalisation | Solid line, hollow triangle at the general class | Boss is a kind of Enemy | A boss has everything an enemy has, plus attack patterns |
| Dependency | Dashed arrow with a stereotype | Enemy «fires» Bullet | An enemy creates bullets but keeps no reference to them |

Multiplicities sit at the line ends: `1` means exactly one and `0..*` means zero or more. A room can hold no enemies once it is cleared, or many while it is being fought; a run always has exactly one current biome.

::: plain
**Composition** means "dies with the run": press WAKE UP and the old Player and Sahur are gone for good. **Aggregation** means "kept in a bag": enemies and bullets come and go all the time, and the run just holds the bag. **Generalisation** is the family tree. Every boss is an enemy that went to business school.
:::

## The Class Diagram

The complete model is shown in @fig:cls-diagram. GameState sits at the top as the hub of the run, and every line that leaves it reads as a sentence about the run: it *controls* one Player, is *accompanied by* one Companion, *unlocks* skills, is *currently in* one Biome, *tracks* challenges and bullets, *spawns* enemies and *uses* the AudioManager. Lower down, the Biome *assigns* its Boss, Boss and Enemy are joined by the generalisation arrow, and Enemy «fires» Bullet. The diagram is wide, so it is printed rotated on a page of its own; the class dictionary below lists every member of every class in readable type.

::: stats
- 10 | Classes
- 54 | Attributes
- 25 | Operations
- 11 | Relationships
:::

### Class dictionary

:::: cards cols="2"
::: card title="GameState" tag="HUB · ONE PER RUN" color="violet"
- **Attributes:** `biome`, `room`, `roomsCleared`, `phase` : int; `levelOver` : boolean
- **Operations:** `startRoom()`, `checkClear()`, `gameOver()`, `saveProgress()`, `loadProgress()`
:::
::: card title="Player" tag="COMPOSITION · 1" color="lime"
- **Attributes:** `x`, `y`, `speed`, `crit`, `armor` : float; `hp`, `maxHp`, `dmg`, `lifesteal`, `revives` : int
- **Operations:** `attack()`, `takeDamage(d)`, `heal(amount)`
:::
::: card title="Companion (Sahur)" tag="COMPOSITION · 1" color="wood"
- **Attributes:** `x`, `y`, `radius`, `cdMult`, `degrade` : float; `alive` : boolean; `facing` : int
- **Operations:** `performTungSlam()`, `updateAnimation()`
:::
::: card title="Skill" tag="AGGREGATION · 0..*" color="yellow"
- **Attributes:** `name`, `family`, `rarity` : String; `maxLevel`, `level` : int
- **Operations:** `apply(state, level)`, `getDescription(level)`
:::
::: card title="Biome" tag="ASSOCIATION · CURRENT 1" color="cyan"
- **Attributes:** `name`, `background` : String; `roomCount` : int; `enemyMix` : List; `statScale` : float
- **Operations:** `getEnemyMix()`, `getBoss()`
:::
::: card title="Challenge" tag="ASSOCIATION · 0..*" color="orange"
- **Attributes:** `id`, `label` : String; `completed` : boolean
- **Operations:** `checkCompletion()`
:::
::: card title="AudioManager" tag="ASSOCIATION · USES" color="violet"
- **Attributes:** `currentTrack` : String; `muted` : boolean
- **Operations:** `playTone(freq, dur)`, `playTrack(name)`, `mute()`
:::
::: card title="Boss" tag="GENERALISATION OF ENEMY" color="magenta"
- **Attributes:** `name` : String; `patterns` : List; `patCD` : float; `isFinal` : boolean
- **Operations:** `executePattern()`, `checkVulnerability()`
:::
::: card title="Enemy" tag="AGGREGATION · 0..*" color="magenta"
- **Attributes:** `speed`, `r` : float; `hp`, `dmg` : int; `color`, `aiType` : String
- **Operations:** `move()`, `attack()`, `takeDamage(d)`
:::
::: card title="Bullet" tag="AGGREGATION · 0..*" color="cyan"
- **Attributes:** `x`, `y`, `vx`, `vy`, `r`, `lifetime` : float; `dmg` : int
- **Operations:** `update(dt)`, `isExpired()`
:::
::::

:::: gallery cols="2"
::: figure src="shots/09b-signal-roll-rolling.png" id="cls-skill-shot" frame="crt"
A **Skill** at run time: the Signal Roll card cycling through the locked skills (here Second Wind, a legendary NOSTALGIA skill) before it reveals the unlock.
:::
::: figure src="shots/12b-bubble-phase2.png" id="cls-boss-shot" frame="crt"
A **Boss** with `isFinal = true`: The AI Bubble in PHASE 2 - SCALE, among its **Bullet** objects and summoned **Enemy** objects.
:::
::::

::: aside title="READING THE ROTATED DIAGRAM"
Give the next page a quarter-turn clockwise. GameState then sits at the top, the classes it owns or knows fan out below it, and Boss, Enemy and Bullet run down the right-hand side. Every line carries a role name (*controls*, *spawns*, *assigns*) and its multiplicities at the ends. The diamond and triangle markers are drawn at the part and subclass ends of their lines, so read each link with the meaning given in @tbl:cls-rel: GameState is always the whole, and Enemy is the general class.
:::

::: figure src="diagrams/exp5-class.png" id="cls-diagram" size="rotate"
Class diagram of Sahur Protocol: GameState as the hub; composition with Player and Companion (Sahur); aggregation of Skill, Enemy and Bullet; associations with Biome, Challenge and AudioManager; Biome assigning a Boss; the Boss and Enemy generalisation; and the «fires» dependency from Enemy to Bullet.
:::

::: plain
Read the diagram like a family photo: GameState is the parent holding everyone's hand, Player and Sahur are glued to it, the enemies and bullets are a crowd it keeps an eye on, and the bullets are, rudely, being *fired* at you.
:::

## From Model to Code

Every class in the model has a counterpart in the source, yet the source has no `class` declaration at all. Sahur Protocol is **data-driven and procedural**: the model's classes are realised as data tables (`SKILLS`, `BIOMES`, `ENEMY_TYPES`, `BOSSES`, `CHALLENGE_ROWS`), plain objects built by factory functions (`newRun()`, `spawnEnemyAt()`, `spawnBoss()`) and free functions working on one global run object, `state` (@tbl:cls-map).

Table: Each modelled class and the construct that realises it in the code {#tbl:cls-map}
| Class in the model | Construct in the code | Where its behaviour lives |
|---|---|---|
| GameState | `let mode` (seven states) and `let state`, the run object from `newRun()` | `startGame()`, `continueGame()`, `pauseGame()`, `gameOver()`, `showVictory()` |
| Player | Plain object `state.player` | `update()` (movement, swing), `damagePlayer()` |
| Companion (Sahur) | Plain object `state.sahur`; frames in `SAHUR_SPRITES` | TUNG logic inline in `update()`; `tung()` sound |
| Enemy | Objects in `state.enemies[]` built by `spawnEnemyAt()` from `ENEMY_TYPES` | Branches on `e.ai` in `update()`; `drawEnemy()` |
| Boss | Separate object `state.boss` built by `spawnBoss(id)` from `BOSSES` | Patterns in `update()`; `drawBoss()`; shares `damageEnemy()` |
| Bullet | Objects `{x, y, vx, vy, r, dmg, t}` in `state.bullets[]` | `fireRadial()`, `fireAimed()`, boss patterns |
| Skill | Entries of `SKILLS`; the run's levels in `state.skillLevels` | `applySkillLoadout()`, `openChoice()`, `openSkillRoll()` |
| Biome | Entries of `BIOMES` | The accessor `biome()`, used by `startRoom()` |
| Challenge | `CHALLENGE_ROWS` plus the set `state.completedChallenges` | `completeChallenge()`, `evaluateBossChallenges()` |
| AudioManager | Singletons `Music`, `SceneSound`, `ChoirMusic` | Plus `audio()`, `tone()`, `tung()`, `typeBlip()` |

The model is still worth having: as a **domain model** it gave the team a shared vocabulary ("a boss is a kind of enemy", "skills belong to the run") across the requirements, use case and sequence models. The data-driven style is a deliberate trade-off: plain objects are cheap to create every frame and serialise straight to JSON for the save, and a new enemy kind is a new table row rather than a subclass, the *Type Object* pattern [@nystrom].

::: plain
The code never says `class Boss extends Enemy`. A boss is just an object with HP and a radius, and the damage function never asks for its papers: if it quacks like an enemy, it gets hit like one.
:::

## Model Review

As a verification step, the diagram was compared with the source of the delivered build. It is kept as drawn; @tbl:cls-review lists each finding with the revision it suggests.

Table: Model review: the class diagram compared with the build {#tbl:cls-review}
| Model element | What the build does | Revision of the model |
|---|---|---|
| Boss generalises Enemy | No inheritance: `state.boss` is a separate object sharing `damageEnemy()` | Keep it as a conceptual "kind of" link |
| Marker placement | Diamonds are drawn at the part ends, the triangle at the Boss end | UML puts diamonds at the whole and the triangle at the general class [@uml251]; read as in @tbl:cls-rel |
| `Skill.level` | Levels belong to a run (`state.skillLevels`); `SKILLS` holds shared definitions | Move `level` to an association class, *SkillLevel* |
| `Challenge.completed` | Membership of `state.completedChallenges`; no reward | Mark it as a derived attribute |
| `Player.heal()` | HP is restored by lifesteal and the Second Wind revive; the room-clear heal (`roomHeal`) is always 0 | Replace with the two real healing paths |
| Enemy «fires» Bullet | Only drones and yes-men shoot, but every boss fires through `fireRadial()` and `fireAimed()` | Add a «fires» dependency from Boss |
| Missing members and classes | The seven-state `mode`; the cutscene player; input and touch; particles and floating text | Add `mode : String`, *Cutscene*, *InputController* and *Effect* |

## Observations and Learning

- A useful static model exists even for code with no classes: its classes were found in the data the game keeps at run time. Lifetime decided composition versus aggregation.
- The class view says nothing about **order**; that is the job of the sequence model in the next chapter.

::: cleared
- Ten classes selected with the six class-selection characteristics; other nouns kept as attributes.
- Attributes and operations defined; five relationship kinds applied and justified.
- Class diagram drawn (@fig:cls-diagram) and restated as a readable class dictionary.
- Every class mapped to its construct in the data-driven code, with seven review findings.
:::
