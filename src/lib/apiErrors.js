// Machine-readable codes the backend puts on error responses. Newer bodies
// carry `code` at the top (banGate: { code: "banned", appealUrl }) or inside
// the envelope's `error` object (sendError: { error: { code: "blocked" } });
// older ones only have `error` as a string ("account_banned").

export const APPEAL_PATH = '/appeal';

export function apiErrorCode(err) {
  const d = err?.response?.data;
  if (!d || typeof d !== 'object') return null;
  if (typeof d.code === 'string') return d.code;
  if (d.error && typeof d.error === 'object' && typeof d.error.code === 'string') return d.error.code;
  if (d.error === 'account_banned') return 'banned';
  if (typeof d.error === 'string') return d.error;
  return null;
}

export const isBannedError = (err) => err?.response?.status === 403 && apiErrorCode(err) === 'banned';
export const isBlockedError = (err) => err?.response?.status === 403 && apiErrorCode(err) === 'blocked';

// Only our own appeal page or an https link on our domain — never an
// arbitrary URL from a response.
export function safeAppealUrl(raw) {
  if (typeof raw !== 'string' || !raw) return APPEAL_PATH;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin === window.location.origin) return `${u.pathname}${u.search}`;
    if (u.protocol === 'https:' && /(^|\.)thehomies\.app$/i.test(u.hostname)) return u.pathname === APPEAL_PATH ? APPEAL_PATH : u.toString();
  } catch { /* fall through */ }
  return APPEAL_PATH;
}

export const BLOCKED_MESSAGE = "You can't see or interact with this — one of you has blocked the other.";
