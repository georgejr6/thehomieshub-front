import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchShop } from '@/lib/merch';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBlanks, fetchServerCart, pushServerCart, claimDesigns } from '@/shop/lib/api';
import { useShopCart, checkoutItems, sanitizeCart, cartSnapshot, replaceCart } from '@/shop/lib/cart';

// Shared state for the whole shop mode: catalog, Studio availability, the
// cart drawer and toasts. Loaded once when the shop opens.
const ShopCtx = createContext(null);
export const useShop = () => useContext(ShopCtx);

export function ShopProvider({ children }) {
  const { user } = useAuth() || {};
  const [catalog, setCatalog] = useState({ loading: true, enabled: false, products: [], error: false });
  const [blanks, setBlanks] = useState(undefined); // undefined = loading, null = Studio not available
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const cartApi = useShopCart();

  const reload = useCallback(() => {
    setCatalog((c) => ({ ...c, loading: true, error: false }));
    return fetchShop()
      .then((d) => { setCatalog({ loading: false, enabled: !!d?.enabled, products: d?.products || [], error: false }); return d?.products || []; })
      .catch(() => { setCatalog((c) => ({ ...c, loading: false, error: true })); return []; });
  }, []);

  useEffect(() => { reload(); fetchBlanks().then(setBlanks); }, [reload]);

  const notify = useCallback((message, tone = 'default') => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  // Signed in: merge the server cart once (cross-device), claim guest designs,
  // then mirror local changes back (debounced) for abandoned-cart reminders.
  const signedIn = !!user?._id || !!user?.id || !!user?.username;
  const synced = useRef(false);
  useEffect(() => {
    if (!signedIn || synced.current || blanks === undefined) return;
    synced.current = true;
    claimDesigns();
    if (!blanks) return; // v1 backend: no server cart
    fetchServerCart().then((items) => {
      if (!items?.length) return;
      const local = cartSnapshot();
      if (!local.length) replaceCart(sanitizeCart(items));
    });
  }, [signedIn, blanks]);
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
    signedIn,
    user,
  }), [catalog, reload, blanks, cartApi, cartOpen, notify, toast, signedIn, user]);

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}
