// Studio document model (pure, tested). A design = blank + colour + layers per
// placement, every layer in that placement's printfile pixel space
// (e.g. tee front 1800×2400 @150 dpi). The canvas just scales it for display.

import { maxWidthForDpi } from '@/shop/lib/dpi';

export const STUDIO_FONTS = [
  { key: 'anton', label: 'Block', family: 'HH Anton', upper: true },
  { key: 'archivo', label: 'Heavy', family: 'HH Archivo', upper: true },
  { key: 'bebas', label: 'Condensed', family: 'HH Bebas', upper: true },
  { key: 'bowlby', label: 'Chunky', family: 'HH Bowlby', upper: true },
  { key: 'serif', label: 'Script serif', family: 'HH Serif', style: 'italic' },
  { key: 'instrument', label: 'Fine serif', family: 'HH Instrument', style: 'italic' },
  { key: 'marker', label: 'Marker', family: 'HH Marker' },
  { key: 'mono', label: 'Mono', family: 'HH Mono', weight: 'bold' },
];
export const fontByKey = (k) => STUDIO_FONTS.find((f) => f.key === k) || STUDIO_FONTS[0];

export const INKS = ['#ffffff', '#111111', '#f0b94d', '#d62828', '#1f6feb', '#2ea043', '#ff7ac6', '#8b5cf6'];
export const THREADS = [
  { hex: '#ffffff', label: 'White' }, { hex: '#111111', label: 'Black' }, { hex: '#cc3333', label: 'Red' },
  { hex: '#e2a83a', label: 'Gold' }, { hex: '#1f2a44', label: 'Navy' },
];

export const isEmbroidery = (placement) => placement?.technique === 'embroidery' || /embroid/.test(placement?.key || '');
export const EMB_MIN_LETTER_IN = 0.25;
export const EMB_MAX_LINES = 2;
export const TEXT_MAX = 60;

let seq = 0;
export const newId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function newDoc(blank, color) {
  const layers = {};
  for (const p of blank?.placements || []) layers[p.key] = [];
  return { blankKey: blank?.key || '', color: color || blank?.colors?.[0]?.name || '', layers };
}

export const placementOf = (blank, key) => (blank?.placements || []).find((p) => p.key === key) || null;

/** Placements that have at least one layer (what gets printed / priced). */
export const usedPlacements = (doc) => Object.entries(doc?.layers || {}).filter(([, l]) => Array.isArray(l) && l.length).map(([k]) => k);

/** Default ink that reads on the garment colour. */
export function defaultInk(colorName, embroidery = false) {
  const dark = /black|navy|carbon|charcoal|heather|dark/i.test(colorName || '') && !/athletic heather|ash/i.test(colorName || '');
  if (embroidery) return dark ? '#ffffff' : '#111111';
  return dark ? '#ffffff' : '#111111';
}

/** Approximate text box size for a font size (canvas measures precisely later). */
export const estimateTextBox = (text, fontSize) => {
  const lines = String(text || ' ').split('\n');
  const longest = Math.max(...lines.map((l) => l.length), 1);
  return { width: Math.round(longest * fontSize * 0.62), height: Math.round(lines.length * fontSize * 1.1) };
};

export function makeTextLayer(placement, { text = 'YOUR TEXT', font = 'anton', color = '#ffffff' } = {}) {
  const area = placement.area;
  const emb = isEmbroidery(placement);
  const fontKey = emb ? 'archivo' : font;
  const minSize = emb ? minEmbroideryFontSize(area) : 24;
  const fontSize = Math.max(minSize, Math.round(area.width / Math.max(6, String(text).length) * 1.3));
  const box = estimateTextBox(text, fontSize);
  const width = Math.min(box.width, area.width);
  return {
    id: newId(), type: 'text', text: String(text).slice(0, TEXT_MAX), font: fontKey, color, fontSize,
    x: Math.round((area.width - width) / 2), y: Math.round(Math.min(area.height * 0.18, area.height - box.height)),
    width, height: box.height, rotation: 0,
  };
}

