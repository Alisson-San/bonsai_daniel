# Browser and home-screen icons from the official logo: the tree and pot on the logo green, in a gold ring.
# Run from the repo root: python3 scripts/favicon.py public  (needs Pillow).
import sys
from PIL import Image, ImageDraw
src = Image.open('public/images/logo_escuro.jpeg').convert('RGB')
bg = (17, 31, 16)
X0, Y0, X1, Y1 = 318, 22, 1210, 598
tree = src.crop((X0, Y0, X1, Y1))
px = tree.load()
# Remove the logo's own arch: in the upper corners keep only the red leaves.
for y in range(tree.height):
    for x in range(tree.width):
        gx, gy = x + X0, y + Y0
        if gy < 230 or (gy < 400 and (gx < 540 or gx > 1030)):
            r, g, b = px[x, y]
            if not (r > 90 and r > g * 1.7 and r > b * 1.7):
                px[x, y] = bg
def make(size, fill=.86):
    S = 1024
    canvas = Image.new('RGB', (S, S), bg)
    w = int(S * fill); h = int(tree.height * w / tree.width)
    t = tree.resize((w, h), Image.LANCZOS)
    canvas.paste(t, ((S - w) // 2, int(S * .5 - h * .5) + 22))
    d = ImageDraw.Draw(canvas)
    m, th = int(S * .03), int(S * .035)
    d.ellipse((m, m, S - m, S - m), outline=(214, 178, 96), width=th)
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(canvas, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)
out = sys.argv[1]
# A 256-colour palette keeps the PNGs small with no visible loss.
small = lambda im: im.quantize(256, method=Image.Quantize.FASTOCTREE)
small(make(512)).save(f'{out}/icon-512.png', optimize=True); small(make(192)).save(f'{out}/icon-192.png', optimize=True)
# Apple touch icon: full square (iOS rounds it itself), no transparency.
sq = Image.new('RGB', (180, 180), bg); sq.paste(make(180), (0, 0), make(180)); sq.quantize(256).save(f'{out}/apple-touch-icon.png', optimize=True)
make(48).save(f'{out}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
make(32).save(f'{out}/favicon-32.png')
