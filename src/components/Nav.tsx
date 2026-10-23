import { useEffect, useState } from 'react'
import { scrollTo } from '../lib/scroll'

const links = [
  ['#residences', 'Residences'],
  ['#select', 'Apartments'],
  ['#ownership', 'Payment plan'],
  ['#location', 'Location'],
] as const

export function Nav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.5)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    scrollTo(href)
  }
  return (
    <header className={`nav${solid ? ' solid' : ''}${open ? ' open' : ''}`}>
      <div className="wrap nav-row">
        <nav aria-label="Main">
          <ul>
            {links.map(([h, l]) => (
              <li key={h}><a href={h} onClick={go(h)}>{l}</a></li>
            ))}
          </ul>
        </nav>
        <a className="mark logo" href="#top" onClick={go('#top')} aria-label="Serene Heights Hotels & Resorts, back to top">
          <img src="/media/logo.png" alt="Serene Heights Hotels & Resorts" width="745" height="517" />
        </a>
        <div className="nav-actions">
          <a className="btn small" href="#enquire" onClick={go('#enquire')}>Request a call</a>
          <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
