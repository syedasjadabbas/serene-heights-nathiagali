import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { ScrollTrigger } from './lib/scroll'

// Every load starts at the top: no restored scroll position, no jump to a #section.
ScrollTrigger.clearScrollMemory('manual')
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
if (location.hash) history.replaceState(null, '', location.pathname + location.search)
window.scrollTo(0, 0)
window.addEventListener('beforeunload', () => window.scrollTo(0, 0))

createRoot(document.getElementById('root')!).render(
  <App />,
)
