import api from '@/api/homieshub';
import { apiErrorCode } from '@/lib/apiErrors';

// The Homies Spaces (live audio rooms). Pure helpers + REST calls; the LiveKit
// room itself lives in pages/SpaceRoomPage.jsx. Backend envelope: data.result.

export const REACTION_EMOJIS = ['🔥', '😂', '💯', '👏', '❤️', '🙏'];
export const REACTION_TOPIC = 'reaction';
export const MAX_LISTENERS_SHOWN = 60;

export const unwrap = (res) => res?.data?.result ?? res?.data ?? null;

export function safeJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

// Participant metadata = JSON { avatarUrl, username, role }.
export const parseMetadata = (raw) => safeJson(raw);

export const ROLES = ['host', 'cohost', 'speaker', 'listener'];

// Who someone is in the room. The server keeps participant metadata in sync on
// every role change, so metadata wins; the Space JSON fills in host/cohost.
export function deriveRole({ identity, metadata, space, canPublish } = {}) {
  const id = identity != null ? String(identity) : '';
  if (space?.host?.id != null && String(space.host.id) === id) return 'host';
  const metaRole = parseMetadata(metadata).role;
  if (metaRole === 'host' || metaRole === 'cohost') return metaRole;
  if (metaRole === 'speaker') return 'speaker';
  if (metaRole === 'listener') return 'listener';
  if ((space?.cohostIds || []).map(String).includes(id)) return 'cohost';
  if ((space?.speakerIds || []).map(String).includes(id) || canPublish) return 'speaker';
  return 'listener';
}

export const isMod = (role) => role === 'host' || role === 'cohost';
export const isSpeakerRole = (role) => role === 'host' || role === 'cohost' || role === 'speaker';
export const isHandRaised = (attributes) => attributes?.hand === '1';

// Actions the viewer may take on a tapped avatar (spec: host/cohost only; only
// the host can cohost/uncohost; nobody acts on the host or on themselves).
export function actionsFor(myRole, targetRole, isSelf = false, isAdmin = false) {
  if (isAdmin && !isSelf) {
    // Site admins can run any Space, including on the host (only mute: the host can't be removed).
    if (targetRole === 'host') return ['mute'];
    if (targetRole === 'listener') return ['invite', 'remove'];
    if (targetRole === 'speaker') return ['mute', 'remove-speaker', 'cohost', 'remove'];
    if (targetRole === 'cohost') return ['mute', 'uncohost', 'remove'];
  }
  if (!isMod(myRole) || isSelf || targetRole === 'host') return [];
  if (targetRole === 'listener') return ['invite', 'remove'];
  if (targetRole === 'speaker') return myRole === 'host' ? ['mute', 'remove-speaker', 'cohost', 'remove'] : ['mute', 'remove-speaker', 'remove'];
  if (targetRole === 'cohost') return myRole === 'host' ? ['mute', 'uncohost', 'remove'] : [];
  return [];
}

export const ACTION_LABELS = {
  invite: 'Invite to speak',
  'remove-speaker': 'Move to listeners',
  cohost: 'Make cohost',
  uncohost: 'Remove cohost',
  mute: 'Mute',
  remove: 'Remove from Space',
};

// UI action -> POST /speakers body action (mute/remove have their own routes).
export const SPEAKER_API_ACTION = { invite: 'invite', 'remove-speaker': 'remove', cohost: 'cohost', uncohost: 'uncohost' };

// Reaction data message payload -> emoji (or null if junk / not allowed).
export function parseReaction(payload) {
  try {
    const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
    const emoji = JSON.parse(text)?.emoji;
    return REACTION_EMOJIS.includes(emoji) ? emoji : null;
  } catch { return null; }
}

export const encodeReaction = (emoji) => new TextEncoder().encode(JSON.stringify({ emoji }));

export function limitListeners(list, max = MAX_LISTENERS_SHOWN) {
  return list.length > max ? { shown: list.slice(0, max), extra: list.length - max } : { shown: list, extra: 0 };
}

const ROLE_ORDER = { host: 0, cohost: 1, speaker: 2, listener: 3 };
export const sortByRole = (list) => list.slice().sort((a, b) => (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0));

export const initialsOf = (name) => (String(name || '?').trim().slice(0, 1) || '?').toUpperCase();