/** Fit an image into the area: centred, as large as allowed while staying sharp (≥150 dpi) and inside the box. */
export function makeImageLayer(placement, { src, naturalWidth, naturalHeight, name = '' }) {
  const area = placement.area;
  const maxW = Math.min(area.width * 0.9, maxWidthForDpi(naturalWidth, area.dpi) || area.width * 0.9);
  const ratio = naturalHeight / naturalWidth;
  let width = Math.round(maxW);
  let height = Math.round(width * ratio);
  if (height > area.height * 0.9) { height = Math.round(area.height * 0.9); width = Math.round(height / ratio); }
  width = Math.max(40, width); height = Math.max(40, height);
  return {
    id: newId(), type: 'image', src, naturalWidth, naturalHeight, name: String(name).slice(0, 80),
    x: Math.round((area.width - width) / 2), y: Math.round(Math.min(area.height * 0.08, (area.height - height) / 2)),
    width, height, rotation: 0,
  };
}

/** Keep a layer's box inside the printable area (unrotated bounds). */
export function clampToArea(layer, area) {
  const w = Math.min(layer.width, area.width);
  const h = Math.min(layer.height, area.height);
  return { ...layer, width: w, height: h, x: Math.min(Math.max(0, layer.x), area.width - w), y: Math.min(Math.max(0, layer.y), area.height - h) };
}

/** Snap a layer's centre to the area's centre lines within `threshold` px; returns { x, y, guides }. */
export function snapToCenter(layer, area, threshold) {
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const guides = [];
  let { x, y } = layer;
  if (Math.abs(cx - area.width / 2) <= threshold) { x = Math.round(area.width / 2 - layer.width / 2); guides.push('v'); }
  if (Math.abs(cy - area.height / 2) <= threshold) { y = Math.round(area.height / 2 - layer.height / 2); guides.push('h'); }
  return { x, y, guides };
}

/** Embroidery minimum font size so capital letters are ≥ 0.25" tall (cap height ≈ 0.72 em). */
export const minEmbroideryFontSize = (area) => Math.ceil((EMB_MIN_LETTER_IN * area.dpi) / 0.72);

/** Validate a document before export/checkout; returns a list of human messages (empty = OK). */
export function validateDoc(doc, blank) {
  const issues = [];
  const used = usedPlacements(doc);
  if (!used.length) issues.push('Add some text or an image first.');
  for (const key of used) {
    const p = placementOf(blank, key);
    if (!p) { issues.push(`“${key}” isn't available on this item.`); continue; }
    const layers = doc.layers[key];
    if (isEmbroidery(p)) {
      if (layers.some((l) => l.type !== 'text')) issues.push(`${p.label}: embroidery is text only.`);
      for (const l of layers.filter((x) => x.type === 'text')) {
        if (String(l.text).split('\n').length > EMB_MAX_LINES) issues.push(`${p.label}: keep embroidery to ${EMB_MAX_LINES} lines.`);
        if (l.fontSize < minEmbroideryFontSize(p.area)) issues.push(`${p.label}: letters are too small to stitch — make the text bigger.`);
        if (!THREADS.some((t) => t.hex.toLowerCase() === String(l.color).toLowerCase())) issues.push(`${p.label}: pick a thread colour.`);
      }
    }
    for (const l of layers) {
      if (l.type === 'text' && !String(l.text || '').trim()) issues.push(`${p.label}: a text layer is empty.`);
      if (l.x < -1 || l.y < -1 || l.x + l.width > p.area.width + 1 || l.y + l.height > p.area.height + 1) issues.push(`${p.label}: something is outside the print area.`);
    }
  }
  return [...new Set(issues)];
}

/** Where the front print area sits on Printful's 700×1000 on-model blank photo (for the instant preview). */
export const PREVIEW_BOX = {
  tee: { cx: 0.487, top: 0.335, w: 0.33, h: 0.44 },
  hoodie: { cx: 0.493, top: 0.38, w: 0.30, h: 0.30 },
  hat: { cx: 0.5, top: 0.33, w: 0.27, h: 0.12 },
};
