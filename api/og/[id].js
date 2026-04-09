// Vercel serverless function: /api/og/:id
// Only reached by social crawlers — routed here via vercel.json `has` rewrite.
// Returns minimal HTML with full Open Graph + Twitter Card meta tags.

const BACKEND    = 'https://backend.thehomies.app/api';
const SITE_URL   = 'https://www.thehomies.app';
const SITE_NAME  = 'The Homies Hub';
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
  const url = `${SITE_URL}/watch/${esc(id)}`;

  let title       = SITE_NAME;
  let description = `Watch on ${SITE_NAME}`;
  let image       = DEFAULT_IMG;
  let ogType      = 'video.other';

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
          if (creator?.name || creator?.username) {
            description = `By ${creator.name || creator.username} · ${SITE_NAME}`;
          }

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
  <meta name="description" content="${esc(description)}"/>

  <meta property="og:site_name"    content="${esc(SITE_NAME)}"/>
  <meta property="og:type"         content="${ogType}"/>
  <meta property="og:url"          content="${url}"/>
  <meta property="og:title"        content="${esc(title)}"/>
  <meta property="og:description"  content="${esc(description)}"/>
  <meta property="og:image"        content="${esc(image)}"/>
  <meta property="og:image:width"  content="1280"/>
  <meta property="og:image:height" content="720"/>
  <meta property="og:image:alt"    content="${esc(title)}"/>

  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:site"        content="@TheHomiesHub"/>
  <meta name="twitter:title"       content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image"       content="${esc(image)}"/>
  <meta name="twitter:image:alt"   content="${esc(title)}"/>
</head>
<body>
  <p><a href="${url}">${esc(title)}</a> — ${esc(description)}</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
}
