import { describe, expect, it } from 'vitest';
import {
  sanitizeCart, addLine, setLineQty, cartCount, cartSubtotal, checkoutItems, optionsFor, findVariant, sizeAvailable,
  defaultVariant, variantLabel, usd, MAX_LINES, MAX_QTY,
} from './merch';

const line = (variantId, quantity = 1, extra = {}) => ({ variantId, quantity, name: `Item ${variantId}`, priceCents: 5500, ...extra });

describe('cart', () => {
  it('sanitizeCart drops junk, merges duplicates, caps quantity and lines', () => {
    expect(sanitizeCart(null)).toEqual([]);
    const c = sanitizeCart([line(1, 2), line(1, 3), { variantId: 'x' }, { variantId: 2, quantity: 0 }, line(3, 99)]);
    expect(c.map((l) => [l.variantId, l.quantity])).toEqual([[1, 5], [3, MAX_QTY]]);
    expect(sanitizeCart(Array.from({ length: 15 }, (_, i) => line(i + 1)))).toHaveLength(MAX_LINES);
  });

  it('sanitizeCart only keeps https images', () => {
    expect(sanitizeCart([line(1, 1, { image: 'javascript:alert(1)' })])[0].image).toBe('');
    expect(sanitizeCart([line(1, 1, { image: 'https://cdn/x.png' })])[0].image).toBe('https://cdn/x.png');
  });

  it('addLine merges into an existing line and refuses an 11th distinct item', () => {
    let { cart } = addLine([], line(1));
    ({ cart } = addLine(cart, line(1, 2)));
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
    const full = Array.from({ length: MAX_LINES }, (_, i) => line(i + 1));
    const r = addLine(full, line(99));
    expect(r.error).toMatch(/Max/);
    expect(r.cart).toBe(full);
  });

  it('setLineQty removes at 0 and caps at MAX_QTY', () => {
    const cart = [line(1, 2), line(2, 1)];
    expect(setLineQty(cart, 1, 0).map((l) => l.variantId)).toEqual([2]);
    expect(setLineQty(cart, 1, 50)[0].quantity).toBe(MAX_QTY);
  });

  it('totals and checkout payload carry only ids + quantities', () => {
    const cart = [line(1, 2), line(2, 1, { priceCents: 3000 })];
    expect(cartCount(cart)).toBe(3);
    expect(cartSubtotal(cart)).toBe(14000);
    expect(checkoutItems(cart)).toEqual([{ variantId: 1, quantity: 2 }, { variantId: 2, quantity: 1 }]);
  });
});

describe('variants', () => {
  const variants = [
    { id: 1, color: 'Black', size: 'L', priceCents: 5500, available: true },
    { id: 2, color: 'Black', size: 'S', priceCents: 5500, available: false },
    { id: 3, color: 'White', size: 'M', priceCents: 5500, available: true },
    { id: 4, color: 'White', size: '2XL', priceCents: 6000, available: true },
  ];

  it('optionsFor lists colors and sizes in shopper order', () => {
    expect(optionsFor(variants)).toEqual({ colors: ['Black', 'White'], sizes: ['S', 'M', 'L', '2XL'] });
  });

  it('findVariant / sizeAvailable / defaultVariant', () => {
    expect(findVariant(variants, 'White', 'M').id).toBe(3);
    expect(findVariant(variants, 'Black', 'M')).toBeNull();
    expect(sizeAvailable(variants, 'Black', 'S')).toBe(false);
    expect(sizeAvailable(variants, 'Black', 'L')).toBe(true);
    expect(defaultVariant([{ ...variants[1] }, variants[2]]).id).toBe(3);
    expect(defaultVariant([])).toBeNull();
  });

  it('works for products without size/color options', () => {
    const one = [{ id: 9, color: '', size: '', priceCents: 1500, available: true }];
    expect(optionsFor(one)).toEqual({ colors: [], sizes: [] });
    expect(findVariant(one, '', '').id).toBe(9);
  });

  it('labels and money', () => {
    expect(variantLabel({ color: 'Black', size: 'L' })).toBe('Black / L');
    expect(variantLabel({ color: '', size: 'L' })).toBe('L');
    expect(usd(5500)).toBe('$55.00');
  });
});
