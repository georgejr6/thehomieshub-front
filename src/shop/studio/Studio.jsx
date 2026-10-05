import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Type, ImagePlus, Sparkles, Undo2, Redo2, Trash2, Copy, ChevronUp, ChevronDown, Eye, PenLine, Layers as LayersIcon,
  Shirt, AlignCenterHorizontal, AlignCenterVertical, RotateCcw, Check, Loader2, CloudOff, Cloud, X, Wand2, ShoppingBag, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Swatch, Pill, Tip, Skeleton, ShopImage } from '@/shop/components/ui';
import StudioCanvas from '@/shop/studio/StudioCanvas';
import useHistory from '@/shop/studio/useHistory';
import {
  STUDIO_FONTS, INKS, THREADS, newDoc, placementOf, usedPlacements, defaultInk, makeTextLayer, makeImageLayer,
  isEmbroidery, validateDoc, minEmbroideryFontSize, clampToArea, EMB_MAX_LINES, TEXT_MAX,
} from '@/shop/studio/model';
import { exportPlacement, exportPreview, registerLocalImage, getImage } from '@/shop/studio/exporter';
import { effectiveDpi, dpiStatus, DPI_COPY, inchesLabel } from '@/shop/lib/dpi';
import { customPriceCents, usd, addonDelta } from '@/shop/lib/pricing';
import { createAutosaver } from '@/shop/lib/autosave';
import {
  validateUpload, uploadImage, loadImage, createDesign, updateDesign, fetchDesign, savePrintfiles, requestMockup, pollMockup, apiError,
} from '@/shop/lib/api';
import { artUrl } from '@/shop/lib/catalog';
import { DESIGNS } from '@/shop/data/designs';

const DRAFT_KEY = 'hh_studio_draft_v1';
const COACH_KEY = 'hh_studio_coach_v1';
const RIGHTS_KEY = 'hh_studio_rights_ok';
const DARK = /black|navy|carbon|charcoal/i;

export default function Studio() {
  const { blanks, studioAvailable } = useShop();
  if (blanks === undefined) return <div className="grid h-[calc(100dvh-4rem)] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  if (!studioAvailable) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <Wand2 className="h-10 w-10 text-[#f0b94d]" />
        <h1 className="font-display mt-5 text-6xl leading-[0.9]">The Studio is<br />almost ready</h1>
        <p className="mt-4 text-white/60">Design-your-own is coming very soon. In the meantime, the full drop is live.</p>
        <ShopButton as={Link} to="/shop" className="mt-8">Shop the drop</ShopButton>
      </div>
    );
  }
  return <StudioEditor blanks={blanks} />;
}

