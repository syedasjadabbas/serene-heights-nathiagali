import { useState } from 'react'
import { contact } from '../data/site'
import { Link } from '../lib/router'
import { analyticsConfigured, getConsent, setConsent, trackContact } from '../lib/analytics'

const waNumber = contact.whatsapp.replace(/\D/g, '')
const waText = encodeURIComponent('Hello Serene Heights, I would like to know more about the apartments in Nathia Gali.')

/** Floating WhatsApp button, on every page. */
export function WhatsAppButton() {
  return (
    <a className="wa-float" href={`https://wa.me/${waNumber}?text=${waText}`} target="_blank" rel="noopener"
      aria-label="Chat with Serene Heights on WhatsApp" onClick={() => trackContact('whatsapp')}>
      <svg viewBox="0 0 32 32" aria-hidden="true" width="26" height="26">
        <path fill="currentColor" d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.4 28.8l6.6-1.7A12.7 12.7 0 1 0 16 3.2Zm0 23.1c-2 0-3.9-.5-5.5-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.4 10.4 0 1 1 16 26.3Zm5.7-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4Z" />
      </svg>
    </a>
  )
}

/** Cookie notice, shown only when analytics IDs are configured and the visitor hasn't chosen yet. */
export function CookieNotice() {
  const [open, setOpen] = useState(() => analyticsConfigured && getConsent() === null)
  if (!open) return null
  const choose = (c: 'granted' | 'denied') => { setConsent(c); setOpen(false) }
  return (
    <div className="cookie" role="dialog" aria-live="polite" aria-label="Cookie choices">
      <p>We use analytics cookies to understand how visitors use this site. <Link to="/privacy-policy">Privacy policy</Link></p>
      <div className="cookie-actions">
        <button type="button" className="btn ghost small" onClick={() => choose('denied')}>Decline</button>
        <button type="button" className="btn small" onClick={() => choose('granted')}>Accept</button>
      </div>
    </div>
  )
}

/** Footer link to reopen the cookie choice. */
export function CookieSettingsLink() {
  if (!analyticsConfigured) return null
  return (
    <button type="button" className="link-btn" onClick={() => { try { localStorage.removeItem('sh-consent') } catch { /* ignore */ } location.reload() }}>
      Cookie settings
    </button>
  )
}
