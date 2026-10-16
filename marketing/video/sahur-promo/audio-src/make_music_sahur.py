"""Sahur Protocol promo "WAKE UP": the score plus the game's choir. 75.000 s = 4500 frames at 60 fps, 48 kHz stereo,
3,600,000 samples (1 frame = 800 samples). Tempo/key map: storyboard.md section 7.3. Built on make_music_navcert.py
(Worlds of buses, an RMS-arc leveler, a hard-cut/silence gate), but every section is its own World, levelled to its
own loudness arc (K-weighted, 1.5 s windows, measured only inside the section) and windowed before it is summed, so
a hard cut never smears level across the boundary and the storyboard's silences stay digital zero.

  0-360      no score (the reel is diegetic SFX; 330-360 is the first true digital silence)
  360-1416   THE FEED. D Phrygian drone: D1 sine + D2 saw low-passed at 200 Hz (+ a faint bowed D3), a thin Eb3
             glass tone from 480 (the flat 2), a low tremolo swell D-F-Ab under the door (890-960). Under water
             (LP 400 Hz) until 450, opening to full by 540 with the eyelids. Ducks under the knocks 740/780/820.
  1336-1410  FIRST WARMTH, exactly with the hand: Dadd9 (D3 A3 E4 F#4: the F -> F# lift), marimba motif
             A4 A4 A4 F#4 D4 at 1350/1362/1374/1390/1402, a reversed-piano swell into the amber flare at 1410.
  1410-1890  MONTAGE, 90 BPM (40 f beat; bars 1410, 1570, 1730): D Bm | G A | D/F# G Asus4 A. Kalimba ostinato in
             8ths, vibes, warm pad, soft sub, felt-piano motif (A A A F# D / B B B A F# / -- / D D D C# A ...),
             Sahur's woodblock on beats 1-2-3 (the three-knock rhythm, rest on 4; out in bar 2 where his stump
             taps ARE the rhythm), shaker 16ths from 1570; the pad drops out for the cold boardroom flash 1810-1850.
  1886-2172  FIRE (rubato): Bm, G, D/F#; pad and sparse kalimba; the motif played back broken, A A A F# with no D:
             the missing D would fall on 2132, the digital click. Fade 2150-2172.
  2172-2282  no score (fire crackle only)
  2282-2400  his reply: one low open fifth D2 + A2 swelling; hard cut at 2400.
  2400-2976  FIGHTS, 150 BPM (24 f beat; bars every 96 f): D minor -> E minor (2592) -> F# minor (2784). Taiko kick,
             wood clacks instead of a snare, dark saw bass 8ths, saw arpeggio 16ths, staccato string stabs, the motif
             as a synth-brass hook (5 5 5 3 1 in each key). Sahur's woodblock thins: every beat (forest), every
             other bar (wastes), the downbeat only (boardroom). The TUNG SFX take the downbeats 2496/2688/2880 (no
             kick, a sidechain dip). Holes 2550-2556 and 2742-2748; fills 2580 and 2772; at 2880 a big stab whose
             reverb vanishes at 2900 (silence to 2904), back DRY at 2904 with only two hook notes, one held note
             2928-2940, a C# tremolo and a riser into the white, hard cut at 2976.
  2976-3336  THE BUBBLE: a wine-glass cluster (C6 1047 + C#6 1109 Hz, each slowly beating), the octave above from
             3168, air, a half-time D sub pulse from 3120 (every 48 f). The Shepard riser is an SFX. Hard cut 3336.
  3336-4200  no music at all (digital zero).
  4200-4500  the game's choir from mp3 offset 37.20 s, 12-frame linear fade-in; it swells on its own to its first
             big hit at 4263 (38.25 s); a 0.5 s equal-power fade-out to 75.0 s.
Usage: python -I make_music_sahur.py [out.wav]
"""
import sys, os, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *
from inst import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUD = os.path.join(ROOT, "public", "audio")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AUD, "music.wav")
NF = 4500
N = NF * FR
MUSIC_VOL = 0.9  # the cues.json musicVolume these levels are designed for
CHOIR_ST = -13.7  # the choir's 3 s short-term loudness maximum in the final mix (LUFS)
CHOIR_OFFSET = 37.20  # s into choir.mp3 (a natural near-silence; the swell starts at 37.35, first hit 38.25)
rng = np.random.default_rng(42)

IR_HALL = make_ir(3.0, 0.025, seed=3, bright=0.3)
IR_ROOM = make_ir(0.55, 0.008, seed=8, bright=0.5)
IR_FIGHT = make_ir(1.3, 0.012, seed=12, bright=0.45)
IR_GLASS = make_ir(5.0, 0.04, seed=14, bright=0.5)


