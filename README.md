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

- `src/data/site.ts` — all copy, prices and contacts (from sereneheightsnathiagali.com)
- `src/three/` — WebGL scenes: hero (towers, ridges, forest, snow, light trails), gallery, season transition, 3D map
- `src/components/` — page sections, preloader, nav
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

Before launch: connect the enquiry form (`Enquire` in `src/components/Sections.tsx`) to the sales team's email or CRM, and swap the text wordmark for the logo file.