// Normalised failure for any Spaces call.
export function spacesError(err) {
  const status = err?.response?.status;
  const code = apiErrorCode(err);
  if (status === 503 && (code === 'spaces_off' || !code)) return { kind: 'off', message: 'Spaces are coming soon' };
  if (code === 'spaces_off') return { kind: 'off', message: 'Spaces are coming soon' };
  if (status === 410 || code === 'ended') return { kind: 'ended', message: 'This Space has ended.' };
  if (code === 'sign_in_required') return { kind: 'signin', message: 'Sign in to keep listening.' };
  if (code === 'not_live') return { kind: 'not_live', message: 'This Space is not live right now.' };
  if (code === 'is_host') return { kind: 'error', message: "The host can't be removed. End the Space instead." };
  if (code === 'removed') return { kind: 'removed', message: 'The host removed you from this Space.' };
  if (code === 'no_permission') return { kind: 'no_permission', message: "You can't start a Space right now." };
  if (code === 'already_live') {
    const d = err?.response?.data || {};
    const id = d.spaceId || d.id || d.space?.id || d.result?.id || d.result?.spaceId || d.error?.spaceId || null;
    return { kind: 'already_live', message: 'You already have a live Space.', spaceId: id };
  }
  if (status === 401) return { kind: 'auth', message: 'Sign in to join Spaces.' };
  if (status === 403) return { kind: 'forbidden', message: err?.response?.data?.message || "You can't join this Space." };
  if (status === 404) return { kind: 'missing', message: 'Space not found.' };
  if (status === 429) return { kind: 'rate', message: 'Slow down a little and try again.' };
  return { kind: 'error', message: err?.response?.data?.message || err?.message || 'Something went wrong.' };
}

export const listSpaces = () => api.get('/spaces').then(unwrap);
export const createSpace = (body) => api.post('/spaces', body).then(unwrap);
const guestCfg = (guest) => (guest ? { noAuth: true } : undefined);
export const getSpace = (id, guest = false) => api.get(`/spaces/${id}`, guestCfg(guest)).then(unwrap);
export const guestJoinSpace = (id) => api.post(`/spaces/${id}/guest-join`, {}, { noAuth: true }).then(unwrap);
export const joinSpace = (id) => api.post(`/spaces/${id}/join`).then(unwrap);
export const startSpace = (id) => api.post(`/spaces/${id}/start`).then(unwrap);
export const endSpace = (id) => api.post(`/spaces/${id}/end`).then(unwrap);
export const speakerAction = (id, userId, action) => api.post(`/spaces/${id}/speakers`, { userId, action }).then(unwrap);
// Hands go through the server: clients can't edit their own LiveKit attributes.
export const setHandInSpace = (id, raised) => api.post(`/spaces/${id}/hand`, { raised: !!raised }).then(unwrap);
export const muteInSpace = (id, userId) => api.post(`/spaces/${id}/mute`, { userId }).then(unwrap);
export const removeFromSpace = (id, userId) => api.post(`/spaces/${id}/remove`, { userId }).then(unwrap);

export const getReplay = (id, guest = false) => api.get(`/spaces/${id}/replay`, guestCfg(guest)).then(unwrap);
export const postSpeaking = (id, segments) => api.post(`/spaces/${id}/speaking`, { segments, sentAt: Date.now() }).then(unwrap);
// For page close / leaving: fetch with keepalive so the last stretch still gets there.
export function postSpeakingKeepalive(id, segments) {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(`${api.defaults.baseURL}/spaces/${id}/speaking`, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ segments, sentAt: Date.now() }),
    }).catch(() => { /* silent */ });
  } catch { /* silent */ }
}

