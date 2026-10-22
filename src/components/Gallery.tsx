import { Suspense, useCallback, useEffect, useRef } from 'react'
import { LazyCanvas, ChapterHead } from './common'
import { GalleryScene, galleryState } from '../three/GalleryScene'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { gallery } from '../data/site'

// Pinned for five screens: the camera travels down a corridor of renders hung in space.
export function Gallery() {
  const section = useRef<HTMLElement>(null)
  const idx = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLSpanElement>(null)
  const tag = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = section.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        galleryState.progress = self.progress
        galleryState.velocity = self.getVelocity()
      },
    })
    const decay = () => { galleryState.velocity *= 0.9 }
    gsap.ticker.add(decay)
    return () => { st.kill(); gsap.ticker.remove(decay) }
  }, [])

  const onIndex = useCallback((i: number) => {
    const g = gallery[i]
    if (idx.current) idx.current.textContent = String(i + 1).padStart(2, '0')
    if (title.current && tag.current) {
      gsap.fromTo([title.current, tag.current], { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' })
      title.current.textContent = g.title
      tag.current.textContent = g.tag
    }
  }, [])

  return (
    <section className="gallery" ref={section} style={{ height: `${gallery.length * 70 + 60}vh` }}>
      <div className="gallery-sticky">
        <LazyCanvas dpr={[1, 1.5]} camera={{ fov: 50, near: 0.1, far: 120, position: [0, 0, 6] }} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <GalleryScene images={gallery.map((g) => g.src)} onIndex={onIndex} />
          </Suspense>
        </LazyCanvas>
        <div className="wrap gallery-hud">
          <ChapterHead left="First look" right="Scroll through" />
          <div className="gallery-caption">
            <span className="gallery-idx"><span ref={idx}>01</span><small>/ {String(gallery.length).padStart(2, '0')}</small></span>
            <span className="gallery-title"><span ref={title}>{gallery[0].title}</span></span>
            <span className="label"><span ref={tag}>{gallery[0].tag}</span></span>
          </div>
        </div>
      </div>
    </section>
  )
}
