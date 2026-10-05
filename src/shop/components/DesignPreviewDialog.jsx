import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, X } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, ShopImage, useFocusTrap } from '@/shop/components/ui';
import { usd, lineTotalCents } from '@/shop/lib/pricing';

/** Big look at a finished custom piece in the bag ("Your design"), with a way back to edit the original. */
export default function DesignPreviewDialog({ line, onClose }) {
  const { closeCart } = useShop();
  const panel = useRef(null);
  useFocusTrap(!!line, panel);
  useEffect(() => {
    if (!line) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [line, onClose]);
  const editHref = line?.sourceId ? `/shop/design?design=${encodeURIComponent(line.sourceId)}` : '/shop/library';
  return (
    <AnimatePresence>
      {line && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="design-preview-title" onClick={(e) => e.stopPropagation()}
            initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className="hh-shop max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f0f11] p-5 sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p id="design-preview-title" className="truncate font-display text-2xl">{line.name}</p>
                <p className="mt-0.5 text-sm text-white/55">{line.variant} · Qty {line.quantity} · {usd(lineTotalCents(line))}</p>
              </div>
              <button type="button" data-autofocus onClick={onClose} aria-label="Close preview" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-white">
              <ShopImage src={line.image} alt={`Your design: ${line.name}`} fit="contain" className="aspect-square w-full" priority />
            </div>
            <p className="mt-3 text-xs text-white/45">This is your finished piece as it'll be made. We check every custom design before it prints.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <ShopButton variant="ghost" size="sm" onClick={onClose}>Looks good</ShopButton>
              <ShopButton as={Link} to={editHref} size="sm" onClick={() => { onClose(); closeCart(); }}><Pencil className="h-4 w-4" /> Edit design</ShopButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
