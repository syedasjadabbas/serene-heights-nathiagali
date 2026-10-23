# Serene Heights Nathia Gali — website

React + Three.js (React Three Fiber) + GSAP ScrollTrigger + Lenis.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # output in dist/
```

The folder path contains `&`, which breaks npm's `.bin` shims on Windows, so the
scripts call `node ./node_modules/...` directly.

## Structure

- `src/data/site.ts` — home page copy, prices and contacts (from sereneheightsnathiagali.com)
- `src/data/pages.ts` — inner-page content: about, Smart Property Unit, floor plans, progress videos, blog list, privacy policy, offices
- `src/pages/Pages.tsx` — inner pages: /about, /smart-property-unit, /floor-plans, /progress, /blog, /contact, /privacy-policy, 404
- `src/three/` — WebGL scenes, loaded on demand through `CanvasHost.tsx` so the first page load ships without three.js
- `src/components/` — page sections, preloader, nav, WhatsApp button and cookie notice (`Chrome.tsx`)
- `src/lib/` — scroll, router (history API), analytics (consent-gated), device checks
- `public/media/` — renders (resized to 1800px)
- `concept/` — the first static design concept

## Elevation data

`public/data/galiyat-dem.bin` is real terrain from the free AWS Terrain Tiles
(Terrarium, zoom 11, about 60 m/px), resampled to a 200 m grid of Int16 metres.
To rebuild it:

```bash
python scripts/fetch_tiles.py <empty-folder-for-tiles>
python scripts/build_dem.py <that-folder> public/data/galiyat-dem.bin
```

## Hosting notes

- **Vercel:** `vercel.json` sends every path to `index.html` (static files are served first),
  caches `/assets` for a year (hashed names) and `/media`, `/data` for 30 days, and adds basic
  security headers. Build `npm run build`, output `dist`, Node 20.19+. Set analytics IDs as
  Vercel environment variables, then redeploy (they are read at build time).
- **Domain:** canonical links, share tags (`index.html`), `public/robots.txt` and `public/sitemap.xml`
  assume `https://www.sereneheightsnathiagali.com`. Change them if the site goes elsewhere.
- **Analytics:** copy `.env.example` to `.env` and set `VITE_GA4_ID` and/or `VITE_META_PIXEL_ID`.
  With neither set, nothing loads and no cookie notice appears. Tracked: page views, `generate_lead`/`Lead`
  on enquiry, `contact`/`Contact` on WhatsApp, phone and email taps.
- **Old addresses:** `vercel.json` permanently redirects the previous site's `/nathiagali/...` pages
  (blog articles included) to their new addresses, so old links and search results keep working.
- **Self-contained:** floor plans (`public/media/plans`), blog covers (`public/media/blog`) and the
  30 journal articles (`public/data/blog/<slug>.json`, shown at `/blog/<slug>`) are all hosted here.
  To add an article, add its entry to `posts` in `src/data/pages.ts`, a JSON file in the same shape
  as the others, and a cover image, then list it in `public/sitemap.xml`.
- **Enquiry emails:** the form posts to `api/enquire.ts`, a Vercel function that emails the
  enquiry through [Resend](https://resend.com). In Vercel → Settings → Environment Variables set
  `RESEND_API_KEY`, `ENQUIRY_FROM` (an address on a domain verified in Resend, e.g.
  `Serene Heights Website <website@sereneheightsnathiagali.com>`) and optionally `ENQUIRY_TO`
  (default `info@sereneheightsnathiagali.com`). Until the domain is verified, Resend's test sender
  `onboarding@resend.dev` only delivers to the Resend account's own email. If sending fails, the
  form shows the phone and WhatsApp numbers instead. `npm run dev` has no `/api`; use `vercel dev`
  to try the form locally.
- **No WebGL:** each 3D section falls back to a render photo (the map section is skipped; the
  distances list follows it).

## Phases

1. Done — WebGL opening, scroll story, all content sections
2. Done — 3D map of the Galiyat (`src/three/geo.ts`, `src/three/MapScene.tsx`): towns at real coordinates, real elevation data, scroll-drawn routes from Islamabad and Abbottabad
3. Done (interim) — apartment selector (`src/components/Selector.tsx`, `src/three/SelectorScene.tsx`):
   3D massing of the three towers, clickable floors, floor plans, unit price card,
   apartment finder, and hand-off to the enquiry form.
   - Uses a **sample inventory** (`src/data/units.ts`, `SAMPLE_INVENTORY = true`). Replace
     `buildSampleUnits()` with the client's unit list and set the flag to `false` to hide the notice.
   - When the architect's 3D model arrives (GLB/FBX), it can replace the massing in `SelectorScene`.
   - Floor plans are schematic (two rows of units either side of a corridor) until real plans are supplied.

