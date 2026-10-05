import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { usd, addonDelta, unitCents, lineTotalCents, subtotalCents, priceFrom, customPriceCents } from '@/shop/lib/pricing';
import { sanitizeCart, addLine, setQty, updateAddons, checkoutItems, needsApproval, migrateV1, lineKey, pruneUnavailable, MAX_LINES, MAX_QTY } from '@/shop/lib/cart';
import { effectiveDpi, dpiStatus, maxWidthForDpi, inchesLabel } from '@/shop/lib/dpi';
import { createAutosaver } from '@/shop/lib/autosave';
import { lookupSlug, families, productImage, productAltImage, filterProducts, kindOf } from '@/shop/lib/catalog';
import { DESIGNS } from '@/shop/data/designs';

describe('pricing display', () => {
  test('usd drops cents on whole dollars', () => {
    expect(usd(7000)).toBe('$70');
    expect(usd(1499)).toBe('$14.99');
    expect(usd(undefined)).toBe('$0');
  });
  test('add-on delta', () => {
    expect(addonDelta(900)).toBe('+$9');
    expect(addonDelta(0)).toBe('Included');
  });
  test('line totals include add-ons × quantity', () => {
    const line = { priceCents: 7000, quantity: 2, addons: [{ priceCents: 900 }, { priceCents: 1200 }] };
    expect(unitCents(line)).toBe(9100);
    expect(lineTotalCents(line)).toBe(18200);
    expect(subtotalCents([line, { priceCents: 3500, quantity: 1, addons: [] }])).toBe(21700);
  });
  test('priceFrom', () => {
    expect(priceFrom([7000, 7000])).toBe('$70');
    expect(priceFrom([7000, 8500])).toBe('From $70');
    expect(priceFrom([])).toBe('');
  });
  test('custom price = base + used extra placements only', () => {
    const blank = { basePriceCents: 3300, placements: [{ key: 'front', priceCents: 0 }, { key: 'back', priceCents: 900 }, { key: 'sleeve_left', priceCents: 900 }] };
    expect(customPriceCents(blank, ['front'])).toBe(3300);
    expect(customPriceCents(blank, ['front', 'back'])).toBe(4200);
    expect(customPriceCents(blank, ['back', 'sleeve_left'])).toBe(5100);
    expect(customPriceCents({ ...blank, placements: blank.placements.map((p) => ({ ...p, included: p.key === 'back' })) }, ['back'])).toBe(3300);
    expect(customPriceCents(null, ['front'])).toBe(0);
  });
});

describe('cart reducer', () => {
  const tee = { kind: 'listed', variantId: 11, quantity: 1, priceCents: 7000, name: 'Tee', addons: [] };
  test('same product + same add-ons merge; different add-ons are separate lines', () => {
    let c = addLine([], tee).cart;
    c = addLine(c, tee).cart;
    expect(c).toHaveLength(1);
    expect(c[0].quantity).toBe(2);
    c = addLine(c, { ...tee, addons: [{ key: 'back', label: 'Back print', text: 'MEDELLÍN', priceCents: 900 }] }).cart;
    expect(c).toHaveLength(2);
  });
  test('quantity caps and removal', () => {
    let c = addLine([], { ...tee, quantity: 9 }).cart;
    c = addLine(c, { ...tee, quantity: 5 }).cart;
    expect(c[0].quantity).toBe(MAX_QTY);
    expect(setQty(c, c[0].key, 0)).toEqual([]);
  });
  test('max lines', () => {
    let c = [];
    for (let i = 1; i <= MAX_LINES; i++) c = addLine(c, { ...tee, variantId: i }).cart;
    const r = addLine(c, { ...tee, variantId: 999 });
    expect(r.error).toMatch(/Max/);
    expect(r.cart).toHaveLength(MAX_LINES);
  });
  test('rejects invalid lines and bad custom design ids', () => {
    expect(sanitizeCart([{ variantId: 'x', quantity: 1 }, { kind: 'custom', designId: '../x', variantId: 3, quantity: 1 }, null])).toEqual([]);
  });
  test('updateAddons re-keys and merges into an identical line', () => {
    const withBack = { ...tee, addons: [{ key: 'back', label: 'Back', text: 'A', priceCents: 900 }] };
    let c = addLine(addLine([], tee).cart, withBack).cart;
    c = updateAddons(c, c[1].key, []);
    expect(c).toHaveLength(1);
    expect(c[0].quantity).toBe(2);
  });
  test('checkout body never carries prices', () => {
    const c = addLine(addLine([], { ...tee, addons: [{ key: 'back', label: 'Back', text: 'HI', font: 'anton', color: 'white', priceCents: 900 }] }).cart,
      { kind: 'custom', designId: 'abc12345', variantId: 4001, quantity: 1, priceCents: 3300 }).cart;
    const body = checkoutItems(c);
    expect(body[0]).toEqual({ kind: 'listed', variantId: 11, quantity: 1, addons: [{ key: 'back', text: 'HI', font: 'anton', color: 'white', designId: undefined }] });
    expect(body[1]).toEqual({ kind: 'custom', designId: 'abc12345', variantId: 4001, quantity: 1 });
    expect(JSON.stringify(body)).not.toMatch(/priceCents/);
    expect(needsApproval(c)).toBe(true);
    expect(needsApproval(addLine([], tee).cart)).toBe(false);
  });
  test('v1 carts migrate to listed lines', () => {
    const m = migrateV1([{ variantId: 5, quantity: 2, name: 'Old', priceCents: 7000 }]);
    expect(m[0]).toMatchObject({ kind: 'listed', variantId: 5, quantity: 2, addons: [] });
    expect(m[0].key).toBe(lineKey(m[0]));
  });
  test('pruneUnavailable keeps custom lines', () => {
    const c = addLine(addLine([], tee).cart, { kind: 'custom', designId: 'abc12345', variantId: 4001, quantity: 1 }).cart;
    const { kept, removed } = pruneUnavailable(c, [{ variants: [{ id: 99, available: true }] }]);
    expect(removed).toHaveLength(1);
    expect(kept[0].kind).toBe('custom');
  });
});

