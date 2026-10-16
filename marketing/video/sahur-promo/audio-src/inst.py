"""Instrument voices (all return mono float arrays unless noted)."""
import numpy as np
from dsp import *

_rng = np.random.default_rng(11)
_cache = {}


def noise(n, seed=None):
    r = _rng if seed is None else np.random.default_rng(seed)
    return r.standard_normal(n)


def piano(m, vel=0.8, dur=2.0, bright=0.8):
    """Felt piano: inharmonic additive partials, detuned string pair, soft hammer."""
    f = float(mtof(m))
    L = min(max(dur + 1.0, 1.6), 5.5)
    n = int(L * SR)
    t = tt(n)
    tau = float(np.clip(5.2 - (m - 36) * 0.055, 0.9, 5.0))
    out = np.zeros(n)
    for k in range(1, 13):
        fk = f * k * np.sqrt(1 + 0.00035 * k * k)
        if fk > 8500:
            break
        a = k ** -1.1 * np.exp(-(k - 1) * (0.55 - 0.3 * bright))
        d = tau / (1 + 0.55 * (k - 1))
        e = np.exp(-t / d)
        det = 0.0006 * (1 + 0.1 * k)
        ph = (k * 1.7) % 6.28
        out += a * e * 0.5 * (np.sin(2 * np.pi * fk * (1 + det) * t + ph) + np.sin(2 * np.pi * fk * (1 - det) * t + ph * 0.5))
    if dur < L - 0.15:
        out *= np.where(t > dur, np.exp(-(t - dur) / 0.35), 1.0)
    out *= np.minimum(1, t / 0.003)
    hn = int(0.02 * SR)
    ham = lp(noise(hn, int(m * 7)), 1400 + 800 * bright) * np.exp(-tt(hn) / 0.005) * 0.12
    out[:hn] += ham
    out = lp(out, 2200 + 4500 * bright * vel)
    return out * vel * 0.5


def guitar(m, vel=0.7, dur=1.0):
    f = float(mtof(m))
    L = min(max(dur + 0.4, 0.9), 2.5)
    n = int(L * SR)
    t = tt(n)
    tau0 = float(np.clip(1.5 - 0.009 * (m - 40), 0.5, 1.4))
    out = np.zeros(n)
    for k in range(1, 15):
        fk = f * k
        if fk > 7000:
            break
        a = (1.0 / k) * (1.0 if k < 7 else 0.6)
        out += a * np.exp(-t / (tau0 / k ** 0.75)) * np.sin(2 * np.pi * fk * t + k)
    out *= np.minimum(1, t / 0.002)
    out *= np.where(t > dur, np.exp(-(t - dur) / 0.12), 1.0)
    pn = int(0.012 * SR)
    out[:pn] += bp(noise(pn, int(m * 3)), 1500, 4500) * np.exp(-tt(pn) / 0.004) * 0.15
    return lp(out, 3600) * vel * 0.38


def marimba(m, vel=0.7):
    f = float(mtof(m))
    n = int(1.1 * SR)
    t = tt(n)
    tau = float(np.clip(0.75 * (440 / f) ** 0.35, 0.25, 0.9))
    out = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    out += 0.28 * np.sin(2 * np.pi * f * 3.99 * t) * np.exp(-t / (tau * 0.22))
    out += 0.07 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t / (tau * 0.07))
    out *= np.minimum(1, t / 0.0015)
    k = int(0.008 * SR)
    out[:k] += lp(noise(k, int(m)), 1200) * np.exp(-tt(k) / 0.003) * 0.12
    return out * vel * 0.55


def bell(m, vel=0.6, dur=1.8, bright=1.0):
    f = float(mtof(m))
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros(n)
    for r, a, d in [(1, 1.0, 1.0), (2.76, 0.42, 0.55), (5.4, 0.2, 0.3), (8.93, 0.08 * bright, 0.18)]:
        if f * r < 11000:
            out += a * np.sin(2 * np.pi * f * r * t + r) * np.exp(-t / (dur * 0.42 * d))
    out *= np.minimum(1, t / 0.002)
    return lp(out, 9000) * vel * 0.4


def saw_add(f, n, cutoff=2600, tilt=1.0, phase0=0.0):
    t = tt(n)
    out = np.zeros(n)
    k = 1
    while f * k < cutoff and k < 60:
        out += (1.0 / k ** tilt) * np.sin(2 * np.pi * f * k * t + phase0 * k)
        k += 1
    return out


