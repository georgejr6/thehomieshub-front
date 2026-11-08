// Homies Ask (ask.thehomies.app) sends new people through the same /join gate as everyone
// else; this remembers where to send them once they're admitted. Only ever an
// /ask-login?state=<32 hex> path (never a full URL). Expires after 14 minutes, counted from
// the FIRST time this state was saved: Ask's own sign-in state cookie lives 15 minutes.
const KEY = 'hh_ask_return';
const TTL_MS = 14 * 60 * 1000;
const PATH_RE = /^\/ask-login\?state=[a-f0-9]{32}$/;

export function setAskReturn(path) {
  if (!PATH_RE.test(path)) return;
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) || 'null');
    const at = cur && cur.path === path && typeof cur.at === 'number' ? cur.at : Date.now();
    localStorage.setItem(KEY, JSON.stringify({ path, at }));
    // An older "after login, go to X" from another screen must not pull them away from the gate.
    localStorage.removeItem('post_auth_redirect');
    localStorage.removeItem('post_auth_redirect_ts');
  } catch { /* private mode */ }
}

export function getAskReturn() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && PATH_RE.test(v.path) && Date.now() - v.at < TTL_MS) return v.path;
    if (v) localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  return null;
}

export function clearAskReturn() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Read and clear in one go (used when /join sends them on).
export function takeAskReturn() {
  const p = getAskReturn();
  clearAskReturn();
  return p;
}
