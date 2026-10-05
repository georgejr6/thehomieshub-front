import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Copy, Palette, PenLine, ShoppingBag, Globe, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Skeleton, ShopImage, Tip, Pill, useFocusTrap } from '@/shop/components/ui';
import { fetchMyDesigns, deleteDesign, createDesign, updateDesign, apiError } from '@/shop/lib/api';
import { customPriceCents, usd } from '@/shop/lib/pricing';
import { studioHref, prefetchStudio } from '@/shop/lib/studioLink';

// "Your library": every design you've made in the Studio (account, or this
// device for guests), newest first. Bag copies never show here.
const usedKeys = (d) => Object.keys(d?.layers || {}).filter((k) => (d.layers[k] || []).length);
const edited = (d) => {
  const t = Date.parse(d?.updatedAt || d?.createdAt || '');
  return t ? `Edited ${new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : '';
};

export default function ShopLibrary() {
  const { studioAvailable, signedIn, notify, blanks, cart, openCart, openStudio } = useShop();
  const [designs, setDesigns] = useState(undefined);
  const [confirm, setConfirm] = useState(null);
  const [bagging, setBagging] = useState(null); // design being added to the bag
  const load = () => fetchMyDesigns().then(setDesigns).catch(() => setDesigns(null));
  useEffect(() => { if (studioAvailable) load(); }, [studioAvailable, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id, p) => setDesigns((l) => (l || []).map((x) => (x.id === id ? { ...x, ...p } : x)));
  const rename = async (d, name) => {
    const clean = name.trim().slice(0, 60) || 'Untitled design';
    if (clean === (d.name || '')) return;
    patch(d.id, { name: clean });
    try { await updateDesign(d.id, { name: clean }); notify('Renamed'); } catch (e) { patch(d.id, { name: d.name }); notify(apiError(e), 'error'); }
  };
  const duplicate = async (d) => {
    try {
      const copy = await createDesign({ name: `${d.name || 'Untitled design'} (copy)`.slice(0, 60), blankKey: d.blankKey, color: d.color, layers: d.layers, ...(d.previewUrl ? { previewUrl: d.previewUrl } : {}) });
      notify('Duplicated'); setDesigns((l) => [copy, ...(l || [])]);
    } catch (e) { notify(apiError(e), 'error'); }
  };
  const remove = async (d) => {
    setConfirm(null);
    const prev = designs;
    setDesigns((l) => l.filter((x) => x.id !== d.id));
    try { await deleteDesign(d.id); notify('Design deleted'); } catch (e) { setDesigns(prev); notify(apiError(e), 'error'); }
  };
  const open = (e, d) => { if (openStudio({ design: d.id })) e.preventDefault(); };

  if (blanks !== undefined && !studioAvailable) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="font-display text-5xl">Your library</p><p className="mt-3 text-white/55">The Studio is almost ready — check back soon.</p></div>;
  }
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      <Helmet><title>Your library | The Homies</title></Helmet>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-7xl">Your library</h1>
          <p className="mt-2 text-sm text-white/55">Everything you make in the Studio saves here automatically.</p>
        </div>
        <ShopButton as={Link} to="/shop/design" variant="gold" onMouseEnter={prefetchStudio} onClick={(e) => { if (openStudio({})) e.preventDefault(); }}><Plus className="h-4 w-4" /> New design</ShopButton>
      </div>
      {!signedIn && (
        <Tip className="mt-6 max-w-xl">These designs live on this device only. <Link to="/?openAuth=1&tab=signin&redirect=/shop/library" className="font-semibold text-white underline">Sign in to keep your library</Link> forever and open it anywhere.</Tip>
      )}
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
        {designs === undefined && Array.from({ length: 4 }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5]" /><Skeleton className="mt-3 h-4 w-2/3" /></div>)}
        {designs?.map((d) => {
          const blank = blanks?.find((b) => b.key === d.blankKey);
          return (
            <article key={d.id} className="group min-w-0">
              <Link to={studioHref({ design: d.id })} onClick={(e) => open(e, d)} onMouseEnter={prefetchStudio} className="block overflow-hidden rounded-[22px]" aria-label={`Open ${d.name || 'Untitled design'} in the Studio`}>
                <DesignThumb design={d} blank={blank} />
              </Link>
              <NameField design={d} onRename={(n) => rename(d, n)} />
              <p className="mt-0.5 truncate text-xs text-white/45">{[blank?.name, d.color, edited(d)].filter(Boolean).join(' · ')}</p>
              <div className="mt-3 grid gap-1.5 sm:flex sm:flex-wrap sm:items-center">
                <Link to={studioHref({ design: d.id })} onClick={(e) => open(e, d)} onMouseEnter={prefetchStudio}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-black hover:bg-[#f0b94d] sm:h-9"><PenLine className="h-3.5 w-3.5" /> Open in Studio</Link>
                <button type="button" onClick={() => setBagging(d)} disabled={!blank || !usedKeys(d).length}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/15 px-3.5 text-xs font-semibold hover:border-white/40 disabled:opacity-30 sm:h-9"><ShoppingBag className="h-3.5 w-3.5" /> Add to bag</button>
              </div>
              <div className="mt-1.5 flex items-center gap-0.5">
                <IconBtn label={`Duplicate ${d.name || 'design'}`} onClick={() => duplicate(d)}><Copy className="h-4 w-4" /></IconBtn>
                <IconBtn label={`Delete ${d.name || 'design'}`} onClick={() => setConfirm(d)} danger><Trash2 className="h-4 w-4" /></IconBtn>
                <span className="ml-auto inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-white/30" aria-disabled="true" title="Publishing your designs to the shop is coming soon">
                  <Globe className="h-3.5 w-3.5" /> Publish · soon
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {designs?.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-display text-4xl">Nothing here yet</p>
          <p className="mt-2 text-white/55">Start a design — it only takes a minute, and it saves here as you go.</p>
          <ShopButton as={Link} to="/shop/design" className="mt-6" onClick={(e) => { if (openStudio({})) e.preventDefault(); }}>Open the Studio</ShopButton>
        </div>
      )}
      {designs === null && <p className="py-16 text-center text-white/55">Couldn't load your library. <button type="button" onClick={load} className="underline">Try again</button></p>}

      <BagDialog design={bagging} blanks={blanks} onClose={() => setBagging(null)} onAdded={(line) => {
        const err = cart.add(line);
        if (err) { notify(err, 'error'); return; }
        setBagging(null); notify('Added to your bag'); openCart();
      }} notify={notify} />

      <AnimatePresence>
        {confirm && (
          <motion.div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)}>
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="hh-shop w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f0f11] p-6">
              <p id="del-title" className="font-display text-3xl">Delete design?</p>
              <p className="mt-2 text-sm text-white/60">“{confirm.name || 'Untitled design'}” will be gone for good. Anything already in your bag stays.</p>
              <div className="mt-6 flex justify-end gap-2"><ShopButton variant="ghost" size="sm" onClick={() => setConfirm(null)}>Keep it</ShopButton><ShopButton variant="danger" size="sm" onClick={() => remove(confirm)}>Delete</ShopButton></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Saved preview, else render one from the layers on the garment (lazy: loads the Studio renderer). */
function DesignThumb({ design, blank }) {
  const saved = design.thumbnailUrl || design.previewUrl;
  const [made, setMade] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (saved || !blank || !usedKeys(design).length) return undefined;
    let alive = true; let url = '';
    const el = ref.current;
    const run = async () => {
      try {
        const [{ exportPreview }, { resolveTemplate }, { withFontSize }] = await Promise.all([import('@/shop/studio/exporter'), import('@/shop/studio/template'), import('@/shop/studio/model')]);
        const key = usedKeys(design).find((k) => !/sleeve|back/.test(k)) || usedKeys(design)[0];
        const layers = (design.layers[key] || []).map((l) => (l.type === 'text' ? withFontSize(l) : l));
        const blob = await exportPreview({ template: resolveTemplate(blank, design.color, key), layers, size: 520 });
        if (alive) { url = URL.createObjectURL(blob); setMade(url); }
      } catch (e) { console.warn('[shop] library thumbnail failed', e); }
    };
    // Only render thumbnails that scroll into view.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } }, { rootMargin: '200px' });
    if (el) io.observe(el);
    return () => { alive = false; io.disconnect(); if (url) URL.revokeObjectURL(url); };
  }, [saved, blank, design]);
  const src = saved || made;
  return (
    <div ref={ref} className="aspect-[4/5] w-full overflow-hidden bg-white">
      {src
        ? <ShopImage src={src} alt="" className="h-full w-full bg-white" fit="cover" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]" />
        : <div className="flex h-full w-full items-center justify-center"><Palette className="h-8 w-8 text-black/20" /></div>}
    </div>
  );
}

function IconBtn({ label, danger, children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full text-white/45 hover:bg-white/10', danger ? 'hover:text-[#f3a0a0]' : 'hover:text-white')} {...props}>{children}</button>
  );
}

/** Name with inline rename (click ✎, Enter saves, Esc cancels). */
function NameField({ design, onRename }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(design.name || '');
  const input = useRef(null);
  useEffect(() => { if (editing) { setV(design.name || ''); setTimeout(() => input.current?.select(), 0); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (editing) {
    const save = () => { setEditing(false); onRename(v); };
    return (
      <form className="mt-3 flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <input ref={input} value={v} maxLength={60} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); } }}
          aria-label="Design name" className="h-9 min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-2.5 text-base font-semibold text-white focus:border-white/50 focus:outline-none sm:text-sm" />
        <IconBtn label="Save name" type="submit"><Check className="h-4 w-4" /></IconBtn>
        <IconBtn label="Cancel" onClick={() => setEditing(false)}><X className="h-4 w-4" /></IconBtn>
      </form>
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="group/name mt-3 flex w-full min-w-0 items-center gap-1.5 text-left" aria-label={`Rename ${design.name || 'Untitled design'}`}>
      <span className="truncate font-semibold">{design.name || 'Untitled design'}</span>
      <PenLine className="h-3.5 w-3.5 shrink-0 text-white/30 opacity-0 transition group-hover/name:opacity-100 group-focus-visible/name:opacity-100" />
    </button>
  );
}

/** Pick a size, then freeze a bag copy with print files (same pipeline as the Studio). */
function BagDialog({ design, blanks, onClose, onAdded, notify }) {
  const ref = useRef(null);
  const [size, setSize] = useState('');
  const [busy, setBusy] = useState('');
  const blank = blanks?.find((b) => b.key === design?.blankKey);
  const color = blank?.colors.find((c) => c.name === design?.color) || blank?.colors[0];
  useFocusTrap(!!design, ref);
  useEffect(() => { if (design && blank) setSize(blank.sizes.includes('L') ? 'L' : blank.sizes[0]); setBusy(''); }, [design]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!design) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [design, busy, onClose]);
  const variant = blank?.variants.find((v) => v.color === color?.name && v.size === size);
  const price = blank ? customPriceCents(blank, usedKeys(design), variant) : 0;

  const add = async () => {
    if (!variant) { notify('Pick a size.', 'error'); return; }
    setBusy('Preparing your print files');
    try {
      const [{ bagDesign }, { withFontSize }, { getImage }] = await Promise.all([import('@/shop/studio/bagDesign'), import('@/shop/studio/model'), import('@/shop/studio/exporter')]);
      const layers = {};
      for (const [k, list] of Object.entries(design.layers || {})) {
        layers[k] = await Promise.all((list || []).map(async (l) => {
          if (l.type === 'text') return withFontSize(l);
          if (l.naturalWidth > 0) return l;
          const img = await getImage(l.src).catch(() => null);
          return { ...l, naturalWidth: img?.naturalWidth || l.width, naturalHeight: img?.naturalHeight || l.height };
        }));
      }
      const line = await bagDesign({
        blank, color, size, variant, doc: { blankKey: design.blankKey, color: design.color, layers }, name: design.name,
        priceCents: price, originalId: design.id, onStep: setBusy,
      });
      onAdded(line);
    } catch (e) {
      notify(apiError(e, e?.message || 'Could not add it to your bag. Open it in the Studio and try again.'), 'error');
      setBusy('');
    }
  };

  return (
    <AnimatePresence>
      {design && blank && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()}>
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="bag-title" onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className="hh-shop w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0f0f11] p-6 sm:rounded-3xl">
            <div className="flex gap-4">
              {design.previewUrl && <ShopImage src={design.previewUrl} alt="" className="h-24 w-20 shrink-0 rounded-xl bg-[#f2f1ed]" fit="contain" />}
              <div className="min-w-0">
                <h2 id="bag-title" className="font-display text-3xl leading-none">Add to bag</h2>
                <p className="mt-2 truncate text-sm text-white/60">{design.name || 'Untitled design'}</p>
                <p className="text-xs text-white/40">{blank.name} · {color?.name}</p>
              </div>
            </div>
            {blank.sizes.length > 1 && (
              <div className="mt-6">
                <p className="mb-2.5 text-sm font-semibold">Size</p>
                <div className="flex flex-wrap gap-2">{blank.sizes.map((s) => <Pill key={s} selected={s === size} onClick={() => setSize(s)}>{s}</Pill>)}</div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-white/55">Your price</span>
              <span className="font-display text-3xl">{usd(price)}</span>
            </div>
            {busy && <p className="mt-3 text-xs text-white/50" role="status">{busy}…</p>}
            <div className="mt-5 flex justify-end gap-2">
              <ShopButton variant="ghost" size="sm" onClick={onClose} disabled={!!busy}>Cancel</ShopButton>
              <ShopButton size="sm" onClick={add} loading={!!busy} data-autofocus><ShoppingBag className="h-4 w-4" /> Add to bag</ShopButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
