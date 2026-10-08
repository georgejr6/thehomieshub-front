import api from '@/api/homieshub';
import { isStripeCheckoutUrl } from '@/lib/merch';

// Shop v2 API (homieshub-backend docs/MERCH_V2_SPEC.md). Everything here is
// feature-detected: until the backend ships /merch/blanks the Studio entry
// points stay hidden and listed products keep using the v1 endpoints.

// ── anonymous device id (lets guests save designs; claimed on sign-in) ─────────
const DEVICE_KEY = 'hh_merch_device';
// uuid v4 from the platform CSPRNG only (never Math.random — the device id owns designs).
function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!/^[0-9a-f-]{36}$/i.test(id || '')) { id = uuid(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return uuid(); }
}
const dev = () => ({ headers: { 'X-Merch-Device': deviceId() } });

// Signed-in: guest designs must be claimed into the account before any design /
// checkout call (else the server sees them as someone else's). ShopContext sets this.
let claimReady = Promise.resolve();
export function setClaimPromise(p) { claimReady = Promise.resolve(p).catch(() => {}); }
const claimed = () => claimReady;

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
// No garment photos in the fixture: blanks without a flat/ghost image use the silhouette.
const MOCK_THREADS = [
  ['#FFFFFF', 'White'], ['#000000', 'Black'], ['#96A1A8', 'Grey'], ['#A67843', 'Old Gold'], ['#FFCC00', 'Gold'],
  ['#E25C27', 'Orange'], ['#CC3366', 'Flamingo'], ['#CC3333', 'Red'], ['#660000', 'Maroon'], ['#333366', 'Navy'],
  ['#005397', 'Royal'], ['#3399FF', 'Aqua'], ['#6B5294', 'Purple'], ['#01784E', 'Kelly Green'], ['#7BA35A', 'Kiwi Green'],
].map(([hex, name]) => ({ hex, name }));
const mockVariants = (colors, sizes, base, start, bump = {}) => colors.flatMap((c, ci) => sizes.map((s, si) => ({ id: start + ci * 10 + si, color: c, size: s, priceCents: base + (bump[s] || 0) })));
const BIG = { '2XL': 200, '3XL': 400 };
export const MOCK_BLANKS = [
  {
    key: 'tee', productId: 71, name: 'Staple Tee', brand: 'Bella + Canvas', basePriceCents: 1900,
    colors: [
      { name: 'White', hex: '#f5f5f2', image: '' },
      { name: 'Black', hex: '#141414', image: '' },
      { name: 'Athletic Heather', hex: '#b9b9b6', image: '' },
      { name: 'Ash', hex: '#dedcd6', image: '' },
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    placements: [
      { key: 'front', label: 'Front', technique: 'DTG', kind: 'art', area: { width: 1800, height: 2400, dpi: 150 }, included: true, priceCents: 0 },
      { key: 'back', label: 'Back', technique: 'DTG', kind: 'art', area: { width: 1800, height: 2400, dpi: 150 }, included: false, priceCents: 900 },
      { key: 'sleeve_left', label: 'Left sleeve', technique: 'DTG', kind: 'art', area: { width: 600, height: 600, dpi: 150 }, included: false, priceCents: 400 },
      { key: 'sleeve_right', label: 'Right sleeve', technique: 'DTG', kind: 'art', area: { width: 600, height: 600, dpi: 150 }, included: false, priceCents: 400 },
    ],
    variants: mockVariants(['White', 'Black', 'Athletic Heather', 'Ash'], ['S', 'M', 'L', 'XL', '2XL', '3XL'], 1900, 4000, BIG),
  },
  {
    key: 'hoodie', productId: 380, name: 'Premium Hoodie', brand: 'Cotton Heritage', basePriceCents: 4200,
    colors: [
      { name: 'Black', hex: '#141414', image: '' },
      { name: 'Bone', hex: '#e8dfcc', image: '' },
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    placements: [
      { key: 'front', label: 'Front', technique: 'DTG', kind: 'art', area: { width: 1800, height: 1800, dpi: 150 }, included: true, priceCents: 0 },
      { key: 'back', label: 'Back', technique: 'DTG', kind: 'art', area: { width: 1800, height: 2400, dpi: 150 }, included: false, priceCents: 900 },
      { key: 'embroidery_chest_left', label: 'Left chest (embroidered)', technique: 'EMBROIDERY', kind: 'text', area: { width: 1200, height: 1200, dpi: 300 }, included: false, priceCents: 500 },
    ],
    variants: mockVariants(['Black', 'Bone'], ['S', 'M', 'L', 'XL', '2XL', '3XL'], 4200, 5000, BIG),
    threadColors: MOCK_THREADS,
  },
  {
    key: 'hat', productId: 206, name: 'Dad Hat', brand: 'Yupoong', basePriceCents: 2300,
    colors: [{ name: 'Black', hex: '#141414', image: '' }, { name: 'Navy', hex: '#1f2a44', image: '' }],
    sizes: ['One size'],
    placements: [
      { key: 'embroidery_front', label: 'Front (embroidered)', technique: 'EMBROIDERY', kind: 'text', area: { width: 1200, height: 525, dpi: 300 }, included: true, priceCents: 0 },
      { key: 'embroidery_back', label: 'Back (embroidered)', technique: 'EMBROIDERY', kind: 'text', area: { width: 600, height: 300, dpi: 300 }, included: false, priceCents: 500 },
    ],
    variants: [{ id: 6001, color: 'Black', size: 'One size', priceCents: 2300 }, { id: 6002, color: 'Navy', size: 'One size', priceCents: 2300 }],
    threadColors: MOCK_THREADS,
  },
];

// ── blanks (Studio catalog) ───────────────────────────────────────────────────
let blanksPromise = null;
/** Resolves to the blanks array, or null when the backend has no Studio yet. */
/** Curated Studio fonts (GET /merch/fonts). null until the backend has the route. */
let fontsPromise = null;
export function fetchFonts() {
  if (!fontsPromise) {
    fontsPromise = api.get('/merch/fonts')
      .then((r) => (Array.isArray(r.data?.fonts) ? r.data.fonts : Array.isArray(r.data) ? r.data : null))
      .catch((e) => { if (e?.response?.status !== 404) fontsPromise = null; return null; });
  }
  return fontsPromise;
}

export function fetchBlanks() {
  // Dev fixture: real blanks (read-only GET — garment templates, colours, prices), local designs.
  if (isMockStudio()) return api.get('/merch/blanks').then((r) => (r.data?.blanks?.length ? r.data.blanks : MOCK_BLANKS)).catch(() => MOCK_BLANKS);
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
/** purpose: 'art' (customer image, needs rightsAccepted) | 'printfile' (exact-size PNG) | 'preview'. */
export async function uploadImage(fileOrBlob, { onProgress, filename, purpose = 'art', rightsAccepted = false } = {}) {
  if (isMockStudio()) {
    const url = URL.createObjectURL(fileOrBlob);
    const img = await loadImage(url);
    return { url, width: img.naturalWidth, height: img.naturalHeight, mime: fileOrBlob.type, local: true };
  }
  await claimed();
  const form = new FormData();
  form.append('purpose', purpose);
  if (purpose === 'art' && rightsAccepted) form.append('rightsAccepted', '1');
  form.append('file', fileOrBlob, filename || fileOrBlob.name || 'upload.png');
  const { data } = await api.post('/merch/uploads', form, {
    ...dev(),
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return data;
}
/** Copy one of our catalog print files into the caller's art (no rights checkbox). */
export async function uploadHouseArt(url) {
  if (isMockStudio()) return { url };
  await claimed();
  const { data } = await api.post('/merch/uploads/house', { url }, dev());
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
  await claimed();
  const { data } = await api.post('/merch/designs', body, dev());
  return data?.design;
}
export async function updateDesign(id, body) {
  if (isMockStudio()) {
    const l = mockList().map((d) => (d.id === id ? { ...d, ...body, updatedAt: new Date().toISOString() } : d));
    mockWrite(l);
    return l.find((d) => d.id === id);
  }
  await claimed();
  const { data } = await api.patch(`/merch/designs/${encodeURIComponent(id)}`, body, dev());
  return data?.design;
}
export async function fetchDesign(id) {
  if (isMockStudio()) return mockList().find((d) => d.id === id) || null;
  await claimed();
  const { data } = await api.get(`/merch/designs/${encodeURIComponent(id)}`, dev());
  return data?.design || null;
}
/**
 * The exact checkout price of a saved design on a variant (server-side: base,
 * extra spots, and The Homies' listed price floor when it prints house art).
 * → { unitCents, baseCents, addons, houseArt:null|{names, listedCents} } or null.
 */
export async function fetchDesignQuote(designId, variantId) {
  if (!designId || !variantId || isMockStudio()) return null;
  await claimed();
  try {
    const { data } = await api.get(`/merch/designs/${encodeURIComponent(designId)}/quote`, { ...dev(), params: { variantId } });
    return Number.isInteger(data?.unitCents) ? data : null;
  } catch { return null; }
}

/** Bag copies ("… (in your bag)", library:false) never show in the library. */
export const isLibraryDesign = (d) => !!d && d.library !== false && !/\(in your bag\)$/.test(d.name || '');
const byNewest = (a, b) => (Date.parse(b.updatedAt || b.createdAt || 0) || 0) - (Date.parse(a.updatedAt || a.createdAt || 0) || 0);
/** The person's library (account, or this device for guests), newest first. */
export async function fetchMyDesigns() {
  if (isMockStudio()) return mockList().filter(isLibraryDesign).sort(byNewest);
  await claimed();
  const { data } = await api.get('/merch/designs/mine', { ...dev(), params: { library: 1, page: 1, limit: 60 } });
  return (data?.designs || []).filter(isLibraryDesign).sort(byNewest);
}
/**
 * A ready-to-edit design for a listed product (garment, colour, size, its art
 * placed). null when the backend doesn't have the route yet → the Studio
 * prefills client-side.
 */
export async function fetchDesignFromProduct(slug, { color, size } = {}) {
  if (isMockStudio()) return null;
  await claimed();
  try {
    const { data } = await api.get(`/merch/designs/from-product/${encodeURIComponent(slug)}`, { ...dev(), params: { color: color || undefined, size: size || undefined } });
    const d = data?.design || null;
    return d ? { ...d, size: d.size || data?.sizeHint || data?.size || size } : null;
  } catch (e) {
    const st = e?.response?.status;
    if (!st || st === 404 || st === 405 || st === 501) return null;
    throw e;
  }
}
export async function deleteDesign(id) {
  if (isMockStudio()) { mockWrite(mockList().filter((d) => d.id !== id)); return; }
  await claimed();
  await api.delete(`/merch/designs/${encodeURIComponent(id)}`, dev());
}
export async function claimDesigns() {
  if (isMockStudio()) return;
  await api.post('/merch/designs/claim', {}, dev()).catch(() => {});
}
export async function savePrintfiles(id, files) {
  if (isMockStudio()) return updateDesign(id, { printfiles: files });
  await claimed();
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
/** Discount terms + the signed-in buyer's points: { discountCents, bundleMinItems, pointsMaxPct, pointsMin, centsPerPoint, points|null }. */
export async function fetchOffers() {
  await claimed();
  const { data } = await api.get('/merch/offers', dev());
  return data;
}

/** points: how many Homies Points to spend (the server clamps it to 20% of the items and the balance). */
/** fromCart: true = started from the bag (the server takes the bought lines out of the saved bag), false = Buy now. */
export async function startCheckout(items, { points = 0, fromCart } = {}) {
  await claimed();
  const { data } = await api.post('/merch/checkout', {
    items,
    ...(points > 0 ? { usePoints: true, points: Math.floor(points) } : {}),
    ...(typeof fromCart === 'boolean' ? { fromCart } : {}),
  }, dev());
  if (!isStripeCheckoutUrl(data?.url)) throw new Error('no checkout url');
  window.location.href = data.url;
}
