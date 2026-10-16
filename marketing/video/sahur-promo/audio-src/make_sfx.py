"""Tracvey story film: sound effects. Every file is short, clean, peak-normalised to -1 dBFS and faded at both ends.
The cue volumes (cues.json) set the actual level in the mix."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *
from inst import noise, bell, marimba, piano, kick, snap, clap, crash_soft, saw_add, ping

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
_ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
OUTDIR = _ARGS[0] if _ARGS else os.path.join(ROOT, "public", "audio", "sfx")
os.makedirs(OUTDIR, exist_ok=True)
DUR = {}
IR_SM = make_ir(0.35, 0.004, seed=21, bright=0.6)
IR_MD = make_ir(0.9, 0.01, seed=22, bright=0.4)
IR_LG = make_ir(2.2, 0.02, seed=23, bright=0.3)
rng = np.random.default_rng(5)


def finish(name, x, peak=0.891, fin=0.002, fout=0.04):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        x = pan(x, 0)
    amp = np.max(np.abs(x), axis=1)
    idx = np.where(amp > 2e-4 * amp.max())[0]
    x = x[: idx[-1] + 1]
    x = hp(x, 20, 1)
    x = fade(x, fin, min(fout, 0.4 * len(x) / SR))
    x = x * (peak / np.max(np.abs(x)))
    write_wav(os.path.join(OUTDIR, name + ".wav"), x)
    DUR[name] = len(x) / SR


def wet(x, ir, amt, tail=None):
    x = np.asarray(x, dtype=float)
    m = x if x.ndim == 1 else x.mean(axis=1)
    n = len(m) + int((tail if tail is not None else (len(ir) / SR) * 0.7) * SR)
    mm = np.concatenate([m, np.zeros(n - len(m))])
    w = reverb(mm, ir, n)
    d = pan(mm, 0) if x.ndim == 1 else np.concatenate([x, np.zeros((n - len(x), 2))])
    return d + w * amt


def at(buf, x, t, g=1.0):
    s = max(0, int(round(t * SR)))
    x = np.asarray(x, dtype=float)
    e = min(s + len(x), len(buf))
    if e > s:
        buf[s:e] += x[: e - s] * g


def sweep_noise(dur, path, bw=0.35, amp_env=None, pan_path=None, lo=120, hi=9500, nb=14, seed=1):
    """Band-swept noise: `path(t01)` returns centre frequency (Hz) across time 0..1."""
    n = int(dur * SR)
    t01 = np.linspace(0, 1, n)
    fc = path(t01)
    freqs = np.geomspace(lo, hi, nb)
    out = np.zeros(n)
    for i, f in enumerate(freqs):
        band = bp(noise(n, seed * 100 + i), f / 1.25, min(f * 1.25, 20000), 2)
        a = np.exp(-((np.log(f) - np.log(fc)) / bw) ** 2)
        out += band * a
    if amp_env is not None:
        out *= amp_env(t01)
    if pan_path is None:
        return out
    return pan_stereo(out, pan_path(t01))


def pan_stereo(x, p):
    th = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], 1)


def bellenv(t01, peak=0.5, a=2.0, b=2.0):
    return np.where(t01 < peak, (t01 / peak) ** a, ((1 - t01) / (1 - peak)) ** b)


def click(tau=0.006, f=1800, noise_amt=1.0, seed=1, dur=0.08, body=0.0):
    n = int(dur * SR)
    t = tt(n)
    x = bp(noise(n, seed), f * 0.6, min(f * 2.4, 12000)) * np.exp(-t / tau) * noise_amt
    x += 0.6 * np.sin(2 * np.pi * f * t) * np.exp(-t / (tau * 2.2))
    if body:
        x += body * np.sin(2 * np.pi * f * 0.3 * t) * np.exp(-t / (tau * 5))
    return x * np.minimum(1, t / 0.0004)


def pop(f, dur=0.35, drop=0.6, tau=0.09, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    fr = f * (1 + drop * np.exp(-t / 0.014))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) * np.exp(-t / tau) + 0.25 * np.sin(2 * ph) * np.exp(-t / (tau * 0.4))
    x[: int(0.004 * SR)] += click(0.002, 3000, 0.3, 4, 0.004)[: int(0.004 * SR)] * 0.4
    return x * np.minimum(1, t / 0.0008) * vel


def breath(dur, kind="inhale", level=1.0, seed=3):
    n = int(dur * SR)
    if kind == "inhale":
        path = lambda t: 500 + 900 * t
        env = lambda t: bellenv(t, 0.7, 1.6, 1.2)
    elif kind == "gasp":
        path = lambda t: 900 + 1400 * t
        env = lambda t: bellenv(t, 0.55, 1.1, 1.8)
    else:
        path = lambda t: 1100 - 500 * t
        env = lambda t: bellenv(t, 0.22, 1.2, 1.5)
    x = sweep_noise(dur, path, bw=0.55, amp_env=env, lo=200, hi=4200, nb=10, seed=seed)
    x = lp(x, 3800)
    return x * level


def glass_ding(m):
    x = bell(m, 0.9, 1.5)
    x2 = bell(m + 12, 0.18, 0.9)
    y = np.zeros(len(x))
    y += x
    y[: len(x2)] += x2
    return wet(y, IR_SM, 0.35)


def whoosh_stereo(dur, f0, f1, p0=-0.5, p1=0.5, peak=0.5, bw=0.5, mid=None, seed=1, lo=150, hi=9000):
    if mid is None:
        path = lambda t: np.exp(np.log(f0) + (np.log(f1) - np.log(f0)) * t)
    else:
        path = lambda t: np.exp(np.interp(t, [0, 0.5, 1], [np.log(f0), np.log(mid), np.log(f1)]))
    return sweep_noise(dur, path, bw=bw, amp_env=lambda t: bellenv(t, peak, 1.7, 1.5), pan_path=lambda t: p0 + (p1 - p0) * t, lo=lo, hi=hi, seed=seed)


def tone_chirp(f0, f1, dur, tau=None, vib=0):
    n = int(dur * SR)
    t = tt(n)
    f = f0 + (f1 - f0) * (t / dur)
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph), t


def make_all():
    # ---------------------------------------------------------------- room tone / harbour (9 s)
    n = int(9.0 * SR)
    t = tt(n)
    b = noise(n, 1)
    brown = np.cumsum(b)
    brown = hp(brown - np.mean(brown), 25)
    brown = brown / (np.max(np.abs(brown)) + 1e-9)
    hvac = lp(brown, 220) * 0.9 + bp(noise(n, 2), 180, 700, 2) * 0.05
    harbour = lp(noise(n, 3), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t + 1)) * 0.05
    rt = hvac + harbour
    rt = rt * np.minimum(1, t / 0.6)
    sink = np.clip((t - 7.2) / 1.6, 0, 1)
    rt = rt * (1 - sink) + lp(rt, 140) * sink
    rt *= np.clip((9.0 - t) / 1.0, 0, 1)
    L_ = rt + 0.4 * np.roll(rt, 700)
    R_ = rt + 0.4 * np.roll(rt, -900)
    finish("room_tone", np.stack([L_, R_], 1), fin=0.5, fout=0.8)

    # harbour horn (D2 + A2), distant
    n = int(3.2 * SR)
    t = tt(n)
    env = np.minimum(1, t / 0.35) ** 2 * np.where(t > 1.7, np.exp(-(t - 1.7) / 0.35), 1.0)
    h = saw_add(73.4, n, 700, 1.2) + 0.6 * saw_add(110.0, n, 600, 1.4, 1.1) + 0.2 * saw_add(146.8, n, 600, 1.6, 0.4)
    h = lp(h * env, 650)
    h = h * (1 + 0.03 * np.sin(2 * np.pi * 3 * t))
    finish("harbour_horn", wet(h, IR_LG, 0.7), fin=0.05, fout=0.4)

    # ---------------------------------------------------------------- clock
    for name, f, body in [("clock_tick", 2000, 700), ("clock_tock", 1500, 520)]:
        n = int(0.14 * SR)
        t = tt(n)
        x = click(0.004, f, 0.8, 7, 0.14) + 0.7 * np.sin(2 * np.pi * body * t) * np.exp(-t / 0.018) * np.minimum(1, t / 0.0006)
        x = lp(x, 6000)
        finish(name, wet(x, IR_SM, 0.2), fout=0.03)
    # accelerating ticks 1/s -> 6/s over 1.5 s (f240-330)
    dur = 1.5
    buf = np.zeros(int(dur * SR) + 4000)
    tk = click(0.004, 2000, 0.8, 7, 0.14) + 0.7 * np.sin(2 * np.pi * 700 * tt(int(0.14 * SR))) * np.exp(-tt(int(0.14 * SR)) / 0.018)
    tk2 = click(0.004, 1500, 0.8, 8, 0.14) + 0.7 * np.sin(2 * np.pi * 520 * tt(int(0.14 * SR))) * np.exp(-tt(int(0.14 * SR)) / 0.018)
    phase, i, tcur = 0.0, 0, 0.0
    while tcur < dur - 0.05:
        at(buf, (tk if i % 2 == 0 else tk2), tcur, 0.5 + 0.5 * tcur / dur)
        rate = 1 + 5 * tcur / dur
        tcur += 1.0 / rate
        i += 1
    finish("clock_accel", wet(lp(buf, 6500), IR_SM, 0.2), fout=0.08)
    # frantic ticking to a whir (f330-500, 2.83 s)
    dur = 2.9
    buf = np.zeros(int(dur * SR) + 4000)
    tcur, i = 0.0, 0
    while tcur < dur - 0.1:
        r = 6 + 24 * (tcur / dur) ** 1.4
        at(buf, (tk if i % 2 == 0 else tk2), tcur, 0.55 + 0.5 * tcur / dur)
        tcur += 1.0 / r
        i += 1
    tn = tt(len(buf))
    whir = bp(noise(len(buf), 9), 1500, 5200) * (np.clip((tn - 1.2) / 1.7, 0, 1) ** 1.8) * 0.25
    whir *= 0.6 + 0.4 * np.sin(2 * np.pi * (20 + 30 * tn / dur) * tn)
    finish("clock_whir", wet(lp(buf + whir, 6500), IR_SM, 0.15), fout=0.1)

    # ---------------------------------------------------------------- calm intro bits
    # gull
    n = int(0.9 * SR)
    g = np.zeros(n)
    for t0, f0, f1 in [(0.0, 1500, 2300), (0.4, 1400, 2100)]:
        a, tc = tone_chirp(f0, f1, 0.16, vib=0.02)
        b, _ = tone_chirp(f1, f1 * 0.72, 0.28, vib=0.025)
        seg = np.concatenate([a, b])
        env = np.concatenate([np.minimum(1, np.arange(len(a)) / 700), np.exp(-np.arange(len(b)) / SR / 0.12)])
        seg = (seg + 0.35 * np.sin(2 * np.cumsum(2 * np.pi * np.concatenate([np.linspace(f0, f1, len(a)), np.linspace(f1, f1 * 0.72, len(b))]) / SR))) * env
        at(g, seg, t0, 1.0)
    finish("gull", wet(bp(g, 900, 5000), IR_MD, 0.4), fout=0.1)
    # mug set-down (ceramic tap)
    n = int(0.3 * SR)
    t = tt(n)
    m = 0.9 * np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * 3380 * t) * np.exp(-t / 0.035) + 0.5 * np.sin(2 * np.pi * 980 * t) * np.exp(-t / 0.08)
    m += click(0.004, 1400, 1.0, 12, 0.3)
    finish("mug_tap", wet(lp(m, 7000), IR_SM, 0.25))
    # mug lift / clink: gentler
    m = 0.7 * np.sin(2 * np.pi * 1300 * t) * np.exp(-t / 0.04) + 0.4 * np.sin(2 * np.pi * 2750 * t) * np.exp(-t / 0.03) + 0.5 * click(0.01, 900, 0.7, 14, 0.3)
    m = np.concatenate([lp(noise(int(0.06 * SR), 15), 1200) * np.linspace(0, 0.5, int(0.06 * SR)), m])
    finish("mug_lift", wet(lp(m, 6000), IR_SM, 0.2))
    # keyboard
    def keyclack(seed, f=1700):
        return click(0.005, f * rng.uniform(0.85, 1.15), 0.9, seed, 0.09, body=0.5)
    buf = np.zeros(int(0.45 * SR))
    at(buf, keyclack(31), 0.0, 0.8)
    at(buf, keyclack(32), 0.13, 0.7)
    finish("keyboard_ticks_gentle", wet(lp(buf, 6500), IR_SM, 0.15))
    # tired, slightly irritated clatter (f175-300 => 2.1 s)
    buf = np.zeros(int(2.2 * SR))
    tc = 0.0
    kr = np.random.default_rng(77)
    seed = 100
    while tc < 2.0:
        for _ in range(int(kr.integers(3, 7))):
            at(buf, click(0.005, 1500 * kr.uniform(0.8, 1.25), 0.9, seed, 0.09, body=0.5), tc, kr.uniform(0.5, 0.9))
            seed += 1
            tc += kr.uniform(0.07, 0.15)
        tc += kr.uniform(0.18, 0.4)
    finish("keyboard_clatter", wet(lp(buf, 6500), IR_SM, 0.15), fout=0.1)
    # light typing (f855-885, 15 keys, 1 per 2 frames)
    buf = np.zeros(int(0.58 * SR))
    for k in range(15):
        at(buf, click(0.004, 2000 * kr.uniform(0.9, 1.2), 0.8, 300 + k, 0.07, body=0.2), k * 2 / 60 + kr.uniform(-0.002, 0.002), kr.uniform(0.5, 0.9))
    finish("typing_light", wet(lp(buf, 7000), IR_SM, 0.12))

    # ---------------------------------------------------------------- email dings (C5 D5 E5)
    for nm, m in [("email_ding_c5", 72), ("email_ding_d5", 74), ("email_ding_e5", 76)]:
        finish(nm, glass_ding(m), fout=0.2)
    # lamp click (two tiny switch clicks)
    buf = np.zeros(int(0.2 * SR))
    at(buf, click(0.003, 2600, 1.0, 40, 0.05, body=1.0), 0.0, 1.0)
    at(buf, click(0.004, 1800, 0.8, 41, 0.05, body=1.0), 0.05, 0.6)
    finish("lamp_click", wet(buf, IR_SM, 0.1))
    # sigh (tired exhale)
    finish("sigh", wet(breath(1.1, "exhale", 1.0, seed=51), IR_SM, 0.15), fin=0.04, fout=0.15)

    # ---------------------------------------------------------------- stress
    # impact hit
    n = int(1.3 * SR)
    t = tt(n)
    ph = 2 * np.pi * np.cumsum(30 + 90 * np.exp(-t / 0.08)) / SR
    x = np.sin(ph) * np.exp(-t / 0.35) * 1.2
    x += lp(noise(n, 61), 2500) * np.exp(-t / 0.08) * 0.8
    x += bp(noise(n, 62), 200, 900) * np.exp(-t / 0.2) * 0.5
    finish("impact_hit", wet(x, IR_MD, 0.35), fin=0.001, fout=0.3)
    # phone ring: double trill
    n = int(0.75 * SR)
    t = tt(n)
    trill = np.zeros(n)
    for t0 in (0.0, 0.36):
        m = int(0.27 * SR)
        tm = tt(m)
        g_ = (np.sin(2 * np.pi * 22 * tm) > -0.2).astype(float)
        g_ = lp(g_, 400)
        tone = np.sin(2 * np.pi * 1180 * tm) + 0.5 * np.sin(2 * np.pi * 1490 * tm) + 0.25 * np.sin(2 * np.pi * 2360 * tm)
        seg = tone * g_ * np.sin(np.pi * np.minimum(1, tm / 0.27)) ** 0.3
        at(trill, seg, t0)
    rat = bp(noise(n, 63), 2500, 5000) * (np.abs(np.sin(2 * np.pi * 22 * t)) > 0.4) * 0.05
    finish("phone_ring", wet(lp(trill + rat, 4500), IR_SM, 0.2), fout=0.06)
    # phone buzz (vibration motor)
    n = int(0.2 * SR)
    t = tt(n)
    z = (np.sin(2 * np.pi * 168 * t) + 0.5 * np.sin(2 * np.pi * 336 * t) + 0.25 * np.sin(2 * np.pi * 504 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 36 * t))
    z += 0.25 * bp(noise(n, 64), 300, 2500)
    z *= np.minimum(1, t / 0.012) * np.where(t > 0.15, np.exp(-(t - 0.15) / 0.015), 1.0)
    finish("phone_buzz", wet(lp(z, 3500), IR_SM, 0.1), fin=0.01, fout=0.03)
    # email whoosh-thump (4 variants, randomised pitch)
    for v, (tf, wf) in enumerate([(150, 2200), (118, 1700), (176, 2600), (132, 1900)]):
        n = int(0.3 * SR)
        t = tt(n)
        w_ = whoosh_stereo(0.3, wf, wf * 0.45, -0.3 + 0.2 * v - 0.2, 0.3, peak=0.55, bw=0.6, seed=70 + v)
        th = np.sin(2 * np.pi * np.cumsum(tf * (1 + 0.8 * np.exp(-(t - 0.19).clip(0) / 0.03))) / SR) * np.exp(-(t - 0.17).clip(0) / 0.07) * (t > 0.17) * 0.9
        y = w_ * 0.8 + pan(th, 0)
        finish("whoosh_thump_%d" % (v + 1), lp(y, 7000), fout=0.05)
    # paper rustle bed (1.9 s), paper topple (1.0 s)
    n = int(1.9 * SR)
    t = tt(n)
    r_ = noise(n, 80)
    crackle = (np.random.default_rng(81).random(n) > 0.9985) * np.random.default_rng(82).standard_normal(n) * 3
    bedr = hp(bp(r_, 1200, 7000), 800) * (0.3 + 0.7 * np.abs(np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 1.7 * t + 1))) * 0.35
    bedr += lp(hp(crackle, 1500), 7500) * 0.4
    finish("paper_rustle_bed", pan_stereo(bedr, 0.4 * np.sin(2 * np.pi * 0.7 * t)), fin=0.15, fout=0.3)
    n = int(1.0 * SR)
    t = tt(n)
    slide = bp(noise(n, 83), 400, 4500) * np.exp(-t / 0.25) * 0.8 * (1 - np.exp(-t / 0.02))
    flut = hp(noise(n, 84), 1500) * (np.random.default_rng(85).random(n) > 0.997) * 6
    flut = lp(flut, 8000) * np.exp(-t / 0.3)
    thump = np.sin(2 * np.pi * 85 * t) * np.exp(-(t - 0.5).clip(0) / 0.06) * (t > 0.5) * 0.6 + lp(noise(n, 86), 900) * (t > 0.5) * np.exp(-(t - 0.5).clip(0) / 0.05) * 0.5
    finish("paper_topple", wet(slide + flut + thump, IR_SM, 0.2), fout=0.2)
    # gasp, text sting, heartbeat
    finish("gasp", wet(breath(0.32, "gasp", 1.0, seed=91), IR_SM, 0.1), fin=0.01, fout=0.08)
    n = int(0.9 * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(46 + 40 * np.exp(-t / 0.07)) / SR) * np.exp(-t / 0.28)
    x += 0.3 * lp(noise(n, 92), 400) * np.exp(-t / 0.03)
    finish("text_sting", wet(x, IR_SM, 0.3), fin=0.003, fout=0.2)
    n = int(0.6 * SR)
    t = tt(n)
    hb = np.zeros(n)
    for t0, g_ in [(0.0, 1.0), (0.2, 0.7)]:
        m = int(0.25 * SR)
        tm = tt(m)
        th = np.sin(2 * np.pi * np.cumsum(48 + 26 * np.exp(-tm / 0.04)) / SR) * np.exp(-tm / 0.07)
        th += 0.25 * lp(noise(m, 93), 300) * np.exp(-tm / 0.02)
        at(hb, th, t0, g_)
    finish("heartbeat", lp(hb, 300), fin=0.004, fout=0.1)
    # riser: 1.0 s noise + tone sweep (comes to a clean cut)
    dur = 1.0
    n = int(dur * SR)
    t01 = np.linspace(0, 1, n)
    rs = sweep_noise(dur, lambda x: 300 * (1 + 18 * x ** 1.5), bw=0.9, amp_env=lambda x: 0.05 + 0.95 * x ** 2.2, lo=200, hi=9000, seed=95)
    tn, _ = tone_chirp(180, 1500, dur)
    tn2, _ = tone_chirp(190, 1590, dur)
    ton = (tn + 0.8 * tn2) * (0.02 + 0.5 * t01 ** 2.5) * (1 + 0.5 * np.sin(2 * np.pi * (4 + 16 * t01) * t01))
    ris = lp(rs * 1.0 + ton * 0.5, 9000)
    finish("riser", pan_stereo(ris, 0.3 * np.sin(2 * np.pi * 1.2 * t01)), fin=0.05, fout=0.01)

    # ---------------------------------------------------------------- the turn
    finish("inhale", wet(breath(1.0, "inhale", 1.0, seed=101), IR_SM, 0.2), fin=0.08, fout=0.25)
    finish("exhale", wet(breath(1.4, "exhale", 1.0, seed=102), IR_SM, 0.2), fin=0.03, fout=0.3)
    # bell shimmer: airy swell
    n = int(2.4 * SR)
    t = tt(n)
    sh = np.zeros((n, 2))
    for i, (f, a) in enumerate([(1174.7, 1.0), (1480.0, 0.6), (1760.0, 0.8), (2349.3, 0.4), (2960.0, 0.25), (3520.0, 0.18)]):
        env = np.minimum(1, t / (0.5 + 0.05 * i)) ** 2 * np.exp(-np.maximum(t - 0.55, 0) / (0.75 - 0.05 * i))
        x = np.sin(2 * np.pi * f * t + i) * env * a * (1 + 0.1 * np.sin(2 * np.pi * (4 + i) * t))
        sh += pan(x, -0.7 + 0.28 * i)
    finish("bell_shimmer", wet(lp(sh, 7500), IR_LG, 0.6), fin=0.2, fout=0.5)
    # soft power-on: rising sine
    dur = 0.55
    n = int(dur * SR)
    t = tt(n)
    f = np.geomspace(147, 587, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.sin(np.pi * np.minimum(1, t / dur)) ** 1.3
    x += 0.2 * np.sin(2 * np.pi * 1174.7 * t) * np.exp(-(t - 0.3).clip(0) / 0.1) * (t > 0.3) * np.minimum(1, (t - 0.3).clip(0) / 0.02)
    finish("power_on", wet(lp(x, 4500), IR_SM, 0.3), fin=0.04, fout=0.2)
    # reverse cymbal swell (22 frames = 0.367 s, lands on the bar)
    dur = 0.37
    n = int(dur * SR)
    t01 = np.linspace(0, 1, n)
    rc = bp(noise(n, 111), 1800, 9500) * (t01 ** 2.6)
    for fr_, a in [(3100, 0.07), (4300, 0.06), (5800, 0.05), (7300, 0.04)]:
        rc += a * np.sin(2 * np.pi * fr_ * t01 * dur + fr_) * t01 ** 2.6
    rc = lp(rc, 9500)
    rc *= np.where(t01 > 0.93, (1 - t01) / 0.07, 1)
    finish("reverse_cymbal", pan_stereo(rc, 0.2 * np.sin(2 * np.pi * t01)), fin=0.05, fout=0.01)

    # ---------------------------------------------------------------- whooshes
    finish("whoosh_air", whoosh_stereo(0.7, 500, 2600, -0.6, 0.6, 0.45, 0.55, mid=2800, seed=121), fin=0.05, fout=0.2)
    finish("pullback_whoosh", whoosh_stereo(0.6, 2400, 500, 0.4, -0.3, 0.4, 0.55, seed=122), fin=0.04, fout=0.2)
    finish("ui_swoosh", whoosh_stereo(0.26, 900, 3500, -0.35, 0.35, 0.5, 0.5, seed=123), fin=0.02, fout=0.1)
    finish("whip_whoosh", whoosh_stereo(0.62, 700, 450, -0.8, 0.8, 0.45, 0.45, mid=4200, seed=124), fin=0.03, fout=0.15)
    finish("zoom_whoosh", whoosh_stereo(0.55, 4200, 280, -0.2, 0.2, 0.3, 0.6, seed=125), fin=0.02, fout=0.2)
    finish("card_slide_whoosh", whoosh_stereo(0.36, 800, 2800, -0.8, 0.8, 0.5, 0.5, seed=126), fin=0.02, fout=0.12)
    finish("window_open_whoosh", wet(whoosh_stereo(0.85, 500, 3800, -0.5, 0.5, 0.55, 0.6, seed=127), IR_MD, 0.25), fin=0.04, fout=0.3)
    finish("whoosh_up", whoosh_stereo(0.7, 300, 5200, -0.3, 0.3, 0.6, 0.55, seed=128), fin=0.03, fout=0.2)
    # swoop down: tonal fall + noise
    dur = 0.5
    n = int(dur * SR)
    t = tt(n)
    t01 = np.linspace(0, 1, n)
    f = np.geomspace(1500, 260, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sw = (np.sin(ph) + 0.2 * np.sin(2 * ph)) * bellenv(t01, 0.15, 1, 1.6) * 0.8
    sw = pan_stereo(sw, 0.4 * (1 - 2 * t01)) + whoosh_stereo(dur, 3000, 400, 0.4, -0.3, 0.2, 0.5, seed=129) * 0.6
    finish("swoop_down", lp(sw, 6500), fin=0.01, fout=0.15)

    # ---------------------------------------------------------------- UI: paper folds on the D major pentatonic
    for i, m in enumerate([62, 64, 66, 69, 71, 74]):
        f = float(mtof(m))
        n = int(0.24 * SR)
        t = tt(n)
        nz = bp(noise(n, 130 + i), 2200, 6500) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.004))
        nz += 0.5 * bp(noise(n, 140 + i), 900, 2500) * np.exp(-((t - 0.07) / 0.03) ** 2)
        tn_ = np.sin(2 * np.pi * np.cumsum(f * (0.94 + 0.06 * np.minimum(1, t / 0.04))) / SR) * np.exp(-t / 0.07) * np.minimum(1, t / 0.006)
        finish("fwip_%d" % (i + 1), wet(lp(nz * 0.7 + tn_ * 0.6, 7000), IR_SM, 0.2), fout=0.06)
    # soft "pff"
    n = int(0.25 * SR)
    t = tt(n)
    pf = lp(noise(n, 150), 1800) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.015))
    finish("pff", pan(pf, 0), fin=0.005, fout=0.08)
    # mouse click
    finish("click", wet(click(0.003, 2300, 0.9, 151, 0.07, body=0.8), IR_SM, 0.1), fout=0.02)
    # confirm chime + check pop
    n = int(1.4 * SR)
    y = np.zeros(n)
    at(y, pop(1318.5, 0.2, 0.7, 0.05), 0.0, 0.7)
    at(y, bell(81, 0.9, 1.2), 0.012, 1.0)
    at(y, bell(86, 0.8, 1.2), 0.07, 0.8)
    finish("confirm_chime", wet(y, IR_MD, 0.35), fout=0.2)
    # ask tone: rising sine A4 -> D5
    dur = 0.4
    n = int(dur * SR)
    t = tt(n)
    f = np.geomspace(440, 587.3, n) * (1 + 0.0 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    at_ = np.sin(ph) * np.where(t < 0.25, np.minimum(1, t / 0.03), np.exp(-(t - 0.25) / 0.06))
    at_ += 0.15 * np.sin(2 * ph)
    finish("ask_tone", wet(lp(at_, 3500), IR_SM, 0.3), fin=0.02, fout=0.1)
    # card pops (F#4 A4 B4) and section pops (D5 F#5 A5)
    for nm, m in [("card_pop_fs4", 66), ("card_pop_a4", 69), ("card_pop_b4", 71), ("section_pop_d5", 74), ("section_pop_fs5", 78), ("section_pop_a5", 81)]:
        f = float(mtof(m))
        x = pop(f, 0.32, 0.5, 0.08) + 0.3 * marimba(m + 12, 0.8)[: int(0.32 * SR)]
        finish(nm, wet(x, IR_SM, 0.25), fout=0.1)
    # tiny chime (answered) E6
    finish("tiny_chime", wet(bell(88, 0.8, 0.9), IR_MD, 0.3), fout=0.2)
    # job-arrived chime (mallet D5 then A5)
    y = np.zeros(int(1.3 * SR))
    at(y, marimba(74, 1.0)[:int(1.1 * SR)], 0.0, 1.0)
    at(y, marimba(81, 0.9)[:int(1.0 * SR)], 0.09, 0.9)
    at(y, bell(86, 0.2, 1.0), 0.09, 0.6)
    finish("job_chime", wet(y, IR_MD, 0.3), fout=0.2)
    # tick pop (signal tick)
    finish("tick_pop", wet(pop(1568, 0.22, 0.4, 0.05) * 0.8, IR_SM, 0.2), fout=0.08)
    # finger snap and a soft clap
    finish("finger_snap", wet(snap(1.0, 9), IR_SM, 0.3), fout=0.08)
    finish("clap_soft", wet(clap(1.0, 5), IR_SM, 0.35), fout=0.1)
    # keycap clacks
    finish("keycap_clack_low", wet(click(0.006, 1100, 0.9, 170, 0.12, body=1.2), IR_SM, 0.1), fout=0.04)
    finish("keycap_clack_high", wet(click(0.005, 1800, 0.9, 171, 0.12, body=1.0), IR_SM, 0.1), fout=0.04)
    # palette pop, lift pop
    finish("palette_pop", wet(pop(520, 0.3, 0.8, 0.07) * 0.9 + 0.2 * pan(lp(noise(int(0.3 * SR), 172), 4000) * np.exp(-tt(int(0.3 * SR)) / 0.03), 0)[:, 0], IR_SM, 0.25), fout=0.1)
    n = int(0.3 * SR)
    t = tt(n)
    f = np.geomspace(500, 1100, n)
    lift = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08) * np.minimum(1, t / 0.006)
    finish("lift_pop", wet(lift + 0.2 * pop(1100, 0.3, 0.2, 0.05)[:n], IR_SM, 0.25), fout=0.1)
    # line-draw tick (gentle)
    n = int(0.09 * SR)
    t = tt(n)
    ltk = np.sin(2 * np.pi * 2349 * t) * np.exp(-t / 0.012) * np.minimum(1, t / 0.0006) + 0.3 * click(0.002, 3500, 0.5, 173, 0.09)
    finish("line_tick", wet(lp(ltk, 6500), IR_SM, 0.15), fout=0.03)
    # paper swish
    n = int(0.65 * SR)
    t = tt(n)
    sw_ = np.zeros(n)
    for k, t0 in enumerate([0.0, 0.15, 0.31]):
        seg = whoosh_stereo(0.28, 1200, 3400, -0.5 + 0.5 * k, 0.1 + 0.4 * k, 0.4, 0.55, seed=180 + k)
        s0 = int(t0 * SR)
        sw_ = sw_ if sw_.ndim == 2 else np.zeros((n, 2))
        sw_[s0 : s0 + len(seg)] += seg[: n - s0] * 0.8
    finish("paper_swish", sw_, fin=0.02, fout=0.15)
    # coin clinks (3 variants) and the merge ching
    for v, (a, b, c) in enumerate([(2400, 3600, 5200), (2650, 3950, 5600), (2200, 3300, 4800)]):
        n = int(0.5 * SR)
        t = tt(n)
        x = sum(am * np.sin(2 * np.pi * fr_ * t + k) * np.exp(-t / tau) for k, (fr_, am, tau) in enumerate([(a, 1.0, 0.2), (b, 0.6, 0.14), (c, 0.3, 0.08)]))
        x *= np.minimum(1, t / 0.0006)
        finish("coin_clink_%d" % (v + 1), wet(lp(x, 8500), IR_SM, 0.25), fout=0.12)
    y = np.zeros(int(1.4 * SR))
    at(y, pop(660, 0.18, 0.5, 0.05), 0.0, 0.7)
    at(y, bell(93, 0.9, 1.3), 0.0, 1.0)
    at(y, bell(98, 0.7, 1.2), 0.06, 0.8)
    finish("coin_merge", wet(y, IR_MD, 0.35), fout=0.25)
    # spark chime (A5 D6 F#6)
    y = np.zeros(int(1.2 * SR))
    for i, m in enumerate([81, 86, 90]):
        at(y, bell(m, 0.8, 1.0), 0.05 * i, 0.9)
    finish("spark_chime", wet(y, IR_MD, 0.35), fout=0.25)

    # ---------------------------------------------------------------- port ambience (4.5 s) and winch
    dur = 4.5
    n = int(dur * SR)
    t = tt(n)
    water = lp(noise(n, 200), 900) * (0.45 + 0.55 * np.sin(2 * np.pi * 0.42 * t) ** 2) * 0.35
    water += bp(noise(n, 201), 1500, 4500) * (np.sin(2 * np.pi * 0.42 * t + 0.6) ** 6) * 0.05
    wind = lp(noise(n, 202), 400) * 0.25
    amb = np.stack([water + wind, 0.9 * np.roll(water, 500) + wind], 1)
    for t0, f, pn_ in [(1.3, 610, -0.6), (2.9, 540, 0.5)]:
        m = int(0.5 * SR)
        tm = tt(m)
        cl = sum(a * np.sin(2 * np.pi * f * r * tm + r) * np.exp(-tm / tau) for r, a, tau in [(1, 1.0, 0.18), (2.32, 0.6, 0.12), (4.1, 0.3, 0.07)]) * np.minimum(1, tm / 0.001)
        cl = wet(lp(cl, 4500), IR_LG, 0.8, tail=1.0)
        at(amb, pan_stereo(cl[:, 0] + cl[:, 1], pn_ * np.ones(len(cl))) * 0.18, t0)
    gl, _ = tone_chirp(1500, 2200, 0.3, vib=0.02)
    gl2, _ = tone_chirp(2200, 1500, 0.35, vib=0.02)
    gull = np.concatenate([gl, gl2]) * np.concatenate([np.minimum(1, np.arange(len(gl)) / 800), np.exp(-np.arange(len(gl2)) / SR / 0.15)])
    at(amb, wet(bp(gull, 900, 4500), IR_LG, 0.6, tail=0.8) * 0.12, 0.7)
    at(amb, wet(bp(gull * 0.8, 900, 4500), IR_LG, 0.6, tail=0.8) * 0.09, 3.4)
    amb *= np.minimum(1, t / 0.4)[:, None] * np.clip((dur - t) / 0.8, 0, 1)[:, None]
    finish("port_ambience", amb, fin=0.4, fout=0.8)
    # crane winch hum (2.2 s)
    dur = 2.2
    n = int(dur * SR)
    t = tt(n)
    wv = (saw_add(62, n, 600, 1.0) + 0.4 * saw_add(124, n, 700, 1.3, 1)) * (1 + 0.1 * np.sin(2 * np.pi * 7.5 * t))
    wv = lp(wv, 380) + 0.12 * bp(noise(n, 210), 300, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 4 * t))
    wv *= np.minimum(1, t / 0.5) * np.clip((dur - t) / 0.6, 0, 1)
    finish("crane_winch", pan(wv, 0), fin=0.3, fout=0.5)
    # birdsong (3.2 s)
    dur = 3.2
    n = int(dur * SR)
    br = np.zeros((n, 2))
    brng = np.random.default_rng(220)
    for g_ in range(5):
        t0 = 0.15 + g_ * 0.62 + brng.uniform(0, 0.2)
        base = brng.uniform(3200, 5200)
        for k in range(int(brng.integers(3, 6))):
            d_ = brng.uniform(0.05, 0.1)
            a_, _ = tone_chirp(base * brng.uniform(0.85, 1.1), base * brng.uniform(1.15, 1.5), d_, vib=0.01)
            env = np.sin(np.pi * np.linspace(0, 1, len(a_))) ** 1.5
            at(br, pan(a_ * env, brng.uniform(-0.7, 0.7)), t0 + k * (d_ + 0.03), 0.5)
    br = wet(hp(lp(br, 7500), 2200), IR_MD, 0.35, tail=0.5)
    finish("birdsong", br, fin=0.25, fout=0.6)

    # ---------------------------------------------------------------- morning
    y = np.zeros(int(1.6 * SR))
    at(y, bell(74, 0.8, 1.4), 0.0, 1.0)
    at(y, bell(81, 0.7, 1.4), 0.004, 0.9)
    at(y, bell(86, 0.18, 1.0), 0.0, 0.5)
    finish("new_mail_chime", wet(y, IR_MD, 0.35), fout=0.3)
    # flask clink (bright metallic)
    n = int(0.6 * SR)
    t = tt(n)
    fl = sum(a * np.sin(2 * np.pi * f * t + k) * np.exp(-t / tau) for k, (f, a, tau) in enumerate([(2620, 1.0, 0.16), (3910, 0.7, 0.1), (5370, 0.4, 0.07), (1480, 0.5, 0.2)]))
    fl *= np.minimum(1, t / 0.0006)
    finish("flask_clink", wet(lp(fl, 8500), IR_SM, 0.3), fout=0.2)
    # crash (soft)
    cr = crash_soft(2.0)
    finish("soft_crash", wet(cr, IR_MD, 0.3), fin=0.002, fout=0.4)
    # swipe-grab tick
    y = np.zeros(int(0.25 * SR))
    at(y, whoosh_stereo(0.12, 1200, 3000, -0.3, 0.3, 0.6, 0.5, seed=240)[:, 0], 0.0, 0.5)
    at(y, click(0.004, 2400, 0.9, 241, 0.06, body=0.6), 0.1, 1.0)
    finish("swipe_tick", wet(y, IR_SM, 0.1), fout=0.06)
    # box thunk
    n = int(0.5 * SR)
    t = tt(n)
    bx = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.1)
    bx += lp(noise(n, 250), 1000) * np.exp(-t / 0.03) * 0.8 + bp(noise(n, 251), 200, 700) * np.exp(-t / 0.06) * 0.4
    finish("box_thunk", wet(bx, IR_SM, 0.2), fin=0.002, fout=0.15)
    # confetti popper: snap + shimmer
    n = int(1.2 * SR)
    t = tt(n)
    snp = bp(noise(n, 260), 900, 4500) * np.exp(-t / 0.03) * 1.2 + 0.5 * lp(noise(n, 261), 1200) * np.exp(-t / 0.025)
    snp *= np.minimum(1, t / 0.0007)
    tinkle = np.zeros(n)
    kr2 = np.random.default_rng(262)
    for k in range(26):
        t0 = 0.03 + kr2.uniform(0, 0.8) ** 1.3
        f = kr2.uniform(3500, 7500)
        m = int(0.12 * SR)
        tm = tt(m)
        at(tinkle, np.sin(2 * np.pi * f * tm) * np.exp(-tm / 0.02) * np.minimum(1, tm / 0.001), t0, kr2.uniform(0.04, 0.12) * (1 - t0))
    at(snp, bell(93, 0.2, 1.0), 0.04, 0.4)
    finish("confetti_pop", wet(lp(snp + tinkle * 0.8, 9000), IR_MD, 0.3), fin=0.001, fout=0.3)
    # soft thud (landing)
    n = int(0.6 * SR)
    t = tt(n)
    th = np.sin(2 * np.pi * np.cumsum(55 + 35 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.15) + 0.2 * lp(noise(n, 270), 500) * np.exp(-t / 0.02)
    finish("soft_thud", wet(th, IR_SM, 0.15), fin=0.004, fout=0.2)
    # chime up: E6 then A6
    y = np.zeros(int(1.4 * SR))
    at(y, bell(88, 0.8, 1.3), 0.0, 0.9)
    at(y, bell(93, 0.9, 1.3), 0.07, 1.0)
    at(y, bell(98, 0.3, 1.0), 0.14, 0.6)
    finish("chime_up", wet(y, IR_MD, 0.35), fout=0.3)
    # wood-block ticks, rising scale (D5 E5 F#5 A5 B5 D6 E6 F#6)
    for i, m in enumerate([74, 76, 78, 81, 83, 86, 88, 90]):
        f = float(mtof(m))
        n = int(0.2 * SR)
        t = tt(n)
        wb = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.045) + 0.4 * np.sin(2 * np.pi * f * 2.4 * t) * np.exp(-t / 0.02)
        wb += 0.3 * click(0.002, 3000, 0.6, 280 + i, 0.2)
        wb *= np.minimum(1, t / 0.0005)
        finish("woodblock_%d" % (i + 1), wet(lp(wb, 7000), IR_SM, 0.2), fout=0.06)
    # logo / url ticks, chime on "people"
    finish("logo_tick", wet(click(0.003, 2600, 0.8, 290, 0.06, body=0.5), IR_SM, 0.12), fout=0.025)
    finish("url_tick", wet(click(0.003, 2000, 0.8, 291, 0.06, body=0.5), IR_SM, 0.1), fout=0.025)
    y = np.zeros(int(1.9 * SR))
    at(y, bell(86, 0.8, 1.25), 0.0, 1.0)
    at(y, bell(81, 0.5, 1.15), 0.04, 0.5)
    finish("chime_people", wet(y, IR_MD, 0.3), fout=0.45)


def make_navcert():
    """NavCert story film additions (the sonar-ping motif, the breath, marker, binder). Run alone with --navcert."""
    ET = [10 / 60, 22 / 60, 36 / 60]  # echo times that match the SonarRing echoes (10, 22, 36 frames)
    # ---- the unanswered ping: B5, no echo, a faint thin ring that fades into nothing
    finish("sonar_ping_dry", ping(83, 1.0, dur=0.9, ring=0.115, attack=0.0035, air=0.9, seed=701), fin=0.0015, fout=0.22)
    # ---- the answered ping: G5 with three ping-pong echoes (-6 dB each, widening) and a hall tail, about 3.2 s
    y = ping(79, 1.0, dur=1.5, ring=0.13, attack=0.005, echo_times=ET, echo_gain=0.5, echo_lp=5200, spread=0.4, air=0.6, seed=702)
    y = wet(y, IR_LG, 0.3, tail=1.4)
    finish("sonar_ping_g5_echo", y[: int(3.2 * SR)], fin=0.0015, fout=0.7)
    # ---- the biggest answer ("Viewed", the logo): G6, softer attack, longer shimmer, about 3.8 s
    y = ping(91, 1.0, dur=1.9, ring=0.2, attack=0.014, echo_times=ET, echo_gain=0.62, echo_lp=6500, spread=0.55, shimmer=0.55, air=0.3, seed=703)
    low = ping(79, 0.55, dur=1.6, ring=0.5, attack=0.02, air=0.0, seed=704)  # a warm G5 body under it
    y[: len(low)] += low
    y = wet(y, IR_LG, 0.45, tail=2.0)
    finish("sonar_ping_g6_echo", y[: int(3.8 * SR)], fin=0.0015, fout=0.9)
    # ---- the breath (quiet, human): turbulence on the swept noise plus a faint chest body
    def breath_nc(dur, kind, seed, body=0.05):
        x = breath(dur, kind, 1.0, seed=seed)
        n = len(x)
        turb = 1 + 0.18 * lp(noise(n, seed + 7), 14) * 9
        x = x * np.clip(turb, 0.6, 1.4)
        t01 = np.linspace(0, 1, n)
        env = bellenv(t01, 0.7 if kind == "inhale" else 0.22, 1.6 if kind == "inhale" else 1.2, 1.2 if kind == "inhale" else 1.5)
        x += lp(noise(n, seed + 9), 260) * env * body * 6
        return x
    y = wet(breath_nc(0.88, "inhale", 811), IR_SM, 0.2, tail=0.08)
    finish("breath_in_quick", y[: int(0.95 * SR)], fin=0.06, fout=0.2)
    y = wet(breath_nc(1.22, "exhale", 812), IR_SM, 0.2, tail=0.14)
    finish("breath_out_release", y[: int(1.35 * SR)], fin=0.03, fout=0.4)
    # ---- felt-tip marker scribble on paper: friction noise whose colour follows the pen speed, three loops
    n = int(0.5 * SR)
    t01 = np.linspace(0, 1, n)
    press = np.minimum(1, t01 / 0.05) * np.minimum(1, (1 - t01) / 0.14) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t01 + 1.2) ** 2)
    fr = sweep_noise(0.5, lambda u: 3300 + 1500 * np.sin(2 * np.pi * 3 * u + 0.4), bw=0.5, amp_env=lambda u: np.interp(u, t01, press), lo=700, hi=9000, nb=12, seed=721)
    body = lp(noise(n, 722), 1200) * press * 0.35
    tt_ = tt(n)
    squeak = np.sin(2 * np.pi * np.cumsum(3350 + 140 * np.sin(2 * np.pi * 11 * tt_)) / SR) * np.exp(-tt_ / 0.05) * 0.05
    tap = click(0.002, 1500, 0.7, 723, 0.03, body=0.8)
    mk = fr + body + squeak
    mk[: len(tap)] += tap * 0.5
    finish("marker_circle", wet(lp(mk, 8500), IR_SM, 0.1, tail=0.05), fin=0.004, fout=0.1)
    # ---- the short underline scribble: two quick back-and-forth strokes (0.22 s)
    n = int(0.22 * SR)
    t01 = np.linspace(0, 1, n)
    press = np.minimum(1, t01 / 0.06) * np.minimum(1, (1 - t01) / 0.2) * (0.75 + 0.25 * np.cos(2 * np.pi * 2 * t01))
    fr = sweep_noise(0.22, lambda u: 3600 + 1200 * np.sin(2 * np.pi * 2 * u), bw=0.5, amp_env=lambda u: np.interp(u, t01, press), lo=700, hi=9000, nb=12, seed=731)
    mk = fr + lp(noise(n, 732), 1200) * press * 0.3
    finish("marker_scribble", wet(lp(mk, 8500), IR_SM, 0.08, tail=0.03), fin=0.004, fout=0.06)
    # ---- ring-binder clasp: a metal tink, the clack of the cover, a small paper flutter (0.35 s)
    n = int(0.35 * SR)
    buf = np.zeros(n)
    t = tt(n)
    at(buf, click(0.0015, 3400, 1.0, 741, 0.03), 0.0, 0.9)
    tk = int(0.06 * SR)
    tk_t = tt(tk)
    at(buf, (np.sin(2 * np.pi * 2750 * tk_t) * np.exp(-tk_t / 0.007) + 0.6 * np.sin(2 * np.pi * 4380 * tk_t) * np.exp(-tk_t / 0.004)) * 0.45, 0.0, 1.0)
    at(buf, click(0.004, 1500, 0.9, 742, 0.1, body=1.2), 0.045, 0.8)
    fl = np.zeros(n)
    kr = np.random.default_rng(743)
    for k in range(7):
        t0 = 0.09 + k * 0.032 + kr.uniform(-0.006, 0.006)
        m = int(0.035 * SR)
        at(fl, bp(noise(m, 744 + k), 2400, 8200) * np.sin(np.pi * np.linspace(0, 1, m)) ** 1.4, t0, (0.5 - 0.06 * k) * kr.uniform(0.7, 1.0))
    fl *= 0.6
    finish("binder_snap", wet(lp(buf + fl, 9500), IR_SM, 0.12, tail=0.02), fin=0.0008, fout=0.12)


# =====================================================================================================
# Sahur Protocol promo "WAKE UP" (75 s, 60 fps) additions. Run alone with --sahur.
# The TUNG family is ONE wooden voice: a hollow kentongan / slit-drum knock on A3 (220 Hz), the motif's repeated
# note (TUNG TUNG TUNG sa-hur = A A A F# D). Its long-ringing partials are harmonic (A2 cavity, A3, A4, A5 and the
# 1.1 kHz C#6 body ring), so the pitch still reads as A through a phone speaker (fundamental gone) and from a
# street far away (top gone). Then the film's world: the feed, sirens, breath, heartbeats, the bedroom, the
# forest, the fire, the fights, the Bubble and the morning. Each sx_* returns a mono or stereo float array.
# =====================================================================================================
TUNG_F0 = 220.0
IR_BEDROOM = make_ir(0.6, 0.006, seed=31, bright=0.45)
IR_PLATE = make_ir(1.1, 0.004, seed=32, bright=0.7)
IR_CATHEDRAL = make_ir(4.8, 0.045, seed=33, bright=0.15)
IR_CANYON = make_ir(3.2, 0.0, seed=34, bright=0.12)
IR_FOREST = make_ir(0.7, 0.02, seed=35, bright=0.25)
IR_CITY = make_ir(2.0, 0.03, seed=36, bright=0.2)


def tung_core(f0=TUNG_F0, dur=1.6, strike=1.0, body_tau=0.30, ring=0.16, ring_tau=0.17, hollow=0.35, click_amt=1.0,
              bright=1.0, drop=0.0, seed=1):
    """The TUNG voice (mono). A3 body with a short downward pitch blip at the strike ('t-UNG'), the hollow A4
    octave, a short inharmonic wood mode, A5, the C#6 (5th partial, 1.1 kHz) body ring, an A2 cavity boom, and a
    5 ms wood-crack click plus a filtered-noise 'thock'. drop > 0 sags the pitch over ~0.6 s (the final TUNGs)."""
    n = int(dur * SR)
    t = tt(n)
    bend = (1 + 0.05 * strike * np.exp(-t / 0.012)) * (1 - drop * (1 - np.exp(-t / 0.6)))
    ph = 2 * np.pi * np.cumsum(f0 * bend) / SR
    x = np.sin(ph) * np.exp(-t / body_tau)
    x += 0.42 * np.sin(2 * ph + 0.3) * np.exp(-t / (body_tau * 0.55))
    x += 0.22 * bright * np.sin(2.76 * ph + 1.1) * np.exp(-t / (body_tau * 0.2))
    x += 0.20 * bright * np.sin(4 * ph + 0.7) * np.exp(-t / (body_tau * 0.3))
    x += ring * np.sin(5 * ph + 1.9) * np.exp(-t / ring_tau)
    x += 0.07 * bright * np.sin(6.9 * ph + 2.3) * np.exp(-t / 0.025)
    x += hollow * np.sin(0.5 * ph + 0.2) * np.exp(-t / (body_tau * 0.45)) * (1 - np.exp(-t / 0.006))
    x *= np.minimum(1, t / 0.0008)
    k = min(n, int(0.03 * SR))
    tk = tt(k)
    cl = bp(noise(k, seed), 1500, 7000 if bright > 0.5 else 4000) * np.exp(-tk / 0.0016) * 1.0 * click_amt
    cl += np.sin(2 * np.pi * 2600 * tk) * np.exp(-tk / 0.0022) * 0.45 * click_amt * bright
    cl += bp(noise(k, seed + 1), 350, 1600) * np.exp(-tk / 0.007) * 0.8
    x[:k] += cl * strike
    return x


def phone_speaker(x, seed=0, lo=950, hi=5200, drive=2.4):
    """A small phone speaker: band-limited (~1-5 kHz), driven into soft clipping, with a little cone rattle."""
    y = bp(bp(x, lo, hi, 2), lo * 0.85, hi * 1.15, 1)
    y = y / (np.max(np.abs(y)) + 1e-9)
    y = np.tanh(drive * y) / np.tanh(drive)
    y = y + bp(noise(len(y), seed + 3), 1700, 2400) * lp(np.abs(y), 50) * 0.35
    return bp(y, lo * 0.9, hi + 600, 1)


def creak(dur, f0=180.0, f1=140.0, jitter=0.3, res=(450, 1100, 2300), seed=0, env=None):
    """Stick-slip creak: an impulse train with a wandering period (friction) through woody resonances."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t01 = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** t01
    imp = np.zeros(n)
    pos = 0.0
    while pos < n - 1:
        i = int(pos)
        imp[i] = r.uniform(0.5, 1.0)
        pos += max(SR / f[i] * (1 + jitter * r.standard_normal() * 0.35), 6)
    x = np.zeros(n)
    for k, fr in enumerate(res):
        x += bp(imp, fr / 1.12, fr * 1.12, 2) * 0.8 ** k
    x += bp(noise(n, seed + 1), 500, 3000) * 0.004
    e = env(t01) if env is not None else bellenv(t01, 0.3, 1.2, 1.5)
    return x * e


