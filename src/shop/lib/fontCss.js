// Google Fonts from GET /merch/fonts load through their css2 stylesheet, once each.
const loaded = new Set();
export function loadFontCss(url) {
  if (!url || loaded.has(url) || typeof document === 'undefined') return;
  loaded.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}
