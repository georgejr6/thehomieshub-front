import { useEffect, useRef, useState } from 'react';

// Signed-out preview for live streams and replays (owner 2026-11-04: "they can
// watch for 2 mins then gotta sign in", same as Spaces). The playback IDs are
// public Mux IDs, so this is a UI limit: time watched is kept per broadcast in
// localStorage (`ls:<streamId>`, shared by /live, /live-stream and /vod) so a
// refresh doesn't reset it.
export const GUEST_PREVIEW_SEC = 120;
const KEY = 'homies_guest_watch_v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}
const readOne = (id) => (id ? Number(readAll()[id]) || 0 : 0);
function writeOne(id, sec) {
  try {
    const all = readAll();
    delete all[id]; // re-insert so the newest stays at the end
    all[id] = Math.max(sec, Number(all[id]) || 0);
    const keys = Object.keys(all);
    if (keys.length > 200) keys.slice(0, keys.length - 200).forEach((k) => delete all[k]);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* private mode: the limit still holds for this page view */ }
}

/**
 * @param {string|null} id     broadcast key; null = nothing to meter
 * @param {boolean} guest      viewer is signed out
 * @param {boolean} counting   video is on screen (not loading / reconnecting)
 * @returns {{ walled: boolean, left: number|null }} left = seconds left for a guest, null when signed in
 */
export function useGuestPreview(id, guest, counting) {
  // Keyed by id and read synchronously, so a walled guest never sees the player flash on refresh
  // and switching broadcasts never shows the previous one's count.
  const [st, setSt] = useState(() => ({ id, used: readOne(id) }));
  const used = st.id === id ? st.used : readOne(id);
  if (st.id !== id) setSt({ id, used });
  const usedRef = useRef(used);
  usedRef.current = used;

  const walled = !!(guest && id && used >= GUEST_PREVIEW_SEC);
  useEffect(() => {
    if (!guest || !id || !counting || walled) return undefined;
    let n = 0;
    let last = null; // this effect's own id only (usedRef may already belong to the next id at cleanup)
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const next = usedRef.current + 1;
      usedRef.current = next;
      last = next;
      setSt({ id, used: next });
      if (++n % 5 === 0 || next >= GUEST_PREVIEW_SEC) writeOne(id, next);
    }, 1000);
    return () => { clearInterval(t); if (last != null) writeOne(id, last); };
  }, [guest, id, counting, walled]);
  return { walled, left: guest && id ? Math.max(0, GUEST_PREVIEW_SEC - used) : null };
}
