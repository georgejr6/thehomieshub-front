import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Type, ImagePlus, Sparkles, Undo2, Redo2, Trash2, Copy, ChevronUp, ChevronDown, PenLine, Layers as LayersIcon, Search, ArrowRight,
  Shirt, AlignCenterHorizontal, AlignCenterVertical, AlignLeft, AlignCenter, AlignRight, RotateCcw, Check, Loader2, CloudOff, Cloud, X, Wand2, ShoppingBag, HelpCircle, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Swatch, Pill, Tip, Skeleton, ShopImage, useFocusTrap } from '@/shop/components/ui';
import StudioCanvas from '@/shop/studio/StudioCanvas';
import useHistory from '@/shop/studio/useHistory';
import {
  INKS, threadsOf, allFonts, fontsForPlacement, filterFonts, fontByKey, weightOf, FONT_CATEGORIES, newDoc, placementOf, usedPlacements, defaultInk, defaultThread, makeTextLayer, makeImageLayer,
  isEmbroidery, validateDoc, clampToArea, clampText, withFontSize, TEXT_MAX, TEXT_MAX_LINES,
  placementAllowed, techniqueOf, serverLayers, resizeText, textSizeRange, twoLines,
} from '@/shop/studio/model';
import { registerLocalImage, getImage, canvasSrc, loadFontCss } from '@/shop/studio/exporter';
import { resolveTemplate, garmentThumb } from '@/shop/studio/template';
import GarmentSilhouette from '@/shop/components/GarmentSilhouette';
import { bagDesign, renderPrintfiles as renderFiles } from '@/shop/studio/bagDesign';
import { ensureFontRegistry } from '@/shop/studio/fonts';
import { effectiveDpi, dpiStatus, DPI_COPY, inchesLabel } from '@/shop/lib/dpi';
import { customPriceCents, placementIncluded, usd, addonDelta } from '@/shop/lib/pricing';
import { createAutosaver } from '@/shop/lib/autosave';
import useDesignQuote from '@/shop/lib/useDesignQuote';
import {
  validateUpload, uploadImage, uploadHouseArt, loadImage, createDesign, updateDesign, fetchDesign, fetchDesignFromProduct, requestMockup, pollMockup, apiError,
} from '@/shop/lib/api';
import { artUrl, lookupSlug, displayName } from '@/shop/lib/catalog';
import { DESIGNS } from '@/shop/data/designs';

// One local draft per design (`…:new` until the server gives it an id), so two
// designs open in two tabs never overwrite each other.
const DRAFT_PREFIX = 'hh_studio_draft_v1:';
const draftKey = (id) => `${DRAFT_PREFIX}${id || 'new'}`;
const COACH_KEY = 'hh_studio_coach_v1';
const RIGHTS_KEY = 'hh_studio_rights_ok';
const DARK = /black|navy|carbon|charcoal/i;
const MIXED_MSG = "Embroidered and printed spots can't be combined on one piece — clear the other spots first.";

/** The server doesn't keep everything the editor needs: fill font sizes and image sizes back in. */
async function hydrateLayers(layers = {}) {
  const out = {};
  for (const [key, list] of Object.entries(layers || {})) {
    out[key] = await Promise.all((Array.isArray(list) ? list : []).map(async (l) => {
      if (l.type === 'text') return withFontSize(l);
      if (l.naturalWidth > 0 && l.naturalHeight > 0) return l;
      try {
        const img = await getImage(l.src);
        return { ...l, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
      } catch { return { ...l, naturalWidth: l.width, naturalHeight: l.height }; }
    }));
  }
  return out;
}
const snapshotOf = (name, doc) => ({ name: name || 'Untitled design', blankKey: doc.blankKey, color: doc.color, layers: JSON.stringify(serverLayers(doc.layers)) });
const isTyping = (el) => !!el && (/^(input|textarea|select)$/i.test(el.tagName || '') || el.isContentEditable);
// The desktop Studio overlay is itself a modal (data-studio-host) — it doesn't count.
function useMediaQuery(q) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return undefined;
    const on = () => setM(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [q]);
  return m;
}
const modalOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-studio-host]), [role="alertdialog"]');

/** /shop/design?design=|product=&color=&size=|from=&blank=&color= */
export default function Studio() {
  const [params, setParams] = useSearchParams();
  const read = () => ({
    design: params.get('design'), product: params.get('product'), from: params.get('from'),
    blank: params.get('blank'), color: params.get('color'), size: params.get('size'),
  });
  const init = useMemo(read, [params.get('product'), params.get('from')]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDesignId = useCallback((id) => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('design') === id) return;
    p.set('design', id); p.delete('from'); p.delete('product');
    setParams(p, { replace: true });
  }, [setParams]);
  // A new product / art link while the Studio is open starts a fresh editor.
  return <StudioScreen key={`${init.product || ''}|${init.from || ''}`} init={init} onDesignId={onDesignId} />;
}

/** The Studio with its loading / not-ready states. `embedded` = inside the desktop overlay. */
export function StudioScreen({ init = {}, embedded = false, onDesignId, onAdded }) {
  const { blanks, studioAvailable } = useShop();
  const height = embedded ? 'h-full' : 'h-[calc(100dvh-3.5rem-1px)] md:h-[calc(100dvh-4rem-1px)]';
  if (blanks === undefined) return <div className={cn('grid place-items-center', height)}><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  if (!studioAvailable) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <Wand2 className="h-10 w-10 text-[#f0b94d]" />
        <h1 className="font-display mt-5 text-5xl leading-[0.9] sm:text-6xl">Design your own is<br />almost ready</h1>
        <p className="mt-4 text-white/60">Design-your-own is coming very soon. In the meantime, the full drop is live.</p>
        <ShopButton as={Link} to="/shop" className="mt-8">Shop the drop</ShopButton>
      </div>
    );
  }
  return <StudioEditor blanks={blanks} init={init} embedded={embedded} heightClass={height} onDesignId={onDesignId} onAdded={onAdded} />;
}

const sameName = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const pickColor = (b, want) => b.colors.find((c) => sameName(c.name, want))?.name || b.colors[0]?.name;
const pickSize = (b, want) => (b.sizes.includes(want) ? want : (b.sizes.includes('L') ? 'L' : b.sizes[0]));

