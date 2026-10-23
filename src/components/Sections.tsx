import { lazy, useEffect, useRef, useState } from 'react'
import { ChapterHead, LazyCanvas, SceneFallback, Split, Swoosh, narrowScreen, pkr, smallSrc, srcSet, useReveal } from './common'
import { gsap, reducedMotion, scrollTo } from '../lib/scroll'
import { Link } from '../lib/router'
import { trackContact, trackLead } from '../lib/analytics'
import { CookieSettingsLink } from './Chrome'
import { progress } from '../data/pages'
import { amenityGroups, contact, figures, ownerBenefits, pricing, residences, route, seasons, smartUnit } from '../data/site'

const SeasonScene = lazy(() => import('../three/SeasonScene').then((m) => ({ default: m.SeasonScene })))

/* ---------- key figures, counted up on entry ---------- */
export function Figures() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
        const end = Number(n.dataset.count)
        const o = { v: reducedMotion ? end : 0 }
        n.textContent = reducedMotion ? end.toLocaleString('en-US') : '0'
        gsap.to(o, {
          v: end, duration: 2, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => { n.textContent = Math.round(o.v).toLocaleString('en-US') },
        })
      })
    }, el)
    return () => ctx.revert()
  }, [])
  return (
    <div className="wrap">
      <div className="figures" ref={ref} role="list">
        {figures.map((f) => (
          <div role="listitem" key={f.label}>
            <strong><span data-count={f.value}>{f.value.toLocaleString('en-US')}</span><small>{f.suffix}</small></strong>
            <span className="label">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- statement ---------- */
export function Statement() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section className="band tone-light" id="resort">
      <div className="wrap statement" ref={ref}>
        <Split text="A resort you own, run like a hotel." em="run like a hotel" />
        <figure className="statement-wide" data-reveal>
          <div className="arch-wide"><img src="/media/arrival-snow.webp" srcSet={srcSet('/media/arrival-snow.webp')} sizes="(max-width: 820px) 100vw, 50vw" loading="lazy" alt="The arrival drive to Serene Heights after fresh snowfall, lamp posts lining the road" /></div>
          <figcaption className="label">Arrival, after the first snow</figcaption>
        </figure>
        <figure className="statement-pic" data-reveal>
          <div className="arch"><img src="/media/rooftop.webp" srcSet={srcSet('/media/rooftop.webp')} sizes="(max-width: 760px) 100vw, 50vw" loading="lazy" alt="Rooftop terraces of Serene Heights at sunset over the pines" /></div>
          <Swoosh />
        </figure>
        <div className="copy">
          <p data-reveal>Serene Heights is a hotel and resort on the main Nathia Gali road, fifty metres from the PAF airbase. Every apartment is furnished, serviced and let to guests by DM Consortium as one hotel.</p>
          <p data-reveal>Owners pay no maintenance charges and no hidden costs. They receive a share of hotel revenue every quarter and 28 nights a year to stay free, in winter or summer.</p>
          <ul className="highlights" data-reveal>
            <li><strong>DM Consortium</strong><span>Runs every apartment as one hotel</span></li>
            <li><strong>Zero</strong><span>Maintenance fees or hidden costs</span></li>
            <li><strong>28 nights</strong><span>Free stays for owners, every year</span></li>
            <li><strong>Quarterly</strong><span>Profit share from hotel revenue</span></li>
          </ul>
          <a className="btn" data-reveal href="#ownership" onClick={(e) => { e.preventDefault(); scrollTo('#ownership') }}>See the payment plan</a>
        </div>
      </div>
    </section>
  )
}

/* ---------- seasons: WebGL thaw between winter and summer ---------- */
export function Seasons() {
  const [season, setSeason] = useState<'winter' | 'summer'>('winter')
  const s = seasons[season]
  const ref = useReveal<HTMLDivElement>()
  return (
    <section className="band deco">
      <div className="wrap" ref={ref}>
        <ChapterHead left="The resort" right="Open all year" />
        <div className="seasons">
          <div className="season-frame arch-wide" data-reveal>
            <LazyCanvas scene={SeasonScene} sceneProps={{ season, a: narrowScreen ? smallSrc(seasons.winter.img) : seasons.winter.img, b: narrowScreen ? smallSrc(seasons.summer.img) : seasons.summer.img }}
              warmup="1200px" premount={1} canvas={{ dpr: [1, 1.5], gl: { antialias: false }, orthographic: true, camera: { position: [0, 0, 1] } }}
              fallback={<SceneFallback src={s.img} alt={s.title} />} />
            <span className="frame-cap label">{s.months}</span>
          </div>
          <div className="season-text">
            <Split text="Built for the season everyone else closes for." />
            <div className="toggle" role="group" aria-label="Choose a season" data-reveal>
              {(['winter', 'summer'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={season === k} onClick={() => setSeason(k)}>{k}</button>
              ))}
            </div>
            <div className="season-copy" aria-live="polite" data-reveal>
              <strong key={s.title}>{s.title}</strong>
              <p>{s.body}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- residences: parallax image stack ---------- */
export function Residences() {
  const ref = useReveal<HTMLDivElement>()
  useEffect(() => {
    if (reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.res-grid figure img').forEach((img, i) => {
        gsap.fromTo(img, { yPercent: -8 - i * 2 }, {
          yPercent: 8 + i * 2, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [ref])
  return (
    <section className="band tone-dusk" id="residences">
      <div className="wrap" ref={ref}>
        <ChapterHead left="The residences" right="Three towers" />
        <div className="res-grid">
          <figure className="r1 clip arch" data-reveal><img src="/media/approach.webp" srcSet={srcSet('/media/approach.webp')} sizes="(max-width: 760px) 100vw, 50vw" loading="lazy" alt="Arrival road leading to the tower entrance, lamp posts and pines" /><figcaption className="label">The arrival</figcaption></figure>
          <figure className="r2 clip" data-reveal><img src="/media/terraces.webp" srcSet={srcSet('/media/terraces.webp')} sizes="(max-width: 760px) 100vw, 50vw" loading="lazy" alt="Balconies and rooftop glasshouse of the tower" /><figcaption className="label">Balconies on every floor</figcaption></figure>
          <figure className="r3 clip" data-reveal><img src="/media/rooftop.webp" srcSet={srcSet('/media/rooftop.webp')} sizes="(max-width: 760px) 100vw, 50vw" loading="lazy" alt="Rooftop terraces at sunset over the forest" /><figcaption className="label">The rooftop at sunset</figcaption></figure>
        </div>
        <div className="res-intro">
          <Split text="One, two and three bedrooms. Furnished and ready." />
          <div className="types">
            {residences.map((r) => (
              <div key={r.name} data-reveal><span>{r.name}</span><span>{r.note}</span></div>
            ))}
            <a className="btn ghost" data-reveal href="#select" onClick={(e) => { e.preventDefault(); scrollTo('#select') }}>Choose your apartment</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- amenities: tabbed chapters with image wipe ---------- */
export function Amenities() {
  const [i, setI] = useState(0)
  const ref = useReveal<HTMLDivElement>()
  const pic = useRef<HTMLDivElement>(null)
  const g = amenityGroups[i]
  useEffect(() => {
    const p = pic.current
    if (!p || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo(p, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1, ease: 'expo.out' })
      gsap.fromTo(p.querySelector('img'), { scale: 1.15 }, { scale: 1, duration: 1.4, ease: 'expo.out' })
      gsap.fromTo('.amen-panel li', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out' })
    })
    return () => ctx.revert()
  }, [i])
  const onKey = (e: React.KeyboardEvent, idx: number) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (idx + d + amenityGroups.length) % amenityGroups.length
    setI(n)
    document.getElementById('tab-' + n)?.focus()
  }
  return (
    <section className="band tone-light" id="amenities">
      <div className="wrap" ref={ref}>
        <ChapterHead left="Amenities" right="50+ on site" />
        <div className="amen">
          <div>
            <Split text="Everything at 7,906 feet." />
            <div className="amen-tabs" role="tablist" aria-label="Amenity groups" data-reveal>
              {amenityGroups.map((grp, idx) => (
                <button key={grp.name} id={'tab-' + idx} role="tab" type="button" aria-selected={i === idx} aria-controls="amen-panel"
                  tabIndex={i === idx ? 0 : -1} onClick={() => setI(idx)} onKeyDown={(e) => onKey(e, idx)}>
                  {grp.name}<span>{String(grp.items.length).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="amen-panel" role="tabpanel" id="amen-panel" aria-labelledby={'tab-' + i} data-reveal>
            <div className="pic arch-wide" ref={pic}><img key={g.img} src={g.img} srcSet={srcSet(g.img)} sizes="(max-width: 820px) 100vw, 55vw" alt={g.name} /></div>
            <ul key={g.name}>
              {g.items.map(([t, d]) => <li key={t}><b>{t}</b><small>{d}</small></li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- ownership: price calculator + Smart Property Unit ---------- */
export function Ownership() {
  const [sq, setSq] = useState(850)
  const [typed, setTyped] = useState('850')
  const ref = useReveal<HTMLDivElement>()
  const total = sq * pricing.perSqft
  const book = total * pricing.bookingShare
  const month = (total - book) / pricing.months
  const set = (v: number) => { const c = Math.max(50, Math.min(5000, Math.round(v) || 50)); setSq(c); setTyped(String(c)) }
  const presets: [number, string][] = [[50, 'Smart unit'], [550, 'example 1-bed'], [850, 'example 2-bed'], [1250, 'example 3-bed']]
  return (
    <section className="band deco" id="ownership">
      <div className="wrap" ref={ref}>
        <ChapterHead left="Ownership" right="PKR 40,000 per sq ft" />
        <div className="own-head">
          <Split text="Thirty percent to book. Thirty-six months to own." em="Thirty-six months to own" />
          <p data-reveal>One price for every apartment: PKR 40,000 per square foot. Pay from 30% at booking and the balance in 36 equal monthly installments. Move the slider to see the numbers for any size.</p>
        </div>
        <div className="own">
          <div className="calc" data-reveal>
            <div className="calc-top"><span className="label">Price calculator</span><span className="label">Covered area</span></div>
            <div className="size-row">
              <input type="range" id="size-range" min={50} max={2000} step={10} value={Math.min(sq, 2000)} onChange={(e) => set(+e.target.value)} aria-label="Apartment size in square feet" />
              <div className="size-box">
                <input type="text" inputMode="numeric" id="size-input" value={typed} aria-label="Apartment size in square feet, typed"
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setTyped(v); if (+v >= 50) setSq(Math.min(5000, +v)) }}
                  onBlur={() => set(+typed)} />
                <span>SQ FT</span>
              </div>
            </div>
            <div className="presets" aria-label="Example sizes">
              {presets.map(([v, l]) => <button key={v} type="button" onClick={() => set(v)}>{v.toLocaleString('en-US')} · {l}</button>)}
            </div>
            <div className="outs">
              <div><span className="label">Total price</span><strong>{pkr(total)}</strong></div>
              <div><span className="label">Booking · 30%</span><strong>{pkr(book)}</strong></div>
              <div><span className="label">36 × monthly</span><strong>{pkr(month)}</strong></div>
            </div>
            <p className="fine">Example sizes are for illustration; actual unit areas come from the floor plans. Figures use the current published price of PKR 40,000 per sq ft and the minimum 30% booking.</p>
          </div>
          <div className="perks">
            <div className="perk-list" data-reveal>
              <h3>What owners receive</h3>
              {ownerBenefits.map((b, i) => <div key={b}><span>{String(i + 1).padStart(2, '0')}</span><span>{b}</span></div>)}
            </div>
            <div className="spu" data-reveal>
              <span className="label">Smart Property Unit</span>
              <h3>Co-own a suite, 50 sq ft at a time.</h3>
              <p>Buy standard 50 sq ft units of a managed apartment. Rental income is shared by unit, and units can be sold or transferred.</p>
              <dl>
                <dt>One unit · {smartUnit.sqft} sq ft</dt><dd>{pkr(smartUnit.value)}</dd>
                <dt>Down payment · 30%</dt><dd>{pkr(smartUnit.down)}</dd>
                <dt>36 monthly installments</dt><dd>{pkr(smartUnit.monthly)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- distances: route line draws as you scroll, below the 3D map ---------- */
export function Location() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.route-line i', { scaleX: 0, scaleY: 0 }, {
        scaleX: 1, scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.route', start: 'top 80%', end: 'bottom 55%', scrub: true },
      })
      gsap.from('.route li', {
        opacity: 0.15, y: 18, stagger: 0.15, ease: 'none',
        scrollTrigger: { trigger: '.route', start: 'top 80%', end: 'bottom 55%', scrub: true },
      })
    }, el)
    return () => ctx.revert()
  }, [])
  return (
    <section className="band tone-light" id="distances">
      <div className="wrap journey" ref={ref}>
        <ChapterHead left="Distances" right="Main Nathia Gali road" />
        <Split text="Every distance, from the front door." />
        <div className="route-wrap">
          <div className="route-line" aria-hidden="true"><i /></div>
          <ol className="route">
            {route.map((r) => (
              <li key={r.place}><span className="dist">{r.dist}</span><span className="place">{r.place}</span><span className="time">{r.time}</span></li>
            ))}
          </ol>
        </div>
        <p className="label route-note">Distances to Serene Heights · line not to scale</p>
      </div>
    </section>
  )
}

/* ---------- founder + construction updates ---------- */
export function Founder() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section className="band tone-dusk">
      <div className="wrap founder" ref={ref}>
        <div data-reveal>
          <span className="label">Construction updates</span>
          <div className="updates">{progress.slice(0, 6).map((u) => <span key={u.date}>{u.date}</span>)}</div>
          <Link className="btn ghost small founder-link" to="/progress">Watch the site visits</Link>
        </div>
        <div>
          <Split as="blockquote" text="“Zero maintenance charges. Zero hidden costs. What you own is what you own.”" em="What you own is what you own" />
          <p className="cite" data-reveal><span>Fahad Masud Lone</span><span className="label">CEO, Serene Heights · DM Consortium</span></p>
        </div>
      </div>
    </section>
  )
}

/* ---------- enquire ---------- */
export function Enquire() {
  const [msg, setMsg] = useState('')
  const [interest, setInterest] = useState('Hotel apartment · 1 bedroom')
  const [unit, setUnit] = useState('')
  const ref = useReveal<HTMLDivElement>()
  // the apartment selector hands over a unit
  useEffect(() => {
    const on = (e: Event) => {
      const { id, beds } = (e as CustomEvent<{ id: string; beds: number }>).detail
      setUnit(id)
      setInterest(`Hotel apartment · ${beds} bedroom`)
      setMsg('')
    }
    window.addEventListener('enquire-unit', on)
    return () => window.removeEventListener('enquire-unit', on)
  }, [])
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (!String(f.get('name')).trim() || !String(f.get('phone')).trim()) {
      setMsg('Add your name and phone number so the team can call you back.')
      return
    }
    // TODO: connect to the client's CRM / email endpoint before launch
    trackLead(String(f.get('interest') || ''))
    setMsg('Thank you. The sales team will call you back shortly.')
    e.currentTarget.reset()
    setUnit('')
  }
  return (
    <section className="band enquire" id="enquire">
      <img src="/media/mist-valley.webp" srcSet={srcSet('/media/mist-valley.webp')} sizes="(max-width: 760px) 100vw, 50vw" loading="lazy" alt="" aria-hidden="true" />
      <div className="wrap enq" ref={ref}>
        <div>
          <span className="label">Enquire</span>
          <Split className="enq-h" text="Your apartment above the snowline." em="above the snowline" />
          <div className="contacts">
            <div data-reveal><span className="label">UAN</span><a className="v" href={`tel:${contact.uan.replace(/-/g, '')}`}>{contact.uan}</a></div>
            <div data-reveal><span className="label">Mobile</span><a className="v" href={`tel:${contact.mobile.replace(/\s/g, '')}`}>{contact.mobile}</a></div>
            <div data-reveal><span className="label">WhatsApp</span><a className="v" href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener">{contact.whatsapp}</a></div>
            <div data-reveal><span className="label">Email</span><a className="v" href={`mailto:${contact.email}`}>{contact.email}</a></div>
          </div>
        </div>
        <form onSubmit={submit} noValidate data-reveal>
          <div className="field"><label htmlFor="f-name">Name</label><input id="f-name" name="name" autoComplete="name" required /></div>
          <div className="field"><label htmlFor="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autoComplete="tel" required /></div>
          <div className="field"><label htmlFor="f-email">Email</label><input id="f-email" name="email" type="email" autoComplete="email" /></div>
          <div className="field"><label htmlFor="f-city">City</label><input id="f-city" name="city" autoComplete="address-level2" /></div>
          <div className="field full"><label htmlFor="f-int">Interested in</label>
            <select id="f-int" name="interest" value={interest} onChange={(e) => setInterest(e.target.value)}>
              <option>Hotel apartment · 1 bedroom</option>
              <option>Hotel apartment · 2 bedroom</option>
              <option>Hotel apartment · 3 bedroom</option>
              <option>Smart Property Unit</option>
              <option>Booking a stay</option>
            </select>
          </div>
          <div className="field full"><label htmlFor="f-unit">Apartment (optional)</label><input id="f-unit" name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. A-503" /></div>
          <button className="btn" type="submit">Request a call back</button>
          <p className="fine form-note">We use your details only to answer this enquiry. See our <Link to="/privacy-policy">privacy policy</Link>.</p>
          {msg && <p className="form-msg" role="status">{msg}</p>}
        </form>
      </div>
    </section>
  )
}

export function Footer() {
  const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <Link className="mark logo" to="/" aria-label="Serene Heights Hotels & Resorts, home"><img src="/media/logo.png" alt="Serene Heights Hotels & Resorts" width="745" height="517" /></Link>
          <p className="fine" style={{ marginTop: 16, maxWidth: '36ch' }}>Main Nathia Gali road, near PAF Airbase, Nathia Gali, Khyber Pakhtunkhwa. Managed by DM Consortium.</p>
        </div>
        <div><span className="label">The resort</span><ul>
          <li><Link to="/#residences">Residences</Link></li>
          <li><Link to="/#select">Choose an apartment</Link></li>
          <li><Link to="/#amenities">Amenities</Link></li>
          <li><Link to="/#ownership">Payment plan</Link></li>
          <li><Link to="/#location">Location</Link></li>
        </ul></div>
        <div><span className="label">More</span><ul>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/smart-property-unit">Smart Property Unit</Link></li>
          <li><Link to="/floor-plans">Floor plans</Link></li>
          <li><Link to="/progress">Construction progress</Link></li>
          <li><Link to="/blog">Journal</Link></li>
        </ul></div>
        <div><span className="label">Contact</span><ul>
          <li><a href={tel(contact.uan)} onClick={() => trackContact('phone')}>{contact.uan}</a></li>
          <li><a href={tel(contact.mobile)} onClick={() => trackContact('phone')}>{contact.mobile}</a></li>
          <li><Link to="/contact">Offices & enquiries</Link></li>
          {contact.social.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noopener">{s.label}</a></li>)}
        </ul></div>
        <div className="foot-base">
          <p className="fine">Prices, payment terms and specifications follow the current published price list and may change. Rental income and profit share depend on hotel occupancy and operating results and are not guaranteed. Renders are illustrative. © 2026 Serene Heights Hotels &amp; Resorts.</p>
          <p className="fine foot-legal"><Link to="/privacy-policy">Privacy policy</Link><CookieSettingsLink /></p>
        </div>
      </div>
    </footer>
  )
}
