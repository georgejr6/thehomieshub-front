import { useEffect, useState } from 'react';
import api from '@/api/homieshub';

// GIPHY via the backend proxy (60 req/min). Shared by the DM composer and /chat.
export async function fetchGifs(q, offset = 0) {
  const query = (q || '').trim();
  const { data } = await api.get(query ? '/messages/gifs/search' : '/messages/gifs/trending', {
    params: query ? { q: query, offset } : { offset },
  });
  const r = data?.result || {};
  return {
    enabled: r.enabled !== false,
    items: Array.isArray(r.items) ? r.items.filter((g) => g && g.id && (g.gif || g.mp4)) : [],
    nextOffset: typeof r.nextOffset === 'number' ? r.nextOffset : null,
  };
}

let enabledCache; // undefined = unknown
let enabledInflight = null;
let firstPage = null; // trending page from the enabled-check, reused by the picker

/** Take (once) the trending page fetched by the enabled-check, so opening the picker doesn't refetch it. */
export function takeFirstTrendingPage() {
  const p = firstPage;
  firstPage = null;
  return p;
}

/** Whether GIFs are switched on server-side. Only definite answers are cached. */
export function useGifsEnabled(active = true) {
  const [on, setOn] = useState(enabledCache ?? false);
  useEffect(() => {
    if (!active) return undefined;
    if (enabledCache !== undefined) { setOn(enabledCache); return undefined; }
    let alive = true;
    enabledInflight ||= fetchGifs('', 0)
      .then((p) => { firstPage = p; return p.enabled; })
      .catch(() => null);
    enabledInflight.then((v) => {
      enabledInflight = null;
      if (v !== null) enabledCache = v;
      if (alive) setOn(!!v);
    });
    return () => { alive = false; };
  }, [active]);
  return on;
}

/** The DM attachment for a picked GIF (mp4 preferred, .gif fallback). */
export function gifToAttachment(g) {
  const url = g.mp4 || g.gif;
  if (!url) return null;
  return { url, kind: 'gif', mime: g.mp4 ? 'video/mp4' : 'image/gif', size: 0, name: 'gif', width: g.width, height: g.height };
}
