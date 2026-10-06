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
// Same categories as GET /merch/fonts (condensed · bold · display · serif · hand · script · mono).
const BASE_CATEGORY = { anton: 'condensed', archivo: 'bold', bebas: 'condensed', serif_italic: 'serif', instrument_italic: 'serif', marker: 'hand', mono: 'mono' };
STUDIO_FONTS.forEach((f) => { f.category = BASE_CATEGORY[f.key]; });

// The rest of the shared font registry comes from GET /merch/fonts (25 Google
// Fonts the server can also render). The 7 keys above keep their self-hosted
// woff2 files; only keys the server lists are ever saved.
let extraFonts = [];
const FONT_KEY_RE = /^[a-z0-9_]{1,40}$/;
/** First family name of a CSS font-family stack: "'Bebas Neue', sans-serif" → "Bebas Neue". */
export const firstFamily = (stack) => String(stack || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
/** css2 URL for a Google `family` spec ("DM Serif Display:ital@1", "Poppins:wght@700"). */
export const googleCssUrl = (spec) => `https://fonts.googleapis.com/css2?family=${String(spec).trim().replace(/ /g, '+')}&display=swap`;
/** Register server fonts: [{ key, label, category, cssFamily, googleFamily, weight, style }]. */
export function registerFonts(list = []) {
  noteEmbroiderySafe(list);
  const known = new Set(STUDIO_FONTS.map((f) => f.key));
  extraFonts = (Array.isArray(list) ? list : [])
    .map((f) => ({ ...f, family: f?.family || firstFamily(f?.cssFamily) || String(f?.googleFamily || '').split(':')[0] }))
    .filter((f) => f && FONT_KEY_RE.test(f.key || '') && f.family && !known.has(f.key))
    .map((f) => ({
      key: f.key, label: f.label || f.family, family: f.family, category: String(f.category || 'display').toLowerCase(),
      cssUrl: googleCssUrl(f.googleFamily || f.family),
      weight: f.weight, style: f.style === 'italic' ? 'italic' : undefined, upper: !!f.upper,
      embroiderySafe: typeof f.embroiderySafe === 'boolean' ? f.embroiderySafe : undefined,
    }));
  return allFonts();
}
let serverSafe = null; // keys the server marks embroiderySafe (null = not sent yet)
const EMB_FALLBACK = ['archivo', 'anton', 'bebas'];
/** Fonts allowed on an embroidered spot: the server's `embroiderySafe` set, else heavy built-ins. */
export function fontsForPlacement(fonts, embroidery) {
  if (!embroidery) return fonts;
  const flagged = fonts.filter((f) => typeof f.embroiderySafe === 'boolean');
  const safe = flagged.length ? fonts.filter((f) => f.embroiderySafe === true || (serverSafe && serverSafe.has(f.key))) : fonts.filter((f) => EMB_FALLBACK.includes(f.key));
  return safe.length ? safe : fonts.filter((f) => f.key === 'archivo');
}
export const isEmbroiderySafe = (key) => fontsForPlacement(allFonts(), true).some((f) => f.key === key);
/** Record the server's embroiderySafe flags for the built-in keys too. */
export function noteEmbroiderySafe(list = []) {
  const flagged = (list || []).filter((f) => typeof f?.embroiderySafe === 'boolean');
  serverSafe = flagged.length ? new Set(flagged.filter((f) => f.embroiderySafe).map((f) => f.key)) : null;
  STUDIO_FONTS.forEach((f) => { f.embroiderySafe = serverSafe ? serverSafe.has(f.key) : undefined; });
}
/** Numeric CSS weight for a font entry ('bold' → 700). */
export const weightOf = (f) => (f?.weight === 'bold' ? 700 : Number(f?.weight) || 400);
export const allFonts = () => [...STUDIO_FONTS, ...extraFonts];
export const fontByKey = (k) => allFonts().find((f) => f.key === k) || STUDIO_FONTS[0];
export const isFontKey = (k) => allFonts().some((f) => f.key === k);
export const FONT_KEYS = STUDIO_FONTS.map((f) => f.key);
export const FONT_CATEGORIES = [
  { key: 'all', label: 'All' }, { key: 'condensed', label: 'Condensed' }, { key: 'bold', label: 'Bold' },
  { key: 'display', label: 'Display' }, { key: 'serif', label: 'Serif' }, { key: 'hand', label: 'Hand' },
  { key: 'script', label: 'Script' }, { key: 'mono', label: 'Mono' },
];
/** Search + category filter for the font picker. */
export function filterFonts(fonts, { query = '', category = 'all' } = {}) {
  const q = query.trim().toLowerCase();
  return fonts.filter((f) => (category === 'all' || f.category === category) && (!q || `${f.label} ${f.family}`.toLowerCase().includes(q)));
}

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

export const TEXT_ALIGNS = ['left', 'center', 'right'];

/** Font-size range for a text layer: stitchable minimum on embroidery, and never bigger than the print area. */
export function textSizeRange(layer, area, embroidery = false) {
  const min = embroidery ? minEmbroideryFontSize(area) : 12;
  const fs = Math.max(1, Number(layer?.fontSize) || 1);
  const lines = Math.max(1, String(layer?.text || '').split('\n').length);
  const perW = (Number(layer?.width) || estimateTextBox(layer?.text, fs).width) / fs; // measured width per px of font size
  const byWidth = perW > 0 ? Math.floor(area.width / perW) : 5000;
  const byHeight = Math.floor(area.height / (lines * 1.1));
  return { min, max: Math.max(min, Math.min(5000, byWidth, byHeight)) };
}

/** Patch for a new font size: keeps the box centred where it was and inside the area. */
export function resizeText(layer, fontSize, area, embroidery = false) {
  const { min, max } = textSizeRange(layer, area, embroidery);
  const fs = Math.round(Math.min(max, Math.max(min, Number(fontSize) || min)));
  const k = fs / Math.max(1, Number(layer.fontSize) || fs);
  const width = Math.round((Number(layer.width) || 0) * k);
  const height = Math.round((Number(layer.height) || 0) * k);
  const c = clampToArea({ ...layer, width, height, x: layer.x + ((layer.width || 0) - width) / 2, y: layer.y + ((layer.height || 0) - height) / 2 }, area);
  return { fontSize: fs, width: c.width, height: c.height, x: Math.round(c.x), y: Math.round(c.y) };
}

/** Split a long phrase over two lines at the space nearest the middle. */
export function twoLines(text, maxPerLine = 14) {
  const t = String(text || '').trim();
  if (t.length <= maxPerLine || !t.includes(' ')) return t;
  const mid = t.length / 2;
  let best = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return `${t.slice(0, best)}\n${t.slice(best + 1)}`;
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
/** Axis-aligned bounds of a layer rotated about its top-left (Konva's origin). */
export function rotatedBounds(l) {
  const r = ((Number(l.rotation) || 0) * Math.PI) / 180;
  const c = Math.cos(r); const s = Math.sin(r);
  const pts = [[0, 0], [l.width, 0], [0, l.height], [l.width, l.height]].map(([px, py]) => [l.x + px * c - py * s, l.y + px * s + py * c]);
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Keep a layer (rotation included) inside the printable area: shrink if it can't fit, then shift in. */
export function clampToArea(layer, area) {
  let l = { ...layer };
  let b = rotatedBounds(l);
  const k = Math.min(1, area.width / Math.max(1e-6, b.maxX - b.minX), area.height / Math.max(1e-6, b.maxY - b.minY));
  if (k < 1) {
    l = { ...l, width: Math.floor(l.width * k), height: Math.floor(l.height * k) };
    if (l.type === 'text' && l.fontSize > 0) l.fontSize = Math.max(1, Math.floor(l.fontSize * k));
    b = rotatedBounds(l);
  }
  const dx = b.minX < 0 ? -b.minX : b.maxX > area.width ? area.width - b.maxX : 0;
  const dy = b.minY < 0 ? -b.minY : b.maxY > area.height ? area.height - b.maxY : 0;
  const round = (v) => Math.round(v * 1000) / 1000;
  return { ...l, x: round(l.x + dx), y: round(l.y + dy) };
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
      // a listed piece's own embroidered patch (house art, server-checked) may stay; other images can't be stitched
      if (layers.some((l) => l.type !== 'text' && !l.house)) issues.push(`${p.label}: embroidery is text only.`);
      const threads = threadsOf(blank);
      for (const l of layers.filter((x) => x.type === 'text')) {
        if (l.fontSize < minEmbroideryFontSize(p.area)) issues.push(`${p.label}: letters are too small to stitch — make the text bigger.`);
        if (!threads.some((t) => t.hex.toLowerCase() === String(l.color).toLowerCase())) issues.push(`${p.label}: pick a thread colour.`);
        if (!isEmbroiderySafe(l.font)) issues.push(`${p.label}: pick a font that can be embroidered.`);
      }
    }
    for (const l of layers.filter((x) => x.type === 'text')) {
      if (String(l.text).split('\n').length > TEXT_MAX_LINES) issues.push(`${p.label}: keep text to ${TEXT_MAX_LINES} lines.`);
      if (String(l.text).length > TEXT_MAX) issues.push(`${p.label}: text is over ${TEXT_MAX} characters.`);
    }
    for (const l of layers) {
      if (l.type === 'text' && !String(l.text || '').trim()) issues.push(`${p.label}: a text layer is empty.`);
      const b = rotatedBounds(l);
      if (b.minX < -1 || b.minY < -1 || b.maxX > p.area.width + 1 || b.maxY > p.area.height + 1) issues.push(`${p.label}: something is outside the print area.`);
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
  // Never swap a font silently — an unknown key means the font list isn't loaded (or is wrong).
  if (!isFontKey(l.font)) throw new Error(`Unknown font “${l.font}”. Reload the page and try again.`);
  const out = { ...base, text: clampText(l.text), font: l.font, color: String(l.color || '#FFFFFF').toUpperCase() };
  if (l.fontSize > 0) out.fontSize = Math.min(5000, Math.max(1, num(l.fontSize)));
  out.align = TEXT_ALIGNS.includes(l.align) ? l.align : 'center';
  out.letterSpacing = Math.round(Number(l.letterSpacing) || 0);
  return out;
}
export const serverLayers = (layers = {}) => Object.fromEntries(
  Object.entries(layers).filter(([, ls]) => Array.isArray(ls) && ls.length).map(([k, ls]) => [k, ls.map(serverLayer)]),
);

// Where the print area sits on a garment image (fractions). Flat/ghost renders
// and the silhouette share the same framing (src/shop/components/GarmentSilhouette).
export { PRINT_BOX as PREVIEW_BOX } from '@/shop/components/GarmentSilhouette';
