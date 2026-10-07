import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, EyeOff, ShoppingBag } from 'lucide-react';
import { fetchShop } from '@/lib/merch';
import { cn } from '@/lib/utils';

// Merch "reels": The Homies Shop pieces shown like a reel in the For You feed
// (VerticalVideoFeed, merch prop) and as a reel row on the home page. Never
// spammy: the feed shows one after every FEED_EVERY posts, at most
// FEED_MAX_PER_VISIT per browser session, and "Not interested" hides a piece for a week.

export const FEED_EVERY = 10;
export const FEED_MAX_PER_VISIT = 2;
const SNOOZE_KEY = 'hh_merch_reel_snooze';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SHOWN_KEY = 'hh_merch_reel_shown'; // feed cards seen this browser session

/** How many more feed merch cards this browser session may show (FEED_MAX_PER_VISIT per session). */
export function merchReelsLeft() {
  try { return Math.max(0, FEED_MAX_PER_VISIT - (Number(sessionStorage.getItem(SHOWN_KEY)) || 0)); } catch { return FEED_MAX_PER_VISIT; }
}
function countMerchShown() {
  try { sessionStorage.setItem(SHOWN_KEY, String((Number(sessionStorage.getItem(SHOWN_KEY)) || 0) + 1)); } catch { /* private mode */ }
}

// The Homies Collection (the promo line-up) leads, then LXVEMORE, then everything else.
const FEATURED = [
  'gringo-go-home-hoodie', 'i-love-latinas-tee', 'colombia-brazil-tee', 'the-homies-hub-hoodie',
  'i-m-not-a-pookie-tee', 'dame-plata-baby-hoodie', 'if-she-thick-i-m-going-tee', 'gringo-go-home-tee',
];

const isHouseImage = (u) => typeof u === 'string' && /^https:\/\//.test(u);

function readSnoozed() {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, until]) => Number(until) > now));
  } catch { return {}; }
}

export function snoozeMerch(slug) {
  try {
    const s = readSnoozed();
    s[slug] = Date.now() + SNOOZE_MS;
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(s));
  } catch { /* private mode: the card still disappears for this visit */ }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

let shopPromise = null; // one fetch per page load, shared by every reel
function loadShop() {
  if (!shopPromise) shopPromise = fetchShop().catch(() => { shopPromise = null; return { enabled: false, products: [] }; });
  return shopPromise;
}

/** In-stock shop pieces with photos, in reel order (featured first, a little shuffled). [] until loaded / if the shop is off. */
export function useMerchReelProducts(enabled = true) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadShop().then((d) => {
      if (!alive || !d?.enabled) return;
      const snoozed = readSnoozed();
      const ok = (d.products || []).filter((p) => p?.slug && p.name && Number(p.minPriceCents) > 0 && !p.soldOut && !snoozed[p.slug] && isHouseImage(p.thumbnail));
      const bySlug = new Map(ok.map((p) => [p.slug, p]));
      const featured = shuffle(FEATURED.map((s) => bySlug.get(s)).filter(Boolean));
      const lxv = shuffle(ok.filter((p) => p.brand === 'lxvemore'));
      const rest = shuffle(ok.filter((p) => !FEATURED.includes(p.slug) && p.brand !== 'lxvemore'));
      // two featured, one LXVEMORE, repeat; then the rest
      const out = [];
      while (featured.length || lxv.length) {
        out.push(...featured.splice(0, 2));
        if (lxv.length) out.push(lxv.shift());
      }
      setProducts([...out, ...rest]);
    });
    return () => { alive = false; };
  }, [enabled]);
  return products;
}

const money = (c) => { const d = (c || 0) / 100; return `$${Number.isInteger(d) ? d : d.toFixed(2)}`; };
const kindLabel = (p) => (p.brand === 'lxvemore' ? 'LXVEMORE' : 'The Homies Collection');
const gallery = (p) => [...new Set([p.thumbnail, ...(p.images || [])].filter(isHouseImage))].slice(0, 4);

function Wordmark({ className }) {
  return (
    <span className={cn('whitespace-nowrap leading-none', className)}
      style={{ fontFamily: "'HH Archivo', 'Archivo Black', 'Arial Black', system-ui, sans-serif", fontWeight: 900, letterSpacing: '0.08em' }}>
      THE HOMIES <span className="text-[#f0b94d]">SHOP</span>
    </span>
  );
}

// The shop's face, available outside the lazily loaded shop bundle.
const FONT_CSS = "@font-face{font-family:'HH Archivo';src:url('/fonts/shop/ArchivoBlack-Regular.woff2') format('woff2');font-display:swap}";
function FontFace() { return <style>{FONT_CSS}</style>; }

