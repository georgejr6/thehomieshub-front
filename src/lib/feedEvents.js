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
export const MAX_STORED = 300; // impressions kept in memory; oldest ended ones are dropped first

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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { suspendActive(); flush(true); } else resumeSuspended();
    });
    window.addEventListener('pagehide', () => { suspendActive(); flush(true); });
  }
}

// The page is going away or hidden: close the card that is on screen so its final
// numbers (skipped, watch time) are in the flush. If the user comes back, it is reopened.
function suspendActive() {
  for (const r of impressions.values()) {
    if (r.ended) continue;
    endImpression(r.impressionId);
    r.suspended = true;
  }
}
function resumeSuspended() {
  for (const r of impressions.values()) {
    if (!r.suspended) continue;
    r.suspended = false;
    if (r.skipped) skipStreak = Math.max(0, skipStreak - 1);
    r.ended = false; r.skipped = false; r.lastT = null; // don't count the time spent hidden
  }
}

function enforceCap() {
  if (impressions.size <= MAX_STORED) return;
  for (const [id, r] of impressions) {
    if (impressions.size <= MAX_STORED) break;
    if (r.ended) impressions.delete(id);
  }
}

/** A card became the visible one. Returns the impression id to pass to the other calls. */
export function beginImpression({ type, id, position = 0, muted = false, access } = {}) {
  if ((type !== 'video' && type !== 'reel') || !id) return null;
  if (access === 'app_only') return null; // no player on the web, nothing was watched
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
  enforceCap();
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
  if (!r) return;
  if (r.ended) { r.suspended = false; return; } // the card left while the page was hidden: stays ended
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

function postBatch(body, headers, keepalive) {
  try {
    return Promise.resolve(fetch(BASE + '/feed/events', { method: 'POST', headers, body, keepalive, credentials: 'omit' }));
  } catch (e) { return Promise.reject(e); }
}

/**
 * Send everything that changed. keepalive=true for unload paths.
 * 401 (stale token): retried once without Authorization. Other 4xx: the batch is dropped
 * (resending the same thing can't succeed). 5xx / network errors: kept for the next flush.
 */
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
    const requeue = () => { chunk.forEach((r) => { if (impressions.has(r.impressionId)) r.dirty = true; }); enforceCap(); };
    const drop = () => { chunk.forEach((r) => impressions.delete(r.impressionId)); };
    const done = () => {
      // finished impressions are done once the server has them
      chunk.forEach((r) => { if (r.ended && !r.dirty && !r.suspended) impressions.delete(r.impressionId); });
    };
    const handle = (res, retried) => {
      const status = res && typeof res.status === 'number' ? res.status : 200;
      if (!res || res.ok !== false) return done();
      if (status === 401 && !retried && headers.Authorization) {
        const anon = { ...headers }; delete anon.Authorization;
        return postBatch(body, anon, keepalive).then((r2) => handle(r2, true));
      }
      if (status >= 500) return requeue();
      return drop(); // 400/401/403/404/413/429...: the server won't take this batch
    };
    sends.push(postBatch(body, headers, keepalive).then((res) => handle(res, false)).catch(requeue));
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