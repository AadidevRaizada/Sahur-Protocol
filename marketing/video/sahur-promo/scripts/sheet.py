# usage: python scripts/sheet.py <dir-of-jpgs|video.mp4> <out.png> [cols=3] [every_s=2] [tile_w=640]
# Tiles stills (keeping their aspect) with a filename/time label. Uses PIL; ffmpeg only extracts video frames.
import sys, os, glob, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
every = float(sys.argv[4]) if len(sys.argv) > 4 else 2
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 640
items = []
if src.lower().endswith('.mp4'):
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-vf', f'fps=1/{every}', os.path.join(tmp, 's%04d.jpg')], check=True)
    for i, f in enumerate(sorted(glob.glob(os.path.join(tmp, '*.jpg')))):
        items.append((f, f'{i*every:.1f}s'))
else:
    for f in sorted(glob.glob(os.path.join(src, '*.jpg')) + glob.glob(os.path.join(src, '*.png'))):
        items.append((f, os.path.splitext(os.path.basename(f))[0]))
ims = []
for f, label in items:
    im = Image.open(f).convert('RGB')
    im = im.resize((tw, round(im.height * tw / im.width)))
    ims.append((im, label))
th = max(im.height for im, _ in ims)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 4), rows * (th + 4)), 'black')
try: font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
except Exception: font = ImageFont.load_default()
for i, (im, label) in enumerate(ims):
    x, y = (i % cols) * (tw + 4), (i // cols) * (th + 4)
    sheet.paste(im, (x, y))
    d = ImageDraw.Draw(sheet)
    d.rectangle([x, y, x + 8 + 9 * len(label), y + 22], fill=(0, 0, 0))
    d.text((x + 4, y + 2), label, fill='white', font=font)
sheet.save(out); print('wrote', out, len(ims), 'tiles')
