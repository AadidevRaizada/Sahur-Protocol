# Sahur Protocol v3: screenshots

Captured from the unmodified `Sahur_Protocol.html` (v3) and `game3d/Sahur_Protocol.3d-prototype.html` by
`gamedesign/scripts/capture-v3.js` (`node gamedesign/scripts/capture-v3.js [desktop|mobile|3d|gameover|all]`).
Desktop shots are 1920x1080 (1280x720 at DSF 1.5). Mobile shots are 780x1688 (390x844 portrait, DSF 2, touch).
Difficulty for every run: NORMAL.

**How the run was driven.** Menus, cards, cutscenes (Space), TRIPLE T (E / tap), the SKIP button, the finale
answers and the touch stick all use real input. A small in-page autopilot steers with the game's joystick
vector and swings or dashes. Screenshot-only assists, none of which add HUD text:
- Hidden armor (0.75) and a slow HP top-up keep the player alive.
- Rooms and bosses are fast-forwarded by setting enemy or boss HP to 0. The game's own room-clear,
  boss-down, biome-clear and cutscene flow then runs.
- The AI Bubble's HP is set to 60% and then 30%, so the game's own phase checks fire.
- Before Louder Voice and Quick Wit reached Lv.2, the run raised them to Lv.2 so that the game offered
  the FIFTH TUNG evolution. Card offers are random, so the evolution never came up naturally.
- On mobile, the TRIPLE T meter was set to full for 18e and 18f. On desktop, 11a to 11d used a meter
  the run had filled naturally.
- Freeze-frames set `mode='pause'` without opening the pause overlay. The DOM TRIPLE T button only shows
  while `mode` is `play`, so 18e is a normal screenshot.

The run was fast-forwarded, so the result stats and grades (S, S+) are real game output but are higher
than in normal play: the run was short and the player never died.

## Menus
| File | On screen |
|---|---|
| v3-01-title.png | Title after one finished run: SAHUR PROTOCOL, TUNG TUNG TUNG, WAKE UP, "DIFFICULTY: NORMAL \| BEST 18,022 \| HALL OF TUNG 6/12", How to play / Story / Options, control legend |
| v3-01-title-fresh.png | Title on first launch: "DIFFICULTY: NORMAL \| HALL OF TUNG 0/12", WAKE UP, control legend |
| v3-02-difficulty-options.png | OPTIONS pane over the title: Difficulty CHILL / NORMAL (selected) / SPICY, "The intended walk. Three knocks, no mercy.", Auto-swing: Off, Screen shake: On, Music and sound: On, Volume slider, Mobile controls |

## Prologue and cutscenes
| File | On screen |
|---|---|
| v3-03a-prologue-eyes.png | Prologue: two glowing eyes at a dark window; "The screen dies. Darkness. Two round eyes at the glass, level with yours. They do not blink."; SKIP SCENE >> |
| v3-03b-prologue-reveal.png | Prologue reveal art: Sahur with bat in the shattered window, neon city behind; "TUNG. The window goes. A wooden thing stands in your living room, bat in hand, neon on its shoulders." |
| v3-03c-prologue-sahur.png | Same art, speaker SAHUR: "Whole city sleeping. We go pop it." |
| v3-03d-skip-button.png | Prologue first line typing ("3:07 AM. The feed scrolls itself, thumb or no t...") with the SKIP SCENE >> button (used to skip the prologue in the next run) |
| v3-20a-cutscene-campfire.png | Biome 1 end, campfire in the purple forest. SAHUR: "Lesson. TUNG, TUNG, TUNG. Always three. Two is rumor. Three is a call." |
| v3-20b-cutscene-memory-lane.png | Biome 2 end, sepia MEMORY of the lantern lane: "Years ago, this lane: lanterns, hollow drums, a light coming on behind every call." |
| v3-20c-cutscene-memory-window.png | Biome 3 end, sepia MEMORY of a lit window in the rain: "A lit window, years ago. A small kid waving down at the lane. First to answer, every night." |
| v3-14a-core-intro.png | Core intro: the smiling AI Bubble over Sahur and the player. THE BUBBLE: "thrilled to announce - this changes everything - at scale - we believe - seamless - delighted - ..." |

