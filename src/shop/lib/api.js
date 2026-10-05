import api from '@/api/homieshub';
import { isStripeCheckoutUrl } from '@/lib/merch';

// Shop v2 API (homieshub-backend docs/MERCH_V2_SPEC.md). Everything here is
// feature-detected: until the backend ships /merch/blanks the Studio entry
// points stay hidden and listed products keep using the v1 endpoints.

// ── anonymous device id (lets guests save designs; claimed on sign-in) ─────────
const DEVICE_KEY = 'hh_merch_device';
const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!/^[0-9a-f-]{36}$/i.test(id || '')) { id = uuid(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return uuid(); }
}
const dev = () => ({ headers: { 'X-Merch-Device': deviceId() } });

export const apiError = (err, fallback = 'Something went wrong. Try again.') =>
  err?.response?.data?.error || err?.response?.data?.message || fallback;

// ── dev-only fixture so the Studio can be designed before the backend lands ──
const isMockStudio = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).has('mockStudio')) sessionStorage.setItem('hh_mock_studio', '1');
    return sessionStorage.getItem('hh_mock_studio') === '1';
  } catch { return false; }
};
const IMG = 'https://files.cdn.printful.com/products';
export const MOCK_BLANKS = [
  {
    key: 'tee', productId: 71, name: 'Staple Tee', basePriceCents: 3300,
    colors: [
      { name: 'White', hex: '#f5f5f2', image: `${IMG}/71/4011_1752236284.jpg` },
      { name: 'Black', hex: '#141414', image: `${IMG}/71/4016_1752236278.jpg` },
      { name: 'Athletic Heather', hex: '#b9b9b6', image: `${IMG}/71/6948_1752236278.jpg` },
      { name: 'Ash', hex: '#dedcd6', image: `${IMG}/71/4026_1752236278.jpg` },
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    placements: [
      { key: 'front', label: 'Front', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 0 },
      { key: 'back', label: 'Back', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 900 },
      { key: 'sleeve_left', label: 'Left sleeve', technique: 'dtg', area: { width: 600, height: 600, dpi: 150 }, priceCents: 900 },
      { key: 'sleeve_right', label: 'Right sleeve', technique: 'dtg', area: { width: 600, height: 600, dpi: 150 }, priceCents: 900 },
    ],
    variants: ['White', 'Black', 'Athletic Heather', 'Ash'].flatMap((c, ci) => ['S', 'M', 'L', 'XL', '2XL', '3XL'].map((s, si) => ({ id: 4000 + ci * 10 + si, color: c, size: s, priceCents: 3300 }))),
  },
  {
    key: 'hoodie', productId: 380, name: 'Premium Hoodie', basePriceCents: 6300,
    colors: [
      { name: 'Black', hex: '#141414', image: `${IMG}/380/10779_1788773849.jpg` },
      { name: 'Bone', hex: '#e8dfcc', image: `${IMG}/380/20284_1788773849.jpg` },
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    placements: [
      { key: 'front', label: 'Front', technique: 'dtg', area: { width: 1800, height: 1800, dpi: 150 }, priceCents: 0 },
      { key: 'back', label: 'Back', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 900 },
      { key: 'embroidery_chest_left', label: 'Left chest (embroidered)', technique: 'embroidery', area: { width: 1200, height: 1200, dpi: 300 }, priceCents: 1200 },
    ],
    variants: ['Black', 'Bone'].flatMap((c, ci) => ['S', 'M', 'L', 'XL', '2XL', '3XL'].map((s, si) => ({ id: 5000 + ci * 10 + si, color: c, size: s, priceCents: 6300 }))),
  },
  {
    key: 'hat', productId: 206, name: 'Dad Hat', basePriceCents: 3700,
    colors: [{ name: 'Black', hex: '#141414', image: `${IMG}/206/7854_1584455281.jpg` }, { name: 'Navy', hex: '#1f2a44', image: `${IMG}/206/7857_1584455384.jpg` }],
    sizes: ['One size'],
    placements: [{ key: 'embroidery_front', label: 'Front (embroidered)', technique: 'embroidery', area: { width: 1200, height: 525, dpi: 300 }, priceCents: 0 }],
    variants: [{ id: 6001, color: 'Black', size: 'One size', priceCents: 3700 }, { id: 6002, color: 'Navy', size: 'One size', priceCents: 3700 }],
  },
];

// ── blanks (Studio catalog) ───────────────────────────────────────────────────
let blanksPromise = null;
/** Resolves to the blanks array, or null when the backend has no Studio yet. */
export function fetchBlanks() {
  if (isMockStudio()) return Promise.resolve(MOCK_BLANKS);
  if (!blanksPromise) {
    blanksPromise = api.get('/merch/blanks')
      .then((r) => (Array.isArray(r.data?.blanks) && r.data.blanks.length ? r.data.blanks : null))
      .catch((e) => { if (e?.response?.status !== 404) blanksPromise = null; return null; });
  }
  return blanksPromise;
}

// ── uploads ───────────────────────────────────────────────────────────────────
export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export function validateUpload(file) {
  if (!file) return 'Pick an image.';
  if (!UPLOAD_TYPES.includes(file.type)) return 'Use a PNG, JPG or WEBP image.';
  if (file.size > UPLOAD_MAX_BYTES) return 'That image is over 25 MB.';
  return null;
}
export async function uploadImage(fileOrBlob, { onProgress, filename } = {}) {
  if (isMockStudio()) {
    const url = URL.createObjectURL(fileOrBlob);
    const img = await loadImage(url);
    return { url, width: img.naturalWidth, height: img.naturalHeight, mime: fileOrBlob.type, local: true };
  }
  const form = new FormData();
  form.append('file', fileOrBlob, filename || fileOrBlob.name || 'upload.png');
  const { data } = await api.post('/merch/uploads', form, {
    ...dev(),
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return data;
}
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── designs ───────────────────────────────────────────────────────────────────
const MOCK_DESIGNS = 'hh_merch_mock_designs';
const mockList = () => { try { return JSON.parse(localStorage.getItem(MOCK_DESIGNS) || '[]'); } catch { return []; } };
const mockWrite = (l) => { try { localStorage.setItem(MOCK_DESIGNS, JSON.stringify(l)); } catch { /* ignore */ } };

export async function createDesign(body) {
  if (isMockStudio()) {
    const d = { ...body, id: `mock${Date.now().toString(36)}`, updatedAt: new Date().toISOString() };
    mockWrite([d, ...mockList()]);
    return d;
  }
  const { data } = await api.post('/merch/designs', body, dev());
  return data?.design;
}
export async function updateDesign(id, body) {
  if (isMockStudio()) {
    const l = mockList().map((d) => (d.id === id ? { ...d, ...body, updatedAt: new Date().toISOString() } : d));
    mockWrite(l);
    return l.find((d) => d.id === id);
  }
  const { data } = await api.patch(`/merch/designs/${encodeURIComponent(id)}`, body, dev());
  return data?.design;
}
export async function fetchDesign(id) {
  if (isMockStudio()) return mockList().find((d) => d.id === id) || null;
  const { data } = await api.get(`/merch/designs/${encodeURIComponent(id)}`, dev());
  return data?.design || null;
}
export async function fetchMyDesigns() {
  if (isMockStudio()) return mockList();
  const { data } = await api.get('/merch/designs/mine', dev());
  return data?.designs || [];
}
export async function deleteDesign(id) {
  if (isMockStudio()) { mockWrite(mockList().filter((d) => d.id !== id)); return; }
  await api.delete(`/merch/designs/${encodeURIComponent(id)}`, dev());
}
export async function claimDesigns() {
  if (isMockStudio()) return;
  await api.post('/merch/designs/claim', {}, dev()).catch(() => {});
}
export async function savePrintfiles(id, files) {
  if (isMockStudio()) return updateDesign(id, { printfiles: files });
  const { data } = await api.post(`/merch/designs/${encodeURIComponent(id)}/printfiles`, { files }, dev());
  return data?.design;
}

// ── real mockups (Printful mockup generator) ─────────────────────────────────
export async function requestMockup({ productId, variantId, files }) {
  const { data } = await api.post('/merch/mockups', { productId, variantId, files }, dev());
  return data?.taskKey;
}
export async function pollMockup(taskKey, { tries = 20, wait = 2500, signal } = {}) {
  for (let i = 0; i < tries; i++) {
    if (signal?.aborted) return null;
    const { data } = await api.get(`/merch/mockups/${encodeURIComponent(taskKey)}`, dev());
    if (data?.status === 'completed') return data.mockups || [];
    if (data?.status === 'failed') throw new Error(data.error || 'Mockup failed');
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error('Mockup is taking too long. Try again in a minute.');
}

// ── server cart (signed-in, cross-device + abandoned-cart reminder) ──────────
export async function fetchServerCart() {
  try { const { data } = await api.get('/merch/cart'); return Array.isArray(data?.items) ? data.items : null; } catch { return null; }
}
export async function pushServerCart(items) {
  try { await api.put('/merch/cart', { items }); return true; } catch { return false; }
}

// ── checkout ──────────────────────────────────────────────────────────────────
export async function startCheckout(items) {
  const { data } = await api.post('/merch/checkout', { items });
  if (!isStripeCheckoutUrl(data?.url)) throw new Error('no checkout url');
  window.location.href = data.url;
}
