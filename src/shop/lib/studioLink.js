// Links into the Studio. Desktop opens it as an overlay over the current page
// (ShopContext.openStudio); phones (and new tabs / no-JS) follow the href.

/** /shop/design?product=<slug>&color=&size= (or ?design=<id>). */
export function studioHref({ product, design, color, size } = {}) {
  const p = new URLSearchParams();
  if (design) p.set('design', design);
  if (product) p.set('product', product);
  if (color) p.set('color', color);
  if (size) p.set('size', size);
  const q = p.toString();
  return `/shop/design${q ? `?${q}` : ''}`;
}

export const STUDIO_OVERLAY_QUERY = '(min-width: 1024px)';
export const wantsStudioOverlay = () => typeof window !== 'undefined' && !!window.matchMedia?.(STUDIO_OVERLAY_QUERY).matches;

/** Warm the Studio chunk (konva etc.) on hover / focus so it opens instantly. */
export const prefetchStudio = () => { import('@/shop/studio/Studio').catch(() => {}); };
