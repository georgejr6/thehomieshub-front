import { describe, it, expect } from 'vitest';
import {
  DESKTOP_DOWNLOADS,
  MAC_APP_STORE_URL,
  NUDGE_AFTER_MOBILE_PROMPT_MS,
  NUDGE_COOLDOWN_MS,
  NUDGE_MAX_DISMISSALS,
  NUDGE_SESSION_DELAY_MS,
  NUDGE_STATE_KEY,
  beginNudgeSession,
  detectOS,
  isDesktopBrowser,
  isInDesktopApp,
  isMobileOrTablet,
  isNudgeBlockedPath,
  lastMobilePromptAt,
  markMobilePrompt,
  nudgeEligibility,
  otherDownloads,
  readNudgeState,
  recommendedDownload,
  writeNudgeState,
} from './desktopApp';

const UA = {
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  cros: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
};
const nav = (userAgent, extra = {}) => ({ userAgent, platform: '', maxTouchPoints: 0, ...extra });

const memStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};
const brokenStorage = () => ({
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
});

describe('detectOS', () => {
  it('detects desktop OSes from the user agent', () => {
    expect(detectOS(nav(UA.win, { platform: 'Win32' }))).toBe('windows');
    expect(detectOS(nav(UA.mac, { platform: 'MacIntel' }))).toBe('mac');
    expect(detectOS(nav(UA.linux, { platform: 'Linux x86_64' }))).toBe('linux');
  });

  it('detects phones and tablets (Android UAs also say Linux)', () => {
    expect(detectOS(nav(UA.android, { platform: 'Linux armv8l' }))).toBe('android');
    expect(detectOS(nav(UA.androidTablet))).toBe('android');
    expect(detectOS(nav(UA.iphone, { platform: 'iPhone' }))).toBe('ios');
  });

  it('treats an iPad pretending to be a Mac as iOS', () => {
    expect(detectOS(nav(UA.mac, { platform: 'MacIntel', maxTouchPoints: 5 }))).toBe('ios');
  });

  it('prefers userAgentData.platform when present', () => {
    expect(detectOS(nav('Mozilla/5.0', { userAgentData: { platform: 'Windows', mobile: false } }))).toBe('windows');
    expect(detectOS(nav('Mozilla/5.0', { userAgentData: { platform: 'macOS', mobile: false } }))).toBe('mac');
    expect(detectOS(nav('Mozilla/5.0', { userAgentData: { platform: 'Linux', mobile: false } }))).toBe('linux');
  });

  it('handles ChromeOS, unknown and missing navigator', () => {
    expect(detectOS(nav(UA.cros))).toBe('chromeos');
    expect(detectOS(nav('SomeBot/1.0'))).toBe('unknown');
    expect(detectOS(null)).toBe('unknown');
  });
});

describe('recommended download', () => {
  it('maps the OS to its build', () => {
    expect(recommendedDownload(nav(UA.win))).toBe(DESKTOP_DOWNLOADS.windows);
    expect(recommendedDownload(nav(UA.mac))).toBe(DESKTOP_DOWNLOADS.mac);
    expect(recommendedDownload(nav(UA.linux))).toBe(DESKTOP_DOWNLOADS.linux);
    expect(recommendedDownload(nav(UA.iphone))).toBeNull();
    expect(recommendedDownload(nav(UA.cros))).toBeNull();
  });

  it('lists the other platforms', () => {
    expect(otherDownloads(DESKTOP_DOWNLOADS.windows).map((d) => d.key)).toEqual(['mac', 'linux']);
    expect(otherDownloads(null).map((d) => d.key)).toEqual(['windows', 'mac', 'linux']);
  });

  it('uses the stable GitHub release URLs; Mac App Store not live yet', () => {
    const base = 'https://github.com/georgejr6/thehomieshub-desktop-releases/releases/latest/download/';
    expect(DESKTOP_DOWNLOADS.windows.url).toBe(`${base}TheHomies-Setup.exe`);
    expect(DESKTOP_DOWNLOADS.mac.url).toBe(`${base}TheHomies.dmg`);
    expect(DESKTOP_DOWNLOADS.linux.url).toBe(`${base}TheHomies.AppImage`);
    expect(DESKTOP_DOWNLOADS.linuxDeb.url).toBe(`${base}TheHomies.deb`);
    expect(MAC_APP_STORE_URL).toBeNull();
  });
});

