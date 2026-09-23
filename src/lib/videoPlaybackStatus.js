// Blunt, site-wide video-playback circuit breaker. Fully public endpoint
// (no auth) since anonymous visitors need this too. Doesn't touch Mux, the
// database's visibility fields, or the content-lockdown system — it's just
// "don't render the video player," checked once and cached for the tab's
// lifetime. Toggled via the admin panel (MediaAdminPanel.jsx).
import { useState, useEffect } from 'react';
import api from '@/api/homieshub';

let cached = null; // boolean | null (not loaded yet)
let inflight = null;

async function fetchStatus() {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = api.get('/settings/video-playback')
      .then(({ data }) => { cached = !!data?.result?.disabled; return cached; })
      .catch(() => { cached = false; return cached; }); // fail open — a status-check outage shouldn't blank the app
  }
  return inflight;
}

// Hook: returns `true` once we know playback is disabled, `false` once we
// know it's enabled (or the check failed), `null` while still loading.
// Defaults to not-yet-known so callers can choose to wait rather than flash
// content before the check resolves.
export function useVideoPlaybackDisabled() {
  const [disabled, setDisabled] = useState(cached);
  useEffect(() => {
    let alive = true;
    fetchStatus().then((v) => { if (alive) setDisabled(v); });
    return () => { alive = false; };
  }, []);
  return disabled;
}
