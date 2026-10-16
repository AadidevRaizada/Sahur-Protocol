"""NavCert story film: builds cues.json (60 fps frames) and renders preview_mix.wav exactly the way Remotion plays it:
mix = music * musicVolume * duck(frame)  +  sum(sfx * volume placed at its frame, clipped to `dur` frames if given).
Duck = Story.tsx musicVol(): per duck [a, b, lvl], k = clamp(min(f-a, b-f)/4, 0, 1), v *= 1-(1-lvl)*k, evaluated per frame.
Everything that has to END at a frame (the hard cut at 466, the port bed, the birds) is baked into derived wavs with a
4-frame (or longer) fade, so the cue's `dur` is only a belt-and-braces clip. Spec: storyboard.md section 8.2.
Usage: python -I make_cues_mix.py [musicVolume]
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUD = os.path.join(ROOT, "public", "audio")
SFX = os.path.join(AUD, "sfx")
MUSIC_VOL = float(sys.argv[1]) if len(sys.argv) > 1 else 0.85
SFX_SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.62  # one master trim for every cue except the breath window
ABS_FRAMES = {498, 548, 570, 576}  # the breath window cues are set in absolute terms (they are the only sound there)
CUT = 466  # everything in the "before" is cut hard here
rng = np.random.default_rng(3)

C = []
DERIVED = {}
_len_cache = {}


def sfx_frames(name):
    if name not in _len_cache:
        _len_cache[name] = len(read_wav(os.path.join(SFX, name + ".wav"))) / FR
    return _len_cache[name]


def derive(src, frames, tag, fade_frames=4, fade_in=0):
    """First `frames` frames of `src` with a baked fade-out over its last `fade_frames` frames (cosine). Returns the new name."""
    name = "%s_%s" % (src, tag)
    x = read_wav(os.path.join(SFX, src + ".wav"))
    n = int(frames * FR)
    x = x[:n].copy()
    f = min(int(fade_frames * FR), len(x))
    w = 0.5 * (1 + np.cos(np.linspace(0, np.pi, f)))
    x[-f:] *= w[:, None]
    if fade_in:
        k = int(fade_in * FR)
        x[:k] *= np.linspace(0, 1, k)[:, None]
    x[-1] = 0
    write_wav(os.path.join(SFX, name + ".wav"), x)
    DERIVED[name] = len(x) / SR
    return name


def cue(f, name, vol, cut=None, short=None):
    """cut: frame at which this cue must end (the sound is trimmed and faded if it would run past it).
    short: force the cue to last only this many frames (a short buzz)."""
    f = int(round(f))
    dur = None
    n_frames = sfx_frames(name)
    end = None
    if short is not None:
        end = short
    elif cut is not None and f + n_frames > cut + 0.01:
        end = cut - f
    if end is not None and end < n_frames - 0.01:
        end = int(end)
        name = derive(name, end, "cut%d" % end)
        dur = end
    c = {"file": "sfx/%s.wav" % name, "frame": f, "volume": round(float(vol), 3)}
    if dur:
        c["dur"] = dur
    C.append(c)


def clipped(f, name, vol):
    cue(f, name, vol, cut=CUT)


# ------------------------------------------------------------------------------------------------ S1 (0-210) Late evening
# the room tone lives from 0 to 454 and fades 454-466 (baked: the file is cut to exactly 466 frames)
rt = derive("room_tone", CUT, "s1s2", fade_frames=12)
C.append({"file": "sfx/%s.wav" % rt, "frame": 0, "volume": 0.085, "dur": CUT})
clipped(24, "harbour_horn", 0.13)
clipped(36, "sonar_ping_dry", 0.26)
for f, n in [(40, "clock_tick"), (100, "clock_tock"), (160, "clock_tick")]:
    clipped(f, n, 0.15)
for f in (70, 105, 170):
    clipped(f, "keyboard_ticks_gentle", 0.14)
clipped(96, "sonar_ping_dry", 0.28)
clipped(96, "phone_buzz", 0.10)
clipped(118, "sigh", 0.14)
clipped(150, "clock_accel", 0.19)
clipped(156, "sonar_ping_dry", 0.30)
clipped(196, "email_ding_e5", 0.24)
clipped(196, "sonar_ping_dry", 0.30)
clipped(206, "phone_buzz", 0.20)
# ------------------------------------------------------------------------------------------------ S2 (210-480) Overwhelm
clipped(214, "impact_hit", 0.46)
for f in (214, 262, 310, 358, 406, 454):
    clipped(f, "phone_ring", 0.22)
for f in (214, 262, 310, 358, 406):  # paper bed restarts every 48 frames (a 454 restart would be a 12-frame sliver)
    clipped(f, "paper_rustle_bed", 0.11)
for i in range(28):  # 28 thump-whooshes, one per 1.5 frames, seeded volume
    cue(216 + round(i * 1.5), "whoosh_thump_%d" % (1 + int(rng.integers(0, 4))), round(float(rng.uniform(0.09, 0.15)), 3))
clipped(218, "gasp", 0.19)
clipped(222, "keyboard_clatter", 0.15)
clipped(270, "keyboard_clatter", 0.15)
flutter = [214, 244, 274, 304] + [f for f in range(330, 451, 15) if f != 375]  # 375 would double the red ping at 370
for f in flutter:
    clipped(f, "sonar_ping_dry", 0.20 + 0.16 * (f - 214) / (450 - 214))
clipped(258, "paper_swish", 0.18)
clipped(298, "soft_thud", 0.26)
clipped(312, "paper_swish", 0.10)
clipped(328, "zoom_whoosh", 0.21)
for f, v in [(330, 0.36), (386, 0.40), (436, 0.44)]:
    clipped(f, "heartbeat", v)
clipped(346, "marker_circle", 0.30)
clipped(370, "sonar_ping_dry", 0.40)
clipped(372, "marker_scribble", 0.18)
clipped(372, "clock_whir", 0.17)
clipped(396, "pullback_whoosh", 0.16)
clipped(400, "text_sting", 0.25)
clipped(406, "riser", 0.28)  # 1.0 s: ends exactly at the cut
clipped(436, "paper_topple", 0.22)
# ------------------------------------------------------------------------------------------------ S3 (466-600) The breath
cue(498, "breath_in_quick", 0.24)  # absolute levels (not scaled): peaks about -12.5 dBFS, a quiet breath in a silent room
cue(548, "breath_out_release", 0.24)
cue(570, "binder_snap", 0.12)
cue(576, "power_on", 0.10)
cue(588, "sonar_ping_g5_echo", 0.46)
cue(588, "bell_shimmer", 0.20)
cue(598, "box_thunk", 0.28)
# ------------------------------------------------------------------------------------------------ S4 (600-780) Sort
cue(604, "lift_pop", 0.22)
cue(606, "ui_swoosh", 0.16)
for i, f in enumerate([618, 633, 648, 663, 678, 693, 708, 723]):
    cue(f, "fwip_%d" % (1 + i % 6), 0.22)
for f in [640, 670, 700, 730]:  # reader-line ticks, one per beat (the spec has 18 on the 16th grid; thinned so the stream stays readable)
    cue(f, "line_tick", 0.20)
for f, n in [(652, "card_pop_fs4"), (682, "card_pop_a4"), (712, "card_pop_b4"), (742, "section_pop_d5")]:
    cue(f, n, 0.23)
cue(760, "confirm_chime", 0.24)
cue(760, "sonar_ping_g5_echo", 0.18)
# ------------------------------------------------------------------------------------------------ S5 (780-930) Class report
cue(782, "card_slide_whoosh", 0.17)
cue(800, "marker_circle", 0.28)
cue(822, "sonar_ping_dry", 0.34)
for f in [826, 836, 846]:  # connector draws (6 in the spec, thinned to every other)
    cue(f, "line_tick", 0.18)
for f in [839, 849, 859]:  # badge pops on every other connector
    cue(f, "tick_pop", 0.24)
cue(850, "tiny_chime", 0.20)
cue(884, "click", 0.21)
cue(904, "soft_thud", 0.26)
cue(906, "swipe_tick", 0.20)
cue(910, "sonar_ping_g5_echo", 0.42)
cue(912, "confirm_chime", 0.27)
cue(914, "spark_chime", 0.22)
# ------------------------------------------------------------------------------------------------ S6 (930-1020) Today
cue(930, "swipe_tick", 0.18)
cue(938, "tick_pop", 0.20)
cue(944, "whoosh_air", 0.10)
cue(952, "card_pop_b4", 0.22)
cue(960, "tiny_chime", 0.20)
cue(1004, "click", 0.21)
cue(1006, "confirm_chime", 0.25)
# ------------------------------------------------------------------------------------------------ S7 (1020-1170) Planner and Ask
cue(1020, "ui_swoosh", 0.16)
for f in [1026, 1034, 1042, 1050, 1058]:
    cue(f, "tick_pop", 0.22)
cue(1046, "swipe_tick", 0.18)
cue(1062, "lift_pop", 0.22)
cue(1062, "soft_thud", 0.18)
cue(1086, "ask_tone", 0.19)
for f in (1098, 1116, 1134):
    cue(f, "keyboard_ticks_gentle", 0.15)
cue(1142, "ask_tone", 0.20)
for f, n in [(1148, "card_pop_fs4"), (1153, "card_pop_a4"), (1158, "card_pop_b4"), (1163, "section_pop_d5")]:
    cue(f, n, 0.22)
cue(1166, "tiny_chime", 0.20)
# ------------------------------------------------------------------------------------------------ S8 (1170-1350) Pack link, inspector, Viewed
cue(1172, "card_pop_b4", 0.22)
for i, f in enumerate([1176, 1184, 1192, 1200]):  # 16 sheets converge
    cue(f, "fwip_%d" % (1 + i % 6), 0.20)
for f in (1190, 1202):
    cue(f, "soft_thud", 0.10)
cue(1208, "lift_pop", 0.22)
cue(1214, "click", 0.21)
cue(1218, "whoosh_air", 0.15)
cue(1222, "whip_whoosh", 0.22)
pa = derive("port_ambience", 50, "s8b", fade_frames=14, fade_in=0)  # 1246-1296, fades out by 1296
C.append({"file": "sfx/%s.wav" % pa, "frame": 1246, "volume": 0.12, "dur": 50})
cue(1252, "gull", 0.12)
cue(1262, "phone_buzz", 0.20, short=6)
cue(1268, "phone_buzz", 0.20, short=14)
cue(1278, "tick_pop", 0.20)
cue(1286, "ui_swoosh", 0.16)
for f, n in [(1298, "card_pop_fs4"), (1304, "card_pop_a4"), (1310, "card_pop_b4"), (1316, "section_pop_d5"), (1322, "section_pop_fs5")]:
    cue(f, n, 0.24)
cue(1324, "confirm_chime", 0.25)
cue(1324, "chime_up", 0.22)
cue(1334, "sonar_ping_g6_echo", 0.50)
# ------------------------------------------------------------------------------------------------ S9 (1350-1470) Calm morning
cue(1352, "pullback_whoosh", 0.16)
bs = derive("birdsong", 118, "s9", fade_frames=14)  # 1352-1470, fades out by 1470
C.append({"file": "sfx/%s.wav" % bs, "frame": 1352, "volume": 0.10, "dur": 118})
cue(1362, "harbour_horn", 0.22)
cue(1376, "mug_lift", 0.17)
cue(1404, "chime_up", 0.22)
cue(1416, "tiny_chime", 0.18)
cue(1446, "sigh", 0.06)
cue(1462, "whoosh_up", 0.20)
# ------------------------------------------------------------------------------------------------ S10 (1470-1650) The numbers
for f in (1486, 1524, 1562):
    cue(f, "soft_thud", 0.25)
for c0 in (1488, 1526, 1564):  # counting ticks, one card each (thinned from 7 to 2 per card)
    for k in range(2):
        cue(c0 + 12 * k, "line_tick", 0.17)
for f, n in [(1514, "chime_up"), (1554, "chime_up"), (1592, "spark_chime")]:
    cue(f, n, 0.22)
cue(1546, "swoop_down", 0.17)
for i, f in enumerate(range(1578, 1611, 4)):  # ten stamps: woodblock 1-8, then two tick_pops
    cue(f, "woodblock_%d" % (i + 1) if i < 8 else "tick_pop", 0.21 if i < 8 else 0.18)
# ------------------------------------------------------------------------------------------------ S11 (1650-1800) End card
cue(1666, "logo_tick", 0.10)
cue(1666, "sonar_ping_g6_echo", 0.24)
cue(1722, "chime_people", 0.16)
cue(1736, "tick_pop", 0.05)
cue(1764, "url_tick", 0.05)
for c in C:
    if c["frame"] not in ABS_FRAMES:
        c["volume"] = round(c["volume"] * SFX_SCALE, 3)
C.sort(key=lambda c: (c["frame"], c["file"]))

# Duck the music 3 dB under SFX hits: typing, the five ticks, the three counters
D3 = 0.708
DUCK = [[1096, 1146, D3], [1298, 1326, D3], [1488, 1514, D3], [1526, 1552, D3], [1564, 1590, D3]]


def music_gain_frames(music_vol, duck):
    g = np.empty(1800)
    for f in range(1800):
        v = music_vol
        for a, b, lvl in duck:
            k = min(1.0, max(0.0, min(f - a, b - f) / 4.0))
            v *= 1 - (1 - lvl) * k
        g[f] = v
    return g


def render(music_vol, duck, cues, music):
    sfx_only = np.zeros((TOTAL, 2))
    cache = {}
    for c in cues:
        if c["file"] not in cache:
            cache[c["file"]] = read_wav(os.path.join(AUD, c["file"]))
        x = cache[c["file"]]
        s = c["frame"] * FR
        n = len(x) if "dur" not in c else min(len(x), c["dur"] * FR)
        e = min(s + n, TOTAL)
        sfx_only[s:e] += x[: e - s] * c["volume"]
    gf = music_gain_frames(music_vol, duck)
    mus = music * np.repeat(gf, FR)[:, None]
    return mus, sfx_only


def density(cues):
    fr = sorted(c["frame"] for c in cues)
    worst = []
    for start in range(0, 1800 - 60, 15):
        n = sum(1 for f in fr if start <= f < start + 60)
        worst.append((n, start))
    return worst


if __name__ == "__main__":
    music = read_wav(os.path.join(AUD, "music.wav"))
    assert len(music) == TOTAL, len(music)
    for c in C:
        assert os.path.exists(os.path.join(AUD, c["file"])), c["file"]
        assert 0 <= c["volume"] <= 1 and 0 <= c["frame"] < 1800
    mus, sfx_only = render(MUSIC_VOL, DUCK, C, music)
    mix = mus + sfx_only
    mix[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))[:, None]
    pk = np.max(np.abs(mix))
    print("mix peak %.3f (%.2f dBFS), true peak %.2f dBTP" % (pk, 20 * np.log10(pk), true_peak_db(mix)))
    il, st = lufs(mix)
    print("mix LUFS %.2f (short-term max %.2f) | music alone %.2f | sfx alone %.2f" % (il, st, lufs(mus)[0], lufs(sfx_only)[0]))
    write_wav(os.path.join(AUD, "preview_mix.wav"), mix)
    json.dump({"musicVolume": MUSIC_VOL, "duck": DUCK, "cues": C}, open(os.path.join(AUD, "cues.json"), "w"), indent=1)
    d = density(C)
    d.sort(reverse=True)
    print(len(C), "cues,", len({c['file'] for c in C}), "files, derived:", len(DERIVED))
    print("busiest 1-s windows (cues, start frame):", d[:10])
