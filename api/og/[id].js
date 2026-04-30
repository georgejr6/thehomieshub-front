// /api/og/:id
// Only called for confirmed social-crawler User-Agents (see vercel.json has: conditions).
// Browsers hit /index.html directly — no self-referential fetch, no runtime complexity.
// Fetches post data from the HomiesHub backend and returns a minimal HTML page whose
// <head> contains the video-specific OG / Twitter Card meta tags that crawlers read.

const BACKEND     = 'https://backend.thehomies.app/api';
const SITE_URL    = 'https://www.thehomies.app';
const SITE_NAME   = 'The Homies Hub';
const DEFAULT_IMG = `${SITE_URL}/og-default.png`;

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const id   = req.query.id   || '';
  const from = req.query.from || 'watch'; // watch | post | media

  // Canonical URL matches whichever route was shared
  const canonicalUrl = `${SITE_URL}/${from}/${id}`;

  let title  = SITE_NAME;
  let desc   = `Watch on ${SITE_NAME}`;
  let image  = DEFAULT_IMG;
  let ogType = 'video.other';

  if (id) {
    try {
      const r = await fetch(`${BACKEND}/user/posts/${id}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const json = await r.json();
        const post = json?.result?.post;
        const type = json?.result?.type;

        if (type === 'community') ogType = 'article';

        if (post) {
          const raw = post.title || post.caption || post.text || '';
          if (raw) title = raw.length > 100 ? raw.slice(0, 97) + '…' : raw;

          const creator = post.creator || post.author;
          if (creator?.name || creator?.username)
            desc = `By ${creator.name || creator.username} · ${SITE_NAME}`;

          image =
            post.thumbnailUrl ||
            post.thumbnail ||
            (post.muxPlaybackId
              ? `https://image.mux.com/${post.muxPlaybackId}/thumbnail.png?width=1280&height=720&time=5`
              : DEFAULT_IMG);
        }
      }
    } catch (_) {
      // Backend unavailable — serve default card rather than error
    }
  }

  const safeTitle = esc(title);
  const safeDesc  = esc(desc.slice(0, 300));
  const safeImage = esc(image);
  const safeUrl   = esc(canonicalUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${safeTitle} — ${esc(SITE_NAME)}</title>
<meta name="description" content="${safeDesc}"/>

<!-- Open Graph -->
<meta property="og:site_name"   content="${esc(SITE_NAME)}"/>
<meta property="og:type"        content="${ogType}"/>
<meta property="og:url"         content="${safeUrl}"/>
<meta property="og:title"       content="${safeTitle}"/>
<meta property="og:description" content="${safeDesc}"/>
<meta property="og:image"       content="${safeImage}"/>
<meta property="og:image:width"  content="1280"/>
<meta property="og:image:height" content="720"/>

<!-- Twitter / X Card -->
<meta name="twitter:card"        content="summary_large_image"/>
<meta name="twitter:site"        content="@TheHomiesHub"/>
<meta name="twitter:title"       content="${safeTitle}"/>
<meta name="twitter:description" content="${esc(desc.slice(0, 200))}"/>
<meta name="twitter:image"       content="${safeImage}"/>
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
