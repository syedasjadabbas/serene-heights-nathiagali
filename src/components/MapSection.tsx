import { lazy, useCallback, useEffect, useRef } from 'react'
import { LazyCanvas, ChapterHead } from './common'
import { mapState } from '../three/state'
import { LABELLED } from '../three/geo'
import { hasWebGL } from '../lib/device'
import { gsap, ScrollTrigger, jumpTo, lockScroll, reducedMotion } from '../lib/scroll'

const MapScene = lazy(() => import('../three/MapScene').then((m) => ({ default: m.MapScene })))

const lite = typeof window !== 'undefined' && (window.innerWidth < 760 || navigator.hardwareConcurrency <= 4)

// Captions for each stop the camera reaches. Distances are the client's own figures.
const STOPS = [
  { k: 'The Galiyat', t: 'Two hours from Islamabad, up into the pines.', d: 'Scroll to drive the road from the capital to the front door.' },
  { k: 'Islamabad · 80 km · 2 hr', t: 'Leave the capital.', d: 'Take the Murree Expressway out of Islamabad, past the Margalla hills.' },
  { k: 'Murree', t: 'Climb past Murree.', d: 'The road rises above 2,000 m and turns north along the ridge into the Galiyat.' },
  { k: 'Changla Gali · Ayubia', t: 'Along the ridge.', d: 'Through Changla Gali, Ayubia National Park and Dunga Gali, pine forest on both sides.' },
  { k: 'Nathia Gali · 5 km', t: 'Into Nathia Gali.', d: 'The main bazaar is ten minutes from the resort.' },
  { k: 'Abbottabad · 35 km · 50 min', t: 'Or come up from Abbottabad.', d: 'The second road climbs from the Abbottabad valley through Nawansher.' },
  { k: 'Serene Heights · 7,906 ft', t: 'You have arrived.', d: 'On the main Nathia Gali road, 50 m from PAF Airbase Nathia Gali. 1.5 km to the main road, 3 km to Hotel Elites.' },
]

export function MapSection() {
  if (!hasWebGL()) return null
  return <MapSection3D />
}

function MapSection3D() {
  const section = useRef<HTMLElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const kicker = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const desc = useRef<HTMLParagraphElement>(null)
  const dots = useRef<HTMLOListElement>(null)
  const labelEls = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const el = section.current
    if (!el) return
    // On the way down, scrolling waits at the end of the map until the drive has
    // arrived, then holds on Serene Heights for HOLD_SECONDS before releasing.
    const HOLD_AT = 0.975, HOLD_SECONDS = 1.5
    const hold = { armed: true, active: false }
    let watcher: (() => void) | null = null
    let release: gsap.core.Tween | null = null
    const endHold = () => {
      if (watcher) gsap.ticker.remove(watcher)
      watcher = null
      release?.kill()
      if (hold.active) lockScroll(false)
      hold.active = false
    }
    const startHold = (self: ScrollTrigger) => {
      hold.active = true
      hold.armed = false
      lockScroll(true)
      jumpTo(self.start + (self.end - self.start) * HOLD_AT)
      const t0 = performance.now()
      watcher = () => {
        // arrived (or a safety limit if the scene is not rendering)
        if (mapState.shown >= HOLD_AT - 0.005 || performance.now() - t0 > 12000) {
          gsap.ticker.remove(watcher!)
          watcher = null
          release = gsap.delayedCall(HOLD_SECONDS, endHold)
        }
      }
      gsap.ticker.add(watcher)
    }
    const st = ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        mapState.progress = self.progress
        if (self.progress < 0.6) hold.armed = true
        if (!reducedMotion && hold.armed && !hold.active && self.direction > 0 && self.progress >= HOLD_AT) startHold(self)
      },
    })
    const onMove = (e: PointerEvent) => {
      mapState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      mapState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)
    return () => { endHold(); st.kill(); window.removeEventListener('pointermove', onMove) }
  }, [])

  const onStop = useCallback((i: number) => {
    const s = STOPS[i + 1]
    if (!s || !kicker.current || !title.current || !desc.current || !card.current) return
    gsap.timeline()
      .to(card.current, { opacity: 0, y: -12, duration: 0.25, ease: 'power2.in' })
      .add(() => {
        kicker.current!.textContent = s.k
        title.current!.textContent = s.t
        desc.current!.textContent = s.d
      })
      .fromTo(card.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' })
    dots.current?.querySelectorAll('li').forEach((li, j) => {
      li.classList.toggle('done', j <= i)
      li.classList.toggle('now', j === i)
    })
  }, [])

  return (
    <section className="map-section" id="location" ref={section}>
      <div className="map-sticky">
        <LazyCanvas scene={MapScene} sceneProps={{ lite, onStop, labelEls }} warmup="2000px"
          canvas={{ dpr: [1, lite ? 1.25 : 1.75], camera: { fov: 38, near: 0.1, far: 400, position: [4, 78, 64] }, gl: { antialias: false, powerPreference: 'high-performance' } }} />
        <div className="map-shade" />
        <div className="map-labels" aria-hidden="true">
          {LABELLED.map((pl, i) => (
            <div key={pl.name} className="map-anchor" ref={(el) => { labelEls.current[i] = el }}>
              <div className={`map-label ${pl.kind}`}>
                <span className="map-dot" />
                <span className="map-name">{pl.name}</span>
                {pl.note && <span className="map-note">{pl.note}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="wrap map-hud">
          <ChapterHead left="Location" right="34.07° N · 73.38° E" />
          <div className="map-card" ref={card} aria-live="polite">
            <span className="label map-kicker" ref={kicker}>{STOPS[0].k}</span>
            <h2 ref={title}>{STOPS[0].t}</h2>
            <p ref={desc}>{STOPS[0].d}</p>
          </div>
          <div className="map-foot">
            <ol className="map-steps" ref={dots} aria-hidden="true">
              {['Islamabad', 'Murree', 'Ayubia', 'Nathia Gali', 'Abbottabad', 'Serene Heights'].map((n) => <li key={n}><i />{n}</li>)}
            </ol>
            <span className="label map-legend"><i className="lg-main" />Via Murree <i className="lg-abb" />Via Abbottabad</span>
          </div>
        </div>
      </div>
    </section>
  )
}
