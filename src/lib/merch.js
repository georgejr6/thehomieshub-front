import { useEffect, useState, useSyncExternalStore } from 'react';
import api from '@/api/homieshub';

// Homies merch shop (/shop). Backend: homieshub-backend routes/merch.js,
// fulfilled by the Homies Hub Printful store. Prices always come from the
// server; the cart only holds variant ids + quantities.

export const SHOP_URL = 'https://www.thehomies.app/shop';
export const MAX_LINES = 10;
export const MAX_QTY = 10;

export const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
export const isStripeCheckoutUrl = (u) => typeof u === 'string' && /^https:\/\/checkout\.stripe\.com\//.test(u);

export const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
export const variantLabel = (v) => [v?.color, v?.size].filter(Boolean).join(' / ');
export const merchError = (err, fallback = 'Something went wrong. Try again.') =>
  err?.response?.data?.error || fallback;

// ── Variant picking ───────────────────────────────────────────────────────────
const uniq = (arr) => [...new Set(arr.filter(Boolean))];

// Sizes in the order shoppers expect (Printful returns them in catalog order,
// but be safe when a product mixes variants).
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', '6XL'];
const sizeRank = (s) => { const i = SIZE_ORDER.indexOf(String(s).toUpperCase()); return i === -1 ? 100 : i; };

export function optionsFor(variants = []) {
  return {
    colors: uniq(variants.map((v) => v.color)),
    sizes: uniq(variants.map((v) => v.size)).sort((a, b) => sizeRank(a) - sizeRank(b)),
  };
}

/** The variant for a color + size choice (either may be empty when the product has no such option). */
export function findVariant(variants = [], color, size) {
  return variants.find((v) => (v.color || '') === (color || '') && (v.size || '') === (size || '')) || null;
}

/** Is this size buyable in the chosen color? */
export function sizeAvailable(variants, color, size) {
  const v = findVariant(variants, color, size);
  return !!v?.available;
}

/** First buyable variant (falls back to the first one) — the product page's starting choice. */
export function defaultVariant(variants = []) {
  return variants.find((v) => v.available) || variants[0] || null;
}

// ── Cart (localStorage, shared across tabs of this page via a tiny store) ─────
const KEY = 'hh_merch_cart_v1';

export function sanitizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  const merged = new Map();
  for (const l of raw) {
    const id = Number(l?.variantId);
    const q = Math.floor(Number(l?.quantity));
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(q) || q < 1) continue;
    const prev = merged.get(id);
    merged.set(id, {
      variantId: id,
      quantity: Math.min(MAX_QTY, (prev?.quantity || 0) + q),
      // Display-only snapshot; checkout re-prices from the server.
      name: String(l.name || prev?.name || '').slice(0, 120),
      variant: String(l.variant || prev?.variant || '').slice(0, 60),
      image: typeof l.image === 'string' && /^https:\/\//.test(l.image) ? l.image : (prev?.image || ''),
      priceCents: Number.isInteger(l.priceCents) ? l.priceCents : (prev?.priceCents || 0),
      slug: String(l.slug || prev?.slug || '').slice(0, 80),
    });
  }
  return [...merged.values()].slice(0, MAX_LINES);
}

export function addLine(cart, line) {
  const existing = cart.find((l) => l.variantId === line.variantId);
  if (!existing && cart.length >= MAX_LINES) return { cart, error: `Max ${MAX_LINES} different items per order.` };
  const next = existing
    ? cart.map((l) => (l.variantId === line.variantId ? { ...l, ...line, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l))
    : [...cart, line];
  return { cart: sanitizeCart(next), error: null };
}

export function setLineQty(cart, variantId, quantity) {
  const q = Math.floor(Number(quantity));
  if (!Number.isFinite(q) || q < 1) return cart.filter((l) => l.variantId !== variantId);
  return cart.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, q) } : l));
}

export const cartCount = (cart) => cart.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (cart) => cart.reduce((n, l) => n + l.quantity * (l.priceCents || 0), 0);
export const checkoutItems = (cart) => cart.map(({ variantId, quantity }) => ({ variantId, quantity }));

