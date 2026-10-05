import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Wand2, X, Truck, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Eyebrow } from '@/shop/components/ui';
import { FamilyCard, ProductCard, CardSkeleton } from '@/shop/components/ProductCard';
import GarmentSilhouette from '@/shop/components/GarmentSilhouette';
import { COLLECTIONS, CUSTOM_FILTERS, families, filterProducts, productImage, kindOf, KINDS, displayColor, artUrl } from '@/shop/lib/catalog';

const HERO_IDS = ['gringo-go-home', 'colombia-gt-brazil', 'dame-plata-baby', 'i-love-latinas', 'not-a-pookie', 'if-she-thick'];
const GARMENTS = [{ key: 'all', label: 'All' }, { key: 'tee', label: 'Tees' }, { key: 'hoodie', label: 'Hoodies' }, { key: 'hat', label: 'Hats' }];
const RAILS = ['must', 'travel', 'espanol', 'hats'];

export default function ShopHome() {
  const { loading, enabled, products, error, reload } = useShop();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const kind = GARMENTS.some((f) => f.key === params.get('type')) ? params.get('type') : 'all';
  const custom = CUSTOM_FILTERS.some((f) => f.key === params.get('custom')) ? params.get('custom') : '';
  const fams = useMemo(() => families(products), [products]);
  const { hash } = useLocation();
  const allRef = useRef(null);
  useEffect(() => { if (hash === '#all' && allRef.current) setTimeout(() => allRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }, [hash, query, loading]);

  const famView = kind === 'all' && !custom;
  const visibleFamilies = useMemo(() => {
    if (!famView) return null;
    const q = query.trim().toLowerCase();
    return q ? fams.filter((f) => f.phrase.toLowerCase().includes(q)) : fams;
  }, [fams, famView, query]);
  const visibleProducts = useMemo(() => (famView ? null : filterProducts(products, { kind, query, custom })), [products, famView, kind, query, custom]);

  const setParam = (k, v) => { const p = new URLSearchParams(params); if (!v || v === 'all') p.delete(k); else p.set(k, v); setParams(p, { replace: true }); };
  const empty = !loading && (visibleFamilies?.length === 0 || visibleProducts?.length === 0);

  if (!loading && !error && !enabled) return <ComingSoon />;

  return (
    <div>
      <Helmet>
        <title>The Homies Shop | The Homies</title>
        <meta name="description" content="Official The Homies merch: phrases straight from the streams, printed to order. Tees, hoodies and embroidered dad hats — customize any piece or design your own." />
      </Helmet>
      <Hero fams={fams} loading={loading} />
      <StudioEntry />
      {error && (
        <div className="mx-auto mt-10 max-w-[1320px] px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="font-medium">Couldn't load the shop.</p>
            <ShopButton variant="ghost" size="sm" className="mt-3" onClick={reload}>Try again</ShopButton>
          </div>
        </div>
      )}
      {!query && COLLECTIONS.filter((c) => RAILS.includes(c.key)).map((c) => <Rail key={c.key} collection={c} fams={fams} loading={loading} />)}

      <section ref={allRef} id="all" className="mx-auto mt-24 max-w-[1320px] scroll-mt-20 px-4 sm:px-6 lg:px-10" aria-labelledby="all-heading">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Everything</Eyebrow>
            <h2 id="all-heading" className="font-display mt-2 text-4xl leading-none sm:text-5xl">{query ? `“${query}”` : 'The full drop'}</h2>
            {query && <button type="button" onClick={() => setParam('q', '')} className="mt-3 inline-flex h-9 items-center gap-1 text-sm text-white/55 hover:text-white"><X className="h-3.5 w-3.5" /> Clear search</button>}
          </div>
          <div className="flex flex-col gap-2.5 md:items-end">
            <ChipRow label="Garment" options={GARMENTS} value={kind} onChange={(v) => setParam('type', v)} />
            <ChipRow label="Customizable" options={[{ key: '', label: 'Any' }, ...CUSTOM_FILTERS]} value={custom} onChange={(v) => setParam('custom', v)} icon={PenLine} />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
          {loading && Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}
          {!loading && visibleFamilies?.map((f, i) => <FamilyCard key={f.key} family={f} priority={i < 4} />)}
          {!loading && visibleProducts?.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
        </div>
        {empty && (
          <div className="py-16 text-center">
            <p className="font-display text-3xl">Nothing matches that</p>
            <p className="mt-2 text-sm text-white/55">Try another word — or design exactly what you want.</p>
            <ShopButton as={Link} to="/shop/design" variant="ghost" className="mt-6"><Wand2 className="h-4 w-4" /> Design your own</ShopButton>
          </div>
        )}
      </section>
    </div>
  );
}

function ChipRow({ label, options, value, onChange, icon: Icon }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="hidden w-[92px] shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35 md:flex md:justify-end">{Icon && <Icon className="h-3 w-3" />}{label}</span>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {options.map((o) => (
          <button key={o.key || 'any'} type="button" aria-pressed={value === o.key} onClick={() => onChange(o.key)}
            className={cn('h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors', value === o.key ? 'border-white bg-white text-black' : 'border-white/12 text-white/65 hover:border-white/35 hover:text-white')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Hero({ fams, loading }) {
  const reduce = useReducedMotion();
  // Products whose clean Printful render is ready, must-haves first.
  const slides = useMemo(() => {
    const out = [];
    const order = [...fams.filter((f) => HERO_IDS.includes(f.design?.id)), ...fams.filter((f) => !HERO_IDS.includes(f.design?.id))];
    for (const f of order) {
      const p = KINDS.map((k) => f.products[k]).find((x) => x && productImage(x));
      if (p) out.push({ key: f.key, phrase: f.phrase, slug: p.slug, src: productImage(p, kindOf(p) === 'hat' ? '' : displayColor(p)) });
      if (out.length >= 6) break;
    }
    return out;
  }, [fams]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused || slides.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length, reduce, paused]);
  const slide = slides[i % Math.max(1, slides.length)];
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_85%_10%,rgba(240,185,77,0.12),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-12 pt-8 sm:px-6 md:grid-cols-[1.05fr_1fr] md:gap-16 md:pb-20 md:pt-14 lg:px-10">
        <div>
          <Eyebrow className="text-[#f0b94d]/90">Drop 02 · From the streams</Eyebrow>
          <h1 className="font-display mt-5 text-[clamp(2.9rem,7.2vw,6.25rem)] leading-[0.9]">
            Say it with<br />your <span className="font-serif-i normal-case text-[#f0b94d]">chest.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
            56 phrases from the streams on tees, hoodies and embroidered dad hats. Add your name, a back print or embroidery to any piece — or design your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ShopButton as={Link} to="/shop#all" size="lg">Shop the drop <ArrowRight className="h-4 w-4" /></ShopButton>
            <ShopButton as={Link} to="/shop/design" variant="outline" size="lg"><Wand2 className="h-4 w-4" /> Design your own</ShopButton>
          </div>
          <p className="mt-8 flex items-center gap-2 text-xs text-white/40"><Truck className="h-3.5 w-3.5" /> Printed to order · ships in about 5–12 days · misprints replaced</p>
        </div>
        <div className="relative mx-auto w-full max-w-[460px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <Link to={slide ? `/shop/${slide.slug}` : '/shop#all'} className="relative block aspect-[4/5] overflow-hidden rounded-[28px] bg-[#f2f1ed]" aria-label={slide ? `Shop ${slide.phrase}` : 'Shop the drop'}>
            {slide ? (
              <AnimatePresence initial={false} mode="popLayout">
                <motion.img key={slide.key} src={slide.src} alt={slide.phrase} fetchpriority="high"
                  initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.6 }}
                  className="absolute inset-0 h-full w-full object-contain p-[8%]" />
              </AnimatePresence>
            ) : loading ? <div className="shop-skel absolute inset-0" /> : <GarmentSilhouette kind="tee" hex="#f5f5f2" phrase="The Homies" />}
          </Link>
          {slide && (
            <div className="mt-4 flex items-center justify-between gap-3 px-1">
              <p className="truncate text-sm font-medium text-white/80">{slide.phrase}</p>
              {slides.length > 1 && (
                <div className="flex shrink-0 gap-1.5">
                  {slides.map((sl, n) => (
                    <button key={sl.key} type="button" aria-label={`Show ${sl.phrase}`} aria-pressed={n === i} onClick={() => setI(n)} className="flex h-6 items-center px-0.5">
                      <span className={cn('block h-1.5 rounded-full transition-all', n === i ? 'w-5 bg-[#f0b94d]' : 'w-1.5 bg-white/25')} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Prominent "Design your own" entry (blank garments → Studio). */
function StudioEntry() {
  return (
    <section className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
      <Link to="/shop/design" className="group relative grid overflow-hidden rounded-[28px] border border-white/10 bg-[#111113] md:grid-cols-[1.2fr_1fr]">
        <div className="relative z-10 p-7 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f0b94d]">The Homies Studio</p>
          <h2 className="font-display mt-3 text-4xl leading-[0.95] sm:text-5xl">Design your own.</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">Pick a blank tee, hoodie, crewneck or hat. Add your text or upload a picture, place it where you want, see it on the garment, and order. Saves as you go.</p>
          <span className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#f0b94d] px-6 text-sm font-semibold text-black transition group-hover:brightness-110">Open the Studio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
        </div>
        <div className="shop-checker relative hidden min-h-[260px] md:block" aria-hidden>
          <img src={artUrl('the-homies-hub', 'white')} alt="" className="absolute left-1/2 top-1/2 w-[42%] -translate-x-1/2 -translate-y-1/2 -rotate-3 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:rotate-0" />
          <div className="absolute left-[15%] top-[20%] rounded-full border border-dashed border-[#f0b94d]/60 px-3 py-1 text-[11px] text-[#f0b94d]">Drag to place</div>
          <div className="absolute bottom-[16%] right-[12%] rounded-full bg-[#1f8f4e]/20 px-3 py-1 text-[11px] font-medium text-[#7be0a5]">Print-ready</div>
        </div>
      </Link>
    </section>
  );
}

function Rail({ collection, fams, loading }) {
  const items = fams.filter((f) => f.collections.includes(collection.key));
  const scroller = useRef(null);
  if (!loading && !items.length) return null;
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <section className="mx-auto mt-20 max-w-[1320px] px-4 sm:px-6 lg:px-10" aria-labelledby={`rail-${collection.key}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id={`rail-${collection.key}`} className="font-display text-3xl leading-none sm:text-4xl">{collection.label}</h2>
          <p className="mt-2 text-sm text-white/50">{collection.blurb}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to={`/shop/collections/${collection.key}`} className="mr-1 block text-sm font-medium text-white/60 hover:text-white">See all</Link>
          <button type="button" aria-label={`Scroll ${collection.label} left`} onClick={() => scroll(-1)} className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/65 hover:border-white/40 hover:text-white sm:inline-flex"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label={`Scroll ${collection.label} right`} onClick={() => scroll(1)} className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/65 hover:border-white/40 hover:text-white sm:inline-flex"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:gap-6 sm:px-6 lg:-mx-10 lg:px-10">
        {loading
          ? Array.from({ length: 5 }, (_, n) => <div key={n} className="w-[62vw] shrink-0 snap-start sm:w-[280px]"><CardSkeleton /></div>)
          : items.slice(0, 12).map((f) => <FamilyCard key={f.key} family={f} className="w-[62vw] shrink-0 snap-start sm:w-[280px]" />)}
      </div>
    </section>
  );
}

function ComingSoon() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <Eyebrow className="text-[#f0b94d]">The Homies Shop</Eyebrow>
      <h1 className="font-display mt-5 text-6xl leading-[0.9]">Merch is<br />coming soon</h1>
      <p className="mt-5 text-white/60">The first drop is almost here. Check back shortly.</p>
      <ShopButton as={Link} to="/browse" variant="ghost" className="mt-8">Back to The Homies</ShopButton>
    </div>
  );
}
