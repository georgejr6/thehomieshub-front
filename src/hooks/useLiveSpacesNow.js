import { useEffect, useState } from 'react';
import { listLiveNow } from '@/lib/spaces';

// Spaces live right now, from the public endpoint (works signed out). Polls every
// 30 s while the tab is visible; stays [] when Spaces are off or the call fails.
export default function useLiveSpacesNow(intervalMs = 30000) {
  const [live, setLive] = useState([]);
  useEffect(() => {
    let stop = false;
    const load = () => listLiveNow().then((l) => { if (!stop) setLive(l); }).catch(() => { /* keep the last list on a blip */ });
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, intervalMs);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [intervalMs]);
  return live;
}
