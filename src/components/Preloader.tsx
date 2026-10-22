import { useEffect, useRef, useState } from 'react'
import { gsap, lockScroll, reducedMotion } from '../lib/scroll'

// Draws the wordmark and a loading line while fonts and the first scene warm up,
// then lifts away like cloud and hands over to the hero intro.
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    lockScroll(true)
    const counter = { v: 0 }
    const tl = gsap.timeline({ paused: true })
    tl.to(counter, {
      v: 100, duration: reducedMotion ? 0.2 : 2.4, ease: 'power2.inOut',
      onUpdate: () => { if (num.current) num.current.textContent = String(Math.round(counter.v)).padStart(3, '0') },
    })
      .to('.pre-line', { scaleX: 1, duration: 2.4, ease: 'power2.inOut' }, 0)
      .to('.pre-inner', { y: -30, opacity: 0, duration: 0.7, ease: 'power2.in' }, '+=0.25')
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
      .add(() => { lockScroll(false); onDone() }, '-=0.6')
      .add(() => setGone(true))
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(() => tl.play())
    return () => { tl.kill() }
  }, [onDone])

  if (gone) return null
  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div className="pre-inner">
        <span className="label">Nathia Gali · Galiyat</span>
        <div className="pre-num"><span ref={num}>0</span><small>%</small></div>
        <div className="pre-track"><div className="pre-line" /></div>
        <span className="pre-mark">Serene Heights</span>
      </div>
    </div>
  )
}
