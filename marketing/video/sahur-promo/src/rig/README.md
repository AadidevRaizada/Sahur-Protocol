# Rig kit: Sahur, POV hands, phone, bedroom, POV camera, text

Everything is a pure function of `useCurrentFrame()` and props: no `useFrame` animation, no clocks,
no `Math.random` (seeded `prng`/`hash1`/`noise1` in `src/rig/util.ts`). Procedural textures are
CanvasTextures cached at module level. The reel's sprites and fonts load under `delayRender`.

Units: Sahur is modelled in his own units (about 3.04 tall, log radius ~0.42). In the bedroom he is
scaled by `SAHUR_ROOM_SCALE` (0.62 → 1.88 m). The bedroom, the hands and the phone are in metres.

## Compositions (src/registry/rig.tsx)
| id | size | what |
|---|---|---|
| `SahurSheet` (Still) | 1920×1080 | turnaround, 8 expressions, 8 poses |
| `HandsSheet` | 1920×1080 | holdPhone, reach, takeHand (with Sahur), holdBat, defensive |
| `KeyFrameDoorway` / `KeyFrameDoorwayVertical` | 1920×1080 / 1080×1920, 550 f | storyboard S09–S14: comp frame f = storyboard frame 860 + f. Prop `sbStart` (720 includes the knocks) |
| `KeyFramePhone` / `KeyFramePhoneVertical` | 90 f | storyboard S01–S02 condensed: phone, reel, heavy lids |
| `SahurLab`, `BedroomLab` | dev | QA views |

`DoorwayScene.tsx` exports `DoorwayShot({ sb })` (S08–S14 at storyboard frame `sb`, usable inside any Sequence),
`sahurAt(sb)`, `camAt(sb, vertical, sahur)` and `vMatch(fov)`. The blocking lands on the cue sheet: knocks 740/780/820,
foot plants 990 (into the doorway) and 1018 (over the threshold), blink tk 1060, knee 1124, label toks 1140–1215,
contact 1336. The film acts live in `src/film/acts/BedroomA.tsx` / `BedroomB.tsx` with helpers in `src/film/bedroom/`.

## `<Sahur>` (src/rig/Sahur.tsx)
Local frame: origin at the ground between his feet, +Y up, he faces +Z, +X is HIS left.

