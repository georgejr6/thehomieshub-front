import Konva from 'konva';
import { fontByKey, PREVIEW_BOX } from '@/shop/studio/model';
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
// DO Spaces sends no CORS headers, so canvas loads go through the same-origin
// /merch-cdn proxy (vercel.json + vite.config.js) to keep the canvas exportable.
const SPACES_RE = /^https:\/\/homieshub-media\.nyc3\.(?:cdn\.)?digitaloceanspaces\.com\/merch\//;
export const canvasSrc = (src) => (SPACES_RE.test(src || '') ? src.replace(SPACES_RE, '/merch-cdn/') : src);

export function getImage(src) {
  if (!imageCache.has(src)) {
    const from = localCopies.get(src) || canvasSrc(src);
    imageCache.set(src, loadImage(from).catch((e) => { imageCache.delete(src); throw e; }));
  }
  return imageCache.get(src);
}

export async function ensureFonts(layers = []) {
  if (!document.fonts?.load) return;
  const fams = new Set(layers.filter((l) => l.type === 'text').map((l) => l.font));
  await Promise.all([...fams].map((k) => {
    const f = fontByKey(k);
    return document.fonts.load(`${f.style || 'normal'} ${f.weight || 'normal'} 64px "${f.family}"`).catch(() => {});
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
    align: 'center',
    lineHeight: 1.05,
  };
}

async function buildLayer(layers) {
  const layer = new Konva.Layer();
  await ensureFonts(layers);
  for (const l of layers) {
    if (l.type === 'image') {
      const img = await getImage(l.src);
      layer.add(new Konva.Image({ image: img, x: l.x, y: l.y, width: l.width, height: l.height, rotation: l.rotation || 0 }));
    } else {
      const t = new Konva.Text({ ...textConfig(l), x: l.x, y: l.y, rotation: l.rotation || 0 });
      layer.add(t);
    }
  }
  return layer;
}

/** PNG Blob of one placement at exactly area.width × area.height. Throws a readable error on tainted canvases. */
export async function exportPlacement(layers, area) {
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: area.width, height: area.height });
  try {
    stage.add(await buildLayer(layers));
    stage.draw();
    const blob = await new Promise((resolve, reject) => {
      try {
        stage.toBlob({ pixelRatio: 1, mimeType: 'image/png', callback: (b) => (b ? resolve(b) : reject(new Error('empty'))) });
      } catch (e) { reject(e); }
    });
    return blob;
  } catch (e) {
    if (/taint|insecure|security/i.test(String(e?.message || e))) {
      throw new Error("One of your images can't be exported from this browser. Re-upload it and try again.");
    }
    throw e;
  } finally {
    stage.destroy();
  }
}

/** Small JPEG of the front on the garment photo (instant preview for cart/designs). */
export async function exportPreview({ blankKey, garmentSrc, garmentHex, layers, area, size = 560 }) {
  const W = size; const H = Math.round(size * 1.25);
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: W, height: H });
  try {
    const bg = new Konva.Layer();
    bg.add(new Konva.Rect({ width: W, height: H, fill: '#f4f3ef' }));
    let box = { x: W * 0.2, y: H * 0.18, w: W * 0.6, h: H * 0.6 };
    if (garmentSrc) {
      try {
        const g = await getImage(garmentSrc);
        const s = Math.max(W / g.naturalWidth, H / g.naturalHeight);
        const gw = g.naturalWidth * s; const gh = g.naturalHeight * s;
        const gx = (W - gw) / 2; const gy = (H - gh) / 2;
        bg.add(new Konva.Image({ image: g, x: gx, y: gy, width: gw, height: gh }));
        const pb = PREVIEW_BOX[blankKey] || PREVIEW_BOX.tee;
        box = { x: gx + gw * (pb.cx - pb.w / 2), y: gy + gh * pb.top, w: gw * pb.w, h: gh * pb.h };
      } catch { bg.add(new Konva.Rect({ x: W * 0.15, y: H * 0.1, width: W * 0.7, height: H * 0.8, fill: garmentHex || '#ddd', cornerRadius: 24 })); }
    }
    stage.add(bg);
    const art = await buildLayer(layers);
    const s = Math.min(box.w / area.width, box.h / area.height);
    art.scale({ x: s, y: s });
    art.position({ x: box.x + (box.w - area.width * s) / 2, y: box.y });
    stage.add(art);
    stage.draw();
    return await new Promise((resolve, reject) => {
      try { stage.toBlob({ pixelRatio: 1, mimeType: 'image/jpeg', quality: 0.86, callback: (b) => (b ? resolve(b) : reject(new Error('empty'))) }); } catch (e) { reject(e); }
    });
  } finally {
    stage.destroy();
  }
}
