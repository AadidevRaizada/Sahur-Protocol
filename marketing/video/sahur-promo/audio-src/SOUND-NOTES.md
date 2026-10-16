# Sahur Protocol "WAKE UP": sound notes

75.000 s at 60 fps (4500 frames; 1 frame = 800 samples at 48 kHz). No voice anywhere: sound and music carry the story.

## Files

| File | What |
|---|---|
| `public/audio/music.wav` | the score plus the game's choir. 3,600,000 samples, 48 kHz, 16-bit stereo |
| `public/audio/cues.json` | `{musicVolume: 0.9, duck: [[1140,1221,0.708],[2282,2348,0.708]], cues: [256 x {file, frame, volume, dur?}]}` |
| `public/audio/sfx/` | 106 library sounds, 102 new sounds and 47 derived film cuts (`<name>_<tag>.wav`, see below) |
| `public/audio/preview_mix.wav` | music × musicVolume × duck + every cue, rendered exactly the way Remotion plays it |

Rebuild from `audio-src/` (Python 3.8, numpy, scipy, ffmpeg on PATH), in this order:

```
python -I make_sfx.py --sahur        # the 102 new SFX (adds to sfx_durations.json)
python -I make_music_sahur.py        # music.wav (decodes choir.mp3 with ffmpeg through a pipe)
python -I make_cues_mix_sahur.py     # cues.json, the derived cuts and preview_mix.wav
python -I qa.py                      # QA; python -I prof.py <wav> [step] [from] [to] for an RMS profile
```

**For the builder.** Mount each cue as `<Sequence from={frame} durationInFrames={dur ?? fileLength}><Audio src={staticFile('audio/'+file)} volume={volume}/></Sequence>`. The music volume is `musicVolume × duck(frame)`, using NavCert `Story.tsx` `musicVol()`: per duck `[a,b,lvl]`, `k = clamp(min(f-a, b-f)/4, 0, 1)` and `v *= 1-(1-lvl)·k`.

Everything that must end at a frame is already cut in its file. `dur` is only a belt-and-braces clip. The reel knocks match `src/rig/reel.ts` (`REEL_LOOP` 72, `REEL_KNOCKS` 12/24/36).

## Score map (music.wav)

| Frames | Section | Tempo / key | What plays |
|---|---|---|---|
| 0-360 | the reel, then silence | none | **digital zero** (the reel is diegetic SFX) |
| 360-1416 | the feed | free, D Phrygian | D1 sine and a D2 saw low-passed at 200 Hz, with a faint bowed D3. A thin Eb3 glass tone from 480 (the flat 2). A low tremolo swell D-F-Ab under the door (878-968). **Under water**: LP 400 Hz until 450, opening to full by 540. Dips -7 dB under the knocks at 740/780/820. Fades 1396-1416 |
| 1336-1410 | first warmth | free, **Dadd9** | Starts exactly on the hand-hold. D3 A3 E4 F#4 pad (F becomes F#, 40 f attack). Marimba motif A4 A4 A4 F#4 D4 at 1350/1362/1374/1390/1402. Reversed-piano swell into the 1410 flare |
| 1410-1890 | montage | **90 BPM** (40 f beat; bars 1410/1570/1730) | D Bm \| G A \| D/F# G Asus4 A. Kalimba 8ths, vibes, warm pad, soft sub. Felt-piano motif: A A A F# D, then B B B A F#, then (rest), then D D D C# A, then G A B D C#. Sahur's woodblock on beats 1-2-3 (rest on 4) in bars 1 and 3. Out in bar 2, where his stump taps (SFX 1570/1610/1650) are the rhythm, with the score ducked -4 dB. Shaker 16ths from 1570. The pad drops out for the cold boardroom memory (1810-1850) |
| 1886-2172 | the fire | rubato, Bm G D/F# | Dark pad and sparse kalimba. **The broken motif**: A4 A4 A4 F#4 at 2076/2088/2100/2116, **no D**. The D's place (2132) is the digital click. Fade 2150-2172 |
| 2172-2282 | the question | none | **digital zero** (fire crackle only) |
| 2282-2400 | his reply | free | One low open fifth (D2 + A2), swelling. Hard cut at 2400 |
| 2400-2976 | the fights | **150 BPM** (24 f beat, bars every 96 f) | D minor → **E minor** at 2592 → **F# minor** at 2784 (i-VI \| iv-V in each key). Taiko kick on 1 and 3; **wood clacks replace the snare** on 2 and 4; hats on 16ths; dark saw bass in 8ths; saw arpeggio in 16ths; staccato string stabs. The motif as a synth-brass hook (5 5 5 3 1): A A A F D, then B B B G E, then C# C# C# A F#. Sahur's woodblock thins: every beat (forest), every beat of bar 3 only (wastes), the downbeat only (boardroom). No kick under the TUNGs (2496/2688/2880), with a -8/-8/-5 dB sidechain. Holes 2550-2556 and 2742-2748 (digital zero); fills 2580 and 2772. **2880**: a big Bm stab whose reverb vanishes at 2900, then digital zero 2900-2904, then back **dry** at 2904 with only two hook notes (B B: the count is running down). One held G# 2928-2940 with no drums. C# tremolo and a riser 2940-2976. Hard cut at 2976. Section limiter at -4.5 dBFS; extra SFX-keyed dips at 2414/2574/2604/2648/2772/2816/2824/2886/2958-2970 |
| 2976-3336 | the Bubble | free; half-time sub from 3120 (every 48 f) | Wine-glass cluster C6 1047 Hz + C#6 1109 Hz, each beating slowly against a partner; the octave above joins from 3168; air; a D1/D2 sub pulse at 3120/3168/3216/3264/3312. Hard cut (2 f) at 3336 |
| 3336-4200 | | | **no music at all** (digital zero) |
| 4200-4500 | end card | the game's choir | `choir.mp3` from 37.20 s, 12-frame linear fade-in; it swells on its own to its first hit at about 4263. Equal-power fade-out over the last 0.5 s |