| prop | type | notes |
|---|---|---|
| `position`, `turn`, `scale` | V3, rad, number | root transform (`turn` = yaw, 0 faces +Z) |
| `pose`, `poseB`, `poseMix` | name or Pose, 0..1 | blend two poses |
| `swing`, `swingMix` | 0..1 | overhead knock: 0 ready → 0.35 wind-up → 0.55 strike (TUNG) → 1 follow-through |
| `walk`, `walkAmount` | cycles, 0..1 | toy waddle (1 cycle = 2 steps): bob, side rock, feet lift, arm counter-swing |
| `breathe` | cycles | idle breathing (pass `frame/fps*0.35`) |
| `lean`, `tilt` | rad | extra forward lean (pivots at the hips) / side tilt (+ = toward his right) |
| `expression`, `expressionB`, `exprMix` | name or Expr | see below |
| `blink` | 0..1 | |
| `look` | [x, y] | gaze; +x = toward his left (viewer's right when he faces you), +y up |
| `mouth` | `flat`/`smile`/`grim`/`tung` | override |
| `talk` | 0..1 | jaw flap (storyboard: about 0.35 for 2 mm per syllable) |
| `glitch`, `glitchArm`, `seed` | 0..1, `L`/`R` | forearm + hand: band-sliced tear, opaque TV-static texture swap, RGB-split ghosts, dropped frames; re-rolled every 2 f |
| `bat`, `batHand` | bool, `L`/`R`/`none` | |
| `armL`, `armR` | Partial<ArmPose> | per-arm overrides (e.g. `{ grip }`) |
| `lantern` | bool or `{ glow, light, swing:[x,z] }` | paper lantern hanging world-down from the bat tip, amber PointLight (18 cd) |
| `castShadow` | bool | default true |
| `run`, `runAmount` | cycles, 0..1 | stiff-legged toy run (1 cycle = 2 strides), stronger lean/bob than `walk` |
| `cracks` | 0..3 continuous | amber crack lines that GROW: 0→1 one hairline from the top rim beside his right eye, 1→2 the hairline widens + two more cracks + branches, 2→3 a full network of seams. Cracked wood darkens; cracks glow amber (bloom picks them up) |
| `innerLight` | 0..1 | internal amber PointLight, up to 600 cd (distance 40), lighting the world as if leaking through the cracks; also drives the crack glow hard |
| `chips` | `{ t, seed?, count?, origin? }` | wood-chip burst, `t` 0..1 over ~0.7 s, from a torso-local origin (default: the top front crack). Drive `t` from (frame − crackFrame) / 42 |

Poses (`POSES` in `pose.ts`): `idle` (sprite idle, bat hanging in the right hand), `idleL` (bat left),
`batShoulder` (bedroom carry: bat resting on the right shoulder, never raised at you), `duck` (under a
lintel), `kneel`, `kneelOffer` (on the right knee, LEFT hand out palm-up), `batOverhead` (sprite attack),
`ready`, `offerHand` (right hand out palm-up, bat left), `handOnShoulder` (right hand forward to the
camera's left shoulder, palm down), `sitting` (seat height ~0.46 units, bat on the left shoulder),
`lookHand` (seated, right hand raised in front of the face: use with `glitch`), `pullUp` (standing, LEFT hand
forward holding yours, bat on the right shoulder), `leap` (airborne tuck: set the root `position[1]` yourself),
`land` (impact crouch), `stumble` (catches himself on the bat planted in front), `dropKnee` (spent, on one knee,
head down, leaning on the planted bat), `tapStump` / `tapStumpUp` (blend between them for a bat tap on a stump in
front), `knuckleTap` / `knuckleTapUp` (left knuckle knocks his own chest), `headTap` / `headTapUp` (left hand taps the
side of his head: the "cover your ears" mime), `sitBench` (hips ~0.66 units: a bench of that height under him;
bat on the right shoulder), `tpose`. Custom poses: copy one from `POSES` and edit the numbers (`mixPose` blends).
Poses may set `batTorsoDir` (bat direction in the torso frame) instead of the hand-frame `batDir`.

Expressions (`EXPRESSIONS`): `weary` (sprite idle: half-lidded, inner brows up, wavy mouth), `fierce`
(sprite attack: V brows), `warm`, `sad`, `surprised`, `determined`, `neutral`, `tung` (open mouth), and
the storyboard set `earnest`, `smile`, `amused`, `sadSmile`, `strained` (one lid lower), `calm`.
Expr fields: browRaise, browAngle (+ inner up), lidUpper, lidLower, lidTilt, pupil, curve (−1 frown..+1
smile), open, width, wobble, look, lidAsym.

Anchors: `HEAD_TOP`, `FACE_CENTER` (local, upright, unscaled). For the posed world position use
`sahurPoint(props, 'headTop' | 'faceCenter' | 'eyes' | 'mouth' | 'chest' | 'handL' | 'handR', offset?)`.
`sahurRig(props)` returns every joint transform (same solver the component uses).

## `<BlobHands>` (src/rig/BlobHands.tsx)
Render inside a group carrying the camera transform (`<CamAttach cam>` or
`<group position={cam.position} quaternion={cam.quaternion}>`). Camera space: x right, y up, −z forward.
Cream `#e8e4d8` mitten blobs (one parametric surface: round paddle, thumb nub, wrist, thick arm),
darker toward the wrist, soft sheen, inverted-hull ink outline (`outline`, default 0.0024 m; 0 = none).

| prop | notes |
|---|---|
| `pose`, `poseB`, `mix` | `holdPhone`, `reach`, `takeHand`, `holdBat`, `defensive`, `rest` (off-screen), or a custom `{R, L, phone?, bat?}` |
| `tremble` | 0..1 seeded tremor |
| `right`, `left` | `Partial<HandXf>` overrides: `{ p, dir (fingertips), palm (normal), curl 0..1, hidden }` in camera space (left in real camera coords) |
| `phone`, `phoneProps` | show the phone (default on for holdPhone) |
| `bat` | show the bat for holdBat |

Tips: lag the hands 4 f behind the camera (build the hand group from `povCamera(frame-4)`); when the
lens FOV changes, scale the hand group by `tan(fov/2)/tan(fovRef/2)` so the mittens keep their size.

## `<Phone>` (src/rig/Phone.tsx)
0.074 × 0.156 m graphite slab, screen faces +Z. Props: `screenOn` 0..1, `texture` (custom screen),
`reel` (`{ progress, clock, dim, heartPulseAt }`), `reelFrame`, `glow` (screen light on hands/blanket).
The reel (`reel.ts`): night bus stop under a sodium lamp, tiny Sahur (game sprite) hopping on knocks at
loop-local 12/24/36 of a 72 f loop with a 6% punch-in; glyph UI only (no legible text except `03:00`).

## `<Lantern>` (src/rig/Lantern.tsx)
`height` (paper body), `cord`, `glow`, `light` (cd), `lightDistance`, `castShadow`. Origin = the hook.

## POV kit (src/pov)
- `povCamera(frame, fps, props)` → `{ position, quaternion, fov }` (pure). Props: `position`, `target`,
  `fov`, `breath` (`calm`/`scared`/`running`/`held`, blend with `breathB` + `breathMix`), `handheld`,
  `shake: [{frame, strength, decay}]`, `lookUp`, `lookSide`, `roll`, `seed`.
- `<PovCamera {...props}>` drives the default camera; `<ApplyCamera cam>`; `<StaticCamera>`; `<CamAttach cam>`.
- `projectToScreen(world, cam, w, h)`, `camLocalToWorld(local, cam)`.
- `<Post focus focusRange bokeh bloom bloomThreshold vignette chroma tone>`: DOF (world units) → bloom → CA → ACES → vignette.
- Overlays (`Overlays.tsx`): `<Eyelids open tint feather>` (1 open, 1.05 wide, 0 shut; bottom lid travels 15%),
  `<Grain amount seed>`, `<Vignette>`, `<Flash color opacity>`, `<WhiteOut amount>`, `<Grade lift gain tint>`,
  `<LightLeak x y radius opacity inner outer>`.

## Sets (src/sets)
`<Bedroom>` follows storyboard §3.4 (room 3.4 × 4.0 × 2.6 m; `MARKS` exports E0/E1/E2, phone, window,
door, Sahur's stand and kneel marks). Props: `mood`/`moodB`/`moodMix` (`night` | `blue` | `morning`),
`doorOpen` 0..1 (80° inward; hinge on the RIGHT jamb so the open leaf never hides the doorway from the
bed), `doorShake`, `hall` (blue hallway backlight + shadow-casting spot), `siren` + `sirenPhase` (red
sweep, 34 f pass every 96 f; `sirenEnvelope(t, phase)`), `floorFog`, `feedCeiling` (scrolling post
shapes on the ceiling), `windowBlue`, `refreshAt` (frames when every city screen blinks), `beam`,
`dust`, `dustJump` (lift every mote, metres: the far TUNG), `beam`, `bed`, `time`. The morning sun falls through the
curtain gap onto the floor where Sahur knelt (a visible shaft with dust). The city: 3 tower layers with ~40 screens all showing the same post (likes tick
every 12 f); in the morning the screens are gone. `<Cyclorama>` + `<StudioLights>` for sheets.

## Text (src/ui)
- `<SpeechLabel text start fpc pauses breaks end fade x y align size>`: Pixelify Sans, amber, 68 px
  (76 px vertical), typed 3 f/char with pop and jitter, dark halo. `charTimes()` gives the tok frames.
  `sahurLabelAnchor(sahurProps, cam, w, h, labelW)`: screen-right of his face at eye height (16:9), or
  centred above his head (9:16).
- `<Subtitle text start end>`: Montserrat 500, lowercase, soft white (34 px at y 960; 40 px at y 1380 in 9:16).