function StudioEditor({ blanks, init, embedded, heightClass, onDesignId, onAdded }) {
  const { cart, notify, openCart, signedIn, products } = useShop();
  const initialBlank = blanks.find((b) => b.key === init.blank) || blanks[0];
  const initialColor = pickColor(initialBlank, init.color);

  const history = useHistory(newDoc(initialBlank, initialColor));
  const [live, setLive] = useState(null);
  const doc = live || history.state;
  const blank = blanks.find((b) => b.key === doc.blankKey) || blanks[0];
  // an LXVEMORE (non-pickable) blank the design started on stays switchable-back in the Product panel
  const homeBlank = useRef(null);
  if (blank.pickable === false) homeBlank.current = blank.key;
  const [placementKey, setPlacementKey] = useState(blank.placements[0].key);
  const placement = placementOf(blank, placementKey) || blank.placements[0];
  const layers = doc.layers[placement.key] || [];
  const [selectedId, setSelectedId] = useState(null);
  const selected = layers.find((l) => l.id === selectedId) || null;
  const [size, setSize] = useState(() => pickSize(initialBlank, init.size));
  const [name, setName] = useState('Untitled design');
  const [designId, setDesignId] = useState(init.design || null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(null); // { label, pct? }
  // Fresh Studio → pick a garment + colour first; the garment then becomes the canvas.
  const [step, setStep] = useState(() => (init.design || init.product || init.from ? 'edit' : 'pick'));
  const [mockupOpen, setMockupOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [fonts, setFonts] = useState(allFonts);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileTab, setMobileTab] = useState('add');
  const [rightsAsk, setRightsAsk] = useState(null); // pending File[]
  const [picker, setPicker] = useState(false);
  const [resume, setResume] = useState(null); // { state, at, kind: 'new' | 'newer' | 'tab' }
  const [coach, setCoach] = useState(() => { try { return localStorage.getItem(COACH_KEY) ? -1 : 0; } catch { return -1; } });
  const fileInput = useRef(null);
  const designIdRef = useRef(designId);
  designIdRef.current = designId;
  const lastSent = useRef(null); // what the server has: { name, blankKey, color, layers(json) }
  const color = blank.colors.find((c) => c.name === doc.color) || blank.colors[0];
  const used = usedPlacements(doc);
  const threads = threadsOf(blank);
  const variant = blank.variants.find((v) => v.color === color.name && v.size === size) || blank.variants.find((v) => v.color === color.name);
  const estimate = customPriceCents(blank, used, variant);
  // The server quote is the real price (house art never sells below its listed price);
  // it refreshes after each save and on colour/size changes.
  const quote = useDesignQuote(designId, variant?.id, `${saveStatus === 'saved' ? 'saved' : 'pending'}:${used.join(',')}`);
  const price = quote ? quote.unitCents : estimate;
  const allowed = placementAllowed(doc, blank, placement);
  const template = useMemo(() => resolveTemplate(blank, color.name, placement.key), [blank, color.name, placement.key]);
  useEffect(() => { ensureFontRegistry().then(setFonts); }, []);

  // ── autosave: local copy immediately, server after 5 s (only the fields that changed) ──
  const saverRef = useRef(null);
  const saver = useMemo(() => {
    const s = createAutosaver({
      storageKey: draftKey(init.design),
      delay: 5000,
      onStatus: (st, err) => {
        setSaveStatus(st);
        if (st === 'fatal') setSaveError(apiError(err, "We couldn't save this design."));
        else if (st === 'saved' || st === 'dirty') setSaveError('');
      },
      save: async (state) => {
        await ensureFontRegistry(); // font keys must be known before serverLayers()
        const snap = snapshotOf(state.name, state.doc);
        const id = designIdRef.current;
        if (id) {
          const prev = lastSent.current || {};
          const patch = {};
          if (snap.name !== prev.name) patch.name = snap.name;
          if (snap.blankKey !== prev.blankKey) patch.blankKey = snap.blankKey;
          if (snap.color !== prev.color) patch.color = snap.color;
          if (snap.layers !== prev.layers || patch.blankKey) patch.layers = JSON.parse(snap.layers);
          if (Object.keys(patch).length) await updateDesign(id, patch);
        } else {
          if (!usedPlacements(state.doc).length) return; // nothing worth a server copy yet (kept locally)
          const d = await createDesign({ name: snap.name, blankKey: snap.blankKey, color: snap.color, layers: JSON.parse(snap.layers) });
          if (!d?.id) throw new Error('Could not save your design.');
          designIdRef.current = d.id;
          setDesignId(d.id);
          saverRef.current.clearLocal();
          saverRef.current.setKey(draftKey(d.id));
          saverRef.current.saveLocal({ ...state, designId: d.id });
        }
        lastSent.current = snap;
      },
    });
    saverRef.current = s;
    return s;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) return;
    saver.schedule({ designId: designIdRef.current, name, doc: history.state });
  }, [history.state, name, saver]);
  useEffect(() => {
    if (designId) onDesignId?.(designId);
  }, [designId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onLeave = () => { saver.flush().catch(() => {}); };
    window.addEventListener('pagehide', onLeave);
    return () => { window.removeEventListener('pagehide', onLeave); saver.flush().catch(() => {}); };
  }, [saver]);
  useEffect(() => { if (saveError) notify(saveError, 'error'); }, [saveError]); // eslint-disable-line react-hooks/exhaustive-deps
  // Another tab changed this same design → offer to load its copy.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== draftKey(designIdRef.current) || !e.newValue) return;
      try {
        const v = JSON.parse(e.newValue);
        if (v?.state?.doc) setResume({ ...v, kind: 'tab' });
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── load: ?design=<id>, ?from=<catalog design>, or offer to resume the local draft ──
  useEffect(() => {
    const id = init.design;
    const from = init.from;
    let alive = true;
    if (id) {
      (async () => {
        await ensureFontRegistry();
        const d = await fetchDesign(id);
        if (!alive || !d) return;
        const b = blanks.find((x) => x.key === d.blankKey) || blanks[0];
        const base = newDoc(b, d.color);
        const loaded = { ...base, layers: { ...base.layers, ...(await hydrateLayers(d.layers)) } };
        if (!alive) return;
        history.reset(loaded);
        setName(d.name || 'Untitled design');
        lastSent.current = snapshotOf(d.name, loaded);
        saver.markSaved({ designId: id, name: d.name || 'Untitled design', doc: loaded });
        setPlacementKey(b.placements[0].key);
        setSize(pickSize(b, init.size));
        // A newer copy on this device (saved offline / before a failed save)?
        const local = saver.loadLocal();
        const serverAt = Date.parse(d.updatedAt || '') || 0;
        if (local?.state?.doc && (local.at || 0) > serverAt + 1000
          && JSON.stringify(snapshotOf(local.state.name, local.state.doc)) !== JSON.stringify(lastSent.current)) {
          setResume({ ...local, kind: 'newer' });
        }
      })().catch(() => notify("Couldn't open that design.", 'error'));
    } else if (init.product) {
      (async () => {
        await ensureFontRegistry();
        setBusy({ label: 'Setting up your piece' });
        const server = await fetchDesignFromProduct(init.product, { color: init.color, size: init.size }).catch(() => null);
        if (!alive) return;
        if (server?.layers && blanks.some((x) => x.key === server.blankKey)) {
          const b = blanks.find((x) => x.key === server.blankKey);
          const base = newDoc(b, pickColor(b, server.color));
          const loaded = { ...base, layers: { ...base.layers, ...(await hydrateLayers(server.layers)) } };
          if (!alive) return;
          history.reset(loaded);
          setName(server.name || 'Untitled design');
          setPlacementKey(usedPlacements(loaded)[0] || b.placements[0].key);
          setSize(pickSize(b, server.size || init.size));
          if (server.id) {
            designIdRef.current = server.id; setDesignId(server.id); saver.setKey(draftKey(server.id));
            lastSent.current = snapshotOf(server.name, loaded);
            saver.markSaved({ designId: server.id, name: server.name || 'Untitled design', doc: loaded });
          }
          return;
        }
        // No server route yet: place the product's own art client-side.
        const pre = await prefillFromProduct(init.product);
        if (!alive || !pre) return;
        history.reset(pre.doc);
        setName(pre.name);
        setPlacementKey(pre.placementKey);
        setSize(pickSize(pre.blank, init.size));
      })().catch((e) => notify(apiError(e, "Couldn't load that piece — start from scratch or try again."), 'error'))
        .finally(() => alive && setBusy(null));
    } else if (from && DESIGNS.some((d) => d.id === from)) {
      const ink = DARK.test(initialColor || '') ? 'white' : 'black';
      const p = initialBlank.placements.find((x) => !isEmbroidery(x));
      if (p) {
        houseArtLayer(from, ink, p).then((l) => {
          if (!alive || !l) return;
          dirty.current = true;
          const base = newDoc(initialBlank, initialColor);
          history.reset({ ...base, layers: { ...base.layers, [p.key]: [l] } });
          setPlacementKey(p.key);
          setName(DESIGNS.find((d) => d.id === from)?.phrase || 'Untitled design');
        }).catch(() => notify("Couldn't load that design.", 'error'));
      }
    } else {
      const draft = saver.loadLocal();
      if (draft?.state?.doc && usedPlacements(draft.state.doc).length) setResume({ ...draft, kind: 'new' });
    }
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── doc mutations ──
  /** `next` = new layer list, or a function of the current list (safe across awaits). */
  const commitLayers = useCallback((next, key = placement.key) => {
    dirty.current = true;
    setLive(null);
    history.commit((s) => {
      const cur = s.layers[key] || [];
      return { ...s, layers: { ...s.layers, [key]: typeof next === 'function' ? next(cur) : next } };
    });
  }, [history, placement.key]);
  const previewLayers = useCallback((next) => {
    setLive({ ...history.state, layers: { ...history.state.layers, [placement.key]: next } });
  }, [history.state, placement.key]);
  // Real rendered size of a text layer (font metrics) → the document, with no undo step,
  // so centring, snapping and the print-area clamp all use what's actually drawn.
  // Text drawn wider/taller than the print area (e.g. a long phrase prefilled on a hat) shrinks to fit, centred.
  const measureLayer = useCallback((id, width, height) => {
    const a = placement.area;
    const fit = (l) => {
      const m = { ...l, width, height };
      if (l.rotation || (width <= a.width + 1 && height <= a.height + 1)) return m;
      const k = Math.min(a.width / width, a.height / height) * 0.96;
      const r = { ...m, ...resizeText(m, Math.floor(m.fontSize * k), a, isEmbroidery(placement)) };
      return { ...r, x: Math.round((a.width - r.width) / 2) };
    };
    const fix = (s) => {
      const list = s.layers[placement.key] || [];
      const next = list.map((l) => (l.id === id ? fit(l) : l));
      return JSON.stringify(next) === JSON.stringify(list) ? s : { ...s, layers: { ...s.layers, [placement.key]: next } };
    };
    history.amend(fix);
    setLive((cur) => (cur ? fix(cur) : cur));
  }, [history, placement]);
  const patchSelected = (patch) => selected && commitLayers((cur) => cur.map((l) => (l.id === selected.id ? { ...l, ...patch } : l)));

  const guardPlacement = () => {
    if (!allowed) { notify(MIXED_MSG, 'error'); return false; }
    return true;
  };
  /** New text layer (centred, or centred on `at` = where the garment was tapped), ready to type. */
  const addText = (at) => {
    if (!guardPlacement()) return;
    const emb = isEmbroidery(placement);
    const ink = emb ? defaultThread(blank, color.name) : defaultInk(color.name).toUpperCase();
    if (emb && !ink) { notify('Embroidery isn’t available on this piece right now.', 'error'); return; }
    let l = makeTextLayer(placement, { text: emb ? 'YOUR NAME' : 'YOUR TEXT', color: ink });
    if (at) l = clampToArea({ ...l, x: Math.round(at.x - l.width / 2), y: Math.round(at.y - l.height / 2) }, placement.area);
    commitLayers((cur) => [...cur, l]);
    setSelectedId(l.id);
    setEditRequest({ id: l.id, at: Date.now() });
    setMobileTab('edit');
  };
  /** Garment + colour + the product's art (or its phrase, embroidered on hats) — no server needed. */
  async function prefillFromProduct(slug) {
    const product = (products || []).find((x) => x.slug === slug);
    const hit = lookupSlug(slug);
    const type = product?.productType || hit?.kind || 'tee';
    const b = blanks.find((x) => x.key === type) || blanks.find((x) => x.key === (type === 'crewneck' ? 'hoodie' : type)) || blanks[0];
    const colorName = pickColor(b, init.color);
    const phrase = hit?.design.phrase || (product ? displayName(product) : '') || 'The Homies';
    const p = b.placements.find((x) => placementIncluded(b, x)) || b.placements[0];
    let layer;
    if (!isEmbroidery(p) && hit?.design.id) layer = await houseArtLayer(hit.design.id, DARK.test(colorName) ? 'white' : 'black', p);
    else {
      const thread = isEmbroidery(p) ? defaultThread(b, colorName) : '';
      if (isEmbroidery(p) && !thread) return null;
      layer = makeTextLayer(p, { text: clampText(twoLines(phrase.toUpperCase())), color: thread || defaultInk(colorName).toUpperCase() });
      layer = clampToArea(layer, p.area);
    }
    const base = newDoc(b, colorName);
    return { blank: b, doc: { ...base, layers: { ...base.layers, [p.key]: [layer] } }, name: phrase, placementKey: p.key };
  }
  async function houseArtLayer(id, ink, p) {
    const original = artUrl(id, ink);
    const up = await uploadHouseArt(original);
    const src = up?.url || original;
    registerLocalImage(src, canvasSrc(original)); // draw from the same-origin copy right away
    const img = await getImage(src);
    return makeImageLayer(p, { src, naturalWidth: up?.width || img.naturalWidth, naturalHeight: up?.height || img.naturalHeight, name: DESIGNS.find((d) => d.id === id)?.phrase });
  }
  const addFiles = async (files) => {
    if (isEmbroidery(placement)) { notify('Embroidery is text only — add text instead.', 'error'); return; }
    if (!guardPlacement()) return;
    let ok = false;
    try { ok = sessionStorage.getItem(RIGHTS_KEY) === '1'; } catch { /* ignore */ }
    if (!ok) { setRightsAsk(files); return; }
    const key = placement.key;
    for (const file of files) {
      const err = validateUpload(file);
      if (err) { notify(err, 'error'); continue; }
      const local = URL.createObjectURL(file);
      let img;
      try { img = await loadImage(local); } catch { notify("That file isn't a readable image.", 'error'); continue; }
      if (Math.min(img.naturalWidth, img.naturalHeight) < 600) { notify('That image is too small to print well (needs at least 600 px).', 'error'); continue; }
      setBusy({ label: 'Uploading image', pct: 0 });
      try {
        const up = await uploadImage(file, { purpose: 'art', rightsAccepted: true, onProgress: (pct) => setBusy({ label: 'Uploading image', pct }) });
        registerLocalImage(up.url, local);
        const l = makeImageLayer(placement, { src: up.url, naturalWidth: up.width || img.naturalWidth, naturalHeight: up.height || img.naturalHeight, name: file.name });
        commitLayers((cur) => [...cur, l], key); // append, even when several files land at once
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
    if (!guardPlacement()) return;
    const key = placement.key;
    setBusy({ label: 'Adding the design' });
    try {
      const l = await houseArtLayer(id, DARK.test(color.name) ? 'white' : 'black', placement);
      commitLayers((cur) => [...cur, l], key); setSelectedId(l.id); setMobileTab('edit');
    } catch (e) { notify(apiError(e, "Couldn't load that design."), 'error'); } finally { setBusy(null); }
  };
  const removeSelected = () => { if (!selected) return; const id = selected.id; commitLayers((cur) => cur.filter((l) => l.id !== id)); setSelectedId(null); };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy = clampToArea({ ...selected, id: `${selected.id}c${Date.now().toString(36)}`, x: selected.x + 40, y: selected.y + 40 }, placement.area);
    commitLayers((cur) => [...cur, copy]); setSelectedId(copy.id);
  };
  const moveLayer = (id, dir) => commitLayers((cur) => {
    const i = cur.findIndex((l) => l.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return cur;
    const next = [...cur]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const center = (axis) => {
    if (!selected) return;
    const a = placement.area;
    patchSelected(axis === 'h' ? { x: Math.round((a.width - selected.width) / 2) } : { y: Math.round((a.height - selected.height) / 2) });
  };

  const switchBlank = (b) => {
    if (b.key === blank.key) return;
    const keep = {};
    let dropped = 0;
    const nextColor = b.colors.find((c) => c.name === doc.color)?.name || b.colors[0].name;
    const thread = defaultThread(b, nextColor);
    const bThreads = threadsOf(b).map((t) => t.hex.toUpperCase());
    for (const p of b.placements) {
      const prev = doc.layers[p.key] || [];
      let ok = prev;
      if (isEmbroidery(p)) {
        ok = thread ? prev.filter((l) => l.type === 'text').map((l) => ({ ...l, font: 'archivo', color: bThreads.includes(String(l.color).toUpperCase()) ? l.color : thread })) : [];
      }
      dropped += prev.length - ok.length;
      keep[p.key] = ok.map((l) => clampToArea(l, p.area));
    }
    for (const [k, ls] of Object.entries(doc.layers)) if (!b.placements.some((p) => p.key === k)) dropped += ls.length;
    if (dropped) notify(`${dropped} layer${dropped > 1 ? 's' : ''} didn't fit the ${b.name} and ${dropped > 1 ? 'were' : 'was'} removed (undo to get ${dropped > 1 ? 'them' : 'it'} back).`);
    dirty.current = true;
    setLive(null);
    history.commit({ blankKey: b.key, color: nextColor, layers: keep });
    setPlacementKey(b.placements[0].key);
    setSize(b.sizes.includes(size) ? size : (b.sizes.includes('L') ? 'L' : b.sizes[0]));
    setSelectedId(null);
  };
  const setColor = (n) => { dirty.current = true; setLive(null); history.commit((s) => ({ ...s, color: n })); };

  // Esc: deselect first (capture phase, so the Studio overlay doesn't close on the same press).
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape' || !selectedId || isTyping(e.target) || modalOpen()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      setSelectedId(null);
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [selectedId]);

  // ── keyboard shortcuts (never while typing or with a dialog open) ──
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e.target) || isTyping(document.activeElement) || modalOpen() || busy) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); setLive(null); (e.shiftKey ? history.redo : history.undo)(); return; }
      if (mod && k === 'y') { e.preventDefault(); setLive(null); history.redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); removeSelected(); }
      if (mod && k === 'd' && selected) { e.preventDefault(); duplicateSelected(); }
      if (selected && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const unit = Math.max(1, Math.round(placement.area.width / 360)); // ≈ 1 screen px
        const step = (e.shiftKey ? 10 : 1) * unit;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        patchSelected(clampToArea({ ...selected, x: selected.x + d[0], y: selected.y + d[1] }, placement.area));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── export + add to bag (shared pipeline: studio/bagDesign.js) ──
  const renderPrintfiles = (source = doc) => renderFiles(blank, source, (label) => setBusy({ label }));
  const addToBag = async () => {
    const issues = validateDoc(doc, blank);
    if (issues.length) { notify(issues[0], 'error'); return; }
    if (!variant) { notify('Pick a colour and size.', 'error'); return; }
    try {
      setBusy({ label: 'Saving your design' });
      dirty.current = true;
      saver.schedule({ designId: designIdRef.current, name, doc: history.state });
      await saver.flush(); // keeps the original in the library
      const line = await bagDesign({
        blank, color, size, variant, doc, name, priceCents: price, originalId: designIdRef.current,
        onStep: (label) => setBusy({ label }),
      });
      const err = cart.add(line);
      if (err) throw new Error(err);
      notify('Added to your bag — saved to your library');
      if (onAdded) onAdded(); else openCart();
    } catch (e) {
      notify(apiError(e, e?.message || 'Something went wrong. Try again.'), 'error');
    } finally { setBusy(null); }
  };

  const finishCoach = () => { setCoach(-1); try { localStorage.setItem(COACH_KEY, '1'); } catch { /* ignore */ } };
  const acceptRights = () => { try { sessionStorage.setItem(RIGHTS_KEY, '1'); } catch { /* ignore */ } const f = rightsAsk; setRightsAsk(null); addFiles(f); };
  const onDrop = (e) => { e.preventDefault(); const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/')); if (files.length) addFiles(files); };
  const applyResume = () => {
    const d = resume.state;
    const b = blanks.find((x) => x.key === d.doc.blankKey) || blanks[0];
    const base = newDoc(b, d.doc.color);
    dirty.current = resume.kind !== 'new' || !!d.designId;
    setLive(null);
    history.reset({ ...base, ...d.doc, layers: { ...base.layers, ...d.doc.layers } });
    setName(d.name || 'Untitled design');
    if (resume.kind === 'new' && d.designId) { setDesignId(d.designId); designIdRef.current = d.designId; saver.setKey(draftKey(d.designId)); }
    setPlacementKey(b.placements[0].key);
    setSelectedId(null);
    setResume(null);
    setStep('edit');
    if (resume.kind !== 'new') saver.schedule({ designId: designIdRef.current, name: d.name || 'Untitled design', doc: d.doc });
  };
  const discardResume = () => { if (resume?.kind === 'new') saver.clearLocal(); setResume(null); };

  const panels = {
    add: <AddPanel onText={() => addText()} onUpload={() => (guardPlacement() ? fileInput.current?.click() : null)} onHomies={() => (guardPlacement() ? setPicker(true) : null)} embroidery={isEmbroidery(placement)} blocked={!allowed} />,
    layers: <LayersPanel layers={layers} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setMobileTab('edit'); }} onMove={moveLayer} onDelete={(id) => { commitLayers((cur) => cur.filter((l) => l.id !== id)); if (id === selectedId) setSelectedId(null); }} />,
    edit: <EditPanel layer={selected} placement={placement} threads={threads} fonts={fontsForPlacement(fonts, isEmbroidery(placement))} onPatch={patchSelected} onDelete={removeSelected} onDuplicate={duplicateSelected} onCenter={center} />,
    product: <ProductPanel blanks={blanks} homeKey={homeBlank.current} blank={blank} color={color} size={size} onBlank={switchBlank} onColor={setColor} onSize={setSize} onMockup={() => setMockupOpen(true)} />,
  };

  if (step === 'pick') {
    return (
      <div className={cn('overflow-y-auto', heightClass)}>
        {!embedded && <Helmet><title>Design your own | The Homies Shop</title></Helmet>}
        <StartPicker blanks={blanks} initialBlank={blank.key} initialColor={color.name} onStart={(b, c) => {
          setLive(null);
          history.reset(newDoc(b, c));
          dirty.current = false;
          setPlacementKey(b.placements[0].key);
          setSize((sz) => pickSize(b, sz));
          setStep('edit');
        }} />
        <ResumeBanner draft={resume} onResume={applyResume} onDiscard={discardResume} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col overflow-y-auto lg:flex-row lg:overflow-hidden', heightClass)} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      {!embedded && <Helmet><title>Design your own | The Homies Shop</title></Helmet>}
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) addFiles(f); }} />

      {/* Left rail (desktop) */}
      {isDesktop && (
        <aside className="flex w-[300px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/[0.07] p-5">
          <div className={cn(coach === 1 && 'rounded-2xl ring-2 ring-[#f0b94d] ring-offset-4 ring-offset-[#0a0a0b]')}>{panels.add}</div>
          <div>{panels.layers}</div>
        </aside>
      )}

      {/* Canvas column (phones: canvas + collapsible panel) */}
      <section className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.07] px-3 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
          <input value={name} onChange={(e) => { dirty.current = true; setName(e.target.value.slice(0, 60)); }} aria-label="Design name"
            className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 py-2 text-sm font-semibold text-white hover:bg-white/5 focus:bg-white/5 focus:outline-none" />
          <SaveBadge status={saveStatus} signedIn={signedIn} error={saveError} />
          <div className="flex items-center rounded-full border border-white/10 p-0.5">
            <ToolBtn label="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={() => { setLive(null); history.undo(); }}><Undo2 className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={() => { setLive(null); history.redo(); }}><Redo2 className="h-4 w-4" /></ToolBtn>
          </div>
          <ToolBtn label="Show tips" onClick={() => setCoach(0)}><HelpCircle className="h-4 w-4" /></ToolBtn>
        </div>

        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/[0.07] px-3 py-2 no-scrollbar sm:px-4" role="group" aria-label="Print location">
          {blank.placements.map((p) => {
            const has = (doc.layers[p.key] || []).length > 0;
            const on = p.key === placement.key;
            const ok = placementAllowed(doc, blank, p);
            return (
              <button key={p.key} aria-pressed={on} type="button" onClick={() => { setPlacementKey(p.key); setSelectedId(null); }}
                title={ok ? undefined : MIXED_MSG}
                className={cn('flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition lg:min-h-0 lg:py-1.5', on ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/10', !ok && !on && 'opacity-45')}>
                {has && <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-black' : 'bg-[#f0b94d]')} />}
                {p.label}
                {!placementIncluded(blank, p) && p.priceCents > 0 && <span className={on ? 'text-black/50' : 'text-white/40'}>{addonDelta(p.priceCents)}</span>}
              </button>
            );
          })}
        </div>

        <div className={cn('relative min-h-[28dvh] flex-1 bg-[radial-gradient(circle_at_50%_30%,#1c1c20,#0a0a0b_70%)] lg:min-h-0', coach === 2 && 'ring-2 ring-inset ring-[#f0b94d]')}>
          <StudioCanvas template={template} placement={placement} layers={layers} selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); if (id) setMobileTab('edit'); }}
            onPreview={previewLayers} onCommit={commitLayers} onMeasure={measureLayer}
            onAddTextAt={allowed ? addText : () => notify(MIXED_MSG, 'error')}
            editRequest={editRequest} showHint={allowed} />
          {!allowed && layers.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-6">
              <div className="max-w-sm rounded-2xl bg-black/70 px-5 py-3 text-center backdrop-blur">
                <p className="text-sm font-semibold">{techniqueOf(placement) === 'embroidery' ? 'Embroidery is off for this piece' : 'Printing is off for this piece'}</p>
                <p className="mt-1 text-xs text-white/60">{MIXED_MSG}</p>
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
        {!isDesktop && <div className="shrink-0 border-t border-white/[0.07] bg-[#0d0d0f]">
          <AnimatePresence initial={false}>
            {mobileTab && (
              <motion.div key="panel" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="max-h-[24dvh] overflow-y-auto overscroll-contain px-4 py-3">{panels[mobileTab]}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-4 border-t border-white/[0.07]" role="group" aria-label="Design tools">
            {[['add', 'Add', Sparkles], ['edit', 'Edit', PenLine], ['layers', 'Layers', LayersIcon], ['product', 'Product', Shirt]].map(([k, l, Icon]) => (
              <button key={k} aria-pressed={mobileTab === k} type="button" onClick={() => setMobileTab(mobileTab === k ? null : k)}
                className={cn('flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold', mobileTab === k ? 'text-white' : 'text-white/45')}>
                <Icon className="h-[18px] w-[18px]" />{l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5 border-t border-white/[0.07] px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5">
            <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-white/45">{blank.name} · {color.name} · {size}</p><p className="font-display text-2xl leading-none">{usd(price)}</p>{quote?.houseArt && <p className="truncate text-[10px] text-[#f6d48f]">Includes The Homies design · listed price</p>}</div>
            <button type="button" onClick={() => { setSelectedId(null); setMockupOpen(true); }} className="h-10 rounded-full border border-white/15 px-3.5 text-xs font-semibold">Mockup</button>
            <ShopButton onClick={addToBag} disabled={!!busy} className="h-10"><ShoppingBag className="h-4 w-4" /> Add</ShopButton>
          </div>
        </div>}
      </section>

      {/* Right panel (desktop) */}
      {isDesktop && <aside className="flex w-[350px] shrink-0 flex-col overflow-y-auto border-l border-white/[0.07]">
        <div className={cn('space-y-6 p-5', coach === 0 && 'm-2 rounded-2xl ring-2 ring-[#f0b94d]')}>{panels.product}</div>
        <div className="border-t border-white/[0.07] p-5">{panels.edit}</div>
        <div className="mt-auto border-t border-white/[0.07] p-5">
          <div className="flex items-baseline justify-between"><span className="text-sm text-white/55">Your price</span><span className="font-display text-4xl">{usd(price)}</span></div>
          {quote?.houseArt && <p className="mt-1 text-xs text-[#f6d48f]">Includes The Homies design · listed price</p>}
          <p className="mt-1 text-xs text-white/40">{used.length > 1 ? `${used.length} print locations` : `${blank.placements.find((p) => placementIncluded(blank, p))?.label || 'Front'} included`} · shipping at checkout</p>
          <ShopButton size="lg" className="mt-4 w-full" onClick={addToBag} disabled={!!busy}><ShoppingBag className="h-4 w-4" /> Add to bag</ShopButton>
          <Link to="/shop/library" onClick={embedded ? () => onAdded?.({ closeOnly: true }) : undefined} className="mt-3 block text-center text-xs text-white/50 hover:text-white">Your library</Link>
        </div>
      </aside>}

      <MockupDialog open={mockupOpen} onClose={() => setMockupOpen(false)} blank={blank} color={color} doc={doc} variant={variant} notify={notify} renderPrintfiles={renderPrintfiles} />
      <RightsDialog open={!!rightsAsk} onCancel={() => setRightsAsk(null)} onAccept={acceptRights} />
      <HomiesPicker open={picker} onClose={() => setPicker(false)} onPick={addHomiesArt} dark={DARK.test(color.name)} />
      <ResumeBanner draft={resume} onResume={applyResume} onDiscard={discardResume} />
      <CoachMarks step={coach} onNext={() => setCoach((n) => (n >= 2 ? -1 : n + 1))} onDone={finishCoach} />
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────
function ToolBtn({ label, active, children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active}
      className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-30 lg:h-8 lg:w-8', active ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white')} {...props}>
      {children}
    </button>
  );
}

function SaveBadge({ status, signedIn, error }) {
  const map = {
    idle: null,
    dirty: { icon: Cloud, text: 'Saving soon', cls: 'text-white/40' },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-white/50', spin: true },
    saved: { icon: Check, text: signedIn ? 'Saved' : 'Saved on this device', cls: 'text-[#7be0a5]' },
    error: { icon: CloudOff, text: 'Saved locally — retrying', cls: 'text-[#f6d48f]' },
    fatal: { icon: AlertTriangle, text: 'Not saved', cls: 'text-[#f3a0a0]', always: true },
  };
  const s = map[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={cn('items-center gap-1.5 text-[11px] font-semibold', s.always ? 'inline-flex' : 'hidden sm:inline-flex', s.cls)} aria-live="polite" title={status === 'fatal' ? error : undefined}>
      <Icon className={cn('h-3.5 w-3.5', s.spin && 'animate-spin')} /><span className={s.always ? 'hidden sm:inline' : ''}>{s.text}</span>
    </span>
  );
}

function AddPanel({ onText, onUpload, onHomies, embroidery, blocked }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Add</p>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        <AddBtn icon={Type} title="Text" sub="Your words, your font" onClick={onText} disabled={blocked} />
        <AddBtn icon={ImagePlus} title="Upload" sub="PNG, JPG, WEBP" onClick={onUpload} disabled={embroidery || blocked} />
        <AddBtn icon={Sparkles} title="The Homies art" sub="Use a drop design" onClick={onHomies} disabled={embroidery || blocked} />
      </div>
      {blocked ? <Tip className="mt-3">{MIXED_MSG}</Tip>
        : embroidery ? <Tip className="mt-3">This spot is embroidered: text only, up to 2 lines, in thread colours.</Tip>
          : <Tip className="mt-3">Best results: transparent PNGs, at least 2000 px wide. We'll tell you if anything will print blurry.</Tip>}
    </div>
  );
}
function AddBtn({ icon: Icon, title, sub, ...props }) {
  return (
    <button type="button" className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-center transition hover:border-white/30 hover:bg-white/[0.06] disabled:opacity-30 lg:flex-row lg:justify-start lg:gap-3 lg:p-3.5 lg:text-left" {...props}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]"><Icon className="h-[18px] w-[18px]" /></span>
      <span><span className="block text-[13px] font-semibold leading-tight sm:text-sm">{title}</span><span className="hidden text-xs text-white/45 lg:block">{sub}</span></span>
    </button>
  );
}

function LayersPanel({ layers, selectedId, onSelect, onMove, onDelete }) {
  const ordered = [...layers].reverse();
  const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/45 hover:text-white lg:h-7 lg:w-7';
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Layers</p>
      {!layers.length ? <p className="text-sm text-white/40">Nothing here yet.</p> : (
        <ul className="space-y-1.5">
          {ordered.map((l) => (
            <li key={l.id}>
              <div className={cn('flex items-center gap-1 rounded-xl border px-2 py-1', l.id === selectedId ? 'border-[#f0b94d]/60 bg-[#f0b94d]/[0.06]' : 'border-white/[0.07]')}>
                <button type="button" onClick={() => onSelect(l.id)} className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 text-left">
                  {l.type === 'image'
                    ? <span className="shop-checker h-8 w-8 shrink-0 overflow-hidden rounded-md"><img src={canvasSrc(l.src)} alt="" className="h-full w-full object-contain" /></span>
                    : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.07]"><Type className="h-4 w-4" /></span>}
                  <span className="truncate text-sm">{l.type === 'text' ? l.text || 'Text' : l.name || 'Image'}</span>
                </button>
                <button type="button" aria-label="Bring forward" onClick={() => onMove(l.id, 1)} className={iconBtn}><ChevronUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Send backward" onClick={() => onMove(l.id, -1)} className={iconBtn}><ChevronDown className="h-4 w-4" /></button>
                <button type="button" aria-label="Delete layer" onClick={() => onDelete(l.id)} className={cn(iconBtn, 'hover:text-[#f3a0a0]')}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditPanel({ layer, placement, threads, fonts, onPatch, onDelete, onDuplicate, onCenter }) {
  if (!layer) return <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Edit</p><p className="text-sm text-white/45">Tap something on the design to edit it. Drag to move, pull the corners to resize, use the top handle to rotate.</p></div>;
  const emb = isEmbroidery(placement);
  const area = placement.area;
  const dpi = layer.type === 'image' ? effectiveDpi({ naturalWidth: layer.naturalWidth, naturalHeight: layer.naturalHeight, layerWidth: layer.width, layerHeight: layer.height, areaDpi: area.dpi }) : 0;
  const st = dpiStatus(dpi);
  const palette = emb ? threads.map((t) => ({ hex: t.hex.toUpperCase(), label: t.name })) : INKS.map((hex) => ({ hex, label: hex }));
  const lines = String(layer.text || '').split('\n').length;
  const range = layer.type === 'text' ? textSizeRange(layer, area, emb) : null;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">{layer.type === 'text' ? 'Text' : 'Image'}</p>
        <div className="flex gap-0.5">
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
            <label htmlFor="studio-text" className="mb-1.5 flex justify-between text-xs font-semibold text-white/60">
              <span>Text</span><span className="font-normal text-white/35">{lines}/{TEXT_MAX_LINES} lines · {String(layer.text || '').length}/{TEXT_MAX}</span>
            </label>
            <textarea id="studio-text" rows={2} value={layer.text} maxLength={TEXT_MAX}
              onChange={(e) => onPatch({ text: clampText(e.target.value) })}
              className="w-full resize-none rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-base text-white focus:border-white/40 focus:outline-none sm:text-sm" />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] text-white/35">Tip: double-click the text on the design to type right on it.</p>
              <button type="button" disabled={lines >= TEXT_MAX_LINES} onClick={() => onPatch({ text: clampText(`${layer.text}\n`) })}
                className="h-9 shrink-0 rounded-full border border-white/12 px-3 text-xs font-semibold text-white/75 hover:border-white/35 disabled:opacity-30">+ Line break</button>
            </div>
          </div>
          <FontPicker value={layer.font} fonts={fonts} onPick={(k) => onPatch({ font: k })} />
          {lines > 1 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-white/60">Alignment</p>
              <div className="inline-flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Text alignment">
                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
                  <ToolBtn key={a} label={`Align ${a}`} active={(layer.align || 'center') === a} onClick={() => onPatch({ align: a })}><Icon className="h-4 w-4" /></ToolBtn>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-white/60">{emb ? 'Thread colour' : 'Ink colour'}</p>
            <div className="flex flex-wrap gap-2">
              {palette.map((c) => (
                <Swatch key={c.hex} size="sm" hex={c.hex} label={c.label} selected={String(layer.color || '').toUpperCase() === c.hex} onClick={() => onPatch({ color: c.hex })} />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="studio-size" className="mb-1.5 flex justify-between text-xs font-semibold text-white/60"><span>Size</span><span>{inchesLabel(layer.width, layer.height, area.dpi)}</span></label>
            <div className="flex items-center gap-3">
              <input id="studio-size" type="range" min={range.min} max={range.max} value={Math.min(range.max, Math.max(range.min, layer.fontSize || range.min))}
                onChange={(e) => onPatch(resizeText(layer, Number(e.target.value), area, emb))} className="h-10 min-w-0 flex-1 accent-[#f0b94d] lg:h-auto" />
              <SizeInput value={layer.fontSize} min={range.min} max={range.max} onCommit={(n) => onPatch(resizeText(layer, n, area, emb))} />
            </div>
          </div>
          <div>
            <label htmlFor="studio-spacing" className="mb-1.5 flex justify-between text-xs font-semibold text-white/60"><span>Letter spacing</span><span className="font-normal text-white/40">{Math.round(((Number(layer.letterSpacing) || 0) / Math.max(1, layer.fontSize)) * 100)}%</span></label>
            <input id="studio-spacing" type="range" min={-5} max={40} step={1}
              value={Math.round(((Number(layer.letterSpacing) || 0) / Math.max(1, layer.fontSize)) * 100)}
              onChange={(e) => onPatch({ letterSpacing: Math.round((Number(e.target.value) / 100) * layer.fontSize) })}
              className="h-10 w-full accent-[#f0b94d] lg:h-auto" />
          </div>
          {emb && <Tip>Embroidered: thread colours only, letters at least ¼" tall to stitch cleanly — the size won't go smaller.</Tip>}
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
              onChange={(e) => { const w = Number(e.target.value); const h = Math.round(w * ((layer.naturalHeight || layer.height) / (layer.naturalWidth || layer.width))); onPatch(clampToArea({ ...layer, width: w, height: h }, area)); }}
              className="h-10 w-full accent-[#f0b94d] lg:h-auto" />
          </div>
        </>
      )}
    </div>
  );
}

/** Number box for the font size: free typing, clamped to the allowed range on Enter / blur. */
function SizeInput({ value, min, max, onCommit }) {
  const [draft, setDraft] = useState(String(value || ''));
  useEffect(() => { setDraft(String(value || '')); }, [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || n <= 0) { setDraft(String(value || '')); return; }
    onCommit(Math.min(max, Math.max(min, n)));
  };
  return (
    <input type="number" inputMode="numeric" aria-label="Font size (px in the print file)" min={min} max={max} value={draft}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      className="h-10 w-20 rounded-lg border border-white/12 bg-black/40 px-2 text-center text-base tabular-nums text-white focus:border-white/40 focus:outline-none sm:text-sm" />
  );
}

function GarmentThumb({ blank, colorName, className }) {
  const g = garmentThumb(blank, colorName);
  if (g.silhouette) return <GarmentSilhouette kind={g.silhouette} hex={g.hex} showPhrase={false} className={className} />;
  return <div className={cn('flex items-center justify-center', className)} style={{ background: g.background || '#fff' }}><img src={g.image} alt="" loading="lazy" className="h-full w-full object-contain" /></div>;
}

const fromPrice = (b) => Math.min(...(b.variants || []).map((v) => v.priceCents).filter((n) => Number.isInteger(n) && n > 0), b.basePriceCents || Infinity);

function ProductPanel({ blanks, homeKey, blank, color, size, onBlank, onColor, onSize, onMockup }) {
  return (
    <>
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Product</p>
        <div className="grid grid-cols-3 gap-2">
          {blanks.filter((b) => b.pickable !== false || b.key === blank.key || b.key === homeKey).map((b) => (
            <button key={b.key} type="button" aria-pressed={b.key === blank.key} onClick={() => onBlank(b)}
              className={cn('block overflow-hidden rounded-xl border text-left transition', b.key === blank.key ? 'border-white' : 'border-white/10 hover:border-white/30')}>
              <GarmentThumb blank={b} colorName={b.key === blank.key ? color.name : b.colors[0]?.name} className="aspect-square w-full" />
              <div className="px-2 py-1.5"><p className="truncate text-xs font-semibold">{b.name}</p><p className="text-[11px] text-white/45">{Number.isFinite(fromPrice(b)) ? `from ${usd(fromPrice(b))}` : ''}</p></div>
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
      {onMockup && <ShopButton variant="ghost" size="sm" onClick={onMockup}><Wand2 className="h-4 w-4" /> See a real mockup</ShopButton>}
    </>
  );
}

/** Step 1 of a fresh design: pick the garment, then its colour — then it becomes the canvas. */
function StartPicker({ blanks, initialBlank, initialColor, onStart }) {
  const [bk, setBk] = useState(initialBlank);
  const b = blanks.find((x) => x.key === bk) || blanks[0];
  const [c, setC] = useState(initialColor);
  const colorName = b.colors.some((x) => x.name === c) ? c : b.colors[0]?.name;
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#f0b94d]">The Homies Shop</p>
      <h1 className="font-display mt-2 text-4xl leading-[0.95] sm:text-6xl">Pick your piece</h1>
      <p className="mt-2 text-sm text-white/55">Choose a garment and a colour — it becomes your canvas. Then tap it to write on it.</p>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {blanks.filter((x) => x.pickable !== false || x.key === b.key).map((x) => (
          <button key={x.key} type="button" aria-pressed={x.key === b.key} onClick={() => setBk(x.key)}
            className={cn('group block overflow-hidden rounded-[22px] border text-left transition', x.key === b.key ? 'border-white ring-1 ring-white' : 'border-white/10 hover:border-white/30')}>
            <GarmentThumb blank={x} colorName={x.key === b.key ? colorName : x.colors[0]?.name} className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-[1.02]" />
            <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{x.name}</p>
              <p className="shrink-0 text-xs text-white/50">{Number.isFinite(fromPrice(x)) ? `from ${usd(fromPrice(x))}` : ''}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8">
        <p className="mb-3 text-sm font-semibold">Colour <span className="font-normal text-white/50">· {colorName}</span></p>
        <div className="flex flex-wrap gap-3">{b.colors.map((x) => <Swatch key={x.name} hex={x.hex} label={x.name} selected={x.name === colorName} onClick={() => setC(x.name)} />)}</div>
      </div>
      <ShopButton size="lg" className="mt-9 w-full sm:w-auto" onClick={() => onStart(b, colorName)}>Start designing <ArrowRight className="h-4 w-4" /></ShopButton>
    </div>
  );
}

/** Font picker: search, categories, every font name set in its own face. */
function FontPicker({ value, fonts, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const current = fontByKey(value);
  const list = filterFonts(fonts, { query, category });
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    fonts.forEach((f) => loadFontCss(f.cssUrl));
    setTimeout(() => panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  }, [open, fonts]);
  const face = (f) => ({ fontFamily: `'${f.family}'`, fontStyle: f.style || 'normal', fontWeight: weightOf(f), textTransform: f.upper ? 'uppercase' : 'none' });
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-white/60">Font</p>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/12 bg-black/40 px-3.5 text-left hover:border-white/30">
        <span className="truncate text-[17px]" style={face(current)}>{current.label}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/50 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div ref={panel} className="mt-2 rounded-2xl border border-white/10 bg-[#111113] p-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5">
            <Search className="h-4 w-4 text-white/40" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fonts" aria-label="Search fonts" className="h-9 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none sm:text-sm" />
          </div>
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto" role="group" aria-label="Font categories">
            {FONT_CATEGORIES.filter((c) => c.key === 'all' || fonts.some((f) => f.category === c.key)).map((c) => (
              <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}
                className={cn('h-8 shrink-0 rounded-full px-3 text-xs font-semibold', category === c.key ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70')}>{c.label}</button>
            ))}
          </div>
          <ul className="mt-2 max-h-60 space-y-0.5 overflow-y-auto overscroll-contain" role="listbox" aria-label="Fonts">
            {list.map((f) => (
              <li key={f.key}>
                <button type="button" role="option" aria-selected={f.key === value} onClick={() => { onPick(f.key); setOpen(false); }}
                  className={cn('flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left', f.key === value ? 'bg-white text-black' : 'hover:bg-white/[0.06]')}>
                  <span className="truncate text-[18px] leading-tight" style={face(f)}>{f.label}</span>
                  <span className={cn('shrink-0 text-[10px] uppercase tracking-wider', f.key === value ? 'text-black/50' : 'text-white/35')}>{f.category}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-2.5 py-4 text-center text-xs text-white/45">No fonts match.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function MockupDialog({ open, onClose, blank, color, doc, variant, notify, renderPrintfiles }) {
  const [mock, setMock] = useState({ state: 'idle', images: [] });
  useEffect(() => {
    if (!open) return;
    if (!usedPlacements(doc).length || !variant) { notify('Add something to your design first.', 'error'); onClose(); return; }
    let alive = true;
    setMock({ state: 'loading', images: [] });
    (async () => {
      try {
        const files = await renderPrintfiles();
        const key = await requestMockup({ productId: blank.productId, variantId: variant.id, files });
        const images = await pollMockup(key);
        if (alive) setMock({ state: 'done', images: images || [] });
      } catch (e) { if (alive) { setMock({ state: 'idle', images: [] }); notify(apiError(e, e?.message || 'Mockup failed.'), 'error'); onClose(); } }
    })();
    return () => { alive = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="mockup-title" className="flex max-h-[88dvh] max-w-3xl flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="mockup-title" className="font-display text-3xl">Real mockup</h2>
        <button type="button" onClick={onClose} aria-label="Close" data-autofocus className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </div>
      <p className="mt-1 text-xs text-white/50">{blank.name} · {color.name} — Printful's render of your print files.</p>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {mock.state === 'loading' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((n) => <Skeleton key={n} className="aspect-square rounded-2xl" />)}</div>}
        {mock.state === 'done' && (mock.images.length
          ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{mock.images.map((m, n) => <ShopImage key={n} src={m.url} alt={`Mockup ${m.placement}`} className="aspect-square rounded-2xl bg-white" fit="contain" />)}</div>
          : <p className="py-10 text-center text-sm text-white/50">No mockup came back — try again in a minute.</p>)}
      </div>
    </ModalShell>
  );
}

function ModalShell({ open, onClose, labelledBy, label, className, children }) {
  const ref = useRef(null);
  useFocusTrap(open, ref);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={label} onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className={cn('hh-shop w-full rounded-t-3xl border border-white/10 bg-[#0f0f11] sm:rounded-3xl', className)}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RightsDialog({ open, onCancel, onAccept }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { if (open) setOk(false); }, [open]);
  return (
    <ModalShell open={open} onClose={onCancel} labelledBy="rights-title" className="max-w-md p-6">
      <h2 id="rights-title" className="font-display text-3xl">Before you upload</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/65">We can only print images you have the right to use: your own photos and artwork, or images you've licensed. No logos, sports teams, celebrities or other people's work without permission.</p>
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" data-autofocus checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#f0b94d]" />
        <span>I own the rights to the images I upload, or have permission to use them.</span>
      </label>
      <div className="mt-6 flex justify-end gap-2">
        <ShopButton variant="ghost" size="sm" onClick={onCancel}>Cancel</ShopButton>
        <ShopButton size="sm" disabled={!ok} onClick={onAccept}>Continue</ShopButton>
      </div>
    </ModalShell>
  );
}

function HomiesPicker({ open, onClose, onPick, dark }) {
  const [q, setQ] = useState('');
  const list = DESIGNS.filter((d) => d.phrase.toLowerCase().includes(q.toLowerCase()));
  return (
    <ModalShell open={open} onClose={onClose} label="The Homies art" className="flex max-h-[85dvh] max-w-3xl flex-col">
      <div className="flex items-center gap-3 border-b border-white/[0.07] p-4 sm:p-5">
        <p className="font-display text-2xl sm:text-3xl">The Homies art</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search designs" data-autofocus className="ml-auto h-10 w-32 min-w-0 rounded-full border border-white/12 bg-black/40 px-4 text-base focus:outline-none sm:w-60 sm:text-sm" />
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </div>
      <div className="grid auto-rows-max grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4 sm:p-5">
        {list.map((d) => (
          <button key={d.id} type="button" onClick={() => onPick(d.id)} className={cn('group block overflow-hidden rounded-2xl border border-white/10 p-3 text-left transition hover:border-white/40', dark ? 'bg-[#1a1a1d]' : 'bg-[#f2f1ed]')}>
            <img src={artUrl(d.id, dark ? 'white' : 'black')} alt="" loading="lazy" className="aspect-square w-full object-contain transition-transform group-hover:scale-105" />
            <p className={cn('mt-2 truncate text-xs font-semibold', dark ? 'text-white/70' : 'text-black/70')}>{d.phrase}</p>
          </button>
        ))}
        {!list.length && <p className="col-span-full py-10 text-center text-sm text-white/45">No designs match “{q}”.</p>}
      </div>
    </ModalShell>
  );
}

const RESUME_COPY = {
  new: { title: 'Pick up where you left off?', yes: 'Resume', no: 'Start fresh' },
  newer: { title: 'Newer changes on this device', yes: 'Use them', no: 'Keep the saved one' },
  tab: { title: 'Changed in another tab', yes: 'Load those changes', no: 'Keep mine' },
};
function ResumeBanner({ draft, onResume, onDiscard }) {
  const c = RESUME_COPY[draft?.kind] || RESUME_COPY.new;
  return (
    <AnimatePresence>
      {draft && (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          className="fixed bottom-48 left-1/2 z-[65] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-[#131315] p-4 shadow-2xl lg:bottom-6" role="dialog" aria-label={c.title}>
          <p className="font-semibold">{c.title}</p>
          <p className="mt-1 text-sm text-white/55">“{draft.state?.name || 'Untitled design'}” — saved {timeAgo(draft.at)}.</p>
          <div className="mt-3 flex gap-2"><ShopButton size="sm" onClick={onResume}>{c.yes}</ShopButton><ShopButton size="sm" variant="ghost" onClick={onDiscard}>{c.no}</ShopButton></div>
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
  { title: 'Tap the garment', body: 'Tap inside the dashed area to write right there, upload a picture, or grab a design from the drop.', where: 'lg:left-[320px] lg:top-28' },
  { title: 'Make it yours', body: "Drag anywhere in the print area, pull corners to resize, top handle to rotate, double-tap text to retype it. Pinch or Ctrl+scroll to zoom. It all saves automatically.", where: 'lg:left-1/2 lg:-translate-x-1/2 lg:top-1/2' },
];
function CoachMarks({ step, onNext, onDone }) {
  const s = COACH[step];
  return (
    <AnimatePresence>
      {s && (
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={cn('fixed bottom-48 left-1/2 z-[66] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-[#f0b94d] p-5 text-black shadow-2xl lg:bottom-auto lg:left-auto lg:translate-x-0', s.where)} role="dialog" aria-label="Design tips">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/60">Tip {step + 1} of {COACH.length}</p>
          <p className="font-display mt-1 text-2xl">{s.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-black/75">{s.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={onDone} className="h-10 text-sm font-semibold text-black/60 hover:text-black">Skip</button>
            <button type="button" onClick={step >= COACH.length - 1 ? onDone : onNext} className="h-10 rounded-full bg-black px-5 text-sm font-semibold text-white">{step >= COACH.length - 1 ? 'Got it' : 'Next'}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
