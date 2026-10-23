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

/** Resolves when the hero has drawn its first frame, or straight away without WebGL, or after `maxMs`. */
export function whenHeroReady(maxMs = 8000) {
  return new Promise<void>((resolve) => {
    if (heroState.ready || !hasWebGL()) return resolve()
    const done = () => { window.removeEventListener('hero-ready', done); clearTimeout(t); resolve() }
    const t = window.setTimeout(done, maxMs)
    window.addEventListener('hero-ready', done)
  })
}