describe('isDesktopBrowser', () => {
  const plainWin = {};
  const appWin = { homiesDesktop: { isDesktop: true } };

  it('is true for desktop browsers', () => {
    expect(isDesktopBrowser(nav(UA.win), plainWin)).toBe(true);
    expect(isDesktopBrowser(nav(UA.mac), plainWin)).toBe(true);
    expect(isDesktopBrowser(nav(UA.linux), plainWin)).toBe(true);
  });

  it('is false on phones and tablets', () => {
    expect(isDesktopBrowser(nav(UA.iphone), plainWin)).toBe(false);
    expect(isDesktopBrowser(nav(UA.android), plainWin)).toBe(false);
    expect(isDesktopBrowser(nav(UA.androidTablet), plainWin)).toBe(false);
    expect(isDesktopBrowser(nav(UA.mac, { maxTouchPoints: 5 }), plainWin)).toBe(false);
    expect(isDesktopBrowser(nav('Mozilla/5.0', { userAgentData: { platform: 'Android', mobile: true } }), plainWin)).toBe(false);
    expect(isMobileOrTablet(nav(UA.iphone))).toBe(true);
  });

  it('is false inside The Homies desktop app', () => {
    expect(isInDesktopApp(appWin)).toBe(true);
    expect(isInDesktopApp({ homiesDesktop: {} })).toBe(false);
    expect(isInDesktopApp(plainWin)).toBe(false);
    expect(isDesktopBrowser(nav(UA.win), appWin)).toBe(false);
  });

  it('is false without a navigator', () => {
    expect(isDesktopBrowser(null, plainWin)).toBe(false);
  });
});

describe('nudgeEligibility', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = 1_800_000_000_000;
  const base = (over = {}) => ({
    now: NOW,
    state: { sessions: 3, lastShownAt: 0, dismissals: 0, downloaded: false },
    sessionStartedAt: NOW - 2 * 60 * 1000,
    desktopBrowser: true,
    signedIn: true,
    pathname: '/browse',
    mediaActive: false,
    mobileBannerVisible: false,
    mobilePromptPending: false,
    lastMobilePromptAt: 0,
    ...over,
  });
  const withState = (s) => base({ state: { ...base().state, ...s } });

  it('shows for a returning desktop visitor who has been around a while', () => {
    expect(nudgeEligibility(base())).toEqual({ ok: true, reason: 'ok' });
    expect(nudgeEligibility(base({ signedIn: false })).ok).toBe(true);
  });

  it('never on a first session (signed in or not)', () => {
    expect(nudgeEligibility(withState({ sessions: 1 })).reason).toBe('first_session');
    expect(nudgeEligibility(withState({ sessions: 0 })).reason).toBe('first_session');
  });

  it('never on phones/tablets or inside the desktop app', () => {
    expect(nudgeEligibility(base({ desktopBrowser: false })).reason).toBe('not_desktop_browser');
  });

  it('at most once per 7 days', () => {
    expect(nudgeEligibility(withState({ lastShownAt: NOW - 6 * DAY })).reason).toBe('cooldown');
    expect(nudgeEligibility(withState({ lastShownAt: NOW - NUDGE_COOLDOWN_MS + 1 })).reason).toBe('cooldown');
    expect(nudgeEligibility(withState({ lastShownAt: NOW - NUDGE_COOLDOWN_MS })).ok).toBe(true);
  });

  it('stops forever after 3 dismissals or a download', () => {
    expect(NUDGE_MAX_DISMISSALS).toBe(3);
    expect(nudgeEligibility(withState({ dismissals: 2 })).ok).toBe(true);
    expect(nudgeEligibility(withState({ dismissals: 3 })).reason).toBe('dismissed_max');
    expect(nudgeEligibility(withState({ downloaded: true })).reason).toBe('downloaded');
    // even years later
    expect(nudgeEligibility(base({ now: NOW + 400 * DAY, state: { sessions: 9, dismissals: 3 } })).ok).toBe(false);
  });

  it('waits at least ~60s into the session', () => {
    expect(NUDGE_SESSION_DELAY_MS).toBeGreaterThanOrEqual(60 * 1000);
    expect(nudgeEligibility(base({ sessionStartedAt: NOW - 30 * 1000 })).reason).toBe('too_early');
    expect(nudgeEligibility(base({ sessionStartedAt: NOW - NUDGE_SESSION_DELAY_MS })).ok).toBe(true);
    expect(nudgeEligibility(base({ sessionStartedAt: 0 })).reason).toBe('too_early');
  });

  it('skips checkout / payment / live / broadcast pages', () => {
    for (const p of ['/pay', '/billing', '/shop/cart', '/shop/thanks', '/donate', '/sponsor', '/fight', '/bets/abc',
      '/memberships', '/subscriptions', '/wallet/purchase', '/live', '/live-stream/mwosa', '/go-live', '/studio/stream', '/admin/dashboard', '/desktop']) {
      expect(isNudgeBlockedPath(p)).toBe(true);
      expect(nudgeEligibility(base({ pathname: p })).reason).toBe('blocked_path');
    }
    for (const p of ['/browse', '/chat', '/chat/general', '/media', '/profile/someone', '/shop', '/livestreams-are-not-a-route']) {
      expect(isNudgeBlockedPath(p)).toBe(false);
    }
  });

  it('skips while a call/stream or video with sound is active', () => {
    expect(nudgeEligibility(base({ mediaActive: true })).reason).toBe('media_active');
  });

  it('never alongside or right after a mobile app prompt', () => {
    expect(nudgeEligibility(base({ mobileBannerVisible: true })).reason).toBe('mobile_banner_visible');
    expect(nudgeEligibility(base({ mobilePromptPending: true })).reason).toBe('mobile_prompt_pending');
    expect(nudgeEligibility(base({ lastMobilePromptAt: NOW - 60 * 1000 })).reason).toBe('after_mobile_prompt');
    expect(nudgeEligibility(base({ lastMobilePromptAt: NOW - NUDGE_AFTER_MOBILE_PROMPT_MS })).ok).toBe(true);
  });
});

