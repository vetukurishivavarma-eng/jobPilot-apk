"""JobPilot mark: a forest-green tile with a white lowercase "j" path whose dot is a marigold waypoint
(your path, ending at the destination). Original artwork; regenerate all launcher sizes with:
    python assets/make-icon.py      (from mobile/)
"""
from PIL import Image, ImageDraw

GREEN_TOP, GREEN_BOTTOM = (36, 128, 106), (24, 92, 76)   # #24806A -> #185C4C, around brand #1F6F5C
MARIGOLD = (233, 162, 59)                                # #E9A23B
WHITE = (255, 255, 255)
S = 4  # supersample


def tile(size, radius_frac=0.225, circle=False):
    n = size * S
    g = Image.new('RGB', (64, 64))
    px = g.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126  # diagonal: lighter top-left
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(GREEN_TOP, GREEN_BOTTOM))
    grad = g.resize((n, n), Image.BICUBIC)
    mask = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(mask)
    if circle: d.ellipse((0, 0, n - 1, n - 1), fill=255)
    else: d.rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * radius_frac), fill=255)
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def mark(img, scale=1.0):
    """Draws the j on img (already supersampled), designed on a 1024 grid, scaled about the centre.
    The stroke is a round brush stamped along the path, so joins and ends are clean at every size."""
    import math
    n = img.size[0]
    k = n / 1024 * scale
    off = n / 2 - 512 * k
    P = lambda x, y: (off + (x + 40) * k, off + (y + 10) * k)  # centres the glyph's optical box
    w = 96 * k
    d = ImageDraw.Draw(img)
    stem_x, top = 600, 400
    r = 135
    cx, cy = stem_x - r, 640
    path = [(cx - r, cy - 45 + t) for t in range(0, 46)]                                         # hook tip, down
    path += [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(180, -1, -1)]  # round the bottom
    path += [(stem_x, cy - t) for t in range(0, cy - top + 1)]                                     # up the stem
    for (x, y) in path:
        a, b = P(x, y)
        d.ellipse((a - w / 2, b - w / 2, a + w / 2, b + w / 2), fill=WHITE)
    a, b = P(stem_x, 262)   # the waypoint, a clear gap above the stem
    rr = 66 * k
    d.ellipse((a - rr, b - rr, a + rr, b + rr), fill=MARIGOLD)
    return img


def down(img, size):
    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    res = os.path.join(here, '..', 'android', 'app', 'src', 'main', 'res')

    down(mark(tile(1024)), 1024).save(os.path.join(here, 'icon.png'))
    fg = Image.new('RGBA', (1024 * S, 1024 * S), (0, 0, 0, 0))
    down(mark(fg, scale=0.62), 1024).save(os.path.join(here, 'adaptive-fg.png'))  # inside the 66% safe zone
    down(tile(1024, radius_frac=0), 1024).save(os.path.join(here, 'adaptive-bg.png'))

    for folder, legacy, layer in [('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216), ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432)]:
        d = os.path.join(res, 'mipmap-' + folder)
        down(mark(tile(legacy)), legacy).save(os.path.join(d, 'ic_launcher.webp'), quality=95)
        down(mark(tile(legacy, circle=True), scale=0.86), legacy).save(os.path.join(d, 'ic_launcher_round.webp'), quality=95)
        down(mark(Image.new('RGBA', (layer * S, layer * S), (0, 0, 0, 0)), scale=0.62), layer).save(os.path.join(d, 'ic_launcher_foreground.webp'), quality=95)
        down(tile(layer, radius_frac=0), layer).save(os.path.join(d, 'ic_launcher_background.webp'), quality=95)
    print('icons written')
