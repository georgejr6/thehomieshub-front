import Wordmark from '@/shop/components/Wordmark';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useOutlet, useSearchParams } from 'react-router-dom';
import { MotionConfig, AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Search, ShoppingBag, X, Package, Wand2, Store } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { cn } from '@/lib/utils';
import { ShopProvider, useShop } from '@/shop/ShopContext';
import CartDrawer from '@/shop/components/CartDrawer';
import { Toast, useFocusTrap } from '@/shop/components/ui';
import ShopShellFallback from '@/shop/ShopShellFallback';
import StudioOverlay from '@/shop/studio/StudioOverlay';
import '@/shop/shop.css';

// The Homies Shop is its own app (like Media Mode / Homies Chat): own header,
// own phone tab bar (Shop · Studio · Bag · Orders) instead of the main app's
// nav, page transitions, and only a "Back to The Homies" exit. App.jsx /shop/*.

export default function ShopLayout() {
  return (
    <ShopProvider>
      <MotionConfig reducedMotion="user">
        <ShopShell />
      </MotionConfig>
    </ShopProvider>
  );
}

function ShopShell() {
  const { toast } = useShop();
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const reduce = useReducedMotion();
  const studio = pathname.startsWith('/shop/design');
  useEffect(() => { if (!studio) window.scrollTo({ top: 0 }); }, [pathname, studio]);
  // index.css's phone tap-target rule skips the shop (it sizes its own buttons).
  useEffect(() => {
    document.body.classList.add('hh-shop-open');
    return () => document.body.classList.remove('hh-shop-open');
  }, []);
  return (
    <motion.div className="hh-shop min-h-[100dvh]" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.16 } }}>
      <Helmet><meta name="theme-color" content="#0a0a0b" /></Helmet>
      <a href="#shop-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
      <ShopHeader studio={studio} />
      <main id="shop-main" className={cn(!studio && 'min-h-[70vh] pb-24 md:pb-0')}>
        <Suspense fallback={<ShopShellFallback bare />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
              exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.1 } }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {!studio && <ShopFooter />}
      {!studio && <TabBar />}
      <StudioOverlay />
      <CartDrawer />
      <Toast toast={toast} />
    </motion.div>
  );
}