def poisson_times(rate_fn, dur, seed):
    """Event times (s) of an inhomogeneous Poisson process; rate_fn(t) in events per second."""
    r = np.random.default_rng(seed)
    rmax = max(rate_fn(x) for x in np.linspace(0, dur, 400)) + 1e-9
    ts, t = [], 0.0
    while True:
        t += r.exponential(1.0 / rmax)
        if t >= dur:
            break
        if r.random() < rate_fn(t) / rmax:
            ts.append(t)
    return ts, r


def soft_breath(dur, kind="in", seed=0, lpf=3200, body=0.05, turb=0.18):
    """A quiet human breath (air only, no voice): swept noise with turbulence and a faint chest body."""
    x = breath(dur, "inhale" if kind == "in" else "exhale", 1.0, seed=seed)
    n = len(x)
    x = x * np.clip(1 + turb * lp(noise(n, seed + 7), 14) * 9, 0.6, 1.4)
    t01 = np.linspace(0, 1, n)
    env = bellenv(t01, 0.7, 1.6, 1.2) if kind == "in" else bellenv(t01, 0.22, 1.2, 1.5)
    x += lp(noise(n, seed + 9), 260) * env * body * 6
    return lp(x, lpf)


def amber_shimmer(dur=1.0, seed=0):
    """Sahur's amber: soft high bells on A major (A6 C#7 E7 A7 C#8), stereo."""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    for i, (f, a, d) in enumerate([(1760.0, 1.0, 0.55), (2217.5, 0.7, 0.45), (2637.0, 0.6, 0.4), (3520.0, 0.3, 0.3), (4434.9, 0.18, 0.22)]):
        env = np.minimum(1, t / 0.012) ** 1.5 * np.exp(-t / (d * dur))
        x = np.sin(2 * np.pi * f * (1 + 0.0015 * np.sin(2 * np.pi * (5 + i) * t)) * t + i + seed) * env * a
        out += pan(x, -0.6 + 0.3 * i)
    return out


