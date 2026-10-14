import { useEffect, useState } from 'react';
import { musicApi } from '@/lib/digitvlApi';

// Spotify / Apple Music links for Homies songs that are also released there
// (backend GET /music/streaming-links). Fetched once per page load and shared.
const EMPTY = { artists: {}, tracks: {} };
let cache = null;
let pending = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = musicApi.getStreamingLinks()
      .then((d) => { cache = { artists: d?.artists || {}, tracks: d?.tracks || {} }; return cache; })
      .catch(() => { pending = null; return EMPTY; });
  }
  return pending;
}

export function useStreamingLinks() {
  const [data, setData] = useState(cache || EMPTY);
  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    load().then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, []);
  return data;
}

/** Links for one track id, or null when it's only on The Homies. */
export function useTrackStreamingLinks(trackId) {
  const { tracks } = useStreamingLinks();
  const links = trackId != null ? tracks[String(trackId)] : null;
  return links && (links.spotify || links.appleMusic) ? links : null;
}
