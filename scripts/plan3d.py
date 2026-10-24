"""Turn the floor-plan drawings into data for the 3D floor viewer.

The drawings draw unit and outside walls as thick gold lines, balconies as thin gold
outlines, lift and stair cores as grey rings and beds as solid grey blocks. This finds each
of those by colour and shape, snaps them to a grid and merges them into as few boxes as
possible. It then splits the floor into areas between the walls and paints a realistic floor
texture: stone where an area reaches the lift cores (lobby, corridors), decking where it is
edged by balcony railings, oak everywhere else (the apartments), with soft shadow along walls.

Usage: python scripts/plan3d.py public/media/plans public/data/plans3d
Writes <out>/<name>.json (walls, railings, beds) and <out>/<name>.webp (floor texture, transparent outside).
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

PLANS = ['ground1', 'ground', '1st', '2nd', '3rd', '5th', '6th', '7th', '8th']
CELL = 3  # source pixels per grid cell
WALL, RAIL = 0, 1  # box kinds: full-height wall, balcony railing


def morph(mask, size, op):
    """Binary erosion (op='min') or dilation (op='max') with a square of `size` pixels."""
    im = Image.fromarray((mask * 255).astype(np.uint8))
    f = ImageFilter.MinFilter(size) if op == 'min' else ImageFilter.MaxFilter(size)
    return np.asarray(im.filter(f)) > 127


def opening(mask, size):
    return morph(morph(mask, size, 'min'), size, 'max')


def long_runs(mask, length):
    """Pixels that belong to a horizontal run of at least `length`."""
    out = np.zeros_like(mask)
    for i, row in enumerate(mask):
        d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
        for s_, e_ in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]):
            if e_ - s_ >= length:
                out[i, s_:e_] = True
    return out


def bridge(mask, gap, axis):
    """Fill runs of empty cells no longer than `gap` lying between filled cells, along one axis."""
    m = mask if axis == 1 else mask.T
    out = m.copy()
    for i, row in enumerate(m):
        idx = np.nonzero(row)[0]
        if len(idx) < 2:
            continue
        for a_, b_ in zip(idx[:-1], idx[1:]):
            if 1 < b_ - a_ <= gap:
                out[i, a_:b_] = True
    return out if axis == 1 else out.T


def density(mask, radius):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(radius))).astype(np.float32) / 255


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
    walls, rails = to_grid(thick), to_grid(thin, 0.2) & ~to_grid(thick)
    cores = np.zeros_like(foot)
    beds = []
    for cells in components(to_grid(grey, 0.5)):
        if len(cells) < 6:
            continue
        ys, xs = zip(*cells)
        bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        fill = len(cells) / (bw * bh)
        if fill < 0.65 or max(bw, bh) / min(bw, bh) > 4:
            for y, x in cells:
                cores[y, x] = True
        elif min(bw, bh) >= 8 and max(bw, bh) >= 12:  # bed-sized: tables and counters are smaller
            beds.append([min(xs), min(ys), bw, bh])
    walls |= cores
    # only what is inside the building
    walls &= foot
    rails &= foot
    cores &= foot
    # railings belong to the balconies along the edge; thin gold lines further in are either
    # thinner partition walls (long runs) or dashed marks and door lines (scraps, dropped)
    edge_band = foot & ~morph(foot, 31, 'min')
    inner = rails & ~edge_band
    rails &= edge_band
    for cells in components(inner):
        if len(cells) >= 25:
            for y, x in cells:
                walls[y, x] = True

    # ---- rooms ----
    # Lobbies and corridors are drawn with a tile grid: long thin lines running both ways.
    grey_l = a.min(axis=2) < 225
    thin_l = grey_l & ~morph(grey_l, 3, 'min')
    tile = np.minimum(density(long_runs(thin_l, 60), 25), density(long_runs(thin_l.T, 60).T, 25))
    tile = tile > 0.22 * max(tile.max(), 1e-6)
    bed_px = np.zeros_like(tile)
    for x, y, w, h in beds:
        bed_px[(y - 3) * CELL:(y + h + 3) * CELL, (x - 3) * CELL:(x + w + 3) * CELL] = True
    tile &= ~bed_px  # bed covers are hatched too
    circ = morph(morph(to_grid(tile, 0.12), 13, 'max'), 13, 'min') & foot
    keep = np.zeros_like(circ)
    for cells in components(circ):
        if len(cells) >= 300:
            for y, x in cells:
                keep[y, x] = True
    circ = keep
    # only tiled areas joined to the lift cores are lobby and corridor (some rooms are tiled too)
    near_core = morph(cores, 15, 'max')
    keep = np.zeros_like(circ)
    for cells in components(circ):
        ys_, xs_ = zip(*cells)
        if near_core[ys_, xs_].any():
            for y, x in cells:
                keep[y, x] = True
    circ = (bridge(keep, 90, axis=1) | bridge(keep, 90, axis=0)) & foot & ~morph(walls, 3, 'max')
    # Balconies: the strip along the building's edge, about a balcony deep, where railings run.
    edge = foot & ~morph(foot, 25, 'min')
    deck = edge & morph(rails, 21, 'max') & ~circ
    keep = np.zeros_like(deck)
    for cells in components(deck):
        if len(cells) >= 40:
            for y, x in cells:
                keep[y, x] = True
    deck = keep
    STONE, WOOD, DECK = 1, 2, 3
    rooms = np.where(circ, STONE, np.where(deck, DECK, np.where(foot, WOOD, 0)))

    # beds: the head goes against the nearer wall at either short end
    bed_out = []
    for x, y, w, h in beds:
        if w > h:
            left = walls[y:y + h, max(0, x - 6):x].sum()
            right = walls[y:y + h, x + w:x + w + 6].sum()
            head = 3 if left >= right else 1  # 3 = head toward -x, 1 = toward +x
        else:
            top = walls[max(0, y - 6):y, x:x + w].sum()
            bottom = walls[y + h:y + h + 6, x:x + w].sum()
            head = 0 if top >= bottom else 2  # 0 = head toward -y, 2 = toward +y
        bed_out.append([x, y, w, h, head])

    # crop to the outline (+ a margin), so the model is centred
    ys, xs = np.nonzero(foot)
    m = 4
    y0, y1 = max(0, ys.min() - m), min(foot.shape[0], ys.max() + m + 1)
    x0, x1 = max(0, xs.min() - m), min(foot.shape[1], xs.max() + m + 1)
    crop = lambda gr: gr[y0:y1, x0:x1]
    boxes = [[*bx, WALL] for bx in greedy_boxes(crop(walls))] + \
            [[*bx, RAIL] for bx in greedy_boxes(crop(rails))]
    bed_out = [[int(x - x0), int(y - y0), int(w), int(h), hd] for x, y, w, h, hd in bed_out if y0 <= y < y1 and x0 <= x < x1]

    # ---- floor texture: oak in the apartments, stone in the lobby, decking on balconies ----
    tex_w = 1400
    gw, gh = int(x1 - x0), int(y1 - y0)
    tw, th = tex_w, round(tex_w * gh / gw)
    up = lambda gr, res=Image.NEAREST: np.asarray(Image.fromarray(gr.astype(np.uint8)).resize((tw, th), res))
    room_t = up(crop(rooms))
    rng = np.random.default_rng(7)
    yy, xx = np.mgrid[0:th, 0:tw]
    px = tw / gw  # texture pixels per grid cell

    def planks(base, plank_w, plank_l, vary, grain):
        row = (yy // plank_w).astype(np.int64)
        off = ((row * 7919) % 13) / 13.0 * plank_l
        col = ((xx + off) // plank_l).astype(np.int64)
        tone = (((row * 73856093) ^ (col * 19349663)) % 1000) / 1000.0 - 0.5
        # grain: noise that changes quickly across a plank and slowly along it
        streak = np.asarray(Image.fromarray((rng.random((th, max(1, tw // 24))) * 255).astype(np.uint8)).resize((tw, th), Image.BILINEAR)).astype(np.float32) / 255 - 0.5
        c = np.array(base, np.float32)[None, None, :] * (1 + vary * tone + grain * streak)[..., None]
        seam = ((yy % plank_w) == 0) | (((xx + off) % plank_l) < 1)
        c[seam] *= 0.78
        return c

    def tiles(base, size):
        c = np.array(base, np.float32)[None, None, :] * (1 + rng.normal(0, 0.025, (th, tw)))[..., None]
        joint = ((yy % size) < 1) | ((xx % size) < 1)
        c[joint] *= 0.82
        return c

    oak = planks((190, 146, 101), max(4, int(px * 2.4)), int(px * 26), 0.16, 0.12)
    deck = planks((128, 116, 104), max(4, int(px * 2.8)), int(px * 30), 0.10, 0.08)
    stone = tiles((222, 219, 211), max(8, int(px * 9)))
    floor = np.where((room_t == STONE)[..., None], stone, np.where((room_t == DECK)[..., None], deck, oak))
    # soft contact shadow along the walls
    wall_t = up(crop(walls) * 255, Image.BILINEAR)
    ao = np.asarray(Image.fromarray(wall_t).filter(ImageFilter.GaussianBlur(px * 1.6))).astype(np.float32) / 255
    floor = floor * (1 - 0.32 * np.clip(ao * 1.8, 0, 1))[..., None]
    # faint print of the drawing's furniture and room names, like a shadow of the fittings
    ink = np.asarray(Image.open(src).convert('L').crop((x0 * CELL, y0 * CELL, x1 * CELL, y1 * CELL)).resize((tw, th), Image.LANCZOS)).astype(np.float32) / 255
    floor = floor * (1 - 0.3 * np.clip((0.85 - ink) / 0.85, 0, 1))[..., None]
    img = Image.fromarray(np.clip(floor, 0, 255).astype(np.uint8))
    alpha = np.asarray(Image.fromarray((crop(foot) * 255).astype(np.uint8)).resize((tw, th), Image.NEAREST).filter(ImageFilter.GaussianBlur(1.5)))
    # never the drawing's green floor title, even where it touches the building
    src_t = np.asarray(Image.open(src).convert('RGB').crop((x0 * CELL, y0 * CELL, x1 * CELL, y1 * CELL)).resize((tw, th))).astype(np.int16)
    title = morph((src_t[..., 1] - src_t[..., 0] > 25) & (src_t[..., 1] - src_t[..., 2] > 10), 15, 'max')
    img.putalpha(Image.fromarray(np.where(title, 0, alpha).astype(np.uint8)))
    img.save(os.path.join(out_dir, f'{name}.webp'), 'WEBP', quality=82, method=6)

    data = {'w': gw, 'h': gh, 'boxes': boxes, 'beds': bed_out}
    with open(os.path.join(out_dir, f'{name}.json'), 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    share = lambda k: round(100 * float((rooms == k).sum()) / max(1, int(foot.sum())))
    print(f'{name}: grid {gw}x{gh}, walls {sum(1 for bx in boxes if bx[4] == WALL)}, rails {sum(1 for bx in boxes if bx[4] == RAIL)}, '
          f'beds {len(bed_out)}, floor stone/oak/deck = {share(STONE)}/{share(WOOD)}/{share(DECK)} %')


if __name__ == '__main__':
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for n in sys.argv[3:] or PLANS:  # optionally just the named plans
        build(os.path.join(src_dir, f'{n}.webp'), out_dir, n)
