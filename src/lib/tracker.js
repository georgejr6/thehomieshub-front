// Lightweight behavioral analytics client.
// Batches events and POSTs them to /api/track. Uses fetch+keepalive (not
// sendBeacon) so the Authorization header survives page unload — that's what
// attributes events to a logged-in user instead of looking anonymous.

const BASE = 'https://backend.thehomies.app/api';
const SID_KEY = 'hh_sid';
const SID_TS_KEY = 'hh_sid_ts';
const SID_STARTED_KEY = 'hh_sid_started';
const IDLE_MS = 30 * 60 * 1000; // 30 min idle → new session

let queue = [];
let currentPath = null;
let pathEnterTs = null;
let started = false;

function rid() {
  return 'sx_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sessionId() {
  try {
    const now = Date.now();
    const last = parseInt(localStorage.getItem(SID_TS_KEY) || '0', 10);
    let sid = localStorage.getItem(SID_KEY);
    if (!sid || !last || now - last > IDLE_MS) {
      sid = rid();
      localStorage.setItem(SID_KEY, sid);
    }
    localStorage.setItem(SID_TS_KEY, String(now));
    return sid;
  } catch {
    return 'sx_ephemeral';
  }
}

function token() {
  try { return localStorage.getItem('access_token'); } catch { return null; }
}

function enqueue(ev) {
  queue.push({ ts: Date.now(), ...ev });
  if (queue.length >= 12) flush();
}

function flush(keepalive = false) {
  if (!queue.length) return;
  const events = queue;
  queue = [];
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  try {
    fetch(`${BASE}/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId: sessionId(), events }),
      keepalive,
      credentials: 'omit',
    }).catch(() => {});
  } catch { /* ignore */ }
}

// Public: record an arbitrary event (video_watch, video_save, music_play, ...)
export function trackEvent(type, opts = {}) {
  enqueue({ type, ...opts });
}

// Public: send whatever's queued right now instead of waiting for the 15s
// interval/12-event batch — used by pages that need a near-instant admin
// ping (e.g. the invite landing page).
export function flushNow() {
  flush();
}

// Public: call on every route change. Closes out the previous page's dwell time.
export function trackPageview(path) {
  const now = Date.now();
  if (currentPath !== null && pathEnterTs) {
    enqueue({ type: 'pageview', path: currentPath, durationMs: now - pathEnterTs });
  }
  currentPath = path;
  pathEnterTs = now;
}

function closeCurrentPage() {
  if (currentPath && pathEnterTs) {
    enqueue({ type: 'pageview', path: currentPath, durationMs: Date.now() - pathEnterTs });
    pathEnterTs = Date.now();
  }
}

const GEO_CACHE_KEY = 'hh_geo';
const GEO_CACHE_MS = 24 * 60 * 60 * 1000; // 24h

// Public: last-known reverse-geocoded location, read synchronously from the
// client cache (undefined until captureGeo() has resolved at least once).
// Meant for content personalization (e.g. "show Thailand meetups first").
export function getCachedGeo() {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).payload || null;
  } catch {
    return null;
  }
}

// High-accuracy geolocation, opt-in via the browser's native permission
// prompt, reverse-geocoded client-side (no backend key needed), cached 24h.
// Silent no-op if unsupported, denied, or still within the cache window.
// Stored as a 'custom' event (meta.action='geo_update') — the same pattern
// already used for share/search/engagement events — so no backend schema
// change is needed to record it.
function captureGeo() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  try {
    const cachedRaw = localStorage.getItem(GEO_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (Date.now() - cached.ts < GEO_CACHE_MS) return;
    }
  } catch { /* ignore */ }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
        .then((r) => r.json())
        .then((geo) => {
          const payload = {
            lat, lon, accuracy,
            country: geo.countryName || '',
            countryCode: geo.countryCode || '',
            city: geo.city || geo.locality || '',
          };
          try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload })); } catch { /* ignore */ }
          enqueue({ type: 'custom', path: window.location.pathname, meta: { action: 'geo_update', ...payload } });
          flushNow();
        })
        .catch(() => {
          const payload = { lat, lon, accuracy };
          try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload })); } catch { /* ignore */ }
          enqueue({ type: 'custom', path: window.location.pathname, meta: { action: 'geo_update', ...payload } });
          flushNow();
        });
    },
    () => { /* denied or unavailable — silent, no personalization */ },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

let inited = false;
export function initTracker() {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  captureGeo();

  // session_start once per browsing session
  const sid = sessionId();
  try {
    if (localStorage.getItem(SID_STARTED_KEY) !== sid) {
      localStorage.setItem(SID_STARTED_KEY, sid);
      enqueue({ type: 'session_start', path: window.location.pathname, referrer: document.referrer || '' });
    }
  } catch { /* ignore */ }
  started = true;

  // periodic flush
  setInterval(() => flush(), 15000);

  // flush + close page time when tab is hidden / unloaded
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { closeCurrentPage(); flush(true); }
  });
  window.addEventListener('pagehide', () => { closeCurrentPage(); flush(true); });
}
