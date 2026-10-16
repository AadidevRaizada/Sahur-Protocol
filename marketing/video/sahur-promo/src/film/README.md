# Film build contract (read before touching anything)

The film is `SahurPromo` (1920×1080) and `SahurPromoVertical` (1080×1920), 4500 frames at 60 fps, registered in
`src/registry/film.tsx`. `src/film/Film.tsx` mounts six **acts** in sequence and plays the soundtrack
(`public/audio/music.wav` + every cue in `public/audio/cues.json`). Don't edit Film.tsx, timeline.ts, context.tsx or Root.tsx.

## Acts and owners
| Act file (`src/film/acts/`) | Global frames | Shots | Owner |
|---|---|---|---|
| `BedroomA.tsx` → `BedroomAAct` | 0–1410 | S01–S14 | rig builder |
| `Journey.tsx` → `JourneyAct` | 1410–2400 | S15–S26 | journey builder |
| `Battle.tsx` → `BattleAct` | 2400–2976 | S27–S44 | battle builder |
| `Core.tsx` → `CoreAct` | 2976–3720 | S45–S51 | core builder (enemies agent) |
| `BedroomB.tsx` → `BedroomBAct` | 3720–4200 | S52–S57 | rig builder |
| `EndCard.tsx` → `EndCardAct` | 4200–4500 | S58 | journey builder |

Put an act's helpers in its own folder: `src/film/<act>/…` (e.g. `src/film/battle/`).

## Frames and aspect
- `useFilmFrame()` from `src/film/context.tsx` returns the **global storyboard frame**: use the storyboard's numbers verbatim.
- `useAspect()` returns `'h'` or `'v'`; `vMatchFov(fov169)` gives the storyboard §9 vertical FOV. Every shot must work in both aspects (storyboard §9: re-render, don't crop; the per-shot `Vertical:` notes).
- Cuts inside an act are yours: render the right shot for the frame (a switch on the frame ranges). Each 3D shot can have its own `<ThreeCanvas>`; only mount the canvas that's on screen (plus a second one only during an actual cross-dissolve).

## Shared, read-only kits (import, don't edit; if you need a change, see "Requests")
- `src/rig/*`: `<Sahur>` (custom `Pose` objects are allowed: build new poses in your own folder from `POSES` in `pose.ts`), `<BlobHands>`, `<Phone>`, `<Lantern>`, `<Bat>`. Docs: `src/rig/README.md`.
- `src/pov/*`: `povCamera`, `<ApplyCamera>`, `<CamAttach>`, `<Post>`, overlays (`<Eyelids> <Grain> <Vignette> <Flash> <WhiteOut> <Grade> <LightLeak>`).
- `src/ui/*`: `<SpeechLabel>` (Sahur's in-world text) and `<Subtitle>` (the player's lines).
- `src/enemies/*`, `src/fx/*`: every enemy, boss, the AI Bubble, TungWave, HitSpark, SlopSplat, Shards, Debris, Motes, Bokeh, GodRays, TungHeat. Docs: `src/enemies/README.md`.
- `src/sets/Bedroom.tsx` (rig builder), `src/sets/Forest.tsx` (journey builder creates it; the battle builder imports it for S27–S32).
- `src/lib/palette.ts` (PAL), `src/lib/fonts.ts` (PIXEL, PRESS, SANS).

## Rules (each one learnt the hard way)
1. Everything is a pure function of the frame and props. No `useFrame`, clocks or `Math.random` (use the seeded `prng`/`hash1`/`noise1` in `src/rig/util.ts`). Renders happen out of order, in parallel.
2. Anything async (fonts, textures, images via `staticFile`) holds a `delayRender` handle until it's ready.
3. **No NaN in shaders**: use `sq(x)`, not `pow(x, 2.0)` (a single NaN pixel gets smeared across the whole frame by bloom).
4. **One project, four builders.** A syntax error or a module-level throw in ANY file breaks everyone's bundle. Write files whole (Write, not partial edits that leave them broken mid-way), keep module top-levels side-effect free, and after editing, run a quick still to prove the bundle builds. If the bundle fails in a file you don't own, wait a minute and retry (its owner is mid-edit), and log `REQUEST:` if it persists.
5. Only edit files you own (the table above plus your helper folder and the sets assigned to you).
6. Performance: keep a 1080p frame under about 3 s to render. Check it with the time a still takes.
7. Text: only the storyboard's 5 lines (§5), its diegetic items and the end card. The speech label and subtitle components already implement §5's style.
8. Amber `#ffb547` comes only from Sahur (hands, lantern, fire, TUNG rings, cracks, labels) and the end-card title.

## Stills and QA
- `node scripts/stills.mjs SahurPromo qa/<act>/<prefix> <frame> [frame...] [--scale=0.5]` (global frames). Vertical: `SahurPromoVertical`.
- Keep batches to about 8 frames, iterate at `--scale=0.5`, and do the final checks at 1. Look at your stills with the Read tool.
- Contact sheet: `python scripts/sheet.py qa/<act>/<prefix> qa/<act>/<prefix>-sheet.png 4 2 480`.
- Check the shot **boundaries** with the neighbouring acts (e.g. 2976: Battle ends in white; Core starts in white).
- Log milestones to `STATUS-<act>.log` with a timestamp. Prefix any cross-team need with `REQUEST:`; the coordinator watches the logs.

## Audio
Already done (`public/audio`); the film plays it. Your visual hits must land on the cue frames in `public/audio/cues.json` and the storyboard's SFX list (§7.5): TUNGs, impacts, the pop, label toks. If a visual beat has to move, log `REQUEST:` with the new frame so the cue sheet can be updated.