export const isGuestIdentity = (id) => String(id || '').startsWith('guest_');
export const isStripeUrl = (u) => typeof u === 'string' && u.startsWith('https://checkout.stripe.com/');
const HANDLE_HOSTS = { cashapp: ['cash.app'], instagram: ['instagram.com'], youtube: ['youtube.com'], tiktok: ['tiktok.com'], x: ['x.com'] };
// Only https links to the expected site for that handle.
export function safeHandleUrl(key, url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.replace(/^www\./, '');
    return (HANDLE_HOSTS[key] || []).includes(host) ? u.toString() : null;
  } catch { return null; }
}
export const getMyProfile = () => api.get('/spaces/me/profile').then(unwrap);
export const saveMyProfile = (body) => api.patch('/spaces/me/profile', body).then(unwrap);
export const getPerson = (id, userId) => api.get(`/spaces/${id}/people/${userId}`).then(unwrap);
export const giftPoints = (id, toUserId, points) => api.post(`/spaces/${id}/gift`, { toUserId, points }).then(unwrap);
export const tipPerson = (id, toUserId, amountCents) => api.post(`/spaces/${id}/tip`, { toUserId, amountCents }).then(unwrap);

// Who is talking at a replay position. wall = parts[i].startMs + time*1000.
export function speakingIdsAt(speech, wall) {
  const out = new Set();
  if (!Array.isArray(speech) || !Number.isFinite(wall)) return out;
  for (const r of speech) {
    if (r.s - 800 > wall) break; // sorted by s
    if (wall <= r.e + 250) out.add(String(r.u));
  }
  return out;
}

// Plain-words errors for gifts and tips.
export function personError(err) {
  const code = apiErrorCode(err);
  const msg = err?.response?.data?.message;
  if (code === 'insufficient_points') return { kind: 'points', message: "You don't have enough points for that." };
  if (code === 'earned_points_not_tippable') return { kind: 'earned', message: msg || 'Only points you bought can be sent as gifts.' };
  if (code === 'not_member') return { kind: 'error', message: 'Only paying members can get gifts and tips.' };
  if (code === 'blocked') return { kind: 'error', message: "You can't send to this person." };
  if (code === 'self') return { kind: 'error', message: "You can't send to yourself." };
  if (code === 'not_in_space') return { kind: 'error', message: 'They are not in this Space.' };
  if (code === 'payouts_not_ready') return { kind: 'error', message: "They haven't set up payouts yet." };
  return { kind: 'error', message: msg || spacesError(err).message };
}
export const deleteReplay = (id) => api.delete(`/spaces/${id}/replay`).then(unwrap);

export const spaceUrl = (id) => `${typeof window !== 'undefined' ? window.location.origin : 'https://thehomies.app'}/spaces/${id}`;

// Native share sheet where there is one, else copy the link. Returns 'shared' | 'copied' | null.
export async function shareSpace(space) {
  const url = spaceUrl(space.id);
  const title = space.title ? `${space.title} | The Homies Spaces` : 'The Homies Spaces';
  try {
    if (navigator.share) { await navigator.share({ title, text: space.title || 'Join this Space', url }); return 'shared'; }
  } catch (e) { if (e?.name === 'AbortError') return null; }
  try { await navigator.clipboard.writeText(url); return 'copied'; } catch { /* old browser */ }
  try { window.prompt('Copy this link', url); } catch { /* blocked */ }
  return null;
}

export function formatDuration(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
export const durationLabel = (secs) => {
  const m = Math.round((secs || 0) / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`;
};

// The mic someone picked last time (per browser).
const MIC_KEY = 'hh_spaces_mic';
export function savedMic() { try { return localStorage.getItem(MIC_KEY) || ''; } catch { return ''; } }
export function saveMic(id) { try { if (id) localStorage.setItem(MIC_KEY, id); else localStorage.removeItem(MIC_KEY); } catch { /* private mode */ } }

// Friendly text for getUserMedia failures.
export function micErrorText(err) {
  const n = err?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Allow microphone access for thehomies.app (tap the lock icon next to the address), then try again.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No microphone found. Plug one in, then pick it in Mic settings.';
  if (n === 'NotReadableError' || n === 'AbortError') return 'Another app is using your mic. Close it and try again.';
  return err?.message || 'Could not use the microphone.';
}

// Public: Spaces live right now (no account needed), for the stories row and /live.
// Returns { live, replays }. Always sent without a token so it is the same for everyone.
export const listLiveNowFeed = () => api.get('/spaces/live-now', { noAuth: true }).then(unwrap).then((r) => ({ live: r?.live || [], replays: r?.replays || [] }));
export const listLiveNow = () => listLiveNowFeed().then((r) => r.live);

// Open a Space. Signed-out visitors can open it too (they listen as guests).
export function openSpace(navigate, id) { navigate(`/spaces/${id}`); }
