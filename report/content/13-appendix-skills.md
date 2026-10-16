---
type: appendix
letter: C
title: Skill & Challenge Index
kicker: Eleven skills, eleven challenges, and how a run hands them out.
objectives:
  - The eleven skills, their families, rarities and effects
  - How upgrades and unlocks are offered during a run
  - The eleven challenges and what they check
---

On screen the game calls these **upgrades** and **skills**. Each skill has a family, a rarity and a maximum level, and its effect grows with each level. Picking a skill again raises its level by one.

::: stats
- 11 | Skills in total
- 9 | Unlocked at the start
- 11 | Upgrade picks per run
- 3 | Signal Rolls per run
:::

## Skills

Table: The eleven skills {#tbl:appc-skills}
| Skill | Family · rarity | Max | Effect per level | At start |
|---|---|---|---|---|
| Louder Voice | SIGNAL · common | 4 | Swing damage +20% | Unlocked |
| Quick Wit | SIGNAL · common | 4 | Swing cooldown −12% (floor 0.42×) | Unlocked |
| Sharp Take | SIGNAL · rare | 3 | Crit chance +12% (crits deal ×2) | Unlocked |
| Touch Grass | GROUNDING · uncommon | 3 | Max HP +18 | Unlocked |
| Good Shoes | GROUNDING · rare | 3 | Move speed +8% | Unlocked |
| Thick Skin | GROUNDING · rare | 3 | Damage taken −8% | Unlocked |
| Mixtape '07 | NOSTALGIA · epic | 3 | Each enemy hit restores +1 HP | Unlocked |
| Second Wind | NOSTALGIA · legendary | 2 | One more revive at 50% HP | Locked |
| Wider Bat | CHAOS · uncommon | 3 | Sahur's TUNG radius +15% | Unlocked |
| Faster Rhythm | CHAOS · epic | 3 | Sahur's TUNG cooldown −10% (floor 0.55×) | Unlocked |
| Borrowed Beat | CHAOS · legendary | 2 | +35% player damage for 3 s after each TUNG | Locked |

The four families are colour-coded on the cards: **SIGNAL** (red) improves the swing, **GROUNDING** (cyan) keeps the player alive, **NOSTALGIA** (amber) heals and revives, and **CHAOS** (magenta) improves Sahur. Rarities run common (white), uncommon (green), rare (cyan), epic (purple) and legendary (gold), scored 1 to 5.

::: plain
SIGNAL makes you hit harder, GROUNDING makes you harder to kill, NOSTALGIA keeps you going on old memories, and CHAOS turns Sahur up to eleven. The best runs usually mix a little of everything, or go all in on making the log do the work.
:::

## How upgrades are offered

Table: The four offer screens {#tbl:appc-offers}
| Screen | When | What the player sees |
|---|---|---|
| FIRST UPGRADE | After the prologue | "Nine core skills are already in your pool. Choose one to begin the run." Three cards. |
| CHOOSE AN UPGRADE | After each of the 9 combat rooms | Up to three different cards from unlocked, non-maxed skills; rarer and already-owned skills are more likely |
| SIGNAL ROLL | After each of the 3 biome bosses | One card rolls through the locked skills for 1.5 s, then "Claim skill" adds the result to the pool |
| FINAL UPGRADE | Before The AI Bubble | "Spend one last upgrade before The Bubble starts." Three cards. |

Each card shows the rarity, family, name, the effect at the next level and "Level x/max -> x+1/max". If every unlocked skill is already at its maximum, a single "No upgrades available" card appears instead. Because only Second Wind and Borrowed Beat start locked, the first two Signal Rolls unlock them in some order and the third reports "All skills unlocked".

:::: gallery cols="2"
::: figure src="shots/09-upgrade-choice.png" id="appc-choice" frame="crt"
A CHOOSE AN UPGRADE screen with three weighted cards.
:::
::: figure src="shots/18-challenges-panel.png" id="appc-panel" frame="crt"
The challenge panel, opened with [[C]], showing "[x]" rows and the skills-unlocked count.
:::
::::

## Challenges

Challenges are tracked automatically and listed in the panel opened with [[C]] (or a tap on the top-right corner). Completing one shows a "CHALLENGE COMPLETE" toast and saves the run. In the code each skill names one challenge as its "unlock" condition, shown in the last column of @tbl:appc-challenges. The text is printed only on a revealed Signal Roll card, so in practice players see the conditions of Second Wind and Borrowed Beat alone. It is descriptive only: the roll grants the skill whether or not the challenge has been completed, and challenges give no other reward (defect D‑05 in Chapter 9).

Table: The eleven challenges {#tbl:appc-challenges}
| Panel label | Completed when | Unlock condition of |
|---|---|---|
| First room | The first combat room is cleared | Louder Voice |
| 4 rooms | Four combat rooms have been cleared in total | Wider Bat |
| Echo down | Echo is defeated | Quick Wit |
| Echo speed | Echo is defeated in 55 s or less | Sharp Take |
| Scraper down | The Scraper is defeated | Touch Grass |
| Scraper speed | The Scraper is defeated in 70 s or less | Good Shoes |
| Valuation down | The Valuation is defeated | Thick Skin |
| Valuation clean | The Valuation is defeated in 90 s or less with no revive used | Mixtape '07 |
| No low HP boss | Any biome boss is defeated without HP falling below 40 | Faster Rhythm |
| 3 speed bosses | All three biome bosses are beaten within their target times | Borrowed Beat |
| Bubble entry | The Bubble is reached with five or more challenges completed | Second Wind |

::: plain
Think of challenges as achievements with ambitions. They track everything, toast you when you earn one, and tell you which skill they are "for", but the game hands out the skills anyway. Generous, or a feature waiting for its next patch.
:::
