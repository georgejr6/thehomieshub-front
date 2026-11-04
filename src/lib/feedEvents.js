// For You feed impression logging.
//
// VerticalVideo reports, for every video/reel card that becomes the visible card:
// watch time, duration, skipped (left in under 2 s), completed (>= 90% watched or
// looped), liked, commentsOpened, followed, shared, plus sessionId and the card's
// position in this session. Records are batched and POSTed to /feed/events every
// ~10 s and on visibilitychange / pagehide (fetch keepalive so the Authorization
// header survives page unload). The same impression is re-sent with growing
// numbers; the server upserts on (deviceId, impressionId).

const BASE = (import.meta.env && import.meta.env.VITE_API_URL) || 'https://backend.thehomies.app/api';
const DEVICE_KEY = 'hh_feed_dev';
const SESSION_KEY = 'hh_feed_sess';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_TS_KEY = 'hh_feed_sess_ts';

export const FLUSH_MS = 10000;
export const SKIP_UNDER_MS = 2000;
export const COMPLETE_PCT = 0.9;
const MAX_PER_REQUEST = 50;

let impressions = new Map(); // impressionId -> record
let timer = null;
let listenersOn = false;
let seq = 0;
let sessionDepth = 0;
let skipStreak = 0;
let memDevice = null;
let memSession = null;
let lastMuted = false;

function rid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getDeviceId() {
  try {
    let d = localStorage.getItem(DEVICE_KEY);
    if (!d) { d = rid('dev'); localStorage.setItem(DEVICE_KEY, d); }
    return d;
  } catch {
    return (memDevice ||= rid('dev'));
  }
}

export function getFeedSessionId() {
  try {
    const now = Date.now();
    const last = parseInt(sessionStorage.getItem(SESSION_TS_KEY) || '0', 10);
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s || !last || now - last > SESSION_IDLE_MS) {
      s = rid('fs');
      sessionStorage.setItem(SESSION_KEY, s);
      sessionDepth = 0;
      skipStreak = 0;
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return s;
  } catch {
    return (memSession ||= rid('fs'));
  }
}

function token() {
  try { return localStorage.getItem('access_token'); } catch { return null; }
}

function deviceKind() {
  try { return window.innerWidth < 768 ? 'phone' : 'desktop'; } catch { return 'desktop'; }
}

/** Context the client sends with the ranked feed request and logs with impressions. */
export function getFeedCtx() {
  return { hour: new Date().getHours(), device: deviceKind(), muted: lastMuted, sessionDepth, skipStreak };
}

/** Query params for GET /feed/for-you (deviceId lets the server skip what this device just saw). */
export function forYouParams(extra = {}) {
  return { deviceId: getDeviceId(), ...getFeedCtx(), ...extra };
}

function ensureRunning() {
  if (!timer) timer = setInterval(() => flush(false), FLUSH_MS);
  if (!listenersOn && typeof document !== 'undefined') {
    listenersOn = true;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
    window.addEventListener('pagehide', () => flush(true));
  }
}

/** A card became the visible one. Returns the impression id to pass to the other calls. */
export function beginImpression({ type, id, position = 0, muted = false }) {
  if ((type !== 'video' && type !== 'reel') || !id) return null;
  lastMuted = !!muted;
  getFeedSessionId();
  const impressionId = rid('imp') + '_' + (++seq);
  sessionDepth += 1;
  impressions.set(impressionId, {
    impressionId, type, id: String(id), position,
    watchMs: 0, durationMs: 0, lastT: null, maxPct: 0,
    skipped: false, completed: false, liked: false, commentsOpened: false, followed: false, shared: false,
    ctx: { ...getFeedCtx(), sessionDepth },
    ended: false, dirty: true,
  });
  ensureRunning();
  return impressionId;
}

/**
 * Feed a playback position sample (from timeupdate). Accumulates real watch time
 * (ignoring seeks) and marks the impression completed at >= 90% of the video or on a loop.
 */
export function trackProgress(impressionId, currentTime, duration) {
  const r = impressions.get(impressionId);
  if (!r || r.ended) return;
  if (duration > 0) r.durationMs = Math.round(duration * 1000);
  if (r.lastT != null) {
    const dt = currentTime - r.lastT;
    if (dt > 0 && dt < 2) { r.watchMs += dt * 1000; r.dirty = true; }
    // jumped back from near the end: the video looped
    if (duration > 0 && dt < -1 && r.lastT >= duration * 0.8 && currentTime < duration * 0.2) { r.completed = true; r.dirty = true; }
  }
  r.lastT = currentTime;
  if (duration > 0) {
    if (currentTime / duration > r.maxPct) r.maxPct = currentTime / duration;
    if (r.watchMs >= duration * 1000 * COMPLETE_PCT && !r.completed) { r.completed = true; r.dirty = true; }
  }
}

const FLAGS = ['liked', 'commentsOpened', 'followed', 'shared', 'completed'];
/** Mark a one-way action: markImpression(id, 'liked'). */
export function markImpression(impressionId, flag) {
  const r = impressions.get(impressionId);
  if (!r || !FLAGS.includes(flag) || r[flag]) return;
  r[flag] = true;
  r.dirty = true;
}

/** The card stopped being the visible one. */
export function endImpression(impressionId) {
  const r = impressions.get(impressionId);
  if (!r || r.ended) return;
  r.ended = true;
  r.dirty = true;
  r.skipped = r.watchMs < SKIP_UNDER_MS && !r.completed;
  skipStreak = r.skipped ? skipStreak + 1 : 0;
}

function payload(r) {
  return {
    impressionId: r.impressionId, type: r.type, id: r.id, position: r.position,
    watchMs: Math.round(r.watchMs), durationMs: r.durationMs,
    skipped: r.skipped, completed: r.completed, liked: r.liked,
    commentsOpened: r.commentsOpened, followed: r.followed, shared: r.shared,
    ctx: r.ctx,
  };
}

/** Send everything that changed. keepalive=true for unload paths. */
export function flush(keepalive = false) {
  const dirty = [...impressions.values()].filter((r) => r.dirty);
  if (!dirty.length) return Promise.resolve();
  const sessionId = getFeedSessionId();
  const deviceId = getDeviceId();
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  const sends = [];
  for (let i = 0; i < dirty.length; i += MAX_PER_REQUEST) {
    const chunk = dirty.slice(i, i + MAX_PER_REQUEST);
    chunk.forEach((r) => { r.dirty = false; });
    const body = JSON.stringify({ deviceId, sessionId, events: chunk.map(payload) });
    let p;
    try {
      p = fetch(BASE + '/feed/events', { method: 'POST', headers, body, keepalive, credentials: 'omit' });
    } catch { p = Promise.reject(new Error('fetch failed')); }
    sends.push(Promise.resolve(p).then((res) => {
      if (res && res.ok === false && res.status >= 500) throw new Error('server');
      // finished impressions are done once the server has them
      chunk.forEach((r) => { if (r.ended && !r.dirty) impressions.delete(r.impressionId); });
    }).catch(() => { chunk.forEach((r) => { r.dirty = true; }); }));
  }
  return Promise.all(sends).then(() => {});
}

/** Test helper. */
export function _reset() {
  impressions = new Map();
  if (timer) { clearInterval(timer); timer = null; }
  seq = 0; sessionDepth = 0; skipStreak = 0; memDevice = null; memSession = null; lastMuted = false;
}
export const _pending = () => impressions.size;