import { useEffect, useRef, useState } from 'react';
import api from '@/api/homieshub';

// Admin push campaigns (backend routes/admin push campaigns):
//   POST /admin/push/campaigns/preview { audience, category, sourceMessageId? } → { count }
//   POST /admin/push/campaigns { title, body, url?, category, audience, scheduledAt?, sourceMessageId?, expectedCount? }
//        → { campaign, count }; 409 count_changed { result: { count } } when the audience moved since the preview
//   GET  /admin/push/campaigns → history
//   POST /admin/push/campaigns/:id/cancel
//   GET  /admin/push/from-chat/:messageId/draft → { title, body, url }
// Older backends don't have these (404) — callers fall back or say so.

// Mirrors the server's LIMITS (utils/pushCampaigns.js) so nothing 400s after confirming.
export const TITLE_MAX = 65;
export const BODY_MAX = 240;
export const DAYS_MAX = 365;
export const URL_MAX = 500;
export const SCHEDULE_MAX_DAYS = 60;

export const CATEGORIES = [
  { id: 'announcement', label: 'Announcement', note: 'Reaches everyone in the audience who has announcements on.' },
  { id: 'promo', label: 'Promo', note: 'Only reaches people who opted in to marketing & promotions push.' },
];

export const AUDIENCES = [
  { id: 'all', label: 'Everyone' },
  { id: 'members', label: 'Members' },
  { id: 'free', label: 'Free users' },
  { id: 'inactive', label: 'Inactive for N days', days: true },
  { id: 'active', label: 'Active in last N days', days: true },
  { id: 'usernames', label: 'Specific usernames', usernames: true },
];

export const emptyCampaignForm = () => ({
  title: '', body: '', url: '',
  category: 'announcement',
  audienceType: 'all', days: 30, usernames: '',
  when: 'now', scheduledAt: '', // scheduledAt = <input type="datetime-local"> value (local time)
});

/** "@a, b ,,@c" → ["a", "b", "c"] (deduped, lowercase-insensitive order kept). */
export function parseUsernames(text) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text || '').split(/[\s,]+/)) {
    const u = raw.trim().replace(/^@+/, '');
    if (!u || seen.has(u.toLowerCase())) continue;
    seen.add(u.toLowerCase());
    out.push(u);
  }
  return out;
}

/**
 * Same rule as the server's cleanUrl (utils/pushCampaigns.js): an in-app path
 * ("/points") or an https link; printable ASCII only, no backslash, never
 * protocol-relative ("//host", "/\\host").
 */
