import { describe, it, expect } from 'vitest';
import { tabsOf, tableOf } from '@/shop/lib/sizeChart';

const t = (unit, mul = 1) => ({ rows: [{ label: 'Length', values: { S: String(28 * mul), M: String(29 * mul) } }, { label: 'Chest', values: { S: '34–37', M: '38–41' } }], image: `https://x/${unit}.png`, howTo: ['A Length'], notes: ['n'] });
const chart = { sizes: ['S', 'M', 'L'], oneSize: false, body: { in: t('in'), cm: t('cm', 2.5) }, garment: { in: t('in'), cm: null } };

describe('sizeChart', () => {
  it('lists tabs with data, body first', () => {
    expect(tabsOf(chart)).toEqual(['body', 'garment']);
    expect(tabsOf({ garment: { in: t('in'), cm: null } })).toEqual(['garment']);
    expect(tabsOf(null)).toEqual([]);
  });
  it('builds a table per unit with only sizes that have data', () => {
    const cm = tableOf(chart, 'body', 'cm');
    expect(cm.unit).toBe('cm');
    expect(cm.columns).toEqual(['Length', 'Chest']);
    expect(cm.rows.map((r) => r.size)).toEqual(['S', 'M']);
    expect(cm.rows[0].cells[0]).toBe('70');
  });
  it('falls back to the other unit when one is missing', () => {
    const g = tableOf(chart, 'garment', 'cm');
    expect(g.unit).toBe('in');
    expect(tableOf(chart, 'body', 'in').image).toBe('https://x/in.png');
    expect(tableOf(chart, 'nope', 'in')).toBeNull();
  });
});
