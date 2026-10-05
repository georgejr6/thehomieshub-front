import { useSyncExternalStore } from 'react';

// Shop v2 cart (localStorage `hh_merch_cart_v2`, shared across tabs). Lines are
// either listed products (+ optional add-ons) or customer designs from the
// Studio. Only ids/choices + a display snapshot are stored — checkout re-prices
// everything server-side. Pure reducer functions are exported for tests.

export const MAX_LINES = 10;
export const MAX_QTY = 10;
const KEY = 'hh_merch_cart_v2';
const LEGACY_KEY = 'hh_merch_cart_v1';
const SAVED_KEY = 'hh_merch_saved_v1';

const httpsImg = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');
const str = (v, n) => String(v ?? '').slice(0, n);

function cleanAddon(a) {
  if (!a || typeof a !== 'object') return null;
  const key = str(a.key, 40);
  if (!/^[a-z0-9_]{1,40}$/i.test(key)) return null;
  return {
    key,
    label: str(a.label || key, 60),
    text: a.text != null ? str(a.text, 60) : undefined,
    font: a.font ? str(a.font, 40) : undefined,
    color: a.color ? str(a.color, 20) : undefined,
    designId: a.designId ? str(a.designId, 40) : undefined,
    priceCents: Number.isInteger(a.priceCents) && a.priceCents >= 0 ? a.priceCents : 0,
  };
}

/** Identity of a line: same product + same customisation = same line. */
export function lineKey(l) {
  if (l.kind === 'custom') return `c:${l.designId}:${l.variantId}`;
  const addons = (l.addons || []).map((a) => `${a.key}=${a.text || ''}|${a.font || ''}|${a.color || ''}|${a.designId || ''}`).sort().join(',');
  return `l:${l.variantId}:${addons}`;
}

export function cleanLine(l) {
  if (!l || typeof l !== 'object') return null;
  const variantId = Number(l.variantId);
  const q = Math.floor(Number(l.quantity));
  if (!Number.isSafeInteger(variantId) || variantId <= 0 || !Number.isFinite(q) || q < 1) return null;
  const kind = l.kind === 'custom' ? 'custom' : 'listed';
  if (kind === 'custom' && !/^[A-Za-z0-9_-]{6,40}$/.test(String(l.designId || ''))) return null;
  const line = {
    kind,
    variantId,
    quantity: Math.min(MAX_QTY, q),
    designId: kind === 'custom' ? String(l.designId) : undefined,
    addons: kind === 'listed' ? (Array.isArray(l.addons) ? l.addons.map(cleanAddon).filter(Boolean).slice(0, 6) : []) : [],
    name: str(l.name, 120),
    variant: str(l.variant, 60),
    image: httpsImg(l.image),
    slug: str(l.slug, 80),
    priceCents: Number.isInteger(l.priceCents) && l.priceCents >= 0 ? l.priceCents : 0,
  };
  line.key = lineKey(line);
  return line;
}

export function sanitizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  const merged = new Map();
  for (const r of raw) {
    const l = cleanLine(r);
    if (!l) continue;
    const prev = merged.get(l.key);
    merged.set(l.key, prev ? { ...prev, quantity: Math.min(MAX_QTY, prev.quantity + l.quantity) } : l);
  }
  return [...merged.values()].slice(0, MAX_LINES);
}

/** v1 lines ({variantId, quantity, name...}) become listed lines without add-ons. */
export const migrateV1 = (raw) => sanitizeCart((Array.isArray(raw) ? raw : []).map((l) => ({ ...l, kind: 'listed', addons: [] })));

export function addLine(cart, raw) {
  const line = cleanLine(raw);
  if (!line) return { cart, error: 'That item is not valid.' };
  const existing = cart.find((l) => l.key === line.key);
  if (!existing && cart.length >= MAX_LINES) return { cart, error: `Max ${MAX_LINES} different items per order.` };
  const next = existing
    ? cart.map((l) => (l.key === line.key ? { ...l, ...line, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l))
    : [...cart, line];
  return { cart: next, error: null };
}

export function setQty(cart, key, quantity) {
  const q = Math.floor(Number(quantity));
  if (!Number.isFinite(q) || q < 1) return cart.filter((l) => l.key !== key);
  return cart.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, q) } : l));
}

export const removeLine = (cart, key) => cart.filter((l) => l.key !== key);

