import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Ruler } from 'lucide-react';
import { useFocusTrap, Pill } from '@/shop/components/ui';
import { tabsOf, tableOf, unitsOf, TAB_LABEL } from '@/shop/lib/sizeChart';

// The chart comes from the product payload (`product.sizeChart`): Printful's real
// size tables, inches + cm, garment + body, with its measuring diagram. Until
// that payload exists (older API, or a product Printful has no chart for) the
// approximate tee/hoodie numbers below are shown, and other garments get a note.
const LEGACY = {
  tee: { title: 'Staple Tee', note: 'Unisex, true to size. Size up for an oversized fit.', rows: [['S', 18, 28], ['M', 20, 29], ['L', 22, 30], ['XL', 24, 31], ['2XL', 26, 32], ['3XL', 28, 33]] },
  hoodie: { title: 'Premium Hoodie', note: 'Unisex, relaxed fit with a dropped shoulder.', rows: [['S', 20, 27], ['M', 22, 28], ['L', 24, 29], ['XL', 26, 30], ['2XL', 28, 31], ['3XL', 30, 32]] },
};
const ONE_SIZE_NOTE = {
  hat: 'One size fits most — adjustable strap in the back.',
  beanie: 'One size fits most — snug cuffed stretch fit.',
};

function ChartView({ chart, kind }) {
  const tabs = tabsOf(chart);
  const [wantUnit, setUnit] = useState('in');
  const [tab, setTab] = useState(tabs[0]);
  const active = tabs.includes(tab) ? tab : tabs[0];
  const table = tableOf(chart, active, wantUnit);
  if (!table) return null;
  const unit = table.unit; // the unit actually shown
  const units = unitsOf(chart, active);
  const oneSize = !!chart.oneSize;
  return (
    <>
      {oneSize && <p className="mt-3 text-sm text-white/60">{ONE_SIZE_NOTE[kind] || ONE_SIZE_NOTE[chart.kind] || 'One size fits most.'}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {tabs.length > 1
          ? <div className="flex gap-2" role="group" aria-label="Measurement type">{tabs.map((t) => <Pill key={t} selected={t === active} onClick={() => setTab(t)} className="h-8 min-w-0 px-3 text-xs">{TAB_LABEL[t]}</Pill>)}</div>
          : <span className="text-xs font-semibold uppercase tracking-wider text-white/45">{TAB_LABEL[active]} measurements</span>}
        <div className="flex gap-2" role="group" aria-label="Units">
          {['in', 'cm'].map((u) => <Pill key={u} selected={unit === u} disabled={!units.includes(u)} onClick={() => setUnit(u)} className="h-8 min-w-0 px-3 text-xs">{u}</Pill>)}
        </div>
      </div>
      {table.image && (
        <div className="mt-4 flex justify-center rounded-2xl bg-white p-2">
          <img src={table.image} alt={`${TAB_LABEL[active]} measuring diagram`} loading="lazy" className="max-h-52 w-auto min-w-0 max-w-full object-contain" />
        </div>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-white/45"><th className="py-2 pr-3">Size</th>{table.columns.map((c) => <th key={c} className="py-2 pr-3">{c} ({table.unit})</th>)}</tr></thead>
          <tbody>{table.rows.map((r) => (
            <tr key={r.size} className="border-t border-white/[0.07]"><td className="py-2.5 pr-3 font-semibold">{r.size}</td>{r.cells.map((c, i) => <td key={i} className="pr-3 tabular-nums">{c}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
      {table.howTo.length > 0 && <ul className="mt-4 space-y-1 text-xs text-white/55">{table.howTo.map((l, i) => <li key={i}>{l}</li>)}</ul>}
      <p className="mt-4 text-xs text-white/40">{table.notes[0] || 'Measurements are from the manufacturer and may vary by up to 2" (5 cm).'}</p>
    </>
  );
}

export default function SizeGuide({ open, onClose, kind = 'tee', chart = null }) {
  const legacy = !chart && LEGACY[kind];
  const panel = useRef(null);
  useFocusTrap(open, panel);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const hasChart = !!chart && tabsOf(chart).length > 0;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="size-guide-title" onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="hh-shop max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f0f11] p-6 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Ruler className="h-5 w-5 text-[#f0b94d]" /><h2 id="size-guide-title" className="font-display text-3xl">Size guide</h2></div>
              <button type="button" onClick={onClose} aria-label="Close size guide" data-autofocus className="rounded-full p-2 text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            {hasChart ? (
              <ChartView chart={chart} kind={kind} />
            ) : legacy ? (
              <>
                <p className="mt-3 text-sm text-white/60">{legacy.title} — {legacy.note}</p>
                <table className="mt-5 w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider text-white/45"><th className="py-2">Size</th><th>Chest width</th><th>Length</th></tr></thead>
                  <tbody>{legacy.rows.map(([s, w, l]) => <tr key={s} className="border-t border-white/[0.07]"><td className="py-2.5 font-semibold">{s}</td><td>{w}"</td><td>{l}"</td></tr>)}</tbody>
                </table>
                <p className="mt-4 text-xs text-white/40">Measured flat, approximate (±1"). Chest width × 2 ≈ around the chest.</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-white/60">{ONE_SIZE_NOTE[kind] || 'Unisex, true to size. Pick your usual size; size up for a looser fit.'}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
