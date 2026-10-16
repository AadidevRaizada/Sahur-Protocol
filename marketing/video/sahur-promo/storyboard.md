# Sahur Protocol promo "WAKE UP": storyboard

Format: 1920x1080, 60 fps, **4500 frames (75.0 s)**, plus a 9:16 vertical cut (1080x1920) re-rendered with a vertical camera (rules in section 9, a `Vertical:` note on every shot).
All frame numbers are absolute 60 fps frames unless marked "local". Durations are in frames (f) and seconds.
Build: Remotion 4 + `@remotion/three` (react-three-fiber) + `@react-three/postprocessing`. DOM overlays on top: lids, grade, leaks, flashes, white-out, subtitles, Sahur's label, memory panels, end card.
Determinism: no `Math.random`. Every jitter, flicker, particle, shake and glitch uses a seeded noise (`@remotion/noise` or `random(seed)`), driven by the frame. Postprocessing Noise and Glitch must be driven by the frame too (research §4).
Sources: `BRIEF.md` (beats, rules, confirmed decisions), `research.md` (meme, POV and sound research), `Sahur_Protocol.html` (cast, dialogue, title screen), `source-art/`.

Confirmed by the user: (1) Sahur's final TUNG pops the Bubble and costs him everything. (2) No Ahum Labs credit or branding anywhere. (3) The "Triple T" ending: wake in bed, `we did it.`, turn to where he should be, empty, `…sahur?`, hold, one distant TUNG, end card with the choir. (4) The choir mp3 (`public/audio/choir.mp3`) is approved for the end.

---------------------------------------------------------------------

## 1. Logline, emotional arc, one image per act

**Logline.** Asleep inside a feed that scrolls itself, you are woken by three knocks at your door. It's Tung Tung Tung Sahur: a weary wooden night-watchman who doesn't explain, only says *let's go*. He walks you through the slop, teaches you his rhythm, and spends himself on one last TUNG to pop the AI Bubble. You wake into an ordinary morning, alone, until one far-off TUNG answers.

**The arc in 5 lines.**
1. Lulled: small, warm, alone with a glowing phone, sinking into it.
2. Afraid: you wake inside the feed; the world is blue, and something knocks.
3. Held: the thing at the door came to wake you; warmth grows, and so does what it costs him.
4. Overwhelmed, then saved: you can't hurt the Bubble; he spends everything on one TUNG.
5. Awake: a plain morning, an empty bedside, a question, and a distant answer.

**Acts and their one image.**

| Act | Beats | Frames | One image |
|---|---|---|---|
| I. Asleep in the feed | 1-3 | 0-1080 | Sahur's silhouette in the blue doorway, bat resting on his shoulder, his head cropped by the top of the frame, two eye-glints. |
| II. The walk | 4-6 | 1080-2400 | A cream mitten resting in a wooden palm, with amber blooming between them in a blue room. |
| III. The pop | 7-9 | 2400-3720 | A small, cracked log pouring golden light from its cracks, bat raised, against a sky-filling iridescent bubble. |
| IV. Morning | 10-11 | 3720-4500 | The empty bedside in plain morning light, dust hanging in a sunbeam, framed exactly where he knelt. |

