import { hasWebGL } from './device'
import { heroState } from '../three/heroState'

// Start fetching the 3D engine and the hero scene the moment the page opens, in parallel
// with React booting, instead of waiting for the hero canvas to be noticed on screen.
// The other scenes and the map's elevation grid follow when the browser is idle, so later
// sections are ready before the visitor scrolls to them.
let started = false
export function startPreload() {
  if (started || typeof window === 'undefined' || !hasWebGL()) return
  started = true
  void import('../three/CanvasHost')
  void import('../three/HeroScene')
  // Safari has no requestIdleCallback
  const idle = (fn: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500)
  idle(() => {
    void import('../three/SeasonScene')
    void import('../three/SelectorScene')
    void import('../three/GalleryScene')
    void import('../three/MapScene')
    void import('../three/geo').then((g) => g.loadDem())
  })
}

// ---- background pre-mount of the 3D sections ----
// After the hero has appeared and its intro has played, each queued 3D section is mounted
// one at a time in idle moments: it builds its geometry and compiles its shaders while the
// visitor is still at the top, so it is already there when they scroll to it.
type Job = { order: number; run: () => void; cancelled: boolean }
const queue: Job[] = []
let draining = false
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const idleTick = () => new Promise<void>((r) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => r(), { timeout: 1200 }) : setTimeout(r, 200))

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
  await sleep(1500) // let the hero intro play smoothly first
  while (queue.length) {
    const job = queue.shift()!
    if (job.cancelled) continue
    await idleTick()
    job.run()
    await sleep(500) // one scene at a time, so the page never stalls
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
