// The garment IS the canvas. For every blank + colour + placement this gives a
// "template": what to draw (Printful template image / background, or a clean
// garment silhouette) and where the print area sits on it, in template pixels.
// Layers stay in printfile pixels (placement.area) and are mapped into
// printArea — exactly how Printful composites: background → art inside the
// print area → template image on top (when the template says so).
//
// Sources, best first:
//  1. GET /merch/blanks templates (backend: templateImage, backgroundColor,
//     backgroundImage, templateWidth/Height, printArea{left,top,width,height}).
//  2. Dad hats: the catalog colour photo (garment only) for the front.
//  3. A garment silhouette in the colour. Never a photo of a person: the tee /
//     hoodie / crewneck catalog photos from /blanks are on-model, so they're not used.

import { GARMENT_PATHS } from '@/shop/components/GarmentSilhouette';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A print box of the printfile's aspect, centred on (cx, cy), `w` wide. */
const boxC = (cx, cy, w, pf) => { const h = (w * pf.height) / pf.width; return { left: cx - w / 2, top: cy - h / 2, width: w, height: h }; };
/** Same, hanging from `top`. */
const boxT = (cx, top, w, pf) => ({ left: cx - w / 2, top, width: w, height: (w * pf.height) / pf.width });

// Silhouettes live in a 1000×1250 frame (GARMENT_PATHS × 10).
const SIL_W = 1000; const SIL_H = 1250;
const HOODIE_BODY = GARMENT_PATHS.hoodie.split(' M')[0]; // crewneck = hoodie without the hood
const SILHOUETTE = {
  tee: {
    path: GARMENT_PATHS.tee,
    areas: (k, pf) => ({
      front: boxT(500, 330, 400, pf), back: boxT(500, 300, 400, pf),
      sleeve_left: boxC(805, 255, 110, pf), sleeve_right: boxC(195, 255, 110, pf),
    }[k]),
  },
  hoodie: {
    path: GARMENT_PATHS.hoodie,
    areas: (k, pf) => ({
      front: boxT(500, 430, 380, pf), back: boxT(500, 300, 400, pf),
      sleeve_left: boxC(865, 545, 85, pf), sleeve_right: boxC(135, 545, 85, pf),
      embroidery_chest_left: boxC(625, 400, 120, pf),
    }[k]),
  },
  crewneck: {
    path: HOODIE_BODY,
    areas: (k, pf) => ({
      front: boxT(500, 260, 400, pf), back: boxT(500, 260, 400, pf),
      sleeve_left: boxC(865, 545, 85, pf), sleeve_right: boxC(135, 545, 85, pf),
    }[k]),
  },
  hat: {
    path: GARMENT_PATHS.hat,
    areas: (k, pf) => ({ embroidery_front: boxC(500, 530, 400, pf), embroidery_back: boxC(500, 530, 300, pf) }[k]),
  },
};

function fromServer(blank, color, placement) {
  const key = placement.key;
  const list = Array.isArray(blank?.templates) ? blank.templates : null;
  const raw = [
    color?.templates?.[key],
    placement?.templates?.[color?.name],
    !list ? blank?.templates?.[key]?.[color?.name] : null,
    list?.find((t) => t?.placement === key && (!t.color || t.color === color?.name)),
    placement?.template,
  ].find((t) => t && (t.templateImage || t.template_image_url || t.image || t.backgroundImage));
  if (!raw) return null;
  const pa = raw.printArea || raw.print_area || {};
  const printArea = {
    left: num(pa.left ?? pa.x ?? raw.print_area_left), top: num(pa.top ?? pa.y ?? raw.print_area_top),
    width: num(pa.width ?? raw.print_area_width), height: num(pa.height ?? raw.print_area_height),
  };
  const width = num(raw.templateWidth ?? raw.template_width ?? raw.width);
  const height = num(raw.templateHeight ?? raw.template_height ?? raw.height);
  if (!width || !height || !printArea.width || !printArea.height) return null;
  return {
    kind: 'printful', width, height, printArea,
    image: raw.templateImage || raw.template_image_url || raw.image || '',
    imageOnTop: raw.templateOnTop ?? raw.isTemplateOnFront ?? raw.is_template_on_front ?? true,
    backgroundColor: raw.backgroundColor || raw.background_color || color?.hex || '#ffffff',
    backgroundImage: raw.backgroundImage || raw.background_url || '',
  };
}

const silhouetteKind = (blankKey) => (SILHOUETTE[blankKey] ? blankKey : 'tee');

/** Everything the canvas / preview needs for one view of the garment. */
export function resolveTemplate(blank, colorName, placementKey) {
  const color = blank?.colors?.find((c) => c.name === colorName) || blank?.colors?.[0] || { name: '', hex: '#e9e7e1' };
  const placement = (blank?.placements || []).find((p) => p.key === placementKey) || blank?.placements?.[0];
  const pf = placement?.area || { width: 1800, height: 2400, dpi: 150 };
  const base = { blankKey: blank?.key, placementKey: placement?.key, colorName: color.name, hex: color.hex, printfile: pf };
  const server = placement && fromServer(blank, color, placement);
  if (server) return { ...base, ...server };
  if (blank?.key === 'hat' && color.image && /front/.test(placement?.key || '')) {
    return { ...base, kind: 'photo', width: 700, height: 1000, image: color.image, imageOnTop: false, backgroundColor: '#ffffff', backgroundImage: '', printArea: boxC(350, 385, 250, pf) };
  }
  const sk = silhouetteKind(blank?.key);
  const s = SILHOUETTE[sk];
  const printArea = s.areas(placement?.key, pf) || boxT(500, 330, 400, pf);
  return { ...base, kind: 'silhouette', width: SIL_W, height: SIL_H, path: s.path, image: '', imageOnTop: false, backgroundColor: '', backgroundImage: '', printArea };
}

/** Printfile px → template px scale for the art group. */
export const artScale = (t) => ({ x: t.printArea.width / t.printfile.width, y: t.printArea.height / t.printfile.height });

/** For picker cards / thumbnails: { image } or { silhouette: kind } of the front view. */
export function garmentThumb(blank, colorName) {
  const t = resolveTemplate(blank, colorName, blank?.placements?.[0]?.key);
  if (t.kind === 'silhouette') return { silhouette: blank?.key === 'crewneck' ? 'hoodie' : silhouetteKind(blank?.key), hex: t.hex };
  return { image: t.image || t.backgroundImage, background: t.backgroundColor, hex: t.hex };
}