describe('dpi', () => {
  test('effective dpi from image pixels over printed size', () => {
    // 3000px image drawn 1500 printfile px wide at 150dpi = 10" → 300 dpi
    expect(effectiveDpi({ naturalWidth: 3000, naturalHeight: 3000, layerWidth: 1500, layerHeight: 1500, areaDpi: 150 })).toBe(300);
    expect(effectiveDpi({ naturalWidth: 800, naturalHeight: 800, layerWidth: 1500, layerHeight: 1500, areaDpi: 150 })).toBe(80);
    expect(effectiveDpi({ naturalWidth: 0, naturalHeight: 10, layerWidth: 1, layerHeight: 1 })).toBe(0);
  });
  test('status thresholds', () => {
    expect(dpiStatus(150)).toBe('good');
    expect(dpiStatus(120)).toBe('warn');
    expect(dpiStatus(99)).toBe('bad');
  });
  test('max sharp width + inches label', () => {
    expect(maxWidthForDpi(3000, 150)).toBe(3000);
    expect(maxWidthForDpi(1200, 150)).toBe(1200);
    expect(inchesLabel(1800, 2400, 150)).toBe('12.0" × 16.0"');
  });
});

describe('autosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

  test('writes locally at once, saves to the server once after the quiet period', async () => {
    const save = vi.fn().mockResolvedValue();
    const storage = mem();
    const s = createAutosaver({ storageKey: 'k', save, delay: 5000, storage });
    s.schedule({ a: 1 }); s.schedule({ a: 2 }); s.schedule({ a: 3 });
    expect(JSON.parse(storage.getItem('k')).state).toEqual({ a: 3 });
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ a: 3 });
  });
  test('unchanged state is not re-sent; flush saves immediately', async () => {
    const save = vi.fn().mockResolvedValue();
    const s = createAutosaver({ storageKey: 'k', save, delay: 5000, storage: mem() });
    s.schedule({ a: 1 });
    await s.flush();
    expect(save).toHaveBeenCalledTimes(1);
    s.schedule({ a: 1 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });
  test('a failed save is retried on the next tick', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue();
    const statuses = [];
    const s = createAutosaver({ storageKey: 'k', save, delay: 1000, storage: mem(), onStatus: (x) => statuses.push(x) });
    s.schedule({ a: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(statuses).toContain('error');
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('saved');
  });
  test('loadLocal survives garbage', () => {
    const storage = mem(); storage.setItem('k', '{not json');
    expect(createAutosaver({ storageKey: 'k', storage }).loadLocal()).toBeNull();
  });
});

describe('catalog', () => {
  test('every design slug maps back', () => {
    for (const d of DESIGNS) for (const [kind, slug] of Object.entries(d.slugs)) expect(lookupSlug(slug)).toEqual({ design: d, kind });
  });
  test('families group tee/hoodie/hat of one phrase', () => {
    const products = [
      { slug: 'gringo-go-home-tee', name: 'Gringo Go Home Tee', minPriceCents: 7000, variants: [] },
      { slug: 'gringo-go-home-dad-hat', name: 'Gringo Go Home Dad Hat', minPriceCents: 7000, variants: [] },
      { slug: 'vamos-tee', name: 'Vamos Tee', minPriceCents: 7000, variants: [] },
    ];
    const f = families(products);
    expect(f).toHaveLength(2);
    expect(Object.keys(f[0].products).sort()).toEqual(['hat', 'tee']);
    expect(f[0].collections).toContain('hats');
    expect(filterProducts(products, { kind: 'hat' })).toHaveLength(1);
    expect(kindOf(products[1])).toBe('hat');
  });
  test('images come from the API: per-colour variant render, never mockup composites', () => {
    const p = {
      thumbnail: 'https://files.cdn.printful.com/',
      images: ['https://printful-upload.s3-accelerate.amazonaws.com/tmp/x/front.jpg'],
      variants: [
        { color: 'White', image: 'https://files.cdn.printful.com/files/aaa/white_preview.png' },
        { color: 'Black', image: 'https://files.cdn.printful.com/files/bbb/black_preview.png' },
      ],
    };
    expect(productImage(p, 'Black')).toMatch(/black_preview/);
    expect(productImage(p, 'White')).toMatch(/white_preview/);
    expect(productAltImage(p, 'White')).toMatch(/black_preview/);
    expect(productImage(p, 'Faded Black')).toBe(''); // never another colour's render
    expect(productImage({ thumbnail: 'https://files.cdn.printful.com/', variants: [] })).toBe('');
    expect(productImage({ images: ['https://printful-upload.s3-accelerate.amazonaws.com/tmp/x/a.jpg'], variants: [] })).toMatch(/tmp/);
    expect(JSON.stringify([productImage(p), productAltImage(p)])).not.toMatch(/merch\/v1\/mockups/);
  });
});
