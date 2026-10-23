import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { Preloader } from './components/Preloader'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Gallery } from './components/Gallery'
import { MapSection } from './components/MapSection'
import { Selector } from './components/Selector'
import { WhatsAppButton, CookieNotice } from './components/Chrome'
import { Amenities, Enquire, Figures, Footer, Founder, Location, Ownership, Residences, Seasons, Statement } from './components/Sections'
import { AboutPage, BlogPage, ContactPage, FloorPlansPage, NotFoundPage, PrivacyPage, ProgressPage, SmartUnitPage } from './pages/Pages'
import { ScrollTrigger, jumpTo, startSmoothScroll } from './lib/scroll'
import { takePendingHash, usePath } from './lib/router'
import { initAnalytics, trackPage } from './lib/analytics'

type Route = { page: ComponentType; title: string; description: string }
const SITE = 'Serene Heights Nathia Gali'
export const ROUTES: Record<string, Route> = {
  '/about': { page: AboutPage, title: `About | ${SITE}`, description: 'Serene Heights is Pakistan’s first winter resort: fully furnished, hotel-managed apartments at 7,906 ft in Nathia Gali, developed by DM Consortium.' },
  '/smart-property-unit': { page: SmartUnitPage, title: `Smart Property Unit | ${SITE}`, description: 'Co-own a managed Serene Heights apartment from 50 sq ft: PKR 2,250,000 per unit, 30% down and 36 monthly installments.' },
  '/floor-plans': { page: FloorPlansPage, title: `Floor Plans | ${SITE}`, description: 'Floor plans for Serene Heights Nathia Gali: ground floor arrival and lobby, and the residential floors of the main tower.' },
  '/progress': { page: ProgressPage, title: `Construction Progress | ${SITE}`, description: 'Site-visit films from the construction of Serene Heights Nathia Gali, from December 2021 to the latest update.' },
  '/blog': { page: BlogPage, title: `Journal | ${SITE}`, description: 'Travel guides to Nathia Gali and buyer guides on hotel-apartment ownership, payment plans and returns.' },
  '/contact': { page: ContactPage, title: `Contact | ${SITE}`, description: 'Call 042-111-111-744, WhatsApp +92 321 4979447, or send an enquiry to the Serene Heights sales team.' },
  '/privacy-policy': { page: PrivacyPage, title: `Privacy Policy | ${SITE}`, description: 'How Serene Heights collects, uses and protects your information.' },
}
const HOME_TITLE = `${SITE} | Pakistan's First Winter Resort`
const HOME_DESCRIPTION = 'Fully furnished hotel apartments at 7,906 ft in Nathia Gali. 150+ apartments, 3 towers, 50+ amenities. PKR 40,000 per sq ft, 30% booking, 36 monthly installments.'

function setMeta(title: string, description: string, path: string) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://www.sereneheightsnathiagali.com${path === '/' ? '/' : path}`)
}

// The preloader belongs to the first visit of the home page only.
const firstPath = typeof window !== 'undefined' ? window.location.pathname : '/'
let preloaded = !(firstPath === '/' || firstPath === '')

function Home() {
  const [started, setStarted] = useState(preloaded)
  const onDone = useCallback(() => { preloaded = true; setStarted(true) }, [])
  useEffect(() => {
    // arriving from another page: once layout settles, jump straight to the section
    const hash = takePendingHash()
    if (!hash) return
    // retry a few times, since images and fonts can still move the section as the page loads
    const timers: number[] = []
    const land = (tries: number) => {
      ScrollTrigger.refresh()
      const el = document.getElementById(hash)
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY
      jumpTo(y)
      if (tries > 0) timers.push(window.setTimeout(() => {
        if (Math.abs(document.getElementById(hash)!.getBoundingClientRect().top) > 4) land(tries - 1)
      }, 400))
    }
    timers.push(window.setTimeout(() => land(4), 300))
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <>
      {!preloaded && <Preloader onDone={onDone} />}
      <main id="main">
        <Hero started={started} />
        <Figures />
        <Statement />
        <Seasons />
        <Residences />
        <Selector />
        <Gallery />
        <Amenities />
        <Ownership />
        <MapSection />
        <Location />
        <Founder />
        <Enquire />
      </main>
    </>
  )
}

export default function App() {
  const path = usePath()
  const route = path === '/' ? null : ROUTES[path]
  const first = useRef(true)

  useEffect(() => {
    startSmoothScroll()
    initAnalytics()
    // images and fonts change section heights after first layout
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    document.fonts.ready.then(refresh)
    return () => window.removeEventListener('load', refresh)
  }, [])

  useEffect(() => {
    if (path === '/') setMeta(HOME_TITLE, HOME_DESCRIPTION, path)
    else if (route) setMeta(route.title, route.description, path)
    else setMeta(`Page not found | ${SITE}`, HOME_DESCRIPTION, path)
    if (!first.current) trackPage(path)
    first.current = false
  }, [path, route])

  const Page = route?.page ?? NotFoundPage
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav home={path === '/'} />
      {path === '/' ? <Home key="home" /> : <main id="main" key={path}><Page /></main>}
      <Footer />
      <WhatsAppButton />
      <CookieNotice />
    </>
  )
}
