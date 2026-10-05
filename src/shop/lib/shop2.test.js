import { describe, test, expect, vi, beforeEach } from 'vitest';
import { textSizeRange, resizeText, twoLines, clampText } from '@/shop/studio/model';
import { studioHref } from '@/shop/lib/studioLink';
import { isLibraryDesign } from '@/shop/lib/api';

vi.mock('@/lib/merch', () => ({ fetchShop: vi.fn() }));

describe('studio text controls', () => {
  const area = { width: 1800, height: 2400, dpi: 150 };
  const layer = { id: 't', type: 'text', text: 'HOMIE', font: 'anton', fontSize: 100, x: 800, y: 100, width: 300, height: 105, rotation: 0 };
  test('size range: never wider than the print area, embroidery minimum respected', () => {
    expect(textSizeRange(layer, area).max).toBe(600); // 300px wide at 100 → 3 px per size → 1800 / 3
    expect(textSizeRange(layer, area).min).toBe(12);
    const hatBack = { width: 600, height: 300, dpi: 300 };
    expect(textSizeRange({ ...layer, fontSize: 120, width: 360, height: 126 }, hatBack, true).min).toBe(105);
  });
  test('resizeText keeps the box centred and inside the area, clamped to the range', () => {
    const p = resizeText(layer, 200, area);
    expect(p).toMatchObject({ fontSize: 200, width: 600, height: 210 });
    expect(p.x).toBe(650); // centre stays at 950
    expect(resizeText(layer, 99999, area).fontSize).toBe(600);
    expect(resizeText(layer, 1, area).fontSize).toBe(12);
    const edge = resizeText({ ...layer, x: 1500 }, 200, area);
    expect(edge.x + edge.width).toBeLessThanOrEqual(1800);
  });
  test('long phrases split over two lines at the middle space', () => {
    const t = twoLines("IF SHE THICK I'M GOING");
    expect(t.split(String.fromCharCode(10))).toEqual(['IF SHE THICK', "I'M GOING"]);
    expect(twoLines('SAY LESS')).toBe('SAY LESS');
    expect(clampText(twoLines('ONE TWO THREE FOUR FIVE SIX')).split(String.fromCharCode(10))).toHaveLength(2);
  });
});

describe('studio links + library', () => {
  test('studioHref builds the route the phone flow follows', () => {
    expect(studioHref({ product: 'say-less-tee', color: 'Black', size: 'L' })).toBe('/shop/design?product=say-less-tee&color=Black&size=L');
    expect(studioHref({ design: 'abc123' })).toBe('/shop/design?design=abc123');
    expect(studioHref()).toBe('/shop/design');
  });
  test('bag copies never show in the library', () => {
    expect(isLibraryDesign({ name: 'Mine' })).toBe(true);
    expect(isLibraryDesign({ name: 'Mine', library: false })).toBe(false);
    expect(isLibraryDesign({ name: 'Mine (in your bag)' })).toBe(false);
    expect(isLibraryDesign(null)).toBe(false);
  });
});

describe('catalog cache (stale-while-revalidate)', () => {
  beforeEach(async () => { const m = await import('@/shop/lib/catalogCache'); m._resetCatalogCache(); });
  test('serves the cached catalog synchronously and dedupes fetches', async () => {
    const { fetchShop } = await import('@/lib/merch');
    const { cachedCatalog, loadCatalog } = await import('@/shop/lib/catalogCache');
    const data = { enabled: true, products: [{ slug: 'a' }] };
    fetchShop.mockResolvedValue(data);
    expect(cachedCatalog()).toBeNull();
    const [a, b] = await Promise.all([loadCatalog(), loadCatalog()]);
    expect(a).toBe(data); expect(b).toBe(data);
    expect(fetchShop).toHaveBeenCalledTimes(1);
    expect(cachedCatalog()).toEqual(data);
    await loadCatalog(); // fresh → no new request
    expect(fetchShop).toHaveBeenCalledTimes(1);
    await loadCatalog({ force: true });
    expect(fetchShop).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sessionStorage.getItem('hh_shop_catalog_v1')).data).toEqual(data);
  });
});

