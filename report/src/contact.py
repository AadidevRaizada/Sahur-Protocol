import sys, os, glob
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
start = int(sys.argv[4]) if len(sys.argv) > 4 else 1
count = int(sys.argv[5]) if len(sys.argv) > 5 else 999
files = sorted(glob.glob(os.path.join(d, 'p*.png')))[start-1:start-1+count]
ims = [Image.open(f).convert('RGB') for f in files]
w = 520; h = int(w * 297 / 210)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 16) + 16, rows * (h + 16) + 16), (90, 90, 100))
for i, im in enumerate(ims):
    im = im.resize((w, h), Image.LANCZOS)
    sheet.paste(im, (16 + (i % cols) * (w + 16), 16 + (i // cols) * (h + 16)))
sheet.save(out)
print(out, len(ims))
