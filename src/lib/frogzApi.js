import api from '@/api/homieshub';
import { normalizeVideo } from './digitvlApi';

// All requests go through the HomieshHub backend proxy (/api/frogz/*).
// The proxy validates the user's auth token + freakyfrogz tag before forwarding.
export const frogzApi = {
  getFeatured: () =>
    api.get('/frogz/featured').then(r => (r.data ? normalizeVideo(r.data) : null)),
  getTrending: () =>
    api.get('/frogz/trending').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  getNew: () =>
    api.get('/frogz/new').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
};