export function isValidPushUrl(url) {
  const u = String(url || '').trim();
  if (!u || u.length > URL_MAX) return false;
  return /^\/(?![/\\])[\x21-\x5b\x5d-\x7e]*$/.test(u) || /^https:\/\/[a-z0-9.-]+(:\d+)?([/?#][\x21-\x5b\x5d-\x7e]*)?$/i.test(u);
}

// Owner accounts (backend utils/owner.js). The server's requireOwnerAdmin
// guards every /admin/push/campaigns* and /admin/push/from-chat/* route.
const OWNER_USERNAMES = ['thehomies', 'mwosa', 'mwosa_1'];

/**
 * Show campaign / "Send as push" UI? Same rule as requireOwnerAdmin: /auth/me's
 * isOwner is the server's own isOwnerUser (admin + OWNER_USER_IDS); a user
 * object without it (older cache) falls back to admin + an owner username.
 */
export function canPushCampaigns(user) {
  if (user?.isAdmin !== true) return false;
  if (typeof user.isOwner === 'boolean') return user.isOwner;
  return OWNER_USERNAMES.includes(String(user.username || '').toLowerCase());
}

/** The API's audience object for the form's picker. */
export function buildAudience({ audienceType, days, usernames }) {
  const def = AUDIENCES.find((a) => a.id === audienceType) || AUDIENCES[0];
  if (def.days) return { type: def.id, days: Math.min(DAYS_MAX, Math.max(1, Math.floor(Number(days) || 0))) };
  if (def.usernames) return { type: def.id, usernames: parseUsernames(usernames) };
  return { type: def.id };
}

/** First problem with the form, or '' when it can be sent. */
export function validateCampaign(form, now = Date.now()) {
  if (!form.title.trim()) return 'Add a title.';
  if (!form.body.trim()) return 'Add a message.';
  if (form.title.trim().length > TITLE_MAX) return `Title is over ${TITLE_MAX} characters.`;
  if (form.body.trim().length > BODY_MAX) return `Message is over ${BODY_MAX} characters.`;
  if (!CATEGORIES.some((c) => c.id === form.category)) return 'Pick a category.';
  const def = AUDIENCES.find((a) => a.id === form.audienceType);
  if (!def) return 'Pick an audience.';
  if (def.days && !(Number.isInteger(Number(form.days)) && Number(form.days) >= 1 && Number(form.days) <= DAYS_MAX)) return `Days must be a whole number from 1 to ${DAYS_MAX}.`;
  const url = String(form.url || '').trim();
  if (url && !isValidPushUrl(url)) return 'Link must be an app path like /points or an https:// link.';
  if (def.usernames && parseUsernames(form.usernames).length === 0) return 'Add at least one username.';
  if (form.when === 'schedule') {
    const t = new Date(form.scheduledAt).getTime();
    if (!form.scheduledAt || Number.isNaN(t)) return 'Pick a date and time to send.';
    if (t <= now) return 'The scheduled time has to be in the future.';
    if (t > now + SCHEDULE_MAX_DAYS * 86400000) return `You can schedule up to ${SCHEDULE_MAX_DAYS} days ahead.`;
  }
  return '';
}

/** POST /admin/push/campaigns body. Only sends optional fields when set. */
export function buildCampaignPayload(form, { sourceMessageId, expectedCount } = {}) {
  const payload = {
    title: form.title.trim(),
    body: form.body.trim(),
    category: form.category,
    audience: buildAudience(form),
  };
  const url = String(form.url || '').trim();
  if (url) payload.url = url;
  if (form.when === 'schedule' && form.scheduledAt) payload.scheduledAt = new Date(form.scheduledAt).toISOString();
  if (sourceMessageId) payload.sourceMessageId = String(sourceMessageId);
  // Count-before-send: the server refuses (409 count_changed) if the live
  // audience moved by more than max(5, 10%) from what the admin confirmed.
  if (typeof expectedCount === 'number' && Number.isFinite(expectedCount)) payload.expectedCount = expectedCount;
  return payload;
}

/** 409 count_changed → the server's current count, else null. */
export function changedCount(err) {
  const d = err?.response?.data;
  if (err?.response?.status !== 409 || d?.code !== 'count_changed') return null;
  const n = Number(d?.result?.count);
  return Number.isFinite(n) ? n : null;
}

/**
 * A failed campaign request → a message for the admin. Campaign errors are
 * { status:false, code, message } (bad_url, too_long, bad_audience,
 * empty_audience, count_changed, rate_limited, disabled, not_found…);
 * requireAdmin's 401/403 are { error } with no message.
 */
export function campaignErrorMessage(err, fallback = "Couldn't send the push.") {
  const status = err?.response?.status;
  const data = err?.response?.data || {};
  if (data.code === 'owner_only') return 'Only the owner accounts can send push campaigns.';
  if (data.code && data.message) return data.message;
  if (status === 401 || status === 403) return 'Only admins can send pushes — sign in again with an admin account.';
  if (status === 429) return 'Too many pushes right now. Wait a few minutes and try again.';
  if (status === 503) return 'Push campaigns are turned off on the server right now.';
  return data.message || err?.message || fallback;
}

const result = (res) => res?.data?.result ?? res?.data ?? {};
export const isNotFound = (err) => err?.response?.status === 404;
/** 403 owner_only: this admin isn't one of the owner accounts. */
export const isOwnerOnly = (err) => err?.response?.status === 403 && err?.response?.data?.code === 'owner_only';
/** 404 because the server doesn't have the campaigns API yet — campaign 404s (not_found, bad_source) carry a code. */
export const isApiMissing = (err) => isNotFound(err) && !err?.response?.data?.code;

export async function previewCampaign(audience, category, sourceMessageId) {
  const r = result(await api.post('/admin/push/campaigns/preview', { audience, category, ...(sourceMessageId ? { sourceMessageId: String(sourceMessageId) } : {}) }));
  const n = Number(r.count);
  return Number.isFinite(n) ? n : null;
}
export async function createCampaign(payload) {
  const r = result(await api.post('/admin/push/campaigns', payload));
  return r.campaign || r;
}
export async function listCampaigns() {
  const r = result(await api.get('/admin/push/campaigns'));
  if (Array.isArray(r)) return r;
  return r.campaigns || r.items || [];
}
export async function cancelCampaign(id) {
  return result(await api.post(`/admin/push/campaigns/${encodeURIComponent(id)}/cancel`));
}
export async function draftFromChat(messageId) {
  const r = result(await api.get(`/admin/push/from-chat/${encodeURIComponent(messageId)}/draft`));
  const d = r.draft || r;
  return { title: d.title || '', body: d.body || '', url: d.url || '' };
}

/** Normalised numbers for a history row (the backend may nest them under counts/stats). */
export function campaignCounts(c) {
  const src = { ...(c?.stats || {}), ...(c?.counts || {}), ...c };
  const num = (...keys) => { for (const k of keys) { const v = Number(src[k]); if (src[k] != null && Number.isFinite(v)) return v; } return null; };
  return {
    recipients: num('targeted', 'recipients', 'recipientCount', 'total'),
    sent: num('sent', 'sentCount', 'delivered'),
    failed: num('failed', 'failedCount', 'errors'),
  };
}

export function audienceLabel(a) {
  if (!a) return '—';
  switch (a.type) {
    case 'all':
    case 'everyone': return 'Everyone';
    case 'members': return 'Members';
    case 'free': return 'Free users';
    case 'inactive': return `Inactive ${a.days}+ days`;
    case 'active': return `Active last ${a.days} days`;
    case 'usernames': return `${(a.usernames || []).length} user${(a.usernames || []).length === 1 ? '' : 's'}`;
    default: return String(a.type || '—');
  }
}

/**
 * Live recipient count for an audience + category (debounced). Pass the
 * sourceMessageId for a chat-sourced push: the server then only counts people
 * who can see that channel, the same filter the send applies.
 * status: 'idle' | 'loading' | 'ready' | 'unavailable' (404) | 'error'
 */
export function useRecipientCount(audience, category, { enabled = true, delay = 400, sourceMessageId } = {}) {
  const [state, setState] = useState({ status: 'idle', count: null });
  const key = enabled ? JSON.stringify([audience, category, sourceMessageId || null]) : '';
  const seq = useRef(0);
  useEffect(() => {
    seq.current += 1;
    if (!key) { setState({ status: 'idle', count: null }); return undefined; }
    if (audience?.type === 'usernames' && !(audience.usernames || []).length) { setState({ status: 'ready', count: 0 }); return undefined; }
    const my = seq.current;
    setState((s) => ({ status: 'loading', count: s.count }));
    const t = setTimeout(() => {
      previewCampaign(audience, category, sourceMessageId)
        .then((count) => { if (seq.current === my) setState({ status: 'ready', count }); })
        .catch((err) => { if (seq.current === my) setState({ status: isApiMissing(err) ? 'unavailable' : 'error', count: null }); });
    }, delay);
    return () => { clearTimeout(t); seq.current += 1; }; // a late answer for an old audience is ignored
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
