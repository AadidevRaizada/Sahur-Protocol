"""Audio QA for the film: music.wav and preview_mix.wav (length, peak, true peak, DC, loudness, NaN, edges), the
key windows and the true-silence windows, cues.json integrity, and every SFX file (peak, edges, DC, NaN, length).
Length-agnostic: the frame count comes from music.wav (60 fps, 800 samples per frame).
Usage: python -I qa.py"""
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
A = os.path.join(ROOT, "public", "audio")
# Sahur Protocol "WAKE UP" key windows (frames) and the true digital silences (storyboard section 7.3)
WINDOWS = [(0, 330, "reel"), (360, 720, "feed"), (720, 860, "door knocks"), (1336, 1410, "amber"), (1410, 1890, "montage"),
           (1890, 2172, "fire"), (2176, 2282, "the question"), (2400, 2976, "fights"), (2976, 3336, "bubble"),
           (3336, 3500, "hand / near-silence"), (3500, 3650, "final TUNGs + pop"), (3690, 3920, "tinnitus"),
           (4080, 4140, "quiet before the far TUNG"), (4140, 4200, "the far TUNG"), (4200, 4500, "choir")]
SILENT = [(330, 360), (3650, 3690)]


def db(x):
    return 20 * np.log10(x + 1e-12)


music = read_wav(os.path.join(A, "music.wav"))
NF = len(music) // FR
for nm in ("music.wav", "preview_mix.wav"):
    x = read_wav(os.path.join(A, nm))
    il, mm = lufs(x)
    print("%s: %d samples = %.4f s (%d frames), peak %.2f dBFS, true peak %.2f dBTP, DC %.1e/%.1e, LUFS %.2f integrated (momentary max %.2f), nan %s, first %.5f last %.5f" % (
        nm, len(x), len(x) / SR, len(x) // FR, db(np.abs(x).max()), true_peak_db(x), x[:, 0].mean(), x[:, 1].mean(), il, mm, np.isnan(x).any(), abs(x[0]).max(), abs(x[-1]).max()))
    print("  last 0.5 s rms %.1f dB; channel correlation %.2f" % (db(np.sqrt(np.mean(x[-24000:] ** 2))), np.corrcoef(x[:, 0], x[:, 1])[0, 1]))
    t, st = loud_curve(x, 3.0, 0.1)
    for a, b, lbl in WINDOWS:
        s = x[a * FR:b * FR]
        sel = (t * 60 >= a) & (t * 60 + 180 <= b + 60)
        print("  %-26s %4d-%4d rms %6.1f dBFS  peak %6.1f  short-term %6s LUFS" % (lbl, a, b, db(np.sqrt(np.mean(s ** 2))), db(np.abs(s).max()), "%.1f" % st[sel].max() if sel.any() else "-"))
    for a, b in SILENT:
        print("  TRUE SILENCE %d-%d: %s" % (a, b, "digital zero" if not np.any(x[a * FR:b * FR]) else "NOT SILENT (max %.1f dB)" % db(np.abs(x[a * FR:b * FR]).max())))
cj = json.load(open(os.path.join(A, "cues.json")))
bad = 0
for c in cj["cues"]:
    p = os.path.join(A, c["file"])
    if not os.path.exists(p):
        print("MISSING", c)
        bad += 1
    assert 0 <= c["volume"] <= 1 and 0 <= c["frame"] < NF, c
    assert "dur" not in c or (isinstance(c["dur"], int) and c["dur"] > 0), c
    for a, b in SILENT:
        n = len(read_wav(p)) / FR if os.path.exists(p) else 0
        end = c["frame"] + min(n, c.get("dur", n))
        assert not (c["frame"] < b and end > a + 1e-6), ("cue sounds inside a true silence", c)
print("cues", len(cj["cues"]), "unique files", len({c['file'] for c in cj['cues']}), "missing", bad, "musicVolume", cj["musicVolume"], "duck", cj["duck"])
files = sorted(glob.glob(os.path.join(A, "sfx", "*.wav")))
print("sfx files", len(files))
mx = 0
for f in files:
    x = read_wav(f)
    pk = np.abs(x).max()
    e = abs(x[-1]).max()
    s = abs(x[0]).max()
    d = len(x) / SR
    if pk > 0.9 or e > 1e-3 or s > 1e-3 or np.isnan(x).any() or d > 20 or d < 0.015 or abs(x.mean()) > 1e-3:
        print("CHECK", os.path.basename(f), "dur %.2f peak %.3f start %.5f end %.5f dc %.1e" % (d, pk, s, e, x.mean()))
    mx = max(mx, d)
print("longest sfx %.2f s" % mx)