function ShopHeader({ studio }) {
  const { cart, openCart } = useShop();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const navCls = ({ isActive }) => cn('rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors', isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white');

  return (
    <header className={cn('sticky top-0 z-50 transition-colors duration-300', scrolled || studio ? 'border-b border-white/[0.07] bg-[#0a0a0b]/90 backdrop-blur-xl' : 'bg-[#0a0a0b]/40 backdrop-blur-md')}>
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 sm:px-6 md:h-16 lg:px-10">
        <Link to="/browse" className="group flex h-10 items-center gap-1.5 rounded-full pr-2 text-[12px] font-medium text-white/50 hover:text-white" aria-label="Back to The Homies">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden lg:inline">The Homies</span>
        </Link>
        <span className="hidden h-5 w-px bg-white/10 lg:block" aria-hidden />
        <Link to="/shop" className="mr-auto flex items-baseline gap-1.5 md:mr-0" aria-label="The Homies Shop home">
          <Wordmark className="text-[15px] md:text-[17px]" />
        </Link>
        <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label="Shop">
          <NavLink to="/shop" end className={navCls}>Shop</NavLink>
          <NavLink to="/shop/design" className={navCls}>Design your own</NavLink>
          <NavLink to="/shop/library" className={navCls}>Your library</NavLink>
          <NavLink to="/shop/orders" className={navCls}>Orders</NavLink>
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white">
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={openCart}
            className="relative hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-[#f0b94d] md:inline-flex"
            aria-label={`Bag, ${cart.count} item${cart.count === 1 ? '' : 's'}`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{cart.count}</span>
          </button>
        </div>
      </div>
      <AnimatePresence>{searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}</AnimatePresence>
    </header>
  );
}

/** Phone tab bar — the shop's own navigation (main app nav isn't shown in the shop). */
function TabBar() {
  const { cart, openCart } = useShop();
  const tab = ({ isActive }) => cn('flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-white' : 'text-white/45');
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0a0b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Shop sections">
      <div className="flex h-16">
        <NavLink to="/shop" end className={tab}><Store className="h-5 w-5" />Shop</NavLink>
        <NavLink to="/shop/design" className={tab}>
          {({ isActive }) => (<><span className={cn('flex h-7 w-7 items-center justify-center rounded-full', isActive ? 'bg-[#f0b94d] text-black' : 'bg-[#f0b94d]/15 text-[#f0b94d]')}><Wand2 className="h-4 w-4" /></span>Design</>)}
        </NavLink>
        <button type="button" onClick={openCart} className="relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-white/45" aria-label={`Bag, ${cart.count} item${cart.count === 1 ? '' : 's'}`}>
          <span className="relative"><ShoppingBag className="h-5 w-5" />{cart.count > 0 && <span className="absolute -right-2 -top-1.5 min-w-[18px] rounded-full bg-white px-1 text-center text-[10px] font-bold leading-[18px] text-black">{cart.count}</span>}</span>
          Bag
        </button>
        <NavLink to="/shop/orders" className={tab}><Package className="h-5 w-5" />Orders</NavLink>
      </div>
    </nav>
  );
}

function SearchOverlay({ onClose }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const panel = useRef(null);
  useFocusTrap(true, panel);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const go = (term) => { navigate(term ? `/shop?q=${encodeURIComponent(term)}#all` : '/shop'); onClose(); };
  const ideas = ['Gringo', 'Colombia', 'Pookie', 'Plata', 'Medellín', 'Hat'];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md" onClick={onClose}>
      <motion.div ref={panel} role="dialog" aria-modal="true" aria-label="Search the shop" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="mx-auto mt-20 w-full max-w-xl px-4">
        <form onSubmit={(e) => { e.preventDefault(); go(q.trim()); }} role="search">
          <label htmlFor="shop-search" className="sr-only">Search the shop</label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#131315] px-4 py-3.5">
            <Search className="h-5 w-5 text-white/45" />
            <input id="shop-search" data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phrases, tees, hoodies, hats" className="flex-1 bg-transparent text-base text-white placeholder:text-white/35 focus:outline-none" />
            <button type="button" onClick={onClose} aria-label="Close search" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {ideas.map((i) => (
            <button key={i} type="button" onClick={() => go(i)} className="h-10 rounded-full border border-white/12 px-4 text-sm text-white/70 hover:border-white/40 hover:text-white">{i}</button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShopFooter() {
  return (
    <footer className="mt-24 hidden border-t border-white/[0.07] md:block">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start justify-between gap-10 px-6 py-12 lg:px-10">
        <div>
          <p><Wordmark className="text-xl" /></p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">Phrases straight from the streams, printed when you order and shipped to you.</p>
        </div>
        <div className="flex gap-14 text-sm">
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Shop</p>
            <Link to="/shop" className="block text-white/65 hover:text-white">All merch</Link>
            <Link to="/shop/design" className="block text-white/65 hover:text-white">Design your own</Link>
            <Link to="/shop/library" className="block text-white/65 hover:text-white">Your library</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Help</p>
            <Link to="/shop/orders" className="block text-white/65 hover:text-white">Track an order</Link>
            <Link to="/support" className="block text-white/65 hover:text-white">Contact support</Link>
            <Link to="/terms" className="block text-white/65 hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1320px] items-center justify-between border-t border-white/[0.05] px-6 py-5 text-xs text-white/30 lg:px-10">
        <span>© {new Date().getFullYear()} The Homies</span>
        <Link to="/browse" className="block hover:text-white">Back to The Homies</Link>
      </div>
    </footer>
  );
}
