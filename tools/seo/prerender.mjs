// Post-build SEO step. Run after `vite build` (see package.json "build").
//
// What it does (no browser needed, plain Node):
//   1. dist/index.html (the clean SPA shell) is copied to dist/app.html. vercel.json sends every
//      SPA route there. The backend's /og/* routes fetch /index.html as the shell, so that URL still
//      resolves (via the catch-all rewrite) to the clean shell.
//   2. dist/home.html = shell + unique title/meta/JSON-LD + real HTML inside #root for "/".
//      dist/shop/index.html does the same for /shop (lists every in-stock product with live prices).
//      The React app still boots on those pages and replaces the static markup.
//   3. Standalone landing pages (dist/<path>/index.html), no JS needed.
//   4. dist/sitemap-pages.xml. robots.txt (public/) references it next to the backend's sitemap.xml.
//
// Product prices come from the live shop API at build time; tools/seo/products-snapshot.json is the
// fallback if the API is unreachable, so the build never fails on network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, YOUTUBE, UPDATED, NAV, LANDING, HOME, SHOP_PAGE } from './content.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../dist');
const API = 'https://backend.thehomies.app/api/merch/products';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const usd = (c) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

async function loadProducts() {
  try {
    const r = await fetch(API, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j.enabled || !Array.isArray(j.products) || j.products.length < 5) throw new Error('shop disabled/empty');
    console.log(`[seo] ${j.products.length} products from live API`);
    return j.products;
  } catch (e) {
    console.warn(`[seo] product API unavailable (${e.message}); using snapshot`);
    return JSON.parse(fs.readFileSync(path.join(here, 'products-snapshot.json'), 'utf8'));
  }
}

function priceStats(products) {
  const ok = products.filter((p) => !p.soldOut && p.minPriceCents > 0);
  const by = {};
  for (const p of ok) {
    const k = p.productType;
    (by[k] ||= []).push(p.minPriceCents);
  }
  const min = (k) => (by[k] ? Math.min(...by[k]) : null);
  return { by, ok, teeFrom: usd(min('tee')), hoodieFrom: usd(min('hoodie')), hatFrom: usd(min('hat')) };
}

const TYPE_LABEL = { tee: 'T-shirts', hoodie: 'Hoodies', hat: 'Dad hats (embroidered)', beanie: 'Beanies', crewneck: 'Crewnecks', longsleeve: 'Long sleeves' };

