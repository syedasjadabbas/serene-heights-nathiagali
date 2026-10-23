import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'
import { jumpTo, scrollTo, ScrollTrigger } from './scroll'

// A small history-API router: real URLs (/about, /floor-plans…), back/forward support,
// and links like "/#residences" that land on a section of the home page.
// The host must serve index.html for every path (SPA fallback) — see README.

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
if (typeof window !== 'undefined') window.addEventListener('popstate', notify)

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const getPath = () => normalise(window.location.pathname)
const normalise = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/'

export function usePath() {
  return useSyncExternalStore(subscribe, getPath, () => '/')
}

let pendingHash = ''
/** Section to scroll to once the home page has rendered after a cross-page link. */
export function takePendingHash() { const h = pendingHash; pendingHash = ''; return h }

export function navigate(to: string) {
  const [rawPath, hash = ''] = to.split('#')
  const path = normalise(rawPath || window.location.pathname)
  if (path !== getPath()) {
    window.history.pushState(null, '', path)
    pendingHash = hash
    jumpTo(0)
    notify()
    requestAnimationFrame(() => ScrollTrigger.refresh())
  } else if (hash) {
    scrollTo('#' + hash)
  } else {
    scrollTo(document.body)
  }
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handle} {...rest} />
}
