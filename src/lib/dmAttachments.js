// Direct-message attachments: normalise what the API returns (new
// `attachments[]` or legacy `type` + `attachmentUrl`/`mediaUrl`) and the short
// label used in thread-list previews. Mirrors the mobile app.
export const MAX_DM_PHOTOS = 4;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const isHttps = (url) => typeof url === 'string' && /^https:\/\//i.test(url);

const VIDEO_URL = /\.(mp4|mov|m4v|webm)(\?|#|$)/i;
export const isVideoLike = (a) => (a?.mime ? /^video\//.test(a.mime) : VIDEO_URL.test(a?.url || ''));

/** Renderable (https) attachments of a message, with the legacy single-attachment fallback. */
export function messageAttachments(m) {
  if (!m) return [];
  if (Array.isArray(m.attachments) && m.attachments.length) {
    return m.attachments.filter((a) => a && isHttps(a.url));
  }
  const legacy = m.mediaUrl || m.attachmentUrl;
  if ((m.type === 'image' || m.type === 'video') && isHttps(legacy)) return [{ url: legacy, kind: m.type }];
  return [];
}

/** "Photo" / "Video" / "GIF" label; '' when the message has no attachment. */
export function attachmentLabel(m) {
  const list = Array.isArray(m?.attachments) && m.attachments.length ? m.attachments : messageAttachments(m);
  if (!list.length) return '';
  const n = list.length;
  const kinds = new Set(list.map((a) => a.kind));
  if (kinds.size === 1 && kinds.has('gif')) return 'GIF';
  if (kinds.size === 1 && kinds.has('video')) return n > 1 ? `🎥 ${n} videos` : '🎥 Video';
  if (kinds.size === 1 && kinds.has('image')) return n > 1 ? `📷 ${n} photos` : '📷 Photo';
  return `📷 ${n} attachments`;
}

/** Thread-row preview: the text, else the attachment label. */
export function messagePreview(m) {
  if (!m) return '';
  const text = (m.content || '').trim();
  if (m.type === 'sticker') return `${m.content || '🎭'} Sticker`;
  if (m.type === 'gift') return '🎁 Gift';
  if (m.type === 'voice') return '🎙 Voice message';
  return text || attachmentLabel(m);
}
