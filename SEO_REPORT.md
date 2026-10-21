# SEO report: thehomies.app (branch seo/organic, 2026-10-21)

## Before
`curl https://www.thehomies.app/` returned the SPA shell: `<title>The Homies Hub</title>`, a generic description, `<div id="root"></div>` and no text. /shop was identical. `robots.txt` blocked a few feeds only. The sitemap (served by the backend, `/og/sitemap.xml`) lists shop, music and post URLs but not /about or any landing page. Product pages (`/shop/:slug`) are served by the backend `/og/shop/:slug` route with title, description and Product JSON-LD (real prices) but an empty body.

## What changed
- **Build-time prerender** (`tools/seo/prerender.mjs`, runs after `vite build` via `npm run build`; plain Node, no browser). Prices come from the live `GET /api/merch/products` at build time, with `tools/seo/products-snapshot.json` as the offline fallback.
  - `/` -> `home.html`: SPA shell + unique title/meta/canonical/OG/Twitter, Organization + WebSite JSON-LD, real HTML in `#root`. React still boots and replaces it (verified in headless Edge, no page errors).
  - `/shop` -> `shop-index.html`: same approach, lists all in-stock products with "from" prices, ItemList of Product + Offer JSON-LD (prices from the API, no ratings).
  - 4 standalone landing pages (600-900+ words each, FAQ, BreadcrumbList, FAQPage, Organization JSON-LD), no JS: `/about`, `/live-boxing-stream-community`, `/streetwear-merch`, `/community-chat-and-membership`.
  - `sitemap-pages.xml` (home, shop, 4 landing pages, lastmod 2026-10-21).
- **vercel.json:** the SPA shell is now `/app.html` (every SPA rewrite points there). New rewrites `/` -> `/home.html` and `/shop` -> `/shop-index.html`. `dist/index.html` is intentionally absent: the backend OG routes fetch `https://www.thehomies.app/index.html` as the shell, and that URL now resolves through the catch-all to the clean `app.html`, so product/song/post pages keep working unchanged.
- **robots.txt:** adds disallows for admin, settings, wallet, billing, auth, studio, search, inbox, cart/checkout/orders/design; allows everything else; lists both sitemaps.
- **App:** LandingPage and ShopHome Helmet titles/descriptions/canonical match the prerendered ones (so Google's rendered title does not flip). Landing footer gets a "Learn more" column linking the four pages with plain anchors. Landing pages' header/footer link to each other, the shop and the app.
- `SEO_TOPICS.md`: 15 article ideas.

## Target keywords
| Page | Primary / secondary |
|---|---|
| / | the homies app; the homies live streams, clips, merch |
| /shop | the homies shop; streetwear tees hoodies dad hats |
| /streetwear-merch | streetwear merch The Homies; embroidered dad hat; design your own hoodie |
| /live-boxing-stream-community | live boxing stream community; watch boxing with live chat |
| /community-chat-and-membership | homies chat community; digital nomad membership |
| /about | about The Homies; Mwosa community app |

## After (raw HTML, `curl`-equivalent on build output)
home.html: unique title (55 chars), description, canonical, 1 H1, 2 JSON-LD blocks, visible text in `#root`. shop-index.html: 118 products with names, links, prices. Landing pages: 736-933 words of visible text each. All JSON-LD parses; titles <= 55 chars; descriptions 126-150 chars.

## Owner actions
1. Review the Vercel **preview** deploy of this branch before merging: check `/`, `/shop`, a product page (`/shop/say-less-tee`), a song page and `/index.html`. The routing change (no `dist/index.html`) is the one risk.
2. Search Console: verify www.thehomies.app, submit `sitemap.xml` and `sitemap-pages.xml`, request indexing for the 6 new URLs.
3. Backend (out of this repo): `/og/shop/:slug` pages have Product JSON-LD but an empty body and use the brand "The Homies Hub" in title/brand. Add visible product text and rename to "The Homies" there. The backend sitemap could also list /about and the landing pages.
4. Prices on `/shop` and the merch guide are frozen at build time; redeploy after price changes.
5. Confirm the fight-night and Mwosa copy is what you want public (no betting, no event names or dates are mentioned).
