# Sahur Protocol v3: verified fact sheet

Source of truth: `Sahur_Protocol.html` at commit `9e2f789` (v3; HEAD `81a9f1a` did not change it). The file was read in full through a copy with the 23 base64 lines stripped. Line numbers (L) are the same in the original. Every number below comes from the code. Inferences are marked **(inference)**. Where on-screen or design copy says something the code does not do, that is flagged **(copy ≠ code)**.

The older sheet `report/research/game-facts.md` describes v0.2 (`a3e663a`). Section 9 lists what changed.

---

## 1. Overview

| Item | Fact |
|---|---|
| Title | `<title>SAHUR PROTOCOL</title>`. The title screen shows "SAHUR PROTOCOL" with "TUNG  TUNG  TUNG" underneath. |
| Genre | Top-down 2D arena action roguelite. You clear rooms, pick upgrades, beat a boss in each of 3 biomes, then face a scripted final boss. The header comment says "A 2D roguelike: you + Tung Tung Tung Sahur vs. The AI Bubble." There is no jump or gravity. **v3 adds a light rhythm layer**: on-beat swings deal extra damage (section 4). |
| Premise (Story pane, L874) | "The feed has put the world to sleep, and nobody wakes up anymore…" Sahur, a wooden log with a baseball bat, breaks into your apartment "because you ignored three calls". Together you walk through three broken places to pop the AI Bubble. |
| Cultural note (Story pane) | Sahur comes from the Indonesian Ramadan tradition of beating hollow wooden *kentongan* and calling "sahur!" before dawn. Victory screen credit: "Made with respect for the kentongan sahur tradition of Indonesia." |
| Tone | Satire of AI and tech hype (buzzwords, a "Valuation", "thrilled to announce"), brainrot and meme vocabulary ("aura", "BRAINROT GOD", "RATIO'D", tier lists), and a sincere sacrifice ending. |
| Speakers | `-` (narrator), `???`, `SAHUR`, `YOU`, `THE BUBBLE`, `VOICE`, `PATATAM` (in-game only) |

**Characters**
- **YOU**: unnamed. Drawn as a cream circle (r 15) with eyes that face the movement direction. In v3 it squashes when it swings and leaves cyan afterimages when it dashes.
- **Sahur / "Triple T"**: drawn from 7 embedded PNG frames (3 idle, 4 attack) at 92×92 px. He slams automatically (TUNG). **In v3 he has HP in boss fights** and can be knocked down. He speaks in speech-bubble "barks". The nickname comes from biome 2: "The kids on the lane gave him a name: Triple T, because he always knocked three times."
- **Biome bosses**: ECHO, THE ENGAGEMENT WRAITH; THE SCRAPER; THE VALUATION. **Final boss**: THE AI BUBBLE.
- **Rival cameo**: GRR GRR PATATAM ("Mossy. Offended. Technically a tree."), in biome 1, room 3.
- **Enemies**: slopling, drone, wraith, hand, yesman, golem. Stats are unchanged from v0.2 (L498–515).

### Cutscenes (`CUTSCENES`, L541–611, plus `epilogue_card` L865)

| id | Art | Lines | Notes / memorable line |
|---|---|---|---|
| `prologue` | apartment (dark-room, eyes and reveal FX) | 11 | Opens "3:07 AM. The feed scrolls itself…". Ends with SAHUR: "Whole city sleeping. We go pop it." / YOU: "...Why me?" / SAHUR: "Bring shoes." |
| `biome1_end` | fire | 5 | "Lesson. TUNG, TUNG, TUNG. Always three. Two is rumor. Three is a call." |
| `biome2_end` | river, plus the procedural `memory_street` | 9 | The Triple T naming line; "I am made of answered calls." |
| `biome3_end` | boardroom, plus the procedural `memory_window` | 6 | One line is **dynamic**: it counts how many times you hauled Sahur up (`sahurHelps`). "Was you. Then phone came. I still knock." |
| `core_intro` | `void` (procedural white core) | 3 | THE BUBBLE: "thrilled to announce - this changes everything - at scale…" |
| `sacrifice` | core | 7 | "It is not a thing to hit. It is a thing to wake." / "Hey. It was a good walk." / "Three TUNG. When I call, you answer. Don't be late." |
| `epilogue` | dawn (plays the `dawn` track) | 6 | One line has `knocks:3`: **the player presses 3 times to knock** ("SPACE / TAP TO KNOCK n / 3"). It ends with VOICE: "...sahur?" |
| `epilogue_card` | black title cards | 6 | "EPILOGUE I / THE FIRST ANSWER", "The Bubble had siblings. They did not get the memo.", "TUNG. TUNG. TUNG.", "...TUNG?", "TO BE CONTINUED" |

That makes **8 scenes and 53 lines**. The typewriter runs at 45 chars/s with a per-speaker blip voice. **Every scene can be skipped** with the "SKIP SCENE >>" button. Memory lines get a sepia tint, grain and a "MEMORY" label.

**Ending and sequel tease**: the sacrifice leads to the interactive three-answer finale (section 3.6), then the dawn epilogue, then the Epilogue I card with the stinger, then the victory screen. The victory screen shows "WE WON." / "BUT AT WHAT COST." with the grade and stats, then "Somewhere, very far away... a fourth tung?", "END OF EPILOGUE I" and the tradition credit. Button: "AGAIN - FOR HIM".

---

## 2. Controls

