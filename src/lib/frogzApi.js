import api from '@/api/homieshub';
import { normalizeVideo } from './digitvlApi';

function fmt(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function normalizeClip(c) {
  return {
    id: c.id,
    title: c.content?.title || 'Untitled',
    description: c.content?.description || '',
    cover: c.content?.thumbnailUrl || `https://picsum.photos/seed/${c.id}/400/225`,
    backdropUrl: c.content?.thumbnailUrl || null,
    muxPlaybackId: c.muxPlaybackId || null,
    duration: fmt(c.endTime && c.startTime ? c.endTime - c.startTime : 0),
    durationSecs: c.endTime && c.startTime ? c.endTime - c.startTime : 0,
    type: 'CLIP',
    genres: [],
    tags: [],
    mediaKind: 'video',
    isClip: true,
  };
}

export const frogzApi = {
  // Public shorts — no auth needed (proxy strips the requirement)
  getClips: () =>
    api.get('/frogz/clips').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeClip)),

  // Full gated content — requires freakyfrogz tag
  getFeatured: () =>
    api.get('/frogz/featured').then(r => (r.data ? normalizeVideo(r.data) : null)),
  getTrending: () =>
    api.get('/frogz/trending').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),
  getNew: () =>
    api.get('/frogz/new').then(r => (Array.isArray(r.data) ? r.data : []).map(normalizeVideo)),

  // Submit a CashApp access request — returns { code, amount, label, cashappTag }
  requestAccess: (plan = 'MONTHLY') =>
    api.post('/frogz/request-access', { plan }).then(r => r.data?.result || r.data),
};

export const FROGZ_PLANS = [
  { key: 'DAILY',      label: '1 Day',    amount: 5   },
  { key: 'WEEKLY',     label: '1 Week',   amount: 15  },
  { key: 'MONTHLY',    label: '1 Month',  amount: 25  },
  { key: 'SIX_MONTHS', label: '6 Months', amount: 120 },
  { key: 'YEARLY',     label: '1 Year',   amount: 200 },
];