def pad_note(m, dur, att=0.7, rel=1.2, cutoff=1800, hp_hz=150, decay_tau=None, seed=0):
    """Warm detuned saw pad; returns stereo."""
    f = float(mtof(m))
    n = int((dur + rel) * SR)
    t = tt(n)
    env = np.minimum(1, t / att) ** 1.5
    env *= np.where(t > dur, np.exp(-(t - dur) / (rel * 0.4)), 1.0)
    if decay_tau:
        env *= np.exp(-np.maximum(t - att, 0) / decay_tau)
    outL = np.zeros(n)
    outR = np.zeros(n)
    r = np.random.default_rng(seed + int(m))
    for cents, wl, wr in [(-9, 1.0, 0.35), (0, 0.7, 0.7), (9, 0.35, 1.0)]:
        v = saw_add(f * 2 ** (cents / 1200), n, cutoff, 1.15, r.uniform(0, 6))
        outL += v * wl
        outR += v * wr
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t + m)
    s = np.stack([outL, outR], 1) * (env * lfo)[:, None] * 0.12
    return hp(s, hp_hz)


def sub_bass(m, dur=0.4, vel=0.8):
    f = float(mtof(m))
    n = int((dur + 0.15) * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t + 0.3) + 0.2 * np.sin(2 * np.pi * 3 * f * t + 0.6)
    x = np.tanh(1.4 * x) * 0.7
    env = np.minimum(1, t / 0.006) * np.where(t > dur, np.exp(-(t - dur) / 0.04), 1.0) * np.exp(-t / (dur * 2.5))
    return lp(x * env, 420) * vel * 0.8


def kick(vel=0.8, f0=110, f1=46, tau=0.22, click=0.1):
    key = ("kick", round(f0), round(f1), round(tau, 3), round(click, 3))
    if key not in _cache:
        n = int(0.5 * SR)
        t = tt(n)
        ph = 2 * np.pi * (f1 * t + (f0 - f1) * 0.045 * (1 - np.exp(-t / 0.045)))
        x = np.sin(ph) * np.exp(-t / tau)
        c = int(0.004 * SR)
        x[:c] += lp(noise(c, 3), 3000) * np.linspace(1, 0, c) * click
        x *= np.minimum(1, t / 0.002)
        _cache[key] = fade(x, 0.0, 0.02)
    return _cache[key] * vel


def clap(vel=0.7, seed=5):
    key = ("clap", seed)
    if key not in _cache:
        n = int(0.3 * SR)
        x = np.zeros(n)
        for i, off in enumerate([0, 0.009, 0.019, 0.031]):
            o = int(off * SR)
            nz = noise(n - o, seed + i)
            x[o:] += (0.7 if i < 3 else 1.0) * bp(nz, 900, 3200) * np.exp(-np.arange(n - o) / SR / (0.012 if i < 3 else 0.075))
        x = lp(x, 6000)
        _cache[key] = fade(x, 0.0005, 0.02)
    return _cache[key] * vel * 0.9


def snap(vel=0.7, seed=9):
    key = ("snap", seed)
    if key not in _cache:
        n = int(0.22 * SR)
        t = tt(n)
        x = bp(noise(n, seed), 1600, 5000) * np.exp(-t / 0.012)
        x += 0.5 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.012) * np.minimum(1, t / 0.0005)
        x += 0.4 * np.sin(2 * np.pi * 780 * t) * np.exp(-t / 0.02)
        x = lp(x, 7000)
        _cache[key] = fade(x, 0.0003, 0.03)
    return _cache[key] * vel * 0.8


def hat(vel=0.5, tau=0.03, seed=2):
    key = ("hat", round(tau, 3), seed)
    if key not in _cache:
        n = int(0.15 * SR)
        t = tt(n)
        x = hp(noise(n, seed), 6500, 2) * np.exp(-t / tau) * np.minimum(1, t / 0.001)
        x = lp(x, 11000)
        _cache[key] = fade(x, 0.0, 0.01)
    return _cache[key] * vel * 0.4


def shaker(vel=0.5, seed=4):
    key = ("shk", seed)
    if key not in _cache:
        n = int(0.12 * SR)
        t = tt(n)
        x = bp(noise(n, seed), 4500, 10000) * np.exp(-t / 0.028) * np.minimum(1, t / 0.006)
        _cache[key] = fade(x, 0.0, 0.01)
    return _cache[key] * vel * 0.4


