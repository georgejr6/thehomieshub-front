import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchGifs, takeFirstTrendingPage } from '@/lib/gifs';

const THEMES = {
  default: {
    input: 'bg-muted/50 text-foreground placeholder:text-muted-foreground border border-border',
    tile: 'bg-muted',
    text: 'text-muted-foreground',
  },
  chat: {
    input: 'bg-[#1E1F22] text-[#DBDEE1] placeholder:text-[#6D6F78] border border-transparent',
    tile: 'bg-[#1E1F22]',
    text: 'text-[#949BA4]',
  },
};

// GIF search body (GIPHY via the backend): trending by default, debounced
// search, infinite scroll on nextOffset. The parent decides what a pick becomes.
export function GifPanel({ onPick, onClose, theme = 'default', className }) {
  const t = THEMES[theme] || THEMES.default;
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const inputRef = useRef(null);
  const sentinel = useRef(null);
  const busyMore = useRef(false);

  const load = useCallback(async (query) => {
    const my = ++seq.current;
    busyMore.current = false;
    setFailed(false);
    const cached = !query.trim() ? takeFirstTrendingPage() : null;
    if (cached) { setItems(cached.items); setNext(cached.nextOffset); setLoading(false); return; }
    setLoading(true);
    try {
      const page = await fetchGifs(query, 0);
      if (my !== seq.current) return;
      setItems(page.items);
      setNext(page.nextOffset);
    } catch {
      if (my !== seq.current) return;
      setItems([]); setNext(null); setFailed(true);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(q), q.trim() ? 350 : 0);
    return () => clearTimeout(id);
  }, [q, load]);

  useEffect(() => {
    if (window.matchMedia?.('(hover: hover)').matches) inputRef.current?.focus();
  }, []);

  const loadMore = useCallback(async () => {
    if (next == null || loading || busyMore.current) return;
    busyMore.current = true;
    const my = seq.current;
    try {
      const page = await fetchGifs(q, next);
      if (my !== seq.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((g) => g.id));
        return [...prev, ...page.items.filter((g) => !seen.has(g.id))];
      });
      setNext(page.nextOffset);
    } catch {
      if (my === seq.current) setNext(null);
    } finally {
      busyMore.current = false;
    }
  }, [next, loading, q]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || next == null || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, items.length, loadMore]);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="mb-2 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className={cn('pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2', t.text)} aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search GIFs"
            aria-label="Search GIFs"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="search"
            className={cn('h-10 w-full rounded-md pl-8 pr-3 text-base outline-none focus:ring-2 focus:ring-primary/50 sm:text-sm', t.input)}
          />
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close GIF picker" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white/10', t.text)}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className={cn('mb-1 text-xs font-semibold uppercase tracking-wide', t.text)}>{q.trim() ? 'Results' : 'Trending'}</p>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto overscroll-contain">
        {items.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-label={g.title ? `Send GIF: ${g.title}` : 'Send GIF'}
            className={cn('h-24 overflow-hidden rounded-lg transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', t.tile)}
            onClick={() => onPick(g)}
          >
            <img src={g.preview || g.gif} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
        {next != null && items.length > 0 && <div ref={sentinel} className="col-span-2 h-2" />}
      </div>
      {loading && <p className={cn('mt-2 text-xs', t.text)}>Loading...</p>}
      {!loading && !items.length && (
        <p className={cn('mt-2 text-xs', t.text)}>{failed ? "Couldn't load GIFs. Check your connection." : q.trim() ? 'No GIFs found.' : ''}</p>
      )}
      <p className={cn('mt-2 text-right text-[10px]', t.text)}>Powered by GIPHY</p>
    </div>
  );
}

export default GifPanel;