def glass_shatter_core(dur=1.4, shards=90, seed=0, t_spread=0.6, lo=1800, hi=9500, impact=1.0):
    """Glass breaking: a bright burst, then many inharmonic shard rings (dense first, sparse as they fall)."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    k = int(0.05 * SR)
    out[:k] += pan(hp(noise(k, seed + 1), 1500) * np.exp(-tt(k) / 0.012) * impact, 0)
    for i in range(shards):
        t0 = (r.random() ** 2.5) * t_spread
        f = np.exp(r.uniform(np.log(lo), np.log(hi)))
        m = int(r.uniform(0.04, 0.25) * SR)
        tm = tt(m)
        s = (np.sin(2 * np.pi * f * tm) + 0.5 * np.sin(2 * np.pi * f * 2.71 * tm + 1)) * np.exp(-tm / r.uniform(0.01, 0.06))
        s *= np.minimum(1, tm / 0.0005)
        at(out, pan(s, r.uniform(-0.9, 0.9)), t0, r.uniform(0.15, 0.6) * (1 - 0.6 * min(1.0, t0 / t_spread)))
    return out


# ------------------------------------------------------------------------------------------- the TUNG family
def sx_tung_tiny_phone():
    """The meme reel's knock through a phone speaker (reel frames 12/24/36 of each 72-f loop)."""
    x = tung_core(dur=0.42, strike=0.8, body_tau=0.16, ring=0.035, ring_tau=0.08, hollow=0.2, seed=401)
    return phone_speaker(x, 401, lo=700)


