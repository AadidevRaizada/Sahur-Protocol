---
type: appendix
letter: B
title: "Bestiary: Enemies & Bosses"
kicker: Know your feed. Six enemies, four bosses, one very shiny Bubble.
objectives:
  - The six enemy types, with stats and behaviour
  - Where each enemy appears and how it scales
  - The three biome bosses and their attack cycles
  - The AI Bubble and its three phases
---

All values below are the base values in the game's `ENEMY_TYPES` and `BOSSES` tables. Speed is in pixels per second on the 960×540 arena; damage is dealt on contact or by bullets.

## Enemies

Each card quotes the enemy's description from the source code. Card colours follow the enemy's colour in the game.

:::: cards cols="3"
::: card title="Slopling" tag="ENEMY · CHASE" color="magenta"
- **HP** 30 · **Speed** 95 · **Dmg** 8
- Walks straight at the player.
- Wobbling blob with a drip.
- *"generated filler given legs"*
:::
::: card title="Buzzword Drone" tag="ENEMY · SHOOT" color="cyan"
- **HP** 22 · **Speed** 70 · **Dmg** 10
- Holds 180–260 px away; one aimed bullet every 2.1 s.
- *"keeps its distance, fires jargon"*
:::
::: card title="Prompt Wraith" tag="ENEMY · DASH" color="violet"
- **HP** 26 · **Speed** 60 · **Dmg** 12
- Drifts closer, then every 1.6 s dashes for 0.4 s at 420 px/s.
- *"drifts, then lunges"*
:::
::: card title="Scraper Hand" tag="ENEMY · GRAB" color="violet"
- **HP** 34 · **Speed** 120 · **Dmg** 11
- Within 190 px: 0.45 s red wind-up, lunge at 520 px/s, 1.0 s recovery.
- *"winds up, then grabs. dodge the windup"*
:::
::: card title="Yes-Man" tag="ENEMY · ORBIT" color="lime"
- **HP** 24 · **Speed** 150 · **Dmg** 9
- Circles at 175 px; one aimed bullet every 2.6 s.
- *"circles you agreeing, fires from safety"*
:::
::: card title="Pivot Golem" tag="ENEMY · TANK" color="orange"
- **HP** 85 · **Speed** 42 · **Dmg** 16
- Slow and heavy. On death it splits into two sloplings ("PIVOT!").
- *"slow, heavy, splits when it dies"*
:::
::::

::: plain
Every enemy is a kind of internet nuisance with a hitbox. The slopling is filler content that learned to walk. The yes-man agrees with you from a safe distance. The golem pivots when it fails, which, as any startup will tell you, means it comes back as two smaller problems.
:::

### Where they appear and how they scale

Enemies enter one at a time from a random edge of the arena, each after a pulsing "!" warning that lasts 0.7 s. A combat room holds 5 + 2 × *biome* + *room* enemies (counting both from zero), which is 63 across the nine combat rooms. HP is multiplied by the biome's stat scale and contact damage by its square root; speed never changes. Enemy bullets have a 6 px radius and last 6 s. Any hit makes an enemy flash white for 0.12 s, and Sahur's TUNG knocks enemies back 40 px.

Table: Enemy mix and scaling per biome {#tbl:appb-biomes}
| Biome | Enemy mix | Enemies per room | Stat scale | Boss |
|---|---|---|---|---|
| 1 Hype Cycle Forest | slopling, slopling, drone | 5 / 6 / 7 | 1.0 | Echo |
| 2 Server Farm Wastes | hand, drone, wraith, hand | 7 / 8 / 9 | 1.35 | The Scraper |
| 3 Boardroom of Broken Promises | yes-man, golem, wraith, yes-man | 9 / 10 / 11 | 1.7 | The Valuation |
| The Core | Summoned by the Bubble | – | – | The AI Bubble |

## Bosses

Every boss spawns at the top of the arena, drifts sideways on a sine wave, deals 14 contact damage, and repeats its attack patterns in a **fixed order**, so each fight can be learned. A BOSS TIMER shows the elapsed time against a target; beating a boss inside its target counts towards the speed challenges (Appendix C).

:::: cards cols="2"
::: card title="Echo, the Engagement Wraith" tag="BOSS · BIOME 1" color="magenta" img="shots/10-boss-echo.png"
- **HP** 320 · **Target** 0:55 · new pattern every 2.6 s
- **Cycle:** burst of 10 bullets → summon a slopling → teleport-lunge 90 px at the player
- A masked wraith trailing after-images.
:::
::: card title="The Scraper" tag="BOSS · BIOME 2" color="violet" img="shots/10-boss-scraper.png"
- **HP** 480 · **Target** 1:10 · new pattern every 2.4 s
- **Cycle:** 3 aimed bullets → summon a scraper hand → *offbeat*: a 16-bullet ring with the banner "...tung. tung... tung?  WRONG."
- A data core orbited by six grasping hands.
:::
::: card title="The Valuation" tag="BOSS · BIOME 3" color="cyan" img="shots/10-boss-valuation.png"
- **HP** 560 · **Target** 1:30 · new pattern every 2.2 s
- **Cycle:** 20-bullet big burst → aimed spread → summon a yes-man
- **Only damageable for 4 s after the big burst** ("OVEREXTENDED - STRIKE NOW"); otherwise hits show "NOT YET". Drawn as a growing "$NB" over an up-only chart.
:::
::: card title="The AI Bubble" tag="FINAL BOSS · THE CORE" color="magenta" img="shots/12-bubble.png"
- **HP** 1,350 · timer 2:00 (display only)
- **Patterns:** burst, spread, summon, cross, spiral and chase (six aimed bullets in quick succession)
- An iridescent sphere with an almost-right face, in an all-white arena. Three phases, below.
:::
::::

### The AI Bubble's three phases

Table: Phases of the final boss fight {#tbl:appb-bubble}
| Phase | Starts at | Bubble behaviour | TUNG every |
|---|---|---|---|
| 1 · HYPE | 100% HP | New pattern every 1.305 s; summons sloplings or drones at about 2.0–2.25× stats | ≈ 9.4 s |
| 2 · SCALE | Below 66% | Faster, every 0.90 s; summons yes-men, wraiths or drones at about 2.2–2.5× stats | ≈ 14.8 s |
| 3 · COLLAPSE | Below 33% | Music stops, bullets vanish, the Bubble turns invulnerable and stops attacking | Stops |

Seven seconds into Phase 3 the *sacrifice* cutscene plays, followed by the non-interactive finale in which Sahur strikes three final TUNGs (at 1.2 s, 2.6 s and 4.2 s) as the screen fades to white. The epilogue and the victory screen follow. The player can therefore never reduce the Bubble to zero: its last third of HP belongs to the story.

::: plain
You do not beat the Bubble. You get it down to a third, it starts leaking, and then the game gently takes the controls away because this part belongs to Sahur. Bring tissues.
:::
