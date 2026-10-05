import Konva from 'konva';
import { fontByKey, PREVIEW_BOX } from '@/shop/studio/model';
import { GARMENT_PATHS } from '@/shop/components/GarmentSilhouette';
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

/** Small JPEG of the design on a flat garment: the blank's flat/ghost render if
 *  the API gives one, else the garment silhouette in its colour. Never people. */
export async function exportPreview({ blankKey, garmentSrc, garmentHex, layers, area, size = 560 }) {
  const W = size; const H = Math.round(size * 1.25);
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: W, height: H });
  try {
    const bg = new Konva.Layer();
    bg.add(new Konva.Rect({ width: W, height: H, fill: '#f1efea' }));
    const pb = PREVIEW_BOX[blankKey] || PREVIEW_BOX.tee;
    // garment occupies an inset 100×125 frame
    const fw = W * 0.88; const fh = fw * 1.25;
    const fx = (W - fw) / 2; const fy = (H - fh) / 2;
    let drewPhoto = false;
    if (garmentSrc) {
      try {
        const g = await getImage(garmentSrc);
        const s = Math.min(fw / g.naturalWidth, fh / g.naturalHeight);
        bg.add(new Konva.Image({ image: g, x: fx + (fw - g.naturalWidth * s) / 2, y: fy + (fh - g.naturalHeight * s) / 2, width: g.naturalWidth * s, height: g.naturalHeight * s }));
        drewPhoto = true;
      } catch { /* fall back to the silhouette */ }
    }
    if (!drewPhoto) {
      const path = GARMENT_PATHS[blankKey] || GARMENT_PATHS.tee;
      const sc = fw / 100;
      bg.add(new Konva.Path({ data: path, x: fx, y: fy, scaleX: sc, scaleY: sc, fill: garmentHex || '#e9e7e1', fillRule: 'evenodd', shadowColor: 'black', shadowBlur: 24, shadowOpacity: 0.18, shadowOffsetY: 10 }));
    }
    const box = { x: fx + fw * (pb.cx - pb.w / 2), y: fy + fh * pb.top, w: fw * pb.w, h: fh * pb.h };
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
