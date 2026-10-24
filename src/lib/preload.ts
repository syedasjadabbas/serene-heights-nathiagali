import { hasWebGL } from './device'
import { heroState } from '../three/heroState'
import { gallery, seasons } from '../data/site'

// Start fetching the 3D engine and every scene the moment the page opens, in parallel with
// React booting, instead of waiting for each canvas to be noticed on screen. The scene
// chunks are small; the map's elevation grid and the section photos follow as soon as the
// hero has drawn, so later sections are ready before the visitor scrolls to them.
let started = false
export function startPreload() {
  if (started || typeof window === 'undefined') return
  started = true
  void whenHeroReady().then(() => {
    window.setTimeout(warmImages, 300)
  })
  if (!hasWebGL()) return
  void import('../three/CanvasHost')
  void import('../three/HeroScene')
  void import('../three/SeasonScene')
  void import('../three/SelectorScene')
  void import('../three/GalleryScene')
  void import('../three/MapScene')
  void whenHeroReady().then(() => import('../three/geo').then((g) => g.loadDem()))
}

// Section photos are lazy-loaded so they never compete with the hero; once it is up, fetch
// them all in page order, then the photos the season and gallery scenes use as textures,
// so nothing pops in during the scroll.
function warmImages() {
  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]'))
  // the same sizes the 3D scenes ask for (Seasons.tsx, Gallery.tsx), so they come from cache
  const small = window.innerWidth < 760
  const sized = (src: string) => (small ? src.replace(/\.webp$/, '-960.webp') : src)
  const textures = hasWebGL() ? [seasons.winter.img, seasons.summer.img, ...gallery.map((g) => g.src)].map(sized) : []
  let i = 0
  const next = () => {
    // a few at a time, so the network stays free for anything the visitor does
    for (let n = 0; n < 4 && i < imgs.length; n++, i++) imgs[i].loading = 'eager'
    if (i < imgs.length) window.setTimeout(next, 150)
    else textures.forEach((src) => {
      // the 3D scenes load these as cross-origin textures; ask the same way so the cached copy is reused
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
    })
  }
  next()
}

// ---- background pre-mount of the 3D sections ----
// After the hero has appeared, each queued 3D section is mounted one at a time in idle
// moments: it builds its geometry and compiles its shaders while the visitor is still at
// the top, so it is already there when they scroll to it.
type Job = { order: number; run: () => void; cancelled: boolean }
const queue: Job[] = []
let draining = false
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
// the hero animates continuously, so a true idle moment may never come: wait briefly at most
const idleTick = () => new Promise<void>((r) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => r(), { timeout: 250 }) : setTimeout(r, 100))

export function queuePremount(order: number, run: () => void) {
  const job: Job = { order, run, cancelled: false }
  queue.push(job)
  queue.sort((a, b) => a.order - b.order)
  void drain()
  return () => { job.cancelled = true }
}

async function drain() {
  if (draining) return
  draining = true
  await whenHeroReady()
  await sleep(300) // let the hero's first frames settle
  while (queue.length) {
    const job = queue.shift()!
    if (job.cancelled) continue
    await idleTick()
    job.run()
    await sleep(150) // one scene at a time, so the page never stalls
  }
  draining = false
}

/** Resolves when the hero has drawn its first frame, or straight away without WebGL, or after `maxMs`. */
export function whenHeroReady(maxMs = 8000) {
  return new Promise<void>((resolve) => {
    if (heroState.ready || !hasWebGL()) return resolve()
    const done = () => { window.removeEventListener('hero-ready', done); clearTimeout(t); resolve() }
    const t = window.setTimeout(done, maxMs)
    window.addEventListener('hero-ready', done)
  })
}
