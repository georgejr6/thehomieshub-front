// Warm the shop before anyone opens it: the ShopLayout + home chunks and the
// catalog. Called on browser idle (Sidebar, once Merch is available) and on
// hover / focus / touchstart of a Merch link. Safe to call many times.
let started = false;

export function prefetchShop() {
  if (started) return;
  started = true;
  // Same specifiers as App.jsx's lazy() imports → same chunks, cached by the browser.
  import('@/shop/ShopLayout').catch(() => {});
  import('@/shop/pages/ShopHome').catch(() => {});
  import('@/shop/lib/catalogCache').then((m) => m.loadCatalog()).catch(() => {});
}

export function prefetchShopOnIdle() {
  if (started || typeof window === 'undefined') return;
  const run = () => prefetchShop();
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 8000 });
  else setTimeout(run, 2500);
}
