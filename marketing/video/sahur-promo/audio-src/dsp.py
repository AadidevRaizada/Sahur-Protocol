"""Shared DSP helpers for the Tracvey story film audio (48 kHz, 60 fps => 800 samples per frame)."""
import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 48000
FR = 800  # samples per video frame at 60 fps
TOTAL = 1800 * FR  # 30.0 s


def mtof(m):
    return 440.0 * 2 ** ((np.asarray(m, dtype=float) - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def _sos(kind, fc, order):
    fc = np.atleast_1d(np.array(fc, dtype=float))
    fc = np.clip(fc, 5, SR / 2 - 200)
    return signal.butter(order, fc if len(fc) > 1 else fc[0], btype=kind, fs=SR, output="sos")


def lp(x, fc, order=2):
    return signal.sosfilt(_sos("low", fc, order), x, axis=0)


def hp(x, fc, order=2):
    return signal.sosfilt(_sos("high", fc, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", [lo, hi], order), x, axis=0)


def fade(x, fin=0.003, fout=0.02):
    x = np.array(x, dtype=float)
    n = len(x)
    a = min(int(fin * SR), n)
    b = min(int(fout * SR), n)
    if a:
        w = np.linspace(0, 1, a)
        x[:a] *= w if x.ndim == 1 else w[:, None]
    if b:
        w = np.linspace(1, 0, b)
        x[-b:] *= w if x.ndim == 1 else w[:, None]
    return x


def pan(x, p):
    th = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


class Bus:
    def __init__(self, n=TOTAL):
        self.buf = np.zeros((n, 2), dtype=np.float32)

    def add(self, sig, start, gain=1.0, p=0.0):
        sig = np.asarray(sig, dtype=float)
        if sig.ndim == 1:
            sig = pan(sig, p)
        s = int(round(start))
        if s < 0:
            sig = sig[-s:]
            s = 0
        e = min(s + len(sig), len(self.buf))
        if e <= s:
            return
        self.buf[s:e] += sig[: e - s] * gain


def make_ir(rt60, predelay=0.015, seed=1, bright=0.4):
    rng = np.random.default_rng(seed)
    n = int((rt60 * 1.1 + predelay) * SR)
    t = tt(n)
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        dark = lp(noise, 2200) * np.exp(-6.9 * t / rt60)
        light = hp(lp(noise, 7000), 2200) * np.exp(-6.9 * t / (rt60 * 0.4)) * bright
        x = dark + light
        k = int(predelay * SR)
        x[:k] = 0
        ramp = int(0.01 * SR)
        x[k : k + ramp] *= np.linspace(0, 1, ramp)
        # a few early reflections
        for d, a in [(0.019, 0.5), (0.031, 0.4), (0.047, 0.3), (0.061, 0.25)]:
            j = int((d + 0.003 * ch) * SR)
            if j < n:
                x[j] += a * (1 if (j % 2) else -1) * 0.8
        ir[:, ch] = x
    ir /= np.sqrt(np.sum(ir**2, axis=0, keepdims=True)) + 1e-9
    return ir


def reverb(x, ir, length=None):
    """x mono or stereo -> stereo wet signal (mono sum convolved with decorrelated IR)."""
    x = np.asarray(x, dtype=float)
    m = x if x.ndim == 1 else x.mean(axis=1)
    n = len(m) if length is None else length
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = signal.fftconvolve(m, ir[:, ch])[:n]
    return out


def compress(x, thr_db=-18.0, ratio=2.5, atk=0.01, rel=0.15, makeup_db=0.0):
    lvl = np.max(np.abs(x), axis=1)
    ca = np.exp(-1.0 / (atk * SR))
    cr = np.exp(-1.0 / (rel * SR))
    e = 0.0
    env = np.empty(len(lvl))
    for i, v in enumerate(lvl.tolist()):
        c = ca if v > e else cr
        e = c * e + (1 - c) * v
        env[i] = e
    thr = 10 ** (thr_db / 20)
    g = np.where(env > thr, (np.maximum(env, 1e-9) / thr) ** (1 / ratio - 1), 1.0)
    return x * g[:, None] * 10 ** (makeup_db / 20)


def limiter(x, ceiling=0.85, look=0.004, smooth=0.003):
    lvl = np.max(np.abs(x), axis=1)
    w = int(look * SR) | 1
    mx = maximum_filter1d(lvl, size=w)
    g = np.minimum(1.0, ceiling / np.maximum(mx, 1e-9))
    g = uniform_filter1d(g, size=int(smooth * SR) | 1)
    g = np.minimum(g, 1.0)
    y = x * g[:, None]
    # safety clip
    return np.clip(y, -ceiling, ceiling)


def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def lufs(x):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1, -1.69065929318241, 0.73248077421585]
    b2 = [1, -2, 1]
    a2 = [1, -1.99004745483398, 0.99007225036621]
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)
    blk, step = int(0.4 * SR), int(0.1 * SR)
    n = (len(y) - blk) // step + 1
    z = np.array([np.mean(y[i * step : i * step + blk] ** 2, axis=0) for i in range(n)])
    l = -0.691 + 10 * np.log10(z.sum(1) + 1e-12)
    g = l > -70
    rel = -0.691 + 10 * np.log10(np.mean(z[g].sum(1))) - 10
    g2 = g & (l > rel)
    integ = -0.691 + 10 * np.log10(np.mean(z[g2].sum(1)))
    return integ, l.max()


def write_wav(path, x):
    x = np.asarray(x, dtype=float)
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).round().astype(np.int16))