### Keyboard (L1306–1323)
| Action | Keys | Notes |
|---|---|---|
| Move | W A S D / arrow keys | 8-direction, normalised |
| Swing | Space / J | **Holding repeats the swing** (L2750); each swing waits for the cooldown |
| Dash | Shift / K | on keydown only |
| TRIPLE T (ultimate) | **E** (also L and Q in code) | Only works when the meter is full. Labels say E; the unused tutorial copy says "E / L". |
| Pause / resume | Esc (or the on-screen **II** button) | Esc also closes the "START OVER?" confirm |
| Mute | M | |
| Challenges panel | C (or tap/click the top-right of the canvas, x ≥ W−270, y ≤ 210) | |
| Advance cutscene | Space / Enter / click | The first press completes the line |
| Skip cutscene | **"SKIP SCENE >>" button only** (mouse or tap) | No key binding. The tutorial copy "HOLD TO SKIP / ENTER" is unused **(copy ≠ code)**. |
| Answer in finale | Space / J / Enter / click / tap / SWING button | |

### Touch (enabled only when `(pointer:coarse)` matches)
- **Left**: a virtual joystick, or the "Touch to move" mode (the player walks toward the finger).
- **Right**: a round **SWING** button (hold to keep swinging), a smaller cyan **DASH** button to its left (0.68× size), and a **TRIPLE T** pill above SWING. The pill appears and pulses only while the meter is full.
- **Auto-swing** is **on by default on touch** (`prefs.autoSwing = COARSE`) and off on desktop.
- Sliders persist: joystick size 96–190 px (default 128), horizontal position 3–24 vw (8), height from bottom 3–24 vh (8), swing button size 72–150 px (92). They are in Options and in Pause → CONTROLS.
- Haptics: `navigator.vibrate` on touch devices: hurt 40 ms, TUNG 25 ms, home run 120 ms, boss down 150 ms.

### Portrait and landscape
- `fitArena()` (L928): when `innerHeight > innerWidth × 1.08`, the arena becomes **540×960 portrait**; otherwise it is 960×540. The backing store scales by devicePixelRatio, from 1 to 2×.
- In portrait the HUD moves to the top ("clear of the thumbs"), the player starts at 62% height, and bosses spawn at y 240.
- The "ROTATE DEVICE" overlay is still in the HTML, but **no CSS rule shows it any more**, so it never appears. `tryLandscapeLock()` still attempts fullscreen and a landscape lock on touch devices; failures are ignored.
- The title copy says: "Portrait or landscape, both work."

---

## 3. Run structure

### 3.1 Flow
Title → WAKE UP (a confirm dialog appears if a save exists) → `prologue` → **FIRST UPGRADE** → biome 1 room 1 → … The full sequence:

**3 biomes × (3 combat rooms + 1 boss)**, then `core_intro`, **FINAL UPGRADE** and the Bubble. That is **13 encounters**, the same count as v0.2.
- After each combat room: "ROOM CLEAR" (+ "UNTOUCHED +200" if you took no damage), then a pick from **CHOOSE AN UPGRADE** (3 cards).
- After each biome boss: "BOSS DOWN", then a **BIOME CLEAR** results card (grade and stats, CONTINUE / COPY SCORE), the biome cutscene, and a **SIGNAL ROLL** (unlock 1 skill).
- Upgrade picks per full run: 1 first + 9 rooms + 1 final = **11**, plus free levels from chests.
- **Run length**: not encoded. The boss timer targets are 0:55, 1:10, 1:30 and 2:00. **(inference)** A full run probably takes about 20–30 minutes.

### 3.2 Biomes and rooms
| # | Biome | Enemy mix | Boss | statScale | sahurDrain | Track |
|---|---|---|---|---|---|---|
| 1 | HYPE CYCLE FOREST | slopling ×2, drone | echo | 1.0 | none | forest 104 BPM |
| 2 | SERVER FARM WASTES | hand ×2, drone, wraith | scraper | 1.35 | 1.3 | wastes 122 |
| 3 | BOARDROOM OF BROKEN PROMISES | yesman ×2, golem, wraith | valuation | 1.7 | 1.6 | boardroom 128 |
| core | THE CORE (white arena) | Bubble summons | bubble | none | none | core 62 |

- **Enemies per room** = `5 + 2·biome + room`, giving 5–11 (63 per run), ×1.5 under TRENDING. They spawn from a random edge after a 0.7 s "!" telegraph, 0.55–1.05 s apart.
- Enemy HP = base × statScale × difficulty `enemyHp`. Contact damage = base × √statScale.

### 3.3 Room modifiers (`COPY.modifiers`, `pickModifier` L1998)
Every room **except biome 1 room 1** rolls one modifier. The same modifier never comes twice in a row. A card is shown for 3.2 s; after that the name stays under the score.

| Modifier | On-screen line | What the code actually does |
|---|---|---|
| ALGORITHM BOOST | "The feed likes you today. Aura doubles." | Kills drop 2× aura orbs |
| RATIO'D | "Everyone showed up, and faster. Aura pays more." | Enemy speed ×1.22; aura pickups ×1.5 |
| GOLDEN HOUR | "Everything shiny is about to be hit." | Elite chance ×4 |
| BEAT DROP | "On the beat, it counts twice." | **No effect in code** **(copy ≠ code)** |
| LAG SPIKE | "Slow enemies. Sturdy enemies. Sorry." | Speed ×0.72, HP ×1.4 |
| TRENDING | "More of them. More score. Same you." | Enemy count ×1.5. The "score x1.5" is **not implemented**. |
| SHADOWBANNED | "Nobody can see you. Stay near the log." | Dark vignette; light (radius 90–260) centred between you and Sahur |
| PATCH NOTES | "Minor fixes. One upgrade, free." | Opens a free GOLD chest 1.4 s in |
| TOUCH GRASS | "Kills drop little green sprouts. Eat one." | Every 5th kill drops a rice box |
| SPONSORED | "An ad bubble floats by. Pop it for loot." | **Excluded from the pool; never rolls** |

