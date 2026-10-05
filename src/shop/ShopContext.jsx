import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cachedCatalog, loadCatalog } from '@/shop/lib/catalogCache';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBlanks, fetchServerCart, pushServerCart, claimDesigns, setClaimPromise, fetchDesign } from '@/shop/lib/api';
import { displayName, productImage, kindOf, KIND_LABEL } from '@/shop/lib/catalog';
import { customPriceCents } from '@/shop/lib/pricing';
import { wantsStudioOverlay, prefetchStudio } from '@/shop/lib/studioLink';
import { useShopCart, checkoutItems, sanitizeCart, cartSnapshot, replaceCart, lineKey } from '@/shop/lib/cart';

// Shared state for the whole shop mode: catalog, Studio availability, the
// cart drawer and toasts. Loaded once when the shop opens.
const ShopCtx = createContext(null);
export const useShop = () => useContext(ShopCtx);

const ADDON_LABELS = { back: 'Back print', sleeve_left: 'Left sleeve', sleeve_right: 'Right sleeve', embroidery_chest_left: 'Left-chest embroidery', embroidery_back: 'Back embroidery' };

/** Server cart items carry ids only — fill in name/image/price for display (checkout re-prices anyway). */
async function rebuildLine(it, products, blanks) {
  if (it.kind === 'custom') {
    const d = await fetchDesign(it.designId).catch(() => null);
    const blank = (blanks || []).find((b) => b.key === d?.blankKey);
    const v = blank?.variants?.find((x) => x.id === it.variantId);
    const used = Object.keys(d?.layers || {}).filter((k) => (d.layers[k] || []).length);
    return { ...it, name: d?.name || `Custom ${blank?.name || 'piece'}`, variant: [blank?.name, v?.color, v?.size].filter(Boolean).join(' · '), image: d?.previewUrl || '', priceCents: v ? customPriceCents(blank, used, v) : 0 };
  }
  const product = products.find((p) => (p.variants || []).some((v) => v.id === it.variantId));
  const v = product?.variants.find((x) => x.id === it.variantId);
  return {
    ...it,
    name: product ? displayName(product) : 'The Homies merch',
    variant: product ? [KIND_LABEL[kindOf(product)], v?.color, v?.size].filter(Boolean).join(' · ') : '',
    image: product ? productImage(product, v?.color) : '',
    slug: product?.slug || '',
    priceCents: v?.priceCents || 0,
    addons: (it.addons || []).map((a) => ({ ...a, label: ADDON_LABELS[a.key] || a.key })),
  };
}

export function ShopProvider({ children }) {
  const { user } = useAuth() || {};
  const [catalog, setCatalog] = useState(() => {
    const c = cachedCatalog(); // render instantly from the last catalog, refresh behind it
    return c ? { loading: false, enabled: !!c.enabled, products: c.products || [], error: false } : { loading: true, enabled: false, products: [], error: false };
  });
  const [blanks, setBlanks] = useState(undefined); // undefined = loading, null = Studio not available
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [studioOverlay, setStudioOverlay] = useState(null); // init for the desktop Studio overlay
  const toastTimer = useRef(null);
  const cartApi = useShopCart();

  const reload = useCallback(({ force = true } = {}) => {
    setCatalog((c) => (c.products.length ? c : { ...c, loading: true, error: false }));
    return loadCatalog({ force })
      .then((d) => { setCatalog({ loading: false, enabled: !!d?.enabled, products: d?.products || [], error: false }); return d?.products || []; })
      .catch(() => { setCatalog((c) => ({ ...c, loading: false, error: !c.products.length })); return []; });
  }, []);

  useEffect(() => { reload({ force: false }); fetchBlanks().then(setBlanks); }, [reload]);

  const notify = useCallback((message, tone = 'default') => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  // Signed in: claim guest designs into the account FIRST (every design/checkout
  // call awaits this), then merge the server cart once (cross-device), rebuilding
  // display fields from the catalog, then mirror local changes back (debounced)
  // for the abandoned-cart reminder.
  const signedIn = !!user?._id || !!user?.id || !!user?.username;
  const claimedFor = useRef(null);
  useEffect(() => {
    const who = user?._id || user?.id || user?.username || null;
    if (!who || claimedFor.current === who) return;
    claimedFor.current = who;
    setClaimPromise(claimDesigns());
  }, [user]);
  const synced = useRef(false);
  useEffect(() => {
    if (!signedIn || synced.current || blanks === undefined || catalog.loading) return;
    synced.current = true;
    if (!blanks) return; // v1 backend: no server cart
    fetchServerCart().then(async (items) => {
      if (!items?.length) return;
      const local = cartSnapshot();
      const have = new Set(local.map((l) => l.key));
      const extra = [];
      for (const it of sanitizeCart(items)) {
        if (have.has(lineKey(it))) continue;
        extra.push(await rebuildLine(it, catalog.products, blanks));
      }
      if (extra.length) replaceCart([...cartSnapshot(), ...extra]);
    });
  }, [signedIn, blanks, catalog.loading, catalog.products]);
  const pushTimer = useRef(null);
  useEffect(() => {
    if (!signedIn || !blanks || !synced.current) return undefined;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => pushServerCart(checkoutItems(cartApi.cart)), 1500);
    return () => clearTimeout(pushTimer.current);
  }, [cartApi.cart, signedIn, blanks]);

  const value = useMemo(() => ({
    ...catalog,
    reload,
    blanks,
    studioAvailable: Array.isArray(blanks) && blanks.length > 0,
    cart: cartApi,
    cartOpen,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    notify,
    toast,
    studioOverlay,
    /** Desktop: open the Studio over the page and return true. Phones: return false (follow the link). */
    openStudio: (init) => { if (!wantsStudioOverlay()) return false; prefetchStudio(); setStudioOverlay({ ...init, at: Date.now() }); return true; },
    closeStudio: () => setStudioOverlay(null),
    signedIn,
    user,
  }), [catalog, reload, blanks, cartApi, cartOpen, notify, toast, studioOverlay, signedIn, user]);

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}
