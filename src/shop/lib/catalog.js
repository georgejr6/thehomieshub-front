import { DESIGNS } from '@/shop/data/designs';

// Shop catalog helpers: tie live Printful products (/merch/products) back to
// their design (phrase, collections) so the shop can group a design's tee /
// hoodie / hat. Images always come from the API (Printful ghost/flat renders).

export const MEDIA = 'https://homieshub-media.nyc3.cdn.digitaloceanspaces.com/merch/v1';

export const COLLECTIONS = [
  { key: 'must', label: 'Must-Haves', blurb: 'The ones the chat keeps asking for.' },
  { key: 'travel', label: 'Travel', blurb: 'Passport stamped. Colombia, Brazil, repeat.' },
  { key: 'espanol', label: 'Español', blurb: 'Dame plata, baby.' },
  { key: 'homies', label: 'The Homies', blurb: 'Straight from the streams.' },
  { key: 'hats', label: 'Hats', blurb: 'Embroidered dad hats.' },
];

export const KIND_LABEL = { tee: 'Tee', hoodie: 'Hoodie', hat: 'Dad Hat' };
export const KINDS = ['tee', 'hoodie', 'hat'];

const bySlug = new Map();
for (const d of DESIGNS) for (const [kind, slug] of Object.entries(d.slugs)) bySlug.set(slug, { design: d, kind });

/** { design, kind } for a product slug, or null for products not in the generated catalog. */
export const lookupSlug = (slug) => bySlug.get(slug) || null;

export function kindOf(product) {
  const hit = lookupSlug(product?.slug);
  if (hit) return hit.kind;
  const n = String(product?.name || '').toLowerCase();
  if (/\bhat\b|\bcap\b/.test(n)) return 'hat';
  if (/hoodie|sweatshirt|crewneck/.test(n)) return 'hoodie';
  return 'tee';
}

const LIGHT = new Set(['white', 'athletic heather', 'ash', 'bone', 'heather grey', 'sport grey', 'khaki', 'natural']);
export const isLightColor = (c) => LIGHT.has(String(c || '').toLowerCase());

/** Flat artwork (transparent PNG, no garment) — Studio art picker + product close-up only. */
export const artUrl = (designId, ink = 'black') => (designId ? `${MEDIA}/print/${designId}__${ink}.png` : '');

// Product images come ONLY from the API: Printful's garment-only ghost/flat
// render per variant (variant.image = the variant's preview file), else the
// product thumbnail/images. Never on-model photos. `printful-upload` tmp URLs
// are mockup-task results that expire, so they're the last resort.
const good = (u) => typeof u === 'string' && /^https:\/\/[^\s]+\.(png|jpe?g|webp)(\?|$)/i.test(u);
const lasting = (u) => good(u) && !/printful-upload\.s3/.test(u);

/** Best garment image for a product in a colour ('' = none yet → show the silhouette placeholder). */
export function productImage(product, color) {
  const vs = product?.variants || [];
  const exact = color ? vs.filter((v) => v.color === color) : [];
  const cands = [...exact.map((v) => v.image), ...vs.map((v) => v.image), product?.thumbnail, ...(product?.images || [])];
  return cands.find(lasting) || cands.find(good) || '';
}

/** Image for the opposite colourway (hover swap on cards), or ''. */
export function productAltImage(product, color) {
  const vs = product?.variants || [];
  const first = color || vs[0]?.color;
  const other = vs.find((v) => v.color !== first && isLightColor(v.color) !== isLightColor(first) && lasting(v.image))
    || vs.find((v) => v.color !== first && lasting(v.image));
  const main = productImage(product, first);
  return other && other.image !== main ? other.image : '';
}

export const hasImage = (product) => !!productImage(product);

/** Distinct colourways that have their own image, for galleries. */
export function colorImages(product) {
  const seen = new Map();
  for (const v of product?.variants || []) if (lasting(v.image) && !seen.has(v.color)) seen.set(v.color, v.image);
  return [...seen].map(([color, src]) => ({ color, src }));
}

export const displayName = (product) => lookupSlug(product?.slug)?.design.phrase || product?.name || '';

/** Group products into design families: [{ design, phrase, products: {tee, hoodie, hat}, minPriceCents, collections }]. */
export function families(products = []) {
  const map = new Map();
  for (const p of products) {
    const hit = lookupSlug(p.slug);
    const key = hit ? hit.design.id : `p:${p.slug}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        design: hit?.design || null,
        phrase: hit?.design.phrase || p.name,
        products: {},
        collections: hit ? [...hit.design.collections] : [],
        minPriceCents: Infinity,
        soldOut: true,
      });
    }
    const f = map.get(key);
    f.products[kindOf(p)] = p;
    f.minPriceCents = Math.min(f.minPriceCents, p.minPriceCents || Infinity);
    if (!p.soldOut) f.soldOut = false;
  }
  const order = new Map(DESIGNS.map((d, i) => [d.id, i]));
  return [...map.values()]
    .map((f) => ({ ...f, minPriceCents: Number.isFinite(f.minPriceCents) ? f.minPriceCents : 0, collections: f.products.hat ? [...f.collections, 'hats'] : f.collections }))
    .sort((a, b) => (order.get(a.design?.id) ?? 999) - (order.get(b.design?.id) ?? 999));
}

/** Products (not families) matching a filter chip and search query. */
export function filterProducts(products = [], { kind = 'all', query = '', collection = '' } = {}) {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (kind !== 'all' && kindOf(p) !== kind) return false;
    const hit = lookupSlug(p.slug);
    if (collection) {
      const cols = hit ? [...hit.design.collections, ...(hit.kind === 'hat' ? ['hats'] : [])] : [];
      if (!cols.includes(collection)) return false;
    }
    if (q && !`${displayName(p)} ${p.name}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** The same design in the other garment types (for the product page's type switcher). */
export function siblings(product, products = []) {
  const hit = lookupSlug(product?.slug);
  if (!hit) return [];
  return KINDS.map((k) => {
    const slug = hit.design.slugs[k];
    const p = slug && products.find((x) => x.slug === slug);
    return p ? { kind: k, slug, product: p } : null;
  }).filter(Boolean);
}

export const COLOR_HEX = {
  White: '#f5f5f2', Black: '#141414', 'Athletic Heather': '#b9b9b6', Ash: '#dedcd6', 'Carbon Grey': '#4a4c50',
  Bone: '#e8dfcc', Navy: '#1f2a44', 'Heather Grey': '#9d9d9d', Khaki: '#c3b091',
};
export const colorHex = (c) => COLOR_HEX[c] || '#888';
