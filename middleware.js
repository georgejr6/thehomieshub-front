// Vercel Edge Middleware
// Intercepts /watch/:id from social crawlers and returns OG-tagged HTML inline.
// Browsers pass through unchanged to the React SPA.
// Self-contained: fetches backend directly — no internal Vercel function hop.

export const config = {
  matcher: ['/watch/:path*'],
};

const BACKEND    = 'https://backend.thehomies.app/api';
const SITE_URL   = 'https://www.thehomies.app';
const SITE_NAME  = 'The Homies Hub';
const DEFAULT_IMG = `${SITE_URL}/og-default.png`;

const CRAWLERS =
  /twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|googlebot|bingbot|embedly|pinterest|iframely|vkshare|applebot|rogerbot|linkedinbot|duckduckbot|baiduspider|yandexbot|sogou|exabot|ia_archiver/i;

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(title, description, image, url, type) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"/>

  <meta property="og:site_name"   content="${esc(SITE_NAME)}"/>
  <meta property="og:type"        content="${type === 'video' || type === 'reel' ? 'video.other' : 'article'}"/>
  <meta property="og:url"         content="${esc(url)}"/>
  <meta property="og:title"       content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image"       content="${esc(image)}"/>
  <meta property="og:image:width"  content="1280"/>
  <meta property="og:image:height" content="720"/>

  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:site"        content="@TheHomiesHub"/>
  <meta name="twitter:title"       content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image"       content="${esc(image)}"/>
</head>
<body>
  <p><a href="${esc(url)}">${esc(title)}</a></p>
</body>
</html>`;
}

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  // Non-crawler: pass through to React SPA
  if (!CRAWLERS.test(ua)) return;

  const { pathname } = new URL(request.url);
  const id  = pathname.replace(/^\/watch\/?/, '') || '';
  const url = `${SITE_URL}/watch/${id}`;

  let title       = SITE_NAME;
  let description = `Watch on ${SITE_NAME}`;
  let image       = DEFAULT_IMG;
  let type        = 'video';

  if (id) {
    try {
      const r = await fetch(`${BACKEND}/user/posts/${id}`, {
        headers: { Accept: 'application/json' },
        // Edge runtime: 3s timeout is enough for a simple DB lookup
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const json = await r.json();
        const post = json?.result?.post;
        type       = json?.result?.type || 'video';

        if (post) {
          const rawTitle = post.title || post.caption || post.text;
          if (rawTitle) title = rawTitle.length > 100 ? rawTitle.slice(0, 97) + '…' : rawTitle;

          const creator = post.creator || post.author;
          if (creator) {
            description = `By ${creator.name || creator.username} · ${SITE_NAME}`;
          }

          image = post.thumbnailUrl
            || post.thumbnail
            || (post.muxPlaybackId
                ? `https://image.mux.com/${post.muxPlaybackId}/thumbnail.png?width=1280&height=720&time=3`
                : DEFAULT_IMG);
        }
      }
    } catch (_) {
      // Backend unreachable — fall back to site defaults
    }
  }

  return new Response(buildHtml(title, description, image, url, type), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
