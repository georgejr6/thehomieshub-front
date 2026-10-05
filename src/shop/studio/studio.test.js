import { describe, test, expect } from 'vitest';
import { historyReducer } from '@/shop/studio/useHistory';
import { newDoc, makeTextLayer, makeImageLayer, clampToArea, snapToCenter, usedPlacements, validateDoc, minEmbroideryFontSize, threadsOf, clampText, withFontSize, serverLayers, placementAllowed, defaultThread } from '@/shop/studio/model';
import { customPriceCents } from '@/shop/lib/pricing';
import { toCartAddons } from '@/shop/components/AddonsPanel';

const tee = {
  key: 'tee', basePriceCents: 3300, colors: [{ name: 'Black', hex: '#111' }],
  placements: [
    { key: 'front', label: 'Front', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 0 },
    { key: 'back', label: 'Back', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 900 },
  ],
};
const THREADS = [{ hex: '#FFFFFF', name: 'White' }, { hex: '#000000', name: 'Black' }, { hex: 'nope', name: 'Bad' }];
const NL = String.fromCharCode(10);
const hat = { key: 'hat', colors: [{ name: 'Black' }], threadColors: THREADS, placements: [{ key: 'embroidery_front', label: 'Front', technique: 'EMBROIDERY', area: { width: 1200, height: 525, dpi: 300 } }] };
const hoodie = {
  key: 'hoodie', colors: [{ name: 'Black' }], threadColors: THREADS,
  placements: [
    { key: 'front', label: 'Front', technique: 'DTG', area: { width: 1800, height: 1800, dpi: 150 }, included: true, priceCents: 0 },
    { key: 'embroidery_chest_left', label: 'Chest', technique: 'EMBROIDERY', area: { width: 1200, height: 1200, dpi: 300 }, included: false, priceCents: 500 },
  ],
};

