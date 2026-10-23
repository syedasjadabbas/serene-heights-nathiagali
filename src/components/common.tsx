import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type ElementType } from 'react'
import { Canvas, type CanvasProps } from '@react-three/fiber'
import { gsap, reducedMotion } from '../lib/scroll'

// Canvas that only renders while on screen, so several WebGL scenes can share a page.
export function LazyCanvas({ children, warmup = '200px', ...props }: CanvasProps & { children: ReactNode; warmup?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: warmup })
    io.observe(el)
    return () => io.disconnect()
  }, [warmup])
  return (
    <div ref={ref} className="canvas-wrap">
      <Canvas {...props} frameloop={visible ? 'always' : 'never'}>
        {children}
      </Canvas>
    </div>
  )
}

// Heading whose words rise out of a mask when scrolled into view.
export function Split({ as: Tag = 'h2', text, className, em }: { as?: ElementType; text: string; className?: string; em?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('.w > span'), {
        yPercent: 110, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      })
    })
    return () => ctx.revert()
  }, [])
  // italicise the words of the `em` phrase where it occurs in the text
  const words = text.split(' ')
  const clean = (w: string) => w.replace(/[.,“”]/g, '')
  const phrase = (em ?? '').split(' ').filter(Boolean)
  let emStart = -1
  for (let i = 0; phrase.length && i <= words.length - phrase.length; i++) {
    if (phrase.every((p, j) => clean(words[i + j]) === p)) { emStart = i; break }
  }
  const isEm = (i: number) => emStart >= 0 && i >= emStart && i < emStart + phrase.length
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="w" aria-hidden="true">
            <span className={isEm(i) ? 'em' : undefined}>{w}</span>
          </span>{' '}
        </Fragment>
      ))}
    </Tag>
  )
}

// Fades and lifts every [data-reveal] child of the container as it enters.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('[data-reveal]'), {
        y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      })
    })
    return () => ctx.revert()
  }, [])
  return ref
}

export function ChapterHead({ left, right }: { left: string; right: string }) {
  return (
    <div className="chapter-head">
      <span className="label">{left}</span>
      <span className="label">{right}</span>
    </div>
  )
}

// Glowing ribbon that loops around an image, after ERA's light trails; colours follow the section tone.
let swooshN = 0
export function Swoosh({ className = '' }: { className?: string }) {
  const id = useMemo(() => `sw${++swooshN}`, [])
  return (
    <svg className={`swoosh ${className}`} viewBox="0 0 400 160" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--sw1)' }} stopOpacity="0" />
          <stop offset="0.35" style={{ stopColor: 'var(--sw2)' }} />
          <stop offset="0.7" style={{ stopColor: 'var(--sw3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sw4)' }} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}f`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <ellipse cx="200" cy="80" rx="188" ry="44" fill="none" stroke={`url(#${id}g)`} strokeWidth="9" filter={`url(#${id}f)`} opacity="0.75" />
      <ellipse cx="200" cy="80" rx="188" ry="44" fill="none" stroke={`url(#${id}g)`} strokeWidth="1.8" />
      <ellipse cx="200" cy="80" rx="172" ry="36" fill="none" stroke={`url(#${id}g)`} strokeWidth="1" opacity="0.7" transform="rotate(-4 200 80)" />
    </svg>
  )
}

export const pkr = (n: number) => 'PKR ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n)
