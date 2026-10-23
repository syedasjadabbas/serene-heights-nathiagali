import { lazy, useEffect, useRef } from 'react'
import { LazyCanvas, SceneFallback } from './common'
import { heroState } from '../three/heroState'
import { gsap, scrollTo } from '../lib/scroll'

const HeroScene = lazy(() => import('../three/HeroScene').then((m) => ({ default: m.HeroScene })))

const lite = typeof window !== 'undefined' && (window.innerWidth < 760 || navigator.hardwareConcurrency <= 4)

// Pinned for four screens: the camera flies from the valley to the rooftop
// while four short statements hand over to each other.
export function Hero({ started }: { started: boolean }) {
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      heroState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      heroState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // intro: towers draw themselves once the preloader lifts
  useEffect(() => {
    if (!started) return
    const ctx = gsap.context(() => {
    const tl = gsap.timeline()
    tl.to(heroState, { intro: 1, duration: 2.4, ease: 'power2.inOut' })
      .from('.hero-stage[data-i="0"] .line > span', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.3)
      .from('.hero-stage[data-i="0"] .fade', { opacity: 0, y: 20, duration: 1, ease: 'power2.out', stagger: 0.1 }, 0.8)
      .from('.hero-hud', { opacity: 0, duration: 1 }, 1.2)
    }, section)
    return () => ctx.revert()
  }, [started])

  // scroll: camera path + statement hand-offs
  useEffect(() => {
    const el = section.current
    if (!el) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true },
        defaults: { ease: 'none' },
      })
      tl.to(heroState, { progress: 1, duration: 1 }, 0)
      const stages = gsap.utils.toArray<HTMLElement>('.hero-stage')
      const span = 1 / stages.length
      stages.forEach((s, i) => {
        const at = i * span
        if (i > 0) tl.fromTo(s, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: span * 0.3, ease: 'power2.out' }, at)
        if (i < stages.length - 1) tl.to(s, { opacity: 0, y: -60, duration: span * 0.3, ease: 'power2.in' }, at + span * 0.68)
      })
      tl.to('.hero-progress i', { scaleY: 1, duration: 1 }, 0)
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="hero" id="top" ref={section}>
      <div className="hero-sticky">
        <LazyCanvas scene={HeroScene} sceneProps={{ lite }} eager
          canvas={{ dpr: [1, lite ? 1.25 : 1.75], camera: { fov: 42, near: 0.1, far: 700, position: [0, 3, 40] }, gl: { antialias: false, powerPreference: 'high-performance' } }}
          fallback={<SceneFallback src="/media/snow-tower.webp" position="50% 30%" />} />
        <div className="hero-shade" />

        <div className="wrap hero-stages">
          <div className="hero-stage" data-i="0">
            <h1 className="hero-title" aria-label="Pakistan’s first winter resort">
              <span className="line l1"><span>Pakistan’s</span></span>
              <span className="line l2"><span>first</span></span>
              <span className="line l3"><span>Winter</span><span className="em">Resort</span></span>
            </h1>
            <p className="hero-tag caps fade">7,906 ft above the sea.<br />The place where winter becomes a stay.</p>
          </div>
          <div className="hero-stage" data-i="1">
            <p className="label">Two hours from Islamabad</p>
            <h2 className="stage-h">The road climbs through the pines to <em>one address.</em></h2>
          </div>
          <div className="hero-stage" data-i="2">
            <p className="label">30+ kanals · 3 towers</p>
            <h2 className="stage-h">Three towers. <em>150+ apartments.</em> Lit every night of the year.</h2>
          </div>
          <div className="hero-stage" data-i="3">
            <p className="label">Open all year</p>
            <h2 className="stage-h">Snow outside. <em>Warmth inside.</em></h2>
            <div className="hero-cta">
              <a className="btn" href="#ownership" onClick={(e) => { e.preventDefault(); scrollTo('#ownership') }}>See the payment plan</a>
              <a className="btn ghost" href="#residences" onClick={(e) => { e.preventDefault(); scrollTo('#residences') }}>Explore residences</a>
            </div>
          </div>
        </div>

        <div className="hero-hud wrap">
          <span className="label">Scroll to arrive</span>
          <div className="hero-progress" aria-hidden="true"><i /></div>
          <span className="label">34.07° N · 73.38° E</span>
        </div>
      </div>
    </section>
  )
}
