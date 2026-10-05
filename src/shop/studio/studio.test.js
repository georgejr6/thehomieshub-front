import { describe, test, expect } from 'vitest';
import { historyReducer } from '@/shop/studio/useHistory';
import { newDoc, makeTextLayer, makeImageLayer, clampToArea, snapToCenter, usedPlacements, validateDoc, minEmbroideryFontSize, THREADS } from '@/shop/studio/model';
import { toCartAddons } from '@/shop/components/AddonsPanel';

const tee = {
  key: 'tee', basePriceCents: 3300, colors: [{ name: 'Black', hex: '#111' }],
  placements: [
    { key: 'front', label: 'Front', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 0 },
    { key: 'back', label: 'Back', technique: 'dtg', area: { width: 1800, height: 2400, dpi: 150 }, priceCents: 900 },
  ],
};
const hat = { key: 'hat', colors: [{ name: 'Black' }], placements: [{ key: 'embroidery_front', label: 'Front', technique: 'embroidery', area: { width: 1200, height: 525, dpi: 300 } }] };

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
    const good = { blankKey: 'hat', color: 'Black', layers: { embroidery_front: [{ ...makeTextLayer(p, { text: 'HOMIE', color: THREADS[0].hex }) }] } };
    expect(validateDoc(good, hat)).toEqual([]);
    expect(usedPlacements(good)).toEqual(['embroidery_front']);
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

describe('add-ons → cart', () => {
  const addons = [
    { key: 'back', label: 'Back print', kind: 'text_or_art', technique: 'dtg', priceCents: 900 },
    { key: 'chest_name', label: 'Left-chest name', kind: 'text', technique: 'embroidery', priceCents: 1200 },
  ];
  test('off add-ons are ignored; text is required when on', () => {
    expect(toCartAddons(addons, {}, 'vamos')).toEqual({ addons: [], error: null });
    expect(toCartAddons(addons, { chest_name: { on: true, text: '  ' } }, 'vamos').error).toMatch(/Add your text/);
  });
  test('same-design back print + embroidered name', () => {
    const r = toCartAddons(addons, { back: { on: true }, chest_name: { on: true, text: 'Big Homie', color: 'gold' } }, 'vamos');
    expect(r.addons).toEqual([
      { key: 'back', label: 'Back print', designId: 'vamos', priceCents: 900 },
      { key: 'chest_name', label: 'Left-chest name', text: 'Big Homie', font: 'archivo', color: 'gold', priceCents: 1200 },
    ]);
  });
});