function StudioEditor({ blanks }) {
  const { cart, notify, openCart, signedIn } = useShop();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialBlank = blanks.find((b) => b.key === params.get('blank')) || blanks[0];
  const initialColor = initialBlank.colors.find((c) => c.name === params.get('color'))?.name || initialBlank.colors[0]?.name;

  const history = useHistory(newDoc(initialBlank, initialColor));
  const [live, setLive] = useState(null);
  const doc = live || history.state;
  const blank = blanks.find((b) => b.key === doc.blankKey) || blanks[0];
  const [placementKey, setPlacementKey] = useState(blank.placements[0].key);
  const placement = placementOf(blank, placementKey) || blank.placements[0];
  const layers = doc.layers[placement.key] || [];
  const [selectedId, setSelectedId] = useState(null);
  const selected = layers.find((l) => l.id === selectedId) || null;
  const [size, setSize] = useState(blank.sizes.includes('L') ? 'L' : blank.sizes[0]);
  const [name, setName] = useState('Untitled design');
  const [designId, setDesignId] = useState(params.get('design') || null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [busy, setBusy] = useState(null); // { label, pct? }
  const [mode, setMode] = useState('edit'); // edit | preview
  const [mobileTab, setMobileTab] = useState('add');
  const [rightsAsk, setRightsAsk] = useState(null); // pending File[]
  const [picker, setPicker] = useState(false);
  const [resume, setResume] = useState(null);
  const [coach, setCoach] = useState(() => { try { return localStorage.getItem(COACH_KEY) ? -1 : 0; } catch { return -1; } });
  const fileInput = useRef(null);
  const designIdRef = useRef(designId);
  designIdRef.current = designId;
  const color = blank.colors.find((c) => c.name === doc.color) || blank.colors[0];
  const used = usedPlacements(doc);
  const price = customPriceCents(blank, used.length ? used : [blank.placements[0].key]);
  const variant = blank.variants.find((v) => v.color === color.name && v.size === size) || blank.variants.find((v) => v.color === color.name);

  // ── autosave (local immediately, server after 5 s) ──
  const saver = useMemo(() => createAutosaver({
    storageKey: DRAFT_KEY,
    delay: 5000,
    onStatus: setSaveStatus,
    save: async (state) => {
      const body = { name: state.name, blankKey: state.doc.blankKey, color: state.doc.color, layers: state.doc.layers };
      if (designIdRef.current) await updateDesign(designIdRef.current, body);
      else {
        const d = await createDesign(body);
        if (d?.id) { designIdRef.current = d.id; setDesignId(d.id); }
      }
    },
  }), []);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) return;
    saver.schedule({ designId: designIdRef.current, name, doc: history.state });
  }, [history.state, name, saver]);
  useEffect(() => {
    if (designId && params.get('design') !== designId) { const p = new URLSearchParams(params); p.set('design', designId); p.delete('from'); setParams(p, { replace: true }); }
  }, [designId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onLeave = () => { saver.flush(); };
    window.addEventListener('pagehide', onLeave);
    return () => { window.removeEventListener('pagehide', onLeave); saver.flush(); };
  }, [saver]);

  // ── load: ?design=<id>, ?from=<catalog design>, or offer to resume the local draft ──
  useEffect(() => {
    const id = params.get('design');
    const from = params.get('from');
    let alive = true;
    if (id) {
      fetchDesign(id).then((d) => {
        if (!alive || !d) return;
        const b = blanks.find((x) => x.key === d.blankKey) || blanks[0];
        const base = newDoc(b, d.color);
        history.reset({ ...base, layers: { ...base.layers, ...(d.layers || {}) } });
        setName(d.name || 'Untitled design');
        saver.markSaved({ designId: id, name: d.name, doc: { ...base, layers: d.layers } });
        setPlacementKey(b.placements[0].key);
      }).catch(() => notify("Couldn't open that design.", 'error'));
    } else if (from && DESIGNS.some((d) => d.id === from)) {
      const ink = DARK.test(initialColor || '') ? 'white' : 'black';
      const src = artUrl(from, ink);
      getImage(src).then((img) => {
        if (!alive) return;
        const p = initialBlank.placements[0];
        const l = makeImageLayer(p, { src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, name: DESIGNS.find((d) => d.id === from)?.phrase });
        dirty.current = true;
        history.reset({ ...newDoc(initialBlank, initialColor), layers: { ...newDoc(initialBlank, initialColor).layers, [p.key]: [l] } });
        setName(DESIGNS.find((d) => d.id === from)?.phrase || 'Untitled design');
      }).catch(() => {});
    } else {
      const draft = saver.loadLocal();
      if (draft?.state?.doc && usedPlacements(draft.state.doc).length) setResume(draft);
    }
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── doc mutations ──
  const commitLayers = useCallback((next, key = placement.key) => {
    dirty.current = true;
    setLive(null);
    history.commit((s) => ({ ...s, layers: { ...s.layers, [key]: next } }));
  }, [history, placement.key]);
  const previewLayers = useCallback((next) => {
    setLive({ ...history.state, layers: { ...history.state.layers, [placement.key]: next } });
  }, [history.state, placement.key]);
  const patchSelected = (patch) => selected && commitLayers(layers.map((l) => (l.id === selected.id ? { ...l, ...patch } : l)));

  const addText = () => {
    const ink = isEmbroidery(placement) ? defaultInk(color.name, true) : defaultInk(color.name);
    const l = makeTextLayer(placement, { text: isEmbroidery(placement) ? 'YOUR NAME' : 'YOUR TEXT', color: ink });
    commitLayers([...layers, l]);
    setSelectedId(l.id);
    setMobileTab('edit');
  };
  const addFiles = async (files) => {
    if (isEmbroidery(placement)) { notify('Embroidery is text only — add text instead.', 'error'); return; }
    let ok = false;
    try { ok = sessionStorage.getItem(RIGHTS_KEY) === '1'; } catch { /* ignore */ }
    if (!ok) { setRightsAsk(files); return; }
    for (const file of files) {
      const err = validateUpload(file);
      if (err) { notify(err, 'error'); continue; }
      const local = URL.createObjectURL(file);
      let img;
      try { img = await loadImage(local); } catch { notify("That file isn't a readable image.", 'error'); continue; }
      if (Math.min(img.naturalWidth, img.naturalHeight) < 600) { notify('That image is too small to print well (needs at least 600 px).', 'error'); continue; }
      setBusy({ label: 'Uploading image', pct: 0 });
      try {
        const up = await uploadImage(file, { onProgress: (pct) => setBusy({ label: 'Uploading image', pct }) });
        registerLocalImage(up.url, local);
        const l = makeImageLayer(placement, { src: up.url, naturalWidth: up.width || img.naturalWidth, naturalHeight: up.height || img.naturalHeight, name: file.name });
        commitLayers([...(history.state.layers[placement.key] || []), l]);
        setSelectedId(l.id);
        setMobileTab('edit');
      } catch (e) {
        notify(apiError(e, 'Upload failed. Try again.'), 'error');
      } finally { setBusy(null); }
    }
  };
  const addHomiesArt = async (id) => {
    setPicker(false);
    if (isEmbroidery(placement)) { notify('Embroidery is text only.', 'error'); return; }
    const src = artUrl(id, DARK.test(color.name) ? 'white' : 'black');
    try {
      const img = await getImage(src);
      const l = makeImageLayer(placement, { src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, name: DESIGNS.find((d) => d.id === id)?.phrase });
      commitLayers([...layers, l]); setSelectedId(l.id); setMobileTab('edit');
    } catch { notify("Couldn't load that design.", 'error'); }
  };
  const removeSelected = () => { if (!selected) return; commitLayers(layers.filter((l) => l.id !== selected.id)); setSelectedId(null); };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy = clampToArea({ ...selected, id: `${selected.id}c${Date.now().toString(36)}`, x: selected.x + 40, y: selected.y + 40 }, placement.area);
    commitLayers([...layers, copy]); setSelectedId(copy.id);
  };
  const moveLayer = (id, dir) => {
    const i = layers.findIndex((l) => l.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    const next = [...layers]; [next[i], next[j]] = [next[j], next[i]]; commitLayers(next);
  };
  const center = (axis) => {
    if (!selected) return;
    const a = placement.area;
    patchSelected(axis === 'h' ? { x: Math.round((a.width - selected.width) / 2) } : { y: Math.round((a.height - selected.height) / 2) });
  };

  const switchBlank = (b) => {
    if (b.key === blank.key) return;
    const keep = {};
    let dropped = 0;
    for (const p of b.placements) {
      const prev = doc.layers[p.key] || [];
      const ok = isEmbroidery(p) ? prev.filter((l) => l.type === 'text') : prev;
      dropped += prev.length - ok.length;
      keep[p.key] = ok.map((l) => clampToArea(l, p.area));
    }
    for (const [k, ls] of Object.entries(doc.layers)) if (!b.placements.some((p) => p.key === k)) dropped += ls.length;
    if (dropped) notify(`${dropped} layer${dropped > 1 ? 's' : ''} didn't fit the ${b.name} and were removed (undo to get them back).`);
    dirty.current = true;
    setLive(null);
    history.commit({ blankKey: b.key, color: b.colors.find((c) => c.name === doc.color)?.name || b.colors[0].name, layers: keep });
    setPlacementKey(b.placements[0].key);
    setSize(b.sizes.includes(size) ? size : (b.sizes.includes('L') ? 'L' : b.sizes[0]));
    setSelectedId(null);
  };
  const setColor = (name) => { dirty.current = true; setLive(null); history.commit((s) => ({ ...s, color: name })); };

  // ── keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(e.target?.tagName || '') || e.target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); setLive(null); (e.shiftKey ? history.redo : history.undo)(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); setLive(null); history.redo(); return; }
      if (typing) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); removeSelected(); }
      if (mod && e.key.toLowerCase() === 'd' && selected) { e.preventDefault(); duplicateSelected(); }
      if (e.key === 'Escape') setSelectedId(null);
      if (selected && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 50 : 10;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        patchSelected(clampToArea({ ...selected, x: selected.x + d[0], y: selected.y + d[1] }, placement.area));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── export + add to bag ──
  const renderPrintfiles = async () => {
    const files = {};
    for (const key of usedPlacements(doc)) {
      const p = placementOf(blank, key);
      setBusy({ label: `Preparing ${p.label.toLowerCase()} print file` });
      const blob = await exportPlacement(doc.layers[key], p.area);
      const up = await uploadImage(blob, { filename: `${key}.png` });
      files[key] = up.url;
    }
    return files;
  };
  const addToBag = async () => {
    const issues = validateDoc(doc, blank);
    if (issues.length) { notify(issues[0], 'error'); return; }
    if (!variant) { notify('Pick a colour and size.', 'error'); return; }
    try {
      setBusy({ label: 'Saving your design' });
      dirty.current = true;
      saver.schedule({ designId: designIdRef.current, name, doc: history.state });
      await saver.flush();
      if (!designIdRef.current) throw new Error('Could not save your design. Check your connection and try again.');
      const files = await renderPrintfiles();
      await savePrintfiles(designIdRef.current, files);
      setBusy({ label: 'Making your preview' });
      const front = usedPlacements(doc).find((k) => !/sleeve/.test(k)) || usedPlacements(doc)[0];
      const fp = placementOf(blank, front);
      const prevBlob = await exportPreview({ blankKey: blank.key, garmentSrc: color.image, garmentHex: color.hex, layers: doc.layers[front], area: fp.area });
      const prevUp = await uploadImage(prevBlob, { filename: 'preview.jpg' }).catch(() => null);
      if (prevUp?.url) updateDesign(designIdRef.current, { previewUrl: prevUp.url }).catch(() => {});
      const err = cart.add({
        kind: 'custom', designId: designIdRef.current, variantId: variant.id, quantity: 1,
        name: name && name !== 'Untitled design' ? name : `Custom ${blank.name}`,
        variant: [blank.name, color.name, size].filter(Boolean).join(' · '),
        image: prevUp?.url && /^https:/.test(prevUp.url) ? prevUp.url : '', priceCents: price,
      });
      if (err) throw new Error(err);
      notify('Added to your bag — saved to My designs');
      openCart();
    } catch (e) {
      notify(apiError(e, e?.message || 'Something went wrong. Try again.'), 'error');
    } finally { setBusy(null); }
  };

  const finishCoach = () => { setCoach(-1); try { localStorage.setItem(COACH_KEY, '1'); } catch { /* ignore */ } };
  const acceptRights = () => { try { sessionStorage.setItem(RIGHTS_KEY, '1'); } catch { /* ignore */ } const f = rightsAsk; setRightsAsk(null); addFiles(f); };
  const onDrop = (e) => { e.preventDefault(); const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/')); if (files.length) addFiles(files); };

  const panels = {
    add: <AddPanel onText={addText} onUpload={() => fileInput.current?.click()} onHomies={() => setPicker(true)} embroidery={isEmbroidery(placement)} />,
    layers: <LayersPanel layers={layers} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setMobileTab('edit'); }} onMove={moveLayer} onDelete={(id) => { commitLayers(layers.filter((l) => l.id !== id)); if (id === selectedId) setSelectedId(null); }} />,
    edit: <EditPanel layer={selected} placement={placement} onPatch={patchSelected} onDelete={removeSelected} onDuplicate={duplicateSelected} onCenter={center} />,
    product: <ProductPanel blanks={blanks} blank={blank} color={color} size={size} onBlank={switchBlank} onColor={setColor} onSize={setSize} />,
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden lg:flex-row" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <Helmet><title>The Homies Studio | The Homies</title></Helmet>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) addFiles(f); }} />

      {/* Left rail (desktop) */}
      <aside className="hidden w-[300px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/[0.07] p-5 lg:flex" data-coach={coach === 1 ? 'on' : undefined}>
        <div className={cn(coach === 1 && 'rounded-2xl ring-2 ring-[#f0b94d] ring-offset-4 ring-offset-[#0a0a0b]')}>{panels.add}</div>
        <div>{panels.layers}</div>
      </aside>

      {/* Canvas */}
      <section className="relative flex min-h-0 flex-1 flex-col">{/* canvas column (phones: canvas + collapsible panel) */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.07] px-3 py-2 sm:px-4">
          <input value={name} onChange={(e) => { dirty.current = true; setName(e.target.value.slice(0, 60)); }} aria-label="Design name"
            className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold text-white hover:bg-white/5 focus:bg-white/5 focus:outline-none" />
          <SaveBadge status={saveStatus} signedIn={signedIn} />
          <div className="flex items-center rounded-full border border-white/10 p-0.5">
            <ToolBtn label="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={() => { setLive(null); history.undo(); }}><Undo2 className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={() => { setLive(null); history.redo(); }}><Redo2 className="h-4 w-4" /></ToolBtn>
          </div>
          <div className="hidden items-center rounded-full border border-white/10 p-0.5 sm:flex" role="tablist" aria-label="View">
            <ToolBtn label="Edit" active={mode === 'edit'} onClick={() => setMode('edit')}><PenLine className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Preview on garment" active={mode === 'preview'} onClick={() => { setSelectedId(null); setMode('preview'); }}><Eye className="h-4 w-4" /></ToolBtn>
          </div>
          <ToolBtn label="Show tips" onClick={() => setCoach(0)}><HelpCircle className="h-4 w-4" /></ToolBtn>
        </div>

        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/[0.07] px-3 py-2 no-scrollbar sm:px-4" role="tablist" aria-label="Print location">
          {blank.placements.map((p) => {
            const has = (doc.layers[p.key] || []).length > 0;
            return (
              <button key={p.key} role="tab" aria-selected={p.key === placement.key} type="button" onClick={() => { setPlacementKey(p.key); setSelectedId(null); }}
                className={cn('shop-block flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition', p.key === placement.key ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/10')}>
                {has && <span className={cn('h-1.5 w-1.5 rounded-full', p.key === placement.key ? 'bg-black' : 'bg-[#f0b94d]')} />}
                {p.label}
                {p.priceCents > 0 && <span className={p.key === placement.key ? 'text-black/50' : 'text-white/40'}>{addonDelta(p.priceCents)}</span>}
              </button>
            );
          })}
        </div>

        <div className={cn('relative min-h-[38dvh] flex-1 bg-[radial-gradient(circle_at_50%_30%,#1c1c20,#0a0a0b_70%)]', coach === 2 && 'ring-2 ring-inset ring-[#f0b94d]')}>
          {mode === 'edit' ? (
            <StudioCanvas placement={placement} layers={layers} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (id) setMobileTab('edit'); }}
              onPreview={previewLayers} onCommit={commitLayers} garmentHex={color.hex} />
          ) : (
            <GarmentPreview blank={blank} color={color} doc={doc} placement={placement} variant={variant} notify={notify} renderPrintfiles={renderPrintfiles} />
          )}
          {layers.length === 0 && mode === 'edit' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-xs rounded-2xl bg-black/55 px-5 py-4 text-center backdrop-blur">
                <p className="font-semibold">Start with text or an image</p>
                <p className="mt-1 text-xs text-white/60">{isEmbroidery(placement) ? 'Embroidery is text only — up to 2 short lines.' : 'Drop an image anywhere here, or use the tools.'}</p>
              </div>
            </div>
          )}
          <AnimatePresence>
            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="status">
                <div className="w-64 rounded-2xl bg-[#131315] p-5 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#f0b94d]" />
                  <p className="mt-3 text-sm font-semibold">{busy.label}…</p>
                  {busy.pct != null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#f0b94d] transition-all" style={{ width: `${busy.pct}%` }} /></div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile bottom panel */}
        <div className="shrink-0 border-t border-white/[0.07] bg-[#0d0d0f] lg:hidden">
          <AnimatePresence initial={false}>
            {mobileTab && (
              <motion.div key="panel" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="max-h-[30dvh] overflow-y-auto px-4 py-3.5">{panels[mobileTab]}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-4 border-t border-white/[0.07]" role="tablist">
            {[['add', 'Add', Sparkles], ['edit', 'Edit', PenLine], ['layers', 'Layers', LayersIcon], ['product', 'Product', Shirt]].map(([k, l, Icon]) => (
              <button key={k} role="tab" aria-selected={mobileTab === k} type="button" onClick={() => setMobileTab(mobileTab === k ? null : k)}
                className={cn('shop-block flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', mobileTab === k ? 'text-white' : 'text-white/45')}>
                <Icon className="h-[18px] w-[18px]" />{l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-white/[0.07] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex-1"><p className="text-[11px] text-white/45">{blank.name} · {color.name} · {size}</p><p className="font-display text-2xl leading-none">{usd(price)}</p></div>
            <button type="button" onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')} className="shop-block rounded-full border border-white/15 px-3 py-2 text-xs font-semibold">{mode === 'edit' ? 'Preview' : 'Edit'}</button>
            <ShopButton onClick={addToBag} disabled={!!busy}><ShoppingBag className="h-4 w-4" /> Add</ShopButton>
          </div>
        </div>
      </section>

      {/* Right panel (desktop) */}
      <aside className="hidden w-[350px] shrink-0 flex-col overflow-y-auto border-l border-white/[0.07] lg:flex">
        <div className={cn('space-y-6 p-5', coach === 0 && 'm-2 rounded-2xl ring-2 ring-[#f0b94d]')}>{panels.product}</div>
        <div className="border-t border-white/[0.07] p-5">{panels.edit}</div>
        <div className="mt-auto border-t border-white/[0.07] p-5">
          <div className="flex items-baseline justify-between"><span className="text-sm text-white/55">Your price</span><span className="font-display text-4xl">{usd(price)}</span></div>
          <p className="mt-1 text-xs text-white/40">{used.length > 1 ? `${used.length} print locations` : 'Front print included'} · shipping at checkout</p>
          <ShopButton size="lg" className="mt-4 w-full" onClick={addToBag} disabled={!!busy}><ShoppingBag className="h-4 w-4" /> Add to bag</ShopButton>
          <Link to="/shop/designs" className="shop-block mt-3 text-center text-xs text-white/50 hover:text-white">My designs</Link>
        </div>
      </aside>

      <RightsDialog open={!!rightsAsk} onCancel={() => setRightsAsk(null)} onAccept={acceptRights} />
      <HomiesPicker open={picker} onClose={() => setPicker(false)} onPick={addHomiesArt} dark={DARK.test(color.name)} />
      <ResumeBanner draft={resume} onResume={() => {
        const d = resume.state;
        const b = blanks.find((x) => x.key === d.doc.blankKey) || blanks[0];
        history.reset({ ...newDoc(b, d.doc.color), ...d.doc, layers: { ...newDoc(b, d.doc.color).layers, ...d.doc.layers } });
        setName(d.name || 'Untitled design');
        if (d.designId) { setDesignId(d.designId); designIdRef.current = d.designId; }
        setPlacementKey(b.placements[0].key);
        setResume(null);
      }} onDiscard={() => { saver.clearLocal(); setResume(null); }} />
      <CoachMarks step={coach} onNext={() => setCoach((n) => (n >= 2 ? -1 : n + 1))} onDone={finishCoach} />
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────
function ToolBtn({ label, active, children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active}
      className={cn('shop-block inline-flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-30', active ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white')} {...props}>
      {children}
    </button>
  );
}

function SaveBadge({ status, signedIn }) {
  const map = {
    idle: null,
    dirty: { icon: Cloud, text: 'Saving soon', cls: 'text-white/40' },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-white/50', spin: true },
    saved: { icon: Check, text: signedIn ? 'Saved' : 'Saved on this device', cls: 'text-[#7be0a5]' },
    error: { icon: CloudOff, text: 'Saved locally — retrying', cls: 'text-[#f6d48f]' },
  };
  const s = map[status];
  if (!s) return null;
  const Icon = s.icon;
  return <span className={cn('hidden items-center gap-1.5 text-[11px] font-semibold sm:inline-flex', s.cls)} aria-live="polite"><Icon className={cn('h-3.5 w-3.5', s.spin && 'animate-spin')} />{s.text}</span>;
}

function AddPanel({ onText, onUpload, onHomies, embroidery }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Add</p>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        <AddBtn icon={Type} title="Text" sub="Your words, your font" onClick={onText} />
        <AddBtn icon={ImagePlus} title="Upload" sub="PNG, JPG, WEBP" onClick={onUpload} disabled={embroidery} />
        <AddBtn icon={Sparkles} title="The Homies art" sub="Use a drop design" onClick={onHomies} disabled={embroidery} />
      </div>
      {embroidery ? <Tip className="mt-3">This spot is embroidered: text only, up to 2 lines, in thread colours.</Tip>
        : <Tip className="mt-3">Best results: transparent PNGs, at least 2000 px wide. We'll tell you if anything will print blurry.</Tip>}
    </div>
  );
}
function AddBtn({ icon: Icon, title, sub, ...props }) {
  return (
    <button type="button" className="shop-block flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:border-white/30 hover:bg-white/[0.06] disabled:opacity-30 lg:flex-row lg:gap-3 lg:p-3.5 lg:text-left" {...props}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]"><Icon className="h-[18px] w-[18px]" /></span>
      <span><span className="block text-sm font-semibold">{title}</span><span className="hidden text-xs text-white/45 lg:block">{sub}</span></span>
    </button>
  );
}

function LayersPanel({ layers, selectedId, onSelect, onMove, onDelete }) {
  const ordered = [...layers].reverse();
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Layers</p>
      {!layers.length ? <p className="text-sm text-white/40">Nothing here yet.</p> : (
        <ul className="space-y-1.5">
          {ordered.map((l) => (
            <li key={l.id}>
              <div className={cn('flex items-center gap-2 rounded-xl border px-2.5 py-2', l.id === selectedId ? 'border-[#f0b94d]/60 bg-[#f0b94d]/[0.06]' : 'border-white/[0.07]')}>
                <button type="button" onClick={() => onSelect(l.id)} className="shop-block flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  {l.type === 'image'
                    ? <span className="shop-checker h-8 w-8 shrink-0 overflow-hidden rounded-md"><img src={l.src} alt="" className="h-full w-full object-contain" /></span>
                    : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.07]"><Type className="h-4 w-4" /></span>}
                  <span className="truncate text-sm">{l.type === 'text' ? l.text || 'Text' : l.name || 'Image'}</span>
                </button>
                <button type="button" aria-label="Bring forward" onClick={() => onMove(l.id, 1)} className="shop-block rounded p-1 text-white/45 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Send backward" onClick={() => onMove(l.id, -1)} className="shop-block rounded p-1 text-white/45 hover:text-white"><ChevronDown className="h-4 w-4" /></button>
                <button type="button" aria-label="Delete layer" onClick={() => onDelete(l.id)} className="shop-block rounded p-1 text-white/45 hover:text-[#f3a0a0]"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditPanel({ layer, placement, onPatch, onDelete, onDuplicate, onCenter }) {
  if (!layer) return <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Edit</p><p className="text-sm text-white/45">Tap something on the design to edit it. Drag to move, pull the corners to resize, use the top handle to rotate.</p></div>;
  const emb = isEmbroidery(placement);
  const area = placement.area;
  const dpi = layer.type === 'image' ? effectiveDpi({ naturalWidth: layer.naturalWidth, naturalHeight: layer.naturalHeight, layerWidth: layer.width, layerHeight: layer.height, areaDpi: area.dpi }) : 0;
  const st = dpiStatus(dpi);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">{layer.type === 'text' ? 'Text' : 'Image'}</p>
        <div className="flex gap-1">
          <ToolBtn label="Center horizontally" onClick={() => onCenter('h')}><AlignCenterHorizontal className="h-4 w-4" /></ToolBtn>
          <ToolBtn label="Center vertically" onClick={() => onCenter('v')}><AlignCenterVertical className="h-4 w-4" /></ToolBtn>
          <ToolBtn label="Reset rotation" onClick={() => onPatch({ rotation: 0 })}><RotateCcw className="h-4 w-4" /></ToolBtn>
          <ToolBtn label="Duplicate (Ctrl+D)" onClick={onDuplicate}><Copy className="h-4 w-4" /></ToolBtn>
          <ToolBtn label="Delete (Del)" onClick={onDelete}><Trash2 className="h-4 w-4" /></ToolBtn>
        </div>
      </div>
      {layer.type === 'text' ? (
        <>
          <div>
            <label htmlFor="studio-text" className="mb-1.5 block text-xs font-semibold text-white/60">Text</label>
            <textarea id="studio-text" rows={2} value={layer.text} maxLength={TEXT_MAX}
              onChange={(e) => { let t = e.target.value; if (emb) t = t.split('\n').slice(0, EMB_MAX_LINES).join('\n'); onPatch({ text: t }); }}
              className="w-full resize-none rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none" />
          </div>
          {!emb && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-white/60">Font</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STUDIO_FONTS.map((f) => (
                  <button key={f.key} type="button" aria-pressed={layer.font === f.key} onClick={() => onPatch({ font: f.key })}
                    className={cn('shop-block truncate rounded-lg border px-2.5 py-2 text-left text-sm', layer.font === f.key ? 'border-white bg-white text-black' : 'border-white/10 text-white/80 hover:border-white/30')}
                    style={{ fontFamily: `'${f.family}'`, fontStyle: f.style || 'normal' }}>{f.label}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-white/60">{emb ? 'Thread colour' : 'Ink colour'}</p>
            <div className="flex flex-wrap gap-2">
              {(emb ? THREADS.map((t) => t.hex) : INKS).map((hex) => (
                <Swatch key={hex} size="sm" hex={hex} label={emb ? THREADS.find((t) => t.hex === hex)?.label : hex} selected={layer.color?.toLowerCase() === hex} onClick={() => onPatch({ color: hex })} />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="studio-size" className="mb-1.5 flex justify-between text-xs font-semibold text-white/60"><span>Size</span><span>{inchesLabel(layer.width, layer.height, area.dpi)}</span></label>
            <input id="studio-size" type="range" min={emb ? minEmbroideryFontSize(area) : 24} max={Math.round(area.height * 0.6)} value={layer.fontSize}
              onChange={(e) => onPatch({ fontSize: Number(e.target.value) })} className="w-full accent-[#f0b94d]" />
          </div>
          {emb && <Tip>Letters need to be at least ¼" tall to stitch cleanly — the slider won't go smaller.</Tip>}
        </>
      ) : (
        <>
          <div className={cn('rounded-2xl p-4', st === 'good' ? 'bg-[#1f8f4e]/12' : st === 'warn' ? 'bg-[#f0b94d]/10' : 'bg-[#e04848]/12')}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Print quality</p>
              <p className={cn('text-sm font-bold', st === 'good' ? 'text-[#7be0a5]' : st === 'warn' ? 'text-[#f6d48f]' : 'text-[#f3a0a0]')}>{dpi} DPI</p>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className={cn('h-full rounded-full transition-all', st === 'good' ? 'bg-[#2ea043]' : st === 'warn' ? 'bg-[#f0b94d]' : 'bg-[#e04848]')} style={{ width: `${Math.min(100, (dpi / 300) * 100)}%` }} />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-white/70">{DPI_COPY[st]}</p>
          </div>
          <div>
            <label htmlFor="studio-img-size" className="mb-1.5 flex justify-between text-xs font-semibold text-white/60"><span>Size</span><span>{inchesLabel(layer.width, layer.height, area.dpi)}</span></label>
            <input id="studio-img-size" type="range" min={60} max={area.width} value={layer.width}
              onChange={(e) => { const w = Number(e.target.value); const h = Math.round(w * (layer.naturalHeight / layer.naturalWidth)); onPatch(clampToArea({ ...layer, width: w, height: h }, area)); }}
              className="w-full accent-[#f0b94d]" />
          </div>
        </>
      )}
    </div>
  );
}

function ProductPanel({ blanks, blank, color, size, onBlank, onColor, onSize }) {
  return (
    <>
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Product</p>
        <div className="grid grid-cols-3 gap-2">
          {blanks.map((b) => (
            <button key={b.key} type="button" aria-pressed={b.key === blank.key} onClick={() => onBlank(b)}
              className={cn('shop-block overflow-hidden rounded-xl border text-left transition', b.key === blank.key ? 'border-white' : 'border-white/10 hover:border-white/30')}>
              <ShopImage src={b.colors[0]?.image} alt="" fallback={{ kind: b.key, hex: b.colors[0]?.hex, phrase: '' }} className="aspect-square w-full bg-[#f4f3ef]" fit="contain" />
              <div className="px-2 py-1.5"><p className="truncate text-xs font-semibold">{b.name}</p><p className="text-[11px] text-white/45">{usd(b.basePriceCents)}</p></div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2.5 text-sm font-semibold">Colour <span className="font-normal text-white/50">· {color.name}</span></p>
        <div className="flex flex-wrap gap-2.5">{blank.colors.map((c) => <Swatch key={c.name} hex={c.hex} label={c.name} selected={c.name === color.name} onClick={() => onColor(c.name)} />)}</div>
      </div>
      {blank.sizes.length > 1 && (
        <div>
          <p className="mb-2.5 text-sm font-semibold">Size</p>
          <div className="flex flex-wrap gap-2">{blank.sizes.map((s) => <Pill key={s} selected={s === size} onClick={() => onSize(s)}>{s}</Pill>)}</div>
        </div>
      )}
    </>
  );
}

function GarmentPreview({ blank, color, doc, placement, variant, notify, renderPrintfiles }) {
  const [url, setUrl] = useState('');
  const [mock, setMock] = useState({ state: 'idle', images: [] });
  const front = blank.placements[0];
  const target = placement.key === front.key || isEmbroidery(placement) ? placement : front;
  useEffect(() => {
    let alive = true; let made = '';
    exportPreview({ blankKey: blank.key, garmentSrc: color.image, garmentHex: color.hex, layers: doc.layers[target.key] || [], area: target.area, size: 900 })
      .then((b) => { if (!alive) return; made = URL.createObjectURL(b); setUrl(made); })
      .catch(() => alive && setUrl(''));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [blank.key, color.name, doc, target.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const real = async () => {
    if (!usedPlacements(doc).length || !variant) { notify('Add something to your design first.', 'error'); return; }
    setMock({ state: 'loading', images: [] });
    try {
      const files = await renderPrintfiles();
      const key = await requestMockup({ productId: blank.productId, variantId: variant.id, files });
      const images = await pollMockup(key);
      setMock({ state: 'done', images });
    } catch (e) { setMock({ state: 'idle', images: [] }); notify(apiError(e, e?.message || 'Mockup failed.'), 'error'); }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4">
      <div className="relative aspect-[4/5] h-full max-h-[70vh] overflow-hidden rounded-3xl bg-[#f4f3ef]">
        {url ? <img src={url} alt={`Preview on ${color.name} ${blank.name}`} className="h-full w-full object-cover" /> : <Skeleton className="h-full w-full rounded-none" />}
        {target.key !== placement.key && <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px]">Showing the front — {placement.label.toLowerCase()} prints too</span>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ShopButton variant="ghost" size="sm" loading={mock.state === 'loading'} onClick={real}><Wand2 className="h-4 w-4" /> Get a real mockup</ShopButton>
        <span className="text-xs text-white/40">Instant preview is approximate — the real mockup is Printful's photo-real render.</span>
      </div>
      {mock.state === 'done' && mock.images.length > 0 && (
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {mock.images.map((m, i) => <ShopImage key={i} src={m.url} alt={`Mockup ${m.placement}`} className="aspect-square rounded-2xl bg-white" fit="contain" />)}
        </div>
      )}
    </div>
  );
}

function RightsDialog({ open, onCancel, onAccept }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { if (open) setOk(false); }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="rights-title" onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className="hh-shop w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0f0f11] p-6 sm:rounded-3xl">
            <h2 id="rights-title" className="font-display text-3xl">Before you upload</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">We can only print images you have the right to use: your own photos and artwork, or images you've licensed. No logos, sports teams, celebrities or other people's work without permission.</p>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#f0b94d]" />
              <span>I own the rights to the images I upload, or have permission to use them.</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <ShopButton variant="ghost" size="sm" onClick={onCancel}>Cancel</ShopButton>
              <ShopButton size="sm" disabled={!ok} onClick={onAccept}>Continue</ShopButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HomiesPicker({ open, onClose, onPick, dark }) {
  const [q, setQ] = useState('');
  const list = DESIGNS.filter((d) => d.phrase.toLowerCase().includes(q.toLowerCase()));
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="The Homies designs" onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className="hh-shop flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-t-3xl border border-white/10 bg-[#0f0f11] sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-white/[0.07] p-5">
              <p className="font-display text-3xl">The Homies art</p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search designs" className="ml-auto h-10 w-40 rounded-full border border-white/12 bg-black/40 px-4 text-sm focus:outline-none sm:w-60" />
              <button type="button" onClick={onClose} aria-label="Close" className="shop-block rounded-full p-2 text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid auto-rows-max grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-4">
              {list.map((d) => (
                <button key={d.id} type="button" onClick={() => onPick(d.id)} className={cn('shop-block group overflow-hidden rounded-2xl border border-white/10 p-3 text-left transition hover:border-white/40', dark ? 'bg-[#1a1a1d]' : 'bg-[#f4f3ef]')}>
                  <img src={artUrl(d.id, dark ? 'white' : 'black')} alt="" loading="lazy" className="aspect-square w-full object-contain transition-transform group-hover:scale-105" />
                  <p className={cn('mt-2 truncate text-xs font-semibold', dark ? 'text-white/70' : 'text-black/70')}>{d.phrase}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResumeBanner({ draft, onResume, onDiscard }) {
  return (
    <AnimatePresence>
      {draft && (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          className="fixed bottom-24 left-1/2 z-[65] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-[#131315] p-4 shadow-2xl lg:bottom-6" role="dialog" aria-label="Resume design">
          <p className="font-semibold">Pick up where you left off?</p>
          <p className="mt-1 text-sm text-white/55">“{draft.state?.name || 'Untitled design'}” — saved {timeAgo(draft.at)}.</p>
          <div className="mt-3 flex gap-2"><ShopButton size="sm" onClick={onResume}>Resume</ShopButton><ShopButton size="sm" variant="ghost" onClick={onDiscard}>Start fresh</ShopButton></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
const timeAgo = (t) => {
  const m = Math.round((Date.now() - (t || Date.now())) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

const COACH = [
  { title: 'Pick your piece', body: 'Choose a tee, hoodie or hat, then the colour and size.', where: 'lg:right-[370px] lg:top-28' },
  { title: 'Add text or art', body: 'Type your own phrase, upload a picture, or grab a design from the drop.', where: 'lg:left-[320px] lg:top-28' },
  { title: 'Make it yours', body: "Drag to move, pull corners to resize, top handle to rotate. We'll warn you if an image will print blurry. It all saves automatically.", where: 'lg:left-1/2 lg:-translate-x-1/2 lg:top-1/2' },
];
function CoachMarks({ step, onNext, onDone }) {
  const s = COACH[step];
  return (
    <AnimatePresence>
      {s && (
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={cn('fixed bottom-28 left-1/2 z-[66] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-[#f0b94d] p-5 text-black shadow-2xl lg:bottom-auto lg:left-auto lg:translate-x-0', s.where)} role="dialog" aria-label="Studio tips">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">Tip {step + 1} of {COACH.length}</p>
          <p className="font-display mt-1 text-2xl">{s.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-black/75">{s.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={onDone} className="shop-block text-sm font-semibold text-black/60 hover:text-black">Skip</button>
            <button type="button" onClick={step >= COACH.length - 1 ? onDone : onNext} className="shop-block rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">{step >= COACH.length - 1 ? 'Got it' : 'Next'}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
