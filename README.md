# Pharma Brand Index – Sri Lanka (Website)

Responsive website version of the Pharma Brand Index mobile app (`../pharma_brand_index`).
It uses the **same FastAPI backend and API**, the same content and wording, and the same brand
colours and gradient. The layout is built for both phones and desktop browsers.

## Stack
React 19 + TypeScript + Vite 6 + React Router 7. Icons are Material Design Icons (the same set as
the app). The font is Plus Jakarta Sans.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs static files to dist/
npm run preview    # serve the production build locally
```

## Configuration
The backend URL is **not** hard-coded. It's read from `VITE_API_BASE_URL` at build time.
Copy `.env.example` to `.env` and set it:
```
VITE_API_BASE_URL=https://your-backend.example.com
```
`.env` is git-ignored. On Netlify or Vercel, set the same variable in the project's environment settings.
Restart `npm run dev` after changing it, because Vite reads env files only at startup.

## Deploy
`dist/` is a static single-page app, so any static host works: Netlify, Vercel, Cloudflare Pages,
S3 + CloudFront or cPanel. SPA fallback rules are included:
- `public/_redirects` for Netlify and Cloudflare Pages
- `vercel.json` for Vercel
- For Apache or cPanel, add an `.htaccess` that rewrites every unknown path to `/index.html`.

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
