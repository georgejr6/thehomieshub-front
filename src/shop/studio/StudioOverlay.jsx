import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X, Wand2 } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { useFocusTrap } from '@/shop/components/ui';

// Desktop: "Customize" opens the Studio right over the page (no route change,
// the page and bag stay put). Esc or ✕ closes it; the design autosaves on close.
// Phones use the /shop/design route instead (lib/studioLink.js).
const StudioScreen = lazy(() => import('@/shop/studio/Studio').then((m) => ({ default: m.StudioScreen })));

const typing = (el) => !!el && (/^(input|textarea|select)$/i.test(el.tagName || '') || el.isContentEditable);

export default function StudioOverlay() {
  const { studioOverlay: init, closeStudio, openCart } = useShop();
  const panel = useRef(null);
  const restore = useRef(null);
  useFocusTrap(!!init, panel);

  useEffect(() => {
    if (!init) return undefined;
    restore.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key !== 'Escape' || typing(e.target)) return;
      // Another dialog on top (rights checkbox, art picker…) handles its own Esc.
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-studio-host]), [role="alertdialog"]')) return;
      closeStudio();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restore.current?.focus?.();
    };
  }, [init, closeStudio]);

  const onAdded = (opts) => { closeStudio(); if (!opts?.closeOnly) setTimeout(openCart, 180); };

  return (
    <AnimatePresence>
      {init && (
        <motion.div
          ref={panel}
          key={init.at}
          role="dialog" aria-modal="true" aria-label="The Homies Studio" data-studio-host
          className="hh-shop fixed inset-0 z-[60] flex flex-col bg-[#0a0a0b]"
          initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.15 } }}
        >
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0b94d]/15 text-[#f0b94d]"><Wand2 className="h-4 w-4" /></span>
            <p className="font-display text-[20px] leading-none tracking-wide">The Homies <span className="font-serif-i normal-case text-[#f0b94d]">studio</span></p>
            <span className="ml-3 hidden text-xs text-white/40 xl:inline">Saves automatically · Esc to close</span>
            <button type="button" data-autofocus onClick={closeStudio} aria-label="Close the Studio"
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/80 hover:border-white/35 hover:text-white">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>}>
              <StudioScreen init={init} embedded onAdded={onAdded} />
            </Suspense>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
