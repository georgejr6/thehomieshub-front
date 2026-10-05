import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Share2, Wand2, Ruler, Truck, RotateCcw, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchProduct, optionsFor, findVariant, defaultVariant, SHOP_URL } from '@/lib/merch';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Swatch, Pill, Skeleton, ShopImage, Tip, Eyebrow, pageMotion } from '@/shop/components/ui';
import { FamilyCard } from '@/shop/components/ProductCard';
import AddonsPanel, { toCartAddons } from '@/shop/components/AddonsPanel';
import SizeGuide from '@/shop/components/SizeGuide';
import { lookupSlug, kindOf, siblings, families, KIND_LABEL, colorHex, productImage, artUrl, displayName } from '@/shop/lib/catalog';
import { usd, addonsTotal } from '@/shop/lib/pricing';
import { MAX_QTY } from '@/shop/lib/cart';
import { startCheckout, apiError } from '@/shop/lib/api';

const DARK = new Set(['Black', 'Carbon Grey', 'Navy']);

/** Sensible first pick: White/Black and a middle size, else the first buyable variant. */
export function preferredVariant(variants = []) {
  const ok = variants.filter((v) => v.available);
  for (const c of ['White', 'Black']) for (const s of ['L', 'M', 'XL', '']) {
    const v = ok.find((x) => x.color === c && (s === '' || x.size === s));
    if (v) return v;
  }
  return defaultVariant(variants);
}