# ======================================================================================================== engine
class World:
    NAMES = ["piano", "drone", "mallet", "bell", "glass", "pad", "strings", "bass", "kick", "perc", "wood", "brass", "arp"]

    def __init__(self, f0, f1, tail=120):
        self.f0, self.f1 = f0, f1
        self.n = (f1 - f0 + tail) * FR
        self.b = {k: Bus(self.n) for k in self.NAMES}
        self.hall = Bus(self.n)
        self.room = Bus(self.n)

    def s(self, frame):
        return int(round((frame - self.f0) * FR))

    def place(self, bus, sig, frame, gain=1.0, p=0.0, hall=0.0, room=0.0, jit=False):
        s = self.s(frame) + (int(rng.integers(-90, 90)) if jit else 0)
        self.b[bus].add(sig, s, gain, p)
        if hall:
            self.hall.add(sig, s, gain * hall, p)
        if room:
            self.room.add(sig, s, gain * room, p)

    def curve(self, pts):
        return np.interp(np.arange(self.n), [(f - self.f0) * FR for f, _ in pts], [v for _, v in pts])

    def mix(self, gains, autom=None, hall_wet=0.5, room_wet=0.3, ir_hall=IR_HALL, ir_room=IR_ROOM, wet_curve=None):
        autom = autom or {}
        total = np.zeros((self.n, 2))
        for k, bus in self.b.items():
            x = bus.buf.astype(float)
            if not np.any(x):
                continue
            if k == "bass":
                x = lp(x, 300)
                x = np.repeat(x.mean(axis=1, keepdims=True), 2, axis=1)
            elif k in ("mallet", "bell", "wood"):
                x = hp(x, 110)
            elif k == "piano":
                x = hp(x, 55)
            elif k == "drone":
                x = hp(x, 25)
            elif k in ("arp", "brass", "strings", "glass"):
                x = hp(x, 120)
            if k in autom:
                x = x * self.curve(autom[k])[:, None]
            total += x * gains.get(k, 1.0)
        wet = np.zeros((self.n, 2))
        if np.any(self.hall.buf):
            wet += lp(reverb(hp(self.hall.buf.astype(float), 160), ir_hall, self.n), 7000) * hall_wet
        if np.any(self.room.buf):
            wet += reverb(hp(self.room.buf.astype(float), 150), ir_room, self.n) * room_wet
        if wet_curve is not None:
            wet *= self.curve(wet_curve)[:, None]
        return total + wet


