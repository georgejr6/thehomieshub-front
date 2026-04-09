// Vercel serverless function: /api/og/:id
// Called by middleware.js when a crawler hits /watch/:id
// Returns a minimal HTML page with full Open Graph + Twitter Card meta tags.

const BACKEND = 'https://backend.thehomies.app/api';
const SITE_URL = 'https://www.thehomies.app';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;
const SITE_NAME = 'The Homies Hub';

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml({ title, description, image, url, type }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>

  <!-- Open Graph -->
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:type"       content="${type === 'video' || type === 'reel' ? 'video.other' : 'article'}" />
  <meta property="og:url"        content="${esc(url)}" />
  <meta property="og:title"      content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image"      content="${esc(image)}" />
  <meta property="og:image:width"  content="1280" />
  <meta property="og:image:height" content="720" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@thehomieshub" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(image)}" />

  <!-- Redirect browsers that land here directly back to the app -->
  <meta http-equiv="refresh" content="0;url=${esc(url)}" />
</head>
<body>
  <p>Redirecting… <a href="${esc(url)}">${esc(title)}</a></p>
</body>
</html>`;
}

export default async function handler(req, res) {
  const id = req.query.id || '';

  let title       = SITE_NAME;
  let description = 'Watch on The Homies Hub';
  let image       = DEFAULT_IMAGE;
  let type        = 'video';
  const url       = `${SITE_URL}/watch/${id}`;

  try {
    const apiRes = await fetch(`${BACKEND}/user/posts/${id}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (apiRes.ok) {
      const json    = await apiRes.json();
      const post    = json?.result?.post;
      type          = json?.result?.type || 'video';

      if (post) {
        // Title
        title = post.title || post.caption || post.text || SITE_NAME;
        if (title.length > 100) title = title.slice(0, 97) + '…';

        // Description
        const creator = post.creator || post.author;
        description   = creator?.name || creator?.username
          ? `By ${creator.name || creator.username} · Watch on ${SITE_NAME}`
          : `Watch on ${SITE_NAME}`;

        // Thumbnail — prefer stored URL, fall back to Mux thumbnail
        image = post.thumbnailUrl
          || post.thumbnail
          || (post.muxPlaybackId
              ? `https://image.mux.com/${post.muxPlaybackId}/thumbnail.png?width=1280&height=720&time=3`
              : DEFAULT_IMAGE);
      }
    }
  } catch (_) {
    // If fetch fails, fall back to defaults — still serve valid OG HTML
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(buildHtml({ title, description, image, url, type }));
}
