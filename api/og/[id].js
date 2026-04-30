// /api/og/:id
// Serves ALL traffic for /watch/:id, /post/:id, /media/:id (see vercel.json).
// Reads the built index.html from disk (bundled via includeFiles — no HTTP round-trip),
// strips the generic OG tags, injects video-specific ones, returns full SPA HTML.
// Bots read the correct OG tags; browsers boot the React app normally.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const BACKEND     = 'https://backend.thehomies.app/api';
const SITE_URL    = 'https://www.thehomies.app';
const SITE_NAME   = 'The Homies Hub';
const DEFAULT_IMG = `${SITE_URL}/og-default.png`;

// Read index.html once at module load (bundled via vercel.json includeFiles).
// Try multiple candidate paths — Vercel's Lambda working directory varies.
const __dir = dirname(fileURLToPath(import.meta.url));
let baseHtml = null;
for (const p of [
  join(__dir, '../../dist/index.html'),   // api/og/ → project root/dist
  join(process.cwd(), 'dist/index.html'), // Lambda cwd
  '/var/task/dist/index.html',            // Vercel Lambda absolute fallback
]) {
  try { baseHtml = readFileSync(p, 'utf-8'); break; } catch (_) {}
}
if (!baseHtml) console.error('[og] Could not read dist/index.html from any candidate path');

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const id   = req.query.id   || '';
  const from = req.query.from || 'watch';
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
    } catch (e) {
      console.error('[og] backend fetch error:', e.message);
    }
  }

  const safeTitle = esc(title);
  const safeDesc  = esc(desc.slice(0, 300));
  const safeImage = esc(image);
  const safeUrl   = esc(canonicalUrl);

  const ogTags = [
    `<title>${safeTitle} — ${esc(SITE_NAME)}</title>`,
    `<meta name="description" content="${safeDesc}"/>`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}"/>`,
    `<meta property="og:type" content="${ogType}"/>`,
    `<meta property="og:url" content="${safeUrl}"/>`,
    `<meta property="og:title" content="${safeTitle}"/>`,
    `<meta property="og:description" content="${safeDesc}"/>`,
    `<meta property="og:image" content="${safeImage}"/>`,
    `<meta property="og:image:width" content="1280"/>`,
    `<meta property="og:image:height" content="720"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:site" content="@TheHomiesHub"/>`,
    `<meta name="twitter:title" content="${safeTitle}"/>`,
    `<meta name="twitter:description" content="${esc(desc.slice(0, 200))}"/>`,
    `<meta name="twitter:image" content="${safeImage}"/>`,
  ].join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  if (baseHtml) {
    const html = baseHtml
      .replace(/<title>[^<]*<\/title>/i, '')
      .replace(/<meta\s[^>]*(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*\/?>/gi, '')
      .replace('<head>', `<head>\n${ogTags}\n`);
    return res.status(200).send(html);
  }

  // Last-resort fallback: bare OG page (no SPA, but bots get correct tags)
  return res.status(200).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
${ogTags}
</head><body><a href="${safeUrl}">${safeTitle}</a></body></html>`);
}
