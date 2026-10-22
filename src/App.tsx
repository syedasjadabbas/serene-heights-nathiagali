import { useCallback, useEffect, useState } from 'react'
import { Preloader } from './components/Preloader'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Gallery } from './components/Gallery'
import { MapSection } from './components/MapSection'
import { Selector } from './components/Selector'
import { Amenities, Enquire, Figures, Footer, Founder, Location, Ownership, Residences, Seasons, Statement } from './components/Sections'
import { ScrollTrigger, startSmoothScroll } from './lib/scroll'

export default function App() {
  const [started, setStarted] = useState(false)
  const onDone = useCallback(() => setStarted(true), [])

  useEffect(() => {
    startSmoothScroll()
    // images and fonts change section heights after first layout
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    document.fonts.ready.then(refresh)
    return () => window.removeEventListener('load', refresh)
  }, [])

  return (
    <>
      <Preloader onDone={onDone} />
      <Nav />
      <main>
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
      <Footer />
    </>
  )
}
