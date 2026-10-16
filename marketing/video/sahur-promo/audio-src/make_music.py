"""Tracvey story film: music (30.0 s, 48 kHz stereo). D major relief / D minor stress, one motif (D F# A F#).
Tempo: 90 BPM to f540, free time 540-660, 120 BPM from f660, ritardando into the final chord at f1620.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *
from inst import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
TARGET_LUFS = float(sys.argv[2]) if len(sys.argv) > 2 else -14.5
rng = np.random.default_rng(42)

IR_HALL = make_ir(2.6, 0.022, seed=3, bright=0.35)
IR_ROOM = make_ir(0.55, 0.008, seed=8, bright=0.5)


class World:
    NAMES = ["piano", "guitar", "mallet", "bell", "pad", "strings", "bass", "kick", "perc", "clap"]

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
        sc = np.ones(TOTAL)
        for kf in self.kicks:
            s = int(kf * FR)
            n = min(int(0.4 * SR), TOTAL - s)
            if n > 0:
                sc[s : s + n] = np.minimum(sc[s : s + n], 1 - sidechain * np.exp(-tt(n) / 0.13))
        for k, bus in self.b.items():
            x = bus.buf.astype(float)
            if k == "bass":
                x = lp(x, 260)
                x = np.repeat(x.mean(axis=1, keepdims=True), 2, axis=1)
            elif k in ("guitar", "mallet", "bell"):
                x = hp(x, 110)
            elif k == "piano":
                x = hp(x, 55)
            elif k in ("pad", "strings"):
                x = x * sc[:, None]
            g = gains.get(k, 1.0)
            if k in autom:
                x = x * curve(autom[k])[:, None]
            total += x * g
        h = reverb(hp(self.hall.buf.astype(float), 180), IR_HALL, TOTAL) * hall_wet
        r = reverb(hp(self.room.buf.astype(float), 150), IR_ROOM, TOTAL) * room_wet
        return total + lp(h, 7500) + r


def chord_tones(name):
    return {
        "D": (38, [50, 57, 62, 66]),
        "A": (33, [52, 57, 61, 64]),
        "Bm": (35, [50, 54, 59, 62]),
        "G": (31, [50, 55, 59, 62]),
        "Gmaj7": (31, [55, 59, 62, 66]),
        "Dm": (38, [50, 57, 62, 65]),
        "Bb": (34, [46, 53, 58, 62]),
    }[name]


TIMELINE = [(660, "D"), (780, "A"), (900, "Bm"), (1020, "G"), (1140, "Bm"), (1200, "G"), (1230, "A"), (1260, "D"),
            (1320, "A"), (1380, "Bm"), (1410, "G"), (1470, "A"), (1500, "Gmaj7"), (1560, "A"), (1620, "D")]


def chord_at(f):
    c = TIMELINE[0][1]
    for s, n in TIMELINE:
        if f >= s:
            c = n
    return c


def cello_line(w, midis, f0, f1, vol_pts, bus="strings", cutoff=700):
    n = (f1 - f0) * FR
    t = tt(n)
    out = np.zeros((n, 2))
    for i, m in enumerate(midis):
        f = float(mtof(m))
        vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.1 * t + i) * np.minimum(1, t / 1.5)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x = sum(np.sin(k * ph + k) / k for k in range(1, 14))
        out += pan(x, -0.3 if i % 2 == 0 else 0.3)
    out = lp(out, cutoff, 2)
    v = np.interp(np.arange(n), [(p[0] - f0) * FR for p in vol_pts], [p[1] for p in vol_pts])
    out *= v[:, None] * 0.09
    w.b[bus].add(out, f0 * FR, 1.0)
    w.hall.add(out, f0 * FR, 0.3)


def strings_trem(w, midis, f0, f1, vol_pts, rate0=9, rate1=14, depth=0.55, cutoff=3200):
    n = (f1 - f0) * FR
    t = tt(n)
    out = np.zeros((n, 2))
    rate = np.interp(np.arange(n), [0, n], [rate0, rate1])
    phase_t = 2 * np.pi * np.cumsum(rate) / SR
    for i, m in enumerate(midis):
        f = float(mtof(m))
        x = saw_add(f * (1 + 0.002 * (i % 3 - 1)), n, cutoff, 1.1, i)
        trem = 1 - depth * (0.5 + 0.5 * np.sin(phase_t + i * 1.3))
        out += pan(x * trem, -0.55 + 1.1 * (i / max(1, len(midis) - 1)))
    v = np.interp(np.arange(n), [(p[0] - f0) * FR for p in vol_pts], [p[1] for p in vol_pts])
    out *= v[:, None] * 0.04
    out = hp(out, 140)
    w.b["strings"].add(out, f0 * FR, 1.0)
    w.hall.add(out, f0 * FR, 0.35)


def pn(w, m, frame, vel, dur, p=0.0, hall=0.5, room=0.0, bright=0.8, gain=1.0):
    w.place("piano", piano(m, vel, dur, bright), frame, gain, p, hall=hall, room=room)


# --------------------------------------------------------------------------------------------
# PRE world: frames 0-540 (calm, mounting stress, overwhelm). Gated to silence by the master.
# --------------------------------------------------------------------------------------------
def build_pre():
    w = World()
    # calm: solo felt piano, D major, motif D F# A F# on the 90 BPM beat (40 frames)
    pn(w, 50, 0, 0.42, 4.0, -0.15, hall=0.7)
    pn(w, 57, 8, 0.33, 4.0, -0.1, hall=0.7)
    pn(w, 62, 14, 0.55, 3.0, 0.05, hall=0.7)
    pn(w, 66, 54, 0.50, 3.0, 0.08, hall=0.7)
    pn(w, 45, 78, 0.38, 4.0, -0.2, hall=0.7)
    pn(w, 69, 94, 0.56, 3.0, 0.1, hall=0.7)
    pn(w, 76, 112, 0.24, 2.5, 0.35, hall=0.9, bright=1.0)
    pn(w, 66, 134, 0.44, 3.0, 0.08, hall=0.7)
    # a whisper of warm pad under the calm (D major)
    for m in [50, 57, 62, 66]:
        w.place("pad", pad_note(m, 3.0, att=1.2, rel=1.4, cutoff=1200), 20, 0.5, 0, jit=False)
    # D minor, same tune with the F natural
    for m in [50, 53, 57]:
        w.place("pad", pad_note(m, 3.3, att=0.9, rel=1.2, cutoff=900, decay_tau=2.5), 150, 0.7, 0, jit=False)
    pn(w, 38, 160, 0.5, 5.0, -0.2, hall=0.6)
    pn(w, 57, 162, 0.4, 3.0, -0.1, hall=0.6)
    pn(w, 62, 168, 0.55, 3.0, 0.05, hall=0.6)
    pn(w, 65, 200, 0.5, 3.0, 0.08, hall=0.6)
    pn(w, 46, 238, 0.45, 4.0, -0.2, hall=0.6)
    pn(w, 53, 240, 0.35, 3.0, -0.1, hall=0.6)
    pn(w, 69, 244, 0.55, 3.0, 0.1, hall=0.6)
    pn(w, 65, 280, 0.5, 2.5, 0.08, hall=0.6)
    pn(w, 45, 304, 0.5, 3.0, -0.15, hall=0.6)
    pn(w, 73, 310, 0.4, 2.0, 0.2, hall=0.6)  # C# leading tone: unresolved
    # cello drone from 190, swelling into overwhelm
    cello_line(w, [26, 38, 45], 190, 520, [(190, 0.0), (250, 0.7), (330, 1.0), (460, 1.4), (520, 1.6)])
    # dry heartbeat kick, 1 per 40 frames, fading in 250-330
    for f in range(250, 330, 40):
        v = 0.15 + 0.4 * (f - 250) / 80
        w.place("kick", kick(v, 95, 42, 0.16, 0.04), f, 1.0, 0, room=0.1)
    # overwhelm: pulse doubles to 8ths (20 frames), D minor with a b9, tremolo strings
    strings_trem(w, [50, 57, 62, 65, 75], 330, 521, [(330, 0.2), (400, 0.55), (470, 0.95), (520, 1.2)])
    # rising glissando line D4 -> D5 (tension)
    nn = (520 - 330) * FR
    tg = tt(nn)
    fl = 293.66 * 2 ** (np.linspace(0, 1, nn) ** 1.6)
    phg = 2 * np.pi * np.cumsum(fl) / SR
    gl = sum(np.sin(k * phg) / k for k in range(1, 8))
    gl = lp(gl, 2600) * np.linspace(0.0, 1.0, nn) ** 1.5 * (1 - 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * tg))) * 0.07
    w.b["strings"].add(pan(hp(gl, 200), 0.1), 330 * FR, 1.0)
    w.hall.add(pan(hp(gl, 200), 0.1), 330 * FR, 0.3)
    for i, f in enumerate(range(330, 520, 20)):
        prog = (f - 330) / 190
        root = 38 + (0 if f < 420 else (1 if f < 470 else 2))
        w.place("bass", sub_bass(root, 0.16, 0.5 + 0.5 * prog), f, 1.0, 0, jit=False)
        w.place("bass", sub_bass(root + 12, 0.1, 0.25 + 0.3 * prog), f + 10, 0.6, 0, jit=False)
        m = 74 + (0 if f < 400 else (1 if f < 450 else 2)) + (1 if i % 2 else 0)
        pn(w, m, f, 0.32 + 0.35 * prog, 0.3, 0.2 * (1 if i % 2 else -1), hall=0.3, bright=1.0)
        if i % 2 == 0:
            w.place("kick", kick(0.55 + 0.35 * prog, 100, 44, 0.14, 0.08), f, 1.0, 0, jit=False)
        w.place("perc", hat(0.25 + 0.4 * prog, 0.02), f + 10, 0.8, 0.2, jit=False)
    return w


# --------------------------------------------------------------------------------------------
# POST world: frames 600-1800
# --------------------------------------------------------------------------------------------
def build_post():
    w = World()
    # The turn: a single clean piano note, D4, long decay
    pn(w, 62, 600, 0.62, 5.0, 0.0, hall=1.1, bright=0.7)
    # warm D major pad swell from 625 into the bar
    for m in [50, 57, 62, 66, 69]:
        w.place("pad", pad_note(m, 2.3, att=1.1, rel=1.0, cutoff=2200), 625, 0.9, 0, jit=False)
    # bright lift at the bar line
    pn(w, 50, 660, 0.55, 3.0, -0.1, hall=0.6)
    pn(w, 62, 660, 0.55, 3.0, 0.0, hall=0.6)
    pn(w, 74, 660, 0.45, 3.0, 0.1, hall=0.6, bright=1.0)
    for i, m in enumerate([86, 90, 93, 98]):
        w.place("bell", bell(m, 0.35 - 0.04 * i, 1.8), 664 + 7 * i, 1.0, -0.3 + 0.25 * i, hall=0.7)

    # pad per chord through the film
    padmap = []
    for i, (s, nme) in enumerate(TIMELINE[:-1]):
        e = TIMELINE[i + 1][0]
        if s < 660:
            continue
        padmap.append((s, e, nme))
    for s, e, nme in padmap:
        root, tri = chord_tones(nme)
        notes = [tri[0], tri[1], tri[2], tri[3]]
        att = 0.35 if s > 700 else 0.5
        for m in notes:
            w.place("pad", pad_note(m, (e - s) / 60 + 0.25, att=att, rel=0.9, cutoff=2100), s, 0.55, 0, jit=False)
        if s >= 1290 - 100 and s < 1500:
            for m in tri[1:]:
                w.place("strings", pad_note(m + 12, (e - s) / 60 + 0.4, att=0.6, rel=1.0, cutoff=3300, hp_hz=220), s, 0.5, 0, jit=False)
    # strings pad enters at 1290 (the one that starts mid-chord)
    # (chord D starts 1260; its strings layer starts at 1290)
    r, tri = chord_tones("D")
    for m in tri[1:]:
        w.place("strings", pad_note(m + 12, 1.5, att=0.9, rel=1.0, cutoff=3300, hp_hz=220), 1290, 0.5, 0, jit=False)

    for i in range(int((1620 - 660) / 15)):
        f = 660 + 15 * i
        slot = (f - 660) % 120 // 15  # 0..7
        ch = chord_at(f)
        root, tri = chord_tones(ch)
        in_drop = 1440 <= f < 1450 or (1440 <= f < 1455)

        # guitar: interlock on the even slots
        if 660 <= f < 1500 and not in_drop and slot % 2 == 0:
            idx = [0, 2, 1, 3][(slot // 2) % 4]
            if 990 <= f < 1140 or f >= 1260:
                # strums on beats 1, 2+, 3, 4+ (slots 0, 3 handled below), keep simple chord shape
                pass
            gtr = tri[idx] if idx < len(tri) else tri[0]
            g = 0.45 + 0.2 * (f >= 900) + 0.1 * (f >= 1260)
            w.place("guitar", guitar(gtr, 0.55 if slot else 0.7, 0.35), f, g, -0.4, room=0.25, hall=0.2)
        # marimba on the odd slots (octave up from 990)
        if 660 <= f < 1500 and not in_drop and slot % 2 == 1 and not (840 <= f < 990):
            arp = tri[1:] if len(tri) > 3 else tri
            nm = arp[(slot // 2) % 3] + (24 if 990 <= f < 1140 else 12)
            mg = 0.55 if f < 1260 else 0.35
            w.place("mallet", marimba(nm, 0.55), f, mg, 0.4, hall=0.3)
        # piano bright and quick (Ask): motif contour 0 1 2 1 on the 8ths
        if 840 <= f < 1020:
            arp = tri[1:]
            nm = arp[[0, 1, 2, 1][(slot // 1) % 4]] + 12
            pn(w, nm, f, 0.5 if slot % 2 == 0 else 0.38, 0.22, 0.15, hall=0.35, bright=1.0)
        # rhythmic piano comp in the montage: 3+3+2
        if 1140 <= f < 1260 and slot in (0, 3, 6):
            for m in tri[:3]:
                pn(w, m + 12 if m < 54 else m, f, 0.34, 0.25, 0.1, hall=0.25, bright=0.9, gain=0.9)
        # claps on beats 2 and 4 (slots 2 and 6)
        if 720 <= f < 1620 and slot in (2, 6) and not in_drop:
            v = 0.45 if f < 1260 else 0.6
            w.place("clap", clap(v, seed=5 + (f // 15) % 3), f, 1.0, 0.15, hall=0.25, room=0.3)
        # kick
        if 900 <= f < 1620 and not in_drop:
            if f < 1260:
                kslots = (0, 4)
            elif f < 1500:
                kslots = (0, 4, 5) if (f - 660) % 240 >= 120 else (0, 4)
            else:
                kslots = (0, 4)
            if slot in kslots:
                v = 0.42 if f < 1140 else (0.55 if f < 1260 else 0.62)
                if slot == 5:
                    v *= 0.6
                w.place("kick", kick(v, 100, 46, 0.2, 0.08), f, 1.0, 0, jit=False)
                w.kicks.append(f)
        # hats / brush / shaker
        if 900 <= f < 1020 and slot in (2, 6, 3, 7):
            w.place("perc", brush(0.5 if slot in (2, 6) else 0.3, seed=slot, length=0.1), f, 1.0, 0.25)
        if 1020 <= f < 1260:
            for sub in (0, 1):
                ff = f + 7.5 * sub
                w.place("perc", shaker(0.34 if (slot + sub) % 2 == 0 else 0.2, seed=int(slot * 2 + sub)), ff, 1.0, -0.3)
        if 1140 <= f < 1500 and not in_drop:
            w.place("perc", hat(0.5 if slot % 2 else 0.34, 0.03 if slot % 2 else 0.018, seed=slot), f, 1.0, 0.3)
        # bass
        if not in_drop:
            if 780 <= f < 1140 and slot in (0, 3, 6):
                bm = root + (7 if slot == 6 and root < 38 else 0)
                bm = bm + 12 if root < 33 else bm
                w.place("bass", sub_bass(bm, 0.3 if slot == 0 else 0.18, 0.7), f, 1.0, 0, jit=False)
            if 1140 <= f < 1260 and slot in (0, 2, 4, 6):
                step = [0, 7, 12, 7][slot // 2]
                bm = root + step
                bm = bm + 12 if root < 33 else bm
                bm = bm - 12 if bm > 47 else bm
                w.place("bass", sub_bass(bm, 0.26, 0.75), f, 1.0, 0, jit=False)
            if 1260 <= f < 1500 and slot in (0, 3, 4, 6):
                step = {0: 0, 3: 12, 4: 0, 6: 7}[slot]
                bm = root + step
                bm = bm + 12 if root < 33 else bm
                bm = bm - 12 if bm > 47 else bm
                w.place("bass", sub_bass(bm, 0.22 if slot != 0 else 0.34, 0.85), f, 1.0, 0, jit=False)
    # bass pedal under the numbers + final
    for s, nm, d in [(1500, "Gmaj7", 1.0), (1560, "A", 1.0)]:
        root, _ = chord_tones(nm)
        w.place("bass", sub_bass(root + (12 if root < 33 else 0), d + 0.2, 0.7), s, 1.0, 0, jit=False)
        w.kicks.append(s)

    # guitar strums in the port section and chorus (3-note spread) on beat 2+ and 4+
    for f in range(990, 1500, 30):
        slot = (f - 660) % 120 // 15
        if slot in (3, 7) and not (1140 <= f < 1260) and not (1440 <= f < 1455):
            root, tri = chord_tones(chord_at(f))
            for j, m in enumerate(tri[:4]):
                w.place("guitar", guitar(m, 0.38, 0.4), f + 0.6 * j, 0.5, -0.45 + 0.1 * j, room=0.2, hall=0.15)

    # chorus melody (piano in octaves + glockenspiel)
    mel = [(1260, 74, 15), (1275, 78, 15), (1290, 81, 30), (1320, 78, 15), (1335, 76, 15), (1350, 73, 15), (1365, 76, 15),
           (1380, 74, 15), (1395, 78, 15), (1410, 79, 30)]
    for f, m, d in mel:
        dd = d / 60 + 0.4
        pn(w, m, f, 0.62, dd, 0.1, hall=0.45, bright=0.9)
        pn(w, m - 12, f, 0.45, dd, 0.0, hall=0.45, bright=0.8, gain=0.8)
        w.place("bell", bell(m + 12, 0.3, 1.4), f, 0.8, 0.45, hall=0.6)
    # LH chord support in chorus
    for s, nm in [(1260, "D"), (1320, "A"), (1380, "Bm"), (1410, "G")]:
        root, tri = chord_tones(nm)
        pn(w, tri[0], s, 0.4, 1.5, -0.2, hall=0.4, gain=0.8)
        pn(w, tri[1], s + 15, 0.3, 1.0, -0.1, hall=0.4, gain=0.7)
    # bright arpeggio after the hit-stop (16ths, 7.5 frames)
    arp = [(1450, 71), (1457.5, 74), (1465, 79), (1470, 73), (1477.5, 76), (1485, 81), (1492.5, 85), (1497, 88)]
    for f, m in arp:
        pn(w, m, f, 0.5, 0.35, 0.2, hall=0.5, bright=1.0)
        w.place("bell", bell(m + 12, 0.22, 1.2), f, 0.8, 0.45, hall=0.6)
    # one beat of drums out 1440-1450: only a held pad/strings bloom
    # numbers: held piano chord and a sparkle on 1556
    root, tri = chord_tones("Gmaj7")
    for j, m in enumerate([43, 55, 59, 62, 66]):
        pn(w, m, 1500 + 0.5 * j, 0.45 if m > 50 else 0.5, 1.9, 0.0, hall=0.55, bright=0.7)
    root, tri = chord_tones("A")
    for j, m in enumerate([45, 57, 61, 64, 67]):
        pn(w, m, 1560 + 0.5 * j, 0.42, 1.0, 0.0, hall=0.55, bright=0.7)
    for i, m in enumerate([86, 90, 93, 98]):
        w.place("bell", bell(m, 0.36 - 0.05 * i, 1.6), 1556 + 4 * i, 1.0, -0.4 + 0.3 * i, hall=0.8)
    # resolving swell on D from 1608
    for m in [50, 57, 62, 66]:
        w.place("pad", pad_note(m, 0.3, att=0.2, rel=0.3, cutoff=2000), 1608, 0.4, 0, jit=False)

    # final chord, D major add9, ring (ritardando: no beat)
    for j, m in enumerate([26, 38, 50, 57, 64, 66, 69]):
        pn(w, m, 1620 + 0.8 * j, 0.52 if m > 40 else 0.55, 5.5, 0.0, hall=0.8, bright=0.7)
    for m in [50, 57, 62, 64, 66]:
        w.place("pad", pad_note(m, 3.0, att=0.15, rel=1.5, cutoff=2300, decay_tau=1.9), 1620, 0.75, 0, jit=False)
    for m in [62, 66, 69, 76]:
        w.place("strings", pad_note(m + 0, 3.0, att=0.3, rel=1.5, cutoff=3000, hp_hz=220, decay_tau=1.9), 1620, 0.5, 0, jit=False)
    w.place("bass", sub_bass(38, 2.5, 0.8), 1620, 1.0, 0, jit=False)
    w.place("bass", sub_bass(26 + 12, 0.1, 0.0), 1620, 0.0, 0, jit=False)
    w.place("bell", bell(86, 0.32, 2.5), 1623, 1.0, 0.0, hall=0.9)
    # last statement of the motif: D F# A F# D, slowing (ritardando)
    for f, m, v in [(1650, 74, 0.55), (1672, 78, 0.5), (1696, 81, 0.5), (1724, 78, 0.45), (1756, 74, 0.48)]:
        pn(w, m, f, v, 3.0, 0.05, hall=0.8, bright=0.8)
    pn(w, 62, 1756, 0.4, 3.0, -0.05, hall=0.8, bright=0.6)
    return w


if __name__ == "__main__":
    print("building pre...", flush=True)
    pre = build_pre()
    pre_gains = dict(piano=1.0, guitar=1, mallet=1, bell=1, pad=0.9, strings=1.0, bass=0.9, kick=0.9, perc=1, clap=1)
    pre_mix = pre.mix(pre_gains, hall_wet=0.6, room_wet=0.3)
    # underwater low-pass cut from 520, silent by 540
    uw = lp(pre_mix, 400, 2)
    g_blend = curve([(0, 0), (520, 0), (526, 1), (1800, 1)])[:, None]
    g_gate = curve([(0, 1), (520, 1), (540, 0), (1800, 0)])[:, None]
    g_gate = np.sin(g_gate * np.pi / 2)  # smooth
    pre_mix = (pre_mix * (1 - g_blend) + uw * g_blend) * g_gate
    print("building post...", flush=True)
    post = build_post()
    post_gains = dict(piano=1.0, guitar=1.0, mallet=1.0, bell=0.9, pad=1.0, strings=0.9, bass=1.0, kick=1.0, perc=0.9, clap=1.0)
    post_autom = dict(
        pad=[(600, 0.0), (625, 0.5), (660, 0.8), (780, 0.6), (900, 0.55), (1140, 0.6), (1260, 0.85), (1500, 0.7), (1620, 1.0)],
        strings=[(1260, 0.0), (1290, 0.7), (1410, 1.0), (1500, 0.5), (1620, 1.0)],
        guitar=[(660, 0.8), (1260, 1.0), (1500, 1.0)],
        bass=[(780, 1.0), (1620, 1.0)],
    )
    post_mix = post.mix(post_gains, post_autom, hall_wet=0.6, room_wet=0.3)
    mix = pre_mix + post_mix
    # master: tame lows/highs, glue, limit
    mix = hp(mix, 32)
    mix = lp(mix, 12000)
    macro = curve([(0, 0.55), (100, 0.62), (150, 0.62), (250, 0.75), (330, 0.95), (500, 1.2), (520, 1.2), (600, 0.8), (640, 0.9),
                   (660, 1.0), (840, 1.0), (990, 1.05), (1140, 1.12), (1260, 1.35), (1410, 1.5), (1500, 1.15), (1560, 1.1),
                   (1620, 1.4), (1700, 1.3), (1800, 1.2)])
    mix = mix * macro[:, None]
    mix = compress(mix, thr_db=-14, ratio=1.7, atk=0.02, rel=0.3, makeup_db=0.0)
    # end tail: guaranteed silence by 30.0 s
    end = curve([(0, 1), (1740, 1), (1800, 0.0)])
    end = np.sin(np.clip(end, 0, 1) * np.pi / 2) ** 1.5
    mix = mix * end[:, None]
    # loudness to target, then limit
    for _ in range(3):
        integ, st = lufs(mix)
        mix = mix * 10 ** ((TARGET_LUFS - integ) / 20)
        mix = limiter(mix, 0.80)
    mix[-FR:] *= np.linspace(1, 0, FR)[:, None]
    mix[-1] = 0
    integ, st = lufs(mix)
    print("music LUFS integrated %.2f  short-term max %.2f  true peak %.2f dB" % (integ, st, true_peak_db(mix)))
    write_wav(OUT, mix)
    print("wrote", OUT, mix.shape)
