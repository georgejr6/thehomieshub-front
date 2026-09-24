import { lazy } from 'react';

// React.lazy for route pages, safe across deploys. Each Vercel deploy ships
// new hashed chunk names; a tab opened before the deploy still asks for the
// old ones, which no longer exist (the SPA rewrite answers with index.html,
// so the import fails). When that happens, reload once to pick up the new
// build instead of white-screening. The session flag stops a reload loop if
// the chunk is genuinely unreachable (offline etc.) — then the error surfaces.
const KEY = 'hh_chunk_reload_at';

export default function lazyWithReload(factory) {
  return lazy(() => factory().then(
    (mod) => {
      try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
      return mod;
    },
    (err) => {
      let last = 0;
      try { last = Number(sessionStorage.getItem(KEY) || 0); } catch { /* ignore */ }
      if (Date.now() - last > 30000) {
        try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
        window.location.reload();
        return new Promise(() => {}); // keep the fallback up until the reload
      }
      throw err;
    },
  ));
}
