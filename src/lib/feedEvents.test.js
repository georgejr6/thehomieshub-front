import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  beginImpression, trackProgress, markImpression, endImpression, flush, forYouParams,
  getDeviceId, _reset, _pending, FLUSH_MS,
} from './feedEvents';

let calls;
const lastEvents = () => JSON.parse(calls[calls.length - 1].init.body).events;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); _reset();
  vi.useFakeTimers();
  calls = [];
  vi.stubGlobal('fetch', vi.fn((url, init) => { calls.push({ url, init }); return Promise.resolve({ ok: true, status: 200 }); }));
});
afterEach(() => { _reset(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const ID = '0123456789abcdef01234567';

describe('feedEvents', () => {
  it('ignores things that are not a video or reel', () => {
    expect(beginImpression({ type: 'music', id: ID })).toBeNull();
    expect(beginImpression({ type: 'video', id: '' })).toBeNull();
  });

  it('accumulates real watch time, ignoring seeks, and flags a skip under 2 s', async () => {
    const a = beginImpression({ type: 'video', id: ID, position: 3 });
    for (let t = 0; t <= 1; t += 0.25) trackProgress(a, t, 30);
    trackProgress(a, 20, 30); // seek: not watch time
    endImpression(a);
    await flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/feed\/events$/);
    const [e] = lastEvents();
    expect(e).toMatchObject({ type: 'video', id: ID, position: 3, skipped: true, completed: false, durationMs: 30000 });
    expect(e.watchMs).toBe(1000);
  });

  it('completed at 90% watched, or when the video loops', async () => {
    const a = beginImpression({ type: 'reel', id: ID });
    for (let t = 0; t <= 9.5; t += 0.5) trackProgress(a, t, 10);
    endImpression(a);
    const b = beginImpression({ type: 'video', id: ID });
    trackProgress(b, 9, 10); trackProgress(b, 9.5, 10); trackProgress(b, 0.2, 10);
    endImpression(b);
    await flush();
    const ev = lastEvents();
    expect(ev.find((x) => x.type === 'reel')).toMatchObject({ completed: true, skipped: false });
    expect(ev.find((x) => x.type === 'video').completed).toBe(true);
  });

  it('records one-way actions and the same impression grows on re-send', async () => {
    const a = beginImpression({ type: 'video', id: ID });
    for (let t = 0; t <= 5; t += 0.5) trackProgress(a, t, 60);
    markImpression(a, 'liked');
    await flush();
    const first = lastEvents()[0];
    expect(first.liked).toBe(true);
    expect(first.skipped).toBe(false);
    markImpression(a, 'commentsOpened'); markImpression(a, 'followed'); markImpression(a, 'shared');
    markImpression(a, 'nonsense');
    trackProgress(a, 6, 60);
    await flush();
    const second = lastEvents()[0];
    expect(second.impressionId).toBe(first.impressionId);
    expect(second).toMatchObject({ commentsOpened: true, followed: true, shared: true, liked: true });
    expect(second.watchMs).toBeGreaterThan(first.watchMs);
  });

  it('nothing is sent when nothing changed; a finished impression is dropped after it is delivered', async () => {
    const a = beginImpression({ type: 'video', id: ID });
    await flush();
    await flush();
    expect(calls).toHaveLength(1);
    endImpression(a);
    await flush();
    expect(calls).toHaveLength(2);
    expect(_pending()).toBe(0);
  });

  it('flushes every 10 s on a timer', async () => {
    beginImpression({ type: 'video', id: ID });
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(FLUSH_MS + 10);
    expect(calls).toHaveLength(1);
  });

  it('flushes with keepalive when the page is hidden', async () => {
    beginImpression({ type: 'video', id: ID });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(calls).toHaveLength(1);
    expect(calls[0].init.keepalive).toBe(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  it('sends the auth token when signed in, a stable device id, and re-queues on failure', async () => {
    localStorage.setItem('access_token', 'tok');
    const dev = getDeviceId();
    expect(getDeviceId()).toBe(dev);
    beginImpression({ type: 'video', id: ID });
    fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    await flush();
    await flush(); // retried because the first failed
    expect(calls).toHaveLength(1);
    expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
    const body = JSON.parse(calls[0].init.body);
    expect(body.deviceId).toBe(dev);
    expect(body.sessionId).toBeTruthy();
  });

  it('tracks session depth and skip streak for the request context', () => {
    for (let i = 0; i < 3; i++) endImpression(beginImpression({ type: 'video', id: ID, muted: true }));
    const p = forYouParams();
    expect(p).toMatchObject({ sessionDepth: 3, skipStreak: 3, muted: true });
    expect(['phone', 'desktop']).toContain(p.device);
    expect(p.deviceId).toBe(getDeviceId());
  });
});