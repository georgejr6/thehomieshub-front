// /api/og/:id
// ALL /watch/:id traffic is routed here (vercel.json).
// Bots   → return OG-tagged HTML for social share previews.
// Browsers → fetch and return index.html so React SPA loads at /watch/:id.

const BACKEND   = 'https://backend.thehomies.app/api';
const SITE_URL  = 'https://www.thehomies.app';
const SITE_NAME = 'The Homies Hub';
const DEFAULT_IMG = `${SITE_URL}/og-default.png`;

// Treat as a bot if the UA does NOT look like a real browser.
// Real browsers always send Mozilla/5.0 + one of Chrome/Firefox/Safari/Edge.
const REAL_BROWSER = /Mozilla\/5\.0.*(Chrome|Firefox|Safari|Edg|OPR)/i;

function isCrawler(ua) {
  if (!ua) return true;
  if (!REAL_BROWSER.test(ua)) return true;
  // Some known bots also send browser-like UAs — catch them explicitly
  return /bot|crawl|spider|preview|fetch|scrape|slack|telegram|discord|whatsapp|facebook|instagram|twitter|linkedin|pinterest|google|bing|yandex/i.test(ua);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const id = req.query.id || '';
  const ua = req.headers['user-agent'] || '';

  // ── Browser: serve the React SPA so /watch/:id renders normally ──────────
  if (!isCrawler(ua)) {
    try {
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'www.thehomies.app';
      const r     = await fetch(`${proto}://${host}/`);
      const html  = await r.text();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (_) {
      // Hard fallback — shouldn't happen in production
      return res.redirect(302, '/');
    }
  }

  // ── Crawler: build OG HTML from post data ─────────────────────────────────
  const url  = `${SITE_URL}/watch/${id}`;
  let title  = SITE_NAME;
  let desc   = `Watch on ${SITE_NAME}`;
  let image  = DEFAULT_IMG;
  let ogType = 'video.other';

  if (id) {
    try {
      const r = await fetch(`${BACKEND}/user/posts/${id}`, {
        headers: { Accept: 'application/json' },
      });
      if (r.ok) {
        const json = await r.json();
        const post = json?.result?.post;
        const type = json?.result?.type;
        if (type === 'community') ogType = 'article';
        if (post) {
          const raw = post.title || post.caption || post.text;
          if (raw) title = raw.length > 100 ? raw.slice(0, 97) + '…' : raw;
          const creator = post.creator || post.author;
          if (creator?.name || creator?.username)
            desc = `By ${creator.name || creator.username} · ${SITE_NAME}`;
          image = post.thumbnailUrl
            || post.thumbnail
            || (post.muxPlaybackId
                ? `https://image.mux.com/${post.muxPlaybackId}/thumbnail.png?width=1280&height=720&time=3`
                : DEFAULT_IMG);
        }
      }
    } catch (_) {}
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}"/>
  <meta property="og:site_name"    content="${esc(SITE_NAME)}"/>
  <meta property="og:type"         content="${ogType}"/>
  <meta property="og:url"          content="${esc(url)}"/>
  <meta property="og:title"        content="${esc(title)}"/>
  <meta property="og:description"  content="${esc(desc)}"/>
  <meta property="og:image"        content="${esc(image)}"/>
  <meta property="og:image:width"  content="1280"/>
  <meta property="og:image:height" content="720"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:site"        content="@TheHomiesHub"/>
  <meta name="twitter:title"       content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <meta name="twitter:image"       content="${esc(image)}"/>
</head>
<body><p><a href="${esc(url)}">${esc(title)}</a></p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
