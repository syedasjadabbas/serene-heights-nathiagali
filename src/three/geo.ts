// Map geometry for the Galiyat. 1 world unit = 1 km.
// Places sit at their real coordinates. Terrain comes from real elevation data
// (AWS Terrain Tiles, Terrarium, zoom 11 ≈ 60 m/px) resampled to a 200 m grid in
// public/data/galiyat-dem.bin. If that file fails to load, a hand-shaped model of
// the same relief is used instead.

export const LAT0 = 33.95
export const LON0 = 73.26
const KM_LAT = 111.3
const KM_LON = 92.3 // at ~34° N

export const MAP_W = 74
export const MAP_D = 92
export const EXAG = 1.9 // vertical exaggeration

export function project(lat: number, lon: number): [number, number] {
  return [(lon - LON0) * KM_LON, -(lat - LAT0) * KM_LAT]
}

/* ---------- value noise ---------- */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y)
  let fx = x - ix, fy = y - iy
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
function ridged(x: number, y: number) {
  let v = 0, amp = 0.5, f = 1
  for (let i = 0; i < 6; i++) {
    const n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1)
    v += n * n * amp
    f *= 2.07; amp *= 0.5
  }
  return v
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// distance (km) from point to a ridge segment given in lat/lon, plus position along it
function segDist(x: number, z: number, a: [number, number], b: [number, number]) {
  const [ax, az] = project(a[0], a[1]), [bx, bz] = project(b[0], b[1])
  const dx = bx - ax, dz = bz - az
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
  return { d: Math.hypot(x - (ax + dx * t), z - (az + dz * t)), t }
}

/* ---------- real elevation grid ---------- */
// Int16 metres, row-major from (X0, Z0) in STEP km increments. Built by
// scripts/build_dem.py from the Terrarium tiles.
export const DEM = { x0: -40, z0: -44, step: 0.2, nx: 371, nz: 461 }
let dem: Int16Array | null = null
let demPromise: Promise<void> | null = null

export function loadDem() {
  demPromise ??= fetch('/data/galiyat-dem.bin')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
    .then((b) => { dem = new Int16Array(b) })
    .catch((e) => { console.warn('Elevation data unavailable, using modelled relief.', e) })
  return demPromise
}

function sampleDem(d: Int16Array, x: number, z: number) {
  const fx = Math.min(DEM.nx - 1.001, Math.max(0, (x - DEM.x0) / DEM.step))
  const fz = Math.min(DEM.nz - 1.001, Math.max(0, (z - DEM.z0) / DEM.step))
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j
  const r0 = j * DEM.nx, r1 = r0 + DEM.nx
  const a = d[r0 + i], b = d[r0 + i + 1], c = d[r1 + i], e = d[r1 + i + 1]
  return ((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz) / 1000
}

/** Elevation in km at world x,z. */
export function elevation(x: number, z: number) {
  return dem ? sampleDem(dem, x, z) : modelledElevation(x, z)
}

function modelledElevation(x: number, z: number) {
  // regional rise from the Potohar plains (SW) to the uplands (NE)
  const lat = LAT0 - z / KM_LAT, lon = LON0 + x / KM_LON
  let h = 0.5 + 0.55 * smooth(33.72, 33.95, lat) * smooth(72.95, 73.25, lon) + 0.3 * smooth(33.95, 34.15, lat)

  // Margalla hills above Islamabad
  const m = segDist(x, z, [33.745, 72.9], [33.78, 73.22])
  h += 0.62 * Math.exp(-((m.d / 2.6) ** 2))

  // Murree – Galiyat ridge, highest around Nathia Gali / Miranjani
  const g = segDist(x, z, [33.8, 73.3], [34.13, 73.43])
  const gAmp = 1.45 + 0.1 * smooth(0.25, 0.75, g.t) - 0.25 * smooth(0.85, 1, g.t)
  h += gAmp * Math.exp(-((g.d / 7) ** 2))

  // Sarban and the hills north of Abbottabad
  const s = segDist(x, z, [34.24, 73.08], [34.28, 73.38])
  h += 0.8 * Math.exp(-((s.d / 5.5) ** 2))

  // Abbottabad valley floor
  const [abx, abz] = project(34.168, 73.222)
  h -= 0.12 * Math.exp(-((Math.hypot(x - abx, z - abz) / 7) ** 2))

  // Jhelum river valley to the east
  h -= 0.75 * smooth(73.47, 73.58, lon)

  // crags and spurs, stronger on high ground
  const relief = 0.1 + 0.3 * smooth(0.8, 2.2, h)
  h += (ridged(x * 0.09 + 3.1, z * 0.09 - 1.7) - 0.35) * relief
  return Math.max(0.35, h)
}

export type Place = { name: string; note?: string; lat: number; lon: number; size: number; kind: 'city' | 'town' | 'home'; label?: boolean }

export const SERENE: Place = { name: 'Serene Heights', note: '7,906 ft · 50 m from PAF Airbase Nathia Gali', lat: 34.0745, lon: 73.379, size: 0, kind: 'home' }

export const PLACES: Place[] = [
  { name: 'Islamabad', note: '80 km · 2 hr drive', lat: 33.698, lon: 73.06, size: 1600, kind: 'city' },
  { name: 'Abbottabad', note: '35 km · 50 min', lat: 34.168, lon: 73.222, size: 700, kind: 'city' },
  { name: 'Murree', note: 'Hill station on the way up', lat: 33.907, lon: 73.392, size: 320, kind: 'town' },
  { name: 'Ayubia', lat: 34.045, lon: 73.402, size: 60, kind: 'town' },
  { name: 'Nathia Gali', note: 'Main bazaar · 5 km', lat: 34.072, lon: 73.385, size: 90, kind: 'town', label: false },
  { name: 'Bhurban', lat: 33.958, lon: 73.45, size: 50, kind: 'town' },
  { name: 'Changla Gali', lat: 34.01, lon: 73.382, size: 30, kind: 'town', label: false },
]

/** Places that get an on-map label, in label order (Serene Heights last). */
export const LABELLED: Place[] = [...PLACES.filter((p) => p.label !== false), SERENE]

// Expressway and Murree road through the Galiyat, approximate alignment.
export const ROUTE_MAIN: [number, number][] = [
  [33.698, 73.06], [33.722, 73.12], [33.738, 73.175], [33.77, 73.235], [33.81, 73.27],
  [33.85, 73.31], [33.885, 73.36], [33.907, 73.392], [33.94, 73.395], [33.975, 73.378],
  [34.01, 73.382], [34.03, 73.397], [34.045, 73.402], [34.062, 73.398], [34.072, 73.385], [34.0745, 73.379],
]
// Abbottabad – Nawansher – Bagnotar – Nathia Gali road.
export const ROUTE_ABBOTTABAD: [number, number][] = [
  [34.168, 73.222], [34.16, 73.26], [34.14, 73.29], [34.115, 73.315], [34.095, 73.345], [34.08, 73.365], [34.0745, 73.379],
]