function priceTable(st) {
  const rows = Object.keys(TYPE_LABEL).filter((k) => st.by[k]).map((k) => {
    const lo = Math.min(...st.by[k]);
    const hi = Math.max(...st.by[k]);
    return `<tr><td>${TYPE_LABEL[k]}</td><td>${st.by[k].length}</td><td>${lo === hi ? usd(lo) : `${usd(lo)} to ${usd(hi)}`}</td></tr>`;
  });
  return `<table><thead><tr><th>Type</th><th>Designs</th><th>Starting price</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function fill(str, st) {
  return str
    .replaceAll('{{teeFrom}}', st.teeFrom)
    .replaceAll('{{hoodieFrom}}', st.hoodieFrom)
    .replaceAll('{{hatFrom}}', st.hatFrom)
    .replaceAll('{{priceTable}}', priceTable(st));
}

const CSS = `
:root{--bg:#0b0b0e;--card:#15151b;--fg:#f4f1ea;--mut:#b4b0a6;--gold:#f0b94d;--line:#26262e}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--gold)}a:hover{text-decoration:none}
header.site{border-bottom:1px solid var(--line);padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between}
header.site .brand{font-weight:800;font-size:19px;color:var(--fg);text-decoration:none}
header.site nav{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:15px}
header.site nav a{color:var(--mut);text-decoration:none}header.site nav a:hover{color:var(--gold)}
main{max-width:820px;margin:0 auto;padding:28px 16px 56px}
h1{font-size:clamp(2rem,6vw,3rem);line-height:1.1;margin:.2em 0 .4em}
h2{font-size:1.5rem;margin:1.8em 0 .5em;color:var(--gold)}h3{font-size:1.1rem;margin:1.2em 0 .3em}
.lead{font-size:1.2rem;color:var(--mut)}
.cta{display:inline-block;background:var(--gold);color:#111;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;margin:6px 10px 6px 0}
.cta.alt{background:transparent;color:var(--gold);border:1px solid var(--gold)}
table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left}
.faq details{border-bottom:1px solid var(--line);padding:10px 0}.faq summary{cursor:pointer;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;list-style:none;padding:0}
.grid li{background:var(--card);border-radius:10px;padding:8px;font-size:14px}
.grid img{width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:#1d1d25}
.grid a{text-decoration:none;color:var(--fg)}.grid .p{color:var(--gold);font-weight:700}
.crumbs{font-size:14px;color:var(--mut)}.crumbs a{color:var(--mut)}
.related{margin-top:2em;padding-top:1em;border-top:1px solid var(--line)}
footer.site{border-top:1px solid var(--line);padding:24px 16px;color:var(--mut);font-size:14px;text-align:center}
footer.site a{color:var(--mut);margin:0 8px}
`;

const headerHtml = () => `<header class="site"><a class="brand" href="/">The Homies</a><nav aria-label="Main">${NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join('')}</nav></header>`;
const footerHtml = () => `<footer class="site"><p>${[['/about', 'About'], ['/shop', 'Shop'], ['/community-chat-and-membership', 'Membership'], ['/support', 'Support'], ['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/community-guidelines', 'Guidelines']].map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}<a href="${YOUTUBE}" rel="noopener">YouTube</a></p><p>&copy; ${new Date().getFullYear()} The Homies. Content on the platform is for adults.</p></footer>`;

const org = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'The Homies',
  alternateName: 'thehomieshub.com',
  url: `${SITE}/`,
  logo: `${SITE}/android-chrome-512x512.png`,
  sameAs: [YOUTUBE],
};
const website = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'The Homies', url: `${SITE}/`, publisher: { '@id': `${SITE}/#org` } };

function headTags({ title, description, canonical, image = `${SITE}/og-default.png`, ld = [] }) {
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta name="robots" content="index,follow,max-image-preview:large" />`,
    `<meta property="og:site_name" content="The Homies" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...ld.map(jsonLd),
  ].join('\n    ');
}

const faqHtml = (faq) => faq && faq.length ? `<section class="faq"><h2>Frequently asked questions</h2>${faq.map((f) => `<details open><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>` : '';
const faqLd = (faq) => faq && faq.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) });

// Removes the shell's default (generic) title/description/OG/Twitter tags so only ours remain.
function stripShellMeta(shell) {
  return shell
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^>]*>\s*/gi, '')
    .replace(/<!--\s*(Open Graph|Twitter \/ X)\s*-->\s*/gi, '');
}

function spaPage(shell, meta, rootHtml) {
  let html = stripShellMeta(shell);
  html = html.replace('</head>', `    ${headTags(meta)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${rootHtml}</div>`);
  if (!html.includes(`<div id="root">${rootHtml.slice(0, 20)}`)) throw new Error('root placeholder not found in shell');
  return html;
}

function standalone({ title, description, canonical, ld, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f0b94d" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${headTags({ title, description, canonical, ld })}
    <style>${CSS}</style>
  </head>
  <body>
${headerHtml()}
<main>
${body}
</main>
${footerHtml()}
  </body>
</html>
`;
}

function write(rel, content) {
  const f = path.join(dist, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  console.log(`[seo] wrote ${rel} (${content.length} bytes)`);
}

function homeRoot(st) {
  return `<main style="max-width:820px;margin:0 auto;padding:32px 16px;font-family:system-ui,sans-serif;color:#f4f1ea;background:#0b0b0e">
<h1>${esc(HOME.h1)}</h1>
<p>${esc(HOME.lead)}</p>
<p><a href="/join">Join the chat</a> &middot; <a href="/browse">Browse clips</a> &middot; <a href="/shop">Shop merch</a> &middot; <a href="/community-chat-and-membership">Memberships</a></p>
<h2>What you can do on The Homies</h2>
<ul>
<li><a href="/live-boxing-stream-community">Watch live boxing streams and fight nights</a> with a real-time community chat.</li>
<li><a href="/browse">Swipe through short clips</a> of the best stream moments, or upload your own.</li>
<li><a href="/join">Talk in Homies Chat</a>, a Discord-style chat with channels and DMs built into the app.</li>
<li><a href="/music">Stream music</a> from Mwosa and other artists.</li>
<li><a href="/streetwear-merch">Wear the streetwear merch</a>: tees from ${st.teeFrom}, hoodies from ${st.hoodieFrom}, embroidered dad hats from ${st.hatFrom}.</li>
<li><a href="/community-chat-and-membership">Go premium</a> for members-only video and the full media library.</li>
</ul>
<h2>Start here</h2>
<p>New to The Homies? Read <a href="/about">what we are about</a>, then <a href="/join">join the chat</a>. Streams are also on <a href="${YOUTUBE}" rel="noopener">YouTube</a>.</p>
<nav aria-label="Pages">${NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join(' | ')}</nav>
</main>`;
}

function shopRoot(st) {
  return `<main style="max-width:1000px;margin:0 auto;padding:32px 16px;font-family:system-ui,sans-serif;color:#f4f1ea;background:#0b0b0e">
<h1>${esc(SHOP_PAGE.h1)}</h1>
<p>${esc(SHOP_PAGE.lead)}</p>
<p><a href="/shop/design">Design your own</a> &middot; <a href="/streetwear-merch">Merch guide</a> &middot; <a href="/shop/orders">My orders</a></p>
<h2>All products</h2>
<ul>${st.ok.map((p) => `<li><a href="/shop/${esc(p.slug)}">${esc(p.name)}</a> - from ${usd(p.minPriceCents)}</li>`).join('')}</ul>
</main>`;
}

function shopLd(st) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The Homies Shop',
    numberOfItems: st.ok.length,
    itemListElement: st.ok.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        url: `${SITE}/shop/${p.slug}`,
        ...(p.thumbnail ? { image: p.thumbnail } : {}),
        brand: { '@type': 'Brand', name: p.brand === 'lxvemore' ? 'LXVEMORE' : 'The Homies' },
        offers: { '@type': 'Offer', priceCurrency: 'USD', price: (p.minPriceCents / 100).toFixed(2), availability: 'https://schema.org/InStock', url: `${SITE}/shop/${p.slug}` },
      },
    })),
  };
}