def level_to_arc(x, f0, arc, hop=15, win=90, lim=20.0, floor=-75.0):
    """Shape a section's macro level to a loudness arc [(abs frame, LUFS)], measured K-weighted over `win` frames
    every `hop` frames, only inside the section. Gains are clipped to +-lim dB and smoothed."""
    n = len(x)
    y = (kweight(x) ** 2).sum(axis=1)
    cs = np.concatenate([[0.0], np.cumsum(y)])
    c = np.arange(0, n // FR + 1, hop)
    meas = np.empty(len(c))
    for i, k in enumerate(c):
        a, b = max(0, (k - win // 2) * FR), min(n, (k + win // 2) * FR)
        meas[i] = -0.691 + 10 * np.log10((cs[b] - cs[a]) / max(1, b - a) + 1e-14)
    tgt = np.interp(c + f0, [p[0] for p in arc], [p[1] for p in arc])
    g = np.clip(tgt - meas, -lim, lim)
    ok = meas > floor
    g = np.interp(np.arange(len(g)), np.where(ok)[0], g[ok]) if ok.any() else np.zeros(len(g))
    for _ in range(3):
        gp = np.pad(g, 1, mode="edge")
        g = 0.25 * gp[:-2] + 0.5 * gp[1:-1] + 0.25 * gp[2:]
    return x * np.interp(np.arange(n), c * FR, 10 ** (g / 20))[:, None]


def duck_curve(n, f0, events, rel=0.3, att=0.012):
    """Multiplicative sidechain curve: a fast dip of `depth` dB at each (abs frame, depth) and an exponential release."""
    db = np.zeros(n)
    for fr, depth in events:
        s = int(round((fr - f0) * FR - att * SR))
        L = int((att + rel * 6) * SR)
        t = tt(L)
        e = np.where(t < att, t / att, np.exp(-(t - att) / rel)) * depth
        a, b = max(0, s), min(n, s + L)
        if b > a:
            db[a:b] = np.minimum(db[a:b], e[a - s:b - s])
    return 10 ** (db / 20)


def window(x, f0, fin=None, fout=None, shape="lin"):
    """Section window (abs frames): fin=(a, b) fades in over a..b, fout=(c, d) fades out over c..d, zero after d."""
    n = len(x)
    fr = f0 + np.arange(n) / FR
    w = np.ones(n)
    if fin:
        w *= np.clip((fr - fin[0]) / max(1e-9, fin[1] - fin[0]), 0, 1)
    if fout:
        w *= np.clip((fout[1] - fr) / max(1e-9, fout[1] - fout[0]), 0, 1)
    if shape == "cos":
        w = np.sin(w * np.pi / 2) ** 2
    return x * w[:, None]


# ======================================================================================================== voices
def wood_tok(f0=880.0, vel=0.5, dur=0.25, seed=0):
    """Sahur's woodblock in the score: the TUNG recipe, small (A5 by default)."""
    n = int(dur * SR)
    t = tt(n)
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.04 * np.exp(-t / 0.01))) / SR
    x = np.sin(ph) * np.exp(-t / 0.05) + 0.4 * np.sin(2 * ph + 0.3) * np.exp(-t / 0.03) + 0.15 * np.sin(2.76 * ph + 1) * np.exp(-t / 0.012) + 0.1 * np.sin(5 * ph + 1.9) * np.exp(-t / 0.04)
    x *= np.minimum(1, t / 0.0006)
    k = int(0.01 * SR)
    x[:k] += bp(noise(k, seed + 3), 1500, 6000) * np.exp(-tt(k) / 0.0015) * 0.5
    return lp(x, 7000) * vel


def taiko(vel=0.8, seed=1):
    n = int(0.9 * SR)
    t = tt(n)
    ph = 2 * np.pi * np.cumsum(52 + 60 * np.exp(-t / 0.04)) / SR
    x = np.sin(ph) * np.exp(-t / 0.32) + 0.35 * np.sin(2.3 * ph + 0.4) * np.exp(-t / 0.12)
    x += lp(noise(n, seed), 1200) * np.exp(-t / 0.02) * 0.5 + bp(noise(n, seed + 1), 2000, 6000) * np.exp(-t / 0.004) * 0.25
    return x * np.minimum(1, t / 0.0015) * vel


def clack(vel=0.7, seed=5):
    """The wooden hit that replaces the snare: two hard wood sticks, tuned near E5/A."""
    n = int(0.25 * SR)
    t = tt(n)
    x = bp(noise(n, seed), 1200, 5000) * np.exp(-t / 0.006)
    x += np.sin(2 * np.pi * 660 * t) * np.exp(-t / 0.035) + 0.6 * np.sin(2 * np.pi * 1520 * t + 1) * np.exp(-t / 0.02) + 0.3 * np.sin(2 * np.pi * 2380 * t) * np.exp(-t / 0.012)
    x += lp(noise(n, seed + 1), 500) * np.exp(-t / 0.03) * 0.4
    return lp(x * np.minimum(1, t / 0.0004), 9000) * vel


def saw_bass(m, dur=0.16, vel=0.8):
    f = float(mtof(m))
    n = int((dur + 0.1) * SR)
    t = tt(n)
    s = saw_add(f, n, 2400, 1.0) + 0.6 * saw_add(f * 1.006, n, 2400, 1.0, 1.3)
    env = np.minimum(1, t / 0.004) * np.where(t > dur, np.exp(-(t - dur) / 0.03), 1.0)
    x = lp(s, 260) * 0.9 + lp(s, 1400) * np.exp(-t / 0.06) * 0.5 + np.sin(2 * np.pi * f * t) * 0.6
    return np.tanh(1.5 * x * env) * vel * 0.5


def stab(ms, dur=0.12, vel=0.5, rel=0.05):
    n = int((dur + rel * 4) * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    for i, m in enumerate(ms):
        for cents, p in [(-8, -0.5), (0, 0.0), (8, 0.5)]:
            out += pan(saw_add(float(mtof(m)) * 2 ** (cents / 1200), n, 3200, 1.1, i + cents), p)
    env = np.minimum(1, t / 0.008) * np.where(t > dur, np.exp(-(t - dur) / rel), 1.0)
    return hp(lp(out * env[:, None], 3400), 180) * vel * 0.06


def pluck(m, vel=0.4):
    f = float(mtof(m))
    n = int(0.3 * SR)
    t = tt(n)
    return lp(saw_add(f, n, 5000, 1.0), 2600) * np.exp(-t / 0.07) * np.minimum(1, t / 0.002) * vel * 0.35


def brass(m, dur, vel=0.6):
    """Synth brass: two detuned saws, a filter that opens on the attack and settles, late vibrato."""
    f = float(mtof(m))
    n = int((dur + 0.25) * SR)
    t = tt(n)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    s = np.zeros(n)
    for det in (1.0, 1.004):
        ph = 2 * np.pi * np.cumsum(f * det * vib) / SR
        s += sum((1.0 / k) * np.sin(k * ph + k) for k in range(1, 18) if f * k < 9000)
    env = np.minimum(1, t / 0.02) * np.where(t > dur, np.exp(-(t - dur) / 0.08), 1.0)
    br = 0.25 + 0.75 * np.exp(-t / 0.12)
    lo = lp(s, 700)
    x = lo + (lp(s, 3000) - lo) * br
    return x * env * vel * 0.16


def glass_tone(f, dur, beat=1.1, att=1.2, rel=1.0, vel=0.5):
    """A wine-glass rim tone: a near-pure sine plus a partner `beat` Hz above (slow beating), a faint 2.32x mode."""
    n = int((dur + rel) * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + beat) * t + 1.0) + 0.08 * np.sin(2 * np.pi * f * 2.32 * t + 0.3)
    env = np.minimum(1, t / att) ** 1.6 * np.where(t > dur, np.exp(-(t - dur) / max(1e-3, rel * 0.4)), 1.0)
    return x * (1 + 0.15 * np.sin(2 * np.pi * 0.35 * t)) * env * vel * 0.2


def trem(w, midis, f0, f1, vol_pts, rate0=9, rate1=14, depth=0.55, cutoff=3200, level=0.04, hall=0.35):
    """Tremolo strings (bus 'strings')."""
    n = (f1 - f0) * FR
    out = np.zeros((n, 2))
    rate = np.interp(np.arange(n), [0, n], [rate0, rate1])
    pt = 2 * np.pi * np.cumsum(rate) / SR
    for i, m in enumerate(midis):
        x = saw_add(float(mtof(m)) * (1 + 0.002 * (i % 3 - 1)), n, cutoff, 1.1, i)
        out += pan(x * (1 - depth * (0.5 + 0.5 * np.sin(pt + i * 1.3))), -0.55 + 1.1 * (i / max(1, len(midis) - 1)))
    v = np.interp(np.arange(n), [(p[0] - f0) * FR for p in vol_pts], [p[1] for p in vol_pts])
    out = hp(out * v[:, None] * level, 140)
    w.b["strings"].add(out, w.s(f0), 1.0)
    w.hall.add(out, w.s(f0), hall)


def pn(w, m, frame, vel, dur, p=0.0, hall=0.5, bright=0.8, gain=1.0):
    w.place("piano", piano(m, vel, dur, bright), frame, gain, p, hall=hall)


# ======================================================================================================== THE FEED
def build_feed():
    f0, f1 = 360, 1416
    w = World(f0, f1, tail=60)
    nn = (f1 + 30 - f0) * FR
    t = tt(nn)
    d1 = np.sin(2 * np.pi * 36.71 * t) * (0.9 + 0.1 * np.sin(2 * np.pi * 0.07 * t))
    saw = saw_add(73.42, nn, 1500, 1.05)
    dark = lp(saw, 200, 2) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t + 1))
    brt = lp(saw, 520, 2)
    op = np.interp(np.arange(nn), [(f - f0) * FR for f in (360, 720, 900, 1080, 1336, 1446)], [0, 0, 0.5, 0.6, 0.45, 0.7])
    dr = (d1 * 0.8 + dark * (1 - op) * 1.4 + brt * op * 0.9) * 0.06
    w.b["drone"].add(np.stack([dr, np.roll(dr, 240)], 1), 0)
    bow = drone(50, (f1 - f0) / 60, att=3.0, rel=0.5, dark=350, bright=900, seed=7,
                swell=[(0, 0), (6.0, 0.1), (9.0, 0.5), (13.0, 0.3), (17.0, 0.6)])
    w.b["drone"].add(bow * 0.55, 0)
    w.hall.add(bow * 0.2, 0)
    gd = (1352 - 480) / 60
    gl = glass_tone(155.56, gd, beat=0.7, att=2.5, rel=0.3, vel=0.6) + glass_tone(311.13, gd, beat=0.9, att=3.0, rel=0.3, vel=0.15)
    w.place("glass", gl, 480, 1.0, 0.1, hall=0.35)
    trem(w, [38, 50, 53, 56], 878, 968, [(878, 0.0), (930, 1.0), (952, 0.7), (968, 0.0)], rate0=7, rate1=11, depth=0.5, cutoff=1500, level=0.05)
    x = w.mix(dict(drone=1.0, glass=1.0, strings=1.0), autom=dict(glass=[(480, 1), (1336, 1), (1352, 0)]), hall_wet=0.5)
    # under water: LP 400 Hz until 450, opening to full by 540 (with the eyelids)
    m = (560 - f0) * FR
    fr = f0 + np.arange(m) / FR
    fc = np.exp(np.interp(fr, [360, 450, 540, 560], np.log([400, 400, 18000, 20000])))
    wetx = svf_lp(x[:m], fc)
    xf = int(0.01 * SR)
    blend = np.concatenate([np.zeros(m - xf), np.linspace(0, 1, xf)])[:, None]
    x[:m] = wetx * (1 - blend) + x[:m] * blend
    arc = [(360, -52), (420, -37), (540, -35), (720, -34), (870, -32), (930, -29), (962, -32), (1080, -32), (1300, -31), (1336, -32), (1416, -35)]
    x = level_to_arc(x, f0, arc)
    x *= duck_curve(len(x), f0, [(740, -7.0), (780, -7.0), (820, -7.0)], rel=0.35)[:, None]
    return window(x, f0, fin=(360, 420), fout=(1396, 1416)), f0