Silence gates are 3 ms raised-cosine edges, so they read as hard cuts and never click.

## The motif: three knocks, one voice

Every knock in the film is one synthesised voice, `tung_core()` in `make_sfx.py`: a hollow kentongan / slit-drum knock on **A3 = 220 Hz**, the motif's repeated note (TUNG TUNG TUNG sa-hur = A A A F# D). It has:
- a 5 ms wood-crack click and a noise "thock"
- a short downward pitch blip at the strike ("t-UNG")
- the A3 body, the hollow A4 octave, a short inharmonic wood mode, A5, and an A2 cavity boom
- the 1.1 kHz body ring, which is its 5th partial (C#6)

Every partial that rings is harmonic, so the pitch still reads as A with the fundamental gone (phone speaker) or the top gone (far away). Partial analysis of every variant (strongest peaks) shows A3/A4/A5/C#6 throughout. The final and distant TUNGs share the same slight sag (A3 about -15 cents).

| Variant | Where | Character |
|---|---|---|
| `tung_tiny_phone` | the reel: 12/24/36 + 72k (16 knocks); `_cloth` (LP 500 Hz) for 300/312/324 | through a phone speaker (~0.7-5 kHz, soft-clipped, cone rattle); A4/A5 lead |
| `reel_sahur_squeak` | 48/120 (192/264 as `_drowsy`, LP 2.5 kHz) | the squeaky two-note "sa-hur" F#5 → D5 (no voice) |
| `tung_door` | 740, 780, 820 (-9/-8/-7 dBFS) | heavy, even: the body, the door panel (92 Hz), a latch rattle, a 0.6 s room |
| `tung_knuckle` | 2100, 2116; the head-taps 3416/3428 | soft knuckles on his own log: he is the instrument |
| `tung_knuckle_glitch` | 2132 | 3 ms of wood, then a 6 ms dry digital burst, a 30 ms bit-crushed tail (3 kHz sample-and-hold, ~3-bit), then a dead stop |
| `tung_stump` | 1570, 1610, 1650 | warm, mossy, a little forest |
| `tung_small` | 2004, 2034, 2064 (you) | the same pitch, a weaker strike |
| `tung_fight` | 2496, 2688, 2880 (-5/-4.5/-4 dBFS) | full stack: a 90→45 Hz sub, the amber A-major shimmer, an amber shockwave whoosh L→R, a plate. #3 is cut at 2900 with the room |
| `tung_gulp` | 3120 | a small TUNG whose tail is cut at 6 f into a reversed glassy gulp (the Bubble swallows it) |
| `tung_final_1` / `_2` | 3500 / 3572 | enormous: a 76→38 Hz sub, the 1.1 kHz ring, a pitch sag, heard through covered ears (strike LP 2.5 kHz), blooming into a dark cathedral tail. The film cuts (`_film`) are crest-limited 4 dB so they are louder at the same peak |
| `tung_pop` | 3644 (`_film` = its first 6 f) | the third strike fused with the burst: the TUNG, a 6 ms broadband click, a 60 Hz thump, a soap-film "plip" blown up to enormous, a glass shatter, a high iridescent shimmer, a pressure-drop whoomp. The first 100 ms are a complete hit, then a hard cut to digital zero |
| `tung_distant` | 4140 | the final TUNG's own voice, far away: air-absorbed (LP ~2.2 kHz), street-canyon slap-backs at 0.12/0.21/0.33/0.52/0.78/1.1 s, a 3.2 s outdoor tail running into the end card |
| `label_tok_1..3` | 12 toks 1140-1215; 17 toks 2282-2342 (-8 dB) | the TUNG recipe at A5 ±1 semitone; one per typed letter, none on spaces or punctuation |

The count reads 3 (door) → 3 (stump) → 3 (yours) → 2 + a glitch (his knuckles) → 3 fights → 2 + the pop → 1 far away. The score's woodblock (A5) thins with him.

## New SFX (102, all in `make_sfx.py` → `make_sahur()`, `--sahur`)

- **TUNG family (16)**: `tung_tiny_phone reel_sahur_squeak tung_door tung_knuckle tung_knuckle_glitch tung_stump tung_small tung_fight tung_gulp tung_final_1 tung_final_2 tung_pop tung_distant label_tok_1 label_tok_2 label_tok_3`
- **You (9)**: `breath_calm_slow exhale_sleepy breath_scared_loop breath_catch exhale_laugh heartbeat_scared heartbeat_calm heartbeat_ears tinnitus`
- **Feed and city (6)**: `feed_hum` (50 Hz mains plus buzz harmonics, flutter, a faint 2.4 kHz whine), `siren_far siren_pass siren_far_bed` (Doppler wails through walls; the bed's cycle is 96 f, matching the red light sweep), `sync_ping_crowd` (40 phones pinging at once, E6), `room_tone_morning` (air and far traffic, no hum)
- **Bedroom foley (13)**: `duvet_rustle dust_trickle phone_chest_slide door_handle door_creak fog_hiss step_wood_floor knee_wood_floor wood_creak_small bed_creak mitten_wood_pfftok shoulder_pat ear_cover_rub`
- **Montage (13)**: `forest_night_glitch` (wind, 8-bit aliased "glitch crickets", a vein buzz stepping every 4 f), `step_soft step_sahur_wood lantern_creak tape_flutter_whoosh coolant_water mitten_clap bird_far_intune bird_detuned_1 bird_detuned_2 bird_detuned_3` (the morning's birds: quarter-tone-off intervals), `rain_roof glass_ping_reverse`
- **Fire (5)**: `fire_crackle_bed fire_pop log_settle amber_shimmer static_blip`
- **Fights (28)**: `slop_squelch slop_splat_1 slop_splat_2 slop_splat_3 drone_buzz jargon_chirp_bolt drone_spinout riser_fight echo_chime_swell ceramic_crack smile_cracks afterimage_scatter wind_dust_gust server_farm_hum scraper_rattle scraper_grab bat_hit_metal wraith_hiss wraith_whoosh water_ring_rush crack_fizz glass_shatter boardroom_hvac yesman_blips` (two-note "mm-HM" blips locked to the 6 f 16ths), `golem_slam golem_slab_crack valuation_swell glass_crack_big digit_clang`
- **The Bubble and the end (12)**: `applause_synth` (claps on a slightly-too-regular grid, swelling from 3168), `hype_babble` (one to six murmuring formant "speakers" with a corporate cadence: random vowels, no words), `bubble_ping_grid` (glassy E6 every 15 f accelerating to every 8 f), `bubble_inflate_creak shepard_riser` (an 8-octave Shepard-Risset glissando, +18 dB over 168 f, hard end), `bubble_groan bubble_seam_rip letter_tinks light_fizz wood_chunks wood_fall`

**Reused from the library (17)**: `room_tone` (night), `inhale exhale gasp breath_in_quick breath_out_release swipe_tick ui_swoosh whip_whoosh whoosh_air zoom_whoosh card_slide_whoosh reverse_cymbal impact_hit soft_thud box_thunk paper_topple`.

**Derived film cuts (47)** are written by `make_cues_mix_sahur.py`:
- the true-silence and hard-cut trims (`_cutN`)
- the underwater wake-up, with a time-varying 400 Hz → open LP baked in (`feed_hum_film`, `siren_far_uw`, `inhale_uw`)
- the covered ears (`*_ears`, LP 1.2-2.5 kHz)
- the reel's `_drowsy` / `_cloth` copies
- the beds cut to their scenes (`forest_night_glitch_mont`, `fire_crackle_bed_fire` with its 4-frame dropout on the glitch, and others)
- the siren bed with its -20 dB duck at 1336-1380

## Silences and cuts (verified on preview_mix.wav)

- **330-360** and **3650-3690**: digital zero in the music and the preview. Every cue that would cross them is cut, and `make_cues_mix_sahur.py` and `qa.py` both assert it.
- Music digital zero: 0-360, 2172-2282, 2550-2556, 2742-2748, 2900-2904, 3336-4200.
- Near-silences:
  - 2172-2282: fire crackle only, about -35 dB RMS.
  - 3336-3500: the pat, then breath (about -61 to -45 dB), the head-taps and one heartbeat; 3487-3500 is digital zero before TUNG 1.
  - 3628-3644: only the fizz (about -42 dB), then the pop.
  - 4080-4140: morning room tone only, -52 dB RMS.
- Hard cuts:
  - 2400: smash cut; the fire bed and pop are cut.
  - 2900: TUNG #3's plate, the glass, the smiles and the boardroom air.
  - 2976: every fight SFX.
  - 3336: Shepard, babble, applause, pings, breath, heartbeats and the score, with a 2 f fade.
  - 3650: the pop.
  - 4080: the birds, mid-phrase.
  - 4200: the morning room tone.

## Loudness (preview_mix.wav)

- **Integrated -16.41 LUFS**; true peak **-1.23 dBTP**; sample peak -1.24 dBFS. The peak is the pop at 3644, the loudest moment.
- Next loudest: TUNG 2 and TUNG 1 (sample peaks about -1.5 to -2.3 dBFS); the fights peak at -1.6 dBFS.
- music.wav alone: -15.24 LUFS integrated, true peak -2.54 dBTP.
- Momentary maximum: TUNG 2 -9.3 LUFS, TUNG 1 -10.0, choir -12.2 (the choir stays under the final TUNGs). The distant TUNG is -23.3 LUFS, 14.0 dB under TUNG 2 (spec: -14 dB).
- Short-term (3 s) maximum by scene:

| Scene | LUFS |
|---|---|
| reel | -28.5 |
| feed | -25.0 |
| door knocks | -19.6 |
| montage | -14.7 |
| fire | -25.8 (spec about -28) |
| fights | -12.8 |
| Bubble | -16.3 |
| final TUNGs | -12.8 |
| tinnitus | -25.7 |
| choir | -13.7 (spec about -14) |

- The morning is about -46 dB RMS (-39.7 LUFS short-term once the tinnitus has faded; spec about -40), with a quiet patch at -52 dB RMS before the far TUNG.
- Tinnitus peaks at -24 dBFS. The door knocks peak at -9/-8/-7 dBFS.

## Deviations from the storyboard (and why)

1. **The final TUNGs bloom.** The brief's design notes ask for an enormous, long-tailed cathedral TUNG; the storyboard asked for "dry, no reverb tail". They have a dark cathedral bloom, heard through covered ears, but the film cuts manage it so the storyboard's silences hold. TUNG 1's bloom gives way at 3570, TUNG 2's fades out by 3632, and 3632-3644 holds only the fizz before the pop. The full tails are in `tung_final_1/2.wav` for reuse.
2. **TUNG pitch.** The storyboard specified a 1.1 kHz body ring; the brief specified a 180-320 Hz woody body. Both are kept: the body is A3 (220 Hz) and the 1.1 kHz ring is its 5th partial.
3. **The fire's broken motif** is at 2076/2088/2100/2116 instead of 2080/2092/2104/2120. Its last two notes now land with his knuckle toks (no 4-frame flams), and the missing D falls exactly on the 2132 glitch.
4. **The Shepard riser, hype-babble, applause and ping grid are SFX cues**, not part of music.wav. Each is built to end on 3336. The score holds only the glass cluster and the sub pulse there.
5. **TUNG #3 (2880)**: the score drops to its stab and room, and at 2900 the reverb and every room sound are cut (silence to 2904). It returns dry with only two hook notes, then the held note.
6. **The choir** fades out over the last 0.5 s (equal-power, per the brief) instead of 4440-4500. Its short-term maximum is -13.7 LUFS.
7. **Added touches**:
   - a faint bowed D3 in the feed drone, so the drone exists on small speakers
   - the 2.4 kHz whine lives in the hum SFX, not the score
   - the fire bed drops out for the 4 glitch frames
   - the warm pad drops out for the cold boardroom memory
   - a far siren bed (one wail per 96 f, the red sweep) runs 860-1400 so the -20 dB duck at 1336-1380 has something to duck
8. **Filters baked into files**: the underwater wake-up, the covered ears and the reel's falling-asleep and under-cloth filters, because a cue list cannot filter. The under-cloth LP is 500 Hz rather than 350, because 350 Hz left almost nothing of a phone-band signal.
9. **Integrated loudness is -16.4 LUFS** (target "about -16"). The film's peaks are pinned by the pop (the loudest moment) and a true peak under -1 dBTP. Reaching -16.0 would mean compressing the final TUNGs or the choir past the hierarchy the brief asks for (final TUNGs > fights > choir > montage).
10. **Small substitutions**: the swats use `ui_swoosh`; the bat plants and blown-away hits use `box_thunk`; the chip flick uses `label_tok_3`; his blink "tk" is `label_tok_2` at -45 dBFS. The "lantern hum" at the bus stop was not made (the rain and the score cover it).

## Reuse

`make_sfx.py` (including `make_sahur()`) was copied into the skill's `audio-engine/story/make_sfx.py`; the change is purely additive. The generally reusable new WAVs were copied to `assets/sfx-story/` and listed in `references/asset-catalog.md`.
