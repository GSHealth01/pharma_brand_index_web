# Pharma Brand Index – Sri Lanka (Website)

Responsive website version of the Pharma Brand Index mobile app (`../pharma_brand_index`).
It has the same content and wording, the same brand colours and gradient, and a layout built for
both phones and desktop browsers.

**Data comes straight from the NMRA sources.** It doesn't use the Emergent-hosted backend.
The project has its own API with the same endpoints, so the mobile app can use it too.

## Stack
React 19 + TypeScript + Vite 6 + React Router 7. Icons are Material Design Icons (the same set as
the app). The font is Plus Jakarta Sans.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173 (website + /api together)
npm run build      # outputs static files to dist/
npm run sync-data  # re-download and re-parse the NMRA registries into data/
```

## Data pipeline
```
nmra.gov.lk ──▶ scripts/sync-data.mjs ──▶ data/*.json ──▶ api/handler.ts ──▶ website / mobile app
 (xls + pdfs)     (discover, download,     (committed)      (/api/* on Vercel,
                   parse, normalize)                         Vite middleware in dev)
```
- `scripts/sync-data.mjs` finds the newest "MEDICINE VALID REGISTRATIONS" Excel on nmra.gov.lk.
  It also downloads the Borderline (3 schedule PDFs) and Cosmetics PDFs. The homepage doesn't link
  those, so it falls back to their known URLs, exactly as the old backend did.
- `scripts/lib/` ports the backend's Python parsers to Node:
  - `medicine.mjs` handles the Excel file (SheetJS), including the generic-name and strength
    extraction and the de-duplication.
  - `pdf-tables.mjs` is a port of pdfplumber's table detection onto pdf.js (edges, intersections,
    cells, rows).
  - Product IDs use the same UUIDv5 scheme, so links and favorites stay compatible.
- Verified against the old backend: identical record counts and byte-identical API responses
  on the endpoints tested (before the borderline fix below).
- **Borderline fix:** the old parser only read page 1 of each borderline PDF, because the header
  row appears only there, so it dropped every continuation page. Now all pages are parsed, and
  the borderline lists are found on NMRA's /pages/borderline-products page ("Registered
  Borderline Products List - I / IIA / IIB"). Current snapshot: **6,642 medicines, 181
  borderline products (was 33), 7,711 cosmetics**.
- **The data is a one-time snapshot for now.** Run `npm run sync-data`, commit `data/` and redeploy
  to refresh it. A daily GitHub Action can automate this later.
- "Popular searches" ranks generics by number of registered brands. The old backend counted
  users' searches in MongoDB, which this setup doesn't have.

## Configuration
No configuration is needed: the site uses its own `/api`. The optional `VITE_EXTERNAL_API_URL`
(see `.env.example`) points it at a different backend with the same endpoints instead.
The old `VITE_API_BASE_URL` is ignored. If it's still set in Vercel, delete it.

## Deploy (Vercel)
Use the **Vite** preset with the defaults. `vercel.json` already:
- routes `/api/*` to the `api/handler.ts` function and bundles `data/**` with it
- sends every other path to `index.html`, so page links work when opened directly

No environment variables are needed. The API sends `Access-Control-Allow-Origin: *`, so the
mobile app can use it by setting `EXPO_PUBLIC_BACKEND_URL=https://<your-site>.vercel.app`.
(The app's login, favorites and recent-search endpoints aren't included. Those features are
switched off in the public build anyway.)

## Pages (mapped to the app screens)
| Route | App screen |
|---|---|
| `/` | Welcome / Get Started |
| `/home` | Home (greeting, category tabs, search, ad carousel, recently searched, popular) |
| `/search?q=` | Search (live suggestions, popular searches, recent searches) |
| `/brands/:generic?category=` | Brand List |
| `/product/:id` | Product Details (same field visibility rules per category) |
| `/favorites` | Favorites |
| `/more`, `/about`, `/privacy`, `/terms` | More menu and legal pages (client wording unchanged) |

## Differences from the app
- **Favorites and recent searches are saved in the browser (localStorage).** In the app they are
  server-side and need login, which is switched off in the public build, so they don't persist
  there. On the website they work with no account.
- Live search dropdown on Home. Keyboard navigation (↑ ↓ Enter Esc, and `/` to focus search).
  Matched text is highlighted, and each result is labelled Generic or Brand.
- Brand List: filter by brand, manufacturer or strength; filter chips by dosage form; sorting.
- Product Details: breadcrumbs, a share / copy-link button, and a link to all brands of the generic.
- Shareable URLs for every search, brand list and product.
- Skeleton loaders and retry buttons on errors.
- Desktop: top navigation, multi-column layouts, and a sticky table of contents on legal pages.
  Mobile: bottom tab bar with the gradient Search button, as in the app.

## Motion and interaction
The animation toolkit is custom-built (`src/lib/motion.tsx`, `src/motion.css`, `src/components/AnimatedIcons.tsx`)
with no animation library:
page transitions, scroll-reveal with stagger, 3D tilt cards with a cursor spotlight and gradient border,
cursor parallax and floating capsules on the Welcome page, live stat counters (from `/api/health`),
animated SVG illustrations in place of emoji,
a typewriter search placeholder, ripple feedback, a confetti burst when favoriting, a scroll-progress bar,
a back-to-top button with a progress ring, and carousel dots that fill with the autoplay timer.
Everything turns off when the OS "reduce motion" setting is on.

## Note for Windows machines with Application Control
Vite 8 (rolldown) and oxlint ship native `.node` binaries that some Windows App Control policies
block. That is why this project is pinned to Vite 6.
