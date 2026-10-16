"""Builds cues.json (60 fps frames) and renders preview_mix.wav exactly the way Remotion should:
mix = music * musicVolume * duck(frame)  +  sum(sfx * volume placed at frame)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUD = os.path.join(ROOT, "public", "audio")
MUSIC_VOL = float(sys.argv[1]) if len(sys.argv) > 1 else 0.85
rng = np.random.default_rng(3)

C = []


def cue(f, name, v):
    C.append({"file": "sfx/%s.wav" % name, "frame": int(f), "volume": round(float(v) * 0.8, 3)})


cue(0, "room_tone", 0.10)
cue(30, "harbour_horn", 0.18)
for i, f in enumerate([60, 120, 180]):
    cue(f, "clock_tick" if i % 2 == 0 else "clock_tock", 0.20)
cue(70, "gull", 0.15)
cue(82, "mug_tap", 0.22)
cue(118, "keyboard_ticks_gentle", 0.20)
cue(150, "email_ding_c5", 0.34)
cue(175, "keyboard_clatter", 0.20)
cue(200, "email_ding_d5", 0.34)
cue(200, "lamp_click", 0.25)
cue(225, "email_ding_e5", 0.34)
cue(230, "sigh", 0.18)
cue(240, "clock_accel", 0.26)
cue(330, "impact_hit", 0.55)
cue(330, "phone_ring", 0.28)
cue(330, "clock_whir", 0.22)
cue(335, "paper_rustle_bed", 0.15)
for i in range(28):
    cue(335 + round(i * 1.5), "whoosh_thump_%d" % (1 + int(rng.integers(0, 4))), round(float(rng.uniform(0.11, 0.17)), 3))
cue(340, "gasp", 0.2)
cue(378, "text_sting", 0.32)
for f in (348, 396, 444, 492):
    cue(f, "phone_ring", 0.28)
cue(440, "paper_topple", 0.24)
cue(450, "heartbeat", 0.42)
cue(510, "heartbeat", 0.46)
cue(460, "riser", 0.36)  # 1.0 s, peaks at the cut on f520
cue(548, "inhale", 0.13)
cue(590, "exhale", 0.13)
cue(600, "bell_shimmer", 0.22)
cue(610, "power_on", 0.18)
cue(640, "reverse_cymbal", 0.28)
cue(690, "whoosh_air", 0.24)
for f, i in zip([705, 720, 732, 744, 756, 768], range(1, 7)):
    cue(f, "fwip_%d" % i, 0.30)
cue(750, "pff", 0.22)
cue(798, "click", 0.24)
cue(800, "confirm_chime", 0.34)
cue(820, "pullback_whoosh", 0.20)
cue(830, "mug_tap", 0.14)
cue(840, "ui_swoosh", 0.20)
cue(855, "typing_light", 0.20)
cue(885, "ask_tone", 0.24)
for f, n in zip([893, 903, 913], ["card_pop_fs4", "card_pop_a4", "card_pop_b4"]):
    cue(f, n, 0.30)
cue(930, "tiny_chime", 0.24)
cue(960, "pullback_whoosh", 0.20)
cue(975, "whip_whoosh", 0.28)
cue(990, "port_ambience", 0.13)
cue(1020, "crane_winch", 0.10)
cue(1035, "phone_buzz", 0.24)
cue(1049, "phone_buzz", 0.24)
cue(1060, "ui_swoosh", 0.20)
cue(1070, "job_chime", 0.34)
cue(1085, "tick_pop", 0.28)
cue(1110, "finger_snap", 0.28)
cue(1142, "keycap_clack_low", 0.28)
cue(1146, "keycap_clack_high", 0.28)
cue(1146, "palette_pop", 0.26)
cue(1170, "zoom_whoosh", 0.24)
cue(1185, "lift_pop", 0.28)
for f in range(1190, 1196):
    cue(f, "line_tick", 0.16)
cue(1200, "paper_swish", 0.22)
for f, v in zip([1215, 1217, 1220, 1222], [1, 2, 3, 1]):
    cue(f, "coin_clink_%d" % v, 0.26)
cue(1224, "coin_merge", 0.34)
cue(1235, "card_slide_whoosh", 0.20)
cue(1240, "spark_chime", 0.28)
cue(1260, "window_open_whoosh", 0.24)
cue(1260, "birdsong", 0.12)
cue(1275, "mug_lift", 0.20)
cue(1300, "new_mail_chime", 0.34)
for f, n in zip([1305, 1313, 1321], ["section_pop_d5", "section_pop_fs5", "section_pop_a5"]):
    cue(f, n, 0.28)
cue(1340, "flask_clink", 0.28)
cue(1380, "clap_soft", 0.20)
cue(1410, "soft_crash", 0.26)
cue(1425, "swipe_tick", 0.24)
cue(1445, "box_thunk", 0.38)
cue(1450, "confetti_pop", 0.34)
cue(1470, "clap_soft", 0.24)
cue(1480, "clap_soft", 0.24)
cue(1500, "whoosh_up", 0.24)
cue(1522, "soft_thud", 0.34)
cue(1535, "swoop_down", 0.24)
cue(1556, "chime_up", 0.28)
for i in range(8):
    cue(1585 + 4 * i, "woodblock_%d" % (i + 1), 0.27)
cue(1636, "logo_tick", 0.12)
cue(1700, "chime_people", 0.20)
cue(1730, "url_tick", 0.07)
C.sort(key=lambda c: (c["frame"], c["file"]))

DUCK = [[335, 380, 0.90], [796, 812, 0.88], [1066, 1090, 0.90], [1296, 1332, 0.90], [1584, 1618, 0.92]]

if __name__ == "__main__":
    dur = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sfx_durations.json")))
    cache = {}
    mix = np.zeros((TOTAL, 2))
    music = read_wav(os.path.join(AUD, "music.wav"))
    assert len(music) == TOTAL, len(music)
    dk = np.ones(TOTAL)
    for s, e, lv in DUCK:
        ramp = 4 * FR
        pts = [(s - 4, 1.0), (s, lv), (e, lv), (e + 8, 1.0)]
        dk = np.minimum(dk, curve(pts))
    mix += music * (MUSIC_VOL * dk)[:, None]
    for c in C:
        name = os.path.basename(c["file"])[:-4]
        assert name in dur, name
        if c["file"] not in cache:
            assert os.path.exists(os.path.join(AUD, c["file"])), c["file"]
            cache[c["file"]] = read_wav(os.path.join(AUD, c["file"]))
        x = cache[c["file"]]
        s = c["frame"] * FR
        e = min(s + len(x), TOTAL)
        mix[s:e] += x[: e - s] * c["volume"]
    mix[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
    pk = np.max(np.abs(mix))
    print("unlimited mix peak %.3f (%.2f dBFS)" % (pk, 20 * np.log10(pk)))
    out = mix
    if pk > 0.89:
        out = limiter(mix, 0.89)
        print("limited")
    write_wav(os.path.join(AUD, "preview_mix.wav"), out)
    json.dump({"musicVolume": MUSIC_VOL, "duck": DUCK, "cues": C}, open(os.path.join(AUD, "cues.json"), "w"), indent=1)
    print(len(C), "cues")
