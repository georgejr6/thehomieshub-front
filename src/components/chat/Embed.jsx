import React from 'react';
import { format } from 'date-fns';
import ChatMarkdown, { roleColor } from './ChatMarkdown';

// Discord embeds (imported bot posts, link previews): colored bar, author,
// title, description, fields, image/thumbnail, footer — Discord's layout.

const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);

// The still image an embed shows (not gif videos), for the in-chat viewer.
export function embedImageUrl(e) {
  if (!e) return null;
  if (e.type === 'image' || e.type === 'gifv') return e.type === 'gifv' && e.video ? null : safeUrl(e.thumbnail?.url) || safeUrl(e.thumbnail?.proxy_url);
  return safeUrl(e.image?.url) || safeUrl(e.image?.proxy_url);
}

// Third-party media: no Referer (privacy, and many CDNs hotlink-block on
// it) and hide it if it fails instead of showing a broken-image icon.
const hideOnError = (ev) => { ev.currentTarget.style.display = 'none'; };
const extMedia = { referrerPolicy: 'no-referrer', onError: hideOnError };
const extVideo = { onError: hideOnError }; // <video> has no referrerpolicy attribute

// Shown under a just-sent message with a link while the server fetches its
// preview (it arrives as message.updated and replaces this).
export function EmbedPlaceholder() {
  return (
    <div data-testid="embed-placeholder" aria-hidden className="mt-1 flex w-full max-w-[520px] animate-pulse gap-3 overflow-hidden rounded bg-[#2B2D31] px-4 py-3" style={{ borderLeft: '4px solid #1E1F22' }}>
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-24 rounded bg-[#3F4147]" />
        <div className="h-3 w-3/4 rounded bg-[#3F4147]" />
        <div className="h-2.5 w-full rounded bg-[#3F4147]" />
      </div>
      <div className="h-14 w-14 shrink-0 rounded bg-[#3F4147]" />
    </div>
  );
}

export default function Embed({ e, ctx, onOpenImage }) {
  if (!e) return null;
  // Bare image/gif link previews render as just the media, like Discord
  // (Tenor/Giphy/.mp4 gifs play as silent looping video).
  if ((e.type === 'image' || e.type === 'gifv') && (e.thumbnail || e.video)) {
    const video = e.type === 'gifv' ? safeUrl(e.video?.url) || safeUrl(e.video?.proxy_url) : null;
    const still = safeUrl(e.thumbnail?.url) || safeUrl(e.thumbnail?.proxy_url);
    if (video) {
      return (
        <video src={video} poster={still || undefined} autoPlay loop muted playsInline preload="auto" aria-label="GIF"
          {...extVideo} className="mt-1 block max-h-[300px] max-w-full rounded-lg sm:max-w-[400px]" />
      );
    }
    if (!still) return null;
    return (
      <button type="button" onClick={() => onOpenImage?.(still)} className="mt-1 block cursor-zoom-in rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]" aria-label="Open image">
        <img src={still} alt="" loading="lazy" draggable={false} {...extMedia} className="max-h-[min(60vh,480px)] max-w-full rounded-lg sm:max-w-[520px]" />
      </button>
    );
  }
  // Video links (YouTube etc., from Discord imports): big thumbnail with a
  // play badge that opens the link — no third-party player iframes in chat.
  if (e.type === 'video' && safeUrl(e.url) && (safeUrl(e.thumbnail?.url) || safeUrl(e.thumbnail?.proxy_url))) {
    const thumbUrl = safeUrl(e.thumbnail?.url) || safeUrl(e.thumbnail?.proxy_url);
    return (
      <div className="mt-1 w-full max-w-[520px] overflow-hidden rounded bg-[#2B2D31] px-4 py-3" style={{ borderLeft: `4px solid ${e.color ? roleColor(e.color) : '#1E1F22'}` }}>
        {e.provider?.name && <div className="mb-1 text-xs text-[#B5BAC1]">{e.provider.name}</div>}
        {e.author?.name && <div className="mb-1 text-sm font-semibold text-white">{e.author.name}</div>}
        {e.title && <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="mb-2 block font-semibold text-[#00A8FC] hover:underline">{e.title}</a>}
        <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Play ${e.title || 'video'}`} className="group relative block overflow-hidden rounded">
          <img src={thumbUrl} alt="" loading="lazy" draggable={false} {...extMedia} className="max-h-[300px] w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-current" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </a>
      </div>
    );
  }
  const bar = e.color ? roleColor(e.color) : '#1E1F22';
  const image = safeUrl(e.image?.url) || safeUrl(e.image?.proxy_url);
  const thumb = safeUrl(e.thumbnail?.url) || safeUrl(e.thumbnail?.proxy_url);
  const fields = Array.isArray(e.fields) ? e.fields.slice(0, 25) : [];
  if (!e.title && !e.description && !fields.length && !image && !thumb && !e.author?.name) return null;
  return (
    <div className="mt-1 flex w-full max-w-[520px] overflow-hidden rounded bg-[#2B2D31]" style={{ borderLeft: `4px solid ${bar}` }}>
      <div className="min-w-0 flex-1 px-4 py-3">
        {e.provider?.name && <div className="mb-1 text-xs text-[#B5BAC1]">{e.provider.name}</div>}
        {e.author?.name && (
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            {safeUrl(e.author.icon_url) && <img src={e.author.icon_url} alt="" {...extMedia} className="h-6 w-6 rounded-full" />}
            {safeUrl(e.author.url) ? <a href={e.author.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{e.author.name}</a> : e.author.name}
          </div>
        )}
        {e.title && (
          <div className="mb-1 font-semibold text-white">
            {safeUrl(e.url) ? <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[#00A8FC] hover:underline">{e.title}</a> : e.title}
          </div>
        )}
        {e.description && <div className="text-sm leading-[1.375rem] text-[#DBDEE1]"><ChatMarkdown text={e.description} ctx={ctx} /></div>}
        {fields.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {fields.map((f, i) => (
              <div key={i} className={f.inline ? '' : 'sm:col-span-3'}>
                <div className="text-sm font-semibold text-white">{f.name}</div>
                <div className="text-sm text-[#DBDEE1]"><ChatMarkdown text={f.value} ctx={ctx} /></div>
              </div>
            ))}
          </div>
        )}
        {image && (
          <button type="button" onClick={() => onOpenImage?.(image)} className="mt-3 block cursor-zoom-in" aria-label="Open image">
            <img src={image} alt="" loading="lazy" draggable={false} {...extMedia} className="max-h-[300px] max-w-full rounded" />
          </button>
        )}
        {(e.footer?.text || e.timestamp) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#949BA4]">
            {safeUrl(e.footer?.icon_url) && <img src={e.footer.icon_url} alt="" {...extMedia} className="h-5 w-5 rounded-full" />}
            <span>{e.footer?.text}{e.footer?.text && e.timestamp ? ' • ' : ''}{e.timestamp ? format(new Date(e.timestamp), 'MM/dd/yyyy h:mm a') : ''}</span>
          </div>
        )}
      </div>
      {thumb && !image && <img src={thumb} alt="" loading="lazy" {...extMedia} className="m-3 ml-0 h-20 w-20 shrink-0 rounded object-cover" />}
    </div>
  );
}
