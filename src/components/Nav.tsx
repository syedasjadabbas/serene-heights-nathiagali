import { useEffect, useState } from 'react'
import { Link } from '../lib/router'

const pills = [
  ['/#residences', 'Residences'],
  ['/#select', 'Apartments'],
  ['/floor-plans', 'Floor plans'],
  ['/progress', 'Progress'],
] as const

const menu = {
  'The resort': [
    ['/#resort', 'The resort'],
    ['/#residences', 'Residences'],
    ['/#select', 'Choose an apartment'],
    ['/#amenities', 'Amenities'],
    ['/#ownership', 'Payment plan'],
    ['/#location', 'Location'],
  ],
  More: [
    ['/about', 'About'],
    ['/smart-property-unit', 'Smart Property Unit'],
    ['/floor-plans', 'Floor plans'],
    ['/progress', 'Construction progress'],
    ['/blog', 'Journal'],
    ['/contact', 'Contact'],
  ],
} as const

export function Nav({ home }: { home: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.5)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  const close = () => setOpen(false)
  const solid = scrolled || !home
  return (
    <header className={`nav${solid ? ' solid' : ''}${open ? ' open' : ''}`}>
      <div className="wrap nav-row">
        <nav aria-label="Main" className="nav-pills">
          <ul>
            {pills.map(([h, l]) => <li key={h}><Link to={h} onClick={close}>{l}</Link></li>)}
          </ul>
        </nav>
        <Link className="mark logo" to="/" onClick={close} aria-label="Serene Heights Hotels & Resorts, home">
          <img src="/media/logo.png" alt="Serene Heights Hotels & Resorts" width="745" height="517" />
        </Link>
        <div className="nav-actions">
          <Link className="btn small" to="/contact" onClick={close}>Request a call</Link>
          <button className="burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
            <span /><span />
          </button>
        </div>
      </div>
      <nav id="site-menu" className="menu" aria-label="Site" hidden={!open}>
        <div className="wrap menu-grid">
          {Object.entries(menu).map(([group, items]) => (
            <div key={group}>
              <span className="label">{group}</span>
              <ul>{items.map(([h, l]) => <li key={h}><Link to={h} onClick={close}>{l}</Link></li>)}</ul>
            </div>
          ))}
        </div>
      </nav>
    </header>
  )
}