def squeak(f, dur, fall=0.0, seed=0):
    n = int(dur * SR)
    t = tt(n)
    fr = f * (1 + 0.07 * np.exp(-t / 0.014)) * (1 - fall * t / dur) * (1 + 0.012 * np.sin(2 * np.pi * 24 * t))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = sum((0.75 ** k) * np.sin(k * ph + 0.4 * k) for k in range(1, 9))
    x = 0.45 * x + bp(x, 1800, 3600) * 1.2
    x = x + bp(noise(n, seed), 2500, 6500) * np.exp(-t / 0.012) * 0.4
    return x * np.minimum(1, t / 0.006) * np.clip((dur - t) / 0.025, 0, 1)


def sx_reel_sahur_squeak():
    """The reel's squeaky two-note 'sa-hur' (F#5, D5; no voice), through the phone speaker."""
    y = np.zeros(int(0.42 * SR))
    at(y, squeak(739.99, 0.085, 0.0, 602), 0.0, 0.85)
    at(y, squeak(587.33, 0.21, 0.05, 603), 8 / 60, 1.0)
    return phone_speaker(y, 604)


def sx_tung_door():
    """One heavy, even knock on the bedroom door from 3.3 m: the body without shimmer, the door panel, a latch
    rattle and a 0.6 s room."""
    x = tung_core(dur=1.1, strike=1.0, body_tau=0.22, ring=0.12, ring_tau=0.11, hollow=0.45, click_amt=0.8, bright=0.75, seed=411)
    n = len(x)
    t = tt(n)
    panel = (np.sin(2 * np.pi * 92 * t) * np.exp(-t / 0.09) + 0.4 * np.sin(2 * np.pi * 211 * t + 0.5) * np.exp(-t / 0.05)) * np.minimum(1, t / 0.002) * 0.7
    rat = np.zeros(n)
    for k, d in enumerate([0.018, 0.031, 0.047, 0.066]):
        at(rat, click(0.0012, 3200 + 300 * k, 0.6, 412 + k, 0.02), d, 0.12 * 0.75 ** k)
    return wet(lp(x + panel + rat, 6000), IR_BEDROOM, 0.32, tail=0.5)


def sx_tung_knuckle():
    """A soft knuckle-tap on his own log (it rings at his pitch: he is the instrument). Also the head-taps."""
    x = tung_core(dur=0.5, strike=0.55, body_tau=0.12, ring=0.1, ring_tau=0.07, hollow=0.15, click_amt=0.35, bright=0.5, seed=421)
    return wet(lp(x, 3500), IR_SM, 0.12, tail=0.08)


def sx_tung_knuckle_glitch():
    """The third knuckle-tap that never sounds as wood: 3 ms of wood, a 6 ms dry digital burst, a 30 ms
    bit-crushed (3 kHz sample-and-hold, ~3-bit) tail of the ring, then a dead digital stop."""
    k = lp(tung_core(dur=0.25, strike=0.55, body_tau=0.12, ring=0.1, ring_tau=0.07, hollow=0.15, click_amt=0.35, bright=0.5, seed=421), 3500)
    k = k / np.max(np.abs(k))
    a, b, c = int(0.003 * SR), int(0.006 * SR), int(0.030 * SR)
    y = np.zeros(a + b + c)
    y[:a] = k[:a]
    tb = tt(b)
    y[a:a + b] = 0.6 * np.sign(np.sin(2 * np.pi * 1450 * tb + 0.3)) + 0.25 * np.clip(noise(b, 431), -2, 2)
    hold = np.repeat(k[a + b:a + b + c:16] * 2.5, 16)[:c]
    y[a + b:] = np.round(np.clip(hold, -1, 1) * 3) / 3 * np.linspace(1, 0.5, c)
    return y


def sx_tung_stump():
    """His bat on a mossy stump, teaching the rhythm: warm, no sub, a little forest around it."""
    x = lp(tung_core(dur=0.9, strike=0.75, body_tau=0.2, ring=0.12, ring_tau=0.1, hollow=0.3, click_amt=0.55, bright=0.6, seed=441), 4200)
    y = wet(x, IR_FOREST, 0.2, tail=0.35)
    at(y, pan(lp(x, 1800), -0.3) * 0.16, 0.085)
    return y


def sx_tung_small():
    """Your tap with his bat on the log by the fire: same pitch, weaker strike, small and hollow."""
    x = lp(tung_core(dur=0.45, strike=0.4, body_tau=0.1, ring=0.08, ring_tau=0.06, hollow=0.12, click_amt=0.3, bright=0.4, seed=451), 2600)
    return wet(x, IR_FOREST, 0.12, tail=0.2)


def sx_tung_fight():
    """The fight TUNG: full stack. Wood crack, the body, a 90->45 Hz sub thump, the amber shimmer and the amber
    shockwave whoosh rolling through the listener (L->R), on a short plate."""
    core = tung_core(dur=1.6, strike=1.2, body_tau=0.3, ring=0.2, ring_tau=0.17, hollow=0.5, click_amt=1.4, seed=461)
    n = int(2.0 * SR)
    t = tt(n)
    sub = np.sin(2 * np.pi * np.cumsum(45 + 45 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.28) * np.minimum(1, t / 0.002)
    wh = sweep_noise(0.7, lambda u: 5000 * (300 / 5000) ** u, bw=0.5, amp_env=lambda u: bellenv(u, 0.1, 1.2, 1.7),
                     pan_path=lambda u: -0.7 + 1.4 * u, lo=200, hi=9000, nb=14, seed=462)
    y = np.zeros((n, 2))
    at(y, pan(core, 0), 0.0)
    at(y, pan(sub, 0), 0.0, 1.1)
    at(y, wh, 0.012, 0.45)
    at(y, amber_shimmer(1.2, 463), 0.008, 0.18)
    return wet(lp(y, 9000), IR_PLATE, 0.22, tail=0.8)


def sx_tung_gulp():
    """A small TUNG the Bubble swallows: its tail is cut at 100 ms (6 f) into a reversed glassy 'gulp'."""
    core = tung_core(dur=0.5, strike=0.8, body_tau=0.2, ring=0.15, ring_tau=0.1, hollow=0.3, click_amt=0.9, seed=471)
    m = int(0.1 * SR)
    fo = int(0.012 * SR)
    head = core[:m] * np.concatenate([np.ones(m - fo), np.linspace(1, 0, fo)])
    gn = int(0.3 * SR)
    tg = tt(gn)
    ph = 2 * np.pi * np.cumsum(150 * (1 + 1.6 * np.exp(-tg / 0.05))) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, 12))
    form = bp(src, 300, 900) + bp(src, 1400, 2600) * 0.4 * np.exp(-tg / 0.08)
    form += 0.3 * np.sin(2 * np.pi * np.cumsum(2200 * (1 - 0.4 * tg / 0.3)) / SR) * np.exp(-tg / 0.06)
    gulp = (form * np.minimum(1, tg / 0.004) * np.exp(-tg / 0.09))[::-1]
    y = np.zeros(m + gn)
    y[:m] += head
    s = m - int(0.02 * SR)
    y[s:s + gn] += gulp / (np.max(np.abs(gulp)) + 1e-9) * 0.8
    return wet(y, IR_SM, 0.1, tail=0.03)


def sx_tung_final(big=1.0, seed=481):
    """The final move's TUNG: enormous, a 76->38 Hz sub you feel, the 1.1 kHz ring, a slight pitch sag, heard
    through covered ears (the strike low-passed at 2.5 kHz) and blooming into a dark cathedral tail."""
    n = int(3.6 * SR)
    t = tt(n)
    core = tung_core(dur=3.6, strike=1.3, body_tau=0.55 * big, ring=0.22, ring_tau=0.35, hollow=0.75, click_amt=1.5, drop=0.045 * big, seed=seed)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 38 * np.exp(-t / 0.06)) / SR) * np.exp(-t / (0.55 * big)) * np.minimum(1, t / 0.003)
    dry = lp(core, 2500) * 0.9 + sub * 1.3 * big
    return lp(wet(dry, IR_CATHEDRAL, 0.5 * big, tail=3.2), 3000)


def sx_tung_pop():
    """The third strike fused with the Bubble's burst: the TUNG, a 6 ms broadband click, a 60 Hz thump, a
    soap-film 'plip' blown up to enormous, glass shattering, a high iridescent shimmer, a pressure-drop whoomp.
    The first 100 ms are a complete hit on their own (the film cuts to digital silence 6 frames in)."""
    n = int(3.0 * SR)
    t = tt(n)
    y = np.zeros((n, 2))
    strike = tung_core(dur=1.4, strike=1.5, body_tau=0.4, ring=0.22, ring_tau=0.35, hollow=0.8, click_amt=1.6, drop=0.05, seed=491)
    at(y, pan(strike, 0), 0.0, 0.8)
    k = int(0.006 * SR)
    clk = noise(k, 492) * np.exp(-tt(k) / 0.0015)
    clk[:12] += np.hanning(12) * 2.5
    at(y, pan(clk, 0), 0.0, 0.9)
    thump = np.sin(2 * np.pi * np.cumsum(60 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.18) * np.minimum(1, t / 0.002)
    at(y, pan(thump, 0), 0.0, 1.2)
    m = int(0.25 * SR)
    tm = tt(m)
    pf = 160 * 9 ** np.minimum(1, tm / 0.06)
    pph = 2 * np.pi * np.cumsum(pf) / SR
    pl = (np.sin(pph) * np.exp(-tm / 0.07) + 0.4 * np.sin(2 * pph) * np.exp(-tm / 0.04)) * np.minimum(1, tm / 0.002)
    at(y, pan(pl, 0), 0.002, 0.7)
    at(y, glass_shatter_core(2.2, 140, 493, t_spread=1.2), 0.004, 0.7)
    r = np.random.default_rng(494)
    for i in range(14):
        f = np.exp(r.uniform(np.log(3000), np.log(9000)))
        env = np.minimum(1, t / 0.03) * np.exp(-t / r.uniform(0.5, 1.4))
        y += pan(np.sin(2 * np.pi * f * t + i) * env, r.uniform(-0.9, 0.9)) * 0.04
    wf = 70 * (22 / 70) ** np.minimum(1, t / 0.5)
    wh = np.sin(2 * np.pi * np.cumsum(wf) / SR) * bellenv(np.minimum(t / 0.8, 1), 0.06, 1.2, 1.8)
    air = lp(noise(n, 495), 500) * bellenv(np.minimum(t / 1.2, 1), 0.15, 1.5, 2.0) * 0.5
    at(y, pan(wh + air, 0), 0.0, 1.0)
    return y


def sx_tung_distant():
    """The last TUNG, far away and unseen: the final TUNG's own voice (same pitch, same sag), air-absorbed
    (low-passed ~2.2 kHz), with street-canyon slap-backs off the facades and a long outdoor tail."""
    n = int(1.8 * SR)
    t = tt(n)
    core = tung_core(dur=1.8, strike=1.3, body_tau=0.55, ring=0.22, ring_tau=0.35, hollow=0.75, click_amt=1.0, drop=0.045, seed=481)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 38 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.5) * np.minimum(1, t / 0.003)
    direct = hp(lp(core * 0.9 + sub * 0.6, 2200), 45)
    y = np.zeros((int(4.6 * SR), 2))
    at(y, pan(direct, 0.15), 0.0, 0.6)
    for d, a, p, f in [(0.12, 0.5, -0.5, 1600), (0.21, 0.4, 0.6, 1400), (0.33, 0.3, -0.35, 1200), (0.52, 0.22, 0.45, 1000), (0.78, 0.14, -0.6, 850), (1.1, 0.08, 0.3, 700)]:
        at(y, pan(lp(direct, f), p), d, a)
    at(y, lp(reverb(direct, IR_CANYON, n + int(3.4 * SR)), 1800), 0.12, 0.55)
    return y


def sx_label_tok(semi=0, seed=500):
    """A wooden 'tok' per typed letter of Sahur's label (A5, +-1 semitone)."""
    x = tung_core(f0=TUNG_F0 * 4 * 2 ** (semi / 12), dur=0.12, strike=0.6, body_tau=0.035, ring=0.05, ring_tau=0.02, hollow=0.1, click_amt=0.35, bright=0.5, seed=seed)
    return wet(lp(x, 6500), IR_SM, 0.1, tail=0.04)


# ------------------------------------------------------------------------------------------- you: breath, heart
def sx_breath_calm_slow():
    """Slow, sleepy breathing under the reel (in, out, in: a 4 s cycle), 5.5 s."""
    y = np.zeros(int(5.5 * SR))
    at(y, soft_breath(1.5, "in", 801, 2400, 0.06), 0.15, 0.8)
    at(y, soft_breath(2.1, "out", 802, 2000, 0.06), 1.75, 0.9)
    at(y, soft_breath(1.4, "in", 803, 2400, 0.06), 4.02, 0.75)
    return wet(y, IR_SM, 0.08, tail=0.02)


def sx_exhale_sleepy():
    """A long, sleepy exhale that sinks (0.75 s: it has to be over before the silence at 5.5 s)."""
    x = soft_breath(0.74, "out", 811, 1800, 0.09, 0.25)
    return wet(x * np.linspace(1, 0.4, len(x)) ** 0.5, IR_SM, 0.08, tail=0.01)


def sx_breath_scared_loop(dur=8.6, seed=821):
    """Fast, shallow, shivering breathing (period 0.95 -> 0.74 s), 8.6 s."""
    r = np.random.default_rng(seed)
    y = np.zeros(int(dur * SR))
    tcur, i = 0.05, 0
    while tcur < dur - 0.9:
        period = float(np.interp(tcur, [0, 2, dur], [0.95, 0.8, 0.74])) * r.uniform(0.92, 1.08)
        din, dout = period * 0.42, period * 0.5
        at(y, soft_breath(din, "in", seed + 2 * i, 3600, 0.04, 0.3), tcur, r.uniform(0.75, 0.95))
        at(y, soft_breath(dout, "out", seed + 2 * i + 1, 3000, 0.05, 0.3), tcur + din + 0.02, r.uniform(0.6, 0.8))
        tcur += period
        i += 1
    y *= 1 + 0.12 * np.sin(2 * np.pi * 9 * tt(len(y)))
    return wet(y, IR_SM, 0.08, tail=0.05)


def sx_breath_catch():
    """A short inhale that catches and stops dead (the far TUNG)."""
    n = int(0.2 * SR)
    t01 = np.linspace(0, 1, n)
    x = sweep_noise(0.2, lambda u: 900 + 1500 * u, bw=0.55, amp_env=lambda u: np.minimum(1, u / 0.25) ** 1.3, lo=200, hi=4500, nb=10, seed=841)
    x = lp(x * np.clip(1 + 0.25 * lp(noise(n, 842), 18) * 9, 0.6, 1.4), 4200)
    x[-int(0.006 * SR):] *= np.linspace(1, 0, int(0.006 * SR))
    return wet(x, IR_SM, 0.06, tail=0.02)


def sx_exhale_laugh():
    """A small exhale-laugh through the nose: three puffs, then a breath out. Air only."""
    y = np.zeros(int(0.85 * SR))
    for k, (t0, a) in enumerate([(0.0, 1.0), (0.15, 0.8), (0.28, 0.6)]):
        at(y, soft_breath(0.12, "out", 851 + k, 2600, 0.05, 0.2), t0, a)
    at(y, soft_breath(0.45, "out", 855, 2000, 0.05), 0.38, 0.45)
    return wet(y, IR_SM, 0.08, tail=0.02)


def heart_thump(f0, f1, tau, seed, click=0.25, dur=0.3):
    m = int(dur * SR)
    tm = tt(m)
    th = np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-tm / 0.035)) / SR) * np.exp(-tm / tau)
    th += click * lp(noise(m, seed), 300) * np.exp(-tm / 0.02)
    return th * np.minimum(1, tm / 0.003)


def sx_heartbeat(kind="scared"):
    """'scared': hard, tight lub-dub; 'calm': soft and round; 'ears': heard from inside covered ears (deeper,
    boomier, with the rush of blood)."""
    if kind == "scared":
        y = np.zeros(int(0.55 * SR))
        at(y, heart_thump(84, 52, 0.075, 861, 0.35), 0.0, 1.0)
        at(y, heart_thump(78, 50, 0.065, 862, 0.3), 0.17, 0.75)
        return lp(y, 320)
    if kind == "calm":
        y = np.zeros(int(0.7 * SR))
        at(y, heart_thump(66, 44, 0.09, 863, 0.15), 0.0, 1.0)
        at(y, heart_thump(60, 42, 0.08, 864, 0.12), 0.25, 0.55)
        return lp(y, 220)
    y = np.zeros(int(0.85 * SR))
    at(y, heart_thump(58, 34, 0.15, 865, 0.1, 0.45), 0.0, 1.0)
    at(y, heart_thump(52, 32, 0.13, 866, 0.08, 0.45), 0.22, 0.7)
    y += lp(noise(len(y), 867), 140) * bellenv(np.minimum(tt(len(y)) / 0.6, 1), 0.3, 1.5, 1.5) * 0.25
    return lp(y, 170)


