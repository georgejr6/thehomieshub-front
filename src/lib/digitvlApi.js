import axios from 'axios';

const BASE = import.meta.env.VITE_DIGITVL_API_URL || 'https://digitvlapp-backend-repo-production.up.railway.app/api';

const api = axios.create({ baseURL: BASE });

function fmt(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Normalize digitvl track → HomieshHub media item shape
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

export const musicApi = {
  getNew:          () => api.get('/music/new').then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).map(normalizeTrack)),
  getGenres:       () => api.get('/music/genres').then(r => r.data),
  getArtistTracks: (slug) => api.get(`/music/artist/${slug}`).then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).map(normalizeTrack)),
  search:          (q) => api.get('/music/search', { params: { q } }).then(r => (Array.isArray(r.data) ? r.data : r.data.results || []).map(normalizeTrack)),
};
