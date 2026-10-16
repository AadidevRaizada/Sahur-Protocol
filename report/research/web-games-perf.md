# Sahur Protocol: web-game success + Canvas 2D mobile perf brief

Evidence note: web search returned thin data (no Poki/CrazyGames top-10 list, no retention numbers). **[src]** = from a fetched/searched page; **[exp]** = standard practice / engineering judgment, not verified by a cited source. Treat third-party stats as unverified.

## A) What works in web / brainrot games

### Evidence
- Poki: top games are playable in ~3 s with intuitive controls; sessions average 11-20 min; rewarded video (extra life, cosmetic) beats interruptive ads; long onboarding, big downloads and mandatory accounts kill browser retention; Drive Mad ships at 3.7 MB; only 227 releases finalized in 2025, all hand-reviewed for quality/performance. [src] https://www.pocketgamer.biz/inside-pokis-vision-for-the-future-of-browser-gaming/
- Poki reported 625M players in 2025 (own year-in-review); 15,000+ browser games shipped in H1 2025 = heavy competition. [src, secondary]
- One unverified article (cites a GameAnalytics report I could not confirm) claims hyper-casual is declining and mid-core roguelites with persistent progression, build synergies, procedural content and async social (leaderboards, ghost replays, shared challenge seeds) are winning on web; PokeRogue cited; <5 s launch target. [src, weak] https://dev.to/jasonguo/the-death-of-hyper-casual-why-mid-core-is-the-new-gold-mine-for-browser-games-in-2026-3l8
- Steal a Brainrot (Roblox): personal base; conveyor sells brainrots ordered common to rare; placed units earn cash per second; raiding/stealing is the social hook; mutations (Gold/Diamond/Rainbow) multiply earnings; tiers Common > Rare > Epic > Legendary > Mythic > Brainrot God > Secret; ~496 units; Secret units are event-only or not directly buyable; codes give limited variants. Reported peak 25.4M concurrent in Oct 2025 (single French guide, verify). Core idea: viral TikTok memes become collectibles with a rarity ladder. [src]
  - https://www.playnews.gg/en/guides/steal-a-brainrot-roblox-the-complete-strategy-rebirth-and-tier-list-guide-for-july-2026
  - https://rblxguide.com/games/steal-a-brainrot/brainrots
  - https://deltiasgaming.com/?p=301651
- Vampire-Survivors-likes on web: itch.io tag listing (playable examples, no data) https://itch.io/games/html5/tag-survivor-like

### Design takeaways for Sahur Protocol
1. **Time to first hit under 5 s.** Boot into a playable arena (menu = one big PLAY button, arena already alive behind it). No text wall; teach by doing: first 10 s = 1 enemy type, one move stick, auto-attack. [src+exp]
2. **Runs of 3-6 min, instant restart** (one tap on death screen, no loading). Poki sessions are 11-20 min, so target 2-4 runs per session. [src+exp]
3. **Escalating spectacle on a schedule:** new enemy/hazard every ~30-45 s, screen-fill moment ~2 min, boss at end. Cap particles so spectacle never costs frames. [exp]
4. **Collection with a rarity ladder:** companion variants/skins/"mutations" (Common to Secret), color-shifted variants that multiply score. Show odds; no paywalled randomness. Persist in localStorage. [src+exp]
5. **Companion = retention + share hook:** reacts (voice/emote) to kills, near-death, evolutions; a "rare pull" reveal after a run. [exp]
6. **Daily challenge seed** (date-derived: same map, upgrade offers, enemy order for all) + local best-of-day. No server needed; async social is cheap multiplayer. [src weak+exp]
7. **Share-ready game-over card:** one canvas-rendered image (score, time, companion, rarity, daily seed, URL) with Share/Save button (navigator.share, else PNG download). Vertical-friendly for Reels/TikTok grabs. [exp]
8. **Respectful retention:** no forced ads, no account, auto-save; any rewards opt-in only. [src]
9. **Pre-empt common complaints** (Poki friction guidance plus standard player feedback, not a measured survey): unclear controls (3 s ghost-hand/stick hint, then fade); text walls (max ~8 words + icon per upgrade card); slow starts; lag (see B); tiny UI (touch targets >=44-48 CSS px, body text >=16 px, big upgrade cards). [exp]

## B) Canvas 2D low-end mobile checklist

### Rendering
| Item | Rule |
|---|---|
| DPR | Backing store = CSS size x min(devicePixelRatio, 2); cap 1.5 on cheap Android, drop to 1.0 adaptively if frame time stays >20 ms. Scale ctx once. [src: MDN pattern] https://docs.w3cub.com/dom/canvas_api/tutorial/optimizing_canvas |
| Resolution | <=1.3-2 MP total backing pixels on low tier (fill rate is the usual bottleneck). [exp] |
| Context | getContext('2d', {alpha:false}) (+ desynchronized:true where supported); alpha:false lets the browser optimize. [src] https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas |
| shadowBlur | Never per frame. Bake glows once to offscreen canvas/ImageBitmap, then drawImage. MDN says avoid it. [src] |
| Gradients/filters | Create once or bake to sprites; no createRadialGradient per entity per frame; avoid ctx.filter and big 'lighter' blends. [exp] |
| Sprites/text | Atlas of pre-rendered sprites; integer coords; no fillText per frame (cache). [src+exp] |
| Batching | Group by fillStyle, one path for many rects, minimize save/restore and state changes. [src] |
| Background | Static arena pre-rendered to one offscreen canvas, one blit per frame. |
| Culling | Skip off-screen entities; draw cap ~300-400 sprites on low tier. [exp] |