async function main() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html missing: run vite build first');
  const products = await loadProducts();
  const st = priceStats(products);

  const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  if (fs.existsSync(path.join(dist, 'app.html'))) throw new Error('dist/app.html already exists');
  // The SPA shell moves to app.html (see vercel.json); "/" is served from home.html.
  fs.writeFileSync(path.join(dist, 'app.html'), shell);
  fs.unlinkSync(path.join(dist, 'index.html'));

  // Home
  const homeMeta = { title: HOME.title, description: HOME.description, canonical: `${SITE}/`, ld: [org, website] };
  write('home.html', spaPage(shell, homeMeta, homeRoot(st)));

  // Shop index (served as a SPA page so the app still boots on /shop)
  const shopMeta = {
    title: fill(SHOP_PAGE.title, st),
    description: fill(SHOP_PAGE.description, st),
    canonical: `${SITE}/shop`,
    ld: [crumbLd([{ name: 'The Homies', url: `${SITE}/` }, { name: 'Shop', url: `${SITE}/shop` }]), shopLd(st)],
  };
  write('shop-index.html', spaPage(shell, shopMeta, shopRoot(st)));

  // Landing pages
  const sitemap = [{ loc: `${SITE}/`, lastmod: UPDATED, pri: '1.0' }, { loc: `${SITE}/shop`, lastmod: UPDATED, pri: '0.9' }];
  for (const pg of LANDING) {
    const title = fill(pg.title, st);
    const description = fill(pg.description, st);
    const canonical = `${SITE}${pg.path}`;
    const related = (pg.related || []).map((r) => LANDING.find((l) => l.path === r)).filter(Boolean);
    const body = `<p class="crumbs"><a href="/">Home</a> / ${esc(pg.h1)}</p>
<h1>${esc(pg.h1)}</h1>
<p class="lead">${esc(pg.lead)}</p>
<p><a class="cta" href="/join">Join the chat free</a><a class="cta alt" href="/browse">Browse clips</a></p>
${pg.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${fill(s.html, st)}</section>`).join('\n')}
${faqHtml(pg.faq)}
<p><a class="cta" href="/join">Join The Homies</a></p>
<div class="related"><strong>Keep reading</strong><ul>${related.map((r) => `<li><a href="${r.path}">${esc(r.h1)}</a></li>`).join('')}</ul></div>`;
    const ld = [crumbLd([{ name: 'The Homies', url: `${SITE}/` }, { name: pg.h1, url: canonical }]), faqLd(pg.faq), org].filter(Boolean);
    write(`${pg.path.slice(1)}/index.html`, standalone({ title, description, canonical, ld, body }));
    sitemap.push({ loc: canonical, lastmod: UPDATED, pri: '0.8' });
  }

  write('sitemap-pages.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
}

main().catch((e) => { console.error('[seo] FAILED:', e); process.exit(1); });