# ------------------------------------------------------------------------------------------- the bedroom, the feed
def sx_room_tone_morning(dur=8.0):
    """Morning room tone: soft air and a distant traffic hush. No hum (its absence says 'real')."""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        air = lp(noise(n, 871 + ch), 1400) * 0.25
        br = np.cumsum(noise(n, 873 + ch))
        br = hp(br - br.mean(), 30)
        br = lp(br / (np.max(np.abs(br)) + 1e-9), 220) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t + ch))
        out[:, ch] = air + br * 0.9
    for t0 in (2.0, 5.6):  # a far car passing (no tone, just a swell of road noise)
        m = int(2.6 * SR)
        car = bp(noise(m, int(t0 * 10) + 880), 180, 900) * bellenv(np.linspace(0, 1, m), 0.5, 1.6, 1.6) * 0.35
        at(out, pan_stereo(car, np.linspace(-0.6, 0.6, m)), t0)
    return out * np.minimum(1, t / 0.6)[:, None] * np.clip((dur - t) / 0.8, 0, 1)[:, None]


def sx_feed_hum(dur=18.0):
    """The feed: a 50 Hz mains hum with buzzy harmonics, a slow electrical flutter and a faint 2.4 kHz whine."""
    n = int(dur * SR)
    t = tt(n)
    f = 50 * (1 + 0.0015 * np.clip(lp(noise(n, 881), 0.5) * 30, -1, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    hum = sum((1.0 / k ** 0.9) * (1.3 if k % 2 else 0.8) * np.sin(k * ph + k * 0.7) for k in range(1, 22))
    hum = lp(hum, 1100) * (1 + 0.06 * np.sin(2 * np.pi * 0.17 * t))
    hum /= np.sqrt(np.mean(hum ** 2))
    out = np.zeros((n, 2))
    for ch in range(2):
        wh = np.sin(2 * np.pi * 2400 * (1 + 0.0008 * np.sin(2 * np.pi * 0.31 * t + ch)) * t + ch) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + 2 * ch))
        fizz = bp(noise(n, 883 + ch), 4000, 8000) * 0.02
        out[:, ch] = np.roll(hum, 37 * ch) * 0.5 + wh * 0.035 + fizz
    return out * np.minimum(1, t / 0.3)[:, None]


def siren(dur, period=3.2, f_lo=620.0, f_hi=1380.0, doppler=None, amp=None, lpf=1500, seed=0):
    """A wailing siren heard through walls (low-passed), with optional Doppler factor and amplitude curves."""
    n = int(dur * SR)
    t = tt(n)
    shape = 0.5 - 0.5 * np.cos(2 * np.pi * ((t / period) % 1.0))
    f = f_lo + (f_hi - f_lo) * shape
    if doppler is not None:
        f = f * doppler(t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum((1.0 / k) * np.sin(k * ph) for k in range(1, 8))
    x = lp(lp(x, lpf), lpf * 1.2)
    x *= 0.85 + 0.15 * np.clip(lp(noise(n, seed), 1.5) * 25, -1, 1)
    return x * (amp(t) if amp is not None else 1.0)


def sx_siren_far():
    d = 3.4
    x = siren(d, 3.2, 620, 1380, doppler=lambda t: 1 - 0.015 * t / d, amp=lambda t: np.minimum(1, t / 0.4) * np.clip((d - t) / 0.9, 0, 1), lpf=1500, seed=891)
    return wet(x, IR_CITY, 0.6, tail=1.0)


def sx_siren_pass():
    """A siren passing nearer, outside: Doppler from +5% to -5% at the closest point (1.6 s), then receding."""
    d, tp = 5.2, 1.6
    dop = lambda t: 1 + 0.05 * np.tanh((tp - t) / 0.5)
    amp = lambda t: (0.25 + 0.75 / (1 + ((t - tp) / 0.9) ** 2)) * np.minimum(1, t / 0.5) * np.clip((d - t) / 1.2, 0, 1)
    x = siren(d, 1.7, 650, 1450, doppler=dop, amp=amp, lpf=1700, seed=892)
    return wet(pan_stereo(x, np.clip((tt(len(x)) - tp) / 2.5, -0.7, 0.7)), IR_CITY, 0.35, tail=1.0)


def sx_siren_far_bed(dur=9.0):
    """A far siren that keeps wailing through the city, one cycle per 1.6 s (= the 96 f red light sweep)."""
    x = siren(dur, 1.6, 600, 1250, amp=lambda t: np.minimum(1, t / 0.8), lpf=1100, seed=893)
    return wet(x, IR_CITY, 0.7, tail=1.0)


def sx_sync_ping_crowd():
    """Forty phones across the street pinging at the same instant: distant, glassy E6."""
    r = np.random.default_rng(901)
    n = int(1.2 * SR)
    out = np.zeros((n, 2))
    for i in range(40):
        f = 1318.5 * 2 ** (r.uniform(-9, 9) / 1200)
        m = int(0.6 * SR)
        tm = tt(m)
        s = (np.sin(2 * np.pi * f * tm) + 0.06 * np.sin(2 * np.pi * f * 2.76 * tm)) * np.exp(-tm / 0.12) * np.minimum(1, tm / 0.002)
        at(out, pan(s, r.uniform(-1, 1)), abs(r.normal(0, 0.004)), r.uniform(0.4, 1.0))
    return wet(hp(lp(out, 5000), 300), IR_CITY, 0.5, tail=1.0)


def sx_duvet_rustle(seed=911, dur=0.9):
    n = int(dur * SR)
    t01 = np.linspace(0, 1, n)
    mod = np.clip(lp(noise(n, seed), 18) * 7 + 0.5, 0, None)
    x = bp(noise(n, seed + 1), 500, 6000) * mod + bp(noise(n, seed + 2), 150, 700) * mod * 0.5
    x *= bellenv(t01, 0.35, 1.3, 1.6)
    return pan_stereo(lp(x, 7000), -0.3 + 0.6 * t01)


def sx_dust_trickle():
    """Dust and grit sifting down from the door lintel after a knock."""
    ts, r = poisson_times(lambda t: 260 * np.exp(-t / 0.22), 0.8, 921)
    n = int(0.85 * SR)
    out = np.zeros((n, 2))
    for t0 in ts:
        m = int(0.003 * SR)
        g = hp(noise(m, int(t0 * 1e5) % 9999), 2500) * np.exp(-tt(m) / 0.0006)
        at(out, pan(g, r.uniform(-0.4, 0.4)), t0, r.uniform(0.2, 1.0))
    out += pan(hp(noise(n, 922), 3000) * np.exp(-tt(n) / 0.25) * 0.04, 0)
    return lp(out, 9000)


def sx_phone_chest_slide():
    """The phone slipping from your mittens onto your chest: a short slide, a cushioned thud, a plastic tick."""
    n = int(0.55 * SR)
    t = tt(n)
    y = np.zeros(n)
    sl = bp(noise(int(0.18 * SR), 931), 600, 4000) * bellenv(np.linspace(0, 1, int(0.18 * SR)), 0.6, 1.3, 1.3) * 0.4
    at(y, sl, 0.0)
    m = int(0.35 * SR)
    tm = tt(m)
    th = (np.sin(2 * np.pi * 110 * tm) * np.exp(-tm / 0.04) + lp(noise(m, 932), 300) * np.exp(-tm / 0.05) * 0.8) * np.minimum(1, tm / 0.003)
    at(y, th, 0.16)
    at(y, click(0.0015, 3000, 0.7, 933, 0.02), 0.155, 0.15)
    return wet(lp(y, 6000), IR_SM, 0.1, tail=0.05)


def sx_door_handle():
    n = int(0.4 * SR)
    y = np.zeros(n)
    sq = creak(0.1, 1700, 1900, 0.2, res=(1800, 3600), seed=941, env=lambda u: bellenv(u, 0.5, 1.2, 1.2))
    at(y, sq * 0.6 / (np.max(np.abs(sq)) + 1e-9), 0.0)
    at(y, click(0.002, 2400, 0.9, 942, 0.06, body=1.0), 0.11, 0.9)
    for k in range(3):
        at(y, click(0.001, 3400 + 200 * k, 0.6, 943 + k, 0.015), 0.14 + 0.022 * k, 0.25 * 0.7 ** k)
    return wet(lp(y, 8000), IR_BEDROOM, 0.25, tail=0.25)


def sx_door_creak():
    """A long, low hinge creak as the door swings 80 degrees (0.83 s plus its tail)."""
    x = creak(1.25, 230, 150, 0.5, res=(380, 900, 1700, 3100), seed=951, env=lambda u: np.minimum(1, u / 0.1) * np.clip((1 - u) / 0.35, 0, 1) ** 1.2)
    body = lp(x, 300) * 2.0
    return wet(lp(x + body, 6000), IR_BEDROOM, 0.3, tail=0.4)


def sx_fog_hiss():
    n = int(1.6 * SR)
    t01 = np.linspace(0, 1, n)
    out = np.zeros((n, 2))
    for ch in range(2):
        x = lp(noise(n, 961 + ch), 900) * 0.6 + bp(noise(n, 963 + ch), 200, 1500) * 0.4
        out[:, ch] = x * bellenv(t01, 0.4, 1.4, 1.6) * (1 + 0.15 * np.sin(2 * np.pi * 0.7 * t01 * 1.6 + ch))
    return out


def sx_step_wood_floor():
    """Sahur's wooden foot on the bedroom floor: a clonk (his A2) and a floorboard creak."""
    x = lp(tung_core(f0=110, dur=0.4, strike=0.9, body_tau=0.07, ring=0.05, ring_tau=0.04, hollow=0.3, click_amt=0.6, bright=0.5, seed=971), 3000)
    y = np.zeros(int(0.6 * SR))
    at(y, x, 0.0)
    m = int(0.2 * SR)
    at(y, np.sin(2 * np.pi * 70 * tt(m)) * np.exp(-tt(m) / 0.05) * 0.6, 0.0)
    cr = creak(0.2, 300, 240, 0.4, res=(420, 950, 2100), seed=972)
    at(y, cr * 0.35 / (np.max(np.abs(cr)) + 1e-9), 0.04)
    return wet(y, IR_BEDROOM, 0.25, tail=0.3)


def sx_knee_wood_floor():
    """His wooden knee coming down on the floor (or the table): duller, heavier, a short creak."""
    x = lp(tung_core(f0=110, dur=0.45, strike=1.0, body_tau=0.06, ring=0.03, ring_tau=0.03, hollow=0.35, click_amt=0.5, bright=0.35, seed=981), 2200)
    y = np.zeros(int(0.65 * SR))
    at(y, x, 0.0)
    m = int(0.25 * SR)
    at(y, np.sin(2 * np.pi * 60 * tt(m)) * np.exp(-tt(m) / 0.08) * 0.8, 0.0)
    cr = creak(0.25, 260, 200, 0.4, res=(380, 880, 1900), seed=982)
    at(y, cr * 0.3 / (np.max(np.abs(cr)) + 1e-9), 0.05)
    return wet(y, IR_BEDROOM, 0.25, tail=0.3)


def sx_wood_creak_small():
    x = creak(0.4, 420, 330, 0.4, res=(700, 1500, 2800), seed=991)
    return wet(x, IR_SM, 0.15, tail=0.1)


def sx_bed_creak():
    x = creak(0.6, 160, 120, 0.45, res=(300, 750, 1500), seed=1001)
    x = x / (np.max(np.abs(x)) + 1e-9)
    n = int(0.7 * SR)
    t = tt(n)
    y = np.zeros(n)
    at(y, x, 0.0)
    at(y, np.sin(2 * np.pi * 420 * (1 + 0.01 * np.sin(2 * np.pi * 6 * t)) * t) * np.exp(-t / 0.12) * 0.12, 0.1)
    at(y, lp(noise(n, 1002), 300) * np.exp(-t / 0.08) * 0.4, 0.0)
    return wet(y, IR_BEDROOM, 0.2, tail=0.2)


def sx_mitten_wood_pfftok():
    """Your mitten landing in his wooden palm: a soft 'pff' of fabric, then a small 'tok'."""
    n = int(0.35 * SR)
    t = tt(n)
    y = bp(noise(n, 1011), 250, 1800) * np.minimum(1, t / 0.006) * np.exp(-t / 0.03) + lp(noise(n, 1012), 300) * np.exp(-t / 0.04) * 0.6
    tok = lp(tung_core(dur=0.2, strike=0.35, body_tau=0.05, ring=0.05, ring_tau=0.03, hollow=0.1, click_amt=0.2, bright=0.4, seed=1013), 2500)
    at(y, tok, 0.018, 0.6)
    return wet(y, IR_BEDROOM, 0.15, tail=0.15)


def sx_shoulder_pat():
    """His wooden hand landing on your shoulder: a soft wood-on-fabric pat (the only sound under the cut)."""
    n = int(0.3 * SR)
    t = tt(n)
    y = lp(noise(n, 1021), 1200) * np.minimum(1, t / 0.004) * np.exp(-t / 0.02) + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03) * 0.6
    at(y, lp(tung_core(dur=0.15, strike=0.25, body_tau=0.04, ring=0.03, ring_tau=0.02, hollow=0.1, click_amt=0.1, bright=0.3, seed=1022), 1500), 0.004, 0.25)
    return wet(y, IR_SM, 0.05, tail=0.03)


def sx_ear_cover_rub():
    """Mittens pressing over your ears: a close fabric rub that seals into a muffled pressure."""
    n = int(0.6 * SR)
    t = tt(n)
    t01 = t / t[-1]
    mod = np.clip(lp(noise(n, 1031), 25) * 7 + 0.6, 0, None)
    x = bp(noise(n, 1032), 300, 6000) * mod * bellenv(t01, 0.4, 1.2, 1.6)
    w = np.clip((t - 0.2) / 0.3, 0, 1)
    x = x * (1 - w) + lp(x, 600) * w * 1.6
    x += lp(noise(n, 1033), 120) * bellenv(t01, 0.55, 1.5, 1.5) * 0.6
    return np.stack([x, np.roll(x, 40)], 1)


# ------------------------------------------------------------------------------------------- the montage
def sx_forest_night_glitch(dur=9.0):
    """The Hype Cycle Forest at night, slightly wrong: wind in leaves, 8-bit 'glitch crickets' (aliased square
    chirps, sample-and-held), and the green veins' faint buzz stepping in level every 4 frames."""
    n = int(dur * SR)
    t = tt(n)
    r = np.random.default_rng(1101)
    out = np.zeros((n, 2))
    for ch in range(2):
        gust = np.clip(0.55 + lp(noise(n, 1102 + ch), 0.3) * 22, 0.15, 1.3)
        out[:, ch] = lp(noise(n, 1104 + ch), 900) * gust * 0.22 + bp(noise(n, 1106 + ch), 1500, 5000) * np.clip(lp(noise(n, 1108 + ch), 3) * 8, 0, 1) * 0.05
    for f, rate, gap, p in [(4186, 18, 0.9, -0.6), (3729, 22, 1.3, 0.5), (4699, 16, 1.7, 0.1)]:
        tcur = r.uniform(0, 0.5)
        while tcur < dur - 0.4:
            for q in range(int(r.integers(3, 6))):
                m = int(0.018 * SR)
                tm = tt(m)
                sq = np.sign(np.sin(2 * np.pi * f * tm)) * np.minimum(1, tm / 0.001) * np.clip((0.018 - tm) / 0.002, 0, 1)
                sq = np.repeat(sq[::4], 4)[:m]
                at(out, pan(sq, p), tcur + q / rate, 0.05)
            tcur += gap * r.uniform(0.7, 1.3)
    step = np.repeat(r.uniform(0.3, 1.0, int(dur * 15) + 2), int(SR / 15))[:n]
    vein = (np.sin(2 * np.pi * 120 * t) + 0.3 * np.sin(2 * np.pi * 240 * t)) * lp(step, 200) * 0.02
    out += pan(vein, 0)
    return lp(out, 9000) * np.minimum(1, t / 0.3)[:, None]


def sx_step_soft(seed=1111):
    """Your soft footstep on the forest floor (also used, quicker and louder, for running)."""
    n = int(0.3 * SR)
    t = tt(n)
    r = np.random.default_rng(seed)
    x = lp(noise(n, seed), 250) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 80 * t) * np.exp(-t / 0.04) * 0.5
    cr = np.zeros(n)
    for k in range(9):
        at(cr, hp(noise(int(0.004 * SR), seed + k + 1), 1500) * np.exp(-tt(int(0.004 * SR)) / 0.001), r.uniform(0.005, 0.09), r.uniform(0.1, 0.35))
    x = (x + bp(cr, 1500, 6500)) * np.minimum(1, t / 0.004)
    return wet(x, IR_FOREST, 0.1, tail=0.1)


def sx_step_sahur_wood():
    """His wooden foot on earth: a dull clonk at his A2 and a little leaf crunch (also his landings)."""
    x = lp(tung_core(f0=110, dur=0.35, strike=0.8, body_tau=0.06, ring=0.04, ring_tau=0.03, hollow=0.25, click_amt=0.6, bright=0.45, seed=1121), 2800)
    y = np.zeros(int(0.4 * SR))
    at(y, x, 0.0)
    m = int(0.2 * SR)
    at(y, lp(noise(m, 1122), 250) * np.exp(-tt(m) / 0.03) * 0.5, 0.0)
    return wet(y, IR_FOREST, 0.15, tail=0.15)


def sx_lantern_creak():
    x = creak(0.5, 520, 600, 0.35, res=(900, 1800, 3200), seed=1131, env=lambda u: bellenv(u, 0.45, 1.3, 1.3))
    return wet(x, IR_FOREST, 0.15, tail=0.1)


