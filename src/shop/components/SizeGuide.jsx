import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Ruler } from 'lucide-react';
import { useFocusTrap } from '@/shop/components/ui';

// Approximate garment measurements (inches, laid flat). Bella+Canvas 3001 and
// Cotton Heritage M2580 published charts; hats are one size (adjustable strap).
const CHARTS = {
  tee: { title: 'Staple Tee', note: 'Unisex, true to size. Size up for an oversized fit.', rows: [['S', 18, 28], ['M', 20, 29], ['L', 22, 30], ['XL', 24, 31], ['2XL', 26, 32], ['3XL', 28, 33]] },
  hoodie: { title: 'Premium Hoodie', note: 'Unisex, relaxed fit with a dropped shoulder.', rows: [['S', 20, 27], ['M', 22, 28], ['L', 24, 29], ['XL', 26, 30], ['2XL', 28, 31], ['3XL', 30, 32]] },
};
// Garments without a chart here (crewneck, long sleeve, joggers, shorts) get a plain note, never the hat text.
const NO_CHART = { hat: 'One size fits most — adjustable strap in the back.' };

export default function SizeGuide({ open, onClose, kind = 'tee' }) {
  const chart = CHARTS[kind];
  const panel = useRef(null);
  useFocusTrap(open, panel);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="size-guide-title" onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="hh-shop w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0f0f11] p-6 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Ruler className="h-5 w-5 text-[#f0b94d]" /><h2 id="size-guide-title" className="font-display text-3xl">Size guide</h2></div>
              <button type="button" onClick={onClose} aria-label="Close size guide" data-autofocus className="rounded-full p-2 text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            {chart ? (
              <>
                <p className="mt-3 text-sm text-white/60">{chart.title} — {chart.note}</p>
                <table className="mt-5 w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider text-white/45"><th className="py-2">Size</th><th>Chest width</th><th>Length</th></tr></thead>
                  <tbody>{chart.rows.map(([s, w, l]) => <tr key={s} className="border-t border-white/[0.07]"><td className="py-2.5 font-semibold">{s}</td><td>{w}"</td><td>{l}"</td></tr>)}</tbody>
                </table>
                <p className="mt-4 text-xs text-white/40">Measured flat, approximate (±1"). Chest width × 2 ≈ around the chest.</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-white/60">{NO_CHART[kind] || 'Unisex, true to size. Pick your usual size; size up for a looser fit.'}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
