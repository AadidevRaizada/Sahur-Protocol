# Enemies, bosses, THE AI BUBBLE and combat FX: guide for the film builder

Every component is a pure function of `frame` (60 fps) and its props. Nothing uses `useFrame`, clocks or
`Math.random`, so renders are safe out of order. Drop components inside any `<ThreeCanvas>`. Place them with a
parent `<group position rotation>`; animate states by passing 0..1 values computed from the frame.

**Origin and scale.** Enemies and bosses stand on the floor point under them (y = 0). `AIBubble` is centred on
its origin. Units are metres. A normal enemy is about 1 m tall at `scale` 1.

**Look.** The custom "neon toy" material (`lib/toy.ts`) lights itself in view space, so the creatures look the
same in every set, with or without lights. Rims and emissive parts are HDR (above 1.0), so use bloom. The sheets
use `<Post bloom≈0.9 threshold≈0.9>` on dark sets, and threshold ≈1.1 on the white Core so only real highlights
bloom. `Post` (in `lib/scene.tsx`) takes children (extra effects such as `<TungHeat/>`) that render before the
bloom.

**Fonts.** In-world text (the Bubble's rings, the `KPI` bolt, the Valuation caption) is drawn on canvases once
`useEnemyFonts()` resolves. That hook holds a `delayRender` until then, so you don't need to do anything.

## Common props (all enemies and bosses: `types.ts`)
| prop | meaning |
|---|---|
| `frame` | current frame (required) |
| `hit` 0..1 | white hit flash |
| `death` 0..1 | death: dissolve with a glowing edge plus a pixel-cube `Shards` burst (Slopling: splat into a puddle) |
| `scale` | uniform scale |
| `seed` | offsets idle phase and particles, so a crowd doesn't move in sync |
| `floor` | coloured light pool and contact shadow on the floor (default true) |

## Enemies
| component | extra props and states |
|---|---|
| `Slopling` (#ff3df0) | jelly blob with a dark core, filler bits, pixel eyes, a drip that falls and puddles, and a glitching wireframe bounding box. `agitation` 0..1 adds wobble. `death` = squash, splat, droplets and a puddle (uses `SlopSplat`). |
| `Drone` (#35e8ff) | faceted octahedron, glowing edges, rotor and motion disc, lens eye with a glint, thruster. `fire` 0..1: 0–0.2 charge, 0.2 shot and recoil, 0.2–1 the bolt flies to `boltTarget` (local, default straight ahead +z). `glyph` (default `'KPI'`), `hover`, `yaw`. Also exports `<JargonBolt progress from to glyph/>`. |
| `Wraith` (#c07bff) | translucent violet ghost, ragged animated hem, flicker and glitch drop-outs, dark core, pixel eyes. `lunge` 0..1: 0–0.3 anticipation, 0.3–0.62 stretched dash with an after-image trail, then recovery. `lungeYaw` (0 = +x; −π/2 = straight at a camera on +z), `lungeDist`, `hover`. |
| `ScraperHand` (#b0a4ff) | palm slab, 4 jointed clawed fingers, thumb, knuckles, wrist fraying into data cubes. `windup` 0..1: shakes (deterministic jitter), spreads its claws, goes red #ff4d5e. `grab` 0..1: lunges `grabDist` and clenches. `limp` 0..1 (after a bat hit), `fingers`, `thumb`, `trail`, `hover`. Also exports `HandModel` (fingers along +z). |
| `YesMan` (#3dff9d) | suit block, lapels, shirt, tie, square eyes, a smile that never moves; it nods mechanically. `nodRate`, `nodDepth`, `smileCrack` 0..1 (cracks run across the face, the smile splits, the nodding stops), `tip` 0..1 (falls over backwards). |
| `PivotGolem` (#ffb547) | two stacked amber stone slabs built as left and right halves along a glowing crack; the top slab keeps "pivoting". `split` 0..1: 0–0.3 the crack blazes and shakes, 0.3–0.75 the halves part (`splitDist`) and stand as two, with debris. `fists` (two floating stone fists, default on), `slam` 0..1 (raise 0–0.45, slam 0.45–0.55, rest, return 0.8–1). |

## Bosses
| component | extra props and states |
|---|---|
| `Echo` (#ff3df0) | big magenta wraith in a porcelain mask (slot eyes, flat mouth), up to 3 louder, larger, delayed after-images, engagement ripple rings. `echoes` (0–3), `burst` 0..1 (after-images flare and grow 10%+: "louder"), `maskCrack` 0..1 (a crack draws across the mask), `scatter` 0..1 (after-images fly apart and dissolve while she recoils), `hover`. |
| `Scraper` (#c07bff) | violet data core, dark concentric face rings, rotating cyan cube centre, gyroscope rings, six `HandModel` hands orbiting (hand 4 has a fifth finger) that drag data cubes into the core. `orbitPeriod` (frames per orbit; game ≈226, storyboard flash = 48), `clench` 0..1, `reach` 0..1 (hands 0, 2 and 4 reach at the camera, staggered by a third), `reachDist`, `shatter` 0..1 (face rings burst into 60 shards, cyan flash, hands go limp), `hover`. |
| `Valuation` (#35e8ff) | colossal `$999B` built from voxels sampled out of the Press Start 2P glyphs (0.42 m deep), a shimmering ticker wave, an up-only chart (tube line, nodes, gradient area, grid, arrowhead), and the caption `▲ +∞% projected`. `text`, `caption`, `overextended` 0..1 (cracks, chunks slip, hot red seams, voxels fall, the last leg crashes, caption becomes `▼ OVEREXTENDED`), `topple` 0..1 (digits topple forward one by one, left to right, and drop), `lineSnap` 0..1 (the line snaps where it meets the number and its far end swings down), `hover`. In 9:16, dolly back: it is about 5 m wide. |

## THE AI BUBBLE: `AIBubble`
Origin = centre. `radius` = world radius at `inflate` 0 (the sheets use 1.42; the Core keyframe uses 60 m at about 110 m).

| prop | meaning |
|---|---|
| `inflate` 0..1 | scale 1 → 1.65 (storyboard: 1.12 ≈ 0.185, 1.65 = 1). The film thins and colours intensify; the wobble tightens. Use `easeOutBack` for the "absorbs the TUNG" bump. |
| `dent` 0..1, `dentAmp` | a TUNG ring front climbs from the base to the crown: an inward dimple (`dentAmp` 0.06 = the big TUNGs, ~0.02 = the small absorbed ripple) plus an amber band; the rings stutter. |
| `leak` 0..1 | violet pools at the bottom; drip strands grow and drop; it sags; the wobble goes unstable; rings wobble. |
| `seam` 0..1 | a jagged rip opens across the lower-left front and violet runs down from it (storyboard TUNG 2). |
| `shed` 0..1 | ring letters detach and fall like confetti, tumbling and pixel-dissolving. |
| `pop` 0..1 | 0–0.15 the film tears open from the lower right (bright retracting rim, face stretching); **0.095–0.185 one bright flash cluster that blows out under bloom**; 0.15–0.6 400 iridescent shreds and 260 droplets thrown off where the rim passed, plus an iridescent shockwave ring; 0.6–1 the hype letters fall and pixel-dissolve. `bubblePopFlash(pop)` (exported) gives 0..1 for a DOM white overlay. |
| `face`, `gaze` [x,y], `smile` (width ×), `smileFlat` 0..1, `faceWarp` 0..1 (eyes slide off-axis), `eyeDrift` | the almost-right face, painted inside the film: glossy near-black eyes at 1:1.35 with specular dots, drifting apart over time; the right eye lags and frame-skips about a quarter of the time; a thin, crooked smile that wraps too far around the sphere. |
| `faceDir` [pitch, yaw] | where the face points. For a camera below at elevation `e` (radians) use `[e, 0]`. |
| `rings`, `ringStyle` (`'corporate'` Inter glossy chrome, default; or `'pixel'` Pixelify white/pink as in the storyboard), `phrases` (3 strings, default = the storyboard's near-miss lines), `ringSpeed` (×; storyboard ×2.5 while it grows), `ringTilt` [x,y,z] (turn the rings' near side toward a camera: about `[e + 0.2, 0, 0.3]` from below), `ringScale` | hype rings: per-letter instanced glyphs on three tilted orbits (600 / 720 / 900 frames per turn). |
| `env` (`'core'` or `'dark'`), `reflectionMap` + `reflectionAmt` | what the film mirrors. Pass an equirect texture (e.g. the blue bedroom or the phone reel render target) for the storyboard's "temptation reflections". |
| `hit`, `opacity`, `seed` | as usual. |

## FX (`src/fx`)
| component | props |
|---|---|
| `TungWave` | `progress` 0..1, `big` (final move: radius 40, near-white core, tall light pillar), `radius` (max, m), `color`, `chips`. Origin = the strike point on the ground. A ground ring with a bright inner edge, a glowing wall riding the front, dust riding the ring, wood chips, a strike flash, a scorch glow. `tungRadius(p, maxR)` gives the ring radius, for timing hits on enemies. |
| `TungHeat` | **inside `<Post>` / `<EffectComposer>`**: screen-space heat ripple on the ring's projected ellipse. `progress`, `center`, `big`, `radius`, `strength`. |
| `HitSpark` | `progress` (drive it fast, about 12 frames), `color`, `size`, `rays`, `position`, `sparks`. Camera-facing star burst. |
| `SlopSplat` | `progress`, `origin`, `ground`, `count`, `power`, `size`, `puddle`, `puddleRadius`. Magenta goo droplets that land as splats, plus a wobbly puddle. |
| `Shards` | `progress`, `color`, `count`, `origin`, `radius`, `power`, `size`, `gravity` (0 = weightless), `ground` (null = no floor), `duration`, `glow`. Generic pixel-cube shatter. |
| `Knockback` | wrapper: `progress`, `dir`, `dist`, `arc`, `spin`, `pivotY`. "Knocked spinning away" or "cartwheels out" after a bat hit. |
| `Motes`, `Debris`, `Bokeh`, `GodRays` | atmosphere: GPU dust points, weightless tumbling chunks, defocused near-lens squares, faint additive light shafts. |
| `lib/scene.tsx` | `FloorGlow`, `GlowSprite`, `CameraRig`, `Post`, `useCanvasTexture`, `projectToScreen`. |

## Sheets (`src/registry/enemies.tsx`)
`EnemySheet` (120 f), `BossSheet` (120 f), `BubbleSheet` (240 f: idle 0–80, inflate and a ripple 80–140, leak + seam + shed 140–170, pop 170–240), `KeyFrameCore` and `KeyFrameCoreVertical` (POV from the Core floor; the lower third is left clear for Sahur, about 1 m to the left of the eye), `TungWaveSheet` (90 f).

## Gotchas
- Never write `pow(x, 2.0)` in a shader on a value that can be negative. GLSL leaves it undefined, and one NaN pixel gets spread over the whole canvas by bloom (it blanked a canvas once). Use `sq()` from `lib/glsl.ts`.
- `BackSide` materials flip the winding, so in custom shaders `gl_FrontFacing` is *true* on the faces you see. Handle `#ifdef FLIP_SIDED` (the toy and film shaders do).
- Instanced meshes set `frustumCulled = false` (their transforms change every frame).
