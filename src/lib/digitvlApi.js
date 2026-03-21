import axios from 'axios';

const BASE = import.meta.env.VITE_DIGITVL_API_URL || 'https://digitvlapp-backend-repo-production.up.railway.app/api';

const api = axios.create({ baseURL: BASE });

function fmt(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Normalize digitvl track → media item shape
export function normalizeTrack(t) {
  return {
    id: t.id,
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
  getNew:          () => api.get('/music/new').then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).map(normalizeTrack)),
  getGenres:       () => api.get('/music/genres').then(r => r.data),
  getArtistTracks: (slug) => api.get(`/music/artist/${slug}`).then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).map(normalizeTrack)),
  search:          (q) => api.get('/music/search', { params: { q } }).then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).map(normalizeTrack)),
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
