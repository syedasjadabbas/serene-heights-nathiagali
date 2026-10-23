import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The hero's 3D engine is loaded with a dynamic import, so normally the browser only learns of it
// once the main bundle has downloaded and run. Adding modulepreload links from the HTML lets both
// download side by side from the first byte.
function preloadHero(): Plugin {
  const wanted = /\/src\/three\/(CanvasHost|HeroScene)\.tsx$/
  return {
    name: 'preload-hero',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
        const byName = new Map(chunks.map((c) => [c.fileName, c]))
        const files = new Set<string>()
        const add = (name: string) => {
          const c = byName.get(name)
          if (!c || c.isEntry || files.has(name)) return
          files.add(name)
          c.imports.forEach(add)
        }
        chunks.filter((c) => c.facadeModuleId && wanted.test(c.facadeModuleId.replace(/\\/g, '/'))).forEach((c) => add(c.fileName))
        // home page only: on a sub-page the 3D can wait, and its text and images come first
        const list = JSON.stringify([...files].map((f) => `/${f}`))
        const script = `if (location.pathname.replace(/\\/+$/, '') === '') for (const h of ${list}) { const l = document.createElement('link'); l.rel = 'modulepreload'; l.crossOrigin = ''; l.href = h; document.head.appendChild(l) }`
        return [{ tag: 'script', children: script, injectTo: 'head' as const }]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadHero()],
  server: { port: 5180 },
})
