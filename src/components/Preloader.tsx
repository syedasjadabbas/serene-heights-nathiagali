import { useEffect, useRef, useState } from 'react'
import { gsap, lockScroll, reducedMotion } from '../lib/scroll'
import { whenHeroReady } from '../lib/preload'

// Shows the logo and a loading line only for as long as the hero actually needs: the line
// creeps toward 90% while loading, then completes and lifts away as soon as the hero has
// drawn its first frame and the fonts are in (never longer than 8 s).
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    lockScroll(true)
    const counter = { v: 0 }
    const show = () => {
      if (num.current) num.current.textContent = String(Math.round(counter.v)).padStart(3, '0')
      const line = root.current?.querySelector<HTMLElement>('.pre-line')
      if (line) line.style.transform = `scaleX(${counter.v / 100})`
    }
    // creep toward 90% while things load
    const creep = gsap.to(counter, { v: 90, duration: reducedMotion ? 0.1 : 3, ease: 'power2.out', onUpdate: show })
    let finish: gsap.core.Timeline | null = null
    const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    const minShow = new Promise((r) => setTimeout(r, reducedMotion ? 0 : 200))
    let cancelled = false
    Promise.all([whenHeroReady(), fonts, minShow]).then(() => {
      if (cancelled) return
      creep.kill()
      finish = gsap.timeline()
        .to(counter, { v: 100, duration: 0.15, ease: 'power1.out', onUpdate: show })
        .to('.pre-inner', { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in' })
        .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: 'expo.inOut' }, '-=0.15')
        .add(() => { lockScroll(false); onDone() }, '-=0.45')
        .add(() => setGone(true))
    })
    return () => { cancelled = true; creep.kill(); finish?.kill() }
  }, [onDone])

  if (gone) return null
  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div className="pre-inner">
        <span className="label">Nathia Gali · Galiyat</span>
        <div className="pre-num"><span ref={num}>0</span><small>%</small></div>
        <div className="pre-track"><div className="pre-line" /></div>
        <img className="pre-logo" src="/media/logo.png" alt="" width="745" height="517" />
      </div>
    </div>
  )
}
