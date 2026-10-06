// Desktop notifications for Homies Chat (the browser's own Notification API).
// They pop while a /chat tab is open — even minimized or behind other
// windows — but not once that tab or the browser is closed (that needs Web
// Push with a service worker; not built yet). Preferences are per browser.

const KEY = 'hh_desktop_notifs';
const DEFAULTS = { enabled: false, mentions: true, dms: true };

export const desktopSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const desktopPermission = () => (desktopSupported() ? Notification.permission : 'unsupported');

export function getDesktopPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
export function setDesktopPrefs(patch) {
  const next = { ...getDesktopPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('hh:desktop-prefs', { detail: next }));
  return next;
}

// Ask the browser (must come from a click). Resolves to the permission.
export async function enableDesktopNotifications() {
  if (!desktopSupported()) return 'unsupported';
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  setDesktopPrefs({ enabled: perm === 'granted' });
  return perm;
}

// Show one if enabled, allowed, and you're not already looking at the chat.
// kind: 'mentions' | 'dms'. onClick runs after the tab is focused.
export function desktopNotify(kind, { title, body, icon, tag, onClick, force = false }) {
  if (!desktopSupported() || Notification.permission !== 'granted') return null;
  const prefs = getDesktopPrefs();
  if (!force && (!prefs.enabled || !prefs[kind])) return null;
  if (!force && document.visibilityState === 'visible' && document.hasFocus()) return null;
  try {
    // Same tag across tabs → the browser shows one notification, not one per tab.
    const n = new Notification(title, { body: String(body || '').slice(0, 180), icon: icon || '/favicon.ico', tag });
    n.onclick = () => { window.homiesDesktop?.focus?.(); window.focus(); n.close(); onClick?.(); }; // desktop app: un-hide from tray
    return n;
  } catch {
    return null; // some mobile browsers only allow notifications from a service worker
  }
}
