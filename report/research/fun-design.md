# Sahur Protocol: Fun, Juice and "One More Run" Brief

Evidence note: web search returned mostly secondary summaries (primary GDC transcripts were not fetchable). Numbers tagged [S] come from a fetched source; [H] are standard practitioner heuristics (Vlambeer/Nuclear Throne-style) to be tuned by playtest. Nothing here is a dark pattern: no streak-loss, no energy timers, no FOMO.

## 1. Juice checklist (ranked by impact per line of code)

Sources: [Jonasson/Purho "Juice it or lose it" summary](https://rpgplayground.com/research-making-a-juicy-game/), [feedback-timing numbers](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/), [Nuclear Throne shot breakdown (Nijman)](https://infovore.org/?p=5275), [trauma-based shake](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/).

| # | Effect | Numbers | Cost |
|---|---|---|---|
| 1 | Hit-stop (freeze enemy + attacker, not particles/UI) | 50-100 ms [S]; light hit 40-60, TUNG slam/crit 90-120, boss kill 200-300 | ~5 lines |
| 2 | White flash on hit target | 50-100 ms [S] (30 too subtle, 150 blurry) | 3 lines |
| 3 | Sound layered per hit: thunk + pitch-randomised (+-8%) layer + noise tick; TUNG = bass boom + log creak | play within ~12 ms of hit [S]; combo hits climb pitch +1 semitone up to +7 | WebAudio, ~15 lines |
| 4 | Screen shake using "trauma" (add on events, decay, shake = trauma^2) | weak 2-3 px, strong 8-10 px [S]; TUNG 6-8 px / 150 ms; boss slam 10-12; cap 12 px; decay ~1.5/s | ~10 lines |
| 5 | Knockback + enemy squash/stretch | knock 80-200 px/s decaying over 150 ms; hit squash 1.3x/0.7x recover in 120 ms [H]; scale pop 0.9 to 1.0 on button feedback [S] | ~8 lines |
| 6 | Particle burst on hit/death | 20-30 per burst, speed 200-400 px/s, life 0.5-1 s [S]; on phones use 8-12 square particles, no gradients | ~15 lines |
| 7 | Player swing feel: wind-up 2-3 frames, slight lunge toward target, camera kick 2-4 px opposite aim [H] | | ~10 lines |
| 8 | Damage numbers: pop up and rise 30 px, life ~0.8 s [S 1-2 s upper bound], bigger/yellow on crit and on-beat; pool max 20 | | ~15 lines |
| 9 | Combo/streak counter with beat-bonus: size pop on increment, color shift at x5/x10/x25, resets only after 2 s idle (gentle) | | ~15 lines |
| 10 | Camera: lerp follow 0.1, tiny lookahead toward movement 20 px, zoom punch 1.03 on slam, brief slow-mo (0.3x for 250 ms) on boss kill/last enemy of a room | | ~10 lines |
| 11 | Death/pickup poppiness: XP orbs magnetise with accelerating curve, collect "ting" pitch ladder | | ~15 lines |
| 12 | Mobile haptics `navigator.vibrate(10-20)` on TUNG/damage; light 80-120 ms, heavy 150-200 ms [S] | | 2 lines |

Rules of thumb: stagger layers (sound+hit-stop at 0 ms, flash +20, particles +50, number +100 [S]). Scale feedback with hit size: light hits get sound+flash only, heavy hits get everything. Provide a "Screenshake / Flash" slider (accessibility, see section 3). Over-juicing criticism ([Folmer Kelly counterpoint](https://rpgplayground.com/research-making-a-juicy-game/)): keep it coherent with the meme-silly tone, do not bury readability.

Game feel (Swink): control response should be under ~100 ms and polish multiplies perceived quality ([Wikipedia: Game feel](https://en.wikipedia.org/wiki/Game_feel)). Never delay input for animation: attack must start on press frame; allow input buffering (~100 ms) and coyote-like forgiveness on swing hitboxes.

## 2. Core loop and "one more run"

Evidence: [Vampire Survivors analysis](https://learning.cvnl.org/?p=17946) (automation frees attention for build decisions; guaranteed, recipe-based evolutions let players plan), [Brotato](https://adrianhon.substack.com/p/brotato) (short 20-60 s waves, readable red telegraphs, frequent shop choices, no sudden spikes), [Halls of Torment](https://en.wikipedia.org/wiki/Halls_of_Torment) (a boost every ~minute), [Hades-style death-as-story](https://gamegeeker.com/games/hades/review?market=US) (low-confidence, review only).

- **Run length**: 25 min is long for 2-10 min sessions. Make the 25 min *chunked*: each biome (about 7-8 min) is a complete run with a save point and a win screen. Also offer "Quick Run" (1 biome, 5-6 min) and a Daily.
- **Restart under 2 s**: skip logos, retry button on the death screen auto-focused, R/tap restarts. Preload everything.
- **Death should teach and pay**: show "what killed you", best-ever stat deltas, and always grant meta currency ("Tung Coins") proportional to progress, so every run advances something. Never reduce what the player owns.
- **Meta-progression that respects time**: small permanent perks (+5% HP, a 4th reroll, new starting weapon skins), but make unlocks that add *options* (new upgrade cards, new Sahur moves) rather than raw stats. Cap total stat bonuses so skill still decides.
- **Upgrades that excite**: (a) visible power growth (bigger slam ring, log gets a flaming/gold look per tier); (b) synergies with named combos ("Tung + Ringing = Tung Tung Tung chain"); (c) 1-in-5 cards is a "legendary" build-definer with its own frame and sound; (d) deterministic evolution: show the recipe card "Tung Slam + Echo = Sahur Quake" so players plan toward it (Vampire Survivors); (e) reroll/banish tokens (2 per run) to give agency over luck.
- **Variable reward, healthily**: variety in card draws, rare enemy "golden" variants that drop a chest, boss relic choices. Avoid streak penalties, login timers, and paid-style loot boxes.
- **Daily seed + local leaderboard**: date-seeded RNG for room/card order, one shared "daily" board stored locally (top 10) plus shareable text result ("Day 142: Biome 2, 38 combos, TUNG x61") copyable to clipboard. Zero server needed.
- **Pacing**: tension/release waves (Brotato): 20 s calm, 30 s pressure, then a choice screen. Room clear gives a 1-2 s victory slow-mo and a card pick as the reward.

## 3. Onboarding (first 30 s and first 60 s)

Evidence: [GMTK / kishotenketsu](https://mcvuk.com/?p=70645) (introduce, develop, twist, conclude without text), [Half-Life 2 invisible tutorial](https://amara.org/v/C3BGB), [Roblox FTUE guidance](https://create.roblox.com/docs/production/game-design/onboarding) (teach essentials, reach fun fast, leave them wanting more), [Celeste Assist Mode](https://en.wikipedia.org/wiki/Celeste_(video_game)), [Koster: fun = mastering patterns](https://www.shortform.com/summary/a-theory-of-fun-for-game-design-summary-raph-koster).

- **Zero menus before play**: title plus one "Play" button; the first room starts within 3 s.
- **Room 1 as kishotenketsu**: Intro (one weak enemy, safe: glowing arrow pulses on the swing button), Development (3 enemies, TUNG triggers automatically and the screen pops), Twist (enemy that must be hit on the beat; metronome ring pulses around the player), Conclusion (clear room, pick first card). Total ~60-90 s.
- **Contextual prompts, max 4 words, icon-first**: "MOVE", "HIT!", "ON BEAT = BONUS". Show only when the player has not done the thing in ~5 s; never block input; dismiss permanently once done.
- **Teach the beat visually first**: a pulsing ring/vignette on the beat, then reward on-beat swings with a bigger number and sound; never punish off-beat.
- **First 60 s fun**: guarantee the first TUNG kills 3+ enemies with big juice; first card choice must be a clearly strong pick.
- **Difficulty curve**: ramp new enemy type every 1-2 rooms, introduce one new rule at a time, heal after each room, soft "mercy" when the player dies twice in the same room (offer +20% HP, no label).
- **Assist options** (Celeste's approach: non-judgmental wording, still full completion): game speed 70-100%, auto-swing toggle, extra companion HP, beat-bonus-optional, screenshake/flash reduce, big-text damage, colourblind-safe telegraphs. Name it "Chill Mode", not "Easy".

## 4. Mobile

- **Controls**: left floating joystick + one big swing button on right (two-thumb) with a "Auto-swing" option that fires when an enemy is in range (the Vampire Survivors/Brotato trade-off: auto-attack removes aim burden but keep the timing skill via on-beat bonus, so auto-swing still earns a lower bonus). Buttons at least 64 px, placed in thumb arc, 15% dead zone, no UI in the bottom 10% (browser gestures).
- **Readability**: enemies and projectiles minimum ~24 px on a 360 px-wide screen; bright outlines and red telegraphs 0.6-1.0 s before damage ([Brotato's chunky red projectiles](https://www.gamesasylum.com/?p=56743)); damage numbers at 16 px minimum; keep the player and companion distinct colours.
- **Performance budget** ([MDN canvas optimisation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)): no `shadowBlur`; pre-render sprites/glows to offscreen canvases; integer coords; `alpha:false` context; use `requestAnimationFrame` with fixed-step update (60 Hz sim, clamp dt to 50 ms); layered canvases or CSS background for static arenas; cap DPR at 2; batch particles as `fillRect` in one path per colour. Targets: <=150 live particles on phone (300 desktop), <=60 enemies, <=20 damage numbers, pooled objects (no per-frame allocations), auto-lower particle count if frame time >20 ms for 2 s.
- Audio: unlock WebAudio on first tap; pre-decode short SFX; limit to ~16 simultaneous voices.
- Lock orientation as already done, and add a pause-on-blur.

## 5. Story in action games

- Keep it under 6 words per beat during play; use speech bubbles from Sahur that never pause the game; skippable cutscenes via tap-hold; one 10-15 s intro, boss intro stingers 2 s.
- Reward the story: new Sahur dialogue lines unlock per run (Hades-style: [death as story progression](https://gamegeeker.com/games/hades/review?market=US)), collectible "lore memes" in the post-run screen.
- Humour: let the companion react to player behaviour (miss streaks, low HP, perfect clear). Callbacks: repeated catchphrases ("TUNG!") whose meaning escalates at each boss; final boss quotes room-1 line.
- Companion HP in boss fights is itself narrative: a heal pickup labelled "Sahur snack" makes players care.

## 6. Top 12 features, ordered by fun per effort

1. Hit-stop + flash + layered pitch-randomised SFX on every hit (1 hour).
2. Trauma-based screenshake with slider (1 hour).
3. Damage numbers with crit/on-beat styling (1 hour).
4. Combo counter with pitch ladder and beat-streak bonus.
5. Slow-mo + zoom punch on last kill of a room and bosses.
6. Particle bursts + XP orb magnetism (pooled, phone-capped).
7. Legendary-frame upgrade cards + named synergies + reroll/banish tokens.
8. Instant restart (<2 s) with run-summary screen and meta currency on every death.
9. Room-1 kishotenketsu tutorial with pulsing beat ring and 4-word prompts.
10. Chill Mode assist options (auto-swing, extra Sahur HP, speed, reduced shake).
11. Daily seed + local top-10 board + copy-to-clipboard share string.
12. Evolution recipes ("Sahur Quake"): visible recipe card, deterministic payoff, plus 6-10 small permanent unlocks (new cards, Sahur skins).

## Open verification items
- Primary talks (Nijman, Jonasson/Purho, Swink) were not retrievable here; verify numbers in playtests.
- Hit-stop and shake values are starting points; the author-reported timing table is from [eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/), not a peer-reviewed study.
