// Vercel Edge Middleware
// Intercepts /watch/:id requests from social media crawlers and rewrites them
// to /api/og/:id which returns OG-tagged HTML for link previews.
// Regular browser traffic is passed through unchanged to the React SPA.

export const config = {
  matcher: ['/watch/:id+'],
};

const CRAWLER_RE =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|googlebot|bingbot|embedly|pinterest|iframely|vkshare|w3c_validator|curl|python-requests/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  if (!CRAWLER_RE.test(ua)) {
    // Regular browser — let Vercel serve the React SPA (index.html via catch-all rewrite)
    return;
  }

  // Crawler — rewrite to the OG serverless function
  const id  = new URL(request.url).pathname.replace(/^\/watch\//, '');
  const ogUrl = new URL(`/api/og/${id}`, request.url);

  // Internal rewrite: keeps the original URL in the crawler's request log
  // but serves the OG HTML from /api/og/:id
  return fetch(ogUrl, { headers: request.headers });
}