## Combat (biomes)
| File | On screen |
|---|---|
| v3-04-biome1-combat.png | HYPE CYCLE FOREST, ROOM 3/3, GOLDEN HOUR. The mossy rival GRR GRR PATATAM ("GRR GRR."), Sahur's TUNG! with two rings, a Diamond slopling, drones, a dash trail, "On beat." bark, combo x13 SAHUUUR |
| v3-05-biome2-combat.png | SERVER FARM WASTES, ROOM 3/3, RATIO'D. Hands, wraiths and drones, a Diamond drone elite (top), TUNG! ring, damage numbers, combo x7 SIX TUNG. NO NOTES, TRIPLE T READY - PRESS E, CHALLENGE COMPLETE +4 MAX HP / 4 rooms |
| v3-06-biome3-combat.png | BOARDROOM OF BROKEN PROMISES, ROOM 3/3, RATIO'D. Yes-men, golem split "PIVOT!", TUNG! ring, combo x65 SAHUR SOLOS, CHALLENGE COMPLETE / 20 swings on the beat |
| v3-07a-elite.png | HYPE CYCLE FOREST ROOM 3/3, GOLDEN HOUR: a crowned Diamond slopling elite next to GRR GRR PATATAM, with drones around |
| v3-07b-chest.png | Elite reward: "DIAMOND CHEST. Heavier than it looks. + Boomerang Bat" and a second "DIAMOND CHEST ... + Good Shoes" (from PATATAM's defeat), combo x25 TIER: SECRET, bark "They call me Triple T. Watch." |
| v3-08a-modifier.png | Room modifier card ALGORITHM BOOST, "The feed likes you today. Aura doubles." (HYPE CYCLE FOREST ROOM 2/3), CHALLENGE COMPLETE / First room |
| v3-08b-modifier.png | Room modifier card TRENDING, "More of them. More score. Same you." (SERVER FARM WASTES ROOM 1/3), bark "Wires everywhere. Watch feet." |
| v3-16c-hall-of-tung-toast.png | In-game HALL OF TUNG toast "UNTOUCHED" (achievement unlock), ALGORITHM BOOST room, TUNG! ring, dash trail |

## Upgrades
| File | On screen |
|---|---|
| v3-09a-first-upgrade.png | FIRST UPGRADE: Wider Bat (UNCOMMON CHAOS), Faster Rhythm (EPIC CHAOS), Boomerang Bat (RARE CHAOS) |
| v3-09b-upgrade-choice.png | CHOOSE AN UPGRADE: Boomerang Bat 2/3 -> 3/3, Kentongan Horn 1/3 -> 2/3, Sahur Snack 0/3 -> 1/3 |
| v3-09c-signal-roll.png | SIGNAL ROLL after the boss: EPIC UNLOCK NOSTALGIA Pinch Hitter, "TRIPLE T charges 35% faster...", Claim skill |
| v3-10-evolution.png | CHOOSE AN UPGRADE with a BRAINROT GOD / EVOLUTION card FIFTH TUNG ("Every 5th swing sends out a shockwave. It was always five.", Louder Voice + Quick Wit), plus Wider Bat and Aura Farmer (recipe levels set by the assist above) |

## TRIPLE T ultimate (hero shots, SERVER FARM WASTES room 3)
| File | On screen |
|---|---|
| v3-11a-ready.png | TRIPLE T meter full: "TRIPLE T READY - PRESS E", a Rainbow drone elite at the top, combo x8 |
| v3-11b-walkup.png | Broadcast frame: LIVE, "PINCH HITTER - TRIPLE T", letterbox bars, spotlight on Sahur stepping up, first "TUNG", caption "NOW BATTING... TRIPLE T." |
| v3-11c-three-tungs.png | Same broadcast with "TUNG TUNG TUNG" across the screen |
| v3-11d-home-run.png | "HOME RUN!": enemies launched spinning with x-x faces, "RAINBOW CHEST. Everyone saw that. + Pinch Hitter + Thick Skin", combo x18 BRAINROT GOD, caption "Retired side, and a few retired postcodes." |

## Bosses
| File | On screen |
|---|---|
| v3-12a-versus-patatam.png | Versus card SAHUR VS GRR GRR PATATAM, "Mossy. Offended. Technically a tree.", AURA: 4,000 vs 9000 / MOSS: 100% vs 0% / TIER: GOD vs ??? |
| v3-12b-versus-echo.png | SAHUR VS ECHO THE ENGAGEMENT WRAITH, "Repeats you. Says it was its idea.", AURA: 12 vs 9000 / ORIGINAL IDEAS: 0 vs 1 / TIER: SECRET vs ??? |
| v3-12c-versus-scraper.png | SAHUR VS THE SCRAPER, "Took everything. Credited no one.", HANDS: 40 vs 2 / LICENSE: NONE vs WOOD / TIER: MYTHIC vs ??? |
| v3-12d-versus-valuation.png | SAHUR VS THE VALUATION, "A number with a mouth.", VALUE: INFINITE vs 1 BAT / PROFIT: NONE vs RICE / TIER: SECRET vs ??? |
| v3-12e-versus-bubble.png | SAHUR VS THE AI BUBBLE, "Seamless. At scale. Empty.", HYPE: MAX vs HONEST / INSIDE: NOTHING vs 3 TUNGS / TIER: SECRET vs ??? |
| v3-13a-boss-echo.png | ECHO, THE ENGAGEMENT WRAITH fight: ring burst of bullets, BOSS TIMER 0:14 / 0:55, SAHUR 109/120 bar, combo x9 SAHUUUR |
| v3-13b-boss-scraper.png | THE SCRAPER fight: orbiting hands and bullet ring, "...tung. tung... tung? WRONG." (off-beat attack), BOSS TIMER 0:11 / 1:10 |
| v3-13c-boss-valuation.png | THE VALUATION fight: "$33B" ticker boss with bullet ring, "OVEREXTENDED - STRIKE NOW", BOSS TIMER 0:13 / 1:30 |

## The AI Bubble and the finale
| File | On screen |
|---|---|
| v3-14b-bubble-phase1.png | THE AI BUBBLE (white arena), bullet spiral, drone and slopling adds, BOSS TIMER 0:10 / 2:00, CHALLENGE COMPLETE / 3 speed bosses, C CHALLENGES 13/13 |
| v3-14c-bubble-phase2.png | "PHASE 2 - SCALE" banner, bullet ring, boss bar about 60% |
| v3-14d-bubble-collapse.png | "PHASE 3 - COLLAPSE" banner, music stopped, Sahur's bar at 0 (he is fading) |
| v3-15a-cutscene-sacrifice.png | Sacrifice art: Sahur raising the bat while splintering into light. SAHUR: "Hey. It was a good walk." |
| v3-15b-finale-call.png | Three-TUNG finale: Sahur's first "TUNG" (left), the Bubble, "ANSWER HIM - SPACE" |
| v3-15c-finale-two-tungs.png | Two calls and two answers (TUNG TUNG on both sides); the Bubble breaking up, Sahur fading |
| v3-15d-finale-three-tungs.png | Three calls, three answers; the Bubble has popped and Sahur is gone, screen washing to white |
| v3-15e-epilogue.png | Epilogue dawn art (you and wooden Sahur on a hill above the ruined city): "Sahur sits beside you like always. Bat against the stone. He is just wood now, rough and warm in the sun." |
| v3-15f-epilogue-title.png | Title card "EPILOGUE I / THE FIRST ANSWER" |
| v3-15g-stinger-tung.png | Sequel stinger: a dark room, speaker ???: "TUNG. TUNG. TUNG." |
| v3-15h-to-be-continued.png | Stinger end card "TO BE CONTINUED" |

## Results
| File | On screen |
|---|---|
| v3-16a-biome-clear-1.png | BIOME CLEAR, grade S SECRET TIER, 6,049 NEW BEST, TUNGS 22 / BEST COMBO 25 / ON-BEAT 45% / AURA 21 / SAHUR SAVES 0 / TIME 0:46, CONTINUE, COPY SCORE |
| v3-16a-biome-clear-2.png | BIOME CLEAR, S+ SAHUR SOLOS, 10,936 NEW BEST, TUNGS 42 / BEST COMBO 25 / ON-BEAT 38% / TIME 1:19 |
| v3-16a-biome-clear-3.png | BIOME CLEAR, S+ SAHUR SOLOS, 17,984 NEW BEST, TUNGS 73 / BEST COMBO 72 / ON-BEAT 44% / TIME 2:12 |
| v3-16b-victory.png | "WE WON." / "BUT AT WHAT COST.", S+ SAHUR SOLOS, 18,022 NEW BEST, stats grid, "Somewhere, very far away... a fourth tung?", END OF EPILOGUE I, "Made with respect for the kentongan sahur tradition of Indonesia.", AGAIN - FOR HIM, COPY SCORE |
| v3-17-game-over.png | ABSORBED: "The feed closes over you, warm and easy. Far off, a wooden knock: TUNG. Get up. Your last checkpoint is still intact.", grade B RESPECTABLE WOOD, 87, TUNGS 4 / BEST COMBO 11 / ON-BEAT 38% / TIME 0:14, RETRY CHECKPOINT, COPY SCORE |

## Mobile (portrait 390x844, touch)
| File | On screen |
|---|---|
| v3-18a-mobile-title.png | Portrait title: SAHUR PROTOCOL, WAKE UP, "DIFFICULTY: NORMAL \| HALL OF TUNG 0/12", How to play / Story / Options, control legend |
| v3-18b-mobile-cutscene.png | Portrait prologue: reveal art and dialog, SAHUR: "Whole city sleeping. We go pop it.", SKIP SCENE >> |
| v3-18c-mobile-upgrade.png | Portrait FIRST UPGRADE, cards stacked: Sahur Snack, Good Shoes, Boomerang Bat |
| v3-18d-mobile-play.png | Portrait play, HUD at the top: GOLDEN HOUR, HALL OF TUNG / UNTOUCHED toast, TUNG! ring, gold drone elite, combo x3, joystick, DASH and SWING buttons |
| v3-18e-mobile-ult-ready.png | "TRIPLE T READY - TAP IT" HUD, tutorial chip "TRIPLE T READY  TAP TRIPLE T", the glowing TRIPLE T button above SWING |
| v3-18f-mobile-triple-t.png | Portrait TRIPLE T broadcast: LIVE PINCH HITTER, "TUNG TUNG TUNG", caption "NOW BATTING... TRIPLE T." |
| v3-18g-mobile-shadowbanned.png | Portrait SHADOWBANNED room (dark arena, light only around you and Sahur): TUNG! ring, dash trail, combo x16 BRAINROT GOD |

## 3D prototype (game3d, WebGL; headless Chrome on the laptop GPU through ANGLE/D3D11, `?r3d=force`)
The prototype is built on the pre-v3 game file, so its HUD has no TRIPLE T meter.

| File | On screen |
|---|---|
| v3-19a-3d-bubble.png | 3D AI Bubble (iridescent, orbiting hype words) over the tilted arena floor, 3D Sahur and player, drones, bullets with floor shadows, THE AI BUBBLE bar, BOSS TIMER 0:08 / 2:00 |
| v3-19b-3d-bubble-phase2.png | 3D phase 2: bullet stream from the Bubble, Sahur's TUNG! shock ring on the floor, SAHUR bar low (red) |
| v3-19c-3d-bubble-collapse.png | 3D phase 3: "PHASE 3 - COLLAPSE" fading, the Bubble leaking, Sahur cracked (SAHUR 0/120) |
| v3-19d-3d-finale.png | 3D three-TUNG finale after two answers: the Bubble breaking into particles, TUNG TUNG on both sides |
| v3-19e-3d-pop.png | 3D pop: three calls and three answers, burst particles, the screen washing to white |

## Not captured, or partly captured
- **Difficulty select screen**: v3 has no separate screen. Difficulty is the CHILL/NORMAL/SPICY row in Options (v3-02).
- **Hall of TUNG screen**: v3 has no dedicated screen. The Hall appears as the "HALL OF TUNG n/12" count on the title (v3-01) and as in-game unlock toasts (v3-16c, v3-18d).
- **Evolution**: reached only with the skill-level assist described above.
