import { useEffect, useState } from 'react';
import { listLiveNowFeed } from '@/lib/spaces';

// Public /spaces/live-now, shape { live, replays } (older servers sent only { live }).
// Polls every 30 s while the tab is visible; keeps the last data on a blip.
export function useLiveSpacesFeed(intervalMs = 30000, enabled = true) {
  const [feed, setFeed] = useState({ live: [], replays: [] });
  useEffect(() => {
    if (!enabled) return undefined;
    let stop = false;
    const load = () => listLiveNowFeed().then((f) => { if (!stop) setFeed(f); }).catch(() => { /* keep the last list */ });
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, intervalMs);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [intervalMs, enabled]);
  return feed;
}

// Compatible form: just the Spaces live right now (array).
export default function useLiveSpacesNow(intervalMs = 30000) {
  return useLiveSpacesFeed(intervalMs).live;
}
