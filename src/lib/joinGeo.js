// Fresh location for the /join gate. Unlike the site-wide tracker (which may
// reuse a cached reading), joining always asks the device now:
//   1. high accuracy, then a normal-accuracy retry (many laptops can't do GPS)
//   2. hard overall timeout — some phones never answer when the permission
//      prompt is dismissed, which used to leave "Enable location" spinning
// Resolves { ok: true, lat, lng, accuracy } or { ok: false, reason } where
// reason is 'denied' | 'timeout' | 'unavailable' | 'unsupported'.

const once = (opts, ms) => new Promise((resolve) => {
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  const t = setTimeout(() => finish({ ok: false, reason: 'timeout' }), ms);
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(t); finish({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
      (err) => { clearTimeout(t); finish({ ok: false, reason: err?.code === 1 ? 'denied' : err?.code === 3 ? 'timeout' : 'unavailable' }); },
      opts
    );
  } catch {
    clearTimeout(t);
    finish({ ok: false, reason: 'unavailable' });
  }
});

export async function captureFreshLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { ok: false, reason: 'unsupported' };
  // The first call may sit on the permission prompt, so it gets longer.
  const first = await once({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }, 45000);
  if (first.ok || first.reason === 'denied') return first;
  return once({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }, 20000);
}

export function locationHelp(reason) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ios = /iphone|ipad|ipod/i.test(ua);
  const android = /android/i.test(ua);
  if (reason === 'denied') {
    if (ios) return 'Location is blocked for this site. On iPhone: Settings → Privacy & Security → Location Services → turn it on, then Safari Websites → "While Using". Reload this page and tap Enable location again.';
    if (android) return 'Location is blocked for this site. Tap the icon left of the address bar → Permissions → Location → Allow, make sure your phone\'s Location is on, then try again.';
    return 'Location is blocked for this site. Click the icon left of the address bar → Location → Allow, then try again.';
  }
  if (reason === 'unsupported') return 'This browser can\'t share location. Open thehomies.app/join in Safari or Chrome.';
  return 'We couldn\'t get your location. Turn on Location / Location Services on your device, make sure you\'re not in a private window, and try again.';
}