def sx_tape_flutter_whoosh():
    """Into a memory: a soft whoosh with tape wow and flutter and a faint A4 motor tone under it."""
    n = int(0.7 * SR)
    t = tt(n)
    w_ = whoosh_stereo(0.7, 600, 2400, -0.4, 0.4, 0.45, 0.55, mid=3000, seed=1141)
    fl = (1 + 0.25 * np.sin(2 * np.pi * 9 * t) + 0.1 * np.sin(2 * np.pi * 23 * t))[:, None]
    tone = np.sin(2 * np.pi * np.cumsum(440 * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))) / SR) * bellenv(t / t[-1], 0.45, 1.5, 1.5) * 0.06
    return lp(w_ * fl + pan(tone, 0), 6000)


def sx_coolant_water(dur=8.0):
    """The coolant river: a flowing rush with bubbling 'bloops' and a faint cyan fizz."""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = lp(noise(n, 1151 + ch), 600) * 0.4 + bp(noise(n, 1153 + ch), 800, 3000) * np.clip(lp(noise(n, 1155 + ch), 4) * 6 + 0.5, 0, 1.5) * 0.15
    ts, r = poisson_times(lambda x: 25.0, dur, 1157)
    for t0 in ts:
        m = int(0.05 * SR)
        tm = tt(m)
        f0 = r.uniform(400, 1400)
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * tm / 0.03)) / SR) * np.exp(-tm / r.uniform(0.012, 0.03)) * np.minimum(1, tm / 0.002)
        at(out, pan(b, r.uniform(-0.7, 0.7)), t0, r.uniform(0.05, 0.2))
    out += np.stack([hp(noise(n, 1158), 6000), hp(noise(n, 1159), 6000)], 1) * 0.01
    return out * np.minimum(1, t / 0.4)[:, None]


def sx_mitten_clap():
    """Two soft mittens clapping (late): a muffled pat, no crack."""
    n = int(0.3 * SR)
    t = tt(n)
    x = lp(noise(n, 1161), 2200) * np.minimum(1, t / 0.001) * np.exp(-t / 0.018) + np.sin(2 * np.pi * 160 * t) * np.exp(-t / 0.03) * 0.6
    x += bp(noise(n, 1162), 300, 1500) * np.exp(-t / 0.05) * 0.3
    return wet(x, IR_FOREST, 0.15, tail=0.1)


def bird_phrase(notes, seed, detune=0.0, wobble=0.0):
    """Sine whistles. notes: [(t0, f_start, f_end, dur, amp)]; detune (semitones) bends every note off pitch."""
    r = np.random.default_rng(seed)
    end = max(a + d for a, _, _, d, _ in notes) + 0.1
    y = np.zeros(int(end * SR))
    for t0, f0, f1, d, a in notes:
        m = int(d * SR)
        tm = tt(m)
        k = 2 ** ((detune * r.choice([-1, 1]) + wobble * r.uniform(-1, 1)) / 12)
        f = f0 * k * (f1 / f0) ** (tm / d) * (1 + 0.02 * np.sin(2 * np.pi * 32 * tm))
        ph = 2 * np.pi * np.cumsum(f) / SR
        s = (np.sin(ph) + 0.12 * np.sin(2 * ph)) * np.sin(np.pi * tm / d) ** 1.4
        at(y, s, t0, a)
    return y


def sx_bird_far_intune():
    """A far bird in the dream: a pretty, in-tune three-note call (E6 C#6 A5)."""
    y = bird_phrase([(0.0, 1318.5, 1400, 0.16, 1.0), (0.22, 1108.7, 1150, 0.16, 0.9), (0.44, 880.0, 860, 0.26, 0.8)], 1171)
    return wet(lp(y, 6000), IR_FOREST, 0.5, tail=0.4)


def sx_bird_detuned(v=1):
    """Morning birds, slightly wrong: the same kind of call but every interval a quarter-tone off and wobbling."""
    calls = {
        1: [(0.0, 1318.5, 1420, 0.14, 1.0), (0.2, 1108.7, 1160, 0.14, 0.85), (0.4, 880.0, 840, 0.24, 0.8), (0.75, 1318.5, 1250, 0.12, 0.6)],
        2: [(0.0, 1760.0, 1900, 0.1, 0.9), (0.13, 1760.0, 1900, 0.1, 0.8), (0.26, 1479.98, 1400, 0.22, 0.9), (0.6, 1174.7, 1250, 0.3, 0.7)],
        3: [(0.0, 2093.0, 2300, 0.08, 0.8), (0.1, 1975.5, 2100, 0.08, 0.7), (0.2, 1661.2, 1500, 0.2, 0.8), (0.5, 1396.9, 1450, 0.16, 0.6), (0.72, 1318.5, 1250, 0.3, 0.6)],
    }[v]
    y = bird_phrase(calls, 1180 + v, detune=0.5, wobble=0.25)
    return wet(hp(lp(y, 7000), 600), IR_CITY, 0.3, tail=0.5)


def sx_rain_roof(dur=6.0):
    """Glitch drizzle on the rusted bus-shelter roof: patter with tiny metallic pings, a hiss, the odd digital
    tick, and heavier drips falling off the roof edge."""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    ts, r = poisson_times(lambda x: 70.0, dur, 1191)
    for t0 in ts:
        m = int(0.04 * SR)
        tm = tt(m)
        d = bp(noise(m, int(t0 * 1e5) % 9999), 1500, 6000) * np.exp(-tm / 0.003) + np.sin(2 * np.pi * r.uniform(2400, 4200) * tm) * np.exp(-tm / r.uniform(0.01, 0.04)) * 0.3
        at(out, pan(d * np.minimum(1, tm / 0.0005), r.uniform(-0.8, 0.8)), t0, r.uniform(0.1, 0.5))
    for t0 in np.arange(0.2, dur - 0.2, 0.45):
        m = int(0.12 * SR)
        tm = tt(m)
        at(out, pan(np.sin(2 * np.pi * np.cumsum(1300 * (1 + 0.4 * tm / 0.12)) / SR) * np.exp(-tm / 0.05) * np.minimum(1, tm / 0.001), 0.3), t0 + r.uniform(-0.05, 0.05), 0.35)
    for t0 in np.arange(0.1, dur, 0.33):
        at(out, pan(np.sign(np.sin(2 * np.pi * 2000 * tt(48))) * 0.2, r.uniform(-0.5, 0.5)), t0 + r.uniform(0, 0.2), 0.3)
    out += np.stack([bp(noise(n, 1192), 2000, 9000), bp(noise(n, 1193), 2000, 9000)], 1) * 0.03
    return lp(out, 9500) * np.minimum(1, t / 0.3)[:, None]


def sx_glass_ping_reverse():
    """A cold glass ping, reversed: it swells and stops (the boardroom memory)."""
    y = np.zeros(int(0.8 * SR))
    at(y, bell(88, 0.9, 0.7), 0.0, 1.0)
    at(y, bell(100, 0.2, 0.5), 0.0, 0.4)
    w_ = wet(y, IR_MD, 0.4, tail=0.2)[: int(0.75 * SR)]
    return w_[::-1].copy()


# ------------------------------------------------------------------------------------------- the fire
def crackle(n, seed, rate_fn, lo=1200, hi=7000, big=0.15):
    ts, r = poisson_times(rate_fn, n / SR, seed)
    out = np.zeros((n, 2))
    for t0 in ts:
        m = int(0.012 * SR)
        tm = tt(m)
        c = bp(noise(m, int(t0 * 1e5) % 99991), lo, hi) * np.exp(-tm / r.uniform(0.0015, 0.005))
        if r.random() < big:
            c += np.sin(2 * np.pi * r.uniform(1800, 3800) * tm) * np.exp(-tm / 0.004) * 0.8
        at(out, pan(c, r.uniform(-0.6, 0.6)), t0, r.uniform(0.1, 1.0) ** 1.5)
    return out


def sx_fire_crackle_bed(dur=9.0):
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = lp(noise(n, 1201 + ch), 350) * np.clip(0.6 + lp(noise(n, 1203 + ch), 1.5) * 10, 0.3, 1.2) * 0.5 + hp(noise(n, 1205 + ch), 4000) * 0.012
    rate = lambda x: 14 + 10 * np.sin(2 * np.pi * 0.23 * x) ** 2
    out += crackle(n, 1207, rate) * 0.5
    return out * np.minimum(1, t / 0.3)[:, None]


def sx_fire_pop():
    n = int(0.5 * SR)
    t = tt(n)
    x = bp(noise(n, 1211), 800, 8000) * np.exp(-t / 0.0015) * 0.6 + bp(noise(n, 1212), 1200, 4500) * np.exp(-t / 0.006) * 1.2 + np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.008) * 0.6
    x += lp(noise(n, 1215), 500) * np.exp(-t / 0.02) * 0.5
    y = pan(x * np.minimum(1, t / 0.0002), 0.1)
    y += crackle(n, 1213, lambda u: 60 * np.exp(-u / 0.08), big=0.3) * 0.9
    y += pan(hp(noise(n, 1214), 3500) * np.exp(-t / 0.15) * 0.05, 0)
    return y


def sx_log_settle():
    n = int(1.2 * SR)
    t = tt(n)
    y = np.zeros((n, 2))
    at(y, pan(np.sin(2 * np.pi * 90 * t[: int(0.4 * SR)]) * np.exp(-t[: int(0.4 * SR)] / 0.06) + lp(noise(int(0.4 * SR), 1221), 600) * np.exp(-t[: int(0.4 * SR)] / 0.05), 0), 0.0, 0.8)
    m = int(0.35 * SR)
    at(y, pan(bp(noise(m, 1222), 300, 2000) * bellenv(np.linspace(0, 1, m), 0.3, 1.2, 1.5) * 0.3, -0.2), 0.02)
    y += crackle(n, 1223, lambda u: 40 * np.exp(-u / 0.35), big=0.3) * 0.7
    return y


def sx_static_blip():
    """One frame of static (TV noise, bit-crushed), hard-edged."""
    n = int(0.02 * SR)
    x = np.repeat(np.round(np.clip(noise(n // 6 + 1, 1231), -2, 2) * 2) / 4, 6)[:n]
    return x


# ------------------------------------------------------------------------------------------- the fights
def sx_slop_squelch(seed=1301):
    """A slopling leaping: a wet, sticky squelch with a falling 'bloop'."""
    n = int(0.4 * SR)
    t = tt(n)
    src = lp(noise(n, seed), 1200) * np.clip(lp(noise(n, seed + 1), 40) * 8, 0, 1) ** 2
    blo = np.sin(2 * np.pi * np.cumsum(380 * 0.35 ** (t / 0.25)) / SR)
    x = src * 0.6 + blo * bellenv(t / t[-1], 0.15, 1.2, 1.8) * 0.8
    x = bp(x, 400, 650) + bp(x, 1000, 1500) * 0.6 + x * 0.3
    return wet(x * np.minimum(1, t / 0.005), IR_SM, 0.15, tail=0.05)


def sx_slop_splat(v=1):
    """Slop bursting: an impact thump, a magenta spray, droplets."""
    seed = 1310 + v * 7
    k = [1.0, 0.85, 1.18][v - 1]
    n = int(0.45 * SR)
    t = tt(n)
    th = np.sin(2 * np.pi * np.cumsum(k * (60 + 50 * np.exp(-t / 0.03))) / SR) * np.exp(-t / 0.05)
    spray = bp(noise(n, seed), 1000, 7000) * np.exp(-t / 0.08) * np.clip(lp(noise(n, seed + 1), 60) * 6 + 0.4, 0, 1.5)
    y = pan(th + spray * 0.7 + lp(noise(n, seed + 2), 900) * np.exp(-t / 0.03) * 0.8, 0)
    r = np.random.default_rng(seed)
    for _ in range(7):
        m = int(0.04 * SR)
        tm = tt(m)
        b = np.sin(2 * np.pi * np.cumsum(r.uniform(500, 1500) * k * (1 + tm / 0.02)) / SR) * np.exp(-tm / 0.01)
        at(y, pan(b, r.uniform(-0.8, 0.8)), r.uniform(0.04, 0.3), r.uniform(0.1, 0.3))
    return wet(y, IR_SM, 0.12, tail=0.05)


def sx_drone_buzz():
    """A buzzword drone's rotor: a blade-chopped buzz and a thin whine, drifting across."""
    n = int(0.5 * SR)
    t = tt(n)
    chop = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 85 * t))
    x = lp(saw_add(170, n, 3000, 1.0), 2500) * lp(chop, 400) + bp(noise(n, 1321), 800, 3000) * lp(chop, 300) * 0.4
    x += np.sin(2 * np.pi * 2400 * (1 + 0.02 * t / t[-1]) * t) * 0.15
    x *= np.minimum(1, t / 0.05) * np.clip((t[-1] - t) / 0.08, 0, 1)
    return pan_stereo(lp(x, 7000), -0.5 + t / t[-1])


def sx_jargon_chirp_bolt():
    """A jargon bolt: a falling zap plus a burst of garbled modem-like chirp 'glyphs' (unreadable, no voice)."""
    n = int(0.32 * SR)
    t = tt(n)
    f = 2800 * (500 / 2800) ** np.minimum(1, t / 0.2)
    x = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.08 * np.sin(2 * np.pi * 90 * t))) / SR) * np.exp(-t / 0.1)
    r = np.random.default_rng(1331)
    gl = np.zeros(n)
    for k in range(10):
        m = int(0.025 * SR)
        at(gl, np.sign(np.sin(2 * np.pi * r.uniform(800, 3200) * tt(m))) * 0.3, 0.01 + 0.022 * k, 0.6 * np.exp(-k / 6))
    x += lp(gl, 6000)
    x[: int(0.01 * SR)] += hp(noise(int(0.01 * SR), 1332), 2000) * 0.6
    return pan_stereo(x * np.minimum(1, t / 0.002), 0.4 - 0.8 * t / t[-1])


def sx_drone_spinout():
    n = int(0.9 * SR)
    t = tt(n)
    rate = 85 * (30 / 85) ** (t / t[-1])
    chop = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(rate) / SR))
    x = lp(saw_add(170, n, 3000, 1.0), 2000) * lp(chop, 300) * (1 + 0.4 * np.sin(2 * np.pi * 6 * t))
    x *= np.exp(-t / 0.4) * np.minimum(1, t / 0.003)
    x[: int(0.03 * SR)] += bp(noise(int(0.03 * SR), 1341), 800, 5000) * np.exp(-tt(int(0.03 * SR)) / 0.008)
    return pan_stereo(x, 0.7 * t / t[-1])


def sx_riser_fight():
    """A 0.4 s (24 f) riser that lands on a bar downbeat with a clean cut."""
    dur = 0.4
    n = int(dur * SR)
    t01 = np.linspace(0, 1, n)
    rs = sweep_noise(dur, lambda x: 400 * (1 + 15 * x ** 1.4), bw=0.9, amp_env=lambda x: 0.05 + 0.95 * x ** 2.0, lo=250, hi=9000, seed=1351)
    tn, _ = tone_chirp(220, 1760, dur)
    ris = lp(rs + tn * (0.02 + 0.4 * t01 ** 2.5), 9000)
    return pan_stereo(ris, 0.25 * np.sin(2 * np.pi * 2 * t01))


def sx_echo_chime_swell():
    """Echo surging: layered notification chimes, rising in pitch and density, crescendo (0.3 s; no voice)."""
    n = int(0.42 * SR)
    out = np.zeros((n, 2))
    notes = [76, 79, 81, 83, 86, 88, 91, 93, 95, 98]
    for i, m in enumerate(notes):
        t0 = 0.3 * (i / len(notes)) ** 0.7
        f = float(mtof(m))
        k = int(0.12 * SR)
        tk_ = tt(k)
        s = np.sin(2 * np.pi * f * tk_) * np.exp(-tk_ / 0.05) * np.minimum(1, tk_ / 0.002)
        at(out, pan(s, (-1) ** i * 0.5), t0, 0.3 + 0.7 * i / len(notes))
    out += sweep_noise(0.42, lambda u: 1500 + 5000 * u, bw=0.6, amp_env=lambda u: u ** 2 * (1 - u) * 4, pan_path=lambda u: 0 * u, lo=500, hi=9000, seed=1361) * 0.3
    return out


def sx_ceramic_crack(seed=1371, size=1.0):
    """A ceramic mask cracking: a sharp click, brittle high resonances, a fast fracture crackle."""
    n = int(0.6 * SR)
    t = tt(n)
    r = np.random.default_rng(seed)
    x = noise(n, seed) * np.exp(-t / 0.0015)
    for _ in range(6):
        x += np.sin(2 * np.pi * r.uniform(1900, 6500) / size * t) * np.exp(-t / r.uniform(0.01, 0.05)) * r.uniform(0.2, 0.5)
    fr = np.zeros(n)
    for _ in range(25):
        at(fr, hp(noise(40, int(r.integers(1, 99999))), 2500), r.uniform(0.0, 0.025) * size, r.uniform(0.2, 0.7))
    x += fr + np.sin(2 * np.pi * 600 / size * t) * np.exp(-t / 0.02) * 0.5
    return wet(lp(x * np.minimum(1, t / 0.0003), 10000), IR_SM, 0.15, tail=0.1)


def sx_smile_cracks():
    """Six small ceramic tinks over 12 frames (the yes-men's smiles splitting)."""
    y = np.zeros((int(0.45 * SR), 2))
    for i, t0 in enumerate([0.0, 0.035, 0.07, 0.1, 0.14, 0.19]):
        c = sx_ceramic_crack(1380 + i, 0.6)
        at(y, c * 0.6 * (1 - 0.08 * i), t0)
    return y


def sx_afterimage_scatter():
    n = int(0.5 * SR)
    t = tt(n)
    r = np.random.default_rng(1391)
    out = np.zeros((n, 2))
    for i in range(16):
        t0 = r.uniform(0, 0.12)
        f0 = r.uniform(2000, 6000)
        m = int(0.3 * SR)
        tm = tt(m)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 - 0.3 * tm / 0.3)) / SR) * np.exp(-tm / 0.08) * np.minimum(1, tm / 0.004)
        at(out, pan(s, np.clip((-1) ** i * r.uniform(0.3, 1.0), -1, 1)), t0, 0.15)
    out += whoosh_stereo(0.5, 3000, 800, -0.2, 0.2, 0.2, 0.6, seed=1392) * 0.4
    return out