**Intensity and warmth over time** (each # = 10% of the scale):

```
frame    0   330  720 1080 1410  1890  2400   2976  3336 3644 3720  4200 4500
fear     .   ##   #### ###  .     .     ###    ####  .    #    .     .    .
energy   .   .    ##   #    ###   #     ###### ####  #    #### .     .    #
warmth   ##  .    .    ###  ##### ######  ##    .     ###  .    .     .    ##
         reel wake knock hand  walk  fire   fights bubble final white morning card
```

**Beat table.**

| # | Beat | Frames | Dur | Emotion | Light state |
|---|---|---|---|---|---|
| 1 | The reel | 0-330 | 5.50 s | lulled, sinking | L0 Night-Phone |
| 2 | Waking in a changed world | 330-720 | 6.50 s | unease, cold | black → L1 Blue Feed |
| 3 | Sahur arrives | 720-1080 | 6.00 s | fear | L1 → L1R Blue + Siren |
| 4 | "let's go. let's go." | 1080-1410 | 5.50 s | fear → first warmth | L1R → L2 First Amber |
| 5 | Bonding montage | 1410-1890 | 8.00 s | warm, growing | L3 Forest Warm + L3m memories |
| 6 | The fire | 1890-2400 | 8.50 s | intimate, a crack | L4 Firelight |
| 7 | The fights | 2400-2976 | 9.60 s | kinetic | L5a Forest → L5b Wastes → L5c Boardroom |
| 8 | The AI Bubble | 2976-3336 | 6.00 s | awe → overwhelm | L6 Core White |
| 9 | The final move | 3336-3720 | 6.40 s | stillness → sacrifice → white | L6 → L6A amber → L7 white |
| 10 | Wake up alone | 3720-4200 | 8.00 s | empty, real, a question, an answer | L7 eyelid ramp → L8 Neutral Morning |
| 11 | End card | 4200-4500 | 5.00 s | the call to wake up | L9 black and amber |

Frame check: 330 + 390 + 360 + 330 + 480 + 510 + 576 + 360 + 384 + 480 + 300 = 4500.

**The Paperman rule** (research §3): **`#ffb547` amber only ever comes from Sahur**: the glow of the joined hands, his lantern, his fire, his TUNG rings, his cracks, his label text and the end-card title. The Wastes use a dirtier sodium (`#c9862e`) and the golems keep their game colour at low emissive, so neither reads as his warmth. The morning has no amber at all.

---------------------------------------------------------------------

## 2. Colour and light script

**Global render.** ACES Filmic tone mapping, sRGB output, three r169 physical light units (intensities below are starting values; keep the *ratios*). Shadows (PCFSoft, 1024) only on each state's key light.
Post chain, in order: `DepthOfField` → `Bloom` (mipmapBlur) → `ChromaticAberration` → `ShockWave` (TUNG frames only) → `Vignette` → `Noise` (frame-seeded, overlay blend). Then in DOM: the grade layer (soft-light tint plus lift/gain via two blend divs), leaks, lids, text.
"Lift" is a `screen`-blended flat colour at 8%; "gain" is a `multiply`-blended flat colour at 100% over the highlights mask (or bake both into a 3D LUT per state if the builder prefers).

| State | Frames | Key | Fill | Rim / practicals | Fog and air | Bloom (int / thr / smooth) | DOF | CA | Vignette (offset / dark) | Grain | Exposure | Grade |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **L0 Night-Phone** | 0-330 | phone screen: RectAreaLight 0.07x0.15 m at the phone, `#f4efe6`, 4.0; screen emissive 1.6 | Hemisphere sky `#1a1d2e` / ground `#0a0806`, 0.04 | sodium sliver: SpotLight `#ff9a4a` 3 cd, angle 0.12, penumbra 0.8, from the curtain gap onto the ceiling | FogExp2 `#07090f` 0.06 | 0.6 / 0.80 / 0.2 | focus 0.39 m (phone), bokehScale 2 | 0 | 0.25 / 0.75 | 0.05 | 0.90 | warm-neutral: sat 0.90, contrast 1.05, lift `#08070a`, gain `#fff4e6` |
| **L1 Blue Feed** | 420-820 | window RectAreaLight 1.2x1.0 `#3a6dff` 8.0; ceiling SpotLight `#5b84ff` 40 cd with a scrolling-rectangles `map` (angle 0.9, from the sill to the ceiling) | Hemisphere `#0d1a4a` / `#020308`, 0.06 | door-crack strip RectAreaLight 0.9x0.02 `#3a6dff` 3.0; city post screens emissive `#ff3df0`→`#ffb3f2` 2.5 | FogExp2 `#0d1a4a` 0.10; dust Points 800, size 0.006, `#9fb6ff`, opacity 0.5, drift 0.02 m/s | 0.9 / 0.65 / 0.3 | focus window 3.3 m, bokeh 1.5 | 0.0008 | 0.20 / 0.85 | 0.07 | 0.85 | sat 0.55, contrast 1.15, lift `#0a1230`, gain `#9fb6ff` |
| **L1R Blue + Siren** | 820-1336 | L1, plus a hallway backlight RectAreaLight 0.9x2.0 `#4a7dff` 30 from 890 | as L1 | siren SpotLight `#ff2a3d` 25 cd, angle 0.35, a rotating sweep from outside the window, period 96 f | FogExp2 `#0d1a4a` 0.12; a floor fog layer 0.3 m deep, opacity 0.6, rolling in from the door 900-960 | 1.1 / 0.60 / 0.3 | focus on Sahur | 0.0015; +0.003 on knocks (decay 8 f) | 0.18 / 0.85, pulsing to 0.95 on heartbeats (attack 4, decay 20) | 0.08 | 0.85 | as L1; the red channel lifts during sweeps |
| **L2 First Amber** | 1336-1410 | PointLight `#ffb547` at the joined hands, 0 → 30 cd (distance 4, decay 2) over 1336-1380 | L1 fill -35% | siren off by 1360; window blue -35% | as L1R | 1.2, flaring to 4.0 (1396-1410); threshold 0.6 → 0.3 | hands, then face | 0.0008 | 0.25 / 0.75 | 0.06 | 0.85 → 0.95 | DOM radial soft-light `#ffb547`, 0 → 0.35 at the centre, radius 45% of the width |
| **L3 Forest Warm** | 1410-1890 (3D) | Sahur's lantern PointLight `#ffb547` 18 cd (distance 6, castShadow) | Hemisphere `#1f4d38` / `#050a07` 0.25; moon DirectionalLight `#9fd8c0` 0.25 | tree veins emissive `#3dff9d` 1.5 with a pixel-step flicker; 400 motes lit by the lantern | FogExp2 `#0e1f17` 0.06 | 1.1 / 0.60 / 0.3 | on Sahur | 0 | 0.30 / 0.60 | 0.05 | 1.00 | sat 1.05, contrast 1.08, lift `#06140c` (green shadows), gain `#ffe0b0` (warm highlights) |
| **L3m Memory** | 1490-1550, 1670-1730, 1810-1850 | (2D panel) | | | | | | | burn edges | 0.10 | | soft-light `#ffb547` 0.22 (boardroom: `#35e8ff` 0.15); a light-leak sweep (screen); film-burn edge vignette `#3a1406` multiply 0.8 with a noise mask re-seeded every 4 f; edge blur 6 px |
| **L4 Firelight** | 1890-2400 | fire PointLight `#ff8a2a` 40 cd at y 0.35, flicker x(1 ± 0.25) (seeded noise at 7 Hz plus 2 Hz); face light `#ffb547` 12 cd at y 0.8 | Hemisphere `#120d1c` / `#000000` 0.04 | rim DirectionalLight `#6a4cff` 0.3 from behind Sahur (the violet glitch forest, as in `bg_fire`); the hung lantern as bokeh; 120 embers | FogExp2 `#0b0806` 0.09 | 0.8 / 0.70 / 0.2 | Sahur 1.8 m (CU 1.5 m), bokeh 3 | 0; **0.012 during the glitch 2132-2135** | 0.20 / 0.90 | 0.06 | 0.85 | sat 0.95, contrast 1.20, lift `#050302`, gain `#ffd6a0` |
| **L5a Forest Fight** | 2400-2592 | lantern 18 cd; TUNG ring emissive `#ffb547` 4.0, with a PointLight 80 cd riding the ring front for 20 f | Hemisphere `#1f4d38` / `#050a07` 0.2 | DirectionalLight `#3dff9d` 0.6 from above-behind; slopling emissive `#ff3df0` 2.5; drone `#35e8ff` 3.0 | FogExp2 `#0b1410` 0.05 | 1.4 / 0.55 / 0.3 | off (deep focus) | 0.0008 base; spikes 0.004 | 0.30 / 0.70 | 0.06 | 1.00 | sat 1.25, contrast 1.20 |
| **L5b Wastes** | 2592-2784 | DirectionalLight `#c9862e` 1.2, low front-left (dirty sodium haze) | Hemisphere `#3a2a14` / `#0a0704` 0.15 | coolant river emissive `#35e8ff` 2.0 (a cyan key from below); hands `#b0a4ff` (wind-up `#ff4d5e`, emissive 3.0); wraith `#c07bff` at opacity 0.55-0.85 | FogExp2 `#2a1f10` 0.07; 600 dust particles | 1.3 / 0.55 / 0.3 | off | 0.001 | 0.30 / 0.70 | 0.07 | 1.00 | sat 1.10, contrast 1.25, teal-orange split: lift `#0a1418`, gain `#ffe0b8` |
| **L5c Boardroom** | 2784-2976 | RectAreaLight strip 6x0.3 m above the table, `#cfe9ff` 6 | Hemisphere `#1a2233` / `#05060a` 0.15 | rim DirectionalLight `#35e8ff` 0.8; yes-men `#3dff9d` 1.5; golem `#ffb547` 1.0; Valuation `#35e8ff` 4.0; table roughness 0.08 (mirror streaks); after 2886 the void outside is a flat `#d8dce8` | none inside (crisp, sterile) | 1.2 / 0.60 / 0.3 | off | 0.0008 | 0.30 / 0.70 | 0.05 | 1.00 | sat 0.90, contrast 1.30, cool lift `#070b14` |
| **L6 Core White** | 2976-3600 | Hemisphere `#ffffff` / `#e8e4f4` 1.2; DirectionalLight `#ffffff` 0.8, high | none | Bubble: MeshPhysicalMaterial, iridescence 1.0, iridescenceIOR 1.3, thickness range 100-800 nm, roughness 0.05, clearcoat 1, transmission 0.15, white studio envMap. Sahur's internal crack light PointLight `#ffb547`: 0 → 60 cd at 3500, 200 cd at 3572 | FogExp2 `#f7f5ff` 0.035; 500 white motes rising 0.05 m/s (weightless) | 1.0 / 0.85 / 0.2; 2.5 on TUNG frames (decay 20) | on Sahur | 0.0005 | 0.40 / 0.20 (barely) | 0.04 | 1.10, rising to 1.40 over 3168-3336 | sat 0.80 (the Bubble and Sahur are emissive or iridescent, so they keep their colour), contrast 0.90, lift `#e8e4f4` |
| **L6A Core Amber** | 3600-3644 | Sahur's internal light 200 → 600 cd | | his light becomes the world's key | | 2.5 → 4.0 | | | | | 1.40 → 1.80 | DOM warm soft-light `#ffb547` 0 → 0.40 |
| **L7 White-out** | 3644-3780 | DOM white `#ffffff` 3644-3730, then the light-through-eyelids ramp: `#ffd9c4` (3730-3744) → `#c0583c` (3744-3756) → `#2a0d08` (3756-3768) → `#140605` (3768-3780) | | | | | | | | | | |
| **L8 Neutral Morning** | 3780-4200 | window RectAreaLight 1.2x1.0 `#f3ead8` 10; DirectionalLight `#fff4e2` 1.4 at 12° elevation through the window: a sunbeam across the duvet and the floor | Hemisphere `#cfd8e4` / `#6b6258` 0.5 | no practicals; 300 motes in the beam (warm-white); outside, a real city (varied, unsynced windows, water tanks, laundry, **no screens showing the post**) | FogExp2 `#c9c6bd` 0.025 (just enough to show the beam) | 0.3 / 0.90 / 0.2 | per shot | 0 | 0.40 / 0.40 | 0.04 | 1.05 | "empty, a little cold, real": sat 0.85, contrast 1.0, lift `#10141c` (cool shadows), gain `#fff8ee`. No blue cast, no amber |
| **L9 End card** | 4200-4500 | DOM | | 14 amber motes at opacity 0.2 | | text glow only | | | radial `#000` 0.6 | 0.03 | | bg `#07090f` |

**Cross-fade and cut schedule.**

| From → to | Frames | How |
|---|---|---|
| L0 → black → L1 | 280-420 | the phone falls face-down (280) and the light dies; the lids open on L1 at 420 (no fade needed) |
| L1 → L1R | 820 (siren sweep starts), 890-940 (hallway backlight up with the door) | in-shot |
| L1R → L2 | 1336-1380 | outCubic, in-shot (the joined hands) |
| L2 → L3 | 1410 | cut hidden in the amber flare peak |
| L3 ↔ L3m | 1490, 1550, 1670, 1730, 1810, 1850 | 6-8 f dissolves with an amber leak flash |
| L3 → L4 | 1890 | match cut: the distant glow becomes the campfire |
| L4 → L5a → L5b → L5c | 2400, 2592, 2784 | hard cuts on bar downbeats |
| L5c → L6 | 2964-2976 | the void's white wipes in from the window (feathered, 12 f) |
| L6 → L6A | 3600-3644 | in-shot, inOutSine |
| L6A → L7 | 3644-3650 | flash to white, outExpo |
| L7 → L8 | 3730-3802 | the eyelid ramp, then the lids open |
| L8 → L9 | 4200 | hard cut to black |

---------------------------------------------------------------------

## 3. Cast, sets and props

Status: **BUILDING(a)** = rig agent (Sahur, hands, bedroom, POV kit); **BUILDING(b)** = enemy agent (enemies, bosses, Bubble, FX); **NEW** = nobody is building it yet.

### 3.1 Characters

| Item | Status | What this board needs |
|---|---|---|
| Sahur 3D model, bat | BUILDING(a) | Too tall and too thin, so the low POV makes him loom (research §1). Wood `#b0743a`, highlights `#e09a52`, shadows `#6b3d1a`. |
| Sahur expressions | BUILDING(a), confirm the list | WEARY (idle sprite: lids 70% closed at rest, brows inner up 8°) · EARNEST (brows level, lids 85%) · SMILE (mouth corners +3 mm, lids 75%) · AMUSED (smile, lids 70%, one head shake) · SAD-SMILE (corners +2 mm, lids 50%, brows inner up 6°) · FIERCE (attack sprite: brows down-inward 18°, eyes wide) · STRAINED (fierce, one lid 15% lower) · CALM (lids 60%, brows relaxed, small smile). Plus a slow blink (close 4 f, hold 2, open 6) and a jaw flap of 2 mm per syllable for his labels. |
| Sahur poses | BUILDING(a): walk, bat swing, offer-hand, hand-on-shoulder | **NEW poses**: kneel on one knee to the POV's eye-line; duck under a lintel; run; leap; land; sit on a log; sit on a bench; lift the bat off his shoulder; tap a stump with the bat; look at his own raised hand; knuckle-tap on his own log; the head-tap mime ("cover your ears"); stumble and catch himself on the bat; drop to one knee; pull-up (standing up while holding your hand). |
| Sahur damage states | NEW | Emissive amber `#ffb547` crack decals in 3 stages (hairline at 2700; spread to 3 cracks at 2904; a fully cracked log at 3572); wood-chip and wood-chunk particles; an internal PointLight that can reach 600 cd; the 4-frame "glitch hand" (static-noise texture swap, RGB split, a 6 px horizontal tear). |
| Lantern | NEW (INVENTED) | A small paper lantern (a 0.12 m cylinder, emissive `#ffb547` 2.0, PointLight 18 cd) hanging from the bat's end on a 0.15 m cord, swinging with secondary motion. It carries his amber through the montage and the fights. |
| Blob mitten hands | BUILDING(a): hold phone, reach, take hand, hold bat, defensive recoil | **NEW poses**: phone-slip (the hands relax and drop away); push into the mattress (both, bottom corners); clap; squeeze the bat; tap with the bat (both); swat (right, a 70° arc in 6 f); cover the ears (both mittens at the frame edges, palms inward); rest on the phone; reach into empty space. Cream `#e8e4d8`, soft rounded, no outline in 3D; they lag the camera by 4 f (research §4). Blur foreground edges 3-4 px (lessons). |
| Slopling, drone, wraith, scraper hand, yes-man, golem | BUILDING(b) | As the game: see BRIEF. NEW variants: a yes-man smile-crack, the golem's split into two standing halves, a jargon bolt (cyan dash with unreadable pixel glyphs inside). |
| ECHO, THE SCRAPER, THE VALUATION | BUILDING(b) | NEW variants: Echo's mask crack and after-image scatter; the Scraper's ring shatter (60 shards); the Valuation as extruded 3D `$999B` text (Press Start 2P letterforms, 0.3 m deep), an up-only chart polyline and a `+∞%` tag, with digits that crack and topple. |
| THE AI BUBBLE | BUILDING(b): inflate, leak, pop, face, hype rings | NEW: a dent (a 6% inward dimple travelling with a ring front); a seam rip (25 m, leaking violet `#8f7bff`); a petal-shred pop (400 spinning iridescent pieces); three hype rings whose letters can shed like confetti; optional temptation reflections in its film (the blue bedroom and the phone reel at 20% opacity). |

### 3.2 Sets

| Set | Status | Notes |
|---|---|---|
| Bedroom: NIGHT / BLUE / MORNING | BUILDING(a) | The layout below is the one this board assumes. |
| Bedroom door that opens, with a hallway backlight volume | NEW unless (a) has it | Hinged on its left edge, swing 0 → 80° inward; a blue RectAreaLight and floor fog behind it. |
| Ceiling "feed" light projector | NEW | A SpotLight with a canvas-texture `map` of soft rounded rectangles (aspect 1:1.6) scrolling upward in sync: a new one every 30 f, 0.35 m/s. |
| Window city, BLUE state | NEW unless (a) has it | 3 depth layers of blocky towers (`#1a2233` → `#2b3446`), about 40 screens all showing **the same post** (a magenta-pink image card, an avatar circle, a heart, a 3-block like-counter; no legible text). All screens refresh together on cue; the like-counters tick together every 12 f. |
| Window city, MORNING state | NEW unless (a) has it | The same skyline, real and uneven: random lit windows, water tanks, laundry lines, no screens showing the post. |
| Phone with the reel | NEW (phone prop may be in (a)) | 0.072 x 0.152 m; screen = a render target 540x1140 of a mini scene: a **night bus stop** under one sodium lamp, a tiny Sahur beside the sign pole, bat on shoulder, staring (the meme's first image, research §1), hopping 3 cm on each tinny knock; vertical-video UI glyphs (a progress line, heart, speech bubble, arrow, two grey caption bars). Optional status-bar `03:00` (sahur time). |
| Hype Cycle Forest | NEW | Dark trunks with `#3dff9d` vein lines that flicker in pixel steps, moss, a stump, fallen logs, glitch crickets. Clearings for S15, S17, S21 and the fights. |
| Bus-stop shelter in the forest | NEW | A rusted roof on two posts, a bench, a sign disc on a pole (blank), a hook for the lantern; glitch drizzle (600 thin cyan-white streaks). |
| Fire clearing | NEW (part of the forest) | A campfire with flame cards or a shader, 2 logs, 120 embers, violet-veined trees behind (match `bg_fire.jpg`). |
| Server Farm Wastes | NEW | Ruined rack rows with dead LEDs, cracked ground, a coolant-river channel (an emissive cyan water plane with ripples), amber dust storm. |
| Boardroom of Broken Promises | NEW | A long glossy black table (roughness 0.08), 12 chairs, glass walls that can shatter outward; **nothing** outside (flat `#d8dce8`, no horizon). |
| The Core | NEW | An endless white plane, white fog, rising white motes. |

### 3.3 Overlays and FX

| Item | Status | Notes |
|---|---|---|
| Eyelids (top and bottom) | BUILDING(a) POV kit | `lids(open)`: 1 = fully open, 1.05 = wide (slight overscan), 0 = closed. The bottom lid travels 15% of the top lid's travel. Soft curved edge, feather 24 px, colour `#1a0f0c`; lit red-orange during the L7 ramp. Real blinks close fast and open slower (research §4). |
| Breathing, handheld, shake, look-up | BUILDING(a) POV kit | Parameters in section 6. |
| TUNG shockwave, hit sparks, slop splats | BUILDING(b) | Plus `ShockWave` postprocessing on TUNG frames. |
| Lens splat (DOM) | NEW | A magenta decal on the "lens" that slides down and fades. |
| Water ring wall, glass blowout | NEW | For TUNG #2 and TUNG #3. |
| Memory panel | NEW | A full-bleed 2D layer: Ken Burns, light-leak sweep, film-burn edges, grain, edge blur, 6-8 f dissolves. Uses `bg_river.jpg`, `bg_dawn.jpg`, `bg_boardroom.jpg` only. Not used: `bg_apartment` (our bedroom replaces it), `bg_fire` (the fire is 3D), `bg_core` (the hooded kid's face is in close-up). |
| Light leaks, flashes, white-out, eyelid-glow ramp | NEW | DOM. |
| Subtitles (player) | NEW | Section 5. |
| Sahur's in-world label | NEW | Section 5. |
| End card | NEW | Section 8. |

### 3.4 The bedroom layout this board assumes

Metres, Y up, origin = floor at the room centre; the room is 3.4 (x) by 4.0 (z) by 2.6 (y). Yaw 0 looks toward -z (the far wall); positive yaw turns right; positive pitch looks up. If the built set differs, keep these relationships: from the pillow, the window and the door are both visible in one 60° frame; Sahur's kneel mark is 0.66 m from the eye at about yaw +61°.

| Thing | Position |
|---|---|
| Bed | against the left wall: x -1.7 to -0.7, z -0.1 (foot) to +1.9 (head); mattress top y 0.50 |
| E0, eye lying on the pillow | (-1.20, 0.80, 1.45) |
| E1, eye propped up | (-1.20, 1.02, 1.30); sinks to 0.92 in fear (S09-S11) |
| E2, eye standing at the bedside | (-1.00, 1.10, 1.05) |
| Phone held (B1) | centre (-1.20, 0.98, 1.10), 0.39 m from E0 |
| Phone on the chest (B10) | (-1.20, 0.62, 1.12), face down |
| Window | far wall, centre (-0.90, 1.50, -2.00), 1.2 x 1.0 |
| Door | far wall, centre (0.60, 1.03, -2.00), 0.9 x 2.05, hinge at x 0.15, opens inward |
| Sahur's standing mark S (B3) | feet (-0.20, 0, 0.20); eyes about (-0.20, 1.45, 0.20) |
| Sahur's kneel mark K (B4, and the empty spot in B10) | feet (-0.40, 0, 0.80); head when kneeling (-0.62, 0.98, 0.98) |

---------------------------------------------------------------------

## 4. Shot list (frame-exact)

**Notation.** `pos` = camera position (set metres), `look` = look target, `vFOV` = vertical field of view for 16:9 in degrees, `breath(period f, pitch ±°, y ±mm)`, `hh(°, Hz)` = handheld (seeded noise), `shake(frame, peak °, decay f)` = an impulse decaying exponentially, `lids(x)`, `blur(px)` = DOM/DOF softness. Easings: `inOutSine`, `inOutCubic`, `outCubic`, `outExpo`, `inQuad`, `outBack(s)` (section 6). "V-match" = the default vertical camera (section 9).

### 4.1 Summary

| Shot | Frames | Dur (f) | Beat | Light | Text |
|---|---|---|---|---|---|
| S01 The reel | 0-132 | 132 | 1 | L0 | (diegetic `03:00`, optional) |
| S02 Heavy | 132-246 | 114 | 1 | L0 | |
| S03 The slip | 246-330 | 84 | 1 | L0 → black | |
| S04 Black | 330-420 | 90 | 2 | black | |
| S05 The ceiling scrolls | 420-540 | 120 | 2 | L1 | |
| S06 The window | 540-640 | 100 | 2 | L1 | |
| S07 Every screen | 640-720 | 80 | 2 | L1 | |
| S08 TUNG. TUNG. TUNG. | 720-860 | 140 | 3 | L1 → L1R | |
| S09 The door opens | 860-960 | 100 | 3 | L1R | |
| S10 Silhouette | 960-1010 | 50 | 3 | L1R | |
| S11 He is tall | 1010-1080 | 70 | 3 | L1R | |
| S12 He kneels, he speaks | 1080-1230 | 150 | 4 | L1R | label `let's go. let's go.` 1140-1312 |
| S13 His hand, your hand | 1230-1336 | 106 | 4 | L1R | (label holds) |
| S14 Amber | 1336-1410 | 74 | 4 | L2 | |
| S15 The walk | 1410-1490 | 80 | 5 | L3 | |
| S16 Memory: river | 1490-1550 | 60 | 5 | L3m | |
| S17 The rhythm, shown | 1550-1670 | 120 | 5 | L3 | |
| S18 Memory: dawn | 1670-1730 | 60 | 5 | L3m | |
| S19 The bus stop | 1730-1810 | 80 | 5 | L3 | |
| S20 Memory: boardroom | 1810-1850 | 40 | 5 | L3m (cool) | |
| S21 Toward the glow | 1850-1890 | 40 | 5 | L3 | |
| S22 The fire | 1890-1980 | 90 | 6 | L4 | |
| S23 The rhythm, taught | 1980-2070 | 90 | 6 | L4 | |
| S24 His hand | 2070-2176 | 106 | 6 | L4 (glitch) | |
| S25 will you disappear? | 2176-2270 | 94 | 6 | L4 | subtitle 2176-2256 |
| S26 sleep. tomorrow, TUNG. | 2270-2400 | 130 | 6 | L4 | label 2282-2396 |
| S27 Slop | 2400-2424 | 24 | 7 | L5a | |
| S28 Jargon | 2424-2448 | 24 | 7 | L5a | |
| S29a Run with him | 2448-2472 | 24 | 7 | L5a | |
| S29b Wind-up | 2472-2496 | 24 | 7 | L5a | |
| S30a TUNG #1 | 2496-2520 | 24 | 7 | L5a | |
| S30b The ring | 2520-2544 | 24 | 7 | L5a | |
| S31 Turn | 2544-2556 | 12 | 7 | L5a | |
| S32 ECHO flash | 2556-2592 | 36 | 7 | L5a | |
| S33 Landing | 2592-2616 | 24 | 7 | L5b | |
| S34 The hand | 2616-2652 | 36 | 7 | L5b | |
| S35 Wraith | 2652-2688 | 36 | 7 | L5b | |
| S36a TUNG #2 | 2688-2712 | 24 | 7 | L5b | |
| S36b The first crack | 2712-2736 | 24 | 7 | L5b | |
| S37 He stumbles | 2736-2748 | 12 | 7 | L5b | |
| S38 THE SCRAPER flash | 2748-2784 | 36 | 7 | L5b | |
| S39 The table | 2784-2808 | 24 | 7 | L5c | |
| S40 The golem | 2808-2832 | 24 | 7 | L5c | |
| S41a On the table | 2832-2856 | 24 | 7 | L5c | |
| S41b Wind-up | 2856-2880 | 24 | 7 | L5c | |
| S42a TUNG #3 | 2880-2904 | 24 | 7 | L5c | |
| S42b The cost | 2904-2928 | 24 | 7 | L5c | |
| S43 Reach | 2928-2940 | 12 | 7 | L5c | |
| S44 THE VALUATION flash | 2940-2976 | 36 | 7 | L5c → white | (diegetic `$999B`, `+∞%`) |
| S45 The Core | 2976-3072 | 96 | 8 | L6 | (diegetic ring phrases) |
| S46 You can't hurt it | 3072-3168 | 96 | 8 | L6 | |
| S47 It grows | 3168-3336 | 168 | 8 | L6 | |
| S48 A hand on your shoulder | 3336-3456 | 120 | 9 | L6 | (mime, no text) |
| S49 TUNG | 3456-3560 | 104 | 9 | L6 | |
| S50 TUNG | 3560-3644 | 84 | 9 | L6 → L6A | |
| S51 POP | 3644-3720 | 76 | 9 | L7 white | |
| S52 White to eyelids | 3720-3780 | 60 | 10 | L7 ramp | |
| S53 Eyes open, the phone | 3780-3846 | 66 | 10 | L8 | |
| S54 we did it. | 3846-3916 | 70 | 10 | L8 | subtitle 3846-3916 |
| S55 Where he should be | 3916-4000 | 84 | 10 | L8 | |
| S56 …sahur? | 4000-4080 | 80 | 10 | L8 | subtitle 4000-4070 |
| S57 TUNG | 4080-4200 | 120 | 10 | L8 | |
| S58 End card | 4200-4500 | 300 | 11 | L9 | end card |

Fight cuts (S27-S44) are 12-36 f, all on the 150 BPM grid (24 f beats, 12 f half-beats). Montage cuts sit on the 90 BPM grid (40 f beats, two cuts on the off-beat 8th).

---

### BEAT 1. THE REEL (0-330). Light L0. One continuous take (S01-S03).

#### S01: 0-132 (2.20 s) The reel.
- **Set and light:** bedroom NIGHT, L0.
- **Camera:** `pos` E0 (-1.20, 0.80, 1.45); `look` = the phone centre (-1.20, 0.98, 1.10) (about 0.39 m away, pitch about +27°); vFOV 40; DOF focus 0.39 m, bokehScale 2 (the room behind goes soft); `breath(240, ±0.35, ±4)`; `hh(0.08, 0.4)` (arms holding the phone). No roll.
- **Action:**
  - 0-30: fade from black (DOM black 1 → 0, outCubic). `lids(0.92)` from frame 0 (the soft top-lid edge just visible).
  - The phone is held portrait in both mittens, which wrap the left and right bezels with the mitten "thumbs" over the front edge at the lower third. The mittens are lit from the screen. The phone fills about 46% of the frame height, centred at x 50%, y 52%.
  - The reel loops every 72 f: knocks at local 12, 24, 36, then a squeaky two-note "sa-hur" at 48 and 56 (no voice). On each knock, tiny Sahur hops 3 cm and the reel camera punches in 6%. A white progress line advances once per loop. Absolute knock frames: 12/24/36, 84/96/108, 156/168/180, 228/240/252, then the muffled 300/312/324.
  - 70-84: the right mitten's thumb twitches up 6 mm (an aborted scroll) and returns.
  - 100: the heart glyph pulses once.
- **Sahur (on the phone):** idle stare, bat on shoulder, hopping on the knocks.
- **Text:** none. Diegetic, optional: a tiny `03:00` in the phone's status bar (INVENTED, research §6).
- **SFX:** 0 night room tone (-52 dB); 12 → the reel audio (tinny: band-pass 1-5 kHz, mono, small-speaker distortion); 70 thumb tick on glass; slow breathing.
- **Transition out:** continuous into S02.
- **Vertical:** V-match (vFOV 65.8°); the phone stays centred; the vertical gains ceiling above (with the sodium sliver) and duvet below. No offset.

#### S02: 132-246 (1.90 s) Heavy.
- **Camera:** as S01. The phone drifts down 4 cm and tilts back 8° (top away) over 132-246 (inOutSine). The DOF focus stays at 0.39 m, so the phone slides out of focus. Breath period 240 → 300.
- **Action:** blink 1: close 140-146 (1 → 0, inQuad), hold 146-150, open 150-162 (to 0.80, outCubic). Blink 2: close 196-204, hold 204-216, open 216-232 (to only 0.62): each half-blink opens a little less (research §4). After blink 2, `blur(2)`.
- **SFX:** reel knocks 156/168/180 and 228/240/252. While `lids < 0.2`, the reel audio low-passes to 2.5 kHz (the "falling asleep" filter).
- **Transition out:** continuous.
- **Vertical:** as S01.

#### S03: 246-330 (1.40 s) The slip.
- **Action:**
  - 246-270: lids sink 0.62 → 0.18 (inOutSine).
  - 262-280: the mittens relax; the phone tips forward about its bottom edge (0 → -100°, inQuad) and drops 22 cm out of the bottom of the frame. The mittens slide out of frame 266-286.
  - 280: the phone lands face down on your chest (off-frame). The screen light is cut 280-283 (its RectAreaLight and emissive go to 0); the room goes almost black, with only the sodium sliver on the ceiling.
  - 283-296: lids close fully. 296-330: black.
- **SFX:** 280 soft fabric thud; 286 a long sleepy exhale; the reel's last triplet at 300/312/324, muffled under cloth (low-pass 350 Hz, -10 dB).
- **Transition out:** black continues into S04.
- **Vertical:** as S01.

### BEAT 2. WAKING UP IN A CHANGED WORLD (330-720). Black → L1.

#### S04: 330-420 (1.50 s) Black.
- **Image:** black (`lids(0)`).
- **Audio:** **330-360: true digital silence.** 360-420: the feed hum fades in (see section 7). 384: a siren far away (a Doppler wail, 3.2 s, low-passed at 1.5 kHz: heard through walls).
- **Transition out:** the lids open into S05.
- **Vertical:** n/a.

#### S05: 420-540 (2.00 s) The ceiling scrolls.
- **Set and light:** bedroom BLUE, L1. The phone is off-frame on your chest, dark.
- **Camera:** E0; `look` straight up at the ceiling (-1.10, 2.60, 1.10) (pitch about +78°); vFOV 50; roll -4° (head on a pillow); `breath(180, ±0.5, ±6)`.
- **Action:**
  - Lids: crack 420-436 (0 → 0.12: a slit of cold blue); shut 436-444; open 450-500 (0 → 0.65, outCubic); blink 510-518; open 518-540 (to 1.0). `blur(12 → 0)` over 450-540 (outCubic).
  - The ceiling: the blue window light lands on it with the projector `map`: 6-8 soft rounded rectangles (post-card shaped) drift upward across the ceiling in perfect sync, a new one every 30 f (at 0.35 m/s): **the feed is scrolling itself on your ceiling.** Dust motes hang almost frozen (0.02 m/s).
- **Audio:** the whole mix starts low-passed at 400 Hz (underwater, research §5) and opens to full over 450-540 as the eyes open. 452: an uneasy inhale.
- **Text:** none.
- **Transition out:** continuous into S06.
- **Vertical:** V-match (79.3°). The rectangles travel bottom to top in the 9:16 frame, so it reads like a phone feed. Keep.

#### S06: 540-640 (1.67 s) The window.
- **Camera:** 540-600: rise from E0 to E1 (-1.20, 1.02, 1.30); the look target sweeps from the ceiling to the window centre (-0.90, 1.50, -2.00) (yaw about -5°, pitch about +8°), inOutCubic 60 f; roll -4° → 0; vFOV 50 → 42. 600-640: hold with a slow push (dolly z -0.06, inOutSine).
- **Hands:** both mittens enter from the bottom corners 546-580, pressing into the mattress (pushing yourself up), lagging the camera by 4 f; they exit downward 596-616.
- **Action:** through the window: the grey city where about 40 screens all show **the same post**. 612 and 636: every screen refreshes at the same instant (a 2 f white blink, then the same post again). The like-counters tick in sync every 12 f. The blue beam from the window lies across the duvet, full of hanging dust.
- **SFX:** 548 duvet rustle; 612 and 636 synced notification pings (40 voices at once, distant, glassy E6); hum.
- **Transition out:** continuous into S07.
- **Vertical:** V-match for vFOV 42 = 68.6°. The window (about 20° wide at 3.3 m) sits inside the vertical's 42° width.

#### S07: 640-720 (1.33 s) Every screen.
- **Camera:** E1; dolly 0.10 m toward the window (640-700, inOutSine); 680-720 the yaw drifts right from -5° to +10° (inOutSine) so the dark door enters the right of the frame. vFOV 42. `breath(120, ±0.5, ±6)` (shallower).
- **Action:** 660 and 684: the screens refresh together again. The motes in the beam shimmer.
- **SFX:** 660 and 684 synced pings; 672 a second siren passes nearer (Doppler); hum.
- **Transition out:** continuous into S08.
- **Vertical:** as S06; the door is not in the 9:16 frame until the whip in S08 (fine).

### BEAT 3. SAHUR ARRIVES (720-1080). L1 → L1R.

#### S08: 720-860 (2.33 s) TUNG. TUNG. TUNG.
- **Camera:** E1. 720-740 hold (yaw +10°), stillness. **740 KNOCK 1:** whip 740-752, yaw +10° → +32° onto the door centre (0.60, 1.03, -2.00), outExpo, with CameraMotionBlur (6 samples); vFOV 42 → 50 during the whip (the whole door plus a strip of wall); `shake(740, 0.5, 14)`; lids flinch to 0.8 for 4 f (740-744). **780 KNOCK 2:** `shake(780, 0.6, 16)`. **820 KNOCK 3:** `shake(820, 0.7, 18)`. From 824: `breath(60 → 48, ±0.8, ±10)`, `hh(0.3, 1.5)` plus a tremor of 0.1° at 9 Hz.
- **Action:** each knock: the door shudders 3 mm in z (6 f); dust puffs from the lintel (40 particles under gravity); the blue strip under the door flickers (intensity x1.6 for 4 f). **820: the siren light begins**: a red sweep through the window every 96 f (passes 820-850, 916-946, 1012-1042, 1108-1138, 1204-1234, 1300-1330).
- **Sahur:** not seen. The knock is care, not threat (research §1): heavy but even, never frantic.
- **SFX:** knocks 740 / 780 / 820 (three, 40 f apart = the 90 BPM that the montage will walk to); dust trickle 742 / 782 / 822; heartbeat starts at 790 (then 832); fast breathing from 824.
- **Transition out:** continuous into S09.
- **Vertical:** V-match (79.3°): the tall door fits full height. The vertical is strongest here.

#### S09: 860-960 (1.67 s) The door opens.
- **Camera:** E1 sinking: y 1.02 → 0.96 over 870-950 (outCubic: you shrink down); look = the door; vFOV 50; `breath(44, ±0.9, ±10)`.
- **Action:** 872: the handle turns (35° over 6 f). 890-940: the door swings inward 0 → 80° (outCubic). Bright blue hallway light floods the widening gap (L1R backlight); floor fog rolls in and reaches the bed by 960; bloom blooms on the door edge. 940-960: **the doorway is an empty glowing rectangle. Hold 20 f of nothing.**
- **SFX:** handle 872; a long creak 890-940; low fog hiss 900-960; heartbeats 870, 904, 934, 960.
- **Transition out:** continuous into S10.
- **Vertical:** as S08.

#### S10: 960-1010 (0.83 s) Silhouette.
- **Action:** 960: Sahur steps into the light from the right side of the doorway: a tall black silhouette with a blue rim along the log edge, **the bat resting on his right shoulder** (never raised at you, research §6), two specular eye-glints. With the camera pitched +6°, his eyes sit 12% from the top of the frame and the top of his log is cut off (research §4). 976-996: he ducks under the lintel (head dips 10 cm) and steps in; foot plant at 990.
- **Camera:** 962-1000: the POV shrinks back: z +0.10, y 0.96 → 0.92 (outCubic). Both mittens come up defensively from the bottom corners 966-982 (recoil pose, palms out, at 18% and 82% of the frame width, in the bottom 30%), trembling 3 mm at 8 Hz. 960-964: `lids(1.0 → 1.05)` (eyes wide).
- **SFX:** 962 a sharp inhale; 984 heartbeat; 990 footstep (wooden clonk plus a floorboard creak).
- **Transition out:** continuous into S11.
- **Vertical:** central silhouette. `V.handsInset 0.12` (the recoil mittens move in to 30% and 70% of the landscape width so they show at the 9:16 edges).

#### S11: 1010-1080 (1.17 s) He is tall.
- **Action:** second step at 1018; he stops on mark S, beside the foot of the bed, about 1.5 m away, looking down at you. 1012-1042: the red siren sweep crosses him (his face flares red, then back to blue). 1036-1052: head tilt 7° to his right (curious). 1058-1064: slow blink.
- **Sahur:** WEARY (not menacing): lids heavy, brows inner up 8°. Bat on shoulder.
- **Camera:** look = Sahur's eyes (pitch about +20°); vFOV 50 → 58 (1010-1040) so he fits from head to knees; `hh(0.4, 1.5)`; `breath(44, ±0.9, ±10)`.
- **SFX:** footstep 1018; heartbeats 1010, 1036, 1062 (every 26 f); fast breath; his blink "tk" at 1060 (very quiet).
- **Transition out:** continuous into S12.
- **Vertical:** vFOV 58 → V-match capped at 80°: head to shins. `V.handsInset 0.12`.

### BEAT 4. "let's go. let's go." (1080-1410). L1R → L2.

#### S12: 1080-1230 (2.50 s) He kneels. He speaks.
- **Action:** 1080-1128: he steps 0.4 m to the bedside mark K and lowers onto one knee to your eye-line (research §4): hips and knees bend, the log tilts forward 12°, and his head descends from 1.55 m to 0.98 m and comes to 0.66 m from your eye (inOutCubic 48 f). The bat stays on his shoulder. 1128-1140: he looks into the lens.
- **Sahur:** EARNEST. Jaw flaps 2 mm on the syllables at 1140, 1152, 1191, 1203.
- **Camera:** follows his head: yaw +42° → +61°, pitch +20° → -1°, vFOV 58 → 40 (inOutCubic 48), a slow push of focal length as he comes close. DOF racks to his eyes (0.66 m) by 1128. 1084-1100: a 2° recoil (pitch up, z +0.03); the mittens tremble.
- **Text:** label **`let's go. let's go.`**: `let's go.` types 1140-1167 (9 characters, 3 f each), pause 1167-1191 (24 f), ` let's go.` types 1191-1221 (10 characters). Hold to 1300; fade 1300-1312. Anchored at his head bone + (+0.22 m right, +0.10 m up).
- **SFX:** 1124 knee on the floorboard; a "tok" per letter (12 toks, none on spaces or punctuation); heartbeats 1088, 1114, 1142, 1172, 1206 (slowing from 26 to 34 f apart).
- **Transition out:** continuous into S13.
- **Vertical:** V-match (65.8°). In 9:16 the label anchors **above** his head, centred (rule in section 9).

#### S13: 1230-1336 (1.77 s) His hand. Your hand.
- **Action:** 1230-1262: he holds out his LEFT hand (the right still holds the bat), palm up, peg fingers open, into the lower centre of the frame at 0.45 m from the lens (`outBack(0.8)`, 6% overshoot). 1290-1314: your RIGHT mitten rises from the bottom-right corner toward it (outCubic). 1314-1326: **it stops 6 cm short** and trembles 2 mm at 8 Hz; your breathing stops (1310-1336). 1320: his brows lift 3° (go on). 1326-1336: the mitten closes the gap. **Contact at 1336.**
- **Camera:** pitch -1° → -10° (1236-1270) to frame his hand (lower third) and his face (upper third); DOF focus racks to the hand (0.45 m) over 1240-1262 and stays there.
- **Text:** the label holds (to 1312).
- **SFX:** heartbeats 1248, 1290; held breath (no breath sound) 1310-1336; 1336 a soft mitten-on-wood "pff-tok".
- **Transition out:** continuous into S14.
- **Vertical:** V-match; both hands sit inside the centre square.

#### S14: 1336-1410 (1.23 s) Amber.
- **Action:**
  - **1336: amber enters for the first time**: the L2 PointLight at the joined hands, 0 → 30 cd over 1336-1380 (outCubic), with a bloom halo; his face is lit warm from below; the DOM radial warm grade rises.
  - 1336-1348: his peg fingers close over your mitten.
  - 1336-1360: the siren sweep stops mid-pass and dims out; window blue -35% (1336-1380).
  - 1342: you exhale (pitch -1.2°, y -15 mm over 40 f); breath period → 150 (calm). Your breath slows on screen (research §4).
  - 1350-1400: he stands and pulls you up: the camera moves from E1 to E2 (inOutCubic 50 f); look = his eyes as he rises back to 1.45 m (pitch about +25°): you look up at him again, now in trust, not fear.
  - 1376-1388: **his first smile** (SMILE: corners up 3 mm, lids soften to 75%).
  - 1396-1410: the amber flare: bloom 1.2 → 4.0, threshold 0.6 → 0.3; a DOM light leak (radial `#ffb547` → `#ff8a2a`, screen, 0 → 0.85) grows from the joined hands and fills the frame by 1410.
- **SFX:** the first warm chord swells from 1336 (section 7); the siren audio ducks -20 dB 1336-1380; the hum fades out 1340-1400; exhale 1342; bed creak 1352; his wooden knee creak 1356; heartbeats 1350, 1410 (resting).
- **Transition out:** the cut to S15 sits at the flare peak (1410); the leak resolves 1410-1426.
- **Vertical:** V-match; the leak is centred.

### BEAT 5. BONDING MONTAGE (1410-1890). 90 BPM (beat = 40 f, bar = 160 f; bars at 1410, 1570, 1730). L3 + L3m.

#### S15: 1410-1490 (80 f, 2 beats) The walk. 3D, Hype Cycle Forest.
- **Camera:** walking POV, eye height 1.05; Sahur walks 1.2 m ahead and 0.6 m to the left, bat on his shoulder with the lantern swinging from its end (his amber key). Look target 2 m ahead past his shoulder; vFOV 48; walk bob on the beat: period 40 f, y ±12 mm, roll ±0.6°, yaw ±0.4°; dolly forward 1.1 m/s. Your mittens swing at the bottom edges in counter-phase.
- **Action:** 1410-1426: the light leak resolves into the forest (glitch trees with flickering green veins, amber motes in the lantern light). 1440-1456: Sahur glances back over his shoulder (head turns 70°, leading his shoulders' 15° turn by 6 f) and nods once at 1456, then faces forward.
- **Sahur:** content; lids 80%.
- **SFX:** your soft footsteps on the beat (1410, 1450), his wooden clonks on the off-beats (1430, 1470); lantern creak; glitch crickets (8-bit chirps).
- **Transition out:** cut on 1490 with a 6 f amber leak flash.
- **Vertical:** V-match (76.7°). Sahur is at x 30% in 16:9, outside the centre square, so `V.yaw -8°` puts him on the 9:16 left third.

#### S16: 1490-1550 (60 f, 1.5 beats) Memory: the coolant river (`bg_river.jpg`).
- **Panel:** full-bleed MemoryPanel. Ken Burns: scale 1.10 → 1.22, pan x -2% → +6% (toward the river light on the right) over 60 f (linear). The hooded kid (left of centre, seen from behind) stays a silhouette and slides out of frame left by 1530 as the push moves right. L3m grade: warm soft-light, a leak sweep from the right edge (0 → 0.5 → 0), film-burn edges, grain 0.10. Dissolve in 1490-1498, out 1544-1550.
- **SFX:** a soft tape-flutter whoosh at 1490; river water bed (-30 dB).
- **Vertical:** crop centred on Sahur (panel x 0.49) and the river; the kid falls outside the crop.

#### S17: 1550-1670 (120 f, 3 beats) The rhythm, shown. 3D forest clearing.
- **Camera:** standing POV, eye 1.05, 1.6 m from Sahur, who stands at a mossy stump front-centre. vFOV 44; look = his head and bat (pitch +10°); `breath(150, ±0.3, ±4)`; `hh(0.08, 0.3)`.
- **Action:** 1550-1566: he hangs the lantern on a branch and lifts the bat off his shoulder. He taps the stump: **TUNG at 1570, 1610, 1650** (beats 1-2-3 of bar 2). Each tap: the bat lifts 18 cm (10 f anticipation), strikes (3 f), and a small amber ring rolls across the moss (radius 0 → 1.2 m over 20 f, opacity 0.8 → 0); the motes jump 2 cm; the tree veins pulse (x1.5 for 8 f). 1654: your two mittens clap, **4 frames late**. 1656: he looks at you, brows up. 1660-1670: AMUSED: he smiles and shakes his head once.
- **SFX:** three small warm taps 1570, 1610, 1650 (the score's woodblock drops out for this bar so his taps *are* the rhythm); 1654 a soft, late mitten clap.
- **Transition out:** cut on 1670.
- **Vertical:** V-match (71.4°); Sahur and the stump are centred.

#### S18: 1670-1730 (60 f, 1.5 beats) Memory: dawn (`bg_dawn.jpg`).
- **Panel:** Ken Burns scale 1.05 → 1.16 toward the sun (panel x 0.42, y 0.38); the kid and Sahur are silhouettes from behind; the bat leans on the rock at the right. Add a DOM sun flare (radial `#fff1cf`, screen, 0.35, breathing ±0.05). Same treatment as S16, with the leak from the left.
- **SFX:** tape-flutter whoosh 1670; a far bird (in tune; the dream's birds are still pretty).
- **Vertical:** crop centred on Sahur's back (x 0.43); the kid (x 0.2) falls outside.

#### S19: 1730-1810 (80 f, 2 beats) The bus stop. 3D (the meme's first image, made warm).
- **Set:** the bus-stop shelter in the forest at night, the lantern on its hook (the key light), glitch drizzle.
- **Camera:** POV seated on the bench, eye 0.85; Sahur sits on your right, 0.5 m away, still much taller than you; look up at his face (yaw +35°, pitch +22°); vFOV 46; `breath(160, ±0.3, ±4)`.
- **Action:** 1730-1760: he watches the drizzle. 1762: he looks down at you (head leads by 6 f); 1770-1784: a slow nod. 1786-1806: he tilts the bat to lean it against your side of the bench (its handle touches the bottom-right of the frame). Drips fall off the roof edge in a row, lit amber.
- **Sahur:** CALM, a hint of a smile.
- **SFX:** soft rain patter on the roof; lantern hum.
- **Transition out:** cut on 1810 with a quick leak.
- **Vertical:** V-match (74.1°); the camera looks at him, so he's central.

#### S20: 1810-1850 (40 f, 1 beat) Memory: boardroom (`bg_boardroom.jpg`), a cold flash.
- **Panel:** Ken Burns 1.10 → 1.20 into the holographic face (panel x 0.50, y 0.20); cool tint (`#35e8ff` soft-light 0.15, no warm leak); one glitch tear at 1834 (a horizontal slice offset 12 px for 2 f); the kid stays a small back-view silhouette. Dissolve in over 4 f; hard out at 1850. (Foreshadowing: the warmth has a cold horizon.)
- **SFX:** 1810 a short reversed glass ping.
- **Vertical:** centre on the holographic face.

#### S21: 1850-1890 (40 f, 1 beat) Toward the glow. 3D forest at dusk.
- **Camera:** walking POV (bob 40 f) 1.4 m behind Sahur, who walks away, centred, toward a small orange glow 15 m off among the trees (the campfire); the lantern swings. Look = the glow; vFOV 40 → 30 over 1870-1890 (a push on the glow).
- **SFX:** footsteps; the score resolves into the fire's pad.
- **Transition out:** **match cut on 1890**: the glow becomes the campfire in S22 (same screen position, centre-low).
- **Vertical:** centred.

### BEAT 6. THE FIRE (1890-2400). L4. Intimate; the score thins and then stops.

#### S22: 1890-1980 (1.50 s) The fire.
- **Set:** fire clearing; violet-veined trees behind, as in `bg_fire.jpg`.
- **Camera:** POV seated on a log, eye 0.80; the fire 1.0 m ahead (centre-low, 22% from the bottom); Sahur sits on a log beyond the fire, 1.8 m away, slightly right of centre (x 56%), facing you, looking at the fire. vFOV 42; `breath(220, ±0.3, ±3)`; `hh(0.05, 0.3)`; DOF focus on Sahur, the fire slightly soft.
- **Hands:** your mittens hold **his bat** across your lap: it lies horizontally across the bottom of the frame, the mittens on the handle (bottom-left) and the barrel (bottom-right). He has given it to you to hold.
- **Action:** 1890-1906 the match cut settles; embers rise (120, 0.4 m/s up, each emissive 1.5 → 0 over 90 f); the lantern hangs on a branch behind him as a soft amber bokeh. 1940: he looks up from the fire to you (10 f head turn).
- **Sahur:** WEARY, gentle; lids 65%.
- **SFX:** fire crackle bed from 1890; pops 1912, 1955; ember hiss.
- **Transition out:** cut on 1980 (matched on his gaze).
- **Vertical:** V-match (68.6°): the fire at the bottom, Sahur central, more night sky; strong in 9:16.

#### S23: 1980-2070 (1.50 s) The rhythm, taught.
- **Camera:** same position; vFOV 42 → 38 (linear); pitch -6° to include the bat in your lap.
- **Action:** 1984-1996: he nods toward the bat (head dips 4°). Your mittens lift the barrel and tap it on the log you sit on: **tok 2004, tok 2034, tok 2064** (30 f apart: slower and softer than his; the bat rises 8 cm each time at the bottom edge). He nods once on each tap (3° dip, 6 f). On the third, a small, faint amber ring flickers on the ground around your log (radius 0 → 0.6 m, opacity 0.5 → 0, 16 f): weak, but real. 2066-2070: he smiles.
- **Sahur:** SMILE, lids 60%.
- **SFX:** three hollow bat-on-log toks 2004, 2034, 2064; a tiny ring shimmer 2064; crackle.
- **Transition out:** cut on 2070.
- **Vertical:** the bat is wider than the centre square, so its ends crop; `V.handsInset 0.12` so the tapping mitten stays in frame.

#### S24: 2070-2176 (1.77 s) His hand.
- **Camera:** dolly forward 0.25 m (2070-2110, inOutSine) to a close-up of Sahur across the fire; vFOV 38 → 28; DOF focus his raised hand (1.5 m), then his face.
- **Action:**
  - 2070-2096: he raises his left hand before his face, palm toward himself, and looks at it.
  - He taps his knuckles twice against his own log: **tok 2100, tok 2116** (the knock, in miniature).
  - **2132: the third tap never sounds as wood. GLITCH, frames 2132-2135 (4 f):** his hand turns to static (a frame-seeded TV-noise texture), RGB split (CA 0.012), a 6 px horizontal tear through it, and the firelight on it drops out. A **digital click** replaces the knock (research §5). 2146: a 1 f echo (static at 40%).
  - 2136-2160: he keeps looking at the hand, still (24 f).
  - 2160-2176: he closes it into a fist and starts to lower it (this continues off-screen).
- **Sahur:** SAD (lids 55%, brows inner up 6°). He knows.
- **SFX:** knuckle toks 2100, 2116; **digital click 2132** (a 6 ms dry burst plus a 30 ms bit-crushed tail); static blip 2146; the score fades out 2150-2172, leaving only the fire.
- **Transition out:** cut on 2176 to your POV.
- **Vertical:** V-match (47.8°); hand and face central.

#### S25: 2176-2270 (1.57 s) "will you disappear?"
- **Camera:** back to the seated wide: vFOV 36, pitch -4°, the mittens on the bat in the lower frame; `breath(120, ±0.4, ±5)` (shallow).
- **Action:** 2172-2180: your mittens tighten on the bat (mitten scale x 0.96 for 8 f; the bat rotates 2°). 2190-2218: Sahur looks away from you, at the fire (a slow 28 f head turn). **He doesn't answer.** 2218-2270: he watches the fire. The silence holds.
- **Text:** subtitle **`will you disappear?`** 2176-2256 (fade in 8 f, hold, fade out 8 f).
- **SFX:** crackle only (no score); 2240 a log settles.
- **Transition out:** cut on 2270 to his close-up.
- **Vertical:** subtitle at 72% of the 9:16 height; content centred.

#### S26: 2270-2400 (2.17 s) "sleep. tomorrow, TUNG."
- **Camera:** close-up of Sahur through the fire's heat haze (a refraction ripple in the lower third); vFOV 30; DOF on his eyes at 1.6 m; locked off (`hh(0.03, 0.2)`).
- **Action:** 2270-2282: he still looks at the fire. He speaks to the fire, not to you. 2350-2366: he turns and **looks into the lens** (research §4). 2366-2380: SAD-SMILE. 2394: a log pops and throws 30 embers across the frame.
- **Text:** label **`sleep. tomorrow, TUNG.`** typed 2282-2348 (22 characters, 3 f each; soft toks at -8 dB, none on spaces or punctuation), anchored at the head + (+0.20 m, +0.08 m); hold to 2388; fade 2388-2396. From the game's own fire scene (`biome1_end`), lowercased; not invented. It promises the TUNG that comes "tomorrow", in beat 10.
- **SFX:** a single low open fifth (D2 + A2, no third) swells under the label 2282-2400; toks 2282-2348; **2394 fire pop**; everything is cut at 2400.
- **Transition out:** **smash cut on 2400**; the ember burst becomes the sparks of the first fight frame.
- **Vertical:** V-match (50.9°); label above his head.

### BEAT 7. THE FIGHTS (2400-2976). 150 BPM: beat = 24 f, bar = 96 f; bars at 2400, 2496, 2592, 2688, 2784, 2880. One biome per 2 bars, one TUNG per biome on a bar downbeat, one mid-boss flash closing each biome.

**Fight camera defaults:** running POV, eye 1.05, bob period 24 f (on the beat), y ±25 mm, roll ±1.5°; `hh(0.6, 2)`; whip-pans are 8-12 f with CameraMotionBlur (6 samples, shutter 0.5); impacts use `shake()` impulses; lids flinch to 0.75 for 4 f on every TUNG.

#### S27: 2400-2424 (24 f) Slop. Forest, L5a.
- **Camera:** sprinting forward 4 m/s through glitch trees; vFOV 58.
- **Action:** 2404: a slopling leaps at the lens from the left (magenta wobble blob, 0.35 m, two pixel eyes). 2408-2414: your right mitten swats right-to-left across the frame (a 70° arc in 6 f, motion blur). 2414: hit; it bursts into a splat, and **a slop splat lands on the lens** (DOM decal, top-right quadrant, 22% of the frame) that slides down and fades 2414-2440. `shake(2414, 0.8, 10)`.
- **SFX:** downbeat 2400 (the drums slam in); squelch 2404; swat whoosh 2408; splat 2414.
- **Vertical:** start the slopling at landscape x 30% (inside the square); the lens splat sits top-right in the 9:16.

#### S28: 2424-2448 (24 f) Jargon.
- **Action:** whip-pan right 2424-2432 (yaw +70°) onto a buzzword drone hovering 3 m away (cyan diamond, spinning rotor, one lens eye). 2436 and 2442: it fires two jargon bolts at the lens; the POV dodges (roll -10°, x -0.3 m, 2436-2446, outCubic); one bolt grazes past the right edge.
- **SFX:** whip 2424; rotor whine 2430-2448; zaps 2436, 2442; dodge whoosh 2438.
- **Vertical:** the drone is centred after the whip.

#### S29a: 2448-2472 (24 f) Run with him.
- **Action:** POV running with Sahur on your left (1 m, in profile, bat on shoulder, lantern swinging); six sloplings converge from the trees ahead.
- **Sahur:** FIERCE.
- **SFX:** your running steps every 12 f; his wooden steps; a squelch chorus.
- **Vertical:** `V.yaw -6°` (he is at landscape x 35%).

#### S29b: 2472-2496 (24 f) Wind-up.
- **Action:** a cut to a lower angle: he leaps 1.5 m ahead and raises the bat overhead (attack pose); anticipation dip 4 cm at 2472-2480; bat up by 2490. The camera pans left 20° to keep him central (2476-2490).
- **SFX:** reverse cymbal and riser 2472-2496.
- **Vertical:** he is central.

#### S30a: 2496-2520 (24 f) TUNG #1.
- **Action:** **2496: the bat slams the ground.** A flat amber shockwave ring (emissive 4.0, bloom) expands from the strike, radius 0 → 9 m over 30 f (outCubic), ring height 0.4 m, thickness 0.15 → 0.6 m, plus the screen-space `ShockWave` centred on the strike (30 f). Sloplings in its path pop into splats, staggered by distance (2500-2520); two drones are knocked spinning away. **2506: the ring passes through the camera**: exposure +0.8 EV for 4 f, CA 0.004 → 0 over 12 f. `shake(2496, 1.4, 24)`; lids flinch 2497-2501.
- **SFX:** **TUNG #1** at 2496 (a wood-crack transient, a 45 Hz sub boom, a hollow 1.1 kHz body ring of 0.8 s, an amber shimmer); the score's kick is replaced by the TUNG on this downbeat; splats x8 2500-2520; drone spin-outs 2504, 2512.
- **Vertical:** strike centred; the ring is wider than the frame (fine).

#### S30b: 2520-2544 (24 f) The ring.
- **Action:** a low angle across the ground: the ring rolls through the trees, popping the last sloplings in a magenta line; Sahur straightens and puts the bat back on his shoulder; at 2530 he glances back at you.
- **SFX:** last splats 2522, 2528; ring tail.
- **Vertical:** Sahur central.

#### S31: 2544-2556 (12 f) Turn.
- **Action:** a fast POV turn left 80° (12 f, inOutExpo, motion blur): something cold is behind you.
- **SFX:** whoosh 2544; the music drops out 2550-2556 (a 6 f hole).
- **Vertical:** n/a (blur).

#### S32: 2556-2592 (36 f) MID-BOSS FLASH: ECHO, THE ENGAGEMENT WRAITH.
- **Action:** 2556: Echo fills 55% of the frame: a magenta wraith in a smooth white expressionless mask, trailed by two after-images (offset ±0.4 m, opacity 0.32 and 0.16, lagging 4 and 8 f). 2556-2574: she surges at the lens (dolly in 0.6 m), and each after-image scales up 10% (louder). 2574-2576: white flash (DOM white 1.0, 2 f). 2576: Sahur's bat enters from the left edge and cracks her mask (a crack line draws across it in 4 f); `shake(2576, 1.0, 12)`. 2578-2592: the after-images scatter outward and dissolve (12 f); she recoils.
- **SFX:** Echo's swell 2556-2574 (layered notification chimes rising; no voice); flash impact 2574; ceramic mask crack 2576; after-image shimmer 2580; drum fill 2580-2592.
- **Vertical:** the mask is centred.

#### S33: 2592-2616 (24 f) Landing. Wastes, L5b.
- **Action:** the POV drops from a jump into the Server Farm Wastes: y 2.2 → 1.05 over 2592-2600 (inQuad); landing at 2600 (y -0.12 bounce, `shake(2600, 0.8, 12)`). Ruined rack rows with dead LEDs, an amber dust storm, the coolant river glowing cyan in its channel ahead-right. Sahur lands on your left at 2604, heavier (dust puff).
- **SFX:** wind 2592; your landing 2600 (soft); his landing 2604 (wooden clack); the key change to E minor on the bar-3 downbeat 2592.
- **Vertical:** `V.yaw +5°` to include the river.

#### S34: 2616-2652 (36 f) The hand.
- **Action:** a scraper hand (lavender palm, four fingers pointing at you, 0.5 m) rises from behind a rack 2.5 m away. Wind-up 2616-2640: it turns red `#ff4d5e` and shakes ±3 cm every frame. 2636: your mittens come up (recoil). 2640-2648: it lunges at the lens. **2648: Sahur's bat swats it from the left edge**: hit sparks (12, white-amber); the hand cartwheels out to the right. `shake(2648, 1.0, 12)`.
- **SFX:** wind-up rattle rising 2616-2640; lunge whoosh 2640; bat hit 2648 (wood plus a metal clang); spark crackle.
- **Vertical:** the hand is centred.

#### S35: 2652-2688 (36 f) Wraith.
- **Action:** a prompt wraith (translucent violet, ragged hem, flickering at opacity 0.55-0.85) drifts in from the right 2652-2670, pauses, then lunges straight through the camera 2670-2680: the frame washes violet (DOM `#c07bff` screen, 0 → 0.6 → 0, 2674-2684) with CA 0.006. The POV ducks (pitch -8°, y -0.10, 2670-2680) and recovers 2680-2688.
- **SFX:** whisper-hiss (filtered noise, no voice) 2652; lunge 2670; pass-through whoosh with a falling tail 2676; riser 2664-2688.
- **Vertical:** centred.

#### S36a: 2688-2712 (24 f) TUNG #2.
- **Action:** on the riverbank, Sahur (2 m ahead, three-quarter back view) strikes at **2688**. The ring skims across the coolant river and raises a moving ring-wall of cyan water (400 spray particles, 0.8 m high); hands and wraiths caught by it are blown away (2692-2712). `shake(2688, 1.6, 26)`.
- **SFX:** **TUNG #2** at 2688 (bigger, with a water slosh); ring rush 2690-2712; blown-away hits 2696-2708.
- **Vertical:** Sahur central.

#### S36b: 2712-2736 (24 f) The first crack.
- **Action:** an insert on his log as he turns: **a thin glowing amber crack** (emissive 2.0) has opened from the top edge down 18 cm (it appeared on the TUNG at 2700 and is now seen); a 2 cm wood chip spins off toward the camera (2714-2734). His lids close for 2 f (2718): a flicker of pain.
- **Sahur:** FIERCE → a wince.
- **SFX:** crack fizz (dry wood split plus a tiny glassy fizz) 2714; chip flick 2716.
- **Vertical:** the crack is centred.

#### S37: 2736-2748 (12 f) He stumbles.
- **Action:** his knees dip 4 cm and he catches himself on the bat (2736-2746); the POV pans 8° toward him; your right mitten half-reaches (2740-2748), and the cut takes it away.
- **SFX:** one heartbeat 2736 (yours); bat plants 2740; the music drops out 2742-2748.
- **Vertical:** centred.

#### S38: 2748-2784 (36 f) MID-BOSS FLASH: THE SCRAPER.
- **Action:** 2748: the Scraper fills the frame: a violet data core (r 1.2 m) with three dark concentric rings and a cyan centre, six grasping hands orbiting (period 48 f here). 2748-2766: three hands reach at the lens, 6 f apart. 2766: whip-pan right 30° (6 f) as Sahur leaps across the frame, silhouetted against the cyan centre (2766-2772). 2772-2774: white flash. 2774-2784: the rings shatter outward (60 shards) and the hands go limp.
- **SFX:** core hum and grasping rattles 2748-2766; whip 2766; flash impact 2772; ring shatter (glass plus metal) 2774; fill 2772-2784.
- **Vertical:** the core is centred; Sahur's leap crosses the centre.

#### S39: 2784-2808 (24 f) The table. Boardroom, L5c.
- **Action:** the POV slides along the long glossy table, 0.18 m above it, dollying 2.4 m in 24 f (outCubic); cyan ceiling strips streak past in its reflection. Yes-men (green suit blocks with ties and fixed smiles) circle the table at radius 2.5 m, all smiling, all facing you (one revolution per 96 f).
- **SFX:** slide whoosh 2784; key change to F# minor on the bar-5 downbeat; a chorus of "agreeing" synth blips on the 16ths (no voice).
- **Vertical:** the table's vanishing point is central.

#### S40: 2808-2832 (24 f) The golem.
- **Action:** a pivot golem (stacked amber slabs with a crack down the middle, 1.8 m) slams both fists on the table at 2816: the table jumps, blank papers fly, `shake(2816, 1.2, 16)`. 2824: it splits along its crack into two halves that slide apart (12 f), both still standing.
- **SFX:** slam 2816 (stone on wood); split 2824 (stone crack); paper flutter.
- **Vertical:** the golem is centred.

#### S41a: 2832-2856 (24 f) On the table.
- **Action:** Sahur jumps onto the table between you and the yes-men (2832-2846), lantern swinging; the low camera looks up at him (pitch +18°, vFOV 54). The yes-men keep circling, smiling.
- **SFX:** his landing on the table 2846 (a hollow clonk).
- **Vertical:** V-match (capped 80°); he is central.

#### S41b: 2856-2880 (24 f) Wind-up.
- **Action:** a longer anticipation than in the forest (24 f against 18). The existing crack pulses brighter (emissive 2.0 → 3.5) and a second chip falls.
- **Sahur:** STRAINED.
- **SFX:** riser 2856-2880; crack fizz 2860.
- **Vertical:** central.

#### S42a: 2880-2904 (24 f) TUNG #3.
- **Action:** **2880: the strike on the table.** The ring rolls through the room at head height; the glass walls blow outward (shattering 2886-2900), and outside there is **nothing**: flat, featureless `#d8dce8`, no fog, no horizon. The yes-men's smiles split (2888) and they tip over. `shake(2880, 1.8, 28)`; exposure +0.6 EV for 4 f at 2884.
- **SFX:** **TUNG #3** at 2880 (the biggest yet, with table resonance); glass blowout 2886; smiles cracking (ceramic tinks x6) 2888-2900; **2900: the room reverb vanishes** (a dead, dry bed: the void has no acoustics).
- **Vertical:** centred on him.

#### S42b: 2904-2928 (24 f) The cost.
- **Action:** Sahur drops to one knee on the table (2904-2912). Two more cracks open, one across his face and one down his back, leaking amber (emissive 3.0); chips float up.
- **SFX:** his knee 2904 (heavy); crack fizz 2906; the music returns 2904.
- **Vertical:** centred.

#### S43: 2928-2940 (12 f) Reach.
- **Action:** your right mitten reaches toward him (2928-2940), POV push 0.2 m. He holds up his free hand: I'm fine (2932-2940).
- **SFX:** the score holds one note, no drums, 2928-2940.
- **Vertical:** centred.

#### S44: 2940-2976 (36 f) MID-BOSS FLASH: THE VALUATION, into white.
- **Action:** 2940-2958: rising beyond the shattered window, a colossal glowing **`$999B`** (extruded 3D type, cyan, emissive 4.0) above a chart line that only goes up (a neon cyan polyline climbing out of the top-right of the frame), with a small **`+∞%`** tag; it fills the top 60% of the frame. 2958: Sahur leaps and strikes the chart line where it meets the number: the line snaps; the digits crack and topple forward one by one (2960-2974). 2964-2976: the void's white floods in from the window side (a DOM white wipe with a 30% feathered edge, right to left over 12 f): full white at 2976.
- **Text:** diegetic, not counted: `$999B`, `+∞%` (from the game).
- **SFX:** a "cash register plus pad" swell 2940-2958 (no voice); line snap 2958 (a big glassy crack); digit clangs 2962, 2966, 2970; riser into the white 2960-2976; cut at 2976.
- **Vertical:** the number is about 3:1 wide, so in the vertical render dolly the camera back 1.5 m (`V.dolly 1.5`) so it fits the 9:16 width.

### BEAT 8. THE AI BUBBLE (2976-3336). L6 Core White: white, silent, weightless.

#### S45: 2976-3072 (1.60 s) The Core.
- **Camera:** you stand on an endless white plane (eye 1.05); weightless float y ±15 mm at a 300 f period (no footsteps); vFOV 50. 2976-3010: the white settles (exposure 1.8 → 1.1). **3010-3072: tilt up** (pitch 0 → +32°, inOutSine). Breathing is held (no breath motion or sound 3010-3072).
- **Action:** Sahur stands 1 m to your left, slightly ahead: the only warm, dark thing in the world, his cracks glowing faintly. The tilt reveals **the Bubble filling the sky**: an iridescent sphere (r 40 m at 60 m, about 70° of view) with a specular arc and slowly swirling thin-film bands (white → `#c8f4ff` → `#ffb3f2` → `#8f7bff`), and an **almost-right face**: two dark eyes of different sizes (r 3.2 m and 4.1 m) drifting apart (±2 m over 140 f), and a thick smile arc that doesn't move with them. Three hype-phrase rings orbit at different tilts (Pixelify Sans, white and pink, letters 1.5 m tall), at one revolution per 600, 720 and 900 f.
- **Text:** diegetic, not counted: the ring phrases (section 5).
- **SFX:** 2976 the fight music cuts; a high airy glass pad (wine-glass-rim tones 1047 and 1109 Hz, slowly beating) and a very low synthetic-applause bed; 3020 the hype-babble fades in (unintelligible synth murmur, no words); 3040 notification pings on a too-regular grid every 15 f (glassy E6).
- **Vertical:** V-match; the reveal plays even better in 9:16 (more sky).

#### S46: 3072-3168 (1.60 s) You can't hurt it.
- **Camera:** vFOV 50; `hh(0.3, 1)`; the POV turns to the ring (3080), to Sahur (3110), back up to the Bubble (3136).
- **Action:** 3080-3100: a ring phrase sweeps low past you; your mittens swat at its letters (3088-3096) and they pass through the mittens like light. Nothing. 3110-3130: Sahur strikes a small TUNG (**3120**, a lesser 4 m ring) that climbs the Bubble's surface as a ripple, and the Bubble **absorbs it and grows** (scale 1.00 → 1.12, 3120-3150, `outBack`); its smile widens 10%; the eyes drift further apart. 3136-3168: Sahur looks up at it; his cracks pulse; a chip falls.
- **SFX:** swat through nothing 3088 (hollow air); small TUNG 3120, its tail cut into a reversed "gulp" at 3126; inflate creak (a rubbery glass stretch) 3126-3150; babble +3 dB; pings continue; a half-time sub pulse starts at 3120 (every 48 f).
- **Vertical:** V-match.

#### S47: 3168-3336 (2.80 s) It grows.
- **Action:** the Bubble inflates 1.12 → 1.65 (3168-3336, inQuad) and drifts closer (its surface from 60 m to 35 m). Optional: its film shows faint reflections of the blue bedroom and the phone reel (20% opacity, 3220-3320): the feed misses you. The rings speed up (x2.5 by 3336) and start shedding letters like confetti. Your mittens come up (recoil) 3200-3216, trembling. Sahur stands his ground beside you. 3300-3336: the peak: the face looms in 80% of the frame, eyes drifting, smile wide; exposure 1.1 → 1.4, bloom 1.0 → 2.2.
- **Camera:** dolly back 0.6 m (3168-3300); vFOV 50 → 60; `hh(0.3 → 0.8, 2)`; `breath(48, ±0.9, ±10)`.
- **SFX:** **Shepard-tone riser** 3168-3336 (endless rise, -30 → -12 dB, research §5); babble layers 1 → 6; applause swells; pings accelerate (every 15 f → every 8 f); heartbeats 3180, 3212, 3240, 3266, 3290, 3312; fast breath. **Everything hard-cuts at 3336** (a 2 f fade only to avoid a click).
- **Vertical:** V-match.

### BEAT 9. THE FINAL MOVE (3336-3720). Total silence, then three strikes. 3 knocks at the door → 2 TUNGs → the pop → (later) 1 far TUNG (research §1).

#### S48: 3336-3456 (2.00 s) A hand on your shoulder.
- **Action:**
  - **3336: Sahur's left hand lands on your left shoulder**: it enters at the bottom-left (fingers curling over at x 12%, y 92%, 0.25 m from the lens, out of focus); the camera dips 1.5° under its weight (3336-3344). **Everything stops**: the music, the Shepard tone, the babble, the pings and the applause. There is true silence except your breath, dry and close. Shake → 0 (`hh(0.05, 0.3)`). The Bubble stops growing (it keeps a slow swirl).
  - 3340-3380: the POV turns left 40° to Sahur (inOutCubic). He is close (0.7 m), lit iridescent-white on one side and by his own amber cracks on the other, and **he looks into the lens**.
  - 3380-3400: hold (the pause). 3392-3404: he nods once.
  - 3410-3432: he lifts his hand from your shoulder and **taps the side of his own head twice**: tok 3416, tok 3428 ("cover your ears", mimed; INVENTED gesture, see section 5).
  - 3436-3456: your mittens rise and cover your ears: they enter from the left and right frame edges at mid-height and press inward to 8% from each edge, framing the image between them. From 3440 the mix low-passes (12 kHz → 900 Hz over 12 f) and your heartbeat comes up dry (+6 dB).
- **Sahur:** CALM (lids 60%, brows relaxed, the small smile from the montage).
- **SFX:** 3336 the hand lands (a soft wood-on-fabric pat: the only sound under the cut); exhale 3350; inhale 3396; head-taps 3416, 3428 (tiny, dry); fabric rub over the ears 3440; **one isolated heartbeat 3446**.
- **Text:** none.
- **Vertical:** Sahur is central after the turn. `V.handsInset 0.25` so the ear-covering mittens sit at the 9:16 edges.

#### S49: 3456-3560 (1.73 s) TUNG.
- **Action:** 3456-3490: Sahur steps past you (out of frame left) and the camera turns back right 40° to the Bubble (inOutCubic 34 f); he walks into frame 2.5 m ahead, his back to you, small against the sphere. Your mittens stay at the frame edges. 3470-3500: wind-up 1, bat overhead, with a 30 f anticipation dip of 6 cm (slower than in the forest). **3500: TUNG 1**: the bat strikes the white ground; an enormous amber ring (radius 0 → 40 m over 40 f) rolls across the plane and **up the Bubble's surface** as a bright band; the Bubble dents (a 6% dimple riding the ring front); the rings stutter and 20% of their letters fall away; its smile flattens (3510-3530). His three cracks flare and widen; amber light streams out (internal light 60 cd); 6 wood chunks blow off his back toward the camera (3500-3540). `shake(3500, 1.2, 36)`; exposure +0.5 EV (3500-3506); lids flinch to 0.8 (3501-3507). 3520-3560: the Bubble wobbles (a 3-cycle surface jiggle); a violet leak starts at its base (3530 →).
- **Sahur:** seen from behind; FIERCE in the body language.
- **SFX:** **TUNG 1** at 3500: dry and enormous, heard through covered ears: the wood transient low-passed at about 2.5 kHz, a 38 Hz sub boom you feel, a 1.6 s 1.1 kHz body ring, **no reverb tail**; wood chunks cracking 3502-3520; the Bubble's dent, a rubbery glass groan, 3510; heartbeat 3536.
- **Vertical:** Sahur and the Bubble central.

#### S50: 3560-3644 (1.40 s) TUNG.
- **Action:** 3560-3570: he lifts the bat again; his whole log is now cracked and light pours out of him (internal light 200 cd by 3572); his silhouette is half wood, half golden light. **3572: TUNG 2**: the ring hits the Bubble and tears a 25 m seam across it, leaking violet; the hype rings shatter into falling letters (falling like snow 3572-3640); the face distorts (the eyes slide off-axis). `shake(3572, 2.0, 40)`; the blast pushes the camera back 0.3 m (3572-3590); exposure +0.7 EV for 6 f. 3590-3640: **the third wind-up**, slow and huge (50 f): he raises the bat as high as it goes; large pieces of him fall away. **L6 → L6A**: his amber becomes the world's key light, overtaking the iridescent white (3600-3640). The Bubble shrinks a little, like an inhale (1.65 → 1.55), and its eyes look at him. Lids narrow to 0.55 (squinting into his light). The camera pushes in 0.2 m (3600-3640).
- **SFX:** **TUNG 2** at 3572 (bigger: sub peak -2 dBFS, still dry); the seam rip 3576 (a huge cellophane-glass tear); falling letters (60 tiny glass tinks over 70 f, low); wood falling 3600-3630; one isolated heartbeat 3606; then **nothing from 3620 to 3644** but the faint fizz of his light.
- **Vertical:** central.

#### S51: 3644-3720 (1.27 s) POP.
- **Action:** **3644: the third strike connects, his final TUNG. The Bubble bursts**: the film rips open from the impact point outward (400 iridescent shreds flung radially, spinning), the face stretches and tears apart, the last letters fly out. Flash to pure white over 6 f (3644-3650, DOM white 0 → 1, outExpo). 3650-3720: pure white `#ffffff`. Nothing.
- **SFX:** **3644 THE POP**: the third TUNG fused with the burst (a soap-film pop scaled to stadium size: a 6 ms broadband click, a 60 Hz thump and a short glass-shatter swell; peak -1 dBFS, the loudest moment of the film). **3650: hard cut to digital silence (3650-3690).** **3690: tinnitus**: a 3.0 kHz sine plus a faint 3.9 kHz partial (-8 dB relative), fading in from -40 to -24 dBFS over 30 f; it carries across the cut into the bedroom (research §5).
- **Vertical:** n/a (white).

### BEAT 10. WAKE UP ALONE (3720-4200). L7 → L8. The Triple-T ending (confirmed).

#### S52: 3720-3780 (1.00 s) White to eyelids.
- **Image:** DOM: white holds 3720-3730, then becomes light seen through closed eyelids: `#ffd9c4` (3730-3744) → `#c0583c` (3744-3756) → `#2a0d08` (3756-3768) → `#140605` (3768-3780).
- **SFX:** tinnitus holds at -24 dBFS.
- **Vertical:** n/a.

#### S53: 3780-3846 (1.10 s) Eyes open. The phone.
- **Set and light:** bedroom MORNING, L8.
- **Camera:** E0 lying; look down your body at the phone on your chest (-1.20, 0.62, 1.12) (pitch about -28°); vFOV 44; `breath(200, ±0.3, ±3)`; `hh(0.04, 0.3)`.
- **Action:** lids crack 3780-3790 (0 → 0.2), shut 3790-3796, open 3802-3840 (0 → 1, outCubic); `blur(10 → 0)` over 3802-3870. The view: the duvet, **the phone lying face down and dark on your chest**, your right mitten resting on it. Plain morning light, with no blue and no amber: neutral, a little cold. Dust drifts in the sunbeam across the duvet.
- **SFX:** tinnitus fading 3800-3920; morning room tone from 3800 (soft air, a distant traffic hush). **No hum**: its absence says "real" (research §5).
- **Vertical:** V-match (71.4°); the phone is central.

#### S54: 3846-3916 (1.17 s) "we did it."
- **Camera:** holds. 3848: a small exhale-laugh (the camera dips 0.8°). 3850: the mitten on the phone flexes once.
- **Text:** subtitle **`we did it.`** 3846-3916 (fade in 8 f, hold, fade out 8 f).
- **SFX:** exhale-laugh 3848 (breath only, no voice); **3880: the birds begin, badly out of tune** (a few sparse phrases, as in the game's epilogue).
- **Vertical:** subtitle at 72%.

#### S55: 3916-4000 (1.40 s) Where he should be.
- **Camera:** the POV turns right to the bedside where he knelt: rising slightly from E0 to E1 (3916-3966), yaw 0 → +61°, pitch -28° → -1° (inOutCubic 50 f). **This is exactly the framing of S12 at 1128**, now empty: the floor by the bed in morning light, the sunbeam, the dust. Nobody. 3966-4000: hold on the empty frame.
- **SFX:** duvet rustle 3920; birds 3930, 3962.
- **Vertical:** matches S12's vertical framing.

#### S56: 4000-4080 (1.33 s) "…sahur?"
- **Action:** 4006-4046: your right mitten reaches into the empty space where his face was (toward the kneel point at 0.66 m), stops at 4046 and hangs there (research §3, Ori). 4060-4080: it lowers slowly.
- **Text:** subtitle **`…sahur?`** 4000-4070 (fade in 8 f, hold, fade out 8 f).
- **SFX:** inhale 4004; a bird at 4012.
- **Vertical:** the mitten enters from the bottom-right: `V.handsInset 0.12`.

#### S57: 4080-4200 (2.00 s) TUNG.
- **Action:** 4080-4140: stillness. **The birds stop mid-phrase at 4080.** Room tone only. The motes drift. 60 f of quiet. **4140: far away, ONE BIG TUNG.** Off-screen; its source is never shown. Every mote in the sunbeam jumps 1 cm at once (4140-4146) and settles. 4146: your breath catches (a short inhale; the camera rises 4 mm). 4150-4196: the POV turns slightly toward the window, toward the sound (yaw +61° → +40°, pitch +3°), with a tiny push (z -0.04). 4196-4200: hold.
- **SFX:** **4140 the distant TUNG**: the TUNG voice of the final move, far away: low-passed at 3 kHz, 120 ms pre-delay, a long outdoor street-canyon tail (3.2 s), -14 dB against TUNG 2. The birds stay silent after it.
- **Transition out:** **hard cut to black on 4200**; the TUNG's tail rings on under the end card.
- **Vertical:** V-match.

### BEAT 11. END CARD (4200-4500). L9. Spec in section 8.

---------------------------------------------------------------------

## 5. Text list

Budget: about 5 lines plus the end card. **This board uses exactly 5.** To fit the two confirmed Triple-T lines, "cover your ears." is mimed rather than written (S48).

| # | Who | Exact string | Frames | Style | Source |
|---|---|---|---|---|---|
| 1 | Sahur | `let's go. let's go.` | typed 1140-1221 (pause 1167-1191), hold to 1300, out 1300-1312 | in-world label | the user, verbatim |
| 2 | You | `will you disappear?` | 2176-2256 | subtitle | the user, verbatim |
| 3 | Sahur | `sleep. tomorrow, TUNG.` | typed 2282-2348, hold to 2388, out 2388-2396 | in-world label | the game (`biome1_end`, the fire scene), lowercased. Not invented |
| 4 | You | `we did it.` | 3846-3916 | subtitle | confirmed by the user (the "Triple T" meme) |
| 5 | You | `…sahur?` | 4000-4070 | subtitle | confirmed by the user (the "Triple T" meme) |

**Diegetic text (part of the world, not counted):**
- The Valuation: `$999B`, `+∞%` (from the game).
- The Bubble's three hype rings (the game's phrases plus near-miss spellings, research §2; the misspellings are INVENTED). Each ring repeats its string around the circumference:
  - Ring 1: `this changes everything · thrilled to announce · this changes everythng ·`
  - Ring 2: `we believe · at scale · delighted · disrupting · at scael ·`
  - Ring 3: `thriled to anounce · we beleive · delighted · +∞% ·`
- Optional: a tiny `03:00` in the phone's status bar in S01 (INVENTED; sahur time, research §6).
- No legible text anywhere else: the city's posts, the reel's captions and the boardroom papers are shapes and bars.

**Player subtitle style:** Montserrat 500, 34 px (1080p), lowercase, `#f2efe8` at 92% opacity, text-shadow `0 2px 8px rgba(0,0,0,.6)`, centred at y 960 (bottom 11%), max width 1100 px, fade 8 f in and out, no typing, no sound.

**Sahur label style:** Pixelify Sans 500, 40 px, `#ffb547`, text-shadow `0 0 12px rgba(255,181,71,.5), 0 2px 0 #07090f`. Typed at 3 f per character; each letter pops in at 120% → 100% over 4 f. Jitter ±1 px, re-seeded every 3 f (`random('lbl'+Math.floor(f/3))`). A wooden "tok" per letter (pitch ±1 semitone, seeded), none on spaces or punctuation. Anchored to his head bone with a world offset (+0.22, +0.10, 0) m, projected every frame, clamped to x 120-1800, y 80-900. Fades 8-12 f. At the fire: 34 px, toks -8 dB.

**End card text:** `SAHUR PROTOCOL`, `TUNG  TUNG  TUNG` (two spaces between words, as in the game), the button `WAKE UP`, `EPISODE 1`, and an optional URL line (empty by default). Section 8.

---------------------------------------------------------------------

## 6. Motion language

### 6.1 Easing library (cubic-bezier, also in Remotion `Easing.bezier`)
- `inOutSine` (0.37, 0, 0.63, 1): breaths, drifts, slow pushes.
- `inOutCubic` (0.65, 0, 0.35, 1): camera turns, his kneel, the pull-up.
- `outCubic` (0.33, 1, 0.68, 1): arrivals, lid openings, the door swing.
- `outExpo` (0.16, 1, 0.3, 1): whips, flashes.
- `inQuad` (0.11, 0, 0.5, 0): falls (the phone, the jump drop), lid closings.
- `outBack(s)`: `Easing.back(s)` applied as an ease-out; the hand offer (s 0.8), the Bubble absorbing the small TUNG.

### 6.2 The POV (you)

| State | Breath (period / pitch / y) | Handheld | Other |
|---|---|---|---|
| Calm (B1, montage, fire) | 240 f / ±0.35° / ±4 mm (about 0.25 Hz) | 0.08° at 0.3 Hz | no roll |
| Uneasy (B2) | 180 → 120 f / ±0.5° / ±6 mm | 0.15° | |
| Scared (B3, B4 until 1336) | 60 → 44 f / ±0.9° / ±10 mm | 0.4° at 1.5 Hz, plus a tremor of 0.1° at 9 Hz | recoils over 20-40 f (outCubic); flinches: `lids 0.75-0.8` for 4-6 f and pitch -1.5° |
| Relief (1336 →) | one deep exhale (pitch -1.2°, y -15 mm over 40 f), then 150 f / ±0.3° | 0.08° | |
| Walking (montage) | the bob is the breath: period 40 f (on the 90 BPM beat), y ±12 mm, roll ±0.6°, yaw ±0.4° | 0.1° | mittens swing in counter-phase |
| Running (fights) | bob 24 f (on the 150 BPM beat), y ±25 mm, roll ±1.5° | 0.6° at 2 Hz | whip-pans 8-12 f, yaw 40-90°, motion blur; shake impulses decay exponentially |
| Awed (Core) | breath held 3010-3072, then 48 f in fear | 0.3 → 0.8° | weightless float y ±15 mm at 300 f; vFOV widens 50 → 60 as the Bubble grows |
| Waking (B2, B10) | as Uneasy / Calm | | blur strongest as the lids open, then it clears; blinks close fast (6-8 f) and open slower (10-16 f); half-blinks each open a little less |

The mittens lag the camera by 4 f and never move in a straight line (always on a slight arc).

### 6.3 Sahur
- **Weight.** A heavy, rigid log: no squash on the body. The peg limbs swing with a small overshoot (outBack 0.6). A step takes 28-32 f, with a 2 f settle on each foot plant. Head turns lead the shoulders by 6 f.
- **Slow by default.** Slow blinks (close 4, hold 2, open 6 f). He only moves fast with the bat: wind-up 18-24 f (inOutCubic, a 4 cm anticipation dip), strike 3-4 f (ease-in expo), an 8 f hold on impact, a 16 f follow-through.
- **Weakening.** From 2700 his idle sway grows (±0.5° → ±1.5°), his wind-ups lengthen (forest 18 f → boardroom 24 f → Core 30 f → final 50 f), and his crack glow rises.
- **Never threatening.** In the bedroom the bat always rests on his shoulder. He never points it at the camera.

### 6.4 Holds and timing
- Every emotional beat ends with a hold of at least 30 f before the next action: the empty doorway (940-960), the stop 6 cm short (1314-1326), the silence after the question (2176-2282), the pause after the hand on your shoulder (3336-3470), the empty bedside (3966-4000), the quiet before the far TUNG (4080-4140).
- Subtitles stay up at least 70 f; labels hold at least 40 f after the last letter.
- Montage cuts sit on the 40 f beat (two on the off-beat 8th); fight cuts sit on the 24 f beat or the 12 f half-beat.
- The quiet beats get real time: waking (330-720, 6.5 s), the fire (1890-2400, 8.5 s, with 1.8 s before his reply), the pause before the final move (2.2 s), waking alone (8.0 s), and the silence before the distant TUNG (1.0 s plus 1.3 s of hold after it).

---------------------------------------------------------------------

## 7. Audio direction

Original synthesised score and SFX (numpy/scipy, the skill's audio engine). The only non-synthesised audio is the approved game choir at the end. No voice anywhere: babble, Echo, the Valuation and the birds are synthetic textures. No meme audio, no original TikTok voice-over, no real patrol recordings (research §6).

### 7.1 Instruments are characters (research §5)
- **Sahur = dry wood**: woodblock, marimba, the TUNG. His woodblock part is in the score from 1336, then **thins as he weakens**: every beat 1-2-3 in the montage and the Forest fight, every other bar in the Wastes, downbeats only in the Boardroom, gone at the Core except his own TUNGs (research §3, Journey).
- **You = breath** (and heartbeat).
- **The Bubble = glass and pings**: wine-glass-rim tones, notification pings on a too-regular grid, synthetic applause, the hype-babble, the Shepard riser.
- **The feed = mains hum** plus a thin whine.

### 7.2 The motif: three knocks (TUNG TUNG TUNG), then "sa-hur"
Melodic form: three repeated notes and a fall, A A A F# D ("TUNG TUNG TUNG sa-hur").

| # | Where | Frames | Form |
|---|---|---|---|
| 1 | The phone reel | 12-324 | tiny and tinny: knock triplets 12 f apart, a squeaky two-note "sa-hur" (no voice); the last triplet muffled under cloth (300 / 312 / 324) |
| 2 | The door | 740, 780, 820 | three heavy real knocks, 40 f apart (90 BPM: the tempo you will walk to) |
| 3 | The hand | 1350, 1362, 1374, 1390, 1402 | the first musical statement: marimba A4 A4 A4 F#4 D4 over the warm chord |
| 4 | The montage | 1570, 1610, 1650 | shown: Sahur's taps on the stump replace the score's woodblock for one bar; your clap at 1654 is late |
| 5 | The fire | 2004 / 2034 / 2064 (you), 2100 / 2116 / **2132 = a digital click** (him) | taught, then broken: his third knock glitches |
| 6 | The fights | 2496, 2688, 2880 | the TUNG rings on bar downbeats; the motif as the synth-brass hook |
| 7 | The final move | 3500, 3572, **3644 = the pop** | enormous and dry, 72 f apart (50 BPM). Two TUNGs, and the third strike is the pop |
| 8 | The end | 4140 | one, distant, unseen |
| 9 | The end card | 4287, 4327, 4367 | silent and visual: the three words `TUNG` appear 40 f apart, the door-knock spacing (the choir carries the sound) |

The count reads 3 → 2 → 1 (research §1). No looping single-knock alarm anywhere (research §6).

### 7.3 Music arc: tempo and key map (frames)

| Frames | Section | Tempo | Key / chords | Content |
|---|---|---|---|---|
| 0-330 | The reel | none | none | **no score**: only the phone's tinny loop and the room |
| 330-360 | | | | **true digital silence** |
| 360-1336 | The feed | free | D Phrygian drone | a D1 (36.7 Hz) sine plus a D2 saw low-passed at 200 Hz; a thin Eb3 glass tone from 480 (the flat 2: dread); 2.4 kHz whine at -40 dB. A low tremolo swell D-F-Ab under the door opening (890-960), back to the drone at 960. No pulse: the knocks and the heartbeat are the rhythm |
| 1336-1410 | First warmth | free | **Dadd9** (D3 A3 E4 F#4): the F → F# lift is the first warmth | a pad swell (40 f attack) from 1336; marimba motif A4 A4 A4 F#4 D4 at 1350 / 1362 / 1374 / 1390 / 1402 |
| 1410-1890 | Montage | **90 BPM** (40 f/beat, 160 f/bar; bars at 1410, 1570, 1730) | D (1410), Bm (1490), G (1570), A (1650), D/F# (1730), G (1810), Asus4 (1850), A (1870) | marimba ostinato in 8ths (20 f), woodblock on beats 1-2-3 (rest on 4; out for bar 2, where his taps carry it), warm pad, a soft sub on beat 1, shaker 16ths (10 f) from 1570. Felt-piano melody: A A A F# D (1410), B B B A F# (1490), (bar 2: his taps), D5 D5 D5 C#5 A4 (1730), resolving to D (1810-1890) |
| 1890-2150 | Fire | free (rubato) | Bm (1890), G (2010), D/F# (2080) | pad and kalimba. After your taps the kalimba plays the motif back gently and **broken**: A A A F# (2080, 2092, 2104, 2120), **with no D** (research §3, Up). Fade 2150-2172 |
| 2172-2282 | | | | **score silent**: fire crackle only |
| 2282-2400 | His reply | free | D5 (D2 + A2, no third) | one soft swell under the label; cut at 2400 |
| 2400-2592 | Forest fight | **150 BPM** (24 f/beat, 96 f/bar) | D minor | driving synth bass in 8ths (12 f), wood/taiko drums (kick on 1 and 3, clap on 2 and 4), saw arpeggio in 16ths (6 f), the motif as a synth-brass hook, woodblock on every beat. TUNG #1 replaces the kick at 2496. Drop-out 2550-2556; fill 2580-2592 |
| 2592-2784 | Wastes | 150 BPM | E minor (up a tone) | as above; woodblock every other bar; TUNG #2 at 2688; drop-out 2742-2748; fill 2772-2784 |
| 2784-2976 | Boardroom | 150 BPM | F# minor (up a tone) | as above plus "agreeing" blips; woodblock on downbeats only; TUNG #3 at 2880; one held note with no drums 2928-2940; riser 2960-2976; cut at 2976 |
| 2976-3336 | The Bubble | free; a half-time sub pulse from 3120 (75 BPM, 48 f) | a glass cluster (1047 + 1109 Hz beating) | high airy glass pad, synthetic applause, pings every 15 f from 3040 (every 8 f by 3336), babble from 3020; **Shepard riser 3168-3336**. **Hard cut at 3336** |
| 3336-4200 | | | | **no music at all.** Breath, wood, the TUNGs, the pop, silence, tinnitus, the morning, the far TUNG |
| 4200-4500 | End card | | | the game's choir (section 7.6) |

**Silence windows.**
- **True digital silence:** 330-360, and **3650-3690** (after the pop).
- **Near-silence:** 2172-2282 (fire crackle only), 3336-3500 (breath, the head-taps and one heartbeat only), 4080-4140 (morning room tone at -52 dB only).

Confirm each with `audio-engine/story/prof.py` (0.5 s RMS profile).

### 7.4 Sound design notes
- **Knocks and TUNGs**: one TUNG voice, built in layers: a wood-crack transient (5 ms), a hollow body ring at 1.1 kHz (0.8-1.6 s), a sub boom (38-45 Hz) and an amber shimmer (a soft high bell). The door knocks use the body without the shimmer, with a room reverb of 0.6 s. The fight TUNGs carry the full stack with a short plate. The final two are **dry** (no tail) and low-passed at about 2.5 kHz by your covered ears. The far TUNG is low-passed at 3 kHz with a 120 ms pre-delay and a 3.2 s outdoor tail.
- **The feed hum**: mains at 50 Hz with harmonics plus the D1 drone, and a 2.4 kHz whine. It cuts out under the warmth (1340-1400) and is **absent** in the morning.
- **Sirens**: Doppler wails, low-passed at 1.5 kHz (heard through walls): 384 far, 672 nearer; ducked -20 dB at 1336.
- **Heartbeat and breath**: the spacing carries the emotion (research §5); in the final move each heartbeat is isolated (3446, 3536, 3606).
- **The hype-babble**: unintelligible synth murmur: formant-filtered noise bursts at a syllable rate of 7 Hz, corporate-cadence pitch contours, 1 → 6 layers panned wide. No real words.
- **The pop**: a 6 ms broadband click, a 60 Hz thump, a short glass-shatter swell. Peak -1 dBFS. Then 0.
- **Tinnitus**: 3.0 kHz plus 3.9 kHz (-8 dB), 3690 → peak -24 dBFS at 3720 → fading 3800-3920 under the room tone (it carries across the cut).
- **Morning birds**: sine chirps on detuned intervals (a quarter-tone off), sparse; in at 3880, stopping mid-phrase at 4080; silent after the far TUNG.
- **Underwater muffle**: the mix low-passed at 400 Hz opening to full over 450-540 (waking in the blue); the ear-cover low-pass 12 kHz → 900 Hz from 3440.

### 7.5 SFX cue list (60 fps frames)

| Frame(s) | Cue | Notes |
|---|---|---|
| 0-330 | night room tone | -52 dB |
| 12, 24, 36 / 84, 96, 108 / 156, 168, 180 / 228, 240, 252 | reel knocks (tinny) | phone speaker: band-pass 1-5 kHz |
| 48, 56 / 120, 128 / 192, 200 / 264, 272 | reel "sa-hur" squeaks | two notes, no voice |
| 70 | thumb tick on glass | tiny |
| 140-232 | reel low-passed at 2.5 kHz while lids < 0.2 | the falling-asleep filter |
| 280 | phone thud on the chest | fabric |
| 286 | long sleepy exhale | |
| 300, 312, 324 | last reel triplet, muffled | low-pass 350 Hz, -10 dB |
| 330-360 | **digital silence** | |
| 360 → 1400 | feed hum (fade in 360-420) | fades out 1340-1400 |
| 384 | siren 1, far | 3.2 s |
| 420-540 | whole mix low-passed 400 Hz → open | underwater wake |
| 452 | uneasy inhale | |
| 548 | duvet rustle | |
| 612, 636, 660, 684 | synced notification pings (40 voices) | distant, glassy |
| 672 | siren 2, nearer | Doppler |
| 740, 780, 820 | **KNOCKS** | heavy wood through the door |
| 742, 782, 822 | dust trickle | |
| 790, 832, 870, 904, 934, 960, 984, 1010, 1036, 1062, 1088, 1114, 1142, 1172, 1206, 1248, 1290, 1350, 1410 | heartbeat | accelerating to 26 f, then slowing to rest |
| 824-1336 | fast breathing loop | |
| 872 | door handle | |
| 890-940 | door creak | long |
| 900-960 | fog hiss | low |
| 962 | sharp inhale | |
| 990, 1018 | Sahur's footsteps | wooden clonk plus a floorboard creak |
| 1060 | his blink "tk" | very quiet |
| 1124 | his knee on the floor | |
| 1140-1221 | label toks x12 | |
| 1310-1336 | held breath (no breath sound) | |
| 1336 | mitten into the wooden palm | "pff-tok" |
| 1336-1380 | siren duck -20 dB | |
| 1342 | big exhale | |
| 1352, 1356 | bed creak; his knee creak | |
| 1410-1890 | forest night bed (glitch crickets) | under the montage |
| 1410, 1450 / 1430, 1470 | your footsteps / his | on the beat / off-beat |
| 1490, 1670, 1810 | tape-flutter whoosh (memory in) | 1810 has a reversed glass ping |
| 1490-1550 | river bed | -30 dB |
| 1570, 1610, 1650 | Sahur's stump taps | small, warm |
| 1654 | mitten clap | soft, late |
| 1690 | far bird (in tune) | the dream's birds are pretty |
| 1730-1810 | rain on the shelter roof | |
| 1850-1890 | footsteps | |
| 1890-2400 | fire crackle bed | |
| 1912, 1955 | crackle pops | |
| 2004, 2034, 2064 | your bat-on-log toks | hollow, small |
| 2064 | tiny ring shimmer | |
| 2100, 2116 | his knuckle toks | |
| **2132** | **digital click** (the glitch) | 6 ms burst plus a 30 ms bit-crushed tail |
| 2146 | static blip | 1 f |
| 2240 | a log settles | |
| 2282-2348 | label toks (soft, -8 dB) | |
| 2394 | fire pop | sharp |
| 2404 / 2408 / 2414 | squelch / swat / splat | |
| 2424 / 2430-2448 / 2436, 2442 / 2438 | whip / rotor / jargon zaps / dodge | |
| 2448-2496 | running steps every 12 f | |
| 2472-2496 | reverse cymbal and riser | |
| **2496** | **TUNG #1** | full stack |
| 2500-2528 | splats x10 | staggered |
| 2504, 2512 | drone spin-outs | |
| 2544 | whoosh | |
| 2556-2574 / 2574 / 2576 / 2580 | Echo's chime swell / flash impact / mask crack / after-image shimmer | |
| 2592 / 2600 / 2604 | wind / your landing / Sahur's landing | |
| 2616-2640 / 2640 / 2648 | hand wind-up rattle / lunge / bat hit (wood plus metal) with sparks | |
| 2652 / 2670 / 2676 | wraith hiss / lunge / pass-through | |
| 2664-2688 | riser | |
| **2688** | **TUNG #2** | plus a water slosh |
| 2690-2712 | water ring rush | |
| 2714 / 2716 | crack fizz / chip flick | |
| 2736 / 2740 | heartbeat / bat plant | |
| 2748-2766 / 2766 / 2772 / 2774 | Scraper hum and rattles / whip / flash / ring shatter | |
| 2784 / 2784-2880 | table slide / agreeing blips | |
| 2816 / 2824 | golem slam / split | |
| 2846 / 2856-2880 / 2860 | Sahur on the table / riser / crack fizz | |
| **2880** | **TUNG #3** | plus table resonance |
| 2886 / 2888-2900 / 2900 | glass blowout / smiles cracking x6 / the room reverb vanishes | |
| 2904 / 2906 | his knee / crack fizz | |
| 2940-2958 / 2958 / 2962, 2966, 2970 | Valuation swell / line snap / digit clangs | |
| 2960-2976 | riser into white | cut at 2976 |
| 2976 → | glass pad, applause bed | |
| 3020 → | hype-babble | |
| 3040 → | pings every 15 f, every 8 f by 3336 | |
| 3088 | swat through nothing | hollow air |
| 3120 / 3126 / 3126-3150 | small TUNG / reversed "gulp" / inflate creak | |
| 3168-3336 | Shepard riser | |
| 3180, 3212, 3240, 3266, 3290, 3312 | heartbeat | |
| **3336** | **all cut**; the hand lands (soft pat) | |
| 3350 / 3396 | exhale / inhale | |
| 3416, 3428 | head-taps | tiny, dry |
| 3440 | fabric rub over the ears; low-pass on | |
| 3446 | heartbeat, isolated | |
| **3500** | **TUNG 1** | dry, low-passed, sub |
| 3502-3520 / 3510 | wood chunks cracking / Bubble groan | |
| 3536 | heartbeat | |
| **3572** | **TUNG 2** | dry, bigger |
| 3576 / 3572-3640 / 3600-3630 | seam rip / falling-letter tinks / wood falling | |
| 3606 | heartbeat, isolated | |
| **3644** | **THE POP** | peak -1 dBFS |
| 3650-3690 | **digital silence** | |
| 3690-3920 | tinnitus | 3.0 + 3.9 kHz |
| 3800 → | morning room tone | no hum |
| 3848 | exhale-laugh | |
| 3880, 3930, 3962, 4012, 4040 | out-of-tune birds | stop at 4080 |
| 3920 | duvet rustle | |
| 4004 | inhale | |
| **4140** | **the distant TUNG** | tail to about 4330 |
| 4146 | breath catches | |
| 4200 | choir in | section 7.6 |

### 7.6 The choir (the only non-synthesised audio)
`public/audio/choir.mp3` (85.8 s, approved). Its loudness profile (measured): an opening hit at 0-2 s, a lull at 2-5.5 s, a hard entry at 5.50 s, steady to 35 s, a dip 35-37.5 s (down to -38 dB at 37.25 s), then **the big section from 38.0 s** (about -13 dB RMS) to the end.
- **Entry:** at frame **4200**, start the mp3 at **offset 37.20 s** (a natural near-silence, -35 dB), with a 12 f linear fade-in (4200-4212) only to avoid a click. It then **swells on its own**: it begins rising at 37.35 s, its first hit lands at 38.25 s = **frame 4263**, and it is at full level by 38.55 s = **frame 4281**. This puts the choir strictly after the distant TUNG (4140), whose tail fades under it.
- **Level:** about -14 LUFS short-term at its peak; nothing else plays under it except the TUNG's tail.
- **Exit:** equal-power fade-out 4440-4500 (the mp3 has played 37.20-42.20 s).
- **Fallback** if the mix wants a harder entry: offset 5.40 s gives a hard hit 6 f after the cut, but it lands in the quieter middle section.

### 7.7 Mix
- About -16 LUFS integrated; peaks under -1 dBFS.
- The pop is the loudest moment; TUNG 2 is next (-2 dBFS).
- The morning sits at about -40 LUFS short-term, so the far TUNG reads.
- The fire sits at about -28 LUFS.
- Duck the score 3 dB under the labels' toks (1140-1221, 2282-2348).

---------------------------------------------------------------------

## 8. End card (S58: 4200-4500, 5.00 s)

It echoes the game's real title screen (`#titleOv`): the same fonts, colours, spacing and button style, scaled for 1080p. The DOM sits above everything (no grade).

**Layout (16:9, a centred column):**

| Element | y centre | Spec |
|---|---|---|
| Background | full | `#07090f`; 14 amber motes (`#ffb547`, 2-4 px, opacity 0.2) drifting up 0.3 px/f; a slow drift on the mote layer like the game's `menuDrift` (translate -2%/-1% → 2%/1%, scale 1.02 → 1.08 over 300 f); radial vignette `#000` 0.6 |
| `SAHUR PROTOCOL` | 430 | Press Start 2P 72 px, letter-spacing 0.12em, `#ffb547`, text-shadow `0 0 36px rgba(255,181,71,.45)`, line-height 1.6 |
| `TUNG  TUNG  TUNG` | 520 | Verdana 600 26 px, `#ff3df0`, letter-spacing 0.5em, two spaces between words |
| `WAKE UP` button | 620 | a box: border 2 px `#232a3d`, background `#10141f`, text `#e8e4d8` Verdana 700 30 px, letter-spacing 0.12em, padding 22 px 64 px (the box reads as the brackets of `[ WAKE UP ]`) |
| `EPISODE 1` | 712 | Pixelify Sans 22 px, `#8b8fa3`, letter-spacing 0.3em |
| URL slot (optional) | 760 | Verdana 20 px `#8b8fa3`, empty by default; the space is reserved |

**Animation:**
- 4200: hard cut to `#07090f`; the far TUNG's tail is still ringing; the choir starts (7.6).
- 4235-4263: `SAHUR PROTOCOL` appears letter by letter (14 glyphs including the space, 2 f each); each letter flickers in with a 1 f `#ffffff` flash, then amber.
- **4263 (the choir's first hit):** the title glow pulses (text-shadow blur 36 → 72 px and back over 40 f, outCubic) with a 1% scale bump.
- **4287, 4327, 4367:** the three words `TUNG` snap in one at a time, 40 f apart (the door-knock spacing): each at 110% → 100% over 6 f with a magenta glow flash. Silent; the choir carries it.
- 4385-4409: the button fades in and rises 12 px (outCubic 24 f).
- 4409-4433: `EPISODE 1` fades in.
- 4436-4448: the button takes the game's focus state (border and text → `#ffb547`, 12 f ease): the invitation to wake up.
- 4448-4500: hold on the full card (the last frame is the full card, good as a thumbnail). The choir fades out 4440-4500.

**Vertical (1080x1920):** the same column centred at y 900. `SAHUR` / `PROTOCOL` on two lines at 88 px (`PROTOCOL` ≈ 790 px wide); `TUNG  TUNG  TUNG` 30 px; button 34 px; `EPISODE 1` 26 px; URL slot below. Everything stays above y 1500 (clear of the Reels/TikTok UI).

---------------------------------------------------------------------

## 9. Vertical cut (9:16) rules

- **Re-render, don't crop.** Each 3D shot is re-rendered at 1080x1920 with the same camera position and look target.
- **V-match (the default).** `vFOV_v = min(80°, 2·atan(16/9 · tan(vFOV/2)))`. The centre square of the 16:9 frame (its middle 56% of width) is then identical in both cuts, and the vertical gains space above and below. Precomputed:

  | vFOV 16:9 | 28 | 30 | 36 | 38 | 40 | 42 | 44 | 46 | 48 | 50 | ≥ 53 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | vFOV 9:16 | 47.8 | 50.9 | 60.0 | 63.0 | 65.8 | 68.6 | 71.4 | 74.1 | 76.7 | 79.3 | 80 (cap) |

  At the 80° cap, the vertical shows about the centre 48% of the 16:9 width.
- **Per-shot overrides** (named in the `Vertical:` notes):
  - `V.yaw` (degrees added to the yaw)
  - `V.shiftY` (a `setViewOffset` lens shift as a fraction of the frame height; + shows more above)
  - `V.handsInset` (moves the POV mittens toward the centre by this fraction of the 16:9 width, so hands at the 16:9 edges stay visible)
  - `V.dolly` (metres back)
- **DOM overlays in 9:16:**
  - Subtitles: 40 px at y 1380 (72%).
  - Sahur's labels: anchored **above** his head, centred, max width 860 px, 44 px.
  - Lids: the lid curves key to the frame height.
  - Memory panels: crop rather than letterbox, centred on the x given per shot.
  - End card: stacked (section 8).
- **Safe zone:** key action stays within x 90-990 and y 220-1500.

---------------------------------------------------------------------

## 10. Questions for the user

1. **The fire reply.** `sleep. tomorrow, TUNG.` (the game's own fire line) sets up the final distant TUNG as the "tomorrow" he promised. Keep it? The alternatives are `everything costs.` or no reply at all.
2. **"cover your ears."** To fit 5 lines with the Triple-T ending, it is **mimed** (he taps the side of his head twice, your mittens cover your ears and the sound muffles). Keep the mime, or add it as a 6th text line?
3. **The distant TUNG.** It stays unseen and ambiguous: him, or a real sahur patrol passing, so the tradition outlives the meme (research §6). And by default **no bat** is left in the room (the game's epilogue leaves the bat; showing it would make the dream real). Keep both defaults?
4. **The lantern (INVENTED).** From the montage on, Sahur carries a small paper lantern on his bat: a night-watch nod that makes "amber always comes from Sahur" literal. OK?
5. **Diegetic text.** `$999B` / `+∞%` on The Valuation, hype phrases with near-miss spellings on the Bubble's rings, and an optional tiny `03:00` on the phone. All OK?
6. **The end card.** The game's boxed `WAKE UP` button (the box reads as the brackets) or literal `[ WAKE UP ]` text? And confirm `EPISODE 1` (it implies more episodes).

---------------------------------------------------------------------

## 11. Compliance checklist (for the reviewer)

- [ ] Exactly 4500 frames at 60 fps; every shot boundary in section 4.1 is contiguous.
- [ ] 5 text lines (section 5), verbatim, lowercase where specified; no other legible text except the listed diegetic items and the end card.
- [ ] The player is never seen except as cream mittens (and an optional warped reflection: none planned). No human faces; the painted kid only as a back-view silhouette or cropped out.
- [ ] Sahur never raises the bat at the camera in the bedroom.
- [ ] `#ffb547` amber appears only from Sahur (the hands, lantern, fire, rings, cracks, labels) and on the end-card title.
- [ ] Silence windows verified with `prof.py`: 330-360 and 3650-3690 are digital zero; 3336-3500 contains breath, the head-taps and one heartbeat only.
- [ ] No hum after 3720. The far TUNG sits alone at 4140; the choir enters at 4200 from offset 37.20 s.
- [ ] No real logos, brands or people; the Bubble's satire comes only from hype language and its face.
- [ ] No Ahum Labs branding anywhere (confirmed).
- [ ] Warm toward sahur: the knock is care; no religious audio or imagery; no fasting jokes (research §6).
- [ ] Description credit (research §6): "Tung Tung Tung Sahur created by Noxa (@noxaasht)".
- [ ] Deterministic: no `Math.random`; Noise and Glitch effects are frame-driven.