export default function ShopProduct() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, cart, notify, openCart, studioAvailable } = useShop();
  const [product, setProduct] = useState(undefined);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [addonState, setAddonState] = useState({});
  const [guide, setGuide] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let alive = true;
    setProduct(undefined); setAddonState({}); setQty(1); setView(0);
    fetchProduct(slug).then((p) => {
      if (!alive) return;
      setProduct(p || null);
      const v = preferredVariant(p?.variants);
      setColor(v?.color || ''); setSize(v?.size || '');
    }).catch(() => alive && setProduct(null));
    return () => { alive = false; };
  }, [slug]);

  const hit = lookupSlug(slug);
  const designId = hit?.design.id;
  const kind = product ? kindOf(product) : hit?.kind || 'tee';
  const variants = useMemo(() => product?.variants || [], [product]);
  const { colors, sizes } = useMemo(() => optionsFor(variants), [variants]);
  const selected = findVariant(variants, color, size);
  const canBuy = !!selected?.available;
  const addons = product?.addons || [];
  const { addons: cartAddons } = toCartAddons(addons, addonState, designId);
  const unit = (selected?.priceCents || product?.minPriceCents || 0) + addonsTotal(cartAddons);
  const sibs = siblings(product, products);
  const related = useMemo(() => {
    if (!hit) return [];
    const fams = families(products).filter((f) => f.design?.id !== designId);
    const same = fams.filter((f) => f.collections.some((c) => hit.design.collections.includes(c)));
    return (same.length >= 4 ? same : fams).slice(0, 4);
  }, [products, hit, designId]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const main = productImage(product, color);
    const imgs = [{ src: main, label: `${color} ${KIND_LABEL[kind]}`, fit: 'cover' }];
    if (designId && kind !== 'hat') imgs.push({ src: artUrl(designId, DARK.has(color) ? 'white' : 'black'), label: 'Artwork close-up', fit: 'contain', art: true, dark: DARK.has(color) });
    const other = productImage(product, DARK.has(color) ? 'White' : 'Black');
    if (other && other !== main) imgs.push({ src: other, label: 'Other colourway', fit: 'cover' });
    return imgs;
  }, [product, color, kind, designId]);

  const pickColor = (c) => {
    setColor(c); setView(0);
    let v = findVariant(variants, c, size);
    if (!v?.available) v = variants.find((x) => x.color === c && x.available) || v;
    if (v) setSize(v.size || '');
  };

  const buildLine = () => {
    const { addons: a, error } = toCartAddons(addons, addonState, designId);
    if (error) { notify(error, 'error'); return null; }
    return {
      kind: 'listed', variantId: selected.id, quantity: qty, addons: a,
      name: displayName(product), variant: [KIND_LABEL[kind], selected.color, selected.size].filter(Boolean).join(' · '),
      image: productImage(product, selected.color), slug: product.slug, priceCents: selected.priceCents,
    };
  };
  const addToBag = () => {
    if (!canBuy) return;
    const line = buildLine(); if (!line) return;
    const err = cart.add(line);
    if (err) { notify(err, 'error'); return; }
    notify('Added to your bag'); openCart();
  };
  const buyNow = async () => {
    if (!canBuy) return;
    const line = buildLine(); if (!line) return;
    if (line.addons.length) { cart.add(line); navigate('/shop/cart?step=review'); return; } // custom work → review step (final-sale notice)
    setBuying(true);
    try { await startCheckout([{ kind: 'listed', variantId: line.variantId, quantity: line.quantity, addons: [] }]); }
    catch (e) { notify(apiError(e, 'Could not start checkout.'), 'error'); setBuying(false); }
  };
  const share = async () => {
    const url = `${SHOP_URL}/${product.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: displayName(product), url });
      else { await navigator.clipboard.writeText(url); notify('Link copied'); }
    } catch { /* cancelled */ }
  };

  if (product === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-display text-5xl">Not found</p>
        <p className="mt-3 text-white/55">This piece isn't available anymore.</p>
        <ShopButton as={Link} to="/shop" className="mt-8">Back to the shop</ShopButton>
      </div>
    );
  }

  const name = product ? displayName(product) : hit?.design.phrase || '';
  return (
    <motion.div {...pageMotion} className="mx-auto max-w-[1440px] px-4 pb-32 pt-4 sm:px-6 lg:px-10 lg:pb-16">
      <Helmet><title>{name ? `${name} ${KIND_LABEL[kind]} — Homies Shop` : 'Homies Shop'}</title></Helmet>
      <Link to="/shop" className="shop-block inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> Shop</Link>
      <div className="mt-5 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* Gallery */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {!product ? <Skeleton className="aspect-[4/5]" /> : (
            <>
              <div className={cn('relative aspect-[4/5] overflow-hidden rounded-[28px]', gallery[view]?.art ? (gallery[view].dark ? 'bg-[#141414]' : 'bg-[#f4f3ef]') : 'bg-[#f4f3ef]')}>
                <AnimatePresence mode="wait">
                  <motion.div key={gallery[view]?.src} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                    <ShopImage src={gallery[view]?.src} alt={`${name} — ${gallery[view]?.label}`} className={cn('h-full w-full', gallery[view]?.art ? 'bg-transparent p-[12%]' : 'bg-[#f4f3ef]')} fit={gallery[view]?.fit} />
                  </motion.div>
                </AnimatePresence>
              </div>
              {gallery.length > 1 && (
                <div className="mt-3 flex gap-3" role="tablist" aria-label="Product images">
                  {gallery.map((g, n) => (
                    <button key={g.src} role="tab" aria-selected={view === n} aria-label={g.label} type="button" onClick={() => setView(n)}
                      className={cn('shop-block h-20 w-16 overflow-hidden rounded-xl transition', view === n ? 'ring-2 ring-white' : 'opacity-60 ring-1 ring-white/10 hover:opacity-100', g.art ? (g.dark ? 'bg-[#141414]' : 'bg-[#f4f3ef]') : 'bg-[#f4f3ef]')}>
                      <img src={g.src} alt="" className={cn('h-full w-full', g.fit === 'contain' ? 'object-contain p-2' : 'object-cover')} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Details */}
        <div>
          <Eyebrow>{hit?.design.collections.includes('must') ? 'Must-have · ' : ''}{KIND_LABEL[kind]}</Eyebrow>
          <h1 className="font-display mt-3 text-5xl leading-[0.92] sm:text-6xl">{name || <Skeleton className="h-14 w-3/4" />}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-4xl">{product ? usd(unit) : '—'}</p>
            {cartAddons.length > 0 && <p className="text-sm text-white/50">incl. {cartAddons.length} add-on{cartAddons.length > 1 ? 's' : ''}</p>}
          </div>

          {sibs.length > 1 && (
            <div className="mt-8">
              <p className="mb-2.5 text-sm font-semibold">Style</p>
              <div className="flex flex-wrap gap-2">
                {sibs.map((s) => <Pill key={s.kind} selected={s.slug === slug} onClick={() => s.slug !== slug && navigate(`/shop/${s.slug}`)}>{KIND_LABEL[s.kind]}</Pill>)}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mt-7">
              <p className="mb-2.5 text-sm font-semibold">Colour <span className="font-normal text-white/50">· {color}</span></p>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => <Swatch key={c} hex={colorHex(c)} label={c} selected={c === color} onClick={() => pickColor(c)} disabled={!variants.some((v) => v.color === c && v.available)} />)}
              </div>
            </div>
          )}

          {sizes.length > 1 && (
            <div className="mt-7">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-sm font-semibold">Size</p>
                <button type="button" onClick={() => setGuide(true)} className="shop-block inline-flex items-center gap-1 text-xs text-white/55 underline-offset-4 hover:text-white hover:underline"><Ruler className="h-3.5 w-3.5" /> Size guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = findVariant(variants, color, s);
                  return <Pill key={s} selected={s === size} disabled={!v?.available} onClick={() => setSize(s)}>{s}</Pill>;
                })}
              </div>
            </div>
          )}

          {addons.length > 0 && (
            <div className="mt-8">
              <AddonsPanel addons={addons} value={addonState} onChange={setAddonState} designId={designId} garmentHex={colorHex(color)} darkGarment={DARK.has(color)} />
            </div>
          )}

          <div className="mt-8 hidden items-center gap-3 lg:flex">
            <QtyStepper qty={qty} setQty={setQty} />
            <ShopButton size="lg" className="flex-1" disabled={!canBuy} onClick={addToBag}>{canBuy ? 'Add to bag' : 'Sold out'}</ShopButton>
          </div>
          <div className="mt-3 hidden gap-3 lg:flex">
            <ShopButton variant="ghost" size="lg" className="flex-1" disabled={!canBuy} loading={buying} onClick={buyNow}>Buy now</ShopButton>
            <ShopButton variant="ghost" size="lg" onClick={share} aria-label="Share"><Share2 className="h-4 w-4" /></ShopButton>
          </div>

          {studioAvailable && designId && kind !== 'hat' && (
            <Link to={`/shop/design?from=${designId}&blank=${kind}&color=${encodeURIComponent(color)}`}
              className="shop-block mt-6 flex items-center gap-4 rounded-2xl border border-dashed border-white/15 p-4 transition hover:border-[#f0b94d]/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0b94d]/15"><Wand2 className="h-5 w-5 text-[#f0b94d]" /></div>
              <div className="flex-1"><p className="text-sm font-semibold">Customize further in the Studio</p><p className="text-xs text-white/50">Move it, resize it, add your own art or text.</p></div>
            </Link>
          )}

          <div className="mt-8 space-y-3 border-t border-white/[0.07] pt-6 text-sm text-white/65">
            <p className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-white/45" /> Printed to order and shipped in about 5–12 business days. US shipping.</p>
            <p className="flex items-start gap-3"><RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-white/45" /> Misprinted or damaged? We replace it. {cartAddons.length ? 'Customized items are final sale otherwise.' : ''}</p>
          </div>
          {kind === 'hat' && <Tip className="mt-5">Embroidered with white thread on a soft, unstructured dad hat. One size, adjustable strap.</Tip>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related">
          <h2 id="related" className="font-display text-4xl sm:text-5xl">You might also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-4">
            {related.map((f) => <FamilyCard key={f.key} family={f} />)}
          </div>
        </section>
      )}

      {/* Sticky mobile buy bar */}
      {product && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0b]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/50">{[color, size].filter(Boolean).join(' · ')}</p>
              <p className="font-display text-2xl leading-none">{usd(unit * qty)}</p>
            </div>
            <QtyStepper qty={qty} setQty={setQty} small />
            <ShopButton size="md" disabled={!canBuy} onClick={addToBag}>{canBuy ? 'Add to bag' : 'Sold out'}</ShopButton>
          </div>
        </div>
      )}
      <SizeGuide open={guide} onClose={() => setGuide(false)} kind={kind} />
    </motion.div>
  );
}

function QtyStepper({ qty, setQty, small }) {
  return (
    <div className={cn('inline-flex items-center rounded-full border border-white/15', small ? 'h-10' : 'h-14')}>
      <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="shop-block px-3 text-white/70 hover:text-white disabled:opacity-30"><Minus className="h-4 w-4" /></button>
      <span className="w-6 text-center tabular-nums" aria-live="polite">{qty}</span>
      <button type="button" aria-label="Increase quantity" disabled={qty >= MAX_QTY} onClick={() => setQty(qty + 1)} className="shop-block px-3 text-white/70 hover:text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
