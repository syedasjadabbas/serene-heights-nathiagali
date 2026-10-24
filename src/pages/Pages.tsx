import { lazy, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { ChapterHead, LazyCanvas, Split, Swoosh, srcSet, useReveal } from '../components/common'
import { coarsePointer } from '../lib/device'
import { Enquire } from '../components/Sections'
import { Link, navigate } from '../lib/router'
import { ScrollTrigger, lockScroll } from '../lib/scroll'
import { trackContact } from '../lib/analytics'
import { contact, figures, route } from '../data/site'
import { about, blogPosts, floorPlans, mapsLink, offices, privacy, progress, smartUnitPage } from '../data/pages'

/* ---------- shared page header ---------- */
function PageHeader({ kicker, title, em, intro, image, className = '', children }: { kicker: string; title: string; em?: string; intro?: string; image?: string; className?: string; children?: ReactNode }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <header className={`page-head deco${image ? ' with-image' : ''}${className ? ' ' + className : ''}`}>
      <div className="wrap page-head-grid" ref={ref}>
        <div className="page-head-text">
          <span className="label" data-reveal>{kicker}</span>
          <Split as="h1" text={title} em={em} />
          {intro && <p className="page-intro" data-reveal>{intro}</p>}
          {children}
        </div>
        {image && (
          <figure className="page-head-pic" data-reveal>
            <div className="arch"><img src={image} srcSet={srcSet(image)} sizes="(max-width: 820px) 100vw, 40vw" alt="" /></div>
          </figure>
        )}
      </div>
    </header>
  )
}

/* ---------- About ---------- */
export function AboutPage() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <>
      <PageHeader kicker="About Serene Heights" title="Beyond the mountains, a new way to own." em="a new way to own." intro={about.intro} image="/media/valley-tower.webp" />
      <section className="band tone-light">
        <div className="wrap about-grid" ref={ref}>
          <div>
            <ChapterHead left="The project" right="Nathia Gali · 7,906 ft" />
            <p className="about-lede" data-reveal>{about.model}</p>
            <div className="about-figures" data-reveal>
              {figures.slice(0, 5).map((f) => (
                <div key={f.label}><strong>{f.value.toLocaleString('en-US')}<small>{f.suffix}</small></strong><span className="label">{f.label}</span></div>
              ))}
            </div>
          </div>
          <figure className="statement-pic" data-reveal>
            <div className="arch"><img src="/media/terraces.webp" srcSet={srcSet('/media/terraces.webp')} sizes="(max-width: 820px) 100vw, 40vw" alt="Balconies and rooftop glasshouse of Serene Heights" /></div>
            <Swoosh />
          </figure>
        </div>
      </section>
      <section className="band tone-dusk">
        <div className="wrap">
          <ChapterHead left="Leadership" right={about.ceo.name} />
          <Split as="blockquote" className="about-quote" text="“What you own is what you own. Nothing more to pay later.”" em="Nothing more to pay later." />
          <p className="cite"><span>{about.ceo.name}</span><span className="label">{about.ceo.role}</span></p>
          <div className="principles">
            {about.philosophy.map((p, i) => (
              <article key={p.title}><span className="label">0{i + 1}</span><h3>{p.title}</h3><p>{p.body}</p></article>
            ))}
          </div>
        </div>
      </section>
      <section className="band deco">
        <div className="wrap page-cta">
          <p className="about-lede">{about.developer}</p>
          <div className="hero-cta">
            <Link className="btn" to="/smart-property-unit">Smart Property Unit</Link>
            <Link className="btn ghost" to="/contact">Talk to the team</Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- Smart Property Unit ---------- */
