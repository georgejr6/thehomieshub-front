import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Search, ShoppingBag, Sparkles, X, Package, Palette, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { cn } from '@/lib/utils';
import { ShopProvider, useShop } from '@/shop/ShopContext';
import CartDrawer from '@/shop/components/CartDrawer';
import { Toast } from '@/shop/components/ui';
import '@/shop/shop.css';

// The Homies Shop "mode": its own full-screen layout (like Media Mode / Homies
// Chat) — own header, no app sidebar or bottom nav. Routes: App.jsx /shop/*.

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
  const studio = pathname.startsWith('/shop/design');
  useEffect(() => { if (!studio) window.scrollTo({ top: 0 }); }, [pathname, studio]);
  // index.css's phone tap-target rule skips the shop (it sizes its own buttons).
  useEffect(() => {
    document.body.classList.add('hh-shop-open');
    return () => document.body.classList.remove('hh-shop-open');
  }, []);
  return (
    <div className="hh-shop min-h-[100dvh]">
      <Helmet><meta name="theme-color" content="#0a0a0b" /></Helmet>
      <a href="#shop-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
      <ShopHeader compact={studio} />
      <main id="shop-main" className={studio ? '' : 'min-h-[70vh]'}>
        <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>}>
          <Outlet />
        </Suspense>
      </main>
      {!studio && <ShopFooter />}
      <CartDrawer />
      <Toast toast={toast} />
    </div>
  );
}

function ShopHeader({ compact }) {
  const { cart, openCart, studioAvailable } = useShop();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const navCls = ({ isActive }) => cn('shop-block rounded-full px-4 py-2 text-[13px] font-semibold tracking-wide transition-colors', isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white');

  return (
    <header className={cn('sticky top-0 z-50 transition-colors duration-300', scrolled || compact ? 'border-b border-white/[0.07] bg-[#0a0a0b]/85 backdrop-blur-xl' : 'bg-transparent')}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-10">
        <Link to="/browse" className="shop-block group flex items-center gap-1.5 rounded-full py-2 pr-3 text-[12px] font-semibold text-white/55 hover:text-white" aria-label="Back to The Homies">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden md:inline">The Homies</span>
        </Link>
        <Link to="/shop" className="shop-block mr-auto flex items-baseline gap-2 md:mr-0" aria-label="The Homies Shop home">
          <span className="font-display text-[26px] leading-none">The Homies</span>
          <span className="font-serif-i text-[19px] leading-none text-[#f0b94d]">shop</span>
        </Link>
        <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label="Shop">
          <NavLink to="/shop" end className={navCls}>Shop</NavLink>
          <NavLink to="/shop/collections/must" className={navCls}>Must-Haves</NavLink>
          {studioAvailable && <NavLink to="/shop/design" className={navCls}>Design your own</NavLink>}
          <NavLink to="/shop/orders" className={navCls}>Orders</NavLink>
        </nav>
        <div className="flex items-center gap-1">
          <IconBtn label="Search" onClick={() => setSearchOpen(true)}><Search className="h-[18px] w-[18px]" /></IconBtn>
          {studioAvailable && <IconBtn as={Link} to="/shop/designs" label="My designs" className="hidden sm:inline-flex"><Palette className="h-[18px] w-[18px]" /></IconBtn>}
          <IconBtn as={Link} to="/shop/orders" label="My orders" className="md:hidden"><Package className="h-[18px] w-[18px]" /></IconBtn>
          <button
            type="button"
            onClick={openCart}
            className="shop-block relative ml-1 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-bold text-black transition hover:bg-[#f0b94d]"
            aria-label={`Cart, ${cart.count} item${cart.count === 1 ? '' : 's'}`}
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

function IconBtn({ as: Comp = 'button', label, className, children, ...props }) {
  return (
    <Comp aria-label={label} title={label} className={cn('shop-block inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white', className)} {...props}>
      {children}
    </Comp>
  );
}

function SearchOverlay({ onClose }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const input = useRef(null);
  useEffect(() => {
    input.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const submit = (e) => { e.preventDefault(); navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}#all` : '/shop'); onClose(); };
  const ideas = ['Gringo', 'Colombia', 'Pookie', 'Plata', 'Medellín', 'Hat'];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md" onClick={onClose}>
      <motion.form initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} onSubmit={submit} onClick={(e) => e.stopPropagation()} className="mx-auto mt-20 w-full max-w-2xl px-4" role="search">
        <label htmlFor="shop-search" className="sr-only">Search the shop</label>
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#131315] px-5 py-4">
          <Search className="h-5 w-5 text-white/50" />
          <input id="shop-search" ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phrases, tees, hoodies, hats…" className="flex-1 bg-transparent text-lg text-white placeholder:text-white/35 focus:outline-none" />
          <button type="button" onClick={onClose} aria-label="Close search" className="shop-block rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ideas.map((i) => (
            <button key={i} type="button" onClick={() => { navigate(`/shop?q=${encodeURIComponent(i)}#all`); onClose(); }} className="shop-block rounded-full border border-white/12 px-4 py-2 text-sm text-white/75 hover:border-white/40 hover:text-white">{i}</button>
          ))}
        </div>
      </motion.form>
    </motion.div>
  );
}

function ShopFooter() {
  const { studioAvailable } = useShop();
  return (
    <footer className="mt-24 border-t border-white/[0.07]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-10">
        <div className="md:col-span-2">
          <p className="font-display text-4xl leading-none">The Homies <span className="font-serif-i normal-case text-[#f0b94d]">shop</span></p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">Phrases straight from the streams, printed to order and shipped to you. Every piece is made when you order it — no waste, no warehouse.</p>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Shop</p>
          <Link to="/shop/collections/must" className="shop-block text-white/70 hover:text-white">Must-Haves</Link>
          <Link to="/shop/collections/hats" className="shop-block text-white/70 hover:text-white">Hats</Link>
          {studioAvailable && <Link to="/shop/design" className="shop-block text-white/70 hover:text-white">Design your own</Link>}
          {studioAvailable && <Link to="/shop/designs" className="shop-block text-white/70 hover:text-white">My designs</Link>}
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Help</p>
          <Link to="/shop/orders" className="shop-block text-white/70 hover:text-white">Track an order</Link>
          <Link to="/support" className="shop-block text-white/70 hover:text-white">Contact support</Link>
          <Link to="/terms" className="shop-block text-white/70 hover:text-white">Terms</Link>
          <Link to="/browse" className="shop-block text-white/70 hover:text-white">Back to The Homies</Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-6 text-xs text-white/35 sm:px-6 lg:px-10">
        <span>© {new Date().getFullYear()} The Homies</span>
        <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Printed on demand · US shipping</span>
      </div>
    </footer>
  );
}