### Memory / CPU
- **Object pooling:** pre-allocate enemies/bullets/particles/damage numbers in fixed arrays with active flags; no per-frame object/array/closure/string creation (GC hitches on cheap Android). Swap-remove instead of splice. [exp]
- **Particle caps:** ~150-250 total on mobile; auto-scale spawn rate when dt > 24 ms; fillRect over arc for tiny particles. [exp]
- **Spatial hash** (cell ~64 px) instead of O(n^2) collisions. [exp]

### Loop and lifecycle
- rAF only; schedule next frame first; time with performance.now(); 60 Hz budget ~16.5 ms. [src] https://developer.mozilla.org/en-US/docs/Games/Anatomy
- **Fixed timestep sim** (60 or 30 Hz) with accumulator; **clamp frame dt to ~100 ms and max 3-5 steps/frame** (avoid spiral of death); render once per rAF. A large tick count means the tab slept or the device can't keep up. [src+exp]
- 120/144 Hz screens: sim stays fixed so speed is consistent; offer a 30 fps "Battery saver".
- **visibilitychange:** on hidden, auto-pause, suspend AudioContext, stop timers; on return show "tap to resume"; do not simulate the gap (MDN lists "treat as pause" as the simple single-player option). Also handle pagehide/blur. [src+exp]

### Audio
- iOS/Safari: create/resume AudioContext inside the first touchstart/pointerdown/click, play a silent buffer synchronously, await ctx.resume() before scheduling sounds; re-resume after returning from background. Silent/ringer switch can mute Web Audio on iOS Safari. Listen on touchend too. [src, community] https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos , https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09
- Voices: cap ~8-12 simultaneous one-shots; throttle identical retriggers (~40-60 ms); decode AudioBuffers once at load, never per play. [exp]
- Prefer procedural/synth SFX or short mono 22-32 kHz clips to protect the ~1 MB budget. [exp]

### Images / assets
- Use createImageBitmap or img.decode() before first use so decoding doesn't hitch mid-run; keep atlases <=2048x2048. Decoded RGBA = w*h*4 bytes, so memory matters more than file size. [exp]

### Layout, orientation, input
- **Viewport meta:** `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`; size canvas from innerWidth/innerHeight (or visualViewport), update on resize/orientationchange; CSS 100dvh, not 100vh. [exp]
- **Safe areas:** canvas may fill the screen; inset HUD and touch controls with env(safe-area-inset-*) (the notch moves to the side in landscape). [src] https://emanueleferonato.com/?p=11292
- **Fullscreen vs letterbox:** use a fixed logical height (e.g. 720 units) with variable width and anchor HUD to edges; letterbox only if the arena needs a fixed aspect. Bars waste scarce phone screen. [exp]
- **Orientation:** top-down twin-thumb suits landscape; most casual web titles that go portrait are one-thumb. Recommendation: support both. Landscape = left floating stick + auto-aim; portrait = same arena zoomed to fit width, one floating stick in the bottom third. If portrait is cut, show a rotate prompt via matchMedia('(orientation: portrait)'); Android can lock with screen.orientation.lock after fullscreen, iOS Safari cannot. [src+exp] https://abratabia.com/mobile-web-games/html5-games-on-mobile.php
- **Touch latency:** Pointer Events with `touch-action:none`, `{passive:false}`, preventDefault, track by pointerId; handlers only record state, the sim reads it in its step. Disable selection, long-press menu, double-tap zoom, pull-to-refresh (`overscroll-behavior:none`). Floating joystick spawns where the thumb lands. [exp]
- **Haptics:** navigator.vibrate(10-20) on hit/pickup (Android only), with toggle. [exp]

### Battery / thermals
- Adaptive governor: if avg frame >20 ms for 2 s, lower DPR, then particles, then glow. Idle menus render only on change. Pause fully when hidden. Test on a real mid-tier 4 GB Android via remote debugging; target p95 frame <20 ms and no GC spikes. [exp]

## Prioritized action list for the single HTML file
1. Frame-time-adaptive quality governor (DPR cap, particle cap, glow off).
2. Pre-bake glow/gradient/emoji sprites; remove per-frame shadowBlur/gradients.
3. Pointer-events floating joystick + touch-action:none + safe-area HUD.
4. Fixed timestep + dt clamp + visibilitychange pause + audio resume.
5. Instant restart, 3-5 min runs, daily seed, share card, rarity-tier companion collection (localStorage).
