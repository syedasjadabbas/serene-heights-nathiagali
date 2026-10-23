// Google Analytics 4 and Meta Pixel, loaded only after the visitor accepts the cookie notice.
// Set the IDs in .env (see .env.example). With no IDs set, nothing loads and no notice shows.

type Gtag = (...args: unknown[]) => void
type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; callMethod?: (...a: unknown[]) => void }
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag; fbq?: Fbq; _fbq?: Fbq }
}

const GA_ID = import.meta.env.VITE_GA4_ID as string | undefined
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined
const KEY = 'sh-consent'

export const analyticsConfigured = Boolean(GA_ID || PIXEL_ID)
export type Consent = 'granted' | 'denied' | null

export function getConsent(): Consent {
  try { return (localStorage.getItem(KEY) as Consent) ?? null } catch { return null }
}
export function setConsent(c: 'granted' | 'denied') {
  try { localStorage.setItem(KEY, c) } catch { /* private mode: choice lasts this visit */ }
  if (c === 'granted') load()
}

let loaded = false
function addScript(src: string) {
  const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s)
}
function load() {
  if (loaded || !analyticsConfigured) return
  loaded = true
  if (GA_ID) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() { window.dataLayer!.push(arguments) } as Gtag
    window.gtag('js', new Date())
    window.gtag('config', GA_ID, { anonymize_ip: true })
    addScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
  }
  if (PIXEL_ID) {
    const f: Fbq = function (...args: unknown[]) { f.callMethod ? f.callMethod(...args) : f.queue!.push(args) } as Fbq
    f.queue = []; f.loaded = true; f.version = '2.0'; f.push = f
    window.fbq = f; window._fbq = f
    addScript('https://connect.facebook.net/en_US/fbevents.js')
    f('init', PIXEL_ID)
    f('track', 'PageView')
  }
}

/** Load trackers on start if the visitor already accepted. */
export function initAnalytics() { if (getConsent() === 'granted') load() }

/** Record a page view after a client-side route change. */
export function trackPage(path: string) {
  if (!loaded) return
  window.gtag?.('event', 'page_view', { page_path: path })
  window.fbq?.('track', 'PageView')
}

/** Enquiry submitted: GA4 `generate_lead`, Meta `Lead`. */
export function trackLead(interest: string) {
  if (!loaded) return
  window.gtag?.('event', 'generate_lead', { interest })
  window.fbq?.('track', 'Lead', { content_name: interest })
}

/** WhatsApp, phone or email tapped: GA4 `contact`, Meta `Contact`. */
export function trackContact(method: 'whatsapp' | 'phone' | 'email') {
  if (!loaded) return
  window.gtag?.('event', 'contact', { method })
  window.fbq?.('track', 'Contact', { method })
}
