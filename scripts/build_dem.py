# Mosaic Terrarium tiles and resample to the site's map grid (1 unit = 1 km).
import glob, math, os, sys, json
import numpy as np
from PIL import Image
tiles_dir, out_bin = sys.argv[1], sys.argv[2]
Z = 11
LAT0, LON0, KM_LAT, KM_LON = 33.95, 73.26, 111.3, 92.3
X0, Z0, STEP, NX, NZ = -40.0, -44.0, 0.2, 371, 461

files = glob.glob(os.path.join(tiles_dir, f"{Z}_*_*.png"))
xs = sorted({int(os.path.basename(f).split('_')[1]) for f in files})
ys = sorted({int(os.path.basename(f).split('_')[2].split('.')[0]) for f in files})
W, H = len(xs) * 256, len(ys) * 256
mosaic = np.zeros((H, W), dtype=np.float32)
for f in files:
    _, x, y = os.path.basename(f)[:-4].split('_')
    a = np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)
    h = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    ox, oy = (int(x) - xs[0]) * 256, (int(y) - ys[0]) * 256
    mosaic[oy:oy + 256, ox:ox + 256] = h

gx = X0 + np.arange(NX) * STEP
gz = Z0 + np.arange(NZ) * STEP
GX, GZ = np.meshgrid(gx, gz)
lat = LAT0 - GZ / KM_LAT
lon = LON0 + GX / KM_LON
n = 2 ** Z * 256
px = (lon + 180) / 360 * n - xs[0] * 256
r = np.radians(lat)
py = (1 - np.log(np.tan(r) + 1 / np.cos(r)) / math.pi) / 2 * n - ys[0] * 256
x0 = np.clip(np.floor(px).astype(int), 0, W - 2); y0 = np.clip(np.floor(py).astype(int), 0, H - 2)
fx = np.clip(px - x0, 0, 1); fy = np.clip(py - y0, 0, 1)
v = (mosaic[y0, x0] * (1 - fx) * (1 - fy) + mosaic[y0, x0 + 1] * fx * (1 - fy)
     + mosaic[y0 + 1, x0] * (1 - fx) * fy + mosaic[y0 + 1, x0 + 1] * fx * fy)
grid = np.round(v).astype('<i2')
os.makedirs(os.path.dirname(out_bin), exist_ok=True)
grid.tofile(out_bin)

def at(la, lo):
    x = (lo - LON0) * KM_LON; z = -(la - LAT0) * KM_LAT
    i = int(round((z - Z0) / STEP)); j = int(round((x - X0) / STEP))
    return int(grid[i, j])
checks = {'Islamabad': (33.698, 73.06), 'Abbottabad': (34.168, 73.222), 'Murree': (33.907, 73.392),
          'Nathia Gali': (34.072, 73.385), 'Serene Heights': (34.0745, 73.379), 'Ayubia': (34.045, 73.402)}
print(json.dumps({'tiles': len(files), 'min': int(grid.min()), 'max': int(grid.max()),
                  'bytes': os.path.getsize(out_bin), **{k: at(*v) for k, v in checks.items()}}, indent=1))