def brush(vel=0.5, seed=6, length=0.09):
    key = ("brs", seed, length)
    if key not in _cache:
        n = int(length * SR)
        t = tt(n)
        x = bp(noise(n, seed), 2500, 9000) * np.sin(np.pi * np.minimum(1, t / length)) ** 1.5
        _cache[key] = fade(x, 0.003, 0.02)
    return _cache[key] * vel * 0.35


def crash_soft(dur=1.8):
    n = int(dur * SR)
    t = tt(n)
    x = bp(noise(n, 31), 2800, 9500) * (np.exp(-t / 0.5) * 0.8 + np.exp(-t / 0.12) * 0.6)
    for fr, a in [(3100, 0.1), (4300, 0.08), (5800, 0.06), (7300, 0.04)]:
        x += a * np.sin(2 * np.pi * fr * t + fr) * np.exp(-t / 0.5)
    x *= np.minimum(1, t / 0.004)
    return fade(lp(x, 9000), 0.0, 0.3)


# =====================================================================================================
# NavCert additions: sonar ping, kalimba, vibes, bowed drone, soft pulse bass
# =====================================================================================================
def ping(m, vel=0.6, dur=1.0, ring=0.14, attack=0.004, echo_times=None, echo_gain=0.5, echo_lp=6000, spread=0.35,
         shimmer=0.0, air=0.5, seed=77):
    """The sonar ping. A pure sine with a faint inharmonic partial and a click of air, two-stage decay (a quick
    ping and a thin ring). STEREO. `echo_times` (seconds) adds a ping-pong echo send: each repeat is `echo_gain`
    of the previous one, a little darker, alternating left and right and widening by `spread`.
    shimmer > 0 adds a detuned octave and a soft fifth bloom (the big answer)."""
    f = float(mtof(m))
    et = list(echo_times or [])
    n0 = int((dur + 0.05) * SR)
    t0 = tt(n0)
    env = (0.82 * np.exp(-t0 / ring) + 0.18 * np.exp(-t0 / (ring * 3.4))) * np.minimum(1, t0 / attack) ** 1.5
    x = np.sin(2 * np.pi * f * t0) * env
    x += 0.055 * np.sin(2 * np.pi * f * 2.76 * t0 + 0.7) * np.exp(-t0 / (ring * 0.55)) * np.minimum(1, t0 / attack)
    x += 0.03 * np.sin(2 * np.pi * f * 5.4 * t0 + 1.9) * np.exp(-t0 / (ring * 0.25)) * np.minimum(1, t0 / attack)
    if shimmer:
        for r, a, dd in [(1.0015, 0.5, 2.2), (2.0, 0.28, 1.6), (1.5, 0.18, 1.3)]:
            bl = np.minimum(1, t0 / (attack * 6 + 0.02)) ** 1.5 * np.exp(-t0 / (ring * dd * 1.4))
            x += shimmer * a * np.sin(2 * np.pi * f * r * t0 + r) * bl
    na = int(0.006 * SR)
    x[:na] += hp(noise(na, seed), 3500) * np.exp(-tt(na) / 0.0018) * 0.12 * air
    x = lp(x, 9000)
    tail = int((max(et) + 0.4) * SR) if et else 0
    out = np.zeros((n0 + tail, 2))
    out[:n0] += pan(x, 0.0)
    for k, d in enumerate(et):
        s = int(round(d * SR))
        e = lp(x, echo_lp * 0.8 ** k)
        p = (1 if k % 2 == 0 else -1) * min(0.95, spread * (1 + 0.55 * k))
        out[s : s + n0] += pan(e, p) * (echo_gain ** (k + 1))
    return out * vel * 0.55


def kalimba(m, vel=0.6):
    """Thumb piano: a clean tine, a short bright inharmonic partial, a little box thump. Mono."""
    f = float(mtof(m))
    n = int(1.4 * SR)
    t = tt(n)
    tau = float(np.clip(1.0 * (440 / f) ** 0.3, 0.38, 1.1))
    out = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    out += 0.2 * np.sin(2 * np.pi * f * 5.4 * t + 0.4) * np.exp(-t / (tau * 0.1))
    out += 0.07 * np.sin(2 * np.pi * f * 9.2 * t + 1.1) * np.exp(-t / (tau * 0.04))
    out *= np.minimum(1, t / 0.0012)
    k = int(0.02 * SR)
    out[:k] += np.sin(2 * np.pi * 230 * tt(k)) * np.exp(-tt(k) / 0.012) * 0.10
    out[:k] += lp(noise(k, int(m * 5) + 1), 1100) * np.exp(-tt(k) / 0.004) * 0.12
    return out * vel * 0.55


