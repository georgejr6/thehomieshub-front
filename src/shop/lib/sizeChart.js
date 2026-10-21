// Turns the backend's product.sizeChart (real Printful tables, see backend
// utils/merch/sizeCharts.js) into what the size guide renders.

export const TAB_LABEL = { body: 'Body', garment: 'Garment' };

const has = (t) => !!t?.rows?.length;

/** Units present for a tab. */
export function unitsOf(chart, tab) {
  return ['in', 'cm'].filter((u) => has(chart?.[tab]?.[u]));
}

/** Tabs that have data, body (what to measure on yourself) first. */
export function tabsOf(chart) {
  return ['body', 'garment'].filter((t) => unitsOf(chart, t).length);
}

/** One table: columns = measurements, rows = sizes. Falls back to the other unit if one is missing. */
export function tableOf(chart, tab, unit) {
  const slot = chart?.[tab];
  const used = has(slot?.[unit]) ? unit : unit === 'in' ? 'cm' : 'in';
  const t = slot?.[used];
  if (!has(t)) return null;
  const sizes = (chart.sizes || []).filter((s) => t.rows.some((r) => r.values?.[s]));
  if (!sizes.length) return null;
  return {
    unit: used,
    columns: t.rows.map((r) => r.label),
    rows: sizes.map((s) => ({ size: s, cells: t.rows.map((r) => r.values?.[s] || '–') })),
    image: t.image || slot?.in?.image || slot?.cm?.image || null,
    howTo: t.howTo || [],
    notes: t.notes || [],
  };
}
