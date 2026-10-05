import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Wand2, Truck, Leaf, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Eyebrow, Skeleton, pageMotion } from '@/shop/components/ui';
import { FamilyCard, ProductCard, CardSkeleton } from '@/shop/components/ProductCard';
import { COLLECTIONS, families, filterProducts, artUrl, productImage, kindOf, KINDS } from '@/shop/lib/catalog';
import GarmentSilhouette from '@/shop/components/GarmentSilhouette';
import { DESIGNS } from '@/shop/data/designs';

const HERO_IDS = ['gringo-go-home', 'colombia-gt-brazil', 'dame-plata-baby', 'i-love-latinas', 'not-a-pookie', 'if-she-thick'];
const FILTERS = [{ key: 'all', label: 'All' }, { key: 'tee', label: 'Tees' }, { key: 'hoodie', label: 'Hoodies' }, { key: 'hat', label: 'Hats' }];

export default function ShopHome() {
  const { loading, enabled, products, error, reload } = useShop();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const kind = FILTERS.some((f) => f.key === params.get('type')) ? params.get('type') : 'all';
  const fams = useMemo(() => families(products), [products]);
  const { hash } = useLocation();
  const allRef = useRef(null);
  useEffect(() => { if (hash === '#all' && allRef.current) setTimeout(() => allRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }, [hash, query, loading]);

  const visibleFamilies = useMemo(() => {
    if (kind !== 'all') return null;
    const q = query.trim().toLowerCase();
    return q ? fams.filter((f) => f.phrase.toLowerCase().includes(q)) : fams;
  }, [fams, kind, query]);
  const visibleProducts = useMemo(() => (kind === 'all' ? null : filterProducts(products, { kind, query })), [products, kind, query]);

  const setFilter = (k) => { const p = new URLSearchParams(params); if (k === 'all') p.delete('type'); else p.set('type', k); setParams(p, { replace: true }); };
  const clearQuery = () => { const p = new URLSearchParams(params); p.delete('q'); setParams(p, { replace: true }); };

  if (!loading && !error && !enabled) return <ComingSoon />;

  return (
    <motion.div {...pageMotion}>
      <Helmet>
        <title>The Homies Shop | The Homies</title>
        <meta name="description" content="Official The Homies merch: phrases straight from the streams, printed to order. Tees, hoodies and embroidered dad hats." />
      </Helmet>
      <Hero fams={fams} />
      <Marquee />
      <Promises />
      {error && (
        <div className="mx-auto mt-10 max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-white/10 bg-[#131315] p-6 text-center">
            <p className="font-semibold">Couldn't load the shop.</p>
            <ShopButton variant="ghost" size="sm" className="mt-3" onClick={reload}>Try again</ShopButton>
          </div>
        </div>
      )}
      {!query && COLLECTIONS.map((c) => <Rail key={c.key} collection={c} fams={fams} loading={loading} />)}
      <DesignYourOwnBanner />
      <section ref={allRef} id="all" className="mx-auto mt-20 max-w-[1440px] scroll-mt-20 px-4 sm:px-6 lg:px-10" aria-labelledby="all-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Everything</Eyebrow>
            <h2 id="all-heading" className="font-display mt-2 text-5xl leading-none sm:text-6xl">{query ? `“${query}”` : 'The full drop'}</h2>
            {query && <button type="button" onClick={clearQuery} className="shop-block mt-3 inline-flex items-center gap-1 text-sm text-white/55 hover:text-white"><X className="h-3.5 w-3.5" /> Clear search</button>}
          </div>
          <div className="flex gap-1.5 rounded-full border border-white/10 p-1" role="tablist" aria-label="Filter by garment">
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={kind === f.key} type="button" onClick={() => setFilter(f.key)}
                className={cn('shop-block rounded-full px-4 py-2 text-[13px] font-semibold transition-colors', kind === f.key ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
          {loading && Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}
          {!loading && visibleFamilies?.map((f, i) => <FamilyCard key={f.key} family={f} priority={i < 4} />)}
          {!loading && visibleProducts?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {!loading && (visibleFamilies?.length === 0 || visibleProducts?.length === 0) && (
          <div className="py-16 text-center">
            <p className="font-display text-3xl">Nothing matches that</p>
            <p className="mt-2 text-sm text-white/55">Try another word — or design exactly what you want.</p>
          </div>
        )}
      </section>
    </motion.div>
  );
}

function Hero({ fams }) {
  const { studioAvailable, loading } = useShop();
  // Rotate through products whose clean garment render is ready (must-haves first).
  const slides = useMemo(() => {
    const ready = [];
    const order = [...fams.filter((f) => HERO_IDS.includes(f.design?.id)), ...fams.filter((f) => !HERO_IDS.includes(f.design?.id))];
    for (const f of order) {
      const p = KINDS.map((k) => f.products[k]).find((x) => x && productImage(x));
      if (p) ready.push({ key: f.key, phrase: f.phrase, slug: p.slug, src: productImage(p, kindOf(p) === 'hat' ? '' : 'White') });
      if (ready.length >= 6) break;
    }
    return ready;
  }, [fams]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, [slides.length]);
  const slide = slides[i % Math.max(1, slides.length)];
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(240,185,77,0.16),transparent_60%),radial-gradient(50%_60%_at_10%_90%,rgba(224,72,72,0.10),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-4 pb-14 pt-6 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-20 md:pt-10 lg:px-10">
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Eyebrow className="text-[#f0b94d]">Drop 02 · Straight from the streams</Eyebrow>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mt-5 text-[clamp(3.6rem,10vw,9.5rem)] leading-[0.86]">
            Say it<br />with your <span className="font-serif-i normal-case text-[#f0b94d]">chest.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 max-w-md text-[15px] leading-relaxed text-white/65">
            56 phrases you've heard on stream — on tees, hoodies and embroidered dad hats. Printed when you order, shipped to your door.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 flex flex-wrap gap-3">
            <ShopButton as={Link} to="/shop#all" size="lg">Shop the drop <ArrowRight className="h-4 w-4" /></ShopButton>
            {studioAvailable && <ShopButton as={Link} to="/shop/design" variant="outline" size="lg"><Wand2 className="h-4 w-4" /> Design your own</ShopButton>}
          </motion.div>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <Link to={slide ? `/shop/${slide.slug}` : '/shop#all'} className="shop-block relative block aspect-[4/5] overflow-hidden rounded-[28px] bg-[#f4f3ef] shadow-[0_40px_120px_-40px_rgba(240,185,77,0.35)]" aria-label={slide ? `Shop ${slide.phrase}` : 'Shop the drop'}>
            {slide ? (
              <AnimatePresence mode="popLayout">
                <motion.img key={slide.key} src={slide.src} alt={slide.phrase}
                  initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}
                  className="absolute inset-0 h-full w-full object-contain p-[7%]" />
              </AnimatePresence>
            ) : loading ? <div className="shop-skel absolute inset-0" /> : <GarmentSilhouette kind="tee" hex="#f5f5f2" phrase="The Homies" />}
          </Link>
          {slide && (
            <div className="absolute -bottom-5 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0e0e10]/90 px-5 py-4 backdrop-blur-md sm:left-8 sm:right-8">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45">Now showing</p>
                <AnimatePresence mode="wait">
                  <motion.p key={slide.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="truncate font-semibold">{slide.phrase}</motion.p>
                </AnimatePresence>
              </div>
              {slides.length > 1 && (
                <div className="flex gap-1.5">
                  {slides.map((sl, n) => (
                    <button key={sl.key} type="button" aria-label={`Show ${sl.phrase}`} onClick={() => setI(n)} className={cn('shop-block h-1.5 rounded-full transition-all', n === i ? 'w-6 bg-[#f0b94d]' : 'w-1.5 bg-white/25')} />
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

function Marquee() {
  const words = DESIGNS.slice(0, 24).map((d) => d.phrase);
  return (
    <div className="overflow-hidden border-y border-white/[0.07] py-5" aria-hidden>
      <div className="shop-marquee">
        {[...words, ...words].map((w, n) => (
          <span key={n} className="flex items-center whitespace-nowrap px-6 font-display text-3xl text-white/85 sm:text-4xl">
            {w}<span className="ml-12 text-[#f0b94d]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Promises() {
  const items = [
    { icon: Leaf, title: 'Made to order', body: 'Printed the moment you order. No warehouse, no waste.' },
    { icon: Truck, title: 'Ships in ~5–12 days', body: 'Tracking emailed the second it leaves.' },
    { icon: ShieldCheck, title: 'Misprint? We fix it', body: 'Anything damaged or wrong gets replaced.' },
  ];
  return (
    <div className="mx-auto mt-10 grid max-w-[1440px] gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-10">
      {items.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-[#111113] p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06]"><Icon className="h-[18px] w-[18px] text-[#f0b94d]" /></div>
          <div><p className="font-semibold">{title}</p><p className="mt-1 text-[13px] leading-relaxed text-white/55">{body}</p></div>
        </div>
      ))}
    </div>
  );
}

function Rail({ collection, fams, loading }) {
  const items = fams.filter((f) => f.collections.includes(collection.key));
  const scroller = useRef(null);
  if (!loading && !items.length) return null;
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <section className="mx-auto mt-20 max-w-[1440px] px-4 sm:px-6 lg:px-10" aria-labelledby={`rail-${collection.key}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id={`rail-${collection.key}`} className="font-display text-4xl leading-none sm:text-5xl">{collection.label}</h2>
          <p className="mt-2 text-sm text-white/55">{collection.blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/shop/collections/${collection.key}`} className="shop-block mr-1 text-sm font-semibold text-white/70 hover:text-white">See all</Link>
          <button type="button" aria-label={`Scroll ${collection.label} left`} onClick={() => scroll(-1)} className="shop-block hidden h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/70 hover:border-white/40 hover:text-white sm:inline-flex"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label={`Scroll ${collection.label} right`} onClick={() => scroll(1)} className="shop-block hidden h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/70 hover:border-white/40 hover:text-white sm:inline-flex"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-6 sm:px-6 lg:-mx-10 lg:px-10">
        {loading
          ? Array.from({ length: 5 }, (_, i) => <div key={i} className="w-[64vw] shrink-0 snap-start sm:w-[300px]"><CardSkeleton /></div>)
          : items.slice(0, 12).map((f) => <FamilyCard key={f.key} family={f} className="w-[64vw] shrink-0 snap-start sm:w-[300px]" />)}
      </div>
    </section>
  );
}

function DesignYourOwnBanner() {
  const { studioAvailable, blanks } = useShop();
  if (blanks === undefined) return <div className="mx-auto mt-20 max-w-[1440px] px-4 sm:px-6 lg:px-10"><Skeleton className="h-64" /></div>;
  if (!studioAvailable) return null;
  return (
    <section className="mx-auto mt-24 max-w-[1440px] px-4 sm:px-6 lg:px-10">
      <div className="shop-grain relative grid overflow-hidden rounded-[28px] border border-white/10 bg-[#121214] md:grid-cols-2">
        <div className="relative z-10 p-8 sm:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f0b94d]">The Homies Studio</p>
          <h2 className="font-display mt-4 text-5xl leading-[0.9] sm:text-6xl">Design your<br />own merch.</h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">Upload a pic or type your own phrase, drag it where you want it, see it on the shirt instantly. Save it, come back to it, order it.</p>
          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li>✦ Front, back &amp; sleeves</li>
            <li>✦ Print-quality check as you go</li>
            <li>✦ Saves automatically</li>
          </ul>
          <ShopButton as={Link} to="/shop/design" variant="gold" size="lg" className="mt-8">Open the Studio <ArrowRight className="h-4 w-4" /></ShopButton>
        </div>
        <div className="shop-checker relative min-h-[300px]">
          <img src={artUrl('the-homies-hub', 'white')} alt="" aria-hidden className="absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" />
          <div className="absolute left-[18%] top-[22%] rounded-full border border-dashed border-[#f0b94d]/60 px-3 py-1 text-[11px] text-[#f0b94d]">Drag me</div>
          <div className="absolute bottom-[18%] right-[14%] rounded-full bg-[#1f8f4e]/20 px-3 py-1 text-[11px] font-semibold text-[#7be0a5]">300 DPI · Sharp</div>
        </div>
      </div>
    </section>
  );
}

function ComingSoon() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <Eyebrow className="text-[#f0b94d]">The Homies Shop</Eyebrow>
      <h1 className="font-display mt-5 text-7xl leading-[0.9]">Merch is<br />coming soon</h1>
      <p className="mt-5 text-white/60">The first drop is almost here. Check back shortly.</p>
      <ShopButton as={Link} to="/browse" variant="ghost" className="mt-8">Back to The Homies</ShopButton>
    </div>
  );
}
