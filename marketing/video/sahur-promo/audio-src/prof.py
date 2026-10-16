"""RMS profile of a wav at 60 fps. Usage: python -I prof.py <wav> [step_frames=30] [start_frame=0] [end_frame=end]
One row per step: time, frame, RMS dBFS, spectral centroid, low-frequency fraction, peak; 'ZERO' marks a window
that is digital silence (every sample exactly 0)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *
x = read_wav(sys.argv[1])
step = int(sys.argv[2]) if len(sys.argv) > 2 else 30
f_a = int(sys.argv[3]) if len(sys.argv) > 3 else 0
f_b = int(sys.argv[4]) if len(sys.argv) > 4 else len(x) // FR
m = x.mean(1)
for f in range(f_a, f_b, step):
    s = m[f * FR:min(len(m), (f + step) * FR)]
    blk = x[f * FR:min(len(x), (f + step) * FR)]
    if len(s) < 16:
        break
    zero = not np.any(blk)
    r = 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)
    pk = 20 * np.log10(np.abs(blk).max() + 1e-9)
    sp = np.abs(np.fft.rfft(s * np.hanning(len(s))))
    fr = np.fft.rfftfreq(len(s), 1 / SR)
    c = (sp * fr).sum() / (sp.sum() + 1e-9)
    lo = 10 * np.log10((sp[fr < 150] ** 2).sum() / ((sp ** 2).sum() + 1e-12) + 1e-12)
    print("%6.2fs f%4d rms %6.1f pk %6.1f cent %5.0f lowfrac %5.1f %s%s" % (f / 60, f, r, pk, c, lo, "ZERO " if zero else "", "#" * max(0, int((r + 60) / 2))))
print("DC", x.mean(0), "peak", np.abs(x).max(), "len %.4f s" % (len(x) / SR))
