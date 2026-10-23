import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChapterHead, Split, Swoosh, srcSet, useReveal } from '../components/common'
import { Enquire } from '../components/Sections'
import { Link } from '../lib/router'
import { trackContact } from '../lib/analytics'
import { contact, figures, route } from '../data/site'
import { about, blogPosts, floorPlans, mapsLink, offices, privacy, progress, smartUnitPage } from '../data/pages'

/* ---------- shared page header ---------- */
function PageHeader({ kicker, title, em, intro, image, children }: { kicker: string; title: string; em?: string; intro?: string; image?: string; children?: ReactNode }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <header className={`page-head deco${image ? ' with-image' : ''}`}>
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
      <PageHeader kicker="Floor plans" title="Every floor, room by room." em="room by room." intro="Ground floor arrival and lobby, then the residential floors of the main tower. Select a plan to see it full screen." />
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
export function BlogPage() {
  const cats = useMemo(() => ['All', ...Array.from(new Set(blogPosts.map((p) => (p.category.startsWith('Travel') ? 'Travel Guide' : p.category === 'Investment' ? 'Investment' : 'Buying Guides'))))], [])
  const [cat, setCat] = useState('All')
  const shown = blogPosts.filter((p) => {
    const c = p.category.startsWith('Travel') ? 'Travel Guide' : p.category === 'Investment' ? 'Investment' : 'Buying Guides'
    return cat === 'All' || c === cat
  })
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
              <a key={p.slug} className="post-card" href={p.url} target="_blank" rel="noopener">
                <div className="post-pic"><img src={p.cover} alt="" loading="lazy" /></div>
                <span className="label">{p.category} · {p.date}</span>
                <h2 className="h-sm">{p.title}</h2>
                <p>{p.excerpt}</p>
                <span className="post-more">Read article ↗</span>
              </a>
            ))}
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
      <Enquire />
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
