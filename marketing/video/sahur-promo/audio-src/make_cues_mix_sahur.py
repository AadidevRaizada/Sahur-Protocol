"""Sahur Protocol promo "WAKE UP": builds public/audio/cues.json (60 fps frames) and renders preview_mix.wav exactly the
way Remotion plays it: mix = music * musicVolume * duck(frame) + sum(sfx * volume, placed at its frame, clipped to
`dur` frames if given). Duck = Story.tsx musicVol(): per duck [a, b, lvl], k = clamp(min(f-a, b-f)/4, 0, 1),
v *= 1-(1-lvl)*k, evaluated per frame.

Levels are written as absolute targets (peak dBFS for one-shots, RMS dBFS of the active part for beds) and turned
into volumes from each file's measured peak/RMS. Everything that has to END at a frame is baked into a derived wav
(cut, short cosine fade) and the cue also carries `dur`: the true silences (330-360 and 3650-3690: nothing may
sound inside them), the smash cut at 2400, the cut into the white at 2976, the hard cut at 3336, the birds stopping
at 4080, the morning ending at 4200. Filters a cue list can't express are baked into derived wavs as well: the
underwater wake-up (everything low-passed at 400 Hz until 450, opening by 540), the reel falling asleep and
landing under the duvet, the ears covered from 3440.
Spec: storyboard.md sections 4 and 7. Usage: python -I make_cues_mix_sahur.py
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUD = os.path.join(ROOT, "public", "audio")
SFX = os.path.join(AUD, "sfx")
NF = 4500
N = NF * FR
MUSIC_VOL = 0.9
SILENCE = [(330, 360), (3650, 3690)]  # true digital silence: music 0 and no SFX
rng = np.random.default_rng(7)

C = []
DERIVED = {}
_info = {}


def info(name):
    """(samples, peak, RMS of the active part) of sfx/<name>.wav."""
    if name not in _info:
        x = read_wav(os.path.join(SFX, name + ".wav"))
        pk = float(np.abs(x).max())
        act = np.abs(x).max(axis=1) > pk * 0.03
        rms = float(np.sqrt(np.mean(x[act] ** 2))) if act.any() else 1e-9
        _info[name] = (len(x), pk, rms)
    return _info[name]


def derive(src, tag, frames=None, start=0, fade_out=0, fade_in=0, lpf=None, fc_curve=None, cue_frame=0, gain_pts=None, crest_db=0.0):
    """Write sfx/<src>_<tag>.wav: optional start offset and length (frames), a fixed 4-pole low-pass `lpf`, a
    time-varying low-pass fc_curve [(abs frame, Hz)] (cue_frame = the abs frame of the cue), gain points
    [(frame from the cue, gain)], a linear fade-in and a cosine fade-out (frames). crest_db > 0 limits the peaks
    by that much (louder at the same peak: used for the enormous final TUNGs)."""
    name = "%s_%s" % (src, tag)
    x = read_wav(os.path.join(SFX, src + ".wav"))[int(start * FR):]
    if frames is not None:
        x = x[: int(round(frames * FR))]
    x = x.copy()
    if lpf:
        x = lp(lp(x, lpf, 2), lpf, 2)
    if fc_curve:
        fr = cue_frame + np.arange(len(x)) / FR
        fc = np.exp(np.interp(fr, [p[0] for p in fc_curve], np.log([p[1] for p in fc_curve])))
        x = svf_lp(x, fc)
    if crest_db:
        p0 = np.abs(x).max()
        x = limiter(x, p0 * 10 ** (-crest_db / 20), look=0.004, smooth=0.006)
        x *= p0 / np.abs(x).max()
    if gain_pts:
        x *= np.interp(np.arange(len(x)) / FR, [p[0] for p in gain_pts], [p[1] for p in gain_pts])[:, None]
    if fade_in:
        k = int(fade_in * FR)
        x[:k] *= np.linspace(0, 1, k)[:, None]
    if fade_out:
        f = min(int(fade_out * FR), len(x))
        x[-f:] *= (0.5 * (1 + np.cos(np.linspace(0, np.pi, f))))[:, None]
        x[-1] = 0
    write_wav(os.path.join(SFX, name + ".wav"), x)
    DERIVED[name] = len(x) / SR
    _info.pop(name, None)
    return name


def cue(f, name, pk=None, rms=None, vol=None, cut=None, fade=3):
    """Place sfx `name` at frame f. Level: pk (target peak dBFS) or rms (target RMS dBFS of the active part) or
    vol. cut: the abs frame where it must end (a derived copy is cut there with a `fade`-frame fade). The true
    silences are enforced automatically."""
    f = int(f)
    n, p, r = info(name)
    end = f + n / FR
    for a, b in SILENCE:
        assert not (a <= f < b), ("cue inside a true silence", f, name)
        if f < a < end - 1e-6 and (cut is None or cut > a):
            cut = a
    if vol is None:
        vol = 10 ** (pk / 20) / p if pk is not None else 10 ** (rms / 20) / r
    if vol > 1.0:
        print("  note: %s at %d wants volume %.2f, clamped to 1.0" % (name, f, vol))
        vol = 1.0
    dur = None
    if cut is not None and end > cut + 1e-6:
        L = int(cut - f)
        name = derive(name, "cut%d" % L, frames=L, fade_out=min(fade, L))
        dur = L
    c = {"file": "sfx/%s.wav" % name, "frame": f, "volume": round(float(vol), 4)}
    if dur:
        c["dur"] = dur
    C.append(c)
    return c


TOK = ["label_tok_1", "label_tok_2", "label_tok_3"]


def toks(frames, pkdb):
    for f in frames:
        cue(f, TOK[int(rng.integers(0, 3))], pk=pkdb + rng.uniform(-1.0, 1.0))


def typed(start, text, step=3):
    """Frames of the letters of `text` typed at `step` f per character (no tok on spaces or punctuation)."""
    return [start + step * i for i, ch in enumerate(text) if ch.isalpha()]


# =============================================================================================== BEAT 1  THE REEL 0-330
rt = derive("room_tone", "night", frames=330, fade_in=30, fade_out=12)
cue(0, rt, rms=-52)
cue(0, "breath_calm_slow", pk=-35, cut=330, fade=10)
sq_lp = derive("reel_sahur_squeak", "drowsy", lpf=2500)  # the falling-asleep filter (lids < 0.2)
for L, lvl in enumerate([-17.5, -18.0, -20.0, -22.5]):  # the phone drifts away as the lids get heavy
    base = 72 * L
    for k, off in enumerate((12, 24, 36)):
        cue(base + off, "tung_tiny_phone", pk=lvl - (0.6 if k == 1 else 0.0))
    cue(base + 48, "reel_sahur_squeak" if L < 2 else sq_lp, pk=lvl - 3.0)
cue(70, "swipe_tick", pk=-40)  # thumb tick on glass (the aborted scroll)
cue(280, "phone_chest_slide", pk=-25)
cue(286, "exhale_sleepy", pk=-29, cut=330, fade=8)
muf = derive("tung_tiny_phone", "cloth", lpf=500)  # the last triplet under the duvet
for f in (300, 312, 324):
    cue(f, muf, pk=-37)

# =============================================================================================== BEAT 2  WAKING 330-720
# 330-360 digital silence. Under water: everything low-passed at 400 Hz until 450, opening to full by 540.
UW = [(300, 400), (450, 400), (540, 18000), (560, 20000)]
hum = derive("feed_hum", "film", frames=1040, fade_in=60, fade_out=60, fc_curve=UW, cue_frame=360)  # 360-1400
cue(360, hum, rms=-37.5)
cue(384, derive("siren_far", "uw", fc_curve=UW, cue_frame=384), pk=-31)
cue(452, derive("inhale", "uw", fc_curve=UW, cue_frame=452), pk=-30)
cue(548, "duvet_rustle", pk=-30)
for f in (612, 636, 660, 684):
    cue(f, "sync_ping_crowd", pk=-33)
cue(672, "siren_pass", pk=-24)

# =============================================================================================== BEAT 3  SAHUR ARRIVES 720-1080
for f, p in [(740, -9.0), (780, -8.0), (820, -7.0)]:  # TUNG. TUNG. TUNG. (40 f apart: the 90 BPM to come)
    cue(f, "tung_door", pk=p)
for f in (742, 782, 822):
    cue(f, "dust_trickle", pk=-33)
HB = [790, 832, 870, 904, 934, 960, 984, 1010, 1036, 1062, 1088, 1114, 1142, 1172, 1206, 1248, 1290]
for i, f in enumerate(HB):
    cue(f, "heartbeat_scared", pk=float(np.interp(f, [790, 1010, 1142, 1290], [-21, -15, -16, -20])))
cue(1350, "heartbeat_calm", pk=-20)
cue(1410, "heartbeat_calm", pk=-24)
cue(824, derive("breath_scared_loop", "s3", frames=486, fade_in=10, fade_out=8), rms=-35.5)  # 824-1310; held breath after
sb = derive("siren_far_bed", "s3", frames=540, fade_in=40, gain_pts=[(0, 1), (476, 1), (520, 0.1), (540, 0.0)])  # ducks -20 dB 1336-1380
cue(860, sb, rms=-42.5)
cue(872, "door_handle", pk=-24)
cue(890, "door_creak", pk=-20)
cue(900, "fog_hiss", rms=-38.5)
cue(962, "gasp", pk=-22)
cue(990, "step_wood_floor", pk=-15)
cue(1018, "step_wood_floor", pk=-14)
cue(1060, "label_tok_2", pk=-45)  # his slow blink: a tiny wooden 'tk'

# =============================================================================================== BEAT 4  LET'S GO 1080-1410
cue(1124, "knee_wood_floor", pk=-17)
toks(typed(1140, "let's go.") + typed(1191, " let's go."), -23)  # 12 toks
cue(1336, "mitten_wood_pfftok", pk=-20)  # contact: no breath sound 1310-1336, then this
cue(1342, "exhale", pk=-24)
cue(1352, "bed_creak", pk=-30)
cue(1356, "wood_creak_small", pk=-30)

# =============================================================================================== BEAT 5  MONTAGE 1410-1890
cue(1410, derive("forest_night_glitch", "mont", frames=480, fade_in=16, fade_out=6), rms=-41)
for f in (1410, 1450, 1850):
    cue(f, "step_soft", pk=-30)
for f in (1430, 1470, 1870):
    cue(f, "step_sahur_wood", pk=-25)
cue(1444, "lantern_creak", pk=-35)
for f in (1490, 1670, 1810):
    cue(f, "tape_flutter_whoosh", pk=-26)
cue(1490, derive("coolant_water", "river", frames=60, fade_in=8, fade_out=8), rms=-37)
for f in (1570, 1610, 1650):  # the rhythm, shown: his stump taps replace the score's woodblock
    cue(f, "tung_stump", pk=-12)
cue(1654, "mitten_clap", pk=-25)  # 4 frames late
cue(1690, "bird_far_intune", pk=-32)
cue(1730, derive("rain_roof", "shelter", frames=80, fade_in=10, fade_out=8), rms=-37)
cue(1810, "glass_ping_reverse", pk=-26)

# =============================================================================================== BEAT 6  THE FIRE 1890-2400
# the fire bed drops out for the 4 glitch frames (2132-2135) and is cut at the smash cut (2400)
fire = derive("fire_crackle_bed", "fire", frames=510, fade_in=12, fade_out=2, gain_pts=[(0, 1), (241.5, 1), (242, 0), (246, 0), (246.5, 1), (510, 1)])
cue(1890, fire, rms=-35)
cue(1912, "fire_pop", pk=-22)
cue(1955, "fire_pop", pk=-25)
for f, p in [(2004, -21.0), (2034, -21.0), (2064, -20.0)]:  # your taps: small, softer than his
    cue(f, "tung_small", pk=p)
cue(2064, "amber_shimmer", pk=-33)
cue(2100, "tung_knuckle", pk=-17)
cue(2116, "tung_knuckle", pk=-17)
cue(2132, "tung_knuckle_glitch", pk=-13)  # the third knock never sounds as wood
cue(2146, "static_blip", pk=-28)
cue(2240, "log_settle", pk=-26)
toks(typed(2282, "sleep. tomorrow, TUNG."), -31)  # 17 soft toks (-8 dB)
cue(2394, "fire_pop", pk=-15, cut=2400, fade=1)

# =============================================================================================== BEAT 7  FIGHTS 2400-2976 (all cut at 2976)
W = 2976


def fx(f, name, **kw):
    kw.setdefault("cut", W)
    return cue(f, name, **kw)


fx(2404, "slop_squelch", pk=-13)
fx(2408, "ui_swoosh", pk=-17)
fx(2414, "slop_splat_1", pk=-10)
fx(2424, "whip_whoosh", pk=-14)
fx(2430, "drone_buzz", pk=-19, cut=2448)
fx(2436, "jargon_chirp_bolt", pk=-14)
fx(2438, "whoosh_air", pk=-19)
fx(2442, "jargon_chirp_bolt", pk=-15)
for f in (2448, 2460, 2472, 2484):
    fx(f, "step_soft", pk=-21)
for f in (2454, 2478):
    fx(f, "step_sahur_wood", pk=-21)
fx(2452, "slop_squelch", pk=-21)
fx(2462, "slop_squelch", pk=-23)
fx(2472, "riser_fight", pk=-15)
fx(2474, "reverse_cymbal", pk=-17)
fx(2496, "tung_fight", pk=-5.0)  # TUNG #1
for f, v, p in [(2500, 1, -14), (2505, 2, -15), (2510, 3, -15), (2516, 1, -17), (2522, 2, -18), (2528, 3, -19)]:
    fx(f, "slop_splat_%d" % v, pk=p)
fx(2504, "drone_spinout", pk=-16)
fx(2512, "drone_spinout", pk=-19)
fx(2544, "zoom_whoosh", pk=-14)
fx(2556, "echo_chime_swell", pk=-15)
fx(2574, "impact_hit", pk=-10)
fx(2576, "ceramic_crack", pk=-10)
fx(2580, "afterimage_scatter", pk=-16)
fx(2592, "wind_dust_gust", pk=-19)
fx(2592, derive("server_farm_hum", "wastes", frames=192, fade_in=3, fade_out=2), rms=-36)
fx(2592, derive("coolant_water", "wastes", frames=192, fade_in=6, fade_out=2), rms=-37)
fx(2600, "soft_thud", pk=-19)
fx(2604, "step_sahur_wood", pk=-12)
fx(2616, "scraper_rattle", pk=-16)
fx(2640, "scraper_grab", pk=-12)
fx(2648, "bat_hit_metal", pk=-9)
fx(2652, "wraith_hiss", pk=-19)
fx(2664, "riser_fight", pk=-16)
fx(2670, "wraith_whoosh", pk=-12)
fx(2688, "tung_fight", pk=-4.5)  # TUNG #2
fx(2690, "water_ring_rush", pk=-12)
fx(2696, "box_thunk", pk=-17)
fx(2704, "box_thunk", pk=-19)
fx(2714, "crack_fizz", pk=-14)
fx(2716, "label_tok_3", pk=-24)  # a wood chip flicks off
fx(2736, "heartbeat_scared", pk=-15)
fx(2740, "box_thunk", pk=-16)  # the bat plants
fx(2748, "scraper_rattle", pk=-17)
fx(2754, "scraper_grab", pk=-16)
fx(2760, "scraper_grab", pk=-15)
fx(2766, "whip_whoosh", pk=-14)
fx(2772, "impact_hit", pk=-10)
fx(2774, "glass_shatter", pk=-10)
fx(2774, "digit_clang", pk=-21)
fx(2784, derive("boardroom_hvac", "board", frames=116, fade_in=3, fade_out=1), rms=-39)  # the room's air vanishes at 2900
fx(2784, "card_slide_whoosh", pk=-16)
fx(2784, "yesman_blips", pk=-20)
fx(2816, "golem_slam", pk=-7)
fx(2818, "paper_topple", pk=-21)
fx(2824, "golem_slab_crack", pk=-9)
fx(2846, "step_sahur_wood", pk=-12)
fx(2856, "riser_fight", pk=-15)
fx(2860, "crack_fizz", pk=-16)
fx(2880, "tung_fight", pk=-4.0, cut=2900, fade=2)  # TUNG #3: its plate dies with the room at 2900
fx(2880, "impact_hit", pk=-12, cut=2900, fade=2)  # the table's resonance
fx(2886, "glass_shatter", pk=-13, cut=2900, fade=2)
fx(2888, "smile_cracks", pk=-16, cut=2900, fade=2)
fx(2904, "knee_wood_floor", pk=-12)
fx(2906, "crack_fizz", pk=-16)
fx(2940, "valuation_swell", pk=-14)
fx(2952, "riser_fight", pk=-14)
fx(2958, "glass_crack_big", pk=-9)
for f, p in [(2962, -13), (2966, -14), (2970, -15)]:
    fx(f, "digit_clang", pk=p, fade=4)

# =============================================================================================== BEAT 8  THE BUBBLE 2976-3336 (all cut at 3336)
B = 3336
cue(2976, "applause_synth", pk=-21, cut=B)
cue(3020, "hype_babble", pk=-15, cut=B)
cue(3040, "bubble_ping_grid", pk=-25, cut=B)
cue(3088, "ui_swoosh", pk=-23)  # swat through nothing: hollow air
cue(3120, "tung_gulp", pk=-10)
cue(3126, "bubble_inflate_creak", pk=-16)
cue(3168, "shepard_riser", pk=-9.5, cut=B)
cue(3168, derive("breath_scared_loop", "bubble", start=1.0, frames=168, fade_in=12, fade_out=2), rms=-34)
for i, f in enumerate([3180, 3212, 3240, 3266, 3290, 3312]):
    cue(f, "heartbeat_scared", pk=-18 + 0.7 * i, cut=B, fade=2)

# =============================================================================================== BEAT 9  THE FINAL MOVE 3336-3720
cue(3336, "shoulder_pat", pk=-24)  # the only sound under the cut
cue(3350, "breath_out_release", pk=-27)
cue(3396, "breath_in_quick", pk=-27)
cue(3416, "tung_knuckle", pk=-31)  # head-taps: 'cover your ears'
cue(3428, "tung_knuckle", pk=-31)
cue(3440, "ear_cover_rub", pk=-23)
for f, p in [(3446, -9.0), (3536, -17.0), (3606, -17.0)]:  # isolated heartbeats, dry, from inside covered ears
    cue(f, "heartbeat_ears", pk=p)
EARS = {}


def ears(name, lpf=1200):
    if name not in EARS:
        EARS[name] = derive(name, "ears", lpf=lpf)
    return EARS[name]


cue(3500, derive("tung_final_1", "film", frames=70, fade_out=8, crest_db=4.0), pk=-3.3)  # TUNG 1: its bloom gives way at 3570
cue(3502, ears("wood_chunks"), pk=-17)
cue(3510, ears("bubble_groan"), pk=-15)
cue(3572, derive("tung_final_2", "film", frames=60, fade_out=24, crest_db=4.0), pk=-2.6)  # TUNG 2: blooms, fades by 3632
cue(3572, ears("letter_tinks", 2000), pk=-31, cut=3644)
cue(3576, ears("bubble_seam_rip", 2500), pk=-15, cut=3620, fade=10)
cue(3600, ears("wood_fall"), pk=-20, cut=3632, fade=6)
cue(3620, "light_fizz", pk=-37, cut=3644, fade=4)  # nothing 3620-3644 but the faint fizz of his light
POP = derive("tung_pop", "film", frames=6, fade_out=1)  # the pop, then a hard cut to digital silence at 3650
cue(3644, POP, pk=-1.25)
cue(3690, "tinnitus", pk=-24)  # 3.0 + 3.9 kHz, -40 -> -24 dBFS by 3720, fading 3800-3920 under the room tone

# =============================================================================================== BEAT 10  WAKE UP ALONE 3720-4200
cue(3800, derive("room_tone_morning", "film", frames=400, fade_in=40, fade_out=2), rms=-52)  # no hum: 'real'
cue(3848, "exhale_laugh", pk=-31)
for f, v, p in [(3880, 1, -34), (3930, 2, -35), (3962, 3, -35), (4012, 1, -35), (4040, 2, -34)]:
    cue(f, "bird_detuned_%d" % v, pk=p, cut=4080, fade=2)  # the birds stop mid-phrase at 4080
cue(3920, "duvet_rustle", pk=-32)
cue(4004, "inhale", pk=-32)
DIST = cue(4140, "tung_distant", vol=0.5)  # level set below: -14 dB against TUNG 2
cue(4146, "breath_catch", pk=-29)

# =============================================================================================== render
DUCK = [[1140, 1221, 0.708], [2282, 2348, 0.708]]  # the score -3 dB under the labels' toks


def music_gain_frames(music_vol, duck):
    g = np.empty(NF)
    for f in range(NF):
        v = music_vol
        for a, b, lvl in duck:
            k = min(1.0, max(0.0, min(f - a, b - f) / 4.0))
            v *= 1 - (1 - lvl) * k
        g[f] = v
    return g


def place(buf, c, cache):
    if c["file"] not in cache:
        cache[c["file"]] = read_wav(os.path.join(AUD, c["file"]))
    x = cache[c["file"]]
    s = c["frame"] * FR
    n = len(x) if "dur" not in c else min(len(x), c["dur"] * FR)
    e = min(s + n, len(buf))
    buf[s:e] += x[: e - s] * c["volume"]


def momentary_max(x):
    return loud_curve(x, 0.4, 0.05)[1].max()


if __name__ == "__main__":
    music = read_wav(os.path.join(AUD, "music.wav"))
    assert len(music) == N, len(music)
    cache = {}
    # the distant TUNG: -14 dB (momentary loudness) against TUNG 2
    t2 = [c for c in C if c["file"].startswith("sfx/tung_final_2")][0]
    b2 = np.zeros((int(1.2 * SR), 2))
    place(b2, dict(t2, frame=0), cache)
    bd2 = np.zeros((int(5 * SR), 2))
    place(bd2, dict(DIST, frame=0, volume=1.0), cache)
    DIST["volume"] = round(float(min(1.0, 10 ** ((momentary_max(b2) - 14.0 - momentary_max(bd2)) / 20))), 4)
    for c in C:
        assert os.path.exists(os.path.join(AUD, c["file"])), c["file"]
        assert 0 <= c["volume"] <= 1 and 0 <= c["frame"] < NF, c
    sfx = np.zeros((N, 2))
    for c in C:
        place(sfx, c, cache)
    mus = music * np.repeat(music_gain_frames(MUSIC_VOL, DUCK), FR)[:, None]
    mix = mus + sfx
    for a, b in SILENCE:
        assert not np.any(mix[a * FR:b * FR]), ("not silent", a, b)
    pk = np.max(np.abs(mix))
    il, mm = lufs(mix)
    print("preview: peak %.2f dBFS, true peak %.2f dBTP, LUFS %.2f integrated (momentary max %.2f) | music alone %.2f | sfx alone %.2f" % (
        20 * np.log10(pk), true_peak_db(mix), il, mm, lufs(mus)[0], lufs(sfx)[0]))
    write_wav(os.path.join(AUD, "preview_mix.wav"), mix)
    C.sort(key=lambda c: (c["frame"], c["file"]))
    json.dump({"musicVolume": MUSIC_VOL, "duck": DUCK, "cues": C}, open(os.path.join(AUD, "cues.json"), "w"), indent=1)
    fr = sorted(c["frame"] for c in C)
    dens = sorted(((sum(1 for f in fr if s <= f < s + 60), s) for s in range(0, NF - 60, 15)), reverse=True)
    print(len(C), "cues,", len({c["file"] for c in C}), "files, derived:", len(DERIVED), "| distant TUNG volume", DIST["volume"])
    print("busiest 1 s windows (cues, start frame):", dens[:6])
