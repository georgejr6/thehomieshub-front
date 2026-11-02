import { useCallback, useEffect, useState } from 'react';
import { listSpaces, spacesError } from '@/lib/spaces';

// GET /api/spaces, optionally polled (the chat sidebar pill uses 60 s).
export default function useLiveSpaces({ enabled = true, intervalMs = 0 } = {}) {
  const [data, setData] = useState({ live: [], scheduled: [], canHost: false });
  const [status, setStatus] = useState('loading'); // loading | ready | off | error
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const r = await listSpaces();
      setData({ live: r?.live || [], scheduled: r?.scheduled || [], canHost: !!r?.canHost });
      setStatus('ready');
      setError(null);
    } catch (err) {
      const e = spacesError(err);
      setStatus(e.kind === 'off' ? 'off' : 'error');
      setError(e);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let stop = false;
    refresh();
    if (!intervalMs) return undefined;
    const t = setInterval(() => { if (!stop && !document.hidden) refresh(); }, intervalMs);
    return () => { stop = true; clearInterval(t); };
  }, [enabled, intervalMs, refresh]);

  return { ...data, status, error, refresh };
}