describe('garment templates (the garment is the canvas)', async () => {
  const { resolveTemplate, artScale, garmentThumb } = await import('@/shop/studio/template');
  const tee = {
    key: 'tee', colors: [{ name: 'Black', hex: '#141414', image: 'https://files.cdn.printful.com/products/71/model.jpg' }],
    placements: [{ key: 'front', area: { width: 1800, height: 2400, dpi: 150 } }, { key: 'sleeve_left', area: { width: 600, height: 525, dpi: 150 } }],
  };
  test('fallback silhouette keeps the printfile aspect and never uses the on-model catalog photo', () => {
    const t = resolveTemplate(tee, 'Black', 'front');
    expect(t.kind).toBe('silhouette');
    expect(t.image).toBe('');
    expect(t.printArea.height / t.printArea.width).toBeCloseTo(2400 / 1800, 5);
    const s = artScale(t);
    expect(s.x).toBeCloseTo(s.y, 6);
    expect(garmentThumb(tee, 'Black').image).toBeUndefined();
    expect(resolveTemplate(tee, 'Black', 'sleeve_left').printArea.left).toBeGreaterThan(500); // wearer's left = viewer's right
  });
  test('live /blanks shape: colours carry templates[]; fitted areas keep our printfile shape centred', () => {
    const hat = { key: 'hat', colors: [{ name: 'Black', hex: '#181717', templates: [{ placement: 'embroidery_front', templateImage: 'https://files.cdn.printful.com/m/hat.png', backgroundColor: '#181717', templateWidth: 3000, templateHeight: 3000, printArea: { left: 751, top: 850, width: 1499, height: 656 }, printfile: { width: 1200, height: 525, dpi: 300 }, fitted: true }] }], placements: [{ key: 'embroidery_front', area: { width: 1200, height: 525, dpi: 300 } }] };
    const t = resolveTemplate(hat, 'Black', 'embroidery_front');
    expect(t.kind).toBe('printful');
    expect(t.printArea.width / t.printArea.height).toBeCloseTo(1200 / 525, 5);
    expect(t.printArea.left + t.printArea.width / 2).toBeCloseTo(751 + 1499 / 2, 5);
    expect(t.printArea.top + t.printArea.height / 2).toBeCloseTo(850 + 656 / 2, 5);
  });
  test('server templates are used exactly (template image on top by default)', () => {
    const withT = { ...tee, colors: [{ ...tee.colors[0], templates: { front: { templateImage: 'https://x/t.png', backgroundColor: '#141414', templateWidth: 1000, templateHeight: 1000, printArea: { left: 300, top: 200, width: 400, height: 533.33 } } } }] };
    const t = resolveTemplate(withT, 'Black', 'front');
    expect(t).toMatchObject({ kind: 'printful', width: 1000, height: 1000, image: 'https://x/t.png', imageOnTop: true, backgroundColor: '#141414' });
    expect(artScale(t).x).toBeCloseTo(400 / 1800, 4);
  });
  test('hats use the garment-only catalog photo for the front', () => {
    const hat = { key: 'hat', colors: [{ name: 'Navy', hex: '#1f2a44', image: 'https://files.cdn.printful.com/products/206/navy.jpg' }], placements: [{ key: 'embroidery_front', area: { width: 1200, height: 525, dpi: 300 } }, { key: 'embroidery_back', area: { width: 600, height: 300, dpi: 300 } }] };
    expect(resolveTemplate(hat, 'Navy', 'embroidery_front')).toMatchObject({ kind: 'photo', imageOnTop: false });
    expect(resolveTemplate(hat, 'Navy', 'embroidery_back').kind).toBe('silhouette');
  });
});

