import math, os, sys, time, urllib.request
from PIL import Image
out = sys.argv[1]
Z = 11
LAT_MIN, LAT_MAX, LON_MIN, LON_MAX = 33.50, 34.37, 72.80, 73.66
def tx(lon): return int((lon + 180) / 360 * 2**Z)
def ty(lat):
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**Z)
xs = range(tx(LON_MIN), tx(LON_MAX) + 1)
ys = range(ty(LAT_MAX), ty(LAT_MIN) + 1)
total = 0
for x in xs:
    for y in ys:
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png"
        dst = os.path.join(out, f"{Z}_{x}_{y}.png")
        if os.path.exists(dst):
            try:
                Image.open(dst).verify()
            except Exception:
                os.remove(dst)
        for attempt in range(4):
            if os.path.exists(dst):
                break
            try:
                with urllib.request.urlopen(url, timeout=30) as r:
                    data = r.read()
                with open(dst + '.part', 'wb') as f:
                    f.write(data)
                os.replace(dst + '.part', dst)
                print('got', os.path.basename(dst), flush=True)
            except Exception as e:
                print('retry', os.path.basename(dst), e, flush=True)
                time.sleep(2)
        total += os.path.getsize(dst)
print("tiles x", list(xs)[0], "-", list(xs)[-1], " y", list(ys)[0], "-", list(ys)[-1], " count", len(xs) * len(ys), " bytes", total)
