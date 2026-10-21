import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SizeGuide from '@/shop/components/SizeGuide';

const tbl = (mul) => ({ rows: [{ label: 'Chest', values: { S: String(34 * mul), M: String(38 * mul) } }], image: 'https://files.cdn.printful.com/d.png', howTo: ['B Chest'], notes: ['Provided by suppliers.'] });
const chart = { sizes: ['S', 'M'], oneSize: false, body: { in: tbl(1), cm: tbl(2) }, garment: { in: tbl(1), cm: tbl(2) } };

describe('SizeGuide', () => {
  it('renders the chart, toggles units and tabs', () => {
    render(<SizeGuide open onClose={() => {}} kind="tee" chart={chart} />);
    expect(screen.getByText('Chest (in)')).toBeTruthy();
    fireEvent.click(screen.getByText('cm'));
    expect(screen.getByText('Chest (cm)')).toBeTruthy();
    expect(screen.getByText('76')).toBeTruthy();
    expect(screen.getByText('Garment')).toBeTruthy();
    expect(screen.getByAltText('Body measuring diagram')).toBeTruthy();
  });
  it('hats say one size', () => {
    render(<SizeGuide open onClose={() => {}} kind="hat" chart={{ ...chart, oneSize: true, sizes: ['One size'], body: null, garment: { in: { ...tbl(1), rows: [{ label: 'A', values: { 'One size': '20.5–24.4' } }] }, cm: null } }} />);
    expect(screen.getByText(/One size fits most/)).toBeTruthy();
  });
  it('falls back without a chart', () => {
    render(<SizeGuide open onClose={() => {}} kind="jogger" chart={null} />);
    expect(screen.getByText(/true to size/)).toBeTruthy();
  });
});
