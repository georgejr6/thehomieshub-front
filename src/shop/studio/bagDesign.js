import { usedPlacements, placementOf, serverLayers } from '@/shop/studio/model';
import { exportPlacement, exportPreview } from '@/shop/studio/exporter';
import { resolveTemplate } from '@/shop/studio/template';
import { ensureFontRegistry } from '@/shop/studio/fonts';
import { createDesign, updateDesign, uploadImage, savePrintfiles } from '@/shop/lib/api';

// Everything "Add to bag" does for a custom design, shared by the Studio and
// the library. The bag gets a FROZEN COPY ("… (in your bag)", kept out of the
// library) with its own exact-size print files, so editing the original later
// never breaks what's waiting in the bag.

/** Print files for every used placement, uploaded as purpose=printfile. */
export async function renderPrintfiles(blank, doc, onStep = () => {}) {
  const files = {};
  for (const key of usedPlacements(doc)) {
    const p = placementOf(blank, key);
    onStep(`Preparing ${p.label.toLowerCase()} print file`);
    const blob = await exportPlacement(doc.layers[key], p.area);
    const up = await uploadImage(blob, { filename: `${key}.png`, purpose: 'printfile' });
    files[key] = up.url;
  }
  return files;
}

/** Flat garment preview (never on-model), uploaded as purpose=preview. '' if it fails. */
export async function makePreview(blank, color, doc) {
  const keys = usedPlacements(doc);
  const front = keys.find((k) => !/sleeve|back/.test(k)) || keys[0];
  const fp = placementOf(blank, front);
  if (!fp) return '';
  try {
    const blob = await exportPreview({ template: resolveTemplate(blank, color?.name, front), layers: doc.layers[front] });
    const up = await uploadImage(blob, { filename: 'preview.jpg', purpose: 'preview' });
    return up?.url || '';
  } catch (e) {
    console.warn('[shop] design preview failed', e); // the order still works without a thumbnail
    return '';
  }
}

/**
 * Freeze `doc` into a bag copy with print files + preview.
 * Returns the cart line (kind custom) to add. `originalId` also gets the preview.
 */
export async function bagDesign({ blank, color, size, variant, doc, name, priceCents, originalId, onStep = () => {} }) {
  await ensureFontRegistry(); // never let an unloaded font list turn a design's font into something else
  const frozen = { ...doc, layers: JSON.parse(JSON.stringify(doc.layers)) };
  const label = name && name !== 'Untitled design' ? name : `Custom ${blank.name}`;
  onStep('Saving your design');
  const copy = await createDesign({ name: `${label} (in your bag)`.slice(0, 60), blankKey: frozen.blankKey, color: frozen.color, layers: serverLayers(frozen.layers), library: false });
  if (!copy?.id) throw new Error('Could not save your design. Check your connection and try again.');
  const files = await renderPrintfiles(blank, frozen, onStep);
  await savePrintfiles(copy.id, files);
  onStep('Making your preview');
  const previewUrl = await makePreview(blank, color, frozen);
  if (previewUrl) {
    updateDesign(copy.id, { previewUrl }).catch((e) => console.warn('[shop] preview save failed', e));
    if (originalId) updateDesign(originalId, { previewUrl }).catch((e) => console.warn('[shop] preview save failed', e));
  }
  return {
    kind: 'custom', designId: copy.id, variantId: variant.id, quantity: 1,
    name: label,
    variant: [blank.name, color?.name, size].filter(Boolean).join(' · '),
    image: /^https:/.test(previewUrl) ? previewUrl : '', priceCents,
  };
}
