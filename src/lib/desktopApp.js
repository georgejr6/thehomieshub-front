// The Homies desktop app (Electron wrapper of this site) — download links,
// OS detection, and the rules for the occasional "desktop app is here" nudge.
//
// MOBILE STAYS THE PRIMARY DOWNLOAD. Everything here is a secondary option:
// it never replaces the App Store / Google Play prompts, and it's hidden
// entirely inside the desktop app itself (which defines window.homiesDesktop).

const RELEASES = 'https://github.com/georgejr6/thehomieshub-desktop-releases/releases/latest/download';

export const DESKTOP_DOWNLOADS = {
  windows: { key: 'windows', label: 'Windows', file: 'TheHomies-Setup.exe', url: `${RELEASES}/TheHomies-Setup.exe`, note: 'Windows 10 or later' },
  mac: { key: 'mac', label: 'Mac', file: 'TheHomies.dmg', url: `${RELEASES}/TheHomies.dmg`, note: 'macOS (.dmg)' },
  linux: { key: 'linux', label: 'Linux', file: 'TheHomies.AppImage', url: `${RELEASES}/TheHomies.AppImage`, note: 'AppImage — runs on most distros' },
  linuxDeb: { key: 'linuxDeb', label: 'Linux (.deb)', file: 'TheHomies.deb', url: `${RELEASES}/TheHomies.deb`, note: 'Debian / Ubuntu' },
};

// Mac App Store listing — null until the app is approved. When set, the
// "Mac App Store" button on /desktop switches from "coming soon" to a link.
export const MAC_APP_STORE_URL = null;

export const DESKTOP_PAGE_PATH = '/desktop';

const nav = () => (typeof navigator !== 'undefined' ? navigator : null);

/** True when running inside The Homies desktop app (Electron preload sets window.homiesDesktop). */
export function isInDesktopApp(win = typeof window !== 'undefined' ? window : undefined) {
  return !!(win && win.homiesDesktop && win.homiesDesktop.isDesktop);
}

/**
 * 'windows' | 'mac' | 'linux' | 'ios' | 'android' | 'chromeos' | 'unknown'.
 * Pass a navigator-like object to test; defaults to the real one.
 */
export function detectOS(n = nav()) {
  if (!n) return 'unknown';
  const ua = String(n.userAgent || '');
  const hint = String((n.userAgentData && n.userAgentData.platform) || '');
  const platform = String(n.platform || '');
  const all = `${hint} ${platform} ${ua}`.toLowerCase();

  // Mobile first — Android UAs also contain "Linux".
  if (/android/.test(all)) return 'android';
  if (/iphone|ipad|ipod|\bios\b/.test(all)) return 'ios';
  // iPadOS 13+ reports itself as a Mac; touch points give it away.
  if (/mac/.test(all) && Number(n.maxTouchPoints || 0) > 1) return 'ios';
  if (/cros|chrome os|chromeos/.test(all)) return 'chromeos';
  // Mac before Windows: "darwin" contains "win".
  if (/mac|darwin/.test(all)) return 'mac';
  if (/win/.test(all)) return 'windows';
  if (/linux|x11|ubuntu|fedora|debian/.test(all)) return 'linux';
  return 'unknown';
}

/** Phones and tablets (any OS). */
export function isMobileOrTablet(n = nav()) {
  if (!n) return false;
  if (n.userAgentData && n.userAgentData.mobile) return true;
  const os = detectOS(n);
  if (os === 'ios' || os === 'android') return true;
  return /mobile|tablet|silk|kindle|playbook|opera mini|iemobile/i.test(String(n.userAgent || ''));
}

/**
 * A regular desktop/laptop browser — NOT a phone/tablet and NOT already
 * inside The Homies desktop app. This is the only place desktop-download
 * prompts should show.
 */
export function isDesktopBrowser(n = nav(), win = typeof window !== 'undefined' ? window : undefined) {
  if (!n) return false;
  if (isInDesktopApp(win)) return false;
  if (isMobileOrTablet(n)) return false;
  return true;
}

/** Which build to recommend for this visitor, or null (phone, ChromeOS, unknown). */
export function recommendedDownload(n = nav()) {
  const os = detectOS(n);
  if (os === 'windows') return DESKTOP_DOWNLOADS.windows;
  if (os === 'mac') return DESKTOP_DOWNLOADS.mac;
  if (os === 'linux') return DESKTOP_DOWNLOADS.linux;
  return null;
}

/** The other primary builds (Windows/Mac/Linux) besides the recommended one. */
export function otherDownloads(recommended) {
  return [DESKTOP_DOWNLOADS.windows, DESKTOP_DOWNLOADS.mac, DESKTOP_DOWNLOADS.linux].filter(
    (d) => !recommended || d.key !== recommended.key
  );
}

// ---------------------------------------------------------------------------
// Desktop nudge — eligibility is a pure function so it can be tested with an
// injected clock + state. The component (DesktopAppNudge) gathers the inputs.
// ---------------------------------------------------------------------------

export const NUDGE_STATE_KEY = 'hh_desktop_nudge';
export const NUDGE_SESSION_KEY = 'hh_desktop_nudge_session'; // sessionStorage: { startedAt }
export const NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // at most once per 7 days
export const NUDGE_MAX_DISMISSALS = 3; // stop forever after 3 dismissals
export const NUDGE_SESSION_DELAY_MS = 75 * 1000; // ~60s+ into the session
export const NUDGE_AFTER_MOBILE_PROMPT_MS = 5 * 60 * 1000; // quiet gap after a mobile prompt