def sx_wind_dust_gust():
    n = int(2.4 * SR)
    t01 = np.linspace(0, 1, n)
    g = lp(noise(n, 1401), 700) * bellenv(t01, 0.3, 1.4, 1.6) + bp(noise(n, 1402), 2500, 7000) * bellenv(t01, 0.35, 1.6, 1.6) * np.clip(lp(noise(n, 1403), 8) * 6 + 0.5, 0, 1.5) * 0.35
    return pan_stereo(g, -0.6 + 1.2 * t01)


def sx_server_farm_hum(dur=8.0):
    """The Server Farm Wastes: a darker 60 Hz hum, steady rack-fan air with blade flutter, the odd relay click."""
    n = int(dur * SR)
    t = tt(n)
    ph = 2 * np.pi * 60 * t
    hum = lp(sum((1.0 / k) * np.sin(k * ph + k) for k in range(1, 12)), 700)
    out = np.zeros((n, 2))
    for ch in range(2):
        fan = bp(noise(n, 1411 + ch), 300, 2500) * (1 + 0.15 * np.sin(2 * np.pi * 23 * t + ch))
        out[:, ch] = hum * 0.35 + fan * 0.25
    r = np.random.default_rng(1413)
    for t0 in np.arange(0.4, dur - 0.2, 1.2):
        at(out, pan(lp(click(0.002, 1800, 0.8, int(r.integers(1, 9999)), 0.05, body=0.5), 4000), r.uniform(-0.8, 0.8)), t0 + r.uniform(0, 0.5), 0.15)
    return out * np.minimum(1, t / 0.2)[:, None]


def sx_scraper_rattle():
    """A scraper hand winding up: an accelerating, rising rattle of fingers (it shakes every frame)."""
    n = int(0.45 * SR)
    t = tt(n)
    y = np.zeros(n)
    tcur, k = 0.0, 0
    while tcur < 0.43:
        u = tcur / 0.45
        at(y, click(0.001, 1500 + 1700 * u, 0.8, 1420 + k, 0.02), tcur, 0.3 + 0.7 * u)
        tcur += 1.0 / (25 + 45 * u)
        k += 1
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(300 * 3 ** (t / t[-1])) / SR))
    y += lp(sq, 2000) * (t / t[-1]) ** 2 * 0.08
    return wet(y, IR_SM, 0.1, tail=0.05)


def sx_scraper_grab():
    """A scraper hand lunging and grabbing: a fast whoosh into a clatter of finger clacks."""
    y = whoosh_stereo(0.18, 800, 4000, -0.3, 0.2, 0.7, 0.5, seed=1431)
    out = np.zeros((int(0.38 * SR), 2))
    at(out, y, 0.0, 0.8)
    for k, d in enumerate([0.17, 0.185, 0.2, 0.22]):
        at(out, pan(click(0.0015, 2200 + 300 * k, 0.9, 1432 + k, 0.03, body=0.6), 0.1 * k), d, 0.7)
    m = int(0.1 * SR)
    at(out, pan(lp(noise(m, 1436), 400) * np.exp(-tt(m) / 0.02), 0), 0.17, 0.5)
    return out


def sx_bat_hit_metal():
    """His bat swatting a scraper hand: a wood thock, a metal clang and a spray of sparks."""
    n = int(0.9 * SR)
    t = tt(n)
    x = tung_core(dur=0.9, strike=1.1, body_tau=0.08, ring=0.1, ring_tau=0.06, hollow=0.3, click_amt=1.2, seed=1441)
    cl = sum(a * np.sin(2 * np.pi * f * t + i) * np.exp(-t / d) for i, (f, a, d) in enumerate([(523, 0.6, 0.45), (1240, 0.5, 0.3), (2130, 0.4, 0.2), (3370, 0.3, 0.12), (4790, 0.2, 0.08)]))
    y = pan(x + cl * np.minimum(1, t / 0.0005) * 0.8, 0)
    y += crackle(n, 1442, lambda u: 120 * np.exp(-u / 0.12), lo=3000, hi=9000, big=0.0) * 0.5
    return wet(lp(y, 10000), IR_PLATE, 0.15, tail=0.3)


def sx_wraith_hiss():
    """A prompt wraith's whisper-hiss: formant-swept breathy noise, no voice."""
    n = int(0.9 * SR)
    t = tt(n)
    t01 = t / t[-1]
    s = lp(hp(noise(n, 1451), 3500), 9000) * bellenv(t01, 0.4, 1.4, 1.4) * 0.2
    b = sweep_noise(0.9, lambda u: 1200 + 1200 * u, bw=0.35, amp_env=lambda u: bellenv(u, 0.5, 1.4, 1.2), lo=600, hi=5000, nb=12, seed=1452)
    x = (s + b) * (1 + 0.3 * np.sin(2 * np.pi * 5 * t))
    return np.stack([x, np.roll(x, 300)], 1) * 0.8


def sx_wraith_whoosh():
    """A wraith lunging straight through you: a rising whoosh in, a falling ghost tail out, an eerie detuned tone."""
    n = int(0.8 * SR)
    t = tt(n)
    a = whoosh_stereo(0.35, 400, 3500, -0.6, 0.0, 0.85, 0.55, seed=1461)
    b = whoosh_stereo(0.45, 3500, 250, 0.0, 0.8, 0.12, 0.55, seed=1462)
    out = np.zeros((n, 2))
    at(out, a, 0.0)
    at(out, b, 0.33)
    gt = sum(np.sin(2 * np.pi * np.cumsum(f * (330 / 880) ** (t / t[-1]) * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))) / SR) for f in (880, 893))
    out += pan(gt * bellenv(t / t[-1], 0.4, 1.4, 1.4) * 0.08, 0)
    return out


def sx_water_ring_rush():
    """TUNG #2's ring raising a wall of coolant water: a slosh surge and a moving spray rush."""
    n = int(1.1 * SR)
    t = tt(n)
    t01 = t / t[-1]
    slosh = lp(noise(n, 1471), 700) * bellenv(t01, 0.15, 0.8, 1.8) * np.clip(lp(noise(n, 1472), 25) * 6 + 0.6, 0, 1.6)
    spray = sweep_noise(1.1, lambda u: 6000 * (1500 / 6000) ** u, bw=0.6, amp_env=lambda u: bellenv(u, 0.2, 1.0, 1.6), lo=800, hi=9000, nb=12, seed=1473)
    return pan_stereo(slosh * 0.8 + spray * 0.6, -0.5 + t01)


def sx_crack_fizz():
    """A dry wood split, then a tiny glassy fizz: the amber light starting to leak out of him."""
    n = int(0.5 * SR)
    t = tt(n)
    y = np.zeros(n)
    for k, d in enumerate([0.0, 0.012, 0.03, 0.055]):
        m = int(0.05 * SR)
        tm = tt(m)
        c = bp(noise(m, 1481 + k), 700, 4500) * np.exp(-tm / 0.0018) * 0.6 + bp(noise(m, 1491 + k), 600, 1500) * np.exp(-tm / 0.015) * 0.9
        at(y, c, d, 1.0 - 0.18 * k)
    fz = hp(noise(n, 1495), 4500) * np.clip(lp(noise(n, 1496), 30) * 9, 0, 1) * np.exp(-t / 0.25) * 0.2
    fz += np.sin(2 * np.pi * 6200 * t) * np.minimum(1, t / 0.05) * np.exp(-t / 0.15) * 0.05
    return wet(y + fz, IR_SM, 0.12, tail=0.05)


def sx_glass_shatter():
    out = glass_shatter_core(1.5, 110, 1501, t_spread=0.9)
    m = int(0.2 * SR)
    at(out, pan(np.sin(2 * np.pi * 120 * tt(m)) * np.exp(-tt(m) / 0.04), 0), 0.0, 0.6)
    return wet(out, IR_MD, 0.3, tail=0.4)


def sx_boardroom_hvac(dur=7.0):
    """The boardroom: sterile, steady air and a faint fan hum."""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = lp(noise(n, 1511 + ch), 2500) * 0.3 + hp(noise(n, 1513 + ch), 5000) * 0.03
    out += pan((np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t)) * 0.04, 0)
    return out * (1 + 0.04 * np.sin(2 * np.pi * 0.5 * t))[:, None] * np.minimum(1, t / 0.2)[:, None]


def sx_yesman_blips(count=16, step_f=6):
    """The yes-men agreeing: soft two-note 'mm-HM' synth blips on the 150 BPM 16ths (every 6 f), three voices."""
    stp = step_f * FR
    n = count * stp + int(0.2 * SR)
    out = np.zeros((n, 2))
    voices = [((81, 86), -0.6), ((85, 90), 0.0), ((76, 81), 0.6)]
    for k in range(count):
        (m1, m2), p = voices[k % 3]
        for j, m in enumerate((m1, m2)):
            q = int(0.035 * SR)
            tq = tt(q)
            s = lp(np.sign(np.sin(2 * np.pi * float(mtof(m)) * tq)) * 0.5 + np.sin(2 * np.pi * float(mtof(m)) * tq), 3000)
            s *= np.minimum(1, tq / 0.003) * np.clip((0.035 - tq) / 0.008, 0, 1)
            at(out, pan(s, p), (k * stp) / SR + j * 0.038, 0.6 if j else 0.45)
    return out


def sx_golem_slam():
    """A pivot golem's two stone fists on the boardroom table: heavy thuds, stone clack, the table booming."""
    n = int(1.0 * SR)
    t = tt(n)
    y = np.zeros(n)
    for k, d in enumerate([0.0, 0.015]):
        m = int(0.8 * SR)
        tm = tt(m)
        th = np.sin(2 * np.pi * np.cumsum(45 + 25 * np.exp(-tm / 0.05)) / SR) * np.exp(-tm / 0.15)
        st = bp(noise(m, 1521 + k), 400, 2500) * np.exp(-tm / 0.02) + (np.sin(2 * np.pi * 820 * tm) + 0.6 * np.sin(2 * np.pi * 1330 * tm)) * np.exp(-tm / 0.03) * 0.4
        at(y, (th + st) * np.minimum(1, tm / 0.001), d, 1.0 - 0.2 * k)
    at(y, lp(tung_core(f0=82.4, dur=0.8, strike=1.0, body_tau=0.2, ring=0.05, ring_tau=0.1, hollow=0.3, click_amt=0.4, bright=0.3, seed=1523), 2000), 0.0, 0.6)
    return wet(y, IR_MD, 0.25, tail=0.3)


def sx_golem_slab_crack():
    """The golem splitting down its crack: a big stone crack, grinding, a rumble, some debris."""
    n = int(0.9 * SR)
    t = tt(n)
    y = bp(noise(n, 1531), 300, 5000) * np.exp(-t / 0.004) * 0.8 + np.sin(2 * np.pi * np.cumsum(70 + 50 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.12) * 0.7
    y += lp(noise(n, 1532), 1500) * (1 + 0.5 * np.sign(np.sin(2 * np.pi * 40 * t))) * bellenv(t / t[-1], 0.15, 1.0, 1.6) * 0.5
    y += lp(noise(n, 1533), 150) * np.exp(-t / 0.3) * 0.8
    r = np.random.default_rng(1534)
    for _ in range(10):
        at(y, click(0.002, r.uniform(800, 2500), 0.8, int(r.integers(1, 9999)), 0.03, body=0.6), r.uniform(0.05, 0.6), r.uniform(0.1, 0.4))
    return wet(lp(y * np.minimum(1, t / 0.0005), 7000), IR_MD, 0.25, tail=0.3)


def sx_valuation_swell():
    """The Valuation rising: a cash-register 'ka-ching' on top of a swelling pad (0.35 s, no voice)."""
    n = int(0.6 * SR)
    t = tt(n)
    pad_ = sum(saw_add(float(mtof(m)), n, 3000, 1.2, m) for m in (61, 64, 68, 73))
    sw = np.clip(t / 0.3, 0, 1) ** 2 * np.where(t > 0.3, np.exp(-(t - 0.3) / 0.08), 1.0)
    y = lp(pad_, 2500) * sw * 0.15
    m = int(0.3 * SR)
    tm = tt(m)
    ka = sum(a * np.sin(2 * np.pi * f * tm) * np.exp(-tm / d) for f, a, d in [(2100, 1.0, 0.12), (3150, 0.6, 0.08), (4230, 0.4, 0.05)]) * np.minimum(1, tm / 0.0005)
    at(y, ka, 0.27, 0.6)
    at(y, ka, 0.31, 0.5)
    r = np.random.default_rng(1541)
    for _ in range(6):
        at(y, click(0.0008, r.uniform(4000, 7000), 0.5, int(r.integers(1, 9999)), 0.01), r.uniform(0.28, 0.4), 0.2)
    return wet(y, IR_SM, 0.2, tail=0.1)


def sx_glass_crack_big():
    """The up-only chart line snapping: a big glassy crack with a fracture running along it."""
    n = int(0.8 * SR)
    t = tt(n)
    y = bp(noise(n, 1551), 1000, 8000) * np.exp(-t / 0.0025) * 0.7 + np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.05) * 0.6
    r = np.random.default_rng(1552)
    for k in range(40):
        u = k / 40
        at(y, np.sin(2 * np.pi * (2000 + 5000 * u) * tt(200)) * np.exp(-tt(200) / 0.0015), 0.08 * u + r.uniform(0, 0.003), 0.4)
    for f, d in [(1820, 0.2), (2650, 0.15), (3480, 0.12)]:
        y += np.sin(2 * np.pi * f * t) * np.exp(-t / d) * 0.25 * np.minimum(1, t / 0.001)
    return wet(y, IR_MD, 0.3, tail=0.3)


def sx_digit_clang():
    """A colossal neon digit toppling: a heavy inharmonic metal clang with a neon buzz."""
    n = int(1.1 * SR)
    t = tt(n)
    y = sum(a * np.sin(2 * np.pi * f * t + i) * np.exp(-t / d) for i, (f, a, d) in enumerate([(147, 0.9, 0.6), (392, 0.7, 0.45), (711, 0.5, 0.3), (1189, 0.4, 0.2), (1730, 0.3, 0.12), (2405, 0.2, 0.08)]))
    y = y * np.minimum(1, t / 0.0008) + noise(n, 1561) * np.exp(-t / 0.002) * 0.6
    y += np.sign(np.sin(2 * np.pi * 100 * t)) * np.exp(-t / 0.3) * 0.05
    return wet(lp(y, 9000), IR_MD, 0.3, tail=0.3)


# ------------------------------------------------------------------------------------------- the Bubble
def sx_applause_synth(dur=6.0, swell_at=3.2):
    """Synthetic applause: claps on a slightly-too-regular grid, sparse and low, swelling from `swell_at`."""
    n = int(dur * SR)
    t = tt(n)
    rate = lambda x: 25 + (135 * ((x - swell_at) / (dur - swell_at)) ** 1.5 if x > swell_at else 0)
    ts, r = poisson_times(rate, dur, 1601)
    out = np.zeros((n, 2))
    m = int(0.03 * SR)
    claps = [bp(noise(m, 1610 + i), 900, 3500) * np.exp(-tt(m) / 0.008) for i in range(8)]
    for t0 in ts:
        q = round(t0 * 96) / 96
        at(out, pan(claps[int(r.integers(0, 8))], r.uniform(-0.9, 0.9)), q, r.uniform(0.4, 1.0))
    lvl = 0.35 + 0.65 * (np.clip(t - swell_at, 0, None) / (dur - swell_at)) ** 1.2
    return hp(lp(out, 7000), 400) * (lvl * np.minimum(1, t / 0.5))[:, None]


