// Display-only price helpers. The server always re-prices at checkout
// (homieshub-backend docs/MERCH_V2_SPEC.md); these just keep the UI honest.

export const usd = (cents) => {
  const n = Math.round(Number(cents) || 0);
  const dollars = n / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
};

/** "+$9" for an add-on delta, "Included" for 0. */
export const addonDelta = (cents) => (Number(cents) > 0 ? `+${usd(cents)}` : 'Included');

export const addonsTotal = (addons = []) => addons.reduce((n, a) => n + (Number.isInteger(a?.priceCents) ? a.priceCents : 0), 0);

/** One unit of a cart line: base price + its add-ons. */
export const unitCents = (line) => (Number.isInteger(line?.priceCents) ? line.priceCents : 0) + addonsTotal(line?.addons);

export const lineTotalCents = (line) => unitCents(line) * Math.max(0, Math.floor(Number(line?.quantity) || 0));

export const subtotalCents = (lines = []) => lines.reduce((n, l) => n + lineTotalCents(l), 0);

/** "From $70" / "$70" for a set of variants or products. */
export function priceFrom(values = []) {
  const nums = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!nums.length) return '';
  const lo = Math.min(...nums); const hi = Math.max(...nums);
  return lo === hi ? usd(lo) : `From ${usd(lo)}`;
}

/** A placement is included in the base price when the API says so (else: the first one). */
export const placementIncluded = (blank, p) => (typeof p?.included === 'boolean' ? p.included : blank?.placements?.[0]?.key === p?.key);

/**
 * Studio price for one piece: the chosen variant's price (front-only custom
 * price, varies by size) + every extra, non-included placement that has art.
 */
export function customPriceCents(blank, usedPlacements = [], variant = null) {
  if (!blank) return 0;
  const base = Number.isInteger(variant?.priceCents) ? variant.priceCents : (Number.isInteger(blank.basePriceCents) ? blank.basePriceCents : 0);
  const extra = (blank.placements || [])
    .filter((p) => usedPlacements.includes(p.key) && !placementIncluded(blank, p))
    .reduce((n, p) => n + (Number.isInteger(p.priceCents) ? p.priceCents : 0), 0);
  return base + extra;
}