describe('studio model', () => {
  test('new doc has an empty layer list per placement', () => {
    expect(newDoc(tee, 'Black')).toEqual({ blankKey: 'tee', color: 'Black', layers: { front: [], back: [] } });
  });
  test('image layers stay sharp and inside the area', () => {
    const l = makeImageLayer(tee.placements[0], { src: 'https://x/a.png', naturalWidth: 1200, naturalHeight: 600 });
    expect(l.width).toBeLessThanOrEqual(1200); // ≥150 dpi at 150 dpi area → ≤ natural px
    expect(l.x + l.width).toBeLessThanOrEqual(1800);
    expect(l.height / l.width).toBeCloseTo(0.5, 1);
  });
  test('clamp + snap', () => {
    const a = tee.placements[0].area;
    expect(clampToArea({ x: -50, y: 2300, width: 400, height: 400 }, a)).toEqual({ x: 0, y: 2000, width: 400, height: 400 });
    const s = snapToCenter({ x: 705, y: 100, width: 400, height: 100 }, a, 10);
    expect(s.x).toBe(700);
    expect(s.guides).toEqual(['v']);
  });
  test('embroidery text uses the heavy font and a stitchable size', () => {
    const l = makeTextLayer(hat.placements[0], { text: 'HOMIE', color: '#ffffff' });
    expect(l.font).toBe('archivo');
    expect(l.fontSize).toBeGreaterThanOrEqual(minEmbroideryFontSize(hat.placements[0].area));
  });
  test('validateDoc catches empty designs, uploads on embroidery, tiny letters, wrong thread', () => {
    expect(validateDoc(newDoc(tee), tee)[0]).toMatch(/Add some text/);
    const p = hat.placements[0];
    const bad = { blankKey: 'hat', color: 'Black', layers: { embroidery_front: [
      { id: 'a', type: 'image', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', type: 'text', text: 'A\nB\nC', fontSize: 20, color: '#123456', x: 0, y: 0, width: 50, height: 50 },
    ] } };
    const issues = validateDoc(bad, hat).join(' | ');
    expect(issues).toMatch(/text only/);
    expect(issues).toMatch(/2 lines/);
    expect(issues).toMatch(/too small/);
    expect(issues).toMatch(/thread/);
    const good = { blankKey: 'hat', color: 'Black', layers: { embroidery_front: [{ ...makeTextLayer(p, { text: 'HOMIE', color: threadsOf(hat)[0].hex }) }] } };
    expect(validateDoc(good, hat)).toEqual([]);
    expect(usedPlacements(good)).toEqual(['embroidery_front']);
  });
  test('thread palette comes from the blank (invalid hex dropped); default thread reads on the garment', () => {
    expect(threadsOf(hat).map((t) => t.hex)).toEqual(['#FFFFFF', '#000000']);
    expect(threadsOf({})).toEqual([]);
    expect(defaultThread(hat, 'Black')).toBe('#FFFFFF');
    expect(defaultThread({}, 'Black')).toBe('');
  });
  test('text is limited to 2 lines and 80 characters', () => {
    expect(clampText(['a', 'b', 'c'].join(NL))).toBe(['a', 'b'].join(NL));
    expect(clampText('x'.repeat(120))).toHaveLength(80);
  });
  test('font size is derived from box height when the server did not store it', () => {
    expect(withFontSize({ type: 'text', text: 'ONE', height: 210 }).fontSize).toBe(200);
    expect(withFontSize({ type: 'text', text: ['A', 'B'].join(NL), height: 210 }).fontSize).toBe(100);
    expect(withFontSize({ type: 'text', text: 'X', height: 210, fontSize: 64 }).fontSize).toBe(64);
  });
  test('serverLayers keeps only stored fields and drops empty placements', () => {
    const out = serverLayers({
      front: [{ id: 'a', type: 'image', src: 'https://x/a.png', x: 1.4, y: 2.6, width: 100, height: 50, rotation: 0, naturalWidth: 2000, naturalHeight: 1000, name: 'a.png', junk: 1 }],
      back: [],
      sleeve_left: [{ id: 'b', type: 'text', text: 'hi', font: 'bowlby', color: '#ffcc00', x: 0, y: 0, width: 10, height: 10, rotation: 12.345, fontSize: 40 }],
    });
    expect(Object.keys(out)).toEqual(['front', 'sleeve_left']);
    expect(out.front[0]).toEqual({ id: 'a', type: 'image', src: 'https://x/a.png', x: 1, y: 3, width: 100, height: 50, rotation: 0, naturalWidth: 2000, naturalHeight: 1000, name: 'a.png' });
    expect(out.sleeve_left[0]).toMatchObject({ font: 'anton', color: '#FFCC00', rotation: 12.35, fontSize: 40 });
  });
  test('embroidered and printed spots never mix', () => {
    const text = makeTextLayer(hoodie.placements[0], { text: 'HI', color: '#FFFFFF' });
    const doc = { blankKey: 'hoodie', color: 'Black', layers: { front: [text], embroidery_chest_left: [] } };
    expect(placementAllowed(doc, hoodie, hoodie.placements[1])).toBe(false);
    expect(placementAllowed(doc, hoodie, hoodie.placements[0])).toBe(true);
    const mixed = { ...doc, layers: { front: [text], embroidery_chest_left: [makeTextLayer(hoodie.placements[1], { text: 'HI', color: '#FFFFFF' })] } };
    expect(validateDoc(mixed, hoodie).join(' ')).toMatch(/can't be combined/);
  });
  test('price = chosen variant (size) + extra, non-included spots', () => {
    const blank = { basePriceCents: 1900, placements: [{ key: 'front', included: true, priceCents: 0 }, { key: 'back', included: false, priceCents: 900 }] };
    expect(customPriceCents(blank, ['front'], { priceCents: 2100 })).toBe(2100);
    expect(customPriceCents(blank, ['front', 'back'], { priceCents: 2100 })).toBe(3000);
    expect(customPriceCents(blank, ['back'])).toBe(2800);
  });
});

describe('history', () => {
  test('commit / undo / redo; identical commits are ignored', () => {
    let h = { past: [], present: 1, future: [] };
    h = historyReducer(h, { type: 'commit', state: 2 });
    h = historyReducer(h, { type: 'commit', state: 2 });
    h = historyReducer(h, { type: 'commit', state: 3 });
    expect(h.past).toEqual([1, 2]);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toBe(2);
    h = historyReducer(h, { type: 'redo' });
    expect(h.present).toBe(3);
    h = historyReducer(h, { type: 'undo' });
    h = historyReducer(h, { type: 'commit', state: 9 });
    expect(h.future).toEqual([]);
  });
});

describe('add-ons -> cart', () => {
  const addons = [
    { key: 'back', label: 'Back print', kind: 'text_or_art', technique: 'DTG', priceCents: 900 },
    { key: 'embroidery_chest_left', label: 'Left-chest name', kind: 'text', technique: 'EMBROIDERY', priceCents: 500 },
  ];
  test('off add-ons are ignored; text is required when on', () => {
    expect(toCartAddons(addons, {}, THREADS)).toEqual({ addons: [], error: null });
    expect(toCartAddons(addons, { embroidery_chest_left: { on: true, text: '  ' } }, THREADS).error).toMatch(/Add your text/);
  });
  test('text back print + embroidered name: hex colours, heavy font for thread', () => {
    const r = toCartAddons(addons, { back: { on: true, text: 'VAMOS', font: 'bebas', color: '#f0b94d' }, embroidery_chest_left: { on: true, text: 'Big Homie', color: '#000000' } }, THREADS);
    expect(r.error).toBeNull();
    expect(r.addons).toEqual([
      { key: 'back', label: 'Back print', text: 'VAMOS', font: 'bebas', color: '#F0B94D', priceCents: 900 },
      { key: 'embroidery_chest_left', label: 'Left-chest name', text: 'Big Homie', font: 'archivo', color: '#000000', priceCents: 500 },
    ]);
  });
  test('embroidery needs a thread palette', () => {
    expect(toCartAddons(addons, { embroidery_chest_left: { on: true, text: 'Hi' } }, []).error).toMatch(/colour/);
  });
});