def read_wav(path):
    sr, d = wavfile.read(path)
    assert sr == SR
    d = d.astype(float) / 32768.0
    if d.ndim == 1:
        d = np.stack([d, d], 1)
    return d


def curve(points, n=TOTAL):
    """Piecewise-linear gain curve from [(frame, value), ...] sampled per sample."""
    fx = np.array([p[0] * FR for p in points], dtype=float)
    fy = np.array([p[1] for p in points], dtype=float)
    return np.interp(np.arange(n), fx, fy)


def svf_lp(x, fc, q=0.7071):
    """Time-varying 2-pole low-pass (TPT state-variable filter, stable under modulation). fc: per-sample cutoff
    in Hz (array the length of x) or a scalar. Mono or stereo. Pure Python loop: use it on short segments."""
    x = np.asarray(x, dtype=float)
    st = x.ndim == 2
    xs = x if st else x[:, None]
    n = len(xs)
    fc = np.broadcast_to(np.asarray(fc, dtype=float), (n,))
    g = np.tan(np.pi * np.clip(fc, 10, SR * 0.45) / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    A1, A2, A3 = a1.tolist(), a2.tolist(), a3.tolist()
    out = np.empty_like(xs)
    for ch in range(xs.shape[1]):
        xc = xs[:, ch].tolist()
        o = [0.0] * n
        ic1 = ic2 = 0.0
        for i in range(n):
            v3 = xc[i] - ic2
            v1 = A1[i] * ic1 + A2[i] * v3
            v2 = ic2 + A2[i] * ic1 + A3[i] * v3
            ic1 = 2 * v1 - ic1
            ic2 = 2 * v2 - ic2
            o[i] = v2
        out[:, ch] = o
    return out if st else out[:, 0]


def kweight(x):
    """ITU-R BS.1770 K-weighting at 48 kHz (the pre-filter used by lufs())."""
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1, -1.69065929318241, 0.73248077421585]
    b2 = [1, -2, 1]
    a2 = [1, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, np.asarray(x, dtype=float), axis=0), axis=0)


def loud_curve(x, win=0.4, hop=0.1):
    """Windowed loudness (LUFS) of a stereo signal: win 0.4 = momentary, 3.0 = short-term. Returns (times, lufs)."""
    y = kweight(x)
    if y.ndim == 1:
        y = np.stack([y, y], 1)
    p = (y ** 2).sum(axis=1)
    w, h = min(int(win * SR), len(p)), int(hop * SR)
    c = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, max(1, len(p) - w + 1), h)
    e = (c[starts + w] - c[starts]) / w
    return starts / SR, -0.691 + 10 * np.log10(e + 1e-12)