/** Cross-fading, slowly drifting product photos (Ken Burns), paused when off screen. */
function Slideshow({ images, active, className, interval = 2600 }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active || images.length < 2 || reduce) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % images.length), interval);
    return () => clearInterval(t);
  }, [active, images.length, reduce, interval]);
  useEffect(() => { if (!active) setI(0); }, [active]);
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      <AnimatePresence initial={false}>
        <motion.img
          key={images[i]}
          src={images[i]}
          alt=""
          draggable={false}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: active && !reduce ? 1.12 : 1.06 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.8 }, scale: { duration: interval / 1000 + 1, ease: 'linear' } }}
        />
      </AnimatePresence>
    </div>
  );
}

/** A full-screen reel card for VerticalVideoFeed (same snap + data-index contract as VerticalVideo). */
export function MerchReelCard({ product, index, isVisible, onHide }) {
  const images = useMemo(() => gallery(product), [product]);
  const to = `/shop/${encodeURIComponent(product.slug)}`;
  const hide = () => { snoozeMerch(product.slug); onHide?.(product.slug); };
  const reduce = useReducedMotion();
  const counted = useRef(false);
  useEffect(() => { if (isVisible && !counted.current) { counted.current = true; countMerchShown(); } }, [isVisible]);
  const pulse = isVisible && !reduce;
  return (
    <div data-index={index} className="relative flex h-[100svh] w-full shrink-0 snap-start flex-col overflow-hidden bg-black">
      <FontFace />
      {/* warm glow behind the garment */}
      <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-[40%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f0b94d]/20 blur-[90px]"
        animate={pulse ? { opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] } : { opacity: 0.4, scale: 1 }}
        transition={pulse ? { duration: 5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }} />

      {/* the feed box is 100svh tall but starts under the app header (and the "get the app" banner) and ends under the phone nav */}
      <div className="relative mx-auto flex h-full w-full max-w-[560px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+10.5rem)] pt-5 md:pb-24">
        <div className="flex items-center justify-between">
          <span className="truncate rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">{kindLabel(product)}</span>
          <button type="button" onClick={hide} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/80">
            <EyeOff className="h-3.5 w-3.5" /> Not interested
          </button>
        </div>

        <Link to={to} className="relative mt-3 min-h-0 flex-1" aria-label={`Shop ${product.name}`}>
          <Slideshow images={images} active={isVisible} />
        </Link>

        <motion.div
          initial={false}
          animate={isVisible || reduce ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.5, ease: 'easeOut', delay: isVisible ? 0.15 : 0 }}
          className="mt-4"
        >
          <Wordmark className="text-xs text-white/80" />
          <p className="mt-2 line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl">{product.name}</p>
          <div className="mt-3 flex items-center gap-3">
            <Link to={to} className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#f0b94d] px-5 py-3 text-sm font-bold text-black">
              <span aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/50 blur-sm motion-safe:animate-[hh-shine_2.8s_ease-in-out_infinite]" />
              <ShoppingBag className="relative h-4 w-4" /><span className="relative">Shop · from {money(product.minPriceCents)}</span>
              <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/shop" className="rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">See all</Link>
          </div>
          <p className="mt-2 text-[11px] text-white/40">Printed to order · ships in about a week (US)</p>
        </motion.div>
      </div>
      <style>{'@keyframes hh-shine{0%{transform:translateX(0) skewX(-12deg)}60%,100%{transform:translateX(450%) skewX(-12deg)}}'}</style>
    </div>
  );
}

/** Home page: a horizontal row of small, gently animated reel cards. Renders nothing if the shop is closed. */
export function MerchReelRow({ className, limit = 8 }) {
  const products = useMerchReelProducts();
  const items = products.slice(0, limit);
  if (!items.length) return null;
  return (
    <section className={cn('w-full', className)} aria-label="The Homies Shop">
      <FontFace />
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <Wordmark className="text-lg sm:text-xl text-white" />
          <p className="mt-1 text-sm text-muted-foreground">Fresh from the stream, printed to order.</p>
        </div>
        <Link to="/shop" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#f0b94d] hover:underline">Shop all <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p, i) => <MiniReel key={p.slug} product={p} delay={i * 0.06} />)}
      </div>
    </section>
  );
}

function MiniReel({ product, delay }) {
  const images = useMemo(() => gallery(product), [product]);
  const [hover, setHover] = useState(false);
  const ref = useRef(null);
  const seen = useInView(ref, { amount: 0.3 }); // slideshow runs only while on screen
  return (
    <motion.div
      ref={ref}
      className="w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-[180px]"
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link to={`/shop/${encodeURIComponent(product.slug)}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="group relative block aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-[#111113] transition-colors hover:border-[#f0b94d]/50">
        <div aria-hidden className="absolute inset-x-0 top-1/3 mx-auto h-1/2 w-3/4 rounded-full bg-[#f0b94d]/15 blur-3xl" />
        <Slideshow images={images} active={seen || hover} interval={3200} className="bottom-16" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{product.name}</p>
          <p className="mt-1 text-xs font-semibold text-[#f0b94d]">from {money(product.minPriceCents)}</p>
        </div>
      </Link>
    </motion.div>
  );
}