# ======================================================================================================== WARMTH + MONTAGE
MCH = {"D": (38, [62, 69, 74, 78]), "Bm": (35, [59, 66, 71, 74]), "G": (43, [55, 62, 67, 71]), "A": (45, [57, 64, 69, 73]),
       "D/F#": (42, [62, 66, 69, 74]), "Asus4": (45, [57, 64, 69, 74])}
PADV = {"D": [50, 57, 62, 66], "Bm": [47, 54, 59, 62], "G": [43, 50, 55, 59], "A": [45, 52, 57, 61], "D/F#": [42, 50, 57, 62], "Asus4": [45, 52, 57, 62]}
MTL = [(1410, "D"), (1490, "Bm"), (1570, "G"), (1650, "A"), (1730, "D/F#"), (1810, "G"), (1850, "Asus4"), (1870, "A")]
MSEGS = [(s, MTL[i + 1][0] if i + 1 < len(MTL) else 1890, nm) for i, (s, nm) in enumerate(MTL)]


def mseg(f):
    for s, e, nm in MSEGS:
        if s <= f < e:
            return s, e, nm
    return MSEGS[-1]


def build_montage():
    f0 = 1336
    w = World(f0, 1900, tail=150)
    # first warmth, exactly with the hand (1336): Dadd9 swell, 40 f attack
    for m in [50, 57, 64, 66]:
        w.place("pad", pad_note(m, (1420 - 1336) / 60 + 0.2, att=0.67, rel=0.6, cutoff=1900, hp_hz=110), 1336, 0.8)
    w.place("bass", pulse_bass(38, 1.3, 0.55, 0.3), 1336)
    for f, m, v in [(1350, 69, 0.5), (1362, 69, 0.44), (1374, 69, 0.5), (1390, 66, 0.5), (1402, 62, 0.56)]:
        w.place("mallet", marimba(m, v), f, 1.0, 0.1, hall=0.5)
    rv = sum(piano(m, 0.4, 0.8, 0.7)[: int(0.45 * SR)] for m in (62, 66, 69, 74))[::-1].copy()
    w.place("piano", rv * np.linspace(0, 1, len(rv)) ** 1.5, 1410 - 27, 0.55, 0.0, hall=0.4)
    # the montage, 90 BPM
    for f in range(1410, 1890, 20):
        s, e, nm = mseg(f)
        i = ((f - 1410) // 20) % 8
        m = MCH[nm][1][[0, 1, 2, 1, 3, 1, 2, 1][i]]
        v = 0.42 if i == 0 else (0.3 if i % 2 else 0.34)
        w.place("mallet", kalimba(m, v), f, 1.0, -0.3 if i % 2 == 0 else 0.3, hall=0.3, room=0.1, jit=True)
    for s, e, nm in MSEGS:
        tones = MCH[nm][1]
        for j, m in enumerate(tones[1:3]):
            w.place("mallet", vibes(m + 12, 0.17, min(2.2, (e - s) / 60 + 0.6)), s + j, 1.0, 0.25 * (-1) ** j, hall=0.5)
        if not (1810 <= s < 1850):  # the cold boardroom flash: the warm pad drops out
            for m in PADV[nm]:
                w.place("pad", pad_note(m, (e - s) / 60 + 0.15, att=0.25, rel=0.7, cutoff=1600, hp_hz=110), s, 0.55)
        w.place("bass", pulse_bass(MCH[nm][0], min(1.2, (e - s) / 60), 0.6, 0.02), s)
    MEL = [(1410, 69, .55, .3), (1420, 69, .45, .3), (1430, 69, .5, .3), (1450, 66, .5, .35), (1470, 62, .55, .7),
           (1490, 71, .55, .3), (1500, 71, .45, .3), (1510, 71, .5, .3), (1530, 69, .5, .35), (1550, 66, .55, .7),
           (1730, 74, .58, .3), (1740, 74, .48, .3), (1750, 74, .52, .3), (1770, 73, .5, .35), (1790, 69, .56, .6),
           (1810, 67, .42, .3), (1820, 69, .44, .3), (1830, 71, .5, .35), (1850, 74, .55, .5), (1870, 73, .52, 1.2)]
    for f, m, v, d in MEL:
        pn(w, m, f, v, d, 0.1, hall=0.5, bright=0.75)
    for f, m in [(1410, 50), (1490, 47), (1570, 43), (1650, 45), (1730, 42), (1810, 43), (1850, 45)]:
        pn(w, m, f, 0.3, 1.2, -0.15, hall=0.5, bright=0.5)
    for f in (1410, 1450, 1490, 1730, 1770, 1810):  # TUNG TUNG TUNG (rest): beats 1-2-3, bars 1 and 3
        w.place("wood", wood_tok(880.0, 0.4, seed=f), f, 1.0, 0.2, room=0.3)
    for i, f in enumerate(range(1570, 1890, 10)):
        w.place("perc", shaker(0.3 if i % 2 == 0 else 0.18, seed=i % 4), f, 1.0, 0.3 if i % 2 else -0.3, jit=True)
    x = w.mix(dict(piano=1.0, mallet=0.9, pad=0.8, bass=0.7, wood=0.8, perc=0.7), hall_wet=0.55, room_wet=0.3)
    arc = [(1336, -36), (1350, -30.5), (1380, -23.5), (1405, -18.2), (1412, -15.3), (1490, -14.3), (1570, -14.3), (1650, -13.8),
           (1730, -13.3), (1805, -13.8), (1815, -15.3), (1850, -14.3), (1880, -15.3), (1900, -21.5)]
    x = level_to_arc(x, f0, arc)
    x *= duck_curve(len(x), f0, [(1570, -4.0), (1610, -4.0), (1650, -4.0)], rel=0.25)[:, None]
    return window(x, f0, fin=(1336, 1338), fout=(1884, 1898)), f0


# ======================================================================================================== FIRE
def build_fire():
    f0 = 1886
    w = World(f0, 2172, tail=90)
    for s, e, ms in [(1890, 2010, [47, 54, 59, 62]), (2010, 2080, [43, 50, 55, 59]), (2080, 2172, [42, 50, 54, 57])]:
        for m in ms:
            w.place("pad", pad_note(m, (e - s) / 60 + 0.3, att=0.5, rel=0.9, cutoff=1000, hp_hz=90), s, 0.6)
    for f, m in [(1890, 35), (2010, 31), (2080, 30)]:
        w.place("bass", pulse_bass(m, 1.6, 0.4, 0.3), f)
    for f, m, v in [(1898, 59, .32), (1921, 66, .28), (1946, 74, .3), (1970, 71, .26), (2014, 67, .28), (2046, 71, .26)]:
        w.place("mallet", kalimba(m, v), f, 1.0, 0.2, hall=0.6)
    # the motif, played back gently and BROKEN: A A A F# and no D (the D's place, 2132, is the digital click)
    for f, m, v in [(2076, 69, .34), (2088, 69, .3), (2100, 69, .32), (2116, 66, .3)]:
        w.place("mallet", kalimba(m, v), f, 1.0, -0.1, hall=0.7)
    x = w.mix(dict(pad=0.9, bass=0.6, mallet=1.0), hall_wet=0.6)
    x = level_to_arc(x, f0, [(1886, -40), (1896, -29.5), (2000, -29), (2080, -28.5), (2140, -29), (2172, -30.5)])
    return window(x, f0, fin=(1886, 1898), fout=(2150, 2172), shape="cos"), f0


# ======================================================================================================== HIS REPLY
def build_reply():
    f0 = 2282
    w = World(f0, 2400, tail=10)
    d = (2400 - 2282) / 60
    for m, g in [(38, 1.0), (45, 0.8)]:
        x = drone(m, d, att=1.2, rel=0.1, dark=260, bright=700, swell=[(0, 0), (1.0, 0.3), (d, 0.8)], seed=m)
        w.b["drone"].add(x * g, 0)
        w.hall.add(x * g * 0.3, 0)
    x = w.mix(dict(drone=1.0), hall_wet=0.4)
    x = level_to_arc(x, f0, [(2282, -44), (2300, -35), (2390, -27), (2400, -26)])
    return window(x, f0, fin=(2282, 2290), fout=(2398, 2400)), f0


# ======================================================================================================== FIGHTS
FCH = {"Dm": (38, [62, 65, 69]), "Bb": (34, [58, 62, 65]), "Gm": (31, [55, 58, 62]), "A": (33, [57, 61, 64]),
       "Em": (40, [64, 67, 71]), "C": (36, [60, 64, 67]), "Am": (33, [57, 60, 64]), "B": (35, [59, 63, 66]),
       "F#m": (42, [66, 69, 73]), "D": (38, [62, 66, 69]), "Bm": (35, [59, 62, 66]), "C#": (37, [61, 65, 68])}
FTL = [(2400, "Dm"), (2448, "Bb"), (2496, "Gm"), (2544, "A"), (2592, "Em"), (2640, "C"), (2688, "Am"), (2736, "B"),
       (2784, "F#m"), (2832, "D"), (2880, "Bm"), (2928, "C#")]
BARS = [2400, 2496, 2592, 2688, 2784, 2880]
TUNGS = (2496, 2688, 2880)
HOLES = [(2550, 2556), (2742, 2748), (2880, 2904)]  # (2880-2904: the TUNG #3 stab and the vanishing reverb only)
HOOK = [(2400, 69, 10), (2412, 69, 10), (2424, 69, 10), (2436, 65, 10), (2448, 62, 30),
        (2508, 67, 10), (2520, 67, 10), (2532, 67, 10), (2544, 64, 6),
        (2592, 71, 10), (2604, 71, 10), (2616, 71, 10), (2628, 67, 10), (2640, 64, 30),
        (2700, 69, 10), (2712, 69, 10), (2724, 69, 10), (2736, 66, 6),
        (2784, 73, 10), (2796, 73, 10), (2808, 73, 10), (2820, 69, 10), (2832, 66, 30),
        (2904, 71, 10), (2916, 71, 10), (2928, 68, 12)]


def fchord(f):
    nm = FTL[0][1]
    for s, n_ in FTL:
        if f >= s:
            nm = n_
    return FCH[nm]


def in_holes(f, extra=()):
    return any(a <= f < b for a, b in list(HOLES) + list(extra))


def build_fights():
    f0 = 2400
    w = World(f0, 2976, tail=40)
    for bar in BARS:  # taiko on 1 and 3 (not under a TUNG), pickups into the TUNG bars
        for off in (0, 48):
            f = bar + off
            if f in TUNGS or f >= 2928 or in_holes(f):
                continue
            w.place("kick", taiko(0.85 if off == 0 else 0.7, seed=f % 7), f)
        if bar in (2400, 2592, 2784):
            w.place("kick", taiko(0.5, seed=3), bar + 84)
    w.place("kick", taiko(0.8, seed=4), 2904)
    for bar in BARS:  # wood clacks instead of a snare, on 2 and 4
        for off in (24, 72):
            f = bar + off
            if f >= 2928 or in_holes(f, [(2576, 2592), (2768, 2784)]):
                continue
            w.place("perc", clack(0.75, seed=f % 5), f, 1.0, 0.1, room=0.4)
    for f in range(2400, 2928, 6):  # hats on the 16ths
        if in_holes(f, [(2576, 2592), (2768, 2784)]):
            continue
        sub = ((f - 2400) // 6) % 4
        w.place("perc", hat(0.28 if sub == 2 else 0.16, 0.025 if sub == 2 else 0.015, seed=sub), f, 1.0, 0.35)
    for f in list(range(2400, 2592, 24)) + list(range(2592, 2688, 24)) + [2784]:  # Sahur's woodblock, thinning
        if f in TUNGS or in_holes(f):
            continue
        w.place("wood", wood_tok(880.0, 0.45, seed=f), f, 1.0, -0.25, room=0.3)
    for i, f in enumerate(range(2400, 2928, 12)):  # dark saw bass in 8ths
        if in_holes(f):
            continue
        root = fchord(f)[0]
        m = root + [0, 0, 12, 0, 0, 12, 0, 7][((f - 2400) // 12) % 8]
        w.place("bass", saw_bass(m, 0.1, 0.85 if ((f - 2400) // 12) % 2 == 0 else 0.7), f)
    for f in range(2400, 2928, 6):  # saw arpeggio 16ths
        if in_holes(f):
            continue
        tones = fchord(f)[1]
        k = ((f - 2400) // 6) % 4
        m = (tones + [tones[0] + 12])[k] + 12
        w.place("arp", pluck(m, 0.3 if k == 0 else 0.22), f, 1.0, -0.4 if k % 2 else 0.4, hall=0.15)
    for bar in BARS:  # staccato string stabs on the off-beats of 2 and 4
        for off in (36, 84):
            f = bar + off
            if f >= 2928 or in_holes(f):
                continue
            w.place("strings", stab(fchord(f)[1], 0.09, 0.55), f, 1.0, 0.0, hall=0.2)
    for f, m, d in HOOK:
        b = brass(m, d / 60, 0.6)
        w.place("brass", b, f, 1.0, 0.15, hall=0.3)
        w.place("brass", brass(m - 12, d / 60, 0.4), f, 0.5, -0.15)
    for f in (2496, 2688):  # under TUNG #1 / #2: a long chord and bass, ducked by the sidechain
        w.place("strings", stab(fchord(f)[1] + [fchord(f)[1][0] + 12], 0.35, 0.8, rel=0.15), f, 1.0, 0.0, hall=0.4)
        w.place("bass", saw_bass(fchord(f)[0], 0.4, 0.9), f)
    # TUNG #3 (2880): a big Bm stab in the room; its reverb vanishes at 2900 ("the void has no acoustics")
    w.place("strings", stab([59, 62, 66, 71], 0.3, 1.0, rel=0.1), 2880, 1.0, 0.0, hall=1.0)
    w.place("brass", brass(59, 0.3, 0.6) + brass(66, 0.3, 0.5), 2880, 1.0, 0.0, hall=1.0)
    w.place("bass", saw_bass(35, 0.3, 1.0), 2880)
    # fills
    for base in (2580, 2772):
        for k, (dt, kind) in enumerate([(0, "k"), (3, "c"), (6, "k"), (8, "c"), (9, "w"), (10, "c"), (11, "w")]):
            f = base + dt
            if kind == "k":
                w.place("kick", taiko(0.6 + 0.08 * k, seed=k), f)
            elif kind == "c":
                w.place("perc", clack(0.5 + 0.07 * k, seed=k), f, 1.0, 0.1, room=0.4)
            else:
                w.place("wood", wood_tok(880.0 * (1.0 if dt == 9 else 1.122), 0.4, seed=k), f, 1.0, -0.2)
    # 2940-2976: a C# tremolo swell and a riser into the white
    trem(w, [49, 61, 65, 68, 73], 2940, 2976, [(2940, 0.2), (2972, 1.0), (2976, 1.0)], rate0=10, rate1=18, depth=0.6, cutoff=3500, level=0.06, hall=0.3)
    nn = (2976 - 2950) * FR
    u = np.linspace(0, 1, nn)
    rs = sum(np.sin(2 * np.pi * np.cumsum(554.37 * 2 ** (2 * u ** 1.4) * k) / SR) / k for k in (1, 2, 3)) * u ** 2 * 0.05
    rs += bp(noise(nn, 2950), 2000, 9000) * u ** 2.5 * 0.05
    w.b["strings"].add(pan(rs, 0.0), w.s(2950), 1.0)
    for f, v in [(2940, 0.6), (2958, 0.7), (2964, 0.6), (2968, 0.7), (2972, 0.85)]:
        w.place("kick", taiko(v, seed=f % 5), f)
    x = w.mix(dict(kick=1.0, perc=0.8, wood=0.7, bass=0.9, arp=0.45, strings=0.9, brass=0.85), hall_wet=0.4,
              ir_hall=IR_FIGHT, room_wet=0.25, wet_curve=[(2400, 1), (2899, 1), (2900, 0), (2976, 0)])
    # the dry signal is silent 2900-2904 (the stab is cut with its reverb)
    fr = f0 + np.arange(len(x)) / FR
    x *= np.where((fr >= 2900) & (fr < 2904), 0.0, 1.0)[:, None]
    arc = [(2400, -12.6), (2496, -12.2), (2592, -12.4), (2688, -12.4), (2784, -11.4), (2880, -11.4), (2899, -11.4), (2904, -14),
           (2928, -17), (2940, -16), (2970, -12), (2976, -11.5)]
    x = level_to_arc(x, f0, arc)
    x = limiter(x, 10 ** (-4.5 / 20), look=0.003, smooth=0.004)  # glue: tame the taiko/fill transients
    hits = [(2496, -8.0), (2688, -8.0), (2880, -5.0), (2414, -3.0), (2574, -4.0), (2604, -3.0), (2648, -4.0), (2772, -4.0),
            (2816, -5.0), (2824, -3.0), (2886, -4.0), (2958, -4.0), (2962, -2.0), (2966, -2.0), (2970, -2.0)]
    x *= duck_curve(len(x), f0, hits, rel=0.25)[:, None]
    return window(x, f0, fin=(2400, 2400.25), fout=(2974, 2976)), f0


# ======================================================================================================== THE BUBBLE
def build_bubble():
    f0 = 2976
    w = World(f0, 3336, tail=20)
    d = (3336 - 2980) / 60
    for f, b, v in [(1046.5, 1.1, 0.6), (1108.73, 0.7, 0.5)]:
        w.place("glass", glass_tone(f, d, beat=b, att=1.6, rel=0.05, vel=v), 2980, 1.0, 0.0, hall=0.6)
    for f, b, v in [(2093.0, 1.6, 0.18), (2217.46, 1.2, 0.15)]:
        w.place("glass", glass_tone(f, (3336 - 3168) / 60, beat=b, att=2.0, rel=0.05, vel=v), 3168, 1.0, 0.0, hall=0.6)
    na = (3336 - 2976) * FR
    ta = tt(na)
    air = np.stack([bp(noise(na, 2981), 3000, 9000), bp(noise(na, 2982), 3000, 9000)], 1) * (0.015 + 0.02 * ta / ta[-1])[:, None]
    w.b["glass"].add(air, 0)
    for f in (3120, 3168, 3216, 3264, 3312):
        w.place("bass", pulse_bass(26, 0.35, 0.8, 0.01), f)
        w.place("bass", pulse_bass(38, 0.25, 0.45, 0.01), f)
    x = w.mix(dict(glass=1.0, bass=0.9), hall_wet=0.5, ir_hall=IR_GLASS)
    x = level_to_arc(x, f0, [(2976, -50), (2994, -28.5), (3072, -25), (3120, -23.5), (3168, -22), (3300, -17), (3336, -16)])
    return window(x, f0, fin=(2976, 2980), fout=(3334, 3336)), f0


# ======================================================================================================== THE CHOIR
def load_choir():
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", os.path.join(AUD, "choir.mp3"), "-f", "f32le", "-ac", "2", "-ar", "48000", "-"]
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(float)


def build_choir():
    f0 = 4200
    x = load_choir()
    s = int(round(CHOIR_OFFSET * SR))
    L = (NF - f0) * FR
    seg = x[s:s + L].copy()
    fi = 12 * FR
    seg[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(0.5 * SR)
    seg[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))[:, None]
    _, st = loud_curve(seg * MUSIC_VOL, 3.0, 0.05)
    g = 10 ** ((CHOIR_ST - st.max()) / 20)
    return seg * g, f0, g


# ======================================================================================================== assemble
if __name__ == "__main__":
    mix = np.zeros((N, 2))

    def put(x, f0):
        s = f0 * FR
        e = min(N, s + len(x))
        mix[s:e] += x[: e - s]

    for name, fn in [("feed", build_feed), ("montage", build_montage), ("fire", build_fire), ("reply", build_reply),
                     ("fights", build_fights), ("bubble", build_bubble)]:
        print("building", name, flush=True)
        x, f0 = fn()
        put(x, f0)
    mix = lp(hp(mix, 25), 16000)
    print("choir", flush=True)
    ch, f0, g = build_choir()
    put(ch, f0)
    print("choir gain %.2f dB" % (20 * np.log10(g)))
    mix = limiter(mix, 0.84)
    # the hard-cut / silence gate: digital zero where the storyboard has no score
    # (3 ms raised-cosine edges so a hard cut never clicks)
    rk = int(0.003 * SR)
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, rk))
    for a, b in [(0, 360), (2172, 2282), (2550, 2556), (2742, 2748), (2900, 2904), (3336, 4200)]:
        if a > 0:
            mix[a * FR - rk:a * FR] *= ramp[::-1, None]
        mix[a * FR:b * FR] = 0.0
        if b < NF:
            mix[b * FR:b * FR + rk] *= ramp[:, None]
    mix[0] = 0
    mix[-1] = 0
    il, mm = lufs(mix)
    print("music: %d samples (%.4f s), LUFS integrated %.2f, momentary max %.2f, true peak %.2f dBTP" % (len(mix), len(mix) / SR, il, mm, true_peak_db(mix)))
    write_wav(OUT, mix)
    print("wrote", OUT)
