import sys, glob, os
from PIL import Image
d, out, start = sys.argv[1], sys.argv[2], int(sys.argv[3])
files = sorted(glob.glob(os.path.join(d, 'p*.png')))[start-1:start+7]
w = 640; h = int(w*297/210)
sheet = Image.new('RGB', (4*(w+12)+12, 2*(h+12)+12), (80,80,90))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    sheet.paste(im, (12+(i%4)*(w+12), 12+(i//4)*(h+12)))
sheet.save(out)
