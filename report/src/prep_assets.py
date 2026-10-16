"""Write compressed copies of heavy images to assets/web/ (build.js prefers them automatically)."""
import os, sys, glob
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(root, 'assets'); W = os.path.join(A, 'web')
for sub in ('shots', 'diagrams'):
    os.makedirs(os.path.join(W, sub), exist_ok=True)
    for f in sorted(glob.glob(os.path.join(A, sub, '*.*'))):
        name, ext = os.path.splitext(os.path.basename(f))
        size = os.path.getsize(f)
        for old in glob.glob(os.path.join(W, sub, name + '.*')): os.remove(old)
        if size < 300 * 1024:
            continue
        im = Image.open(f)
        if sub == 'shots':
            im = im.convert('RGB')
            if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
            out = os.path.join(W, sub, name + '.jpg'); im.save(out, 'JPEG', quality=88, optimize=True, progressive=True)
        else:
            im = im.convert('RGB').quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
            out = os.path.join(W, sub, name + '.png'); im.save(out, 'PNG', optimize=True)
        print(f'{sub}/{name}{ext}: {size//1024} KB -> {os.path.getsize(out)//1024} KB')
