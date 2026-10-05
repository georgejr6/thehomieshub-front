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
  const t = product?.productType;
  if (t === 'tee' || t === 'hoodie' || t === 'hat') return t;
  if (t === 'crewneck') return 'hoodie';
  const hit = lookupSlug(product?.slug);
  if (hit) return hit.kind;
  const n = String(product?.name || '').toLowerCase();
  if (/\bhat\b|\bcap\b/.test(n)) return 'hat';
  if (/hoodie|sweatshirt|crewneck/.test(n)) return 'hoodie';
  return 'tee';
}

// What each garment can be customized with (docs/MERCH_API_V2.md "Listed product
// add-ons"). Used for card badges + "Customizable" filters without fetching every
// product; the product page uses the real product.addons from the API.
export const CUSTOMIZE = {
  tee: ['back', 'sleeve', 'name'],
  hoodie: ['back', 'sleeve', 'name'], // listed hoodies don't offer chest embroidery (server: mixed_technique)
  hat: ['embroidery', 'name'],
};
export const CUSTOM_LABEL = { name: 'Add a name', back: 'Back print', sleeve: 'Sleeve', embroidery: 'Embroidery' };
export const CUSTOM_FILTERS = [{ key: 'name', label: 'Name' }, { key: 'back', label: 'Back print' }, { key: 'embroidery', label: 'Embroidery' }];
export const customizeKeys = (product) => CUSTOMIZE[kindOf(product)] || [];

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

/** Garment image for a product in a colour. With a colour: ONLY that colour's own
 *  render (never another colour's — a white image for a black hoodie looks faded);
 *  '' → the silhouette placeholder. Without a colour: any render / thumbnail. */
export function productImage(product, color) {
  const vs = product?.variants || [];
  if (color) {
    const own = vs.filter((v) => v.color === color).map((v) => v.image);
    return own.find(lasting) || own.find(good) || '';
  }
  const cands = [...vs.map((v) => v.image), product?.thumbnail, ...(product?.images || [])];
  return cands.find(lasting) || cands.find(good) || '';
}

/** Default colour to show a product in: White/Black if they have a render, else the first colour with one. */
export function displayColor(product) {
  const vs = product?.variants || [];
  for (const c of ['White', 'Black']) if (vs.some((v) => v.color === c && good(v.image))) return c;
  return vs.find((v) => good(v.image))?.color || vs[0]?.color || '';
}

/** The opposite colourway's own image (hover swap), or ''. */
export function productAltImage(product, color) {
  const vs = product?.variants || [];
  const first = color || displayColor(product);
  const other = vs.find((v) => v.color !== first && isLightColor(v.color) !== isLightColor(first) && lasting(v.image))
    || vs.find((v) => v.color !== first && lasting(v.image));
  return other ? other.image : '';
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
export function filterProducts(products = [], { kind = 'all', query = '', collection = '', custom = '' } = {}) {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (kind !== 'all' && kindOf(p) !== kind) return false;
    if (custom && !customizeKeys(p).includes(custom)) return false;
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