So **9 of the 10 modifiers can roll, and 8 do something**.

### 3.4 Elites, chests and drops
- **Elite chance** per spawned enemy (`spawnEnemyAt`, L2027): `4.5% × difficulty.elite × (GOLDEN HOUR ? 4 : 1) × (biome ≥ 2 ? 1.2 : 1)`. Never during a boss fight. The tier roll is **Rainbow 6%, Diamond 24%, Gold 70%**.
- Elite stats: HP ×2.6 / ×3.4 / ×4.5, radius +4, damage ×1.15. Elites have a crown, a coloured ring and an HP sliver; Rainbow cycles its hue.
- **Chest** (`openChest`): Gold and Diamond give **+1 level to a random upgradable skill**, Rainbow gives +2. With nothing left to upgrade, the chest gives +500 score. Toasts: "GOLD CHEST. Shiny. Take it." / "DIAMOND CHEST. Heavier than it looks." / "RAINBOW CHEST. Everyone saw that."
- **Aura orbs** (cyan diamonds): 1–2 per kill (45% chance of the 2nd), 10 per elite, 2 per home-run victim. Each orb gives aura, +5 score and TRIPLE T charge. Magnet radius 150 px (×Aura Farmer). Everything vacuums in on room clear. Pickup pitch rises.
- **Rice box**: 4.5% per kill (+8% when you are under 40% HP). **Heals 14 HP.**
- **Snack** (boss fights only): 22% per summoned-enemy kill. Heals Sahur 30% of his max HP.

### 3.5 Bosses (`BOSSES` L529; HP is **not** scaled by difficulty)
| Boss | HP | Pattern cycle (fixed order) | patCD | Timer target | Gimmick |
|---|---|---|---|---|---|
| ECHO, THE ENGAGEMENT WRAITH | 320 | burst (10 radial) → summon → dash 90 px → **snipe** | 2.6 s | 0:55 | After-images |
| THE SCRAPER | 480 | spread (3) → **snipe** → summon → offbeat (16 radial + banner "...tung. tung... tung?  WRONG.") | 2.4 s | 1:10 | 6 orbiting hands |
| THE VALUATION | 560 | bigburst (20 radial) → **snipe** → spread → summon | 2.2 s | 1:30 | Damageable only for 4 s after bigburst ("OVEREXTENDED - STRIKE NOW"); otherwise hits show "NOT YET". The TRIPLE T home run **pierces** this. |
| THE AI BUBBLE | 1350 | burst 14 → spread 5 → **snipe** → summon 2 → cross → spiral 18 → chase 6 | 1.45 s × 0.9 (P1) / × 0.62 (P2) | 2:00 | 3 phases, white arena |

- **Snipe (new)**: a red dashed line from the boss to **Sahur** with a 0.9 s wind-up, then 1 (Echo), 3 (Scraper and Valuation) or 4 (Bubble) bullets aimed at him. "Stand in it to block." If Sahur is down, the boss fires 3 aimed shots at the player instead.
- Contact damage: boss → player 14, boss → Sahur 12. In boss fights, enemies hurt Sahur on contact for 0.8× their damage.
- **Versus card** (`COPY.versus`): shown for 2.6 s before every boss (2.4 s for the rival). Nothing moves until it ends. The boss also waits an extra 2.4 s. Layout: "SAHUR  VS  <NAME>", a subtitle and 3 power-scaling rows:
  - Echo: "AURA: 12 vs 9000", "ORIGINAL IDEAS: 0 vs 1", "TIER: SECRET vs ???"
  - Scraper: "HANDS: 40 vs 2", "LICENSE: NONE vs WOOD", "TIER: MYTHIC vs ???"
  - Valuation: "VALUE: INFINITE vs 1 BAT", "PROFIT: NONE vs RICE", "TIER: SECRET vs ???"
  - Bubble: "HYPE: MAX vs HONEST", "INSIDE: NOTHING vs 3 TUNGS", "TIER: SECRET vs ???"
- The first boss fight shows the banner "PROTECT SAHUR - IF HE FALLS, STAND BY HIM".

**Rival cameo (L1981)**: biome 1, room 3, 2.6 s in. A green golem-type "GRR GRR PATATAM" spawns at the top of the arena: HP 260 × difficulty, r 26, speed 62, damage 14, never elite. It comes with a versus card ("AURA: 4,000 vs 9000", "MOSS: 100% vs 0%", "TIER: GOD vs ???") and a scripted exchange: "GRR GRR." / "Yes yes. Tree. I am wood too." On death it gives a **Diamond chest** and +400 score, and, being a golem, splits into 2 sloplings. The room cannot clear until it has spawned.

### 3.6 The Bubble and the finale
1. **PHASE 1 - HYPE** (100–66% HP). Summons slopling or drone at about 2.0–2.25× scale.
2. **PHASE 2 - SCALE** (below 66%). Attacks faster; summons yesman, wraith or drone. Sahur's `degrade` becomes 2.0.
3. **PHASE 3 - COLLAPSE** (below 33%). The music stops, the Bubble becomes invulnerable and stops attacking, and bullets are cleared. Sahur's TUNG stops, and **his HP drains to 0 over 6.5 s**. TRIPLE T is refused ("HE CAN'T BAT RIGHT NOW"). After **7 s** the `sacrifice` cutscene plays.
4. **Three beats (now interactive, L2643)**: the choir finale loop (40–85 s of the mp3) plays. Sahur calls "TUNG" (1.0 s in, then 0.75 s after each answer). The prompt "ANSWER HIM - SPACE" (or "- TAP") appears, and **the player's answer** produces the big TUNG, flash and shake. His calls appear on the left, your answers on the right. **Three answers pop the Bubble**, and Sahur bursts into wood and gold particles (`alive=false`). If you do not press within 5 s, the game answers for you ("never lock the ending").
5. Then come `epilogue` (with the 3-knock interaction), `epilogue_card` and the victory screen.
- **The player still cannot kill the Bubble with damage.** The last third is scripted, but the player now **performs** the finishing knocks.