describe('fonts + add-on sizes', async () => {
  const { registerFonts, isFontKey, filterFonts, fontByKey } = await import('@/shop/studio/model');
  const { addonFontSize } = await import('@/shop/components/AddonsPanel');
  const { cleanLine, checkoutItems } = await import('@/shop/lib/cart');
  test('server fonts register with a Google Fonts CSS url; unknown keys never saved', () => {
    const all = registerFonts([{ key: 'bungee', family: 'Bungee', category: 'Display' }, { key: 'BAD KEY', family: 'X' }]);
    expect(isFontKey('bungee')).toBe(true);
    expect(isFontKey('BAD KEY')).toBe(false);
    expect(fontByKey('bungee').cssUrl).toBe('https://fonts.googleapis.com/css2?family=Bungee&display=swap');
    registerFonts([{ key: 'serif_x', label: 'DM Serif Italic', category: 'serif', cssFamily: "'DM Serif Display', serif", googleFamily: 'DM Serif Display:ital@1', weight: 400, style: 'italic' }]);
    expect(fontByKey('serif_x')).toMatchObject({ family: 'DM Serif Display', style: 'italic', cssUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&display=swap' });
    registerFonts([{ key: 'bungee', family: 'Bungee', category: 'Display' }, { key: 'BAD KEY', family: 'X' }]);
    expect(filterFonts(all, { category: 'display', query: 'bun' }).map((f) => f.key)).toEqual(['bungee']);
    expect(filterFonts(all, { category: 'mono' }).map((f) => f.key)).toEqual(['mono']);
    registerFonts([]);
  });
  test('add-on size → fontSize within the server range, kept through the cart', () => {
    const addon = { key: 'back', area: { width: 1800, height: 2400, dpi: 150 } };
    expect(addonFontSize(addon, 'm', 'HI')).toBe(480);
    expect(addonFontSize(addon, 'x', 'HI')).toBeUndefined();
    expect(addonFontSize({ key: 'k' }, 'm')).toBeUndefined();
    const line = cleanLine({ kind: 'listed', variantId: 5, quantity: 1, addons: [{ key: 'back', text: 'HI', font: 'anton', color: '#FFFFFF', fontSize: 480 }] });
    expect(checkoutItems([line])[0].addons[0]).toMatchObject({ key: 'back', fontSize: 480 });
  });
});

describe('review round: print correctness', async () => {
  const { clampToArea, rotatedBounds, validateDoc, fontsForPlacement, registerFonts, allFonts } = await import('@/shop/studio/model');
  const { addonFontSize, embroideryMinFontSize, toCartAddons } = await import('@/shop/components/AddonsPanel');
  const area = { width: 1800, height: 2400, dpi: 150 };
  test('rotation-aware clamp keeps the rotated box inside the print area', () => {
    const l = clampToArea({ id: 'r', type: 'image', x: 1500, y: 100, width: 600, height: 200, rotation: 45 }, area);
    const b = rotatedBounds(l);
    expect(b.minX).toBeGreaterThanOrEqual(-0.01); expect(b.maxX).toBeLessThanOrEqual(1800.01);
    expect(b.minY).toBeGreaterThanOrEqual(-0.01); expect(b.maxY).toBeLessThanOrEqual(2400.01);
    const big = clampToArea({ id: 'b', type: 'image', x: 0, y: 0, width: 3000, height: 3000, rotation: 30 }, area);
    const bb = rotatedBounds(big);
    expect(bb.maxX - bb.minX).toBeLessThanOrEqual(1800.5);
  });
  test('validateDoc flags a rotated layer poking out of the area', () => {
    const blank = { placements: [{ key: 'front', label: 'Front', area }] };
    const doc = { layers: { front: [{ id: 'x', type: 'image', x: 1650, y: 100, width: 300, height: 300, rotation: 45 }] } };
    expect(validateDoc(doc, blank).join(' ')).toMatch(/outside the print area/);
  });
  test('embroidery: stitchable min size, safe fonts only, Medium sent by default', () => {
    const emb = { key: 'embroidery_back', technique: 'EMBROIDERY', area: { width: 600, height: 300, dpi: 300 } };
    expect(embroideryMinFontSize(emb.area)).toBe(105);
    expect(addonFontSize(emb, 's', 'HI')).toBe(105);
    registerFonts([{ key: 'pacifico', label: 'Pacifico', category: 'script', cssFamily: "'Pacifico', cursive", googleFamily: 'Pacifico', embroiderySafe: false }, { key: 'archivo', embroiderySafe: true, cssFamily: "'Archivo Black'" }]);
    expect(fontsForPlacement(allFonts(), true).map((f) => f.key)).toEqual(['archivo']);
    expect(fontsForPlacement(allFonts(), false).length).toBeGreaterThan(1);
    registerFonts([]);
    const back = { key: 'back', label: 'Back', technique: 'DTG', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 900 };
    const r = toCartAddons([back], { back: { on: true, text: 'HI', color: '#FFFFFF' } }, []);
    expect(r.addons[0].fontSize).toBe(addonFontSize(back, 'm', 'HI'));
  });
});
