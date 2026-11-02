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
export function actionsFor(myRole, targetRole, isSelf = false) {
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
  if (code === 'removed') return { kind: 'removed', message: 'The host removed you from this Space.' };
  if (code === 'no_permission') return { kind: 'no_permission', message: "You can't start Spaces yet. Hosting is for admins and paid members." };
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
export const getSpace = (id) => api.get(`/spaces/${id}`).then(unwrap);
export const joinSpace = (id) => api.post(`/spaces/${id}/join`).then(unwrap);
export const startSpace = (id) => api.post(`/spaces/${id}/start`).then(unwrap);
export const endSpace = (id) => api.post(`/spaces/${id}/end`).then(unwrap);
export const speakerAction = (id, userId, action) => api.post(`/spaces/${id}/speakers`, { userId, action }).then(unwrap);
export const muteInSpace = (id, userId) => api.post(`/spaces/${id}/mute`, { userId }).then(unwrap);
export const removeFromSpace = (id, userId) => api.post(`/spaces/${id}/remove`, { userId }).then(unwrap);
