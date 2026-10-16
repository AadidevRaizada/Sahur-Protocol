# game3d: the final Bubble fight in 3D (prototype)

The last fight, against THE AI BUBBLE, can render in 3D with the promo film's neon-toy models
(`marketing/video/sahur-promo/src`: `AIBubble` and its film, rings and burst, the summoned enemies,
`rig/Sahur`, the toy material, `TungWave`, `Shards` and the bloom `Post`). Every other part of the game
is still drawn in 2D.

The 2D simulation is unchanged. The game still updates `state` in 960×540 arena pixels. Each frame,
`render()` calls `R3D.frame(...)`, and the 3D side reads the state:

- **2.5D mapping** (`src/camera.ts`): the arena lies on the floor plane at 40 px per metre, with the
  arena centre at the origin. The camera is a three-quarter view, fitted so the whole arena and the
  Bubble's crown stay in frame. `R3D.project` and `R3D.unproject` convert between arena and screen
  coordinates for the HUD labels and for touch-to-move.
- **State → props** (`src/track.ts`): each model's `frame` and state props come from the game. Examples:
  enemy `hit` comes from `hitT`; `death` comes from a ghost kept for 48 frames after the game drops the
  enemy; Drone charge comes from its shot timer; Wraith lunge comes from `dashT`; hand windup and grab
  come from `wind` and `dashT`. The Bubble's `inflate` follows the phase, `dent` fires on each of Sahur's
  TUNGs and on each of your answers, and `leak`, `shed` and `smileFlat` follow the collapse. After the
  second answer it gets the `seam`; after the third, it pops. Sahur's `swing` follows his attack frames,
  `walk` his speed and `cracks` the collapse; `dropKnee` is his pose when he is down.
- **Transition**: when the fight starts, the WebGL canvas fades in from straight above, framed exactly
  like the flat canvas, and then tilts into the three-quarter view over 1.6 s. The tilt clock advances
  at most 0.1 s per frame, so a first-frame shader-compile stall can't skip it.
- **HUD**: the game draws the HUD on a transparent overlay canvas (`renderOverlay3D` in the game file).
  This covers the boss bar and timer, HP, the BEAT light, Sahur's bar, the challenge HUD and the
  three-TUNG finale. Labels tied to the world (Sahur's bars and barks, damage numbers, "!") are
  projected onto the 3D scene. These have 3D equivalents instead: the snipe telegraph is a dashed red
  beam, the help ring is a floor ring that fills up, spawn telegraphs are floor rings, and the TUNG
  is the film's `TungWave`.
- **Remotion** is not bundled. `src/shims/remotion.ts` stands in for `useCurrentFrame`, `delayRender`
  and the other calls the models make. `src/shims/googleFont.ts` replaces `@remotion/google-fonts`
  (Inter and Pixelify Sans come from Google Fonts; if they're offline, a fallback font is used).
- **Quality**: Options and Pause have a "Final boss renderer" choice of 3D high, 3D low or 2D, saved in
  `localStorage`.
  - *High*: bloom, motes, TungWave chips, DPR up to 1.5.
  - *Low*: no post-processing, half the particles, DPR 0.8.
  - *Fallback*: with no WebGL, a lost context or a render error, the fight stays in 2D. A watchdog
    takes 2-second frame-rate windows during play. Two slow windows in a row (under 40 fps) drop
    *high* to *low*, and two more drop *low* to 2D, with an on-screen notice each time.
  - URL overrides: `?r3d=off|high|low|force`. `force` turns the watchdog off, for measuring.
- **Reduced motion**: there is no tilt (a 0.25 s fade instead), no camera shake, no motes, no chromatic
  kick on the pop, and the hype rings turn slower. The game's own flash and shake limits still apply.

## Build

```bash
node game3d/build.mjs
```

The build uses esbuild, three, React, react-three-fiber and postprocessing from
`marketing/video/sahur-promo/node_modules`. Run `npm install` there first if that folder is missing.
The script minifies the bundle and inlines it into `Sahur_Protocol.html` between the
`<!-- R3D:BEGIN -->` and `<!-- R3D:END -->` markers, so the game is still one static file. Don't edit
the code between the markers: edit `game3d/src` and rebuild. The editable game code is the rest of
`Sahur_Protocol.html`, as before. `--check` builds and prints sizes without touching the HTML.

## Test

```bash
node game3d/test/bubble3d.test.mjs
```

The test uses puppeteer-core from `report/node_modules` and the installed Chrome. Screenshots and
`report.json` are written to `game3d/test/shots/`. `ONLY=desktop,mobile` runs a subset.

- **desktop** (1280×720) and **mobile** (844×390, touch, DPR 2): CONTINUE from a Core save, then the
  tilt-in, play with real input, phase 2, Sahur down and helped up, a snipe, the collapse, the sacrifice
  cutscene, the three calls and answers, the pop, the epilogue, and "WE WON.". To keep the run short,
  the test lowers the Bubble's HP between phases and keeps the player at full HP.
- **low**, **reduced** (prefers-reduced-motion) and **watchdog** (CPU throttled 10×, no `force`: it must
  step down to low, then to 2D).
- **no-webgl** (Chrome with `--disable-webgl`): the fight must run in 2D with no errors.

## Measured (2026-10-16)

Every run passed with no console errors or page errors.

**Frame rate.** Headless Chrome on the dev laptop (AMD Radeon 780M through ANGLE/D3D11). Headless
frames aren't capped by vsync, so these are throughput numbers. In a normal window the game shows
the display's refresh rate.

| run | fps (2 s windows during play) |
|---|---|
| desktop 1280×720, high | 108–123 |
| mobile 844×390 at DPR 2, high | 115–144 |
| desktop, low | 128–144 |
| CPU throttled 10× | 8–19, so it stepped down to low and then to 2D |

A real phone hasn't been measured yet. That device's numbers decide whether high or low should be
the default on touch screens.

**Size.**

| | raw | gzip | brotli |
|---|---|---|---|
| bundle | 866 KB | 243 KB | 202 KB |
| `Sahur_Protocol.html` after | 1.92 MB (2,010,738 bytes) | about 1.0 MB | |

`Sahur_Protocol.html` was 1.07 MB (1,116,835 bytes) before. Most of the gzipped file is still the
13 base64 images.

What the bundle contains: three 529 KB, the promo models 126 KB, react-reconciler 90 KB,
postprocessing 64 KB, react-three-fiber 20 KB, this folder 19 KB, and react plus scheduler 11 KB.
react-dom isn't needed, because R3F's `createRoot` renders straight to the canvas.
