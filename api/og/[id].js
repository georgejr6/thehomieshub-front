// /api/og/:id
// ALL /watch/:id traffic is routed here (vercel.json).
// Fetches video data, injects OG meta tags into index.html, returns to everyone.
// Bots get proper OG tags. Browsers get the full React SPA with OG tags already in <head>.

const BACKEND   = 'https://backend.thehomies.app/api';
const SITE_URL  = 'https://www.thehomies.app';
const SITE_NAME = 'The Homies Hub';
const DEFAULT_IMG = `${SITE_URL}/og-default.png`;

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const id  = req.query.id || '';
  const url = `${SITE_URL}/watch/${id}`;

  let title  = SITE_NAME;
  let desc   = `Watch on ${SITE_NAME}`;
  let image  = DEFAULT_IMG;
  let ogType = 'video.other';

  // ── Fetch post data from backend ─────────────────────────────────────────
  if (id) {
    try {
      const r = await fetch(`${BACKEND}/user/posts/${id}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
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
                ? `https://image.mux.com/${post.muxPlaybackId}/thumbnail.png?width=1280&height=720&time=5`
                : DEFAULT_IMG);
        }
      }
    } catch (_) {}
  }

  // ── Build the OG tag block to inject ─────────────────────────────────────
  const ogBlock = `
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
  <meta name="twitter:image"       content="${esc(image)}"/>`;

  // ── Fetch index.html and inject the OG block ──────────────────────────────
  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host || 'www.thehomies.app';
    const r     = await fetch(`${proto}://${host}/`, {
      signal: AbortSignal.timeout(4000),
    });
    let html = await r.text();

    // Strip all existing OG/Twitter/description tags (generic fallbacks from index.html)
    // then inject video-specific block at the very top of <head> so parsers see it first
    html = html
      .replace(/<title>[^<]*<\/title>/i, '')
      .replace(/<meta\s[^>]*(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*\/?>/gi, '')
      .replace('<head>', `<head>\n${ogBlock}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(html);
  } catch (_) {}

  // ── Pure OG fallback (if index.html fetch fails) ──────────────────────────
  const fallback = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  ${ogBlock}
</head>
<body><p><a href="${esc(url)}">${esc(title)}</a></p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(fallback);
}
