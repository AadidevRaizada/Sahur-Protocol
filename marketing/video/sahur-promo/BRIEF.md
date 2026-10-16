# Sahur Protocol: promo film brief ("WAKE UP")

## What the user wants
A short cinematic **promo film** for *Sahur Protocol*, a single-file browser roguelike made for a game design course (repo: `Sahur-Protocol/`, game: `Sahur_Protocol.html`). There is already a gameplay-style video; this one is a **promo** that tells the story simply.

- **No voice. Barely any text.** Everything is carried by emotion: camera, light, colour, timing, sound design and music.
- **First-person POV.** The viewer *is* the player. We look up at Sahur, breathe, blink and flinch.
- **Look: 3D, toy-like** (decided). Built in Remotion with three.js / react-three-fiber. Sahur is a modelled wooden log with a carved face, peg arms and legs, and a bat. Enemies are 3D, glowing and geometric. The Bubble is an iridescent sphere.
- **The protagonist: cream blob hands** (decided). In gameplay the player is a cream (`#e8e4d8`) blob with two small dark eyes. In POV we only see soft, rounded cream mitten-hands at the frame edges (holding the phone, taking Sahur's hand, holding the bat by the fire). We never see a human. The game's painted cutscenes show a hooded kid; avoid showing him in close-up.
- **Length and formats** (decided): about **75 s**, 1920×1080 at 60 fps (4500 frames), plus a **9:16 vertical cut** (1080×1920) for Reels, TikTok and Shorts. Compose every shot so it can be reframed vertically: keep the subject central and key action in the middle 56% of the width.
- **Audio** (decided): original synthesised score and SFX (numpy/scipy). The game's own choir track (`TUNG TUNG TUNG SAHUUUUUUR CHOIR (1).mp3`, 85.8 s, already shipped in the game; CONFIRMED fine to use by the user; copy at `public/audio/choir.mp3`) plays **only at the very end**, swelling under the end card after the final distant TUNG.

## Text rules
- When **you** (the player) speak, the line appears as a **subtitle**: bottom centre, small, lowercase, soft white with a subtle shadow.
- When **Sahur** speaks, the line appears **in the world, right next to him**: a speech-text label floating at his head height that tracks him in 3D, in the game's pixel font (Pixelify Sans, warm amber `#ffb547`), slightly jittery and typed on with a wooden "tok" per letter.
- Budget: about 5 lines in the whole film, plus the end card.

## The story (the user's beats, in order)
1. **The reel.** Night. In bed, POV. Cream blob hands hold a phone. On the screen, a Tung Tung Tung Sahur reel plays (the meme: a little wooden log with a bat, "tung tung tung"). Eyelids get heavy. Blink, blink. The phone slips onto your chest. Black.
2. **Waking up in a changed world.** Eyes open (eyelid wipe). The atmosphere has changed: a dystopian hum, **sirens** far away, and the room is lit only by a cold **blue light**. Blue is phone light, the symbol that *you are inside the feed now*. Through the window, a grey city where every screen shows the same post. Dust hangs in the blue.
3. **Sahur arrives.** TUNG. TUNG. TUNG: three knocks. The door opens. Sahur steps in from the blue, bat in hand, and he is tall from your low POV. You are scared: fast breathing, heartbeat, the camera shrinks back, the hands come up.
4. **"let's go. let's go."** He doesn't explain. He leans in, and text pops up next to him: `let's go. let's go.` He holds out his wooden hand. Your blob hand takes it. A warm amber light enters the frame for the first time.
5. **Bonding montage** (taken from the game). Walking through the Hype Cycle Forest, Sahur teaching you the rhythm by tapping the bat, sharing moments. Use the game's painted cutscene art as "memories" (fire, coolant river, boardroom, the bat being handed over) mixed with 3D moments. Mood: warm and growing.
6. **The fireplace.** Quiet night by a fire. Sahur looks at his own hand; for one frame it is static or glitching. You ask, as a subtitle: `will you disappear?` Sahur doesn't answer right away. He looks at the fire. (His reply, if any, is one short line from the game's voice, e.g. `sleep. tomorrow, TUNG.`; the storyboard proposes it.)
7. **The fights.** Fast and kinetic. You and Sahur against the game's enemies (see the roster below), across the three biomes. Sahur's TUNG shockwave rings. The POV swings. Mid-boss flashes.
8. **The final boss: THE AI BUBBLE.** The Core: white, silent, weightless. The Bubble fills the sky, stitched from borrowed sentences, with hype phrases orbiting it. It grows and you can't hurt it.
9. **The final move.** Sahur puts his hand on your shoulder. The music stops. He winds up: **TUNG ... TUNG ...** (the final move). The Bubble **bursts**. White-out. Silence, then tinnitus.
10. **Wake up alone (CONFIRMED: the "Triple T" ending).** Nod to the May–June 2026 meme "We did it Triple T, we popped the AI bubble… Triple T?". After the white-out you wake in bed and a subtitle reads `we did it.`; the POV turns to where Sahur should be, and the space is empty: `…sahur?`. Then hold, and the distant TUNG. (Use the player-subtitle style for both lines.) Original beat notes follow.
    10. **Wake up alone.** Eyes open in your bed. Normal light, no blue. No Sahur. The phone is dark on your chest. Stillness. Then, far away: **one big TUNG**. Hold.
