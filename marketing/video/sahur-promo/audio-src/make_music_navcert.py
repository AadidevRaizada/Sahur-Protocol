"""NavCert story film: music (30.0 s, 48 kHz stereo, 1,440,000 samples). A NEW original score.

Key and tempo: E minor (the "before") resolving to G major (the "after"). One grid of 30 frames per beat (120 BPM,
bar = 120 frames; frame = 800 samples). The first 466 frames are felt in half-time (60 BPM) with no drums: a bowed low
E drone, felt piano E G B G, a soft sub heartbeat, tremolo strings. HARD CUT at frame 466, then TRUE DIGITAL SILENCE
until 588 (the breath lives there, as SFX). At 588 the answer: a G major pad swell, then 120 BPM: kalimba/vibes
ostinato G B D B, soft sub pulse, shaker 16ths, finger snaps on 2 and 4. Sections follow storyboard.md section 8.1.
The sonar ping itself is an SFX (sonar_ping_*); the music only echoes it twice (a ripple at 960, the counts at S10).
Motif: E G B G (minor) / G B D B (major).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *
from inst import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
TARGET_LUFS = float(sys.argv[2]) if len(sys.argv) > 2 else -16.0
rng = np.random.default_rng(42)

IR_HALL = make_ir(3.0, 0.025, seed=3, bright=0.3)
IR_ROOM = make_ir(0.55, 0.008, seed=8, bright=0.5)

CUT = 466  # hard cut (end of the "before")
SILENT_TO = 588  # the answer enters here


class World:
    NAMES = ["piano", "drone", "mallet", "bell", "ping", "pad", "strings", "bass", "kick", "perc", "snap", "clap"]

    def __init__(self):
        self.b = {k: Bus() for k in self.NAMES}
        self.hall = Bus()
        self.room = Bus()
        self.kicks = []

    def place(self, bus, sig, frame, gain=1.0, p=0.0, hall=0.0, room=0.0, jit=True):
        s = frame * FR + (int(rng.integers(-120, 120)) if jit else 0)
        self.b[bus].add(sig, s, gain, p)
        if hall:
            self.hall.add(sig, s, gain * hall, p)
        if room:
            self.room.add(sig, s, gain * room, p)

    def mix(self, gains, autom=None, hall_wet=0.55, room_wet=0.35, sidechain=0.16):
        autom = autom or {}
        total = np.zeros((TOTAL, 2))
        env = np.zeros(TOTAL)
        for kf in self.kicks:
            s = int(kf * FR)
            n = min(int(0.4 * SR), TOTAL - s)
            if n > 0:
                env[s : s + n] = np.maximum(env[s : s + n], np.exp(-tt(n) / 0.13))
        sc_depth = {"pad": sidechain, "strings": sidechain, "bass": sidechain * 1.6, "drone": sidechain * 0.5}
        for k, bus in self.b.items():
            x = bus.buf.astype(float)
            if k == "bass":
                x = lp(x, 260)
                x = np.repeat(x.mean(axis=1, keepdims=True), 2, axis=1)
            elif k in ("mallet", "bell"):
                x = hp(x, 110)
            elif k == "ping":
                x = hp(x, 250)
            elif k == "piano":
                x = hp(x, 55)
            elif k == "drone":
                x = hp(x, 35)
            if k in sc_depth and len(self.kicks):
                x = x * (1 - sc_depth[k] * env)[:, None]
            g = gains.get(k, 1.0)
            if k in autom:
                x = x * curve(autom[k])[:, None]
            total += x * g
        h = reverb(hp(self.hall.buf.astype(float), 180), IR_HALL, TOTAL) * hall_wet
        r = reverb(hp(self.room.buf.astype(float), 150), IR_ROOM, TOTAL) * room_wet
        return total + lp(h, 7000) + r


# ---------------------------------------------------------------------------------------------------
# Harmony. name -> (bass midi, [root, third, fifth, colour]) so contour 0 1 2 1 gives G B D B, E G B G ...
# ---------------------------------------------------------------------------------------------------
CH = {
    "Em": (40, [52, 55, 59, 64]),
    "C/E": (40, [48, 52, 55, 60]),
    "Em(b2)": (40, [52, 55, 59, 65]),
    "G": (43, [55, 59, 62, 67]),
    "D/F#": (42, [50, 54, 57, 62]),
    "Em7": (40, [52, 55, 59, 62]),
    "Cmaj7": (36, [48, 52, 55, 59]),
    "G/B": (47, [55, 59, 62, 67]),
    "Am7": (45, [57, 60, 64, 67]),
    "D": (38, [50, 54, 57, 62]),
    "C": (36, [48, 52, 55, 60]),
    "Gmaj7": (43, [55, 59, 62, 66]),
    "Gadd9": (43, [55, 59, 62, 69]),
}


def chord_tones(name):
    return CH[name]


TIMELINE = [(0, "Em"), (270, "C/E"), (300, "Em"), (600, "G"), (690, "D/F#"), (780, "Em7"), (840, "Cmaj7"), (900, "G/B"),
            (930, "G"), (975, "D/F#"), (1020, "Am7"), (1080, "Cmaj7"), (1140, "D"), (1170, "G"), (1230, "Em"), (1290, "C"),
            (1320, "D"), (1350, "G"), (1410, "Em"), (1440, "C"), (1470, "Gmaj7"), (1530, "Am7"), (1590, "D"), (1650, "Gadd9")]
SEGS = [(s, TIMELINE[i + 1][0] if i + 1 < len(TIMELINE) else 1800, n) for i, (s, n) in enumerate(TIMELINE)]


def seg(f):
    for s, e, n in SEGS:
        if s <= f < e:
            return s, e, n
    return SEGS[-1]


def chord_at(f):
    return seg(f)[2]


def next_root(f):
    s, e, n = seg(f)
    return CH[chord_at(e)][0] if e < 1800 else CH[n][0]


def pn(w, m, frame, vel, dur, p=0.0, hall=0.5, room=0.0, bright=0.8, gain=1.0):
    w.place("piano", piano(m, vel, dur, bright), frame, gain, p, hall=hall, room=room)


def strings_trem(w, midis, f0, f1, vol_pts, rate0=9, rate1=14, depth=0.55, cutoff=3200, level=0.04):
    n = (f1 - f0) * FR
    out = np.zeros((n, 2))
    rate = np.interp(np.arange(n), [0, n], [rate0, rate1])
    phase_t = 2 * np.pi * np.cumsum(rate) / SR
    for i, m in enumerate(midis):
        f = float(mtof(m))
        x = saw_add(f * (1 + 0.002 * (i % 3 - 1)), n, cutoff, 1.1, i)
        trem = 1 - depth * (0.5 + 0.5 * np.sin(phase_t + i * 1.3))
        out += pan(x * trem, -0.55 + 1.1 * (i / max(1, len(midis) - 1)))
    v = np.interp(np.arange(n), [(p[0] - f0) * FR for p in vol_pts], [p[1] for p in vol_pts])
    out *= v[:, None] * level
    out = hp(out, 140)
    w.b["strings"].add(out, f0 * FR, 1.0)
    w.hall.add(out, f0 * FR, 0.35)


def thump(w, f, vel, m=40):
    """Felt heartbeat: lub-dub in the sub (the 'before' has no drums, only this)."""
    w.place("bass", pulse_bass(m, 0.12, vel, 0.008), f, 1.0, 0, jit=False)
    w.place("bass", pulse_bass(m, 0.09, vel * 0.6, 0.008), f + 9, 1.0, 0, jit=False)


# ---------------------------------------------------------------------------------------------------
# PRE world: frames 0-466 (half-time, free, no drums). Hard cut by the master at 466.
# ---------------------------------------------------------------------------------------------------
def build_pre():
    w = World()
    # --- S1 (0-210) Em: bowed low E drone from 20, felt piano E G B G, nothing else
    d = drone(40, (CUT + 40 - 20) / 60.0, att=1.7, rel=0.5, dark=240, bright=1000, seed=1,
              swell=[(0, 0), (3.0, 0.1), (5.5, 0.3), (7.4, 0.9)])
    w.b["drone"].add(d, 20 * FR, 1.0)
    w.hall.add(d, 20 * FR, 0.3)
    d2 = drone(47, (CUT + 40 - 210) / 60.0, att=3.0, rel=0.5, dark=240, bright=900, seed=2,
               swell=[(0, 0), (2.0, 0.2), (4.0, 0.8)])  # B2, the fifth, from S2
    w.b["drone"].add(d2 * 0.55, 210 * FR, 1.0)
    w.hall.add(d2 * 0.55, 210 * FR, 0.3)
    pn(w, 52, 58, 0.30, 5.0, -0.2, hall=1.1, bright=0.3)  # E3 under the first note
    pn(w, 64, 60, 0.46, 4.5, -0.12, hall=1.35, bright=0.4)  # E4
    pn(w, 67, 120, 0.42, 4.5, 0.05, hall=1.35, bright=0.4)  # G4
    pn(w, 71, 150, 0.46, 4.5, 0.12, hall=1.35, bright=0.4)  # B4
    pn(w, 67, 180, 0.38, 4.5, 0.0, hall=1.35, bright=0.4)  # G4
    # --- S2a (210-330): Em, C/E (270), Em add flat 2 (300); half-time pulse; sub heartbeat from 250 every 60
    for m, f0, f1, att in [(CH["Em"][1], 210, 270, 1.2), (CH["C/E"][1], 270, 300, 0.5), (CH["Em(b2)"][1], 300, CUT, 0.4)]:
        for mm in m:
            w.place("pad", pad_note(mm, (f1 - f0) / 60.0 + 0.2, att=att, rel=0.6, cutoff=950, hp_hz=120), f0, 0.7, 0, jit=False)
    pn(w, 64, 240, 0.50, 4.0, -0.1, hall=1.2, bright=0.45)  # motif, faster to the pulse
    pn(w, 67, 270, 0.52, 4.0, 0.05, hall=1.2, bright=0.45)
    pn(w, 71, 300, 0.56, 4.0, 0.12, hall=1.2, bright=0.45)
    pn(w, 65, 301, 0.34, 4.0, -0.15, hall=1.2, bright=0.4)  # the flat 2 (F) bites against E and B
    thump(w, 250, 0.45)
    thump(w, 310, 0.6)
    # --- S2b (330-466): Em add flat 2, tension, pulse doubles, tremolo strings climbing, held B6, HARD CUT at 466
    strings_trem(w, [52, 55, 59, 65], 330, CUT + 2, [(330, 0.25), (400, 0.6), (440, 0.95), (466, 1.1)], rate0=8, rate1=13)
    strings_trem(w, [64, 67, 71], 346, CUT + 2, [(346, 0.0), (400, 0.4), (450, 0.8)], rate0=9, rate1=14, level=0.03, cutoff=2600)
    nn = (446 - 330) * FR
    u = np.linspace(0, 1, nn)
    fl = 329.63 * (1975.5 / 329.63) ** (u ** 1.7)  # E4 climbing to B6
    phg = 2 * np.pi * np.cumsum(fl) / SR
    gl = sum(np.sin(k * phg) / k for k in range(1, 7))
    tg = tt(nn)
    gl = lp(gl, 3200) * (u ** 1.4) * np.minimum(1, (1 - u) / 0.06) * (1 - 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * tg))) * 0.075
    g2 = pan(hp(gl, 200), 0.1)
    w.b["strings"].add(g2, 330 * FR, 1.0)
    w.hall.add(g2, 330 * FR, 0.3)
    nb = (CUT + 2 - 440) * FR  # the held B6 sine, swelling to the cut
    tb = tt(nb)
    sw = (np.minimum(1, tb / 0.12) * (tb / tb[-1]) ** 1.6) * 0.085
    b6 = np.sin(2 * np.pi * 1975.5 * (1 + 0.003 * np.sin(2 * np.pi * 5.4 * tb)) * tb) + 0.18 * np.sin(2 * np.pi * 1975.5 * 2.0 * tb)
    b6 = pan(b6 * sw, 0.0)
    w.b["strings"].add(b6, 440 * FR, 1.0)
    w.hall.add(b6, 440 * FR, 0.25)
    for f, m, v in [(330, 40, 0.7), (360, 40, 0.75), (420, 40, 0.85), (450, 41, 0.95)]:  # soft pulse, 386/436 are the SFX heartbeats
        w.place("bass", pulse_bass(m, 0.16, v, 0.008), f, 1.0, 0, jit=False)
    for f, ms, v in [(345, [40, 52], 0.5), (405, [40, 52, 53], 0.6), (450, [40, 52, 53, 59], 0.7)]:  # dark tolls
        for j, m in enumerate(ms):
            pn(w, m, f + 0.5 * j, v if j < 2 else v * 0.7, 2.5, 0.0, hall=0.6, bright=0.3)
    return w


# ---------------------------------------------------------------------------------------------------
# POST world: frames 588-1800
# ---------------------------------------------------------------------------------------------------
def kal(w, f, m, vel, p, hall=0.3):
    w.place("mallet", kalimba(m, vel), f, 1.0, p, hall=hall, room=0.1)


def vib(w, f, m, vel, p, dur=1.8, hall=0.4):
    w.place("mallet", vibes(m, vel, dur), f, 1.0, p, hall=hall)


def ostinato(w, f0, f1, octave, accent=0.5, soft=0.38, restart=True, inst="kalimba", gain=1.0):
    """8th-note arpeggio on chord tones, contour 0 1 2 1 (G B D B). Restarts on each chord unless restart=False."""
    for f in range(f0, f1, 15):
        s, e, nm = seg(f)
        base = s if restart else f0
        i = ((f - base) // 15) % 4
        m = CH[nm][1][[0, 1, 2, 1][i]] + octave
        v = (accent if i == 0 else (soft if i % 2 else soft * 1.12)) * gain
        p = -0.35 if i % 2 == 0 else 0.35
        if inst == "kalimba":
            kal(w, f, m, v, p)
        else:
            vib(w, f, m, v, p)


def bass_pat(w, f0, f1, slots=(0, 3, 4, 6), vel=0.8, dropout=()):
    """Groove bass on the 8th grid (slot = 15-frame step in the 120-frame bar): root, octave, root, fifth."""
    for f in range(f0, f1, 15):
        if any(a <= f < b for a, b in dropout):
            continue
        slot = (f % 120) // 15
        if slot not in slots:
            continue
        root = CH[chord_at(f)][0]
        step = {0: 0, 3: 12, 4: 0, 6: 7, 2: 0, 5: 7, 7: 12, 1: 0}[slot]
        m = root + step
        while m > 52:
            m -= 12
        w.place("bass", pulse_bass(m, 0.3 if slot in (0, 4) else 0.18, vel if slot in (0, 4) else vel * 0.75), f, 1.0, 0, jit=False)


def walk_bass(w, f0, f1, vel=0.8):
    """Walking quarters: root, fifth, octave, then a chromatic approach to the next chord root."""
    for f in range(f0, f1, 30):
        s, e, nm = seg(f)
        root = CH[nm][0]
        i = ((f - s) // 30) % 4
        last = f + 30 >= e
        if last:
            m = next_root(f) - 1
        else:
            m = root + [0, 7, 12, 7][i]
        while m > 50:
            m -= 12
        while m < 33:
            m += 12
        w.place("bass", pulse_bass(m, 0.26, vel if not last else vel * 0.8), f, 1.0, 0, jit=False)


def kicks(w, f0, f1, pattern, vel=0.5, dropout=()):
    for f in range(f0, f1, 15):
        if any(a <= f < b for a, b in dropout):
            continue
        slot = (f % 120) // 15
        if slot in pattern:
            v = vel * (0.6 if slot in (3, 5, 7, 1) else 1.0)
            w.place("kick", kick(v, 100, 46, 0.19, 0.07), f, 1.0, 0, jit=False)
            w.kicks.append(f)


def snaps(w, f0, f1, vel=0.5, dropout=(), clap_vel=0.0):
    for f in range(f0, f1, 15):
        if any(a <= f < b for a, b in dropout):
            continue
        if (f % 120) in (30, 90):
            w.place("snap", snap(vel, seed=9 + (f // 30) % 3), f, 1.0, 0.15, hall=0.2, room=0.25)
            if clap_vel:
                w.place("clap", clap(clap_vel, seed=5 + (f // 30) % 3), f, 1.0, -0.15, hall=0.25, room=0.3)


def shakers(w, f0, f1, vel=0.34, dropout=()):
    i = 0
    f = float(f0)
    while f < f1:
        if not any(a <= f < b for a, b in dropout):
            on = (i % 2 == 0)
            w.place("perc", shaker(vel if on else vel * 0.55, seed=i % 4), f, 1.0, -0.3 if i % 2 else 0.3)
        f += 7.5
        i += 1


def hats(w, f0, f1, vel=0.4, dropout=()):
    for f in range(f0, f1, 15):
        if any(a <= f < b for a, b in dropout):
            continue
        slot = (f % 120) // 15
        w.place("perc", hat(vel if slot % 2 else vel * 0.7, 0.03 if slot % 2 else 0.018, seed=slot), f, 1.0, 0.3)


def pads(w, f0, f1, level=0.55, att=0.35, rel=0.9, cutoff=2100):
    for s, e, nm in SEGS:
        a, b = max(s, f0), min(e, f1)
        if b <= a:
            continue
        root, tri = CH[nm]
        notes = list(tri)
        if root + 12 < tri[0]:
            notes = [root + 12] + notes
        for m in notes:
            w.place("pad", pad_note(m, (b - a) / 60.0 + 0.25, att=att, rel=rel, cutoff=cutoff), a, level, 0, jit=False)


def build_post():
    w = World()
    # === 588: the answer. G major pad swell (G2 D3 B3, then G3 D4 B4) entering with the answered ping
    for m, fr in [(43, 588), (50, 588), (59, 589), (55, 595), (62, 596), (71, 597)]:
        w.place("pad", pad_note(m, 1.85, att=0.55, rel=0.8, cutoff=2400), fr, 0.75, 0, jit=False)
    # === S4 (600-780) G, D/F#: laid-back 120 BPM. Kalimba ostinato, soft sub pulse on 1 and 3, shaker from 660, snaps from 720
    ostinato(w, 600, 780, 12, accent=0.5, soft=0.36)
    for f in (600, 660, 720):
        root = CH[chord_at(f)][0]
        w.place("bass", pulse_bass(root, 0.34, 0.7), f, 1.0, 0, jit=False)
    shakers(w, 660, 780, vel=0.30)
    snaps(w, 720, 780, vel=0.38)
    pads(w, 690, 780, level=0.5)
    for i, m in enumerate([83, 86, 91]):  # a few bell glints on the sorting, ascending, quiet
        w.place("bell", bell(m, 0.22 - 0.03 * i, 1.4), 696 + 14 * i, 1.0, -0.3 + 0.3 * i, hall=0.7)
    # === S5 (780-930) Em7, Cmaj7, G/B: piano motif returns in major (G B D B), warm pad, bass enters 780
    pads(w, 780, 930, level=0.52)
    ostinato(w, 780, 930, 24, accent=0.34, soft=0.26)
    for i, f in enumerate(range(780, 930, 30)):
        m = [67, 71, 74, 71][i % 4]
        pn(w, m, f, 0.56 if i % 4 == 0 else 0.44, 0.45, [-0.1, 0.1][i % 2], hall=0.55, bright=0.8)
    bass_pat(w, 780, 930)
    kicks(w, 780, 930, (0, 4), vel=0.42)
    shakers(w, 780, 930, vel=0.30)
    snaps(w, 780, 930, vel=0.42)
    # === S6 (930-1020) G, D/F#: ease, drums out. Pad and piano only; a quiet ping-ripple at 960
    pads(w, 930, 1020, level=0.7, att=0.6, rel=1.1, cutoff=2300)
    seqs = [(930, [55, 62], 0.40, 2.5), (945, [71], 0.40, 2.0), (960, [74], 0.44, 2.0), (975, [66], 0.34, 2.5), (990, [69], 0.38, 2.0),
            (1005, [74], 0.40, 2.5)]
    for f, ms, v, d_ in seqs:
        for m in ms:
            pn(w, m, f, v, d_, 0.1, hall=0.8, bright=0.7)
    w.place("ping", ping(79, 0.45, dur=1.0, ring=0.18, attack=0.006, echo_times=[8 / 60, 16 / 60, 24 / 60], echo_gain=0.55, spread=0.5), 960, 1.0, 0, hall=0.5, jit=False)
    w.place("bass", pulse_bass(43, 1.5, 0.55, 0.05), 930, 1.0, 0, jit=False)
    w.place("bass", pulse_bass(42, 1.3, 0.55, 0.05), 975, 1.0, 0, jit=False)
    # === S7 (1020-1170) Am7, Cmaj7, D: groove returns, bass walks, shaker (the typing is ducked by cues.duck)
    pads(w, 1020, 1170, level=0.5)
    ostinato(w, 1020, 1170, 12, accent=0.5, soft=0.36)
    walk_bass(w, 1020, 1170, vel=0.75)
    kicks(w, 1020, 1170, (0, 4), vel=0.42)
    shakers(w, 1020, 1170, vel=0.30)
    snaps(w, 1020, 1170, vel=0.42)
    for f in range(1020, 1170, 120):
        for s_ in (0, 45, 90):  # light piano comp 3+3+2
            ff = f + s_
            if ff >= 1170:
                continue
            for m in CH[chord_at(ff)][1][1:3]:
                pn(w, m + 12, ff, 0.28, 0.25, 0.1, hall=0.3, bright=0.9)
    # === S8 (1170-1350) G, Em, C, D: build. Whip riser 1218-1246, drum drop-out 1326-1334, groove back at 1350
    DROP = [(1326, 1350)]
    pads(w, 1170, 1350, level=0.55)
    for s, e, nm in SEGS:  # strings pad joins at 1200
        a, b = max(s, 1200), min(e, 1350)
        if b <= a:
            continue
        for m in CH[nm][1][1:]:
            w.place("strings", pad_note(m + 12, (b - a) / 60.0 + 0.4, att=0.8, rel=1.0, cutoff=3200, hp_hz=220), a, 0.5, 0, jit=False)
    ostinato(w, 1170, 1290, 12, accent=0.5, soft=0.36)
    ostinato(w, 1230, 1290, 24, accent=0.22, soft=0.16, inst="vibes")
    bass_pat(w, 1170, 1350, slots=(0, 3, 4, 6), vel=0.82, dropout=DROP)
    kicks(w, 1170, 1230, (0, 4), vel=0.44)
    kicks(w, 1230, 1350, (0, 2, 4, 6), vel=0.46, dropout=DROP)
    snaps(w, 1170, 1326, vel=0.45, clap_vel=0.0)
    shakers(w, 1170, 1326, vel=0.3)
    hats(w, 1200, 1326, vel=0.34)
    # whip riser: a quiet strings glissando G4 -> G5, rising to the whip at 1246
    nn = (1246 - 1218) * FR
    ug = np.linspace(0, 1, nn)
    flr = 392.0 * 2 ** (ug ** 1.3)
    phr = 2 * np.pi * np.cumsum(flr) / SR
    gr = sum(np.sin(k * phr) / k for k in range(1, 8))
    gr = lp(gr, 2800) * (ug ** 1.6) * np.minimum(1, (1 - ug) / 0.08) * 0.05
    w.b["strings"].add(pan(hp(gr, 200), 0.0), 1218 * FR, 1.0)
    w.hall.add(pan(hp(gr, 200), 0.0), 1218 * FR, 0.3)
    # drop-out into the "Viewed" ping at 1334: a deep thump, then the pad and strings swell back up to the groove at 1350
    w.place("bass", pulse_bass(38, 0.5, 0.8, 0.02), 1334, 1.0, 0, jit=False)
    w.place("kick", kick(0.5, 90, 42, 0.2, 0.05), 1334, 1.0, 0, jit=False)
    w.kicks.append(1334)
    for m in [62, 66, 69, 74]:
        w.place("strings", pad_note(m, 0.4, att=0.28, rel=0.4, cutoff=3200, hp_hz=220), 1334, 0.6, 0, jit=False)
    for f, v in [(1342, 0.4), (1346, 0.5)]:
        w.place("kick", kick(v, 100, 46, 0.19, 0.07), f, 1.0, 0, jit=False)
        w.kicks.append(f)
    # === S9 (1350-1470) G, Em, C: warm, full band. Motif G B D B G in piano octaves, kalimba/vibes, strings pad, bass
    pads(w, 1350, 1470, level=0.62)
    for s, e, nm in SEGS:
        a, b = max(s, 1350), min(e, 1470)
        if b <= a:
            continue
        for m in CH[nm][1][1:]:
            w.place("strings", pad_note(m + 12, (b - a) / 60.0 + 0.4, att=0.5, rel=1.0, cutoff=3300, hp_hz=220), a, 0.7, 0, jit=False)
    w.place("bell", bell(103, 0.1, 1.6), 1350, 1.0, 0.2, hall=0.8)
    w.place("perc", crash_soft(1.6) * 0.22, 1350, 1.0, 0.0, hall=0.4)
    ostinato(w, 1350, 1470, 12, accent=0.5, soft=0.36, restart=False)
    ostinato(w, 1350, 1470, 24, accent=0.24, soft=0.18, restart=False, inst="vibes")
    for i, (f, m) in enumerate([(1350, 79), (1380, 83), (1410, 86), (1440, 83), (1470, 79)]):  # G B D B G
        for mm, v, g in [(m, 0.60, 1.0), (m - 12, 0.46, 0.8)]:
            pn(w, mm, f, v, 0.55 if i < 4 else 2.5, 0.1, hall=0.5, bright=0.85, gain=g)
        w.place("bell", bell(m + 12, 0.22, 1.4), f, 0.8, 0.45, hall=0.6)
    bass_pat(w, 1350, 1470, slots=(0, 3, 4, 6), vel=0.85)
    kicks(w, 1350, 1470, (0, 4, 5), vel=0.52)
    snaps(w, 1350, 1470, vel=0.45, clap_vel=0.3)
    shakers(w, 1350, 1470, vel=0.3)
    hats(w, 1350, 1470, vel=0.34)
    # === S10 (1470-1650) Gmaj7, Am7, D: proud. Drums thin to kick and snap, held pad, pings on the counts
    pads(w, 1470, 1650, level=0.62, att=0.5, rel=1.2, cutoff=2300)
    for s, e, nm in SEGS:
        a, b = max(s, 1470), min(e, 1650)
        if b <= a:
            continue
        for m in CH[nm][1][1:]:
            w.place("strings", pad_note(m + 12, (b - a) / 60.0 + 0.5, att=0.7, rel=1.2, cutoff=3000, hp_hz=220), a, 0.55, 0, jit=False)
    for s, ms in [(1470, [43, 55, 59, 62, 66]), (1530, [45, 57, 60, 64, 67]), (1590, [38, 50, 54, 57, 62])]:
        for j, m in enumerate(ms):
            pn(w, m, s + 0.5 * j, 0.44 if m > 50 else 0.5, 2.2, 0.0, hall=0.6, bright=0.7)
    kicks(w, 1470, 1650, (0, 4), vel=0.5)
    snaps(w, 1470, 1650, vel=0.42)
    for f, m in [(1488, 79), (1526, 83), (1564, 86)]:  # pings on the counts, one per card
        w.place("ping", ping(m, 0.42, dur=1.0, ring=0.16, attack=0.005, echo_times=[0.25, 0.5, 0.75], echo_gain=0.5, spread=0.5), f, 1.0, 0, hall=0.5, jit=False)
    for s, nm in [(1500, "Gmaj7"), (1560, "Am7"), (1620, "D")]:
        w.place("bass", pulse_bass(CH[nm][0], 1.0, 0.7, 0.03), s, 1.0, 0, jit=False)
    for i, m in enumerate([86, 90, 93, 98]):  # sparkle on the third card
        w.place("bell", bell(m, 0.2 - 0.03 * i, 1.6), 1566 + 5 * i, 1.0, -0.4 + 0.3 * i, hall=0.8)
    # resolving lift into the final chord (D -> G add9)
    for m in [50, 57, 62, 66]:
        w.place("pad", pad_note(m, 0.5, att=0.25, rel=0.4, cutoff=2200), 1620, 0.4, 0, jit=False)
    # === S11 (1650-1800) G add9: the final chord rings at 1650, last piano statement G B D B G at 1668, ritardando from 1740
    for j, m in enumerate([43, 55, 62, 69, 71, 74, 79]):
        pn(w, m, 1650 + 0.8 * j, 0.52 if m > 40 else 0.56, 5.0, 0.0, hall=0.9, bright=0.7)
    for m in [55, 59, 62, 69]:
        w.place("pad", pad_note(m, 2.6, att=0.15, rel=1.5, cutoff=2300, decay_tau=1.8), 1650, 0.8, 0, jit=False)
    for m in [67, 71, 74, 81]:
        w.place("strings", pad_note(m, 2.6, att=0.3, rel=1.5, cutoff=3000, hp_hz=220, decay_tau=1.8), 1650, 0.55, 0, jit=False)
    w.place("bass", pulse_bass(43, 2.4, 0.8, 0.02), 1650, 1.0, 0, jit=False)
    for f, m, v in [(1668, 79, 0.52), (1690, 83, 0.5), (1714, 86, 0.5), (1742, 83, 0.46), (1774, 79, 0.44)]:
        pn(w, m, f, v, 3.0, 0.05, hall=0.9, bright=0.8)
    pn(w, 67, 1774, 0.36, 3.0, -0.05, hall=0.9, bright=0.6)
    return w


# The dynamic arc (relative short-term RMS, dB). The score is built with musical balance per section; this curve then
# shapes the macro level: a whisper in S1, tension climbing to the cut, a laid-back start after the answer, ease in S6,
# full and proud in S9/S10, the final chord, a long decay.
ARC = [(0, -60), (30, -48), (60, -30), (120, -28), (180, -26.5), (210, -25.5), (270, -22.5), (330, -20.5), (400, -17.5), (440, -15), (466, -13.5),
       (588, -22), (600, -21), (690, -19.5), (780, -18.5), (870, -18.5), (930, -19), (960, -21.5), (1020, -19.5), (1100, -18.5),
       (1170, -18), (1230, -17), (1320, -16.8), (1334, -19), (1350, -15.5), (1410, -15.2), (1470, -15.8), (1530, -15.5),
       (1590, -15.5), (1650, -13.5), (1700, -15.5), (1740, -20), (1800, -60)]


def level_to_arc(mix, arc, lim=18.0):
    centers = np.arange(0, 1801, 30)
    meas = np.zeros(len(centers))
    for k, c in enumerate(centers):
        a, b = max(0, (c - 45) * FR), min(TOTAL, (c + 45) * FR)
        r = np.sqrt(np.mean(mix[a:b] ** 2)) if b > a else 0.0
        meas[k] = 20 * np.log10(r + 1e-9)
    tgt = np.interp(centers, [p[0] for p in arc], [p[1] for p in arc])
    g = np.clip(tgt - meas, -lim, lim)
    g[meas < -60] = 0.0
    for _ in range(2):
        gp = np.pad(g, 1, mode="edge")
        g = 0.25 * gp[:-2] + 0.5 * gp[1:-1] + 0.25 * gp[2:]
    return mix * np.interp(np.arange(TOTAL), centers * FR, 10 ** (g / 20.0))[:, None]


if __name__ == "__main__":
    print("building pre...", flush=True)
    pre = build_pre()
    pre_gains = dict(piano=1.0, drone=1.0, pad=1.0, strings=1.0, bass=0.8)
    pre_autom = dict(drone=[(20, 0.0), (110, 0.55), (210, 0.7), (330, 1.0), (466, 1.5)],
                     pad=[(210, 0.6), (330, 1.0), (466, 1.2)])
    pre_mix = pre.mix(pre_gains, pre_autom, hall_wet=0.7, room_wet=0.2)
    del pre
    print("building post...", flush=True)
    post = build_post()
    post_gains = dict(piano=1.0, mallet=1.0, bell=0.9, ping=1.0, pad=1.0, strings=0.9, bass=0.75, kick=0.85, perc=0.9, snap=1.0, clap=0.9)
    post_autom = dict(
        pad=[(588, 0.0), (600, 0.9), (780, 0.8), (930, 1.0), (1020, 0.85), (1170, 0.9), (1350, 1.0), (1650, 1.0)],
        strings=[(1200, 0.0), (1230, 0.7), (1350, 1.0), (1470, 0.8), (1650, 1.0)],
        bass=[(780, 1.0), (1800, 1.0)],
    )
    post_mix = post.mix(post_gains, post_autom, hall_wet=0.6, room_wet=0.3)
    del post
    mix = pre_mix + post_mix
    # master: tame lows/highs, glue
    mix = hp(mix, 32)
    mix = lp(mix, 12000)
    mix = level_to_arc(mix, ARC)
    mix = compress(mix, thr_db=-14, ratio=1.7, atk=0.02, rel=0.3, makeup_db=0.0)
    # the hard cut at 466 (a 4-frame fade so it is click-free but reads as a cut) and TRUE digital silence until 588
    gate = curve([(0, 1), (CUT - 4, 1), (CUT, 0), (SILENT_TO, 0), (SILENT_TO + 0.01, 1), (1800, 1)])
    gate[CUT * FR : SILENT_TO * FR] = 0.0
    mix = mix * gate[:, None]
    # the end: decays to silence by 1800 (a long natural taper; the last sample is exactly 0)
    end = curve([(0, 1), (1730, 1), (1800, 0.0)])
    end = np.sin(np.clip(end, 0, 1) * np.pi / 2) ** 2
    mix = mix * end[:, None]
    for _ in range(3):
        integ, st = lufs(mix)
        mix = mix * 10 ** ((TARGET_LUFS - integ) / 20)
        mix = limiter(mix, 0.80)
    mix[CUT * FR : SILENT_TO * FR] = 0.0
    mix[-FR // 4 :] *= np.linspace(1, 0, FR // 4)[:, None]
    mix[-1] = 0
    integ, st = lufs(mix)
    print("music LUFS integrated %.2f  short-term max %.2f  true peak %.2f dB" % (integ, st, true_peak_db(mix)))
    write_wav(OUT, mix)
    print("wrote", OUT, mix.shape)