def vibes(m, vel=0.6, dur=2.2, trem=0.1, rate=4.4):
    """Soft vibraphone bar: fundamental plus the 4x partial, motor tremolo, rubber mallet. Mono."""
    f = float(mtof(m))
    n = int(dur * SR)
    t = tt(n)
    tau = float(np.clip(1.7 * (440 / f) ** 0.4, 0.6, 2.2))
    out = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    out += 0.22 * np.sin(2 * np.pi * f * 4.0 * t + 0.5) * np.exp(-t / (tau * 0.28))
    out += 0.05 * np.sin(2 * np.pi * f * 10.0 * t + 1.7) * np.exp(-t / (tau * 0.07))
    out *= 1 - trem * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + m))
    out *= np.minimum(1, t / 0.002)
    k = int(0.012 * SR)
    out[:k] += lp(noise(k, int(m * 3) + 5), 1500) * np.exp(-tt(k) / 0.004) * 0.10
    out *= np.where(t > dur - 0.25, np.maximum(0, (dur - t) / 0.25), 1.0)
    return out * vel * 0.5


def drone(m, dur, att=1.8, rel=1.2, dark=300, bright=1500, swell=None, vib=0.0035, seed=0):
    """Bowed low string drone: a filtered detuned saw stack with slow vibrato and bow noise. STEREO.
    swell: [(seconds, 0..1), ...] opens the filter from `dark` to `bright` Hz over time."""
    f = float(mtof(m))
    n = int((dur + rel) * SR)
    t = tt(n)
    env = np.minimum(1, t / att) ** 1.6 * np.where(t > dur, np.exp(-(t - dur) / (rel * 0.4)), 1.0)
    sw = np.ones(n) * 0.0 if swell is None else np.interp(t, [p[0] for p in swell], [p[1] for p in swell])
    r = np.random.default_rng(seed + int(m))
    outL = np.zeros(n)
    outR = np.zeros(n)
    for i, (cents, wl, wr) in enumerate([(-6, 1.0, 0.45), (0, 0.8, 0.8), (6, 0.45, 1.0)]):
        drift = lp(noise(n, seed * 17 + i + 3), 1.2) * 0.17  # slow bow wander (about 0.1 percent)
        vibr = 1 + vib * np.sin(2 * np.pi * (4.4 + 0.35 * i) * t + i) * np.minimum(1, t / 2.5) + drift
        ph = 2 * np.pi * np.cumsum(f * 2 ** (cents / 1200) * vibr) / SR + r.uniform(0, 6)
        x = np.zeros(n)
        for k in range(1, 24):
            if f * k > bright * 2.2:
                break
            x += np.sin(k * ph + k * 0.7) / k ** 1.1
        outL += x * wl
        outR += x * wr
    st = np.stack([outL, outR], 1)
    st_d = lp(st, dark, 2)
    st_b = lp(st, bright, 2)
    bow = lp(noise(n, seed + 41), 1800) * 0.012
    out = st_d * (1 - sw[:, None]) + st_b * sw[:, None] + np.stack([bow, np.roll(bow, 300)], 1)
    return out * env[:, None] * 0.11


def pulse_bass(m, dur=0.4, vel=0.8, att=0.012):
    """Soft round sub for the groove (and the 'felt' heartbeat). Sidechained by the kicks in the mix. Mono."""
    f = float(mtof(m))
    n = int((dur + 0.2) * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t + 0.4) * np.exp(-t / 0.14) + 0.08 * np.sin(2 * np.pi * 3 * f * t + 0.9) * np.exp(-t / 0.07)
    x = np.tanh(1.2 * x) * 0.8
    env = np.minimum(1, t / att) * np.where(t > dur, np.exp(-(t - dur) / 0.06), 1.0) * np.exp(-t / (dur * 3.0))
    return lp(x * env, 330) * vel * 0.85