export function SmartUnitPage() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <>
      <PageHeader kicker="Smart Property Unit" title="Co-own a suite, 50 sq ft at a time." em="50 sq ft at a time." intro={smartUnitPage.what} image="/media/pool-aerial.webp" />
      <section className="band tone-light">
        <div className="wrap spu-grid" ref={ref}>
          <div className="spu-card" data-reveal>
            <h2 className="h-sm">Payment plan</h2>
            <dl>{smartUnitPage.plan.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </div>
          <div className="spu-card" data-reveal>
            <h2 className="h-sm">Projected return</h2>
            <dl>{smartUnitPage.roi.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            <p className="fine">The developer’s projection. Rental income depends on hotel occupancy and operating results and is not guaranteed.</p>
          </div>
        </div>
      </section>
      <section className="band deco">
        <div className="wrap">
          <ChapterHead left="How it works" right="Five steps" />
          <ol className="steps">
            {smartUnitPage.steps.map(([t, d], i) => (
              <li key={t}><span className="step-n">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </div>
      </section>
      <section className="band tone-light">
        <div className="wrap">
          <ChapterHead left="Why Smart Property Unit" right="Serene Heights" />
          <div className="why-grid">
            {smartUnitPage.why.map(([t, d]) => <article key={t}><h3>{t}</h3><p>{d}</p></article>)}
          </div>
          <div className="hero-cta page-cta-row">
            <Link className="btn" to="/contact">Book a Smart Property Unit</Link>
            <Link className="btn ghost" to="/#ownership">See the full payment plan</Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- Floor plans ---------- */
const PlanScene = lazy(() => import('../three/PlanScene').then((m) => ({ default: m.PlanScene })))

// Each plan raised into 3D: walls, cores, balcony railings and beds stand up from the drawing.
function Plans3D() {
  const [i, setI] = useState(3)
  const [full, setFull] = useState(false)
  const spin = useRef(0.35)
  const zoom = useRef(1)
  const tilt = useRef(0.72)
  const plan = floorPlans[i]
  const name = plan.file.replace(/\.png$/, '')
  const zoomTo = (z: number) => { zoom.current = Math.min(1.6, Math.max(0.35, z)) }

  // full screen: lock the page behind, close with Esc
  useEffect(() => {
    if (!full) return
    lockScroll(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', onKey)
    return () => { lockScroll(false); window.removeEventListener('keydown', onKey) }
  }, [full])
  // keep the chosen floor's button in view in the full-screen strip (it scrolls on phones)
  useEffect(() => {
    if (!full) return
    const strip = document.querySelector<HTMLElement>('.plan3d-top .plan3d-tabs')
    const on = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (strip && on) strip.scrollTo({ left: on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' })
  }, [full, i])

  // touch: swipe sideways to turn, pinch to zoom; full screen also tilts with an up-down drag
  // (on the page an up-down swipe still scrolls). A tap without dragging opens full screen.
  const gesture = useRef<{ x: number; y: number; d: number; moved: number; t: number } | null>(null)
  const pinch = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    gesture.current = { x: t.clientX, y: t.clientY, d: e.touches.length >= 2 ? pinch(e.touches) : 0, moved: e.touches.length >= 2 ? 99 : 0, t: performance.now() }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current
    if (!g) return
    if (e.touches.length >= 2) {
      const d = pinch(e.touches)
      if (g.d) zoomTo(zoom.current * (g.d / d))
      g.d = d
      g.moved = 99
      return
    }
    const { clientX: x, clientY: y } = e.touches[0]
    spin.current -= (x - g.x) * 0.012
    if (full) tilt.current = Math.min(1.3, Math.max(0.25, tilt.current - (y - g.y) * 0.006))
    g.moved += Math.abs(x - g.x) + Math.abs(y - g.y)
    g.x = x
    g.y = y
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current
    if (g && !full && !e.touches.length && g.moved < 8 && performance.now() - g.t < 600 && !(e.target as HTMLElement).closest('button')) setFull(true)
    gesture.current = e.touches.length ? { x: e.touches[0].clientX, y: e.touches[0].clientY, d: 0, moved: 99, t: 0 } : null
  }
  // mouse: a click without dragging opens full screen
  const press = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') press.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current
    press.current = null
    if (!p || full || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5) setFull(true)
  }

  const tabs = (
    <div className="seg plan3d-tabs" role="group" aria-label="Choose a floor">
      {floorPlans.map((p, k) => (
        <button key={p.file} type="button" aria-pressed={k === i} onClick={() => setI(k)}>
          {p.title.replace(' floor', '')}{p.note === 'Arrival and lobby' ? ' · lobby' : p.note === 'Layout' ? ' · layout' : ''}
        </button>
      ))}
    </div>
  )
  const hint = full
    ? coarsePointer ? 'Drag to turn and tilt · pinch to zoom' : 'Drag to turn · scroll to zoom · right-drag to move'
    : coarsePointer ? 'Swipe to turn · pinch to zoom · tap for full screen' : 'Drag to turn · scroll to zoom · click for full screen'
  return (
    <section className="band tone-dusk plan3d-band">
      <div className="wrap">
        <ChapterHead left="Every floor in 3D" right={`${plan.title}${plan.note ? ` · ${plan.note}` : ''}`} />
        {tabs}
        <div className={`sel-canvas plan3d-canvas${full ? ' is-full' : ''}`} role={full ? 'dialog' : undefined} aria-modal={full || undefined}
          aria-label={full ? `${plan.title} in 3D, full screen` : undefined}
          onPointerDown={onPointerDown} onPointerUp={onPointerUp}
          {...(coarsePointer ? { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } : {})}>
          <LazyCanvas scene={PlanScene} sceneProps={{ name, spin, zoom, tilt, full }} warmup="600px"
            canvas={{ dpr: [1, 1.75], shadows: true, camera: { fov: 35, position: [3.9, 8.4, 9.2] }, gl: { antialias: true } }}
            fallback={<img className="scene-fallback plan3d-fallback" src={plan.thumb} alt={`${plan.title} plan`} />} />
          {full ? (
            <div className="plan3d-top">
              {tabs}
              <button type="button" className="plan3d-btn" aria-label="Close full screen" onClick={() => setFull(false)}>✕</button>
            </div>
          ) : (
            <button type="button" className="plan3d-btn plan3d-expand" aria-label="Open full screen" onClick={() => setFull(true)}>⛶</button>
          )}
          <span className="label sel-hint">{hint}</span>
          {(coarsePointer || full) && (
            <div className="turn">
              <button type="button" aria-label="Turn the floor left" onClick={() => { spin.current -= Math.PI / 4 }}>←</button>
              <button type="button" aria-label="Turn the floor right" onClick={() => { spin.current += Math.PI / 4 }}>→</button>
              <button type="button" aria-label="Zoom in" onClick={() => zoomTo(zoom.current * 0.75)}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => zoomTo(zoom.current / 0.75)}>−</button>
            </div>
          )}
        </div>
        <p className="fine plans-note">Raised from the architect’s drawings: walls, lift and stair cores, balconies and beds. Indicative only.</p>
      </div>
    </section>
  )
}

export function FloorPlansPage() {
  const [open, setOpen] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open !== null && !d.open) d.showModal()
    if (open === null && d.open) d.close()
  }, [open])
  const plan = open !== null ? floorPlans[open] : null
  return (
    <>
      <PageHeader kicker="Floor plans" title="Every floor, room by room." em="room by room." intro="Ground floor arrival and lobby, then the residential floors of the main tower. Turn each floor in 3D, or select a plan to see the drawing full screen." />
      <Plans3D />
      <section className="band tone-light">
        <div className="wrap plans-grid">
          {floorPlans.map((p, i) => (
            <button key={p.file} type="button" className="plan-card" onClick={() => setOpen(i)}>
              <img src={p.thumb} alt={`${p.title} plan`} loading="lazy" />
              <span className="plan-card-cap"><b>{p.title}</b>{p.note && <small>{p.note}</small>}</span>
            </button>
          ))}
        </div>
        <p className="wrap fine plans-note">Plans are indicative and may change during construction. Ask the sales team for the latest unit sheets.</p>
      </section>
      <dialog ref={dialog} className="lightbox" onClose={() => setOpen(null)} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null) }}>
        {plan && (
          <figure>
            <img src={plan.full} alt={`${plan.title} plan, full size`} />
            <figcaption>
              <span>{plan.title}{plan.note && ` · ${plan.note}`}</span>
              <span className="lb-nav">
                <button type="button" onClick={() => setOpen((open! + floorPlans.length - 1) % floorPlans.length)} aria-label="Previous plan">←</button>
                <button type="button" onClick={() => setOpen((open! + 1) % floorPlans.length)} aria-label="Next plan">→</button>
                <button type="button" onClick={() => setOpen(null)} aria-label="Close">✕</button>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  )
}

/* ---------- Construction progress ---------- */
function LiteVideo({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false)
  return play ? (
    <iframe className="video" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
  ) : (
    <button type="button" className="video video-poster" onClick={() => setPlay(true)} aria-label={`Play: ${title}`}>
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
      <span className="play" aria-hidden="true">▶</span>
    </button>
  )
}

export function ProgressPage() {
  return (
    <>
      <PageHeader kicker="Construction progress" title="Built in the open, visit by visit." em="visit by visit." intro="Site-visit films from the construction of Serene Heights, newest first. Book a visit to see the towers in person." />
      <section className="band tone-light">
        <div className="wrap">
          <ol className="timeline">
            {progress.map((p, i) => (
              <li key={p.video}>
                <div className="tl-date"><span className="label">{i === 0 ? 'Latest' : 'Update'}</span><h2 className="h-sm">{p.date}</h2></div>
                <LiteVideo id={p.video} title={`Serene Heights construction progress, ${p.date}`} />
              </li>
            ))}
          </ol>
          <div className="hero-cta page-cta-row">
            <Link className="btn" to="/contact">Book a site visit</Link>
            <a className="btn ghost" href={contact.social.find((s) => s.label === 'YouTube')!.href} target="_blank" rel="noopener">More on YouTube</a>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- Blog ---------- */
type Post = (typeof blogPosts)[number]
const blogGroup = (category: string) => (category.startsWith('Travel') ? 'Travel Guide' : category === 'Investment' ? 'Investment' : 'Buying Guides')

function PostCard({ post: p, heading: H = 'h2' }: { post: Post; heading?: 'h2' | 'h3' }) {
  return (
    <Link className="post-card" to={p.url}>
      <div className="post-pic"><img src={p.cover} alt="" loading="lazy" /></div>
      <span className="label">{p.category} · {p.date}</span>
      <H className="h-sm">{p.title}</H>
      <p>{p.excerpt}</p>
      <span className="post-more">Read article →</span>
    </Link>
  )
}

export function BlogPage() {
  const cats = useMemo(() => ['All', ...Array.from(new Set(blogPosts.map((p) => blogGroup(p.category))))], [])
  const [cat, setCat] = useState('All')
  const shown = blogPosts.filter((p) => cat === 'All' || blogGroup(p.category) === cat)
  return (
    <>
      <PageHeader kicker="Journal" title="Notes from the Galiyat." em="the Galiyat." intro="Travel guides to Nathia Gali, and straight answers for buyers on ownership, payment plans and returns." />
      <section className="band tone-light">
        <div className="wrap">
          <div className="seg blog-filter" role="group" aria-label="Filter articles">
            {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="blog-grid">
            {shown.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- Blog article ---------- */
type Block =
  | { t: 'lead' | 'p' | 'note' | 'h2' | 'h3'; html: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'faq'; q: string; a: string[] }
  | { t: 'cta'; title: string; text: string; links: { href: string; label: string }[] }
type Article = { title: string; readTime: string; blocks: Block[] }

// Article text is the client's own content, converted ahead of time to a few safe tags (a, strong, em, br).
const html = (h: string) => ({ __html: h })
const sentenceCase = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t)

function ArticleBlock({ b }: { b: Block }) {
  switch (b.t) {
    case 'lead': return <p className="article-lead" dangerouslySetInnerHTML={html(b.html)} />
    case 'p': return <p dangerouslySetInnerHTML={html(b.html)} />
    case 'note': return <p className="article-note" dangerouslySetInnerHTML={html(b.html)} />
    case 'h2': return <h2 dangerouslySetInnerHTML={html(b.html)} />
    case 'h3': return <h3 dangerouslySetInnerHTML={html(b.html)} />
    case 'ul': return <ul>{b.items.map((t, i) => <li key={i} dangerouslySetInnerHTML={html(t)} />)}</ul>
    case 'ol': return <ol>{b.items.map((t, i) => <li key={i} dangerouslySetInnerHTML={html(t)} />)}</ol>
    case 'table': return (
      <div className="article-table">
        <table>
          {b.head.length > 0 && <thead><tr>{b.head.map((t, i) => <th key={i} scope="col" dangerouslySetInnerHTML={html(t)} />)}</tr></thead>}
          <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((t, j) => <td key={j} dangerouslySetInnerHTML={html(t)} />)}</tr>)}</tbody>
        </table>
      </div>
    )
    case 'faq': return (
      <details className="article-faq">
        <summary dangerouslySetInnerHTML={html(b.q)} />
        {b.a.map((t, i) => <p key={i} dangerouslySetInnerHTML={html(t)} />)}
      </details>
    )
    case 'cta': return (
      <aside className="article-cta">
        {b.title && <h3>{sentenceCase(b.title)}</h3>}
        {b.text && <p dangerouslySetInnerHTML={html(b.text)} />}
        <div className="hero-cta">{b.links.map((l, i) => <Link key={l.href + i} className={i ? 'btn ghost' : 'btn'} to={l.href}>{l.label}</Link>)}</div>
      </aside>
    )
  }
}

export function ArticlePage({ slug }: { slug: string }) {
  const post = blogPosts.find((p) => p.slug === slug)!
  const [article, setArticle] = useState<Article | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    setArticle(null)
    setFailed(false)
    fetch(`/data/blog/${slug}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((a: Article) => { if (live) setArticle(a) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [slug])
  // the page grows once the text arrives
  useEffect(() => { if (article) requestAnimationFrame(() => ScrollTrigger.refresh()) }, [article])

  // links inside the article text stay inside the site
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (!a || !href?.startsWith('/') || a.target || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(href)
  }

  const related = useMemo(() => {
    const others = blogPosts.filter((p) => p.slug !== slug)
    const same = others.filter((p) => blogGroup(p.category) === blogGroup(post.category))
    return [...same, ...others.filter((p) => !same.includes(p))].slice(0, 3)
  }, [slug, post.category])

  const readTime = article?.readTime.replace(/\s*read$/, '')
  return (
    <>
      <PageHeader className="article-head" kicker={post.category} title={post.title}
        intro={[post.date, readTime && `${readTime} read`].filter(Boolean).join(' · ')}>
        <Link className="back-link" to="/blog">← All articles</Link>
      </PageHeader>
      <section className="band tone-light article-band">
        <div className="wrap article-wrap">
          <figure className="article-cover">
            <img src={post.hero} srcSet={post.hero.includes('/blog/') ? `${post.cover} 640w, ${post.hero} 1600w` : undefined}
              sizes="(max-width: 900px) 100vw, 900px" alt="" />
          </figure>
          <div className="article-body" onClick={onClick}>
            {article ? article.blocks.map((b, i) => <ArticleBlock key={i} b={b} />)
              : failed ? <p>This article couldn’t be loaded. Please check your connection and try again.</p>
              : <p className="article-loading" aria-live="polite">Loading article…</p>}
          </div>
        </div>
      </section>
      <section className="band deco">
        <div className="wrap">
          <ChapterHead left="Keep reading" right="Journal" />
          <div className="blog-grid">{related.map((p) => <PostCard key={p.slug} post={p} heading="h3" />)}</div>
          <div className="hero-cta page-cta-row">
            <Link className="btn" to="/contact">Talk to the sales team</Link>
            <Link className="btn ghost" to="/blog">All articles</Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- Contact ---------- */
export function ContactPage() {
  const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`
  return (
    <>
      <PageHeader kicker="Contact" title="Our team is here to help." em="here to help." intro="Call, message on WhatsApp, or send an enquiry and the sales team will call you back.">
        <div className="contact-quick">
          <a className="btn" href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" onClick={() => trackContact('whatsapp')}>WhatsApp {contact.whatsapp}</a>
          <a className="btn ghost" href={tel(contact.uan)} onClick={() => trackContact('phone')}>Call {contact.uan}</a>
        </div>
      </PageHeader>
      <section className="band tone-light">
        <div className="wrap contact-grid">
          {offices.map((o) => (
            <article key={o.label} className="office">
              <span className="label">{o.label}</span>
              <h2 className="h-sm">{o.name}</h2>
              <p>{o.address}</p>
            </article>
          ))}
          <article className="office">
            <span className="label">Phone & email</span>
            <p><a href={tel(contact.uan)} onClick={() => trackContact('phone')}>{contact.uan}</a><br />
              <a href={tel(contact.mobile)} onClick={() => trackContact('phone')}>{contact.mobile}</a><br />
              <a href={`mailto:${contact.email}`} onClick={() => trackContact('email')}>{contact.email}</a></p>
          </article>
          <article className="office">
            <span className="label">Getting here</span>
            <ul className="near">{route.slice(1).map((r) => <li key={r.place}><span>{r.place}</span><span>{r.dist}</span></li>)}</ul>
            <a className="btn ghost small" href={mapsLink} target="_blank" rel="noopener">Open in Google Maps</a>
          </article>
        </div>
      </section>
      <Enquire idPrefix="contact-" />
    </>
  )
}

/* ---------- Privacy ---------- */
export function PrivacyPage() {
  return (
    <>
      <PageHeader kicker="Privacy policy" title="How we handle your information." em="your information." intro={`Last updated: ${privacy.updated}`} />
      <section className="band tone-light">
        <div className="wrap prose">
          {privacy.sections.map((s) => (
            <section key={s.h}>
              <h2 className="h-sm">{s.h}</h2>
              {s.p?.map((t) => <p key={t}>{t}</p>)}
              {s.list && <ul>{s.list.map((t) => <li key={t}>{t}</li>)}</ul>}
            </section>
          ))}
        </div>
      </section>
    </>
  )
}

/* ---------- 404 ---------- */
export function NotFoundPage() {
  return (
    <PageHeader kicker="Page not found" title="This trail doesn’t go anywhere." em="anywhere." intro="The page you were looking for has moved or never existed.">
      <div className="hero-cta"><Link className="btn" to="/">Back to Serene Heights</Link><Link className="btn ghost" to="/contact">Contact us</Link></div>
    </PageHeader>
  )
}
