import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Copy, Palette } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Skeleton, ShopImage, Tip, pageMotion } from '@/shop/components/ui';
import { fetchMyDesigns, deleteDesign, createDesign, apiError } from '@/shop/lib/api';

// Saved designs (account, or this device for guests). Open / duplicate / delete.
export default function ShopDesigns() {
  const { studioAvailable, signedIn, notify, blanks } = useShop();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState(undefined);
  const [confirm, setConfirm] = useState(null);
  const load = () => fetchMyDesigns().then(setDesigns).catch(() => setDesigns(null));
  useEffect(() => { if (studioAvailable) load(); }, [studioAvailable, signedIn]);

  const duplicate = async (d) => {
    try {
      const copy = await createDesign({ name: `${d.name || 'Untitled design'} (copy)`, blankKey: d.blankKey, color: d.color, layers: d.layers });
      notify('Duplicated'); setDesigns((l) => [copy, ...(l || [])]);
    } catch (e) { notify(apiError(e), 'error'); }
  };
  const remove = async (d) => {
    setConfirm(null);
    const prev = designs;
    setDesigns((l) => l.filter((x) => x.id !== d.id));
    try { await deleteDesign(d.id); notify('Design deleted'); } catch (e) { setDesigns(prev); notify(apiError(e), 'error'); }
  };

  if (blanks !== undefined && !studioAvailable) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="font-display text-5xl">My designs</p><p className="mt-3 text-white/55">The Studio is almost ready — check back soon.</p></div>;
  }
  return (
    <motion.div {...pageMotion} className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      <Helmet><title>My designs — Homies Shop</title></Helmet>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-6xl sm:text-7xl">My designs</h1>
          <p className="mt-2 text-sm text-white/55">Everything you make in the Studio saves here automatically.</p>
        </div>
        <ShopButton as={Link} to="/shop/design" variant="gold"><Plus className="h-4 w-4" /> New design</ShopButton>
      </div>
      {!signedIn && <Tip className="mt-6 max-w-xl">These are saved on this device. <Link to="/?openAuth=1&tab=signin&redirect=/shop/designs" className="font-semibold text-white underline">Sign in</Link> to keep them forever and open them anywhere.</Tip>}
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
        {designs === undefined && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}
        {designs?.map((d) => (
          <div key={d.id} className="group">
            <button type="button" onClick={() => navigate(`/shop/design?design=${encodeURIComponent(d.id)}`)} className="shop-block block w-full overflow-hidden rounded-2xl">
              {d.previewUrl || d.preview ? <ShopImage src={d.previewUrl || d.preview} alt={d.name} className="aspect-[4/5] w-full bg-[#f4f3ef]" />
                : <div className="shop-checker flex aspect-[4/5] w-full items-center justify-center"><Palette className="h-8 w-8 text-white/30" /></div>}
            </button>
            <div className="mt-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{d.name || 'Untitled design'}</p>
                <p className="text-xs text-white/45">{d.updatedAt ? `Edited ${new Date(d.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</p>
              </div>
              <div className="flex shrink-0">
                <button type="button" aria-label={`Duplicate ${d.name}`} onClick={() => duplicate(d)} className="shop-block rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"><Copy className="h-4 w-4" /></button>
                <button type="button" aria-label={`Delete ${d.name}`} onClick={() => setConfirm(d)} className="shop-block rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-[#f3a0a0]"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {designs?.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-display text-4xl">No designs yet</p>
          <p className="mt-2 text-white/55">Start one — it only takes a minute.</p>
          <ShopButton as={Link} to="/shop/design" className="mt-6">Open the Studio</ShopButton>
        </div>
      )}
      {designs === null && <p className="py-16 text-center text-white/55">Couldn't load your designs. <button type="button" onClick={load} className="underline">Try again</button></p>}
      <AnimatePresence>
        {confirm && (
          <motion.div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)}>
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="hh-shop w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f0f11] p-6">
              <p id="del-title" className="font-display text-3xl">Delete design?</p>
              <p className="mt-2 text-sm text-white/60">“{confirm.name || 'Untitled design'}” will be gone for good.</p>
              <div className="mt-6 flex justify-end gap-2"><ShopButton variant="ghost" size="sm" onClick={() => setConfirm(null)}>Keep it</ShopButton><ShopButton variant="danger" size="sm" onClick={() => remove(confirm)}>Delete</ShopButton></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
