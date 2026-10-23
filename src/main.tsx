import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { ScrollTrigger } from './lib/scroll'
import { startPreload } from './lib/preload'

// Every load starts at the top: no restored scroll position, no jump to a #section.
ScrollTrigger.clearScrollMemory('manual')
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
if (location.hash) history.replaceState(null, '', location.pathname + location.search)
window.scrollTo(0, 0)
window.addEventListener('beforeunload', () => window.scrollTo(0, 0))

// The loading screen in index.html is plain HTML: let the browser paint it first, then start
// the 3D engine and React, whose first render takes the main thread for a moment.
let booted = false
function boot() {
  if (booted) return
  booted = true
  createRoot(document.getElementById('root')!).render(<App />)
  // the home page needs its 3D straight away; a sub-page shows its text first
  if (location.pathname.replace(/\/+$/, '') === '') startPreload()
  else setTimeout(startPreload, 800)
}
requestAnimationFrame(() => setTimeout(boot, 0))
setTimeout(boot, 120) // background tabs get no animation frames