/** Replace a line's add-ons (merging into an identical line if one exists). */
export function updateAddons(cart, key, addons) {
  const line = cart.find((l) => l.key === key);
  if (!line) return cart;
  const updated = cleanLine({ ...line, addons });
  if (!updated) return cart;
  const rest = cart.filter((l) => l.key !== key);
  const twin = rest.find((l) => l.key === updated.key);
  if (twin) return rest.map((l) => (l.key === twin.key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + updated.quantity) } : l));
  return cart.map((l) => (l.key === key ? updated : l));
}

export const cartCount = (cart) => cart.reduce((n, l) => n + l.quantity, 0);
export const needsApproval = (cart) => cart.some((l) => l.kind === 'custom' || (l.addons || []).length > 0);

/** Body for POST /merch/checkout (v2 cartItem; v1 servers read only variantId/quantity). */
export function checkoutItems(cart) {
  return cart.map((l) => (l.kind === 'custom'
    ? { kind: 'custom', designId: l.designId, variantId: l.variantId, quantity: l.quantity }
    : { kind: 'listed', variantId: l.variantId, quantity: l.quantity, addons: (l.addons || []).map(({ key, text, font, color, designId }) => ({ key, text, font, color, designId })) }));
}

/** Split lines into still-buyable vs gone, given current products (listed lines only). */
export function pruneUnavailable(cart, products = []) {
  const ok = new Set();
  for (const p of products) for (const v of p.variants || []) if (v.available) ok.add(v.id);
  const kept = []; const removed = [];
  for (const l of cart) (l.kind === 'custom' || ok.has(l.variantId) ? kept : removed).push(l);
  return { kept, removed };
}

// ── store ─────────────────────────────────────────────────────────────────────
function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function readCart() {
  const v2 = read(KEY);
  if (Array.isArray(v2)) return sanitizeCart(v2);
  const v1 = read(LEGACY_KEY);
  return Array.isArray(v1) ? migrateV1(v1) : [];
}
let state = null;
let saved = null;
const listeners = new Set();
const getCart = () => (state === null ? (state = readCart()) : state);
const getSaved = () => (saved === null ? (saved = sanitizeCart(read(SAVED_KEY) || [])) : saved);
function emit() { listeners.forEach((fn) => fn()); }
function write(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  emit();
}
function writeSaved(next) {
  saved = next;
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  emit();
}
function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => {
    if (e.key === KEY) { state = readCart(); fn(); }
    if (e.key === SAVED_KEY) { saved = null; fn(); }
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage); };
}
const snapshot = () => `${JSON.stringify(getCart())}|${JSON.stringify(getSaved())}`;
let lastSnap = null; let lastVal = null;
function getValue() {
  const s = snapshot();
  if (s !== lastSnap) { lastSnap = s; lastVal = { cart: getCart(), saved: getSaved() }; }
  return lastVal;
}
const EMPTY = { cart: [], saved: [] };

export function useShopCart() {
  const { cart, saved: later } = useSyncExternalStore(subscribe, getValue, () => EMPTY);
  return {
    cart,
    saved: later,
    count: cartCount(cart),
    add: (line) => { const r = addLine(getCart(), line); if (!r.error) write(r.cart); return r.error; },
    setQty: (key, q) => write(setQty(getCart(), key, q)),
    remove: (key) => write(removeLine(getCart(), key)),
    updateAddons: (key, addons) => write(updateAddons(getCart(), key, addons)),
    replace: (next) => write(sanitizeCart(next)),
    clear: () => write([]),
    saveForLater: (key) => {
      const l = getCart().find((x) => x.key === key);
      if (!l) return;
      write(removeLine(getCart(), key));
      writeSaved(sanitizeCart([...getSaved().filter((x) => x.key !== key), l]));
    },
    moveToCart: (key) => {
      const l = getSaved().find((x) => x.key === key);
      if (!l) return 'Not found';
      const r = addLine(getCart(), l);
      if (r.error) return r.error;
      write(r.cart);
      writeSaved(getSaved().filter((x) => x.key !== key));
      return null;
    },
    removeSaved: (key) => writeSaved(getSaved().filter((x) => x.key !== key)),
  };
}

/** Non-hook access (server cart sync). */
export const cartSnapshot = () => getCart();
export const replaceCart = (next) => write(sanitizeCart(next));