def babble_voice(dur, f_base, seed, rate=7.0):
    """One murmuring 'speaker': a breathy buzz through vowel formants that change every syllable (~7 Hz), with a
    corporate cadence (each phrase starts high, declines, ends on a little rise). Random vowels, no words."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = tt(n)
    syl, ph_start, tcur = [], [], 0.0
    while tcur < dur:
        k = int(r.integers(5, 10))
        ph_start.append(tcur)
        for j in range(k):
            syl.append((tcur, j, k))
            tcur += r.uniform(0.75, 1.25) / rate
        tcur += r.uniform(0.12, 0.25)
    f0 = np.full(n, f_base)
    amp = np.zeros(n)
    vow = np.zeros((n, 5))
    for i, (s0, j, k) in enumerate(syl):
        a = int(s0 * SR)
        b = min(n, int((syl[i + 1][0] if i + 1 < len(syl) else dur) * SR))
        if b <= a:
            continue
        u = j / max(1, k - 1)
        f0[a:b] = f_base * (1.25 - 0.4 * u + (0.18 if j == k - 1 else 0.0) + (0.1 if j in (1, 3) else 0.0))
        m = b - a
        tm = np.linspace(0, 1, m)
        amp[a:b] = np.sin(np.pi * tm) ** 0.6 * r.uniform(0.6, 1.0)
        vow[a:b, int(r.integers(0, 5))] = 1.0
    f0 = lp(f0, 12)
    vow = lp(vow, 18)
    amp = lp(amp, 30)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    src = sum(np.sin(k * ph) / k ** 1.2 for k in range(1, 30)) * 0.5 + noise(n, seed + 1) * 0.35
    out = np.zeros(n)
    for v, (F1, F2) in enumerate([(750, 1200), (500, 1800), (320, 2200), (500, 900), (350, 800)]):
        y = bp(src, F1 / 1.15, F1 * 1.15) + 0.6 * bp(src, F2 / 1.12, F2 * 1.12) + 0.25 * bp(src, 2300, 2900)
        out += y * vow[:, v]
    return lp(out * amp, 3200)


def sx_hype_babble(dur=316 / 60):
    """The Bubble's hype-babble (3020 -> 3336): one murmuring voice, a second from local 100 f (+3 dB), then
    layers 3 to 6 joining over the growth (160-280 f), panned wide. Formant-filtered murmur, no words."""
    n = int(dur * SR)
    out = np.zeros((n, 2))
    layers = [(0, 112, -0.2), (100, 176, 0.5), (160, 140, -0.75), (200, 205, 0.8), (240, 125, -0.5), (280, 165, 0.25)]
    for i, (sf, fb, p) in enumerate(layers):
        d = dur - sf / 60
        v = babble_voice(d, fb, 1620 + 11 * i)
        tv = tt(len(v))
        v *= np.minimum(1, tv / 0.4)
        at(out, pan(v / (np.sqrt(np.mean(v ** 2)) + 1e-9), p), sf / 60, 0.5 if i else 0.36)
    return out


def sx_bubble_ping_grid(frames=296, i0=15.0, i1=8.0):
    """Notification pings on a too-regular grid, every 15 f accelerating to every 8 f; glassy E6. Hard end."""
    n = frames * FR
    out = np.zeros((n + int(0.6 * SR), 2))
    f, k = 0.0, 0
    while f < frames - 1:
        at(out, ping(88, 0.8, dur=0.5, ring=0.07, attack=0.003, air=0.4, seed=1700 + k % 4), f * FR / SR, 1.0)
        f += i0 + (i1 - i0) * f / frames
        k += 1
    return out[:n]


def sx_bubble_inflate_creak():
    """The Bubble swelling: a rubbery glass stretch, rising."""
    x = creak(0.55, 300, 520, 0.25, res=(900, 1800, 3100, 4400), seed=1711, env=lambda u: np.minimum(1, u / 0.6) ** 1.5 * np.clip((1 - u) / 0.15, 0, 1))
    return wet(x, IR_MD, 0.25, tail=0.2)


def sx_shepard_riser(frames=168, rate=0.9, gain_db=18.0):
    """A Shepard-Risset glissando (endless rise) over `frames`: eight octave-spaced glassy partials sliding up
    under a fixed bell over log-frequency, crescendo of `gain_db`, plus a thin noise riser. Hard end (2 f)."""
    n = frames * FR
    t = tt(n)
    out = np.zeros((n, 2))
    for k in range(8):
        oc = (k + rate * t) % 8.0
        f = 40.0 * 2 ** oc
        a = np.exp(-0.5 * ((np.log2(f) - np.log2(500)) / 1.4) ** 2)
        ph = 2 * np.pi * np.cumsum(f) / SR
        out += pan((np.sin(ph) + 0.15 * np.sin(3 * ph)) * a, -0.5 + k / 7.0)
    nz = sweep_noise((n + 0.5) / SR, lambda u: 500 * 2 ** (3 * u), bw=0.6, amp_env=lambda u: 0.3 + 0.7 * u, pan_path=lambda u: 0 * u, lo=300, hi=9000, seed=1721)
    out[: min(n, len(nz))] += nz[:n] * 0.25
    g = 10 ** ((-gain_db + gain_db * (t / t[-1]) ** 1.3) / 20)
    return out * g[:, None]


def sx_bubble_groan():
    """The Bubble dented: a rubbery glass groan, falling."""
    x = creak(1.0, 260, 140, 0.6, res=(420, 900, 2200, 3600), seed=1731, env=lambda u: bellenv(u, 0.25, 1.2, 1.6))
    x = x / (np.max(np.abs(x)) + 1e-9)
    t = tt(len(x))
    x += np.sin(2 * np.pi * 70 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t)) * bellenv(t / t[-1], 0.3, 1.2, 1.5) * 0.3
    return wet(x, IR_MD, 0.3, tail=0.4)


def sx_bubble_seam_rip():
    """A 25 m seam tearing across the Bubble: a huge cellophane-and-glass rip sweeping across, with a low rumble."""
    dur = 1.2
    n = int(dur * SR)
    t = tt(n)
    rate = lambda x: 2500 * np.exp(-((x - 0.25) / 0.25) ** 2) + 400
    ts, r = poisson_times(rate, dur, 1741)
    out = np.zeros((n, 2))
    for t0 in ts:
        at(out, pan(hp(noise(24, int(t0 * 1e6) % 99991), 1500), np.clip(-0.8 + 1.6 * t0 / dur, -1, 1)), t0, r.uniform(0.05, 0.4))
    for _ in range(25):
        f = r.uniform(3000, 7000)
        m = int(0.08 * SR)
        at(out, pan(np.sin(2 * np.pi * f * tt(m)) * np.exp(-tt(m) / 0.02), r.uniform(-0.8, 0.8)), r.uniform(0, 0.9), 0.15)
    out = bp(out, 900, 9000) + pan(lp(noise(n, 1742), 200) * bellenv(t / t[-1], 0.2, 1.2, 1.6) * 0.6, 0)
    return out


def sx_letter_tinks():
    """The hype-ring letters falling like snow: 60 tiny glass tinks over 70 frames."""
    r = np.random.default_rng(1751)
    n = int(1.3 * SR)
    out = np.zeros((n, 2))
    for t0 in np.sort(r.uniform(0, 70 / 60, 60)):
        m = int(0.06 * SR)
        tm = tt(m)
        s = np.sin(2 * np.pi * r.uniform(3000, 7500) * tm) * np.exp(-tm / r.uniform(0.008, 0.025)) * np.minimum(1, tm / 0.0004)
        at(out, pan(s, r.uniform(-0.9, 0.9)), t0, r.uniform(0.3, 1.0))
    return out


def sx_light_fizz():
    """The faint fizz of his light pouring out (the only sound before the pop)."""
    n = int(0.6 * SR)
    t = tt(n)
    x = hp(noise(n, 1761), 3500) * np.clip(lp(np.abs(noise(n, 1762)), 40) * 3, 0, 1.5) * 0.3
    x += np.sin(2 * np.pi * 3500 * (1 + 0.004 * np.sin(2 * np.pi * 7 * t)) * t) * 0.04
    x *= bellenv(t / t[-1], 0.6, 1.3, 1.0)
    return np.stack([x, np.roll(x, 120)], 1)


def sx_wood_chunks():
    """Chunks of him splintering off: five sharp wood cracks with small pitched knocks (A family)."""
    r = np.random.default_rng(1771)
    n = int(0.75 * SR)
    out = np.zeros((n, 2))
    for k, d in enumerate([0.0, 0.06, 0.13, 0.22, 0.35]):
        m = int(0.2 * SR)
        tm = tt(m)
        c = bp(noise(m, 1772 + k), 900, 5000) * np.exp(-tm / 0.002) * 0.5 + bp(noise(m, 1780 + k), 500, 1800) * np.exp(-tm / 0.025) * 0.9
        c += tung_core(f0=TUNG_F0 * r.choice([1.5, 2.0, 3.0]), dur=0.2, strike=0.6, body_tau=0.04, ring=0.05, ring_tau=0.02, hollow=0.05, click_amt=0.3, bright=0.6, seed=1790 + k) * 0.7
        at(out, pan(c, r.uniform(-0.7, 0.7)), d, 1.0 - 0.12 * k)
    return wet(out, IR_SM, 0.1, tail=0.1)


def sx_wood_fall():
    """Large pieces of him falling onto the soft white ground: dull thuds and a little rattle."""
    r = np.random.default_rng(1801)
    n = int(0.9 * SR)
    out = np.zeros((n, 2))
    for k, d in enumerate([0.0, 0.12, 0.27, 0.45]):
        m = int(0.3 * SR)
        tm = tt(m)
        th = np.sin(2 * np.pi * r.uniform(90, 160) * tm) * np.exp(-tm / 0.04) + lp(noise(m, 1802 + k), 700) * np.exp(-tm / 0.03) * 0.6
        th += bp(noise(m, 1810 + k), 1500, 4000) * np.exp(-tm / 0.05) * np.clip(np.sin(2 * np.pi * 30 * tm), 0, 1) * 0.15
        at(out, pan(th * np.minimum(1, tm / 0.002), r.uniform(-0.6, 0.6)), d, 1.0 - 0.15 * k)
    return out


def sx_tinnitus(frames=231):
    """Tinnitus after the pop: a pure 3.0 kHz ring plus a faint 3.9 kHz partial (-8 dB). In-file level: -16 dB
    rising to 0 over 30 f (the storyboard's -40 -> -24 dBFS at cue volume ~0.07), hold to 110 f, then a fade under
    the morning room tone to 230 f (it carries across the cut into the bedroom)."""
    n = frames * FR
    t = tt(n)
    fr = t * 60
    db = np.interp(fr, [0, 30, 110, 230], [-16, 0, 0, -50])
    x = np.sin(2 * np.pi * 3000 * t) + 10 ** (-8 / 20) * np.sin(2 * np.pi * 3900 * t + 0.4)
    return x * 10 ** (db / 20)


def make_sahur():
    """Sahur Protocol promo additions (sfx files, peak -1 dBFS, trimmed and faded)."""
    finish("tung_tiny_phone", sx_tung_tiny_phone(), fin=0.0005, fout=0.03)
    finish("reel_sahur_squeak", sx_reel_sahur_squeak(), fin=0.001, fout=0.03)
    finish("tung_door", sx_tung_door(), fin=0.0005, fout=0.25)
    finish("tung_knuckle", sx_tung_knuckle(), fin=0.0005, fout=0.06)
    finish("tung_knuckle_glitch", sx_tung_knuckle_glitch(), fin=0.0005, fout=0.0005)
    finish("tung_stump", sx_tung_stump(), fin=0.0005, fout=0.2)
    finish("tung_small", sx_tung_small(), fin=0.0005, fout=0.12)
    finish("tung_fight", sx_tung_fight(), fin=0.0005, fout=0.4)
    finish("tung_gulp", sx_tung_gulp(), fin=0.0005, fout=0.005)
    finish("tung_final_1", sx_tung_final(1.0, 481), fin=0.0005, fout=1.2)
    finish("tung_final_2", sx_tung_final(1.25, 482), fin=0.0005, fout=1.4)
    finish("tung_pop", sx_tung_pop(), fin=0.0003, fout=0.8)
    finish("tung_distant", sx_tung_distant(), fin=0.001, fout=1.2)
    for i, semi in enumerate([-1, 0, 1]):
        finish("label_tok_%d" % (i + 1), sx_label_tok(semi, 500 + i), fin=0.0005, fout=0.03)
    finish("breath_calm_slow", sx_breath_calm_slow(), fin=0.2, fout=0.3)
    finish("exhale_sleepy", sx_exhale_sleepy(), fin=0.03, fout=0.25)
    finish("breath_scared_loop", sx_breath_scared_loop(), fin=0.05, fout=0.3)
    finish("breath_catch", sx_breath_catch(), fin=0.01, fout=0.004)
    finish("exhale_laugh", sx_exhale_laugh(), fin=0.01, fout=0.15)
    for k in ("scared", "calm", "ears"):
        finish("heartbeat_%s" % k, sx_heartbeat(k), fin=0.003, fout=0.1)
    finish("room_tone_morning", sx_room_tone_morning(), fin=0.5, fout=0.8)
    finish("feed_hum", sx_feed_hum(), fin=0.3, fout=0.5)
    finish("siren_far", sx_siren_far(), fin=0.3, fout=0.6)
    finish("siren_pass", sx_siren_pass(), fin=0.3, fout=0.8)
    finish("siren_far_bed", sx_siren_far_bed(), fin=0.6, fout=0.8)
    finish("sync_ping_crowd", sx_sync_ping_crowd(), fin=0.001, fout=0.4)
    finish("duvet_rustle", sx_duvet_rustle(), fin=0.03, fout=0.2)
    finish("dust_trickle", sx_dust_trickle(), fin=0.002, fout=0.2)
    finish("phone_chest_slide", sx_phone_chest_slide(), fin=0.01, fout=0.1)
    finish("door_handle", sx_door_handle(), fin=0.002, fout=0.1)
    finish("door_creak", sx_door_creak(), fin=0.02, fout=0.3)
    finish("fog_hiss", sx_fog_hiss(), fin=0.2, fout=0.4)
    finish("step_wood_floor", sx_step_wood_floor(), fin=0.0005, fout=0.15)
    finish("knee_wood_floor", sx_knee_wood_floor(), fin=0.0005, fout=0.15)
    finish("wood_creak_small", sx_wood_creak_small(), fin=0.01, fout=0.1)
    finish("bed_creak", sx_bed_creak(), fin=0.01, fout=0.15)
    finish("mitten_wood_pfftok", sx_mitten_wood_pfftok(), fin=0.002, fout=0.1)
    finish("shoulder_pat", sx_shoulder_pat(), fin=0.002, fout=0.08)
    finish("ear_cover_rub", sx_ear_cover_rub(), fin=0.02, fout=0.12)
    finish("forest_night_glitch", sx_forest_night_glitch(), fin=0.3, fout=0.6)
    finish("step_soft", sx_step_soft(), fin=0.002, fout=0.08)
    finish("step_sahur_wood", sx_step_sahur_wood(), fin=0.0005, fout=0.1)
    finish("lantern_creak", sx_lantern_creak(), fin=0.02, fout=0.1)
    finish("tape_flutter_whoosh", sx_tape_flutter_whoosh(), fin=0.05, fout=0.2)
    finish("coolant_water", sx_coolant_water(), fin=0.4, fout=0.6)
    finish("mitten_clap", sx_mitten_clap(), fin=0.001, fout=0.08)
    finish("bird_far_intune", sx_bird_far_intune(), fin=0.005, fout=0.3)
    for v in (1, 2, 3):
        finish("bird_detuned_%d" % v, sx_bird_detuned(v), fin=0.005, fout=0.3)
    finish("rain_roof", sx_rain_roof(), fin=0.3, fout=0.5)
    finish("glass_ping_reverse", sx_glass_ping_reverse(), fin=0.05, fout=0.006)
    finish("fire_crackle_bed", sx_fire_crackle_bed(), fin=0.3, fout=0.6)
    finish("fire_pop", sx_fire_pop(), fin=0.0003, fout=0.15)
    finish("log_settle", sx_log_settle(), fin=0.003, fout=0.3)
    finish("amber_shimmer", amber_shimmer(1.0, 1240), fin=0.005, fout=0.3)
    finish("static_blip", sx_static_blip(), fin=0.0003, fout=0.0003)
    finish("slop_squelch", sx_slop_squelch(), fin=0.003, fout=0.1)
    for v in (1, 2, 3):
        finish("slop_splat_%d" % v, sx_slop_splat(v), fin=0.001, fout=0.12)
    finish("drone_buzz", sx_drone_buzz(), fin=0.02, fout=0.08)
    finish("jargon_chirp_bolt", sx_jargon_chirp_bolt(), fin=0.002, fout=0.08)
    finish("drone_spinout", sx_drone_spinout(), fin=0.003, fout=0.2)
    finish("riser_fight", sx_riser_fight(), fin=0.03, fout=0.008)
    finish("echo_chime_swell", sx_echo_chime_swell(), fin=0.01, fout=0.1)
    finish("ceramic_crack", sx_ceramic_crack(), fin=0.0003, fout=0.15)
    finish("smile_cracks", sx_smile_cracks(), fin=0.0003, fout=0.12)
    finish("afterimage_scatter", sx_afterimage_scatter(), fin=0.005, fout=0.15)
    finish("wind_dust_gust", sx_wind_dust_gust(), fin=0.1, fout=0.5)
    finish("server_farm_hum", sx_server_farm_hum(), fin=0.2, fout=0.5)
    finish("scraper_rattle", sx_scraper_rattle(), fin=0.003, fout=0.05)
    finish("scraper_grab", sx_scraper_grab(), fin=0.01, fout=0.1)
    finish("bat_hit_metal", sx_bat_hit_metal(), fin=0.0003, fout=0.25)
    finish("wraith_hiss", sx_wraith_hiss(), fin=0.05, fout=0.25)
    finish("wraith_whoosh", sx_wraith_whoosh(), fin=0.03, fout=0.2)
    finish("water_ring_rush", sx_water_ring_rush(), fin=0.01, fout=0.3)
    finish("crack_fizz", sx_crack_fizz(), fin=0.0003, fout=0.15)
    finish("glass_shatter", sx_glass_shatter(), fin=0.0003, fout=0.4)
    finish("boardroom_hvac", sx_boardroom_hvac(), fin=0.2, fout=0.5)
    finish("yesman_blips", sx_yesman_blips(), fin=0.002, fout=0.05)
    finish("golem_slam", sx_golem_slam(), fin=0.0005, fout=0.3)
    finish("golem_slab_crack", sx_golem_slab_crack(), fin=0.0005, fout=0.3)
    finish("valuation_swell", sx_valuation_swell(), fin=0.02, fout=0.12)
    finish("glass_crack_big", sx_glass_crack_big(), fin=0.0003, fout=0.25)
    finish("digit_clang", sx_digit_clang(), fin=0.0003, fout=0.3)
    finish("applause_synth", sx_applause_synth(), fin=0.3, fout=0.033)
    finish("hype_babble", sx_hype_babble(), fin=0.3, fout=0.033)
    finish("bubble_ping_grid", sx_bubble_ping_grid(), fin=0.002, fout=0.033)
    finish("bubble_inflate_creak", sx_bubble_inflate_creak(), fin=0.01, fout=0.15)
    finish("shepard_riser", sx_shepard_riser(), fin=0.05, fout=0.033)
    finish("bubble_groan", sx_bubble_groan(), fin=0.01, fout=0.3)
    finish("bubble_seam_rip", sx_bubble_seam_rip(), fin=0.002, fout=0.25)
    finish("letter_tinks", sx_letter_tinks(), fin=0.001, fout=0.1)
    finish("light_fizz", sx_light_fizz(), fin=0.05, fout=0.1)
    finish("wood_chunks", sx_wood_chunks(), fin=0.0003, fout=0.15)
    finish("wood_fall", sx_wood_fall(), fin=0.001, fout=0.15)
    finish("tinnitus", sx_tinnitus(), fin=0.002, fout=0.05)


if __name__ == "__main__":
    DJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sfx_durations.json")
    if "--navcert" in sys.argv or "--sahur" in sys.argv:  # only the additions; merge into the existing duration table
        if "--navcert" in sys.argv:
            make_navcert()
        if "--sahur" in sys.argv:
            make_sahur()
        d = json.load(open(DJ)) if os.path.exists(DJ) else {}
        d.update(DUR)
        json.dump(d, open(DJ, "w"), indent=1)
    else:
        make_all()
        make_navcert()
        make_sahur()
        json.dump(DUR, open(DJ, "w"), indent=1)
    print(len(DUR), "files")
