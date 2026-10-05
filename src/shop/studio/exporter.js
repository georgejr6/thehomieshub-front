import Konva from 'konva';
import { fontByKey } from '@/shop/studio/model';
import { artScale } from '@/shop/studio/template';
import { loadImage } from '@/shop/lib/api';

// Renders print files at the exact printfile size (offscreen Konva stage, not
// attached to the page) and a small on-garment preview for the cart/designs.

const imageCache = new Map();
// Uploaded this session: draw from the original file (blob: URL) so the canvas
// is never tainted, even if the CDN copy lacks CORS headers.
const localCopies = new Map();
export function registerLocalImage(remoteUrl, localUrl) {
  if (remoteUrl && localUrl) { localCopies.set(remoteUrl, localUrl); imageCache.delete(remoteUrl); }
}
// DO Spaces and Printful's CDN send no CORS headers, so canvas loads go through
// same-origin proxies (vercel.json + vite.config.js) to keep the canvas exportable.
const SPACES_RE = /^https:\/\/homieshub-media\.nyc3\.(?:cdn\.)?digitaloceanspaces\.com\/merch\//;
const PRINTFUL_RE = /^https:\/\/files\.cdn\.printful\.com\//;
export const canvasSrc = (src) => {
  const s = src || '';
  if (SPACES_RE.test(s)) return s.replace(SPACES_RE, '/merch-cdn/');
  if (PRINTFUL_RE.test(s)) return s.replace(PRINTFUL_RE, '/pf-cdn/');
  return src;
};

export function getImage(src) {
  if (!imageCache.has(src)) {
    const from = localCopies.get(src) || canvasSrc(src);
    imageCache.set(src, loadImage(from).catch((e) => { imageCache.delete(src); throw e; }));
  }
  return imageCache.get(src);
}

// Google Fonts from GET /merch/fonts load through their CSS (once per font).
const cssLoaded = new Set();
export function loadFontCss(url) {
  if (!url || cssLoaded.has(url) || typeof document === 'undefined') return;
  cssLoaded.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}
export const fontSpec = (f, px = 64) => `${f.style === 'italic' ? 'italic' : 'normal'} ${f.weight === 'bold' ? 'bold' : 'normal'} ${px}px "${f.family}"`;

export async function ensureFonts(layers = []) {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const keys = new Set(layers.filter((l) => l.type === 'text').map((l) => l.font));
  await Promise.all([...keys].map((k) => {
    const f = fontByKey(k);
    loadFontCss(f.cssUrl);
    return document.fonts.load(fontSpec(f)).catch(() => {});
  }));
}

export function textConfig(l) {
  const f = fontByKey(l.font);
  return {
    text: f.upper ? String(l.text).toUpperCase() : String(l.text),
    fontFamily: f.family,
    fontStyle: [f.style === 'italic' ? 'italic' : '', f.weight === 'bold' ? 'bold' : ''].filter(Boolean).join(' ') || 'normal',
    fontSize: l.fontSize,
    fill: l.color,
    align: ['left', 'center', 'right'].includes(l.align) ? l.align : 'center',
    letterSpacing: Number(l.letterSpacing) || 0,
    lineHeight: 1.05,
  };
}

async function addLayerNodes(container, layers) {
  await ensureFonts(layers);
  for (const l of layers || []) {
    if (l.type === 'image') {
      const img = await getImage(l.src);
      container.add(new Konva.Image({ image: img, x: l.x, y: l.y, width: l.width, height: l.height, rotation: l.rotation || 0 }));
    } else {
      container.add(new Konva.Text({ ...textConfig(l), x: l.x, y: l.y, rotation: l.rotation || 0 }));
    }
  }
}

const toBlob = (stage, mimeType, quality) => new Promise((resolve, reject) => {
  try { stage.toBlob({ pixelRatio: 1, mimeType, quality, callback: (b) => (b ? resolve(b) : reject(new Error('empty'))) }); } catch (e) { reject(e); }
});

/** PNG Blob of one placement at exactly area.width × area.height. Throws a readable error on tainted canvases. */
export async function exportPlacement(layers, area) {
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: area.width, height: area.height });
  try {
    const layer = new Konva.Layer();
    await addLayerNodes(layer, layers);
    stage.add(layer);
    stage.draw();
    return await toBlob(stage, 'image/png');
  } catch (e) {
    if (/taint|insecure|security/i.test(String(e?.message || e))) {
      throw new Error("One of your images can't be exported from this browser. Re-upload it and try again.");
    }
    throw e;
  } finally {
    stage.destroy();
  }
}

/**
 * Draw a garment template into a Konva container (template px): background,
 * garment (silhouette or photo underneath), then `art` inside the print area,
 * then the template image on top when the template asks for it.
 */
export async function drawTemplate(root, t, artNodesFn) {
  if (t.backgroundColor) root.add(new Konva.Rect({ width: t.width, height: t.height, fill: t.backgroundColor }));
  if (t.backgroundImage) {
    const bg = await getImage(t.backgroundImage).catch(() => null);
    if (bg) root.add(new Konva.Image({ image: bg, width: t.width, height: t.height }));
  }
  if (t.kind === 'silhouette') {
    root.add(new Konva.Rect({ width: t.width, height: t.height, fill: '#ebe8e2' }));
    root.add(new Konva.Path({ data: t.path, scaleX: 10, scaleY: 10, fill: t.hex || '#e9e7e1', fillRule: 'evenodd', shadowColor: 'black', shadowBlur: 40, shadowOpacity: 0.16, shadowOffsetY: 14 }));
  }
  const garment = t.image ? await getImage(t.image).catch(() => null) : null;
  if (garment && !t.imageOnTop) root.add(new Konva.Image({ image: garment, width: t.width, height: t.height }));
  const s = artScale(t);
  const art = new Konva.Group({
    x: t.printArea.left, y: t.printArea.top, scaleX: s.x, scaleY: s.y,
    clipX: 0, clipY: 0, clipWidth: t.printfile.width, clipHeight: t.printfile.height,
  });
  await artNodesFn(art);
  root.add(art);
  if (garment && t.imageOnTop) root.add(new Konva.Image({ image: garment, width: t.width, height: t.height, listening: false }));
}

/** JPEG of the design on the garment (same composite as the Studio canvas). Never people. */
export async function exportPreview({ template, layers, size = 900 }) {
  const k = size / Math.max(template.width, template.height);
  const W = Math.round(template.width * k); const H = Math.round(template.height * k);
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: W, height: H });
  try {
    const layer = new Konva.Layer();
    const root = new Konva.Group({ scaleX: k, scaleY: k });
    await drawTemplate(root, template, (art) => addLayerNodes(art, layers));
    layer.add(root);
    stage.add(layer);
    stage.draw();
    return await toBlob(stage, 'image/jpeg', 0.86);
  } finally {
    stage.destroy();
  }
}
