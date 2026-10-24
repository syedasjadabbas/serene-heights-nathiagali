"""Turn the floor-plan drawings into data for the 3D floor viewer.

The drawings draw unit and outside walls as thick gold lines, balconies as thin gold
outlines, lift and stair cores as grey rings and beds as solid grey blocks. This finds each
of those by colour and shape, snaps them to a grid and merges them into as few boxes as
possible. It also cuts the drawing to the building's outline, for use as the floor texture.

Usage: python scripts/plan3d.py public/media/plans public/data/plans3d
Writes <out>/<name>.json (boxes) and <out>/<name>.webp (floor texture with transparent surround).
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

PLANS = ['ground1', 'ground', '1st', '2nd', '3rd', '5th', '6th', '7th', '8th']
CELL = 3  # source pixels per grid cell
WALL, RAIL, LOW = 0, 1, 2  # box kinds: full-height wall, balcony railing, furniture block


def morph(mask, size, op):
    """Binary erosion (op='min') or dilation (op='max') with a square of `size` pixels."""
    im = Image.fromarray((mask * 255).astype(np.uint8))
    f = ImageFilter.MinFilter(size) if op == 'min' else ImageFilter.MaxFilter(size)
    return np.asarray(im.filter(f)) > 127


def opening(mask, size):
    return morph(morph(mask, size, 'min'), size, 'max')


def to_grid(mask, frac=0.3):
    h, w = mask.shape
    gh, gw = h // CELL, w // CELL
    m = mask[: gh * CELL, : gw * CELL].reshape(gh, CELL, gw, CELL).mean(axis=(1, 3))
    return m > frac


def components(grid):
    """4-connected components: yields lists of (y, x) cells."""
    seen = np.zeros_like(grid, dtype=bool)
    h, w = grid.shape
    for y0, x0 in zip(*np.nonzero(grid)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        cells = []
        while q:
            y, x = q.popleft()
            cells.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and grid[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        yield cells


def greedy_boxes(grid):
    """Merge filled cells into rectangles: [x, y, w, h] in grid cells."""
    g = grid.copy()
    h, w = g.shape
    out = []
    for y in range(h):
        x = 0
        while x < w:
            if not g[y, x]:
                x += 1
                continue
            x1 = x
            while x1 < w and g[y, x1]:
                x1 += 1
            y1 = y + 1
            while y1 < h and g[y1, x:x1].all():
                y1 += 1
            g[y:y1, x:x1] = False
            out.append([int(x), int(y), int(x1 - x), int(y1 - y)])
            x = x1
    return out


def footprint(a):
    """The building's outline: everything drawn, closed up, holes filled, largest piece kept."""
    drawn = a.min(axis=2) < 205
    drawn &= ~((a[..., 1] - a[..., 0] > 25) & (a[..., 1] - a[..., 2] > 10))  # not the green floor titles
    g = to_grid(drawn, 0.05)
    g = morph(g, 9, 'max')
    # fill holes: flood the outside from the border, the rest is inside
    h, w = g.shape
    outside = np.zeros_like(g)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if 0 <= y < h and 0 <= x < w and not g[y, x] and not outside[y, x]:
            outside[y, x] = True
            q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    filled = ~outside
    filled = morph(filled, 9, 'min')
    best = max(components(filled), key=len)
    keep = np.zeros_like(filled)
    for y, x in best:
        keep[y, x] = True
    return keep


def build(src, out_dir, name):
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # gold walls, minus the filled number badges
    yellow = (r > 180) & (g > 140) & (b < 120) & (r - b > 90)
    # badges: fill the white digits first (closing), then keep only big solid shapes
    closed = morph(morph(yellow, 9, 'max'), 9, 'min')
    badges = morph(opening(closed, 15), 9, 'max')
    yellow &= ~badges
    # walls are 3 px or more, balcony outlines 1-2 px: grow by 1 px, then keep what is 5 px thick
    thick = opening(morph(yellow, 3, 'max'), 5) & morph(yellow, 3, 'max')
    thin = yellow & ~morph(thick, 5, 'max')

    # solid grey: cores and walls (rings, long bars) or beds (filled blocks)
    grey = (np.abs(r - g) < 12) & (np.abs(g - b) < 12) & (r > 90) & (r < 175)
    grey = opening(grey, 5)

    foot = footprint(a)
    walls, rails, low = to_grid(thick), to_grid(thin, 0.2) & ~to_grid(thick), np.zeros_like(foot)
    for cells in components(to_grid(grey, 0.5)):
        if len(cells) < 6:
            continue
        ys, xs = zip(*cells)
        bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        fill = len(cells) / (bw * bh)
        target = walls if fill < 0.65 or max(bw, bh) / min(bw, bh) > 4 else low
        for y, x in cells:
            target[y, x] = True
    # only what is inside the building
    walls &= foot; rails &= foot; low &= foot & ~walls

    # crop to the outline (+ a margin), so the model is centred
    ys, xs = np.nonzero(foot)
    m = 4
    y0, y1 = max(0, ys.min() - m), min(foot.shape[0], ys.max() + m + 1)
    x0, x1 = max(0, xs.min() - m), min(foot.shape[1], xs.max() + m + 1)
    crop = lambda gr: gr[y0:y1, x0:x1]
    boxes = [[*bx, WALL] for bx in greedy_boxes(crop(walls))] + \
            [[*bx, RAIL] for bx in greedy_boxes(crop(rails))] + \
            [[*bx, LOW] for bx in greedy_boxes(crop(low))]

    # floor texture: the drawing inside the outline, transparent outside, soft edge
    img = Image.open(src).convert('RGB').crop((x0 * CELL, y0 * CELL, x1 * CELL, y1 * CELL))
    alpha = Image.fromarray((crop(foot) * 255).astype(np.uint8)).resize(img.size, Image.NEAREST).filter(ImageFilter.GaussianBlur(2))
    # and never the green floor title, even where it touches the building
    ca = np.asarray(img).astype(np.int16)
    title = (ca[..., 1] - ca[..., 0] > 25) & (ca[..., 1] - ca[..., 2] > 10)
    title = morph(title, 15, 'max')
    alpha = Image.fromarray(np.where(title, 0, np.asarray(alpha)).astype(np.uint8))
    img.putalpha(alpha)
    tex_w = 1400
    if img.width > tex_w:
        img = img.resize((tex_w, round(img.height * tex_w / img.width)), Image.LANCZOS)
    img.save(os.path.join(out_dir, f'{name}.webp'), 'WEBP', quality=78, method=6)

    data = {'w': int(x1 - x0), 'h': int(y1 - y0), 'boxes': boxes}
    with open(os.path.join(out_dir, f'{name}.json'), 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    kinds = [sum(1 for bx in boxes if bx[4] == k) for k in (WALL, RAIL, LOW)]
    print(f'{name}: grid {data["w"]}x{data["h"]}, boxes walls/rails/low = {kinds}')


if __name__ == '__main__':
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for n in PLANS:
        build(os.path.join(src_dir, f'{n}.webp'), out_dir, n)
