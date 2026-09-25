// Best-effort private / incognito window detection for the /join gate.
// Joining needs a normal browser window: private windows forget the session
// (so people can't pick up where they left off) and often block or fake
// location. Returns true (private), false (normal) or null (can't tell) —
// callers only block on a definite `true`.
//
// Techniques (same ones the open-source detectIncognito uses):
//   Firefox  — no ServiceWorker support in private windows
//   Safari   — the Origin Private File System refuses to open in private windows
//   Chromium — incognito storage quota is capped far below a normal profile's

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r('timeout'), ms))]);

export async function detectPrivateMode() {
  try {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent || '';
    const isFirefox = /firefox|fxios/i.test(ua);
    const isChromium = !!window.chrome || /chrome|crios|edg/i.test(ua);
    const isSafari = !isChromium && !isFirefox && /safari/i.test(ua);

    if (isFirefox) return navigator.serviceWorker === undefined;

    if (isSafari) {
      if (navigator.storage?.getDirectory) {
        const r = await withTimeout(navigator.storage.getDirectory().then(() => false, (e) => /unknown transient reason/i.test(String(e?.message || e))), 2000);
        return r === 'timeout' ? null : r;
      }
      try { localStorage.setItem('__hh_pm', '1'); localStorage.removeItem('__hh_pm'); return false; } catch { return true; }
    }

    if (isChromium && navigator.storage?.estimate) {
      const est = await withTimeout(navigator.storage.estimate(), 2000);
      if (est === 'timeout' || !est?.quota) return null;
      const heapLimit = window.performance?.memory?.jsHeapSizeLimit || 1073741824;
      // Incognito quota is memory-based (roughly below the JS heap limit); a normal
      // profile gets a share of the disk. Below the heap limit = private. Kept
      // conservative so a normal profile on a nearly-full disk is not caught.
      return est.quota < heapLimit;
    }
  } catch { /* fall through */ }
  return null;
}
