import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
// phones resize the viewport as the address bar hides; don't recalculate every pin for that
ScrollTrigger.config({ ignoreMobileResize: true })

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null

// Smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis stay in sync.
export function startSmoothScroll() {
  if (lenis || reducedMotion) return lenis
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
  lenis.on('scroll', ScrollTrigger.update)
  lenis.scrollTo(0, { immediate: true, force: true })
  gsap.ticker.add((t) => lenis?.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function scrollTo(target: string | HTMLElement) {
  if (lenis) { lenis.resize(); lenis.scrollTo(target, { duration: 1.6 }) }
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }
}

// Jump without animation, even while scrolling is locked.
export function jumpTo(y: number) {
  // re-measure first: after a page change the old page's height may still be cached
  if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }) }
  else window.scrollTo(0, y)
}

export function lockScroll(locked: boolean) {
  if (lenis) locked ? lenis.stop() : lenis.start()
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

export { gsap, ScrollTrigger }
