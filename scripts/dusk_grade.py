"""Dusk colour grade for daytime renders: replace the blue sky with a pine-to-amber dusk sky,
tint shadows toward the site's pine green, warm the highlights, add a vignette.
The building and landscape are only re-lit, never altered."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

def grade(src, dst_full, dst_small, sky_bias=0.0, cloud_bias=0.02, grow=3):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    sat = a.max(-1) - a.min(-1)
    # sky candidates: blue sky, or bright low-saturation cloud
    # clouds must lean blue (the white facade leans warm), and sky only lives in the upper part
    upper = (np.arange(H) < H * 0.72)[:, None]
    cand = (((b > r + 0.04 + sky_bias) & (lum > 0.45)) | ((lum > 0.66) & (sat < 0.16) & (b > r + cloud_bias))) & upper
    # keep only sky connected to the top edge (row-by-row propagation with 3 px spread)
    sky = np.zeros_like(cand)
    sky[0] = cand[0]
    for y in range(1, H):
        prev = sky[y - 1]
        spread = prev | np.roll(prev, 1) | np.roll(prev, -1) | np.roll(prev, 2) | np.roll(prev, -2)
        sky[y] = cand[y] & spread
    mask = Image.fromarray((sky * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(5))
    m = np.asarray(mask).astype(np.float32)[..., None] / 255.0

    # dusk sky: deep pine at the top to a warm amber glow near the sky's lowest point
    rows = np.where(sky.any(1))[0]
    horizon = rows.max() if len(rows) else H // 2
    t = np.clip(np.arange(H) / max(horizon, 1), 0, 1)[:, None, None]
    top = np.array([0.07, 0.15, 0.13]); mid = np.array([0.30, 0.33, 0.30]); low = np.array([0.86, 0.60, 0.43])
    grad = np.where(t < 0.55, top + (mid - top) * (t / 0.55), mid + (low - mid) * ((t - 0.55) / 0.45))
    grad = np.broadcast_to(grad, (H, W, 3))
    cloud = (lum[..., None] - lum[sky].mean() if sky.any() else 0)
    new_sky = np.clip(grad * (1.0 + cloud * 1.1), 0, 1)
    out = a * (1 - m) + new_sky * m

    # re-light the scene: lower exposure, pine shadows, warm highlights, gentle contrast
    L = (0.2126 * out[..., 0] + 0.7152 * out[..., 1] + 0.0722 * out[..., 2])[..., None]
    scene = out * 0.80
    pine = np.array([0.09, 0.20, 0.16]); warm = np.array([1.0, 0.82, 0.62])
    scene = scene * (1 - (1 - L) ** 2 * 0.38) + pine * ((1 - L) ** 2 * 0.38)
    scene = scene * (1 - L ** 2 * 0.3) + warm * L * (L ** 2 * 0.3)
    scene = scene * np.array([1.04, 0.99, 0.93])  # overall warmth, toward the sunset rooftop shot
    scene = np.clip((scene - 0.5) * 1.06 + 0.5, 0, 1)
    out = out * m + scene * (1 - m)

    # vignette
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    out = out * (1 - np.clip(d - 0.55, 0, 1)[..., None] * 0.45)

    res = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    res.save(dst_full, 'WEBP', quality=80, method=6)
    small = res.copy(); small.thumbnail((960, 960 * res.height // res.width), Image.LANCZOS)
    small.save(dst_small, 'WEBP', quality=78, method=6)
    return res

def grade_graduated(src, dst_full, dst_small):
    """Dusk by graduated filter: no sky cut-out, so no halos around pale facades."""
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    H, W, _ = a.shape
    t = (np.arange(H) / H)[:, None, None]
    # multiply filter: pine at the top, warm amber near the middle, clear below 62 %
    top = np.array([0.26, 0.40, 0.37]); warmband = np.array([1.0, 0.80, 0.64])
    f = np.where(t < 0.42, top + (warmband - top) * (t / 0.42), warmband + (1 - warmband) * np.clip((t - 0.42) / 0.20, 0, 1))
    out = a * f
    # soft amber glow along the horizon band
    glow = np.exp(-((t - 0.46) / 0.07) ** 2) * np.array([0.22, 0.11, 0.04])
    out = np.clip(out + glow * (1 - out), 0, 1)
    # same scene re-light as the sky-replacement grade
    L = (0.2126 * out[..., 0] + 0.7152 * out[..., 1] + 0.0722 * out[..., 2])[..., None]
    scene = out * 0.86
    pine = np.array([0.09, 0.20, 0.16]); warm = np.array([1.0, 0.82, 0.62])
    scene = scene * (1 - (1 - L) ** 2 * 0.36) + pine * ((1 - L) ** 2 * 0.36)
    scene = scene * (1 - L ** 2 * 0.3) + warm * L * (L ** 2 * 0.3)
    scene = scene * np.array([1.04, 0.99, 0.93])
    out = np.clip((scene - 0.5) * 1.06 + 0.5, 0, 1)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    out = out * (1 - np.clip(d - 0.55, 0, 1)[..., None] * 0.45)
    res = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    res.save(dst_full, 'WEBP', quality=80, method=6)
    small = res.copy(); small.thumbnail((960, 960 * res.height // res.width), Image.LANCZOS)
    small.save(dst_small, 'WEBP', quality=78, method=6)
    return res


if __name__ == '__main__':
    # usage: python scripts/dusk_grade.py public/media/terraces.webp
    # writes <name>-dusk.webp and <name>-dusk-960.webp next to the source
    src = sys.argv[1]
    base = src[:-5]
    grade_graduated(src, base + '-dusk.webp', base + '-dusk-960.webp')
    print('wrote', base + '-dusk.webp')
