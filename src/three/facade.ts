import * as THREE from 'three'

// Facade textures drawn once on canvases, after the renders: cream stucco, dark-framed arched
// French windows (some lit warm from inside), black balcony railings and a stone base.

export const BAY = 0.42 // world width of one window bay
const BAYS = 4 // bays per texture tile, so lit windows don't repeat in an obvious rhythm
const STUCCO = '#ece4d5'
const FRAME = '#2a2623'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function toTexture(c: HTMLCanvasElement, transparent = false) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 4
  if (transparent) t.premultiplyAlpha = false
  return t
}

// soft plaster noise so the walls don't read as flat plastic
function plaster(g: CanvasRenderingContext2D, w: number, h: number, base: string, seed: number) {
  g.fillStyle = base
  g.fillRect(0, 0, w, h)
  let s = seed
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let i = 0; i < w * h * 0.02; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(80,60,40,0.05)'
    g.fillRect(r() * w, r() * h, 2, 2)
  }
}

function archWindow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: boolean) {
  const r = w / 2
  const path = () => {
    g.beginPath()
    g.moveTo(x, y + h)
    g.lineTo(x, y + r)
    g.arc(x + r, y + r, r, Math.PI, 0)
    g.lineTo(x + w, y + h)
    g.closePath()
  }
  // frame
  path()
  g.fillStyle = FRAME
  g.fill()
  // glass: warm interior light, or dusk reflection
  const inset = w * 0.1
  const glass = g.createLinearGradient(0, y, 0, y + h)
  if (lit) {
    glass.addColorStop(0, '#f6dcae')
    glass.addColorStop(1, '#d9a46c')
  } else {
    glass.addColorStop(0, '#5d6d6c')
    glass.addColorStop(1, '#2f3a39')
  }
  // inner pane, drawn as a slightly smaller arch
  const ix = x + inset, iy = y + inset, iw = w - inset * 2, ih = h - inset
  const ir = iw / 2
  g.beginPath()
  g.moveTo(ix, iy + ih)
  g.lineTo(ix, iy + ir)
  g.arc(ix + ir, iy + ir, ir, Math.PI, 0)
  g.lineTo(ix + iw, iy + ih)
  g.closePath()
  g.fillStyle = glass
  g.fill()
  // mullions
  g.strokeStyle = FRAME
  g.lineWidth = Math.max(2, w * 0.05)
  g.beginPath()
  g.moveTo(x + w / 2, iy)
  g.lineTo(x + w / 2, y + h)
  g.moveTo(ix, iy + ir)
  g.lineTo(ix + iw, iy + ir)
  g.stroke()
}

let cache: ReturnType<typeof build> | null = null
export function facadeTextures() {
  return (cache ??= build())
}

function build() {
  // residential floor tiles: three variants with different lit windows
  const floors = [0, 1, 2].map((v) => {
    const W = 512, H = 160
    const [c, g] = canvas(W, H)
    plaster(g, W, H, STUCCO, 11 + v * 97)
    const bw = W / BAYS
    let s = 3 + v * 31
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    for (let b = 0; b < BAYS; b++) {
      const ww = bw * 0.5
      archWindow(g, b * bw + (bw - ww) / 2, H * 0.12, ww, H * 0.86, r() < 0.45)
    }
    // floor line: slab edge in shadow
    g.fillStyle = 'rgba(60,45,35,0.35)'
    g.fillRect(0, H - 5, W, 5)
    return toTexture(c)
  })

  // top floor: bigger arches, all glowing, like the restaurant level in the renders
  const top = (() => {
    const W = 512, H = 160
    const [c, g] = canvas(W, H)
    plaster(g, W, H, STUCCO, 7)
    const bw = W / BAYS
    for (let b = 0; b < BAYS; b++) archWindow(g, b * bw + bw * 0.16, H * 0.06, bw * 0.68, H * 0.92, b % 3 !== 1)
    return toTexture(c)
  })()

  // ground floor: warm stone with tall glazed doors
  const lobby = (() => {
    const W = 512, H = 160
    const [c, g] = canvas(W, H)
    plaster(g, W, H, '#cbbfa9', 5)
    g.strokeStyle = 'rgba(90,70,50,0.25)'
    g.lineWidth = 2
    for (let y = 20; y < H; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
    const bw = W / BAYS
    for (let b = 0; b < BAYS; b++) {
      const x = b * bw + bw * 0.14, w = bw * 0.72
      g.fillStyle = FRAME
      g.fillRect(x, H * 0.12, w, H * 0.88)
      const glass = g.createLinearGradient(0, H * 0.12, 0, H)
      glass.addColorStop(0, b % 2 ? '#4f5d5b' : '#e8cfa2')
      glass.addColorStop(1, b % 2 ? '#2c3534' : '#b98b5c')
      g.fillStyle = glass
      g.fillRect(x + 5, H * 0.12 + 5, w - 10, H * 0.88 - 5)
      g.fillStyle = FRAME
      g.fillRect(x + w / 2 - 2, H * 0.12, 4, H * 0.88)
    }
    return toTexture(c)
  })()

  // balcony railing: black bars with a top rail, transparent between
  const rail = (() => {
    const W = 128, H = 64
    const [c, g] = canvas(W, H)
    g.clearRect(0, 0, W, H)
    g.fillStyle = '#1e1b19'
    g.fillRect(0, 0, W, 7)
    g.fillRect(0, H - 4, W, 4)
    for (let x = 4; x < W; x += 16) g.fillRect(x, 0, 4, H)
    return toTexture(c, true)
  })()

  // rooftop pavilion glazing: dark steel grid over warm-lit glass
  const glass = (() => {
    const W = 256, H = 128
    const [c, g] = canvas(W, H)
    const lit = g.createLinearGradient(0, 0, 0, H)
    lit.addColorStop(0, '#f7e2bd')
    lit.addColorStop(1, '#cf9a62')
    g.fillStyle = lit
    g.fillRect(0, 0, W, H)
    g.fillStyle = 'rgba(40,52,52,0.35)' // reflection band
    g.fillRect(0, 0, W, H * 0.3)
    g.fillStyle = FRAME
    for (let x = 0; x <= W; x += W / 6) g.fillRect(x - 3, 0, 6, H)
    g.fillRect(0, 0, W, 8)
    g.fillRect(0, H * 0.55, W, 4)
    g.fillRect(0, H - 8, W, 8)
    return toTexture(c)
  })()

  return { floors, top, lobby, rail, glass, bays: BAYS }
}

/** A copy of `base` tiled to fit a face `width` wide (copies share the drawn canvas). */
export function fitTexture(base: THREE.Texture, width: number, unit = BAY * BAYS) {
  const t = base.clone()
  t.repeat.set(Math.max(1, Math.round(width / unit * 2) / 2), 1)
  t.needsUpdate = true
  return t
}
