import { useEffect, useState } from 'react';
import { fetchDesignQuote } from '@/shop/lib/api';

/**
 * Server price for a saved design on a variant, refreshed (debounced) whenever
 * the design id, variant or `version` (e.g. a save) changes. null while unknown
 * → callers show their client estimate.
 */
export default function useDesignQuote(designId, variantId, version = '', delay = 500) {
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!designId || !variantId) { setQuote(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      fetchDesignQuote(designId, variantId).then((q) => { if (alive) setQuote(q); });
    }, delay);
    return () => { alive = false; clearTimeout(t); };
  }, [designId, variantId, version, delay]);
  return quote;
}
