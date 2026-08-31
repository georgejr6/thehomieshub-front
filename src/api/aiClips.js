import api from '@/api/homieshub';

// Thin client helpers for the AI Clip pipeline (POST /api/ai/clip,
// GET /api/ai/clips, GET /api/ai/clips/:id) -- see
// homieshub-backend-git/routes/aiClips.js. Reuses the shared `api` axios
// instance (Bearer-token + baseURL already configured in src/api/homieshub.js).

// Response shape: { ok:true, clipJob:{...} } on success, or
// { ok:false, reason:'insufficient_balance', message } when the wallet debit
// fails. Both come back as normal 2xx/4xx JSON bodies per the shared plan, so
// callers should check `data.ok` rather than only relying on thrown errors --
// but we still let network/5xx errors throw so callers can show a generic
// "couldn't reach it" fallback.

export const createClipJob = async ({ inputUrl, config = {} }) => {
  const { data } = await api.post('/ai/clips', { inputUrl, config });
  return data;
};

export const listClipJobs = async () => {
  const { data } = await api.get('/ai/clips');
  return data;
};

export const getClipJob = async (id) => {
  const { data } = await api.get(`/ai/clips/${id}`);
  return data;
};
