import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Tip, useFocusTrap } from '@/shop/components/ui';
import CartLine from '@/shop/components/CartLine';
import { subtotalCents, usd } from '@/shop/lib/pricing';
import { needsApproval } from '@/shop/lib/cart';

// Slide-in cart. Checkout happens on /shop/cart (Cart → Review → Pay).
export default function CartDrawer() {
  const { cartOpen, closeCart, cart } = useShop();
  const navigate = useNavigate();
  const panel = useRef(null);
  useFocusTrap(cartOpen, panel);
  useEffect(() => {
    if (!cartOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [cartOpen, closeCart]);

  const subtotal = subtotalCents(cart.cart);
  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCart} />
          <motion.aside
            key="panel"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            className="hh-shop fixed inset-y-0 right-0 z-[61] flex w-full max-w-[440px] flex-col border-l border-white/10 bg-[#0e0e10] shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: { type: 'spring', stiffness: 380, damping: 38 } }}
            exit={{ x: '100%', transition: { duration: 0.2 } }}
          >
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <div>
                <p className="font-display text-3xl leading-none">Your bag</p>
                <p className="mt-1 text-xs text-white/50">{cart.count} item{cart.count === 1 ? '' : 's'}</p>
              </div>
              <button type="button" data-autofocus onClick={closeCart} aria-label="Close bag" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {cart.cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center pb-16 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05]"><ShoppingBag className="h-7 w-7 text-white/50" /></div>
                  <p className="font-display text-2xl">Nothing in here yet</p>
                  <p className="mt-2 max-w-xs text-sm text-white/55">Grab a phrase from the streams — every piece is printed when you order it.</p>
                  <ShopButton className="mt-6" onClick={() => { closeCart(); navigate('/shop'); }}>Start shopping</ShopButton>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.07]">
                  {cart.cart.map((l) => <li key={l.key} className="py-5"><CartLine line={l} compact /></li>)}
                </ul>
              )}
              {cart.saved.length > 0 && (
                <div className="mt-6 border-t border-white/[0.07] pt-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Saved for later</p>
                  <ul className="space-y-4">{cart.saved.map((l) => <li key={l.key}><CartLine line={l} saved compact /></li>)}</ul>
                </div>
              )}
            </div>
            {cart.cart.length > 0 && (
              <div className="border-t border-white/10 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
                {needsApproval(cart.cart) && <Tip className="mb-4">Customized pieces get a quick quality check before printing — usually within a day.</Tip>}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-white/60">Subtotal</span>
                  <span className="font-display text-3xl">{usd(subtotal)}</span>
                </div>
                <p className="mt-1 text-xs text-white/40">Shipping is calculated at checkout.</p>
                <ShopButton size="lg" className="mt-5 w-full" onClick={() => { closeCart(); navigate('/shop/cart?step=review'); }}>
                  Checkout <ArrowRight className="h-4 w-4" />
                </ShopButton>
                <Link to="/shop/cart" onClick={closeCart} className="block mt-3 text-center text-sm text-white/55 hover:text-white">View full cart</Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
