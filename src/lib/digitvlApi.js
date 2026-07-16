import axios from 'axios';

const BASE = import.meta.env.VITE_DIGITVL_API_URL || 'https://digitvlapp-backend-repo-production.up.railway.app/api';

const api = axios.create({ baseURL: BASE });

// Music is served by the Homies backend (which proxies the DigitVL catalog and
// serves compressed MP3 streams) — the SAME source the mobile app uses. The
// legacy node backend above is kept only for the video/content endpoints.
const MUSIC_BASE = import.meta.env.VITE_API_URL || 'https://backend.thehomies.app/api';
const musicHttp = axios.create({ baseURL: MUSIC_BASE });
const tracksOf = (r) => (r.data?.result?.tracks || []).map(normalizeTrack);

function fmt(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Normalize digitvl track → media item shape
export function normalizeTrack(t) {
  return {
    id: t.trackId || t.id,
    title: t.title || 'Untitled',
    artist: t.artist || 'Unknown Artist',
    cover: t.image || `https://picsum.photos/seed/${t.id}/400/400`,
    audioUrl: t.audioUrl || null,
    duration: fmt(t.duration),
    durationSecs: t.duration || 0,
    type: 'audio',
    genre: t.genre || '',
    tags: t.genre ? [t.genre] : [],
    explicit: t.explicit || false,
    album: t.album || '',
    producers: Array.isArray(t.producers) ? t.producers : [],
  };
}

// Normalize digitvl content (video) → media item shape
export function normalizeVideo(c) {
  return {
    id: c.id,
    title: c.title || 'Untitled',
    description: c.description || '',
    cover: c.thumbnailUrl || c.backdropUrl || `https://picsum.photos/seed/${c.id}/400/225`,
    backdropUrl: c.backdropUrl || c.thumbnailUrl || null,
    muxPlaybackId: c.muxPlaybackId || null,
    duration: fmt(c.duration),
    durationSecs: c.duration || 0,
    type: c.type || 'MOVIE',
    genres: c.genres || [],
    tags: c.genres || [],
    year: c.year || '',
    rating: c.rating || '',
    cast: c.cast || [],
    director: c.director || '',
    seasons: c.seasons || null,
    viewCount: c.viewCount || 0,
    isFeatured: c.isFeatured || false,
    mediaKind: 'video',
  };
}

export const musicApi = {
  getNew:          () => musicHttp.get('/music/trending').then(tracksOf),
  // Curated playlists (admin-managed). Each becomes a browsable row in Media Mode.
  // The trending playlist ("Fresh Drops") sorts first. This is how the FULL
  // library is surfaced — not just the trending subset.
  getCategories:   () => musicHttp.get('/music/categories').then(r =>
    (r.data?.result?.categories || []).map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      isTrending: !!c.isTrending,
      items: (c.tracks || []).map(normalizeTrack),
    })).filter(c => c.items.length > 0)
  ),
  // License listing for a track (null if not for sale). Powers the License button.
  getListing:      (trackId) => musicHttp.get(`/music/listing/${trackId}`).then(r => r.data?.result?.listing || null).catch(() => null),
  // Top 10 — ranked by real plays, human songs seeded first (see backend /music/top).
  getTop:          (limit = 10) => musicHttp.get('/music/top', { params: { limit } }).then(r => (r.data?.result?.tracks || []).map(normalizeTrack)).catch(() => []),
  getGenres:       () => musicHttp.get('/music/genres').then(r => r.data?.result?.genres || []),
  getArtistTracks: (slug) => musicHttp.get('/music/catalog', { params: { search: slug } }).then(tracksOf),
  search:          (q) => musicHttp.get('/music/catalog', { params: { search: q } }).then(tracksOf),
  // Newest uploads — catalog is returned newest-first (-created_at), so this is
  // the true "New Releases" list (a brand-new drop shows up at the top).
  getNewReleases:  (limit = 15) => musicHttp.get('/music/catalog', { params: { limit } }).then(tracksOf).catch(() => []),
};

export const videoApi = {
  getFeatured:  ()      => api.get('/content/featured').then(r => r.data ? normalizeVideo(r.data) : null),
  getTrending:  (type)  => api.get('/content/trending', { params: type ? { type } : {} }).then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  getNew:       (type)  => api.get('/content/new',      { params: { limit: 30, ...(type ? { type } : {}) } }).then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  getMovies:    ()      => api.get('/content/movies').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  getSeries:    ()      => api.get('/content/series').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  search:       (q)     => api.get('/content/search', { params: { q } }).then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  logView:      (id)    => api.post(`/content/${id}/view`, { progress: 0 }).catch(() => {}),
};