/** Splits cart lines into still-buyable and gone, given the current shop products. */
export function pruneUnavailable(cart, products = []) {
  const ok = new Set();
  for (const p of products) for (const v of p.variants || []) if (v.available) ok.add(v.id);
  return { kept: cart.filter((l) => ok.has(l.variantId)), removed: cart.filter((l) => !ok.has(l.variantId)) };
}

// Set when checkout starts from the CART (not Buy now): the thanks page clears
// the cart only when this marker exists and the order is confirmed.
const PENDING_KEY = 'hh_merch_cart_checkout';
const PENDING_MAX_MS = 24 * 60 * 60 * 1000;
/** keys: the cart lines being paid for (null = the whole bag). */
export function markCartCheckout(keys = null) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ t: Date.now(), keys: Array.isArray(keys) ? keys : null })); } catch { /* private mode */ }
}
function readMarker() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return { t: Number(raw), keys: null }; // older format: whole bag
    const m = JSON.parse(raw);
    return m && Number.isFinite(m.t) ? m : null;
  } catch { return null; }
}
/** The cart line keys the pending checkout paid for, or null for the whole bag. */
export function cartCheckoutKeys() {
  return readMarker()?.keys || null;
}
export function clearCartCheckoutMarker() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* private mode */ }
}
export function hasCartCheckoutMarker(now = Date.now()) {
  const m = readMarker();
  return !!m && m.t > 0 && now - m.t < PENDING_MAX_MS;
}

function readStored() {
  try { return sanitizeCart(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return []; }
}
let cartState = null;
const listeners = new Set();
function getCart() { if (cartState === null) cartState = readStored(); return cartState; }
function writeCart(next) {
  cartState = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  listeners.forEach((fn) => fn());
}
function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY) { cartState = readStored(); fn(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage); };
}

export function useMerchCart() {
  const cart = useSyncExternalStore(subscribe, getCart, () => []);
  return {
    cart,
    count: cartCount(cart),
    subtotal: cartSubtotal(cart),
    add: (line) => { const r = addLine(getCart(), line); if (!r.error) writeCart(r.cart); return r.error; },
    setQty: (variantId, q) => writeCart(setLineQty(getCart(), variantId, q)),
    remove: (variantId) => writeCart(getCart().filter((l) => l.variantId !== variantId)),
    replace: (next) => writeCart(sanitizeCart(next)),
    clear: () => writeCart([]),
  };
}

// ── API ───────────────────────────────────────────────────────────────────────
export const fetchShop = () => api.get('/merch/products').then((r) => r.data || { enabled: false, products: [] });
export const fetchProduct = (slug) => api.get(`/merch/products/${encodeURIComponent(slug)}`).then((r) => r.data?.product);
export const fetchOrderBySession = (id) => api.get(`/merch/orders/by-session/${encodeURIComponent(id)}`).then((r) => r.data?.order);
export const fetchMyOrders = () => api.get('/merch/orders/mine').then((r) => r.data?.orders || []);
export async function startCheckout(items) {
  const { data } = await api.post('/merch/checkout', { items });
  if (!isStripeCheckoutUrl(data?.url)) throw new Error('no checkout url');
  window.location.href = data.url;
}

// Is the shop open with something in it? Cached for the session so the nav
// doesn't refetch on every page; never show an empty shop in the nav.
let availability = null; // Promise<boolean>
export function merchAvailable() {
  if (!availability) {
    availability = fetchShop()
      .then((d) => !!d?.enabled && (d.products?.length || 0) > 0)
      .catch(() => { availability = null; return false; });
  }
  return availability;
}
export function useMerchAvailable() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    merchAvailable().then((v) => { if (alive) setOpen(v); });
    return () => { alive = false; };
  }, []);
  return open;
}

export const ORDER_STATUS = {
  processing: 'Processing',
  submitted: 'Being printed',
  on_hold: 'On hold',
  shipped: 'Shipped',
  canceled: 'Canceled',
};
