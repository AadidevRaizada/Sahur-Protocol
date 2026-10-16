"""Final soundtrack from the CURRENT public/audio/cues.json (no cue regeneration).
Same maths as make_cues_mix_sahur.py / Film.tsx: music * musicVolume * duck(frame) + sum(sfx * volume at frame, clipped to dur).
usage: python -I mix_from_cues.py <out.wav>"""
import json, os, sys
import numpy as np
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.join(HERE, '..', 'public', 'audio')
SR, FPS = 48000, 60
FR = SR // FPS  # 800 samples per frame
NF = 4500

def read(p):
    sr, x = wavfile.read(p)
    assert sr == SR, (p, sr)
    x = x.astype(np.float64) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim == 1: x = np.stack([x, x], 1)
    return x

C = json.load(open(os.path.join(AUD, 'cues.json')))
music = read(os.path.join(AUD, 'music.wav'))
g = np.empty(NF)
for f in range(NF):
    v = C['musicVolume']
    for a, b, lvl in C['duck']:
        k = min(1.0, max(0.0, min(f - a, b - f) / 4.0))
        v *= 1 - (1 - lvl) * k
    g[f] = v
buf = music[: NF * FR] * np.repeat(g, FR)[:, None]
cache = {}
for c in C['cues']:
    if c['file'] not in cache: cache[c['file']] = read(os.path.join(AUD, c['file']))
    x = cache[c['file']]
    s = c['frame'] * FR
    n = len(x) if 'dur' not in c else min(len(x), c['dur'] * FR)
    e = min(s + n, len(buf))
    buf[s:e] += x[: e - s] * c['volume']
pk = np.abs(buf).max()
print('cues', len(C['cues']), 'peak dBFS %.2f' % (20 * np.log10(pk + 1e-12)))
if pk > 0.999: print('WARNING: clipping')
wavfile.write(sys.argv[1], SR, (np.clip(buf, -1, 1) * 32767).astype(np.int16))
print('wrote', sys.argv[1])
