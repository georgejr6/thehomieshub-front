// Homies Ask (ask.thehomies.app) sends new people through the same /join gate as everyone
// else; this remembers where to send them once they're admitted. Only ever an
// /ask-login?state=<32 hex> path (never a full URL), expires after 30 minutes.
const KEY = 'hh_ask_return';
const TTL_MS = 30 * 60 * 1000;
const PATH_RE = /^\/ask-login\?state=[a-f0-9]{32}$/;

export function setAskReturn(path) {
  if (!PATH_RE.test(path)) return;
  try { localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() })); } catch { /* private mode */ }
}

export function getAskReturn() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && PATH_RE.test(v.path) && Date.now() - v.at < TTL_MS) return v.path;
  } catch { /* ignore */ }
  return null;
}

export function clearAskReturn() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