// Checkout / payment / live-stream / broadcast surfaces (plus admin and
// auth flows) where a nudge would be in the way.
const BLOCKED_PATH_PREFIXES = [
  '/pay', '/billing', '/checkout', '/donate', '/sponsor', '/fight', '/bets',
  '/memberships', '/subscriptions', '/consultation', '/purchases', '/wallet',
  '/shop/cart', '/shop/thanks',
  '/live', '/live-stream', '/go-live', '/studio', '/vod',
  '/admin', '/auth', '/join', '/reset-password',
  DESKTOP_PAGE_PATH, '/download',
];

export function isNudgeBlockedPath(pathname = '') {
  const p = String(pathname || '').toLowerCase();
  return BLOCKED_PATH_PREFIXES.some((b) => p === b || p.startsWith(`${b}/`));
}

export const DEFAULT_NUDGE_STATE = { sessions: 0, lastShownAt: 0, dismissals: 0, downloaded: false };

/**
 * Returns { ok: boolean, reason: string }.
 * ctx: {
 *   now, state (persisted: sessions, lastShownAt, dismissals, downloaded),
 *   sessionStartedAt, desktopBrowser, signedIn, pathname, mediaActive,
 *   mobileBannerVisible, mobilePromptPending, lastMobilePromptAt,
 * }
 */
export function nudgeEligibility(ctx) {
  const s = { ...DEFAULT_NUDGE_STATE, ...(ctx.state || {}) };
  const now = Number(ctx.now) || 0;
  if (!ctx.desktopBrowser) return { ok: false, reason: 'not_desktop_browser' };
  if (s.downloaded) return { ok: false, reason: 'downloaded' };
  if (s.dismissals >= NUDGE_MAX_DISMISSALS) return { ok: false, reason: 'dismissed_max' };
  // Signed-in or returning visitors only — and never on anyone's first session.
  if (s.sessions < 2) return { ok: false, reason: 'first_session' };
  if (s.lastShownAt && now - s.lastShownAt < NUDGE_COOLDOWN_MS) return { ok: false, reason: 'cooldown' };
  if (!ctx.sessionStartedAt || now - ctx.sessionStartedAt < NUDGE_SESSION_DELAY_MS) return { ok: false, reason: 'too_early' };
  if (isNudgeBlockedPath(ctx.pathname)) return { ok: false, reason: 'blocked_path' };
  if (ctx.mediaActive) return { ok: false, reason: 'media_active' };
  // Mobile stays primary: never alongside, or right after, a mobile prompt.
  if (ctx.mobileBannerVisible) return { ok: false, reason: 'mobile_banner_visible' };
  if (ctx.mobilePromptPending) return { ok: false, reason: 'mobile_prompt_pending' };
  if (ctx.lastMobilePromptAt && now - ctx.lastMobilePromptAt < NUDGE_AFTER_MOBILE_PROMPT_MS) return { ok: false, reason: 'after_mobile_prompt' };
  return { ok: true, reason: 'ok' };
}

// --- persistence (all wrapped: private mode / blocked storage just means "no nudge") ---

export function readNudgeState(storage = safeLocal()) {
  try {
    const raw = storage && storage.getItem(NUDGE_STATE_KEY);
    return { ...DEFAULT_NUDGE_STATE, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_NUDGE_STATE };
  }
}

export function writeNudgeState(patch, storage = safeLocal()) {
  const next = { ...readNudgeState(storage), ...patch };
  try { storage && storage.setItem(NUDGE_STATE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

/**
 * Call once per page load. A new browser session (sessionStorage empty) bumps
 * the persisted session count. Returns { state, sessionStartedAt }.
 */
export function beginNudgeSession(now = Date.now(), storage = safeLocal(), session = safeSession()) {
  try {
    const existing = session && session.getItem(NUDGE_SESSION_KEY);
    if (existing) {
      const startedAt = Number(JSON.parse(existing).startedAt) || now;
      return { state: readNudgeState(storage), sessionStartedAt: startedAt };
    }
    session && session.setItem(NUDGE_SESSION_KEY, JSON.stringify({ startedAt: now }));
  } catch {
    // No session storage → can't tell sessions apart; treat as a first session.
    return { state: readNudgeState(storage), sessionStartedAt: 0 };
  }
  const state = writeNudgeState({ sessions: readNudgeState(storage).sessions + 1 }, storage);
  return { state, sessionStartedAt: now };
}

// Mobile prompt bookkeeping, written by GetAppBanner / GetAppSignedOutModal so
// the desktop nudge can stay out of their way.
export const MOBILE_PROMPT_AT_KEY = 'hh_mobile_prompt_at';
export function markMobilePrompt(now = Date.now(), session = safeSession()) {
  try { session && session.setItem(MOBILE_PROMPT_AT_KEY, String(now)); } catch { /* ignore */ }
}
export function lastMobilePromptAt(session = safeSession()) {
  try { return Number((session && session.getItem(MOBILE_PROMPT_AT_KEY)) || 0); } catch { return 0; }
}

function safeLocal() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
function safeSession() {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
}