describe('nudge storage', () => {
  it('counts a new session once per browser session', () => {
    const local = memStorage();
    const s1 = memStorage();
    const a = beginNudgeSession(1000, local, s1);
    expect(a.state.sessions).toBe(1);
    expect(a.sessionStartedAt).toBe(1000);
    const again = beginNudgeSession(5000, local, s1); // reload in the same session
    expect(again.state.sessions).toBe(1);
    expect(again.sessionStartedAt).toBe(1000);
    const b = beginNudgeSession(9000, local, memStorage()); // new session
    expect(b.state.sessions).toBe(2);
    expect(b.sessionStartedAt).toBe(9000);
  });

  it('reads/writes state and survives corrupt or blocked storage', () => {
    const local = memStorage({ [NUDGE_STATE_KEY]: '{not json' });
    expect(readNudgeState(local)).toEqual({ sessions: 0, lastShownAt: 0, dismissals: 0, downloaded: false });
    writeNudgeState({ dismissals: 2 }, local);
    expect(readNudgeState(local).dismissals).toBe(2);
    expect(readNudgeState(brokenStorage()).sessions).toBe(0);
    expect(() => writeNudgeState({ dismissals: 1 }, brokenStorage())).not.toThrow();
    // Blocked session storage = can't tell sessions apart → treated as first session.
    const r = beginNudgeSession(1000, memStorage(), brokenStorage());
    expect(r.sessionStartedAt).toBe(0);
    expect(nudgeEligibility({ now: 10 ** 7, state: { sessions: 5 }, sessionStartedAt: r.sessionStartedAt, desktopBrowser: true, pathname: '/browse' }).ok).toBe(false);
  });

  it('remembers the last mobile prompt time', () => {
    const s = memStorage();
    expect(lastMobilePromptAt(s)).toBe(0);
    markMobilePrompt(1234, s);
    expect(lastMobilePromptAt(s)).toBe(1234);
    expect(lastMobilePromptAt(brokenStorage())).toBe(0);
    expect(() => markMobilePrompt(1, brokenStorage())).not.toThrow();
  });
});
