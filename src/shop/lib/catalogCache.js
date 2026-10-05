import { fetchShop } from '@/lib/merch';

// Stale-while-revalidate catalog: memory first, then sessionStorage (same tab
// session), so the shop renders products on the first frame and refreshes
// quietly behind it. A fetch younger than FRESH_MS is reused (prefetch → open).
const KEY = 'hh_shop_catalog_v1';
const MAX_AGE_MS = 30 * 60 * 1000;
const FRESH_MS = 60 * 1000;
let mem = null; // { at, data }
let inflight = null;

const ok = (d) => d && typeof d === 'object' && Array.isArray(d.products);

/** The last catalog we had (≤ 30 min old), or null. Synchronous. */
export function cachedCatalog() {
  if (mem && Date.now() - mem.at < MAX_AGE_MS) return mem.data;
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (raw && ok(raw.data) && Date.now() - raw.at < MAX_AGE_MS) { mem = raw; return raw.data; }
  } catch { /* private mode / bad json */ }
  return null;
}

/** Fetch the catalog (deduped). `force` skips the freshness window. */
export function loadCatalog({ force = false } = {}) {
  if (!force && mem && Date.now() - mem.at < FRESH_MS) return Promise.resolve(mem.data);
  if (inflight) return inflight;
  inflight = fetchShop()
    .then((data) => {
      if (ok(data)) {
        mem = { at: Date.now(), data };
        try { sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* quota */ }
      }
      return data;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function _resetCatalogCache() { mem = null; inflight = null; try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }
