// Google Fonts from GET /merch/fonts load through their css2 stylesheet, once
// each. Resolves when the stylesheet has loaded (rejects if it can't).
const loaded = new Map();
export function loadFontCss(url) {
  if (!url || typeof document === 'undefined') return Promise.resolve();
  if (!loaded.has(url)) {
    loaded.set(url, new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => { loaded.delete(url); reject(new Error('font stylesheet failed')); };
      document.head.appendChild(link);
    }));
  }
  return loaded.get(url);
}