---

## 4. Combat

### Player
| Stat | Base |
|---|---|
| HP | 100 + 4 per completed challenge |
| Speed | 225 px/s |
| Swing | 13 dmg, 0.38 s cooldown, **360° ring of radius 80** (plus the enemy's radius); knockback 240 |
| Crit | 0 (×2 damage) |
| i-frames after a hit | 0.7 s |
| Damage taken | `d × (1−armor) × difficulty.hurt` |

- **Dash**: 0.16 s at 780 px/s (about 125 px), cooldown 0.85 s (×Kentongan Horn). i-frames last dash + 0.12 s = **0.28 s**. It goes in the movement direction, or the facing direction if you are standing still.
- **Hold to swing**: holding Space, J or SWING queues a swing every frame.
- **Auto-swing** (Options): when an enemy is within reach + 18 px, it swings **only on a beat line** (|offset| < 0.045 s), or at any time if no music is playing. Auto-swings get half the on-beat bonus (×1.15).

### On-beat mechanics: beat timing matters in v3
- `Music.beat()` (L1071) works out the beat phase the player is hearing, with output-latency compensation.
- **On-beat swing**: within **±0.11 s** of a beat line it deals **×1.3 damage** (×1.15 for auto-swing), plays a higher tone, shows "ON BEAT" and doubles the TRIPLE T charge from that hit. The HUD has a **BEAT** light next to HP that pulses on every beat.
- On-beat swings count toward the challenge "20 swings on the beat", the Hall entry METRONOME (25) and the grade (on-beat %).
- **Sahur's TUNG waits for the next beat line** once its cooldown ends (at most 1.1 s), so it lands on the music.
- Off-beat swings still do full base damage. The rhythm is a bonus, not a gate.

### Sahur's TUNG and Sahur's health
- TUNG: 26 damage in **radius 135** (×Wider Bat), knockback 420, "TUNG!" text, shake 9, hit-stop 0.06 s. It starts Borrowed Beat if you own it.
- Cooldown = `max(2.2, (3.5 + 0.8·biome) × cdMult …)`, which gives about 3.5 / 4.3 / 5.1 s in biomes 1–3 and about 9.4 s (P1) / 14.8 s (P2) in the Bubble fight. These are unchanged from v0.2. The first TUNG comes 2.5 s in.
- **Sahur HP**: 120 × difficulty `sahurHp`. He takes damage **only in boss fights** and refills between them. He regenerates **5 HP/s after 3 s untouched** (×Sahur Snack).
- At 0 HP he shows "SAHUR IS DOWN" and is never killed. **Stand within 64 px for 1.4 s** ("STAND BY HIM" → "HELPING...") and he gets up at 60% HP; otherwise he gets up on his own after 10 s at 35%. While he is down: no TUNG and no TRIPLE T.

### Combo counter (`COPY.combo`, `addCombo` L2215)
Every damaging hit adds +1; the combo resets after **2.6 s** without a hit. It is drawn as "x<n>" (Press Start 2P) at the right, with a tier label and a draining bar. The hit tone rises a semitone per hit (up to 12).
| Hits | Label |
|---|---|
| 3 | TUNG TUNG TUNG |
| 6 | SIX TUNG. NO NOTES |
| 9 | SAHUUUR |
| 15 | BRAINROT GOD |
| 25 | TIER: SECRET |
| 40 | TIER: ??? |
| 60 | SAHUR SOLOS |
| 99 | UNPRICED |

**Score multiplier** = `1 + min(combo, 60)/30`, up to **×3**.

### TRIPLE T ultimate (`startTripleT` / `tickUlt`, L2595–2638)
- **Charge** (meter 0→1, three HUD segments "like three knocks"):
  - +0.011 per hit (×2 on-beat)
  - +0.022 per kill, +0.12 per elite kill
  - +0.004 per aura orb
  - all × Pinch Hitter (1 + 0.35·level)
- **Use**: E, or the TRIPLE T touch button, when full. It cannot be used while Sahur is down or during the collapse.
- **Sequence (2.7 s)**:
  - The world pauses, letterbox bars appear, a "LIVE" tag and "PINCH HITTER - TRIPLE T" show, and a random announcer caption plays (e.g. "NOW BATTING... TRIPLE T.").
  - Sahur walks up in front of you and knocks 3 TUNGs at 0.55, 0.9 and 1.25 s. These are fixed times, not tied to the music.
  - At 1.7 s comes the **HOME RUN**: every enemy on screen is launched off-screen (each counts as a kill, +40 score, +2 orbs; elites still drop chests), all bullets and snipes are cleared, and the boss takes **max(90, 17% of max HP)** piercing damage. Flash 0.85, shake 16, hit-stop 0.18 s.
  - Combo +(launched + 3). A second caption plays (e.g. "That ball has left the city.").
- **The player is invulnerable during it** (`damagePlayer` returns while `state.ult` is set).

### Juice parameters
| Effect | Value |
|---|---|
| Hit-stop (`freeze`) | hit 0.04 s, crit 0.07 s, boss hit 0.03 s, kill 0.05 s, elite kill 0.11 s, TUNG 0.06 s, room clear 0.12 s, home run 0.18 s, boss down 0.30 s. Disabled under reduced motion. |
| Last-kill slow-mo | On room clear: 0.55 s at 0.35× speed |
| Screen shake | Hit 5, TUNG 9, boss down 14, home run 16, finale answer 18 + 6n. **Capped at 14 px**, decaying ×0.88 per frame. With reduced motion or "Screen shake: Off" it is capped at **0.8 px**. |
| Flash | Boss down 0.6, home run 0.85, finale 0.9. Capped at 0.25 under reduced motion. |
| Squash | Player: 1.18/0.86 per swing. Enemies: 1.28/0.78 on hit, plus a spawn pop-in over 0.18 s. |
| Knockback | Swing 240, TUNG 420, horn 300, FIFTH TUNG 380, bat 200 (golems take ÷2.2). It decays to 0.3% per second. |
| Caps | Particles 320 (150 on touch), texts 26, orbs 90 |

---

## 5. Progression

### Skills (`SKILLS`, 17 in total; 11 from v0.2 and 6 new)
| Skill | Family | Rarity | Max | Effect per level *l* | Start |
|---|---|---|---|---|---|
| Louder Voice | SIGNAL | common | 4 | Swing dmg +20%·l | unlocked |
| Quick Wit | SIGNAL | common | 4 | Swing cooldown −12%·l (floor 0.42×) | unlocked |
| Sharp Take | SIGNAL | rare | 3 | Crit +12%·l | unlocked |
| Touch Grass | GROUNDING | uncommon | 3 | Max HP +18·l | unlocked |
| Good Shoes | GROUNDING | rare | 3 | Speed +8%·l | unlocked |
| Thick Skin | GROUNDING | rare | 3 | Damage taken −8%·l | unlocked |
| Mixtape '07 | NOSTALGIA | epic | 3 | Hits on non-boss enemies heal *l* HP | unlocked |
| Second Wind | NOSTALGIA | legendary | 2 | Revive *l* times at 50% HP ("SECOND WIND") | **locked** |
| Wider Bat | CHAOS | uncommon | 3 | TUNG radius +15%·l | unlocked |
| Faster Rhythm | CHAOS | epic | 3 | TUNG cooldown −10%·l (floor 0.55×). **Now costs Sahur max HP −12%·l** (floor 0.6×). | unlocked |
| Borrowed Beat | CHAOS | legendary | 2 | After each TUNG, your damage +35%·l for 3 s | **locked** |
| **Boomerang Bat** | CHAOS | rare | 3 | Every 3rd swing throws a returning bat (520 px/s, 0.9 s), dealing (60+30·l)% damage | unlocked |
| **Kentongan Horn** | SIGNAL | rare | 3 | Dash shockwave, radius 110+30·l: 0.9 s stun and 6·l damage; dash cooldown −10%·l | unlocked |
| **Pinch Hitter** | NOSTALGIA | epic | 3 | TRIPLE T charges +35%·l faster | **locked** |
| **Rice Box** | GROUNDING | common | 4 | Heal 8·l HP on room clear | unlocked |
| **Sahur Snack** | NOSTALGIA | common | 3 | Sahur HP +25%·l; regen ×(1+0.5·l) | unlocked |
| **Aura Farmer** | SIGNAL | rare | 3 | On-beat hits drop *l* extra orbs per enemy; magnet +25%·l | unlocked |

So **14 skills start unlocked and 3 are locked**. The FIRST UPGRADE subtitle still says "Nine core skills are already in your pool." **(copy ≠ code)**. The old per-skill "unlock" challenge text has been removed.

### Evolutions: BRAINROT GOD (`EVOS`, L859)
**Rule**: when both recipe skills are at **level 2 or higher**, the evolution card **always appears** in the next upgrade pick. It has a rainbow border and replaces the 3rd card. Each evolution can be taken once.
| Evolution | Recipe | Code effect |
|---|---|---|
| THREE-PEAT | Wider Bat + Faster Rhythm | Each TUNG is followed by 2 echo slams 0.2 s apart at 0.6× damage ("TUNG TUNG!", "TUNG TUNG TUNG!") |
| FIFTH TUNG | Louder Voice + Quick Wit | Every 5th swing releases a shockwave: radius 170, 1.5× swing damage, knockback 380 |
| FAMILY MEAL | Mixtape '07 + Touch Grass | Heals 30% of max HP on room clear. The description says "for you and Sahur"; the code heals only you. Sahur is full outside boss fights anyway. |
| PERFECT PITCH | Sharp Take + Borrowed Beat | On-beat swings always crit (×2). Needs locked Borrowed Beat at Lv 2. |

### Upgrade offer rules
- **CHOOSE AN UPGRADE / FIRST / FINAL**: up to 3 distinct unlocked, non-maxed skills. The weight is `rarityScore + currentLevel` (common 1 … legendary 5), so rare skills and skills you already own appear more often. Each card shows rarity, family, name, the next-level effect and "Level x/max -> x+1/max".
- **SIGNAL ROLL** (after each biome boss): animates for 1.5 s, then reveals "<RARITY> UNLOCK" and "Claim skill". The weight is `max(1, 7 − rarityScore)`. There are exactly 3 locked skills and 3 rolls, so **every skill is unlocked by the Bubble**.
- Chests give free levels (section 3.4). Every pick re-applies the loadout and keeps your HP %.

### Challenges (`CHALLENGE_ROWS`, 13 in total; **each one completed gives +4 max HP for the run**)
First room · 4 rooms · Echo down · Echo speed (≤55 s) · Scraper down · Scraper speed (≤70 s) · Valuation down · Valuation clean (≤90 s, no revive) · **Boss above 40 HP** · **Boss, Sahur never down** (new) · **20 swings on the beat** (new) · 3 speed bosses · Bubble entry (5+ challenges done on reaching the Bubble).

Toast: "CHALLENGE COMPLETE  +4 MAX HP". Toggle: "C CHALLENGES n/13". The panel also shows "SKILLS n/17 UNLOCKED".

### Score and aura
| Source | Points (before ×combo ×difficulty) |
|---|---|
| Kill | 10 + 4·biome (elite 120) |
| Aura orb | 5 per orb value |
| Room clear | 150 + 50·biome, +200 if untouched |
| Boss down | 1500 + 500·biome, +1000 if under the timer |
| Rival | +400 |
| Home-run victim | 40 |
| Chest with nothing to upgrade | 500 |

The HUD shows the score and "AURA n" at the top left. Aura is a counter with no spending use; it feeds the score, the TRIPLE T charge, the grade stat and the Hall entry AURA FARMER (500).

### Grades (`gradeRun`, L2502)
Points:
- best combo ≥40 → 3, ≥20 → 2, ≥10 → 1
- on-beat % ≥35% → 3, ≥20% → 2, ≥10% → 1
- Sahur never down this run → 1
- last boss under its timer → 2
- HP above 50% → 1
- at least 1 elite killed → 1
- TRIPLE T used → 1

The maximum is 12.

| Points | Grade | Name |
|---|---|---|
| ≥11 | S+ | SAHUR SOLOS (rainbow) |
| ≥9 | S | SECRET TIER |
| ≥7 | A | BRAINROT GOD |
| ≥5 | B | RESPECTABLE WOOD |
| ≥3 | C | BASIC |
| <3 | D | STILL LOADING |

The grade is shown on **BIOME CLEAR**, **ABSORBED** and **WE WON.** screens, with stats TUNGS (kills), BEST COMBO, ON-BEAT %, AURA, SAHUR SAVES and TIME, the score, and "NEW BEST" when it applies. **COPY SCORE** copies: `SAHUR PROTOCOL - Biome {n} - Grade {g} - {tungs} TUNGs - best combo {c} - tung tung tung`.

### Hall of TUNG (12 permanent achievements; `sahurProtocolHallV1`)
PINCH HITTER (win a boss fight at ≤10 HP) · METRONOME (25 on-beat swings) · THREE UP, THREE DOWN (TRIPLE T launches 3+) · NOBODY LEFT BEHIND (boss with Sahur never down) · UNTOUCHED (no-damage room) · FIRST ANSWER (finish) · SPICY WOOD (finish on SPICY) · UNPRICED (99 combo) · AURA FARMER (500 aura in a run) · NOW IT'S PERSONAL (kill a Rainbow elite) · BRAINROT GOD (take an evolution) · OVERBOOKED (3 rooms in a row under 20 s each).

It stores `{ids[], bestScore, bestCombo, runs, wins}`. The title shows "DIFFICULTY: X | BEST n | HALL OF TUNG n/12", and the toast says "HALL OF TUNG".

### Persistence (localStorage)
| Key | Contents |
|---|---|
| `sahurProtocolRunV1` | Checkpoint: biome, room, skillLevels, unlockedSkills, **evolutions, score, aura, bestCombo**, challenges, roomsCleared, speedBosses, HP |
| `sahurProtocolControlsV1` | Touch layout and move mode |
| `sahurProtocolAudioV1` (new) | `{muted, volume}`; **audio now persists** |
| `sahurProtocolPrefsV1` (new) | `{diff, autoSwing, shake, skipSeen (unused), tut{}}`; tutorial chips are shown once ever |
| `sahurProtocolHallV1` (new) | Hall of TUNG |

Saves happen at room start, challenge, pick, roll, biome change, final boss, pause and main menu. Victory deletes the run save; game over keeps it.

---

## 6. Difficulty and accessibility

### CHILL / NORMAL / SPICY (`DIFFS` L481; Options; saved; the default is NORMAL)
| Multiplier | CHILL | NORMAL | SPICY |
|---|---|---|---|
| Damage you take | ×0.5 | ×1 | ×1.35 |
| Regular enemy, elite and rival HP (not bosses) | ×0.85 | ×1 | ×1.35 |
| Sahur max HP | ×1.5 | ×1 | ×1 |
| Score | ×0.7 | ×1 | ×1.6 |
| Elite chance | ×0.6 | ×1 | ×1.8 |

On-screen lines:
- CHILL: "Slower enemies. Sahur gets up faster. Vibes."
- NORMAL: "The intended walk. Three knocks, no mercy."
- SPICY: "Faster enemies, no free heals. Sahur says good luck."

**(copy ≠ code)** No difficulty changes enemy speed, Sahur's get-up time or heal drops. Finishing on SPICY awards SPICY WOOD. Difficulty can be changed mid-run, and it re-applies at once.

### Accessibility and assists
- **Screen shake: On/Off** toggle (Off caps shake at 0.8 px).
- **Reduced motion** (OS setting) does all of these:
  - turns off CSS animations and transitions and the cutscene pan, zoom and particles
  - caps shake at 0.8 px and flash at 0.25
  - turns off hit-stop and cutscene jolt
  - reduces the memory white-cuts to 30%
- Auto-swing assist, CHILL mode, skippable cutscenes and self-paced dialogue.
- Mute (M or Options) and a volume slider (0–100, default 70), both now saved.
- One-time context tutorial chips (MOVE, SWING, SWING ON THE BEAT, DASH THROUGH BULLETS, TRIPLE T READY, HELP SAHUR UP), each with its key.
- The game **auto-pauses when the tab is hidden**.
- Readable Verdana body text, high-contrast panels, a confirm before erasing a save, and a large touch layout.
- **Still missing**: key remapping, colour-blind options, a text-size setting, gamepad support.

---

## 7. Screens and on-screen labels
- **Title**: SAHUR PROTOCOL / TUNG TUNG TUNG; WAKE UP, CONTINUE (only with a save), How to play, Story, Options. Then the difficulty / best / Hall line and the control blurb "WASD / Arrows move | SPACE / J swing (hold) | SHIFT / K dash | E TRIPLE T | M mute".
- **How to play**: Move, Swing, Dash ("You can't be hit mid-dash"), TRIPLE T, Touch, "On the beat" (+30%, BEAT light), "Protect him", "Challenges: +4 max HP".
- **Story**: premise plus the kentongan note.
- **Options**: Difficulty CHILL/NORMAL/SPICY with its line; Auto-swing: On/Off; Screen shake: On/Off; Music and sound: On/Off; Volume; Mobile controls (Joystick / Touch to move and 4 sliders).
- **START OVER?** confirm: "Starting a new run erases your checkpoint in <BIOME>, room n. This cannot be undone." Buttons: ERASE AND WAKE UP / KEEP MY RUN.
- **Cutscene**: art panel, speaker, typewriter text, "SPACE / CLICK >", "SKIP SCENE >>".
- **Upgrade overlay**: FIRST UPGRADE / CHOOSE AN UPGRADE / FINAL UPGRADE / SIGNAL ROLL; card types include the BRAINROT GOD evolution card, "No upgrades available" and "All skills unlocked".
- **Pause**: PAUSED; "Progress is saved at room, boss, and reward checkpoints."; CONTROLS, RESUME, MAIN MENU, RESTART RUN (with confirm).
- **Result screens** (all with grade, stats and COPY SCORE):
  - BIOME CLEAR → CONTINUE
  - ABSORBED: "The feed closes over you, warm and easy. / Far off, a wooden knock: TUNG. Get up. / Your last checkpoint is still intact." → RETRY CHECKPOINT or WAKE UP AGAIN
  - WE WON. → AGAIN - FOR HIM
- **HUD**:
  - Bottom-left (top in portrait): HP bar, BEAT light, Sahur bar (boss fights only; "SAHUR DOWN - STAND BY HIM"), and the TRIPLE T 3-segment meter ("TRIPLE T READY - PRESS E" / "- TAP IT").
  - Top-left: II, score, AURA and the modifier name.
  - Right: combo.
  - Top-right: challenge toast or panel.
  - Bottom-right: biome | ROOM n/3 (or THE CORE).
  - Boss fights: boss bar plus "BOSS TIMER m:ss / m:ss".

---

## 8. Tech

| Aspect | Fact |
|---|---|
| File | `Sahur_Protocol.html`: **1,174,289 bytes, 3,671 lines** (v0.2: 1,083,785 / 2,143). About 191 KB without the base64 lines. Still one file, vanilla JS (`"use strict"`), no build, no classes. |
| Rendering | Canvas 2D at a logical 960×540 or **540×960**, with a backing store at DPR 1–2×. DOM overlays for menus. Cutscene canvas 960×600. CRT scanline overlay. Only Sahur and the 6 cutscene JPEGs are bitmaps; `memory_street`, `memory_window` and `void` are procedural. |
| Loop | rAF, dt capped at 0.033 s; hit-stop and slow-mo are applied in `loop()`. |
| Audio | Web Audio synth (`tone`, `tung`, new `knock`). `Music`: 16-step sequencer with 6 tracks (forest 104, wastes 122, boardroom 128, boss 142, core 62, dawn 76 BPM). New `Music.beat()` gives the latency-compensated beat phase. Per-speaker typewriter blips. The only audio file is `TUNG TUNG TUNG SAHUUUUUUR CHOIR (1).mp3` (1,307,525 bytes): the menu loop plays 0–85 s, the finale loop 40–85 s, and it **fades out over 3.5 s into the dawn track** in the epilogue (in v0.2 the dawn track never played). |
| Fonts | Google Fonts "Press Start 2P" only; Pixelify Sans is no longer loaded. Body text is Verdana. |
| Deployment | Unchanged. `index.html` redirects through a meta refresh and `location.replace`. `vercel.json` v2: `cleanUrls`, `nosniff`, a 1-year immutable cache on `*.mp3`, and a rewrite of `/` to `/Sahur_Protocol.html`. |
| Mobile | Coarse-pointer touch UI, portrait/landscape auto layout, safe-area insets, `vibrate` haptics, a lower particle cap, attempted landscape lock, auto-pause on hidden tab. |
| 3D prototype (separate) | `game3d/Sahur_Protocol.3d-prototype.html` (2,015,744 bytes): the Bubble fight rendered in three.js / react-three-fiber with the promo film's models, a 2.5D camera, and 3D high / low / 2D quality with an FPS watchdog. It is **not** part of the shipped `Sahur_Protocol.html` (no `R3D` markers there). |

---

## 9. What changed from v0.2

| Area | v0.2 | v3 |
|---|---|---|
| Rhythm | No beat mechanic | On-beat swings ±0.11 s for ×1.3; TUNG snaps to the beat; BEAT light; on-beat challenge, grade and Hall entry |
| Player verbs | Move, tap-swing | + **dash** (i-frames), **hold-to-swing**, **TRIPLE T** ultimate, optional auto-swing |
| Sahur | No HP, invulnerable | 120 HP in boss fights, knock-down and help-up, regen, snipes aimed at him, barks |
| Finale | Non-interactive 3 TUNGs | Player **answers** 3 calls; 3-knock epilogue line; Epilogue I card and sequel stinger |
| Feel | Shake only | Hit-stop, knockback, squash, capped shake, last-kill slow-mo, haptics, combo pitch |
| Scoring | No score | Score, aura, combo ×3, grades D–S+, results screens, COPY SCORE, best score |
| Content | 11 skills, 0 evolutions | 17 skills, 4 BRAINROT GOD evolutions |
| Rooms | Plain | 10 modifiers (9 roll), elites with chests, rice and snack drops, rival cameo, versus cards |
| Bosses | 3-pattern cycles | Every boss gains **snipe**; versus cards; protect-Sahur banner |
| Challenges | 11, no reward | 13, **+4 max HP each** |
| Meta | None | Hall of TUNG (12), difficulty modes, persistent prefs and audio |
| Cutscenes | 7 scenes, not skippable | 8 scenes / 53 lines, **SKIP SCENE**, memory art, dynamic line |
| Save safety | WAKE UP wiped the save silently | "START OVER?" confirm |
| Layout | Landscape only; ROTATE DEVICE overlay | Portrait 540×960 plus landscape; overlay retired |
| Fixed quirks | Dawn track never played; "It costs him" had no cost; unused POWERUPS; ROOM 4/3 | Dawn plays; Faster Rhythm costs Sahur HP; POWERUPS removed; Rice Box makes `roomHeal` real. Bubble label is now dark on white. |

**Contradicts the v0.2 sheet**: "not a rhythm game / damage never on beat" (now partly false); "Sahur has no HP" (false); "beats finale has no input" (false); "no score" (false); "challenges give no reward" (false); "no difficulty settings" (false); "mute/volume don't persist" (false); "no confirm before overwrite" (false); "cutscenes not skippable" (false); "portrait shows ROTATE DEVICE" (false).

---

## 10. Selling points and quotable strings

### Ten verifiable selling points
1. **TRIPLE T**: a baseball-broadcast ultimate where Sahur walks to the plate, knocks three TUNGs and home-runs every enemy off-screen.
2. **Answer the call**: the finale is played, not watched. Sahur calls three times and you answer each to pop the AI Bubble.
3. **Swing on his beat**: on-beat hits deal +30%, and the companion's slam snaps to the music.
4. **Protect the log**: in boss fights Sahur can be knocked down, and you pull him back up by standing beside him.
5. **Chant combo counter**: from "TUNG TUNG TUNG" up to "UNPRICED" at 99, with a score multiplier up to ×3.
6. **17 skills and 4 BRAINROT GOD evolutions** with visible two-skill recipes.
7. **10 meme room modifiers** (RATIO'D, SHADOWBANNED, LAG SPIKE…) and Gold/Diamond/Rainbow elites that drop chests.
8. **Grades from D "STILL LOADING" to S+ "SAHUR SOLOS"**, with a shareable score line and a 12-entry Hall of TUNG.
9. **CHILL / NORMAL / SPICY**, auto-swing, a shake toggle, reduced-motion support and skippable cutscenes.
10. **One HTML file, no install**, in portrait or landscape on a phone, with hand-made synth music plus a choir finale.

### Quotable on-screen strings (exact)
- **Combo**: "TUNG TUNG TUNG", "SIX TUNG. NO NOTES", "SAHUUUR", "BRAINROT GOD", "TIER: SECRET", "TIER: ???", "SAHUR SOLOS", "UNPRICED"
- **Grades**: "STILL LOADING", "BASIC", "RESPECTABLE WOOD", "BRAINROT GOD", "SECRET TIER", "SAHUR SOLOS"
- **Banners and toasts**: "HOME RUN!", "PINCH HITTER - TRIPLE T", "LIVE", "BOSS DOWN", "ROOM CLEAR - UNTOUCHED +200", "SAHUR IS DOWN", "STAND BY HIM", "PROTECT SAHUR - IF HE FALLS, STAND BY HIM", "OVEREXTENDED - STRIKE NOW", "NOT YET", "...tung. tung... tung?  WRONG.", "PHASE 1 - HYPE", "PHASE 2 - SCALE", "PHASE 3 - COLLAPSE", "ANSWER HIM - SPACE", "HE CAN'T BAT RIGHT NOW", "PIVOT!", "ON BEAT", "SECOND WIND", "GOLD CHEST. Shiny. Take it.", "RAINBOW CHEST. Everyone saw that."
- **Announcer**: "NOW BATTING... TRIPLE T.", "Down 0-2. Send in the log.", "That ball has left the city.", "Retired side, and a few retired postcodes.", "Bottom of the ninth. Top of the market."
- **Sahur barks**: "They call me Triple T. Watch.", "You swing like you scroll. Tiny.", "It copy everything. Be original.", "Little sleepy. Help me up?", "Is only moss. Takes time."
- **Versus rows**: "AURA: 12 vs 9000", "VALUE: INFINITE vs 1 BAT", "INSIDE: NOTHING vs 3 TUNGS"
- **End and teaser**: "WE WON." / "BUT AT WHAT COST.", "ABSORBED", "EPILOGUE I / THE FIRST ANSWER", "The Bubble had siblings. They did not get the memo.", "TO BE CONTINUED", "AGAIN - FOR HIM"