11. **End card.** Echoes the game's real title screen: `SAHUR PROTOCOL`, `TUNG  TUNG  TUNG` and a `[ WAKE UP ]` button (the game's actual start button). Small `EPISODE 1`. The choir swells. No URL was given: design the end card without one, leaving optional space for a small URL line.

CONFIRMED by the user: Sahur's final TUNG is what pops the Bubble, and it costs him everything (in the game's lore, his TUNG drains him near the Core).

## Characters (source: `Sahur_Protocol.html`)
- **Tung Tung Tung Sahur.** A wooden log (cylinder) with a carved, expressive face (thick brows, big round eyes, a long nose), peg arms and legs, and wooden feet. He carries a baseball bat. Warm orange-brown wood (`~#b0743a`, highlights `#e09a52`, shadows `#6b3d1a`). The sprite sheet (idle: weary, slightly sad eyes; attack: fierce brows, bat overhead) is extracted at `marketing/video/sahur-promo/source-art/sahur_*.png`. Personality in-game: terse, warm, fatalistic, protective ("I am almost gone. Get up. We go pop it." / "Don't make the face. Everything costs." / "Hey. It was a good walk." / "Cover your ears."). His TUNG is a rhythmic shockwave that costs him more the closer he gets to the Core.
- **You.** A cream blob (`#e8e4d8`, dark outline, two small dark rectangular eyes). Seen only as POV hands.
- **Enemies** (from the game's `ENEMY_TYPES` and `drawEnemy`):
  - `slopling` `#ff3df0`: a wobbly magenta slop blob with a drip and two pixel eyes ("generated filler given legs").
  - `drone` `#35e8ff`: a buzzword drone with a cyan diamond body, a spinning rotor and one lens eye; fires jargon.
  - `wraith` `#c07bff`: a prompt wraith, a translucent violet ghost with a ragged hem that flickers, drifts, then lunges.
  - `hand` `#b0a4ff`: a scraper hand, a palm with four fingers pointing at you that shakes red during its wind-up, then grabs.
  - `yesman` `#3dff9d`: a little green suit block with a tie and a smile that never moves; circles you agreeing.
  - `golem` `#ffb547`: a pivot golem, stacked amber slabs with a crack down the middle; slow, heavy, splits.
- **Bosses:**
  - **ECHO, THE ENGAGEMENT WRAITH** `#ff3df0`: a wraith in a smooth white expressionless mask, trailed by louder after-images of herself.
  - **THE SCRAPER** `#c07bff`: a data core with rings and a cyan centre, orbited by six grasping hands.
  - **THE VALUATION** `#35e8ff`: a colossal glowing "$999B" number over charts that only go up; "+inf% projected".
  - **THE AI BUBBLE** `#ff3df0`: the final boss. An iridescent sphere (white → `#c8f4ff` → `#ffb3f2` → `#8f7bff`) with a specular arc and an *almost-right* face (eyes slightly different sizes, drifting apart, a smile). It speaks in hype ("this changes everything - thrilled to announce - we believe - at scale - delighted - disrupting"). When it's dying it starts to leak.
- **Biomes:** HYPE CYCLE FOREST (bg `#0b1410`, accent `#3dff9d`), SERVER FARM WASTES (`#12100b`, `#ffb547`; coolant river), BOARDROOM OF BROKEN PROMISES (`#0c0f1a`, `#35e8ff`; nothing outside the window), THE CORE (white, silent).

## Existing art to reuse
- 6 painted cutscene backgrounds (960×600), extracted at `marketing/video/sahur-promo/source-art/bg_*.jpg`: apartment (purple feed city through a broken wall), fire (campfire in the glitch forest), river (coolant river), boardroom (holographic face), core (Sahur's final TUNG in golden light), dawn (sitting together at sunrise, the bat leaning on a rock). They are cinematic and painted, so they suit the "memories" montage (as framed and Ken-Burns'd, light-leaked flashes), not the 3D world itself. They show a hooded kid, so keep him small, cropped or in silhouette.
- The game's palette (CSS vars): ink `#07090f`, panel `#10141f`, line `#232a3d`, real `#ffb547`, wood `#b0743a`, glitch `#ff3df0`, cyan `#35e8ff`, text `#e8e4d8`, dim `#8b8fa3`, danger `#ff4d5e`.
- Fonts in the game: **Press Start 2P** (title, boss names) and **Pixelify Sans** (UI). Use these for in-world text and the end card. For subtitles use a clean sans (Montserrat is fine).

## Colour and emotion script
Cold (phone blue, sirens) → fear (blue plus red siren sweeps) → first warmth (amber enters with Sahur's hand) → warm montage (amber, green forest) → intimate (firelight, deep shadow) → kinetic (neon magenta, cyan, violet) → overwhelming white (the Core, iridescent) → total white → neutral morning daylight (empty, a little cold, real) → black title with amber.

## Brand and deviations
- This is **not an Ahum Labs client film**. CONFIRMED by the user: no Ahum logo, credit or end card anywhere; the end card is the game's own title screen. (The `ahum-casestudy-animated` skill's brand rules about the end card and fonts don't apply here; its pipeline, QA and audio engine do.)
- Banned: real-world logos and brand names on screen, real people, generic robots or glowing brains. The AI Bubble's satire comes from hype language and the glossy almost-right face, not from company logos.
- Sensitivity: Tung Tung Tung Sahur riffs on the Ramadan tradition of waking people for sahur by knocking a kentongan. Keep the film warm toward that idea (he wakes you up because he cares). Nothing mocking.
