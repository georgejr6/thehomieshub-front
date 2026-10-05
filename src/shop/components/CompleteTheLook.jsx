import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { ShopImage } from '@/shop/components/ui';
import { usd } from '@/shop/lib/pricing';
import { KIND_LABEL, kindOf, productImage, displayColor, displayName, lookupSlug, families } from '@/shop/lib/catalog';

// Checkout cross-sell: the same phrase on the other garments first, then
// must-haves (hats lead: one size, one tap). Never something already in the bag.
export default function CompleteTheLook({ offer, className }) {
  const { products = [], cart, notify } = useShop();
  const lines = cart.cart;
  const picks = useMemo(() => {
    const inBag = new Set(lines.map((l) => l.slug).filter(Boolean));
    const ok = (p) => p && !p.soldOut && !inBag.has(p.slug) && productImage(p);
    const fams = families(products);
    const out = [];
    const push = (p) => { if (ok(p) && !out.includes(p) && out.length < 4) out.push(p); };
    // same design, other garments
    for (const l of lines) {
      const id = lookupSlug(l.slug)?.design.id;
      const fam = id && fams.find((f) => f.design?.id === id);
      if (fam) Object.values(fam.products).forEach(push);
    }
    // then must-haves, hats first
    const must = fams.filter((f) => f.collections.includes('must'));
    must.forEach((f) => push(f.products.hat));
    must.forEach((f) => Object.values(f.products).forEach(push));
    fams.forEach((f) => push(f.products.hat));
    return out;
  }, [products, lines]);

  if (!picks.length) return null;
  const need = offer ? Math.max(0, offer.bundleMinItems - cart.count) : 0;
  const title = offer?.discountCents && need > 0
    ? `Add ${need === 1 ? 'one more' : need} and save ${usd(offer.discountCents)}`
    : 'Complete the look';

  const quickAdd = (p) => {
    const color = displayColor(p);
    const v = p.variants.find((x) => x.available && x.color === color) || p.variants.find((x) => x.available);
    if (!v) return;
    const err = cart.add({
      kind: 'listed', variantId: v.id, quantity: 1, addons: [],
      name: displayName(p), variant: [KIND_LABEL[kindOf(p)], v.color, v.size].filter(Boolean).join(' · '),
      image: productImage(p, v.color), slug: p.slug, priceCents: v.priceCents,
    });
    notify(err || `Added ${displayName(p)} to your bag`, err ? 'error' : 'default');
  };

  return (
    <section className={className} aria-labelledby="complete-look-title">
      <p id="complete-look-title" className="font-display text-2xl">{title}</p>
      {offer?.discountCents > 0 && need > 0 && <p className="mt-1 text-sm text-white/55">{usd(offer.discountCents)} comes off automatically with {offer.bundleMinItems}+ items.</p>}
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {picks.map((p) => {
          const kind = kindOf(p);
          const color = kind === 'hat' ? '' : displayColor(p);
          const oneSize = kind === 'hat' || new Set(p.variants.filter((v) => v.available).map((v) => v.size)).size <= 1;
          return (
            <li key={p.slug} className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111113]">
              <Link to={`/shop/${p.slug}`} className="block bg-white">
                <ShopImage src={productImage(p, color)} alt={`${displayName(p)} ${KIND_LABEL[kind] || ''}`} className="aspect-square w-full" />
              </Link>
              <div className="flex flex-1 flex-col justify-between p-3">
                <div>
                <p className="line-clamp-2 text-sm font-semibold leading-tight">{displayName(p)}</p>
                <p className="mt-0.5 text-xs text-white/50">{KIND_LABEL[kind]} · {usd(p.minPriceCents)}</p>
                </div>
                {oneSize ? (
                  <button type="button" onClick={() => quickAdd(p)}
                    className="mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-full bg-white text-xs font-semibold text-black hover:bg-white/85">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                ) : (
                  <Link to={`/shop/${p.slug}`} className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-white/15 text-xs font-semibold hover:border-white/40">
                    Choose size
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
