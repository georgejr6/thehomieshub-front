// Studio document model (pure, tested). A design = blank + colour + layers per
// placement, every layer in that placement's printfile pixel space
// (e.g. tee front 1800×2400 @150 dpi). The canvas just scales it for display.

import { maxWidthForDpi } from '@/shop/lib/dpi';

// Keys must match the server's text renderer (docs/MERCH_API_V2.md #6).
export const STUDIO_FONTS = [
  { key: 'anton', label: 'Block', family: 'HH Anton', upper: true },
  { key: 'archivo', label: 'Heavy', family: 'HH Archivo', upper: true },
  { key: 'bebas', label: 'Condensed', family: 'HH Bebas', upper: true },
  { key: 'serif_italic', label: 'Script serif', family: 'HH Serif', style: 'italic' },
  { key: 'instrument_italic', label: 'Fine serif', family: 'HH Instrument', style: 'italic' },
  { key: 'marker', label: 'Marker', family: 'HH Marker' },
  { key: 'mono', label: 'Mono', family: 'HH Mono', weight: 'bold' },
];
export const fontByKey = (k) => STUDIO_FONTS.find((f) => f.key === k) || STUDIO_FONTS[0];
export const FONT_KEYS = STUDIO_FONTS.map((f) => f.key);

export const INKS = ['#FFFFFF', '#111111', '#F0B94D', '#D62828', '#1F6FEB', '#2EA043', '#FF7AC6', '#8B5CF6'];
/** Embroidery thread palette = the blank's own (Printful's colours, from /blanks). */
export const threadsOf = (blank) => (Array.isArray(blank?.threadColors) ? blank.threadColors.filter((t) => /^#[0-9a-f]{6}$/i.test(t?.hex)) : []);

export const isEmbroidery = (placement) => String(placement?.technique || '').toLowerCase() === 'embroidery' || /embroid/.test(placement?.key || '');
export const EMB_MIN_LETTER_IN = 0.25;
export const TEXT_MAX = 80;
export const TEXT_MAX_LINES = 2;
/** Keep at most 2 lines and 80 characters. */
export const clampText = (t) => String(t ?? '').split('\n').slice(0, TEXT_MAX_LINES).join('\n').slice(0, TEXT_MAX);

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
    id: newId(), type: 'text', text: clampText(text), font: fontKey, color, fontSize,
    x: Math.round((area.width - width) / 2), y: Math.round(Math.min(area.height * 0.18, area.height - box.height)),
    width, height: box.height, rotation: 0,
  };
}

/** The server stores text boxes without a font size: derive it from box height ÷ lines. */
export function withFontSize(layer) {
  if (layer?.type !== 'text' || Number(layer.fontSize) > 0) return layer;
  const lines = Math.max(1, String(layer.text || '').split('\n').length);
  return { ...layer, fontSize: Math.max(12, Math.round((Number(layer.height) || 120) / lines / 1.05)) };
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
  if (new Set(used.map((k) => placementOf(blank, k)).filter(Boolean).map(techniqueOf)).size > 1) {
    issues.push("Embroidered and printed spots can't be combined on one piece — keep one or the other.");
  }
  for (const key of used) {
    const p = placementOf(blank, key);
    if (!p) { issues.push(`“${key}” isn't available on this item.`); continue; }
    const layers = doc.layers[key];
    if (isEmbroidery(p)) {
      if (layers.some((l) => l.type !== 'text')) issues.push(`${p.label}: embroidery is text only.`);
      const threads = threadsOf(blank);
      for (const l of layers.filter((x) => x.type === 'text')) {
        if (l.fontSize < minEmbroideryFontSize(p.area)) issues.push(`${p.label}: letters are too small to stitch — make the text bigger.`);
        if (!threads.some((t) => t.hex.toLowerCase() === String(l.color).toLowerCase())) issues.push(`${p.label}: pick a thread colour.`);
      }
    }
    for (const l of layers.filter((x) => x.type === 'text')) {
      if (String(l.text).split('\n').length > TEXT_MAX_LINES) issues.push(`${p.label}: keep text to ${TEXT_MAX_LINES} lines.`);
      if (String(l.text).length > TEXT_MAX) issues.push(`${p.label}: text is over ${TEXT_MAX} characters.`);
    }
    for (const l of layers) {
      if (l.type === 'text' && !String(l.text || '').trim()) issues.push(`${p.label}: a text layer is empty.`);
      if (l.x < -1 || l.y < -1 || l.x + l.width > p.area.width + 1 || l.y + l.height > p.area.height + 1) issues.push(`${p.label}: something is outside the print area.`);
    }
  }
  return [...new Set(issues)];
}

/** Embroidered and printed spots can't be mixed on one piece (server: `mixed_technique`). */
export const techniqueOf = (placement) => (isEmbroidery(placement) ? 'embroidery' : 'print');
/** The technique already used by the design (or null when it's empty). */
export function docTechnique(doc, blank) {
  const p = usedPlacements(doc).map((k) => placementOf(blank, k)).find(Boolean);
  return p ? techniqueOf(p) : null;
}
/** Can content go on this placement without mixing techniques? */
export function placementAllowed(doc, blank, placement) {
  const others = usedPlacements(doc).filter((k) => k !== placement?.key).map((k) => placementOf(blank, k)).filter(Boolean);
  return others.every((p) => techniqueOf(p) === techniqueOf(placement));
}

/** Thread that reads on the garment: white on dark, black on light, else the first. */
export function defaultThread(blank, colorName) {
  const threads = threadsOf(blank);
  if (!threads.length) return '';
  const want = defaultInk(colorName, true).toUpperCase();
  return (threads.find((t) => t.hex.toUpperCase() === want) || threads[0]).hex.toUpperCase();
}

const num = (v) => Math.round(Number(v) || 0);
/** Strip a layer to the fields the server stores (MERCH_API_V2 "Layer fields"). */
export function serverLayer(l) {
  const base = { id: String(l.id), type: l.type, x: num(l.x), y: num(l.y), width: Math.max(1, num(l.width)), height: Math.max(1, num(l.height)), rotation: Math.round((Number(l.rotation) || 0) * 100) / 100 };
  if (l.type === 'image') {
    const out = { ...base, src: l.src };
    if (l.name) out.name = String(l.name).slice(0, 60);
    if (l.naturalWidth > 0 && l.naturalHeight > 0) { out.naturalWidth = num(l.naturalWidth); out.naturalHeight = num(l.naturalHeight); }
    return out;
  }
  const out = { ...base, text: clampText(l.text), font: FONT_KEYS.includes(l.font) ? l.font : 'anton', color: String(l.color || '#FFFFFF').toUpperCase() };
  if (l.fontSize > 0) out.fontSize = Math.min(5000, Math.max(1, num(l.fontSize)));
  return out;
}
export const serverLayers = (layers = {}) => Object.fromEntries(
  Object.entries(layers).filter(([, ls]) => Array.isArray(ls) && ls.length).map(([k, ls]) => [k, ls.map(serverLayer)]),
);

// Where the print area sits on a garment image (fractions). Flat/ghost renders
// and the silhouette share the same framing (src/shop/components/GarmentSilhouette).
export { PRINT_BOX as PREVIEW_BOX } from '@/shop/components/GarmentSilhouette';
