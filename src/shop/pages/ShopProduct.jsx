import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Share2, Wand2, Ruler, Truck, RotateCcw, Minus, Plus, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchProduct, optionsFor, findVariant, defaultVariant, SHOP_URL, clearCartCheckoutMarker } from '@/lib/merch';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Swatch, Pill, Skeleton, ShopImage, Tip, Eyebrow } from '@/shop/components/ui';
import { FamilyCard } from '@/shop/components/ProductCard';
import AddonsPanel, { toCartAddons } from '@/shop/components/AddonsPanel';
import SizeGuide from '@/shop/components/SizeGuide';
import { lookupSlug, kindOf, siblings, families, KIND_LABEL, colorHex, productImage, productAltImage, artUrl, displayName, isLightColor } from '@/shop/lib/catalog';
import { usd, addonsTotal } from '@/shop/lib/pricing';
import { MAX_QTY } from '@/shop/lib/cart';
import { startCheckout, apiError } from '@/shop/lib/api';
import { studioHref, prefetchStudio } from '@/shop/lib/studioLink';

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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { products, cart, notify, openCart, blanks, studioAvailable, openStudio } = useShop();
  const [product, setProduct] = useState(undefined);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [addonState, setAddonState] = useState({});
  const [guide, setGuide] = useState(false);
  const [buying, setBuying] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const customizeRef = useRef(null);

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
  const dark = !!color && !isLightColor(color);
  const variants = useMemo(() => product?.variants || [], [product]);
  const { colors, sizes } = useMemo(() => optionsFor(variants), [variants]);
  const selected = findVariant(variants, color, size);
  const canBuy = !!selected?.available;
  const addons = product?.addons || [];
  // Embroidery thread palette = the matching blank's (Printful colours, from /blanks).
  const threadColors = useMemo(() => {
    const type = product?.productType || kind;
    return (Array.isArray(blanks) ? blanks : []).find((b) => b.key === type)?.threadColors || [];
  }, [blanks, product, kind]);
  const { addons: cartAddons } = toCartAddons(addons, addonState, threadColors, dark);
  const unit = (selected?.priceCents || product?.minPriceCents || 0) + addonsTotal(cartAddons);
  const sibs = siblings(product, products);
  const related = useMemo(() => {
    if (!hit) return [];
    const fams = families(products).filter((f) => f.design?.id !== designId);
    const same = fams.filter((f) => f.collections.some((c) => hit.design.collections.includes(c)));
    return (same.length >= 4 ? same : fams).slice(0, 4);
  }, [products, hit, designId]);

  // Exact colour only — never another colour's render (a white image for a black hoodie looks faded).
  const gallery = useMemo(() => {
    if (!product) return [];
    const imgs = [{ key: 'main', src: productImage(product, kind === 'hat' ? color || '' : color), label: `${color} ${KIND_LABEL[kind]}`, garment: true }];
    const other = kind === 'hat' ? '' : productAltImage(product, color);
    if (other) imgs.push({ key: 'alt', src: other, label: 'Other colourway', garment: true });
    if (designId && kind !== 'hat') imgs.push({ key: 'art', src: artUrl(designId, dark ? 'white' : 'black'), label: 'Artwork close-up', art: true });
    return imgs;
  }, [product, color, kind, designId, dark]);
  const current = gallery[Math.min(view, gallery.length - 1)];
  const fallback = { kind, hex: colorHex(color || 'White'), phrase: product ? displayName(product) : '' };

  const studioInit = { product: slug, color, size };
  const openCustomize = () => {
    customizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 1600);
  };
  useEffect(() => {
    if (params.get('customize') === '1' && product && addons.length) setTimeout(openCustomize, 250);
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickColor = (c) => {
    setColor(c); setView(0);
    let v = findVariant(variants, c, size);
    if (!v?.available) v = variants.find((x) => x.color === c && x.available) || v;
    if (v) setSize(v.size || '');
  };

  const buildLine = () => {
    const { addons: a, error } = toCartAddons(addons, addonState, threadColors, dark);
    if (error) { notify(error, 'error'); openCustomize(); return null; }
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
    clearCartCheckoutMarker(); // Buy now must never empty the saved bag on the thanks page
    if (line.addons.length) { cart.add(line); navigate('/shop/cart?step=review'); return; } // customized → review (final-sale notice)
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
    <div className="mx-auto max-w-[1320px] px-4 pb-40 pt-4 sm:px-6 lg:px-10 lg:pb-16">
      <Helmet><title>{name ? `${name} ${KIND_LABEL[kind]} | The Homies Shop` : 'The Homies Shop'}</title></Helmet>
      <Link to="/shop" className="inline-flex h-10 items-center gap-1.5 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> Shop</Link>
      <div className="mt-3 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Gallery */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {!product ? <Skeleton className="aspect-[4/5] rounded-[28px]" /> : (
            <>
              <div className={cn('relative aspect-[4/5] overflow-hidden rounded-[28px]', current?.art && dark ? 'bg-[#141414]' : 'bg-[#f2f1ed]')}>
                <ShopImage key={current?.key + (current?.src || '')} src={current?.src} alt={`${name} — ${current?.label}`} fade={false} priority
                  fallback={current?.garment ? fallback : undefined} fit="contain"
                  className={cn('h-full w-full', current?.art ? 'bg-transparent' : 'bg-[#f2f1ed]')} imgClassName={current?.art ? 'p-[14%]' : 'p-[6%]'} />
              </div>
              {gallery.filter((g) => g.src).length > 1 && (
                <div className="mt-3 flex gap-3" aria-label="Product images">
                  {gallery.map((g, n) => (g.src ? (
                    <button key={g.key} aria-pressed={view === n} aria-label={g.label} type="button" onClick={() => setView(n)}
                      className={cn('h-20 w-16 overflow-hidden rounded-xl transition', view === n ? 'ring-2 ring-white' : 'opacity-60 ring-1 ring-white/10 hover:opacity-100', g.art && dark ? 'bg-[#141414]' : 'bg-[#f2f1ed]')}>
                      <img src={g.src} alt="" className="h-full w-full object-contain p-1.5" />
                    </button>
                  ) : null))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Details */}
        <div>
          <Eyebrow>{hit?.design.collections.includes('must') ? 'Must-have · ' : ''}{KIND_LABEL[kind]}</Eyebrow>
          <h1 className="font-display mt-3 text-4xl leading-[0.95] sm:text-5xl">{name || <Skeleton className="h-12 w-3/4" />}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold">{product ? usd(unit) : '—'}</p>
            {cartAddons.length > 0 && <p className="text-sm text-white/50">incl. {cartAddons.length} add-on{cartAddons.length > 1 ? 's' : ''}</p>}
            {product && studioAvailable && (
              <Link to={studioHref(studioInit)} onClick={(e) => { if (openStudio(studioInit)) e.preventDefault(); }} onMouseEnter={prefetchStudio} onFocus={prefetchStudio}
                className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-[#f0b94d] px-4 text-sm font-semibold text-black hover:brightness-110">
                <PenLine className="h-4 w-4" /> Customize
              </Link>
            )}
          </div>

          {sibs.length > 1 && (
            <div className="mt-8">
              <p className="mb-2.5 text-sm font-medium text-white/80">Style</p>
              <div className="flex flex-wrap gap-2">
                {sibs.map((s) => <Pill key={s.kind} selected={s.slug === slug} onClick={() => s.slug !== slug && navigate(`/shop/${s.slug}`)}>{KIND_LABEL[s.kind]}</Pill>)}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mt-7">
              <p className="mb-2.5 text-sm font-medium text-white/80">Colour <span className="font-normal text-white/45">· {color}</span></p>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => <Swatch key={c} hex={colorHex(c)} label={c} selected={c === color} onClick={() => pickColor(c)} disabled={!variants.some((v) => v.color === c && v.available)} />)}
              </div>
            </div>
          )}

          {sizes.length > 1 && (
            <div className="mt-7">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-sm font-medium text-white/80">Size</p>
                <button type="button" onClick={() => setGuide(true)} className="inline-flex h-9 items-center gap-1 text-xs text-white/55 underline-offset-4 hover:text-white hover:underline"><Ruler className="h-3.5 w-3.5" /> Size guide</button>
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
            <div className="mt-8 scroll-mt-24" ref={customizeRef}>
              <AddonsPanel addons={addons} value={addonState} onChange={setAddonState} threadColors={threadColors} garmentHex={colorHex(color)} darkGarment={dark} highlight={highlight} />
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

          {product && studioAvailable && (
            <Link to={studioHref(studioInit)} onClick={(e) => { if (openStudio(studioInit)) e.preventDefault(); }} onMouseEnter={prefetchStudio}
              className="mt-6 flex items-center gap-4 rounded-2xl border border-dashed border-white/15 p-4 transition hover:border-[#f0b94d]/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0b94d]/15"><Wand2 className="h-5 w-5 text-[#f0b94d]" /></div>
              <div className="flex-1"><p className="text-sm font-medium">Make it your own</p><p className="text-xs text-white/50">Move it, resize it, add your own picture or text.</p></div>
            </Link>
          )}

          <div className="mt-8 space-y-3 border-t border-white/[0.07] pt-6 text-sm text-white/60">
            <p className="flex items-start gap-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-white/40" /> Printed to order and shipped in about 5–12 business days. US shipping.</p>
            <p className="flex items-start gap-3"><RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-white/40" /> Misprinted or damaged? We replace it.{cartAddons.length ? ' Customized pieces are otherwise final sale.' : ''}</p>
          </div>
          {kind === 'hat' && <Tip className="mt-5">Embroidered on a soft, unstructured dad hat. One size, adjustable strap.</Tip>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related">
          <h2 id="related" className="font-display text-3xl sm:text-4xl">You might also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-4">
            {related.map((f) => <FamilyCard key={f.key} family={f} />)}
          </div>
        </section>
      )}

      {/* Sticky phone buy bar (sits above the shop tab bar) */}
      {product && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-[#0a0a0b]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/50">{[color, size].filter(Boolean).join(' · ')}</p>
              <p className="text-lg font-semibold leading-tight">{usd(unit * qty)}</p>
            </div>
            <QtyStepper qty={qty} setQty={setQty} small />
            <ShopButton size="md" disabled={!canBuy} onClick={addToBag}>{canBuy ? 'Add to bag' : 'Sold out'}</ShopButton>
          </div>
        </div>
      )}
      <SizeGuide open={guide} onClose={() => setGuide(false)} kind={kind} />
    </div>
  );
}

function QtyStepper({ qty, setQty, small }) {
  return (
    <div className={cn('inline-flex items-center rounded-full border border-white/15', small ? 'h-10' : 'h-14')}>
      <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="flex h-full w-10 items-center justify-center text-white/70 hover:text-white disabled:opacity-30"><Minus className="h-4 w-4" /></button>
      <span className="w-6 text-center tabular-nums" aria-live="polite">{qty}</span>
      <button type="button" aria-label="Increase quantity" disabled={qty >= MAX_QTY} onClick={() => setQty(qty + 1)} className="flex h-full w-10 items-center justify-center text-white/70 hover:text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
