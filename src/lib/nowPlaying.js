// Now-playing pill in /chat (components/chat/NowPlayingPill.jsx). The chat
// renders outside the layouts that mount <MusicPlayer/>, so music keeps
// playing (MediaContext owns the <audio>) with no controls — this is them.

const DISMISS_KEY = 'hh_chat_np_dismissed';

/** Track id as a string ('' when there is none). */
export const trackKey = (track) => (track?.id != null ? String(track.id) : track?._id != null ? String(track._id) : '');

/**
 * Show the pill only for a track that was actually loaded into the player
 * (the catalog pre-selects a first track without loading it), while no video
 * has taken over, and unless the user dismissed this same track.
 */
export function shouldShowPill({ track, hasEnteredMediaMode, hasSource, currentVideo, dismissedId }) {
  if (!track || !hasEnteredMediaMode || !hasSource || currentVideo) return false;
  const id = trackKey(track);
  return !(dismissedId && id && dismissedId === id);
}

/** "Title · Artist" (just the title when there's no artist). */
export function pillLabel(track) {
  const title = String(track?.title || track?.name || 'Now playing').trim();
  const artist = String(track?.artist || track?.artistName || '').trim();
  return artist ? `${title} · ${artist}` : title;
}

/** Where tapping the title goes: the song page (keeps playing — SongPage won't restart the current track). */
export function songPath(track) {
  const id = trackKey(track);
  return id ? `/song/${encodeURIComponent(id)}` : null;
}

// Dismissal lasts for this browser session (tab), and only for that track.
export function readDismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) || ''; } catch { return ''; }
}
export function saveDismissed(id) {
  try {
    if (id) sessionStorage.setItem(DISMISS_KEY, id);
    else sessionStorage.removeItem(DISMISS_KEY);
  } catch { /* private mode */ }
}
