import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Stage, Layer, Group, Rect, Line, Text, Path, Image as KImage, Transformer } from 'react-konva';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { textConfig, getImage, ensureFonts } from '@/shop/studio/exporter';
import { clampToArea, isEmbroidery, clampText, fontByKey, weightOf } from '@/shop/studio/model';
import { artScale } from '@/shop/studio/template';

// The garment is the canvas: the template (Printful template image, the hat
// photo, or the garment silhouette) fills the view; layers live in printfile px
// inside the print area (dashed outline, brighter while you drag). Tap the
// print area to add text there, double-tap text to type on it, drag anywhere
// inside the area (soft centre magnet), big handles on touch, pinch / Ctrl+wheel
// to zoom, drag the garment to pan when zoomed.

const COARSE = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setSize({ width: Math.floor(e.contentRect.width), height: Math.floor(e.contentRect.height) }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function useImage(src) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    let alive = true;
    setImg(null);
    if (src) getImage(src).then((i) => alive && setImg(i)).catch(() => {});
    return () => { alive = false; };
  }, [src]);
  return img;
}

function ImageNode({ layer, common }) {
  const img = useImage(layer.src);
  return <KImage image={img} width={layer.width} height={layer.height} {...common} />;
}

function TextNode({ layer, common, onMeasure }) {
  const ref = useRef(null);
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => { ensureFonts([layer]).then(() => setFontsReady((n) => n + 1)); }, [layer.font]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    const w = Math.ceil(n.width()); const h = Math.ceil(n.height());
    if (Math.abs(w - layer.width) > 1 || Math.abs(h - layer.height) > 1) onMeasure(layer.id, w, h);
  });
  return <Text ref={ref} key={fontsReady} {...textConfig(layer)} {...common} />;
}

/** Type straight onto the garment (double-click / double-tap a text layer). */
function InlineTextEditor({ layer, node, onChange, onDone }) {
  const ref = useRef(null);
  const f = fontByKey(layer.font);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);
  if (!node) return null;
  const pos = node.getAbsolutePosition();
  const sc = node.getAbsoluteScale().x;
  const fs = Math.max(10, layer.fontSize * sc);
  return (
    <textarea
      ref={ref}
      aria-label="Edit text"
      value={layer.text}
      rows={Math.max(1, String(layer.text).split('\n').length)}
      onChange={(e) => onChange(clampText(e.target.value))}
      onBlur={onDone}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); onDone(); }
        if (e.key === 'Enter' && String(layer.text).split('\n').length >= 2) e.preventDefault(); // max 2 lines
      }}
      spellCheck={false}
      className="absolute z-10 resize-none overflow-hidden rounded-md border border-dashed border-[#f0b94d] bg-black/10 p-0 outline-none"
      style={{
        left: pos.x, top: pos.y,
        width: Math.max(90, layer.width * sc + 10), minHeight: fs * 1.12 * Math.max(1, String(layer.text).split('\n').length) + 6, paddingTop: 3,
        fontFamily: `'${f.family}'`, fontStyle: f.style || 'normal', fontWeight: weightOf(f),
        fontSize: fs, lineHeight: 1.05, color: layer.color, textAlign: layer.align || 'center',
        letterSpacing: `${(Number(layer.letterSpacing) || 0) * sc}px`,
        textTransform: f.upper ? 'uppercase' : 'none',
        transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'top left',
      }}
    />
  );
}

const MIN_ZOOM = 1; const MAX_ZOOM = 4;

export default function StudioCanvas({ template, placement, layers, selectedId, onSelect, onPreview, onCommit, onAddTextAt, editRequest, onEditDone, showHint = false }) {
  const wrap = useRef(null);
  const stageRef = useRef(null);
  const { width, height } = useSize(wrap);
  const t = template;
  const pf = placement.area;
  const pad = width < 500 ? 12 : 28;
  const fit = width && height ? Math.min((width - pad * 2) / t.width, (height - pad * 2) / t.height) : 0;
  const ox = (width - t.width * fit) / 2;
  const oy = (height - t.height * fit) / 2;
  const s = artScale(t);
  const trRef = useRef(null);
  const nodes = useRef({});
  const [guides, setGuides] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const pinch = useRef(null);
  const emb = isEmbroidery(placement);
  const garment = useImage(t.image);
  const bgImage = useImage(t.backgroundImage);
  const [editingId, setEditingId] = useState(null);
  const editing = layers.find((l) => l.id === editingId && l.type === 'text') || null;

  // New view (placement / garment / colour) → back to fit.
  useEffect(() => { setView({ zoom: 1, x: 0, y: 0 }); setEditingId(null); }, [t.blankKey, t.placementKey, t.colorName]);
  useEffect(() => { if (editRequest?.id) setEditingId(editRequest.id); }, [editRequest]);
  useEffect(() => { if (editingId && editingId !== selectedId) setEditingId(null); }, [selectedId, editingId]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const n = selectedId && !editingId ? nodes.current[selectedId] : null;
    tr.nodes(n ? [n] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, layers, editingId, view]);

  const update = (id, patch, commit) => {
    const next = layers.map((l) => (l.id === id ? { ...l, ...patch } : l));
    (commit ? onCommit : onPreview)(next);
  };
  const screenPerArt = fit * view.zoom * s.x; // 1 printfile px → screen px

  // Free drag inside the print area; centre lines pull gently (8 screen px) and let go.
  const onDragMove = (e, l) => {
    const n = e.target;
    const c = clampToArea({ ...l, x: n.x(), y: n.y() }, pf);
    const th = 8 / Math.max(screenPerArt, 0.0001);
    const g = [];
    let { x, y } = c;
    if (Math.abs(x + l.width / 2 - pf.width / 2) < th) { x = Math.round(pf.width / 2 - l.width / 2); g.push('v'); }
    if (Math.abs(y + l.height / 2 - pf.height / 2) < th) { y = Math.round(pf.height / 2 - l.height / 2); g.push('h'); }
    n.position({ x, y });
    setGuides((old) => (old.join() === g.join() ? old : g));
  };
  const onDragEnd = (e, l) => { setGuides([]); setDragging(false); update(l.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true); };
  const onTransformEnd = (e, l) => {
    const n = e.target;
    const sx = n.scaleX(); const sy = n.scaleY();
    n.scale({ x: 1, y: 1 });
    if (l.type === 'text') {
      const fontSize = Math.max(12, Math.round(l.fontSize * Math.max(sx, sy)));
      update(l.id, { x: Math.round(n.x()), y: Math.round(n.y()), rotation: Math.round(n.rotation()), fontSize }, true);
    } else {
      const w = Math.max(20, Math.round(l.width * sx)); const h = Math.max(20, Math.round(l.height * sy));
      const c = clampToArea({ ...l, x: n.x(), y: n.y(), width: w, height: h }, pf);
      update(l.id, { x: Math.round(c.x), y: Math.round(c.y), width: c.width, height: c.height, rotation: Math.round(n.rotation()) }, true);
    }
    setDragging(false);
  };

  // Zoom around a screen point, keeping that point still.
  const zoomAt = (factor, cx = width / 2, cy = height / 2) => setView((v) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
    if (zoom === MIN_ZOOM) return { zoom, x: 0, y: 0 };
    const k = zoom / v.zoom;
    return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
  });
  const onWheel = (e) => {
    if (!(e.evt.ctrlKey || e.evt.metaKey)) return;
    e.evt.preventDefault();
    const p = stageRef.current.getPointerPosition();
    zoomAt(e.evt.deltaY < 0 ? 1.1 : 1 / 1.1, p.x, p.y);
  };
  const onTouchMove = (e) => {
    const ts = e.evt.touches;
    if (ts.length !== 2) return;
    e.evt.preventDefault();
    const [a, b] = [ts[0], ts[1]];
    const rect = wrap.current.getBoundingClientRect();
    const c = { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    Object.values(nodes.current).forEach((n) => n.isDragging?.() && n.stopDrag());
    if (!pinch.current) { pinch.current = { d, c }; return; }
    const factor = d / pinch.current.d;
    const dx = c.x - pinch.current.c.x; const dy = c.y - pinch.current.c.y;
    pinch.current = { d, c };
    setView((v) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      if (zoom === MIN_ZOOM) return { zoom, x: 0, y: 0 };
      const k = zoom / v.zoom;
      return { zoom, x: c.x - (c.x - v.x) * k + dx, y: c.y - (c.y - v.y) * k + dy };
    });
  };
  // Tap on the garment: deselect, or (nothing selected) add text right where you tapped.
  const onBackgroundTap = (e) => {
    if (pinch.current || e.target.name() === 'art-node' || e.target.findAncestor?.('Transformer')) return;
    if (selectedId) { onSelect(null); return; }
    const art = stageRef.current?.findOne('.art');
    const p = art?.getRelativePointerPosition();
    if (p && p.x >= 0 && p.y >= 0 && p.x <= pf.width && p.y <= pf.height) onAddTextAt?.(p);
  };

  const outline = dragging ? 0.95 : selectedId ? 0.55 : 0.32;
  const darkGarment = /^#(0|1|2|3)/i.test(t.hex || '');
  const lineColor = darkGarment ? '#ffffff' : '#111111';
  const anchor = COARSE ? 18 : 11;
  return (
    <div ref={wrap} className="relative h-full w-full touch-none select-none overflow-hidden" aria-label={`${placement.label} — design on the garment`} role="application">
      {fit > 0 && (
        <Stage ref={stageRef} width={width} height={height}
          scaleX={view.zoom} scaleY={view.zoom} x={view.x} y={view.y}
          draggable={view.zoom > 1.01}
          onDragEnd={(e) => { if (e.target === e.target.getStage()) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() })); }}
          onWheel={onWheel}
          onTouchMove={onTouchMove}
          onTouchEnd={() => { setTimeout(() => { pinch.current = null; }, 60); }}
          onClick={onBackgroundTap} onTap={onBackgroundTap}>
          <Layer>
            <Group x={ox} y={oy} scaleX={fit} scaleY={fit}>
              {t.backgroundColor && <Rect width={t.width} height={t.height} fill={t.backgroundColor} cornerRadius={18} />}
              {bgImage && <KImage image={bgImage} width={t.width} height={t.height} />}
              {t.kind === 'silhouette' && <Rect width={t.width} height={t.height} fill="#ebe8e2" cornerRadius={36} />}
              {t.kind === 'silhouette' && (
                <Path data={t.path} scaleX={10} scaleY={10} fill={t.hex || '#e9e7e1'} fillRule="evenodd" stroke="rgba(255,255,255,0.08)" strokeWidth={0.15} shadowColor="black" shadowBlur={40} shadowOpacity={0.22} shadowOffsetY={14} />
              )}
              {garment && !t.imageOnTop && <KImage image={garment} width={t.width} height={t.height} />}
              <Group name="art" x={t.printArea.left} y={t.printArea.top} scaleX={s.x} scaleY={s.y}
                clipX={-1} clipY={-1} clipWidth={pf.width + 2} clipHeight={pf.height + 2}>
                {layers.map((l) => {
                  const common = {
                    id: l.id, name: 'art-node',
                    x: l.x, y: l.y, rotation: l.rotation || 0,
                    draggable: l.id !== editingId,
                    ref: (n) => { if (n) nodes.current[l.id] = n; else delete nodes.current[l.id]; },
                    onMouseDown: () => onSelect(l.id),
                    onTap: () => onSelect(l.id),
                    onDragStart: () => { onSelect(l.id); setDragging(true); },
                    onDragMove: (e) => onDragMove(e, l),
                    onDragEnd: (e) => onDragEnd(e, l),
                    onTransformStart: () => setDragging(true),
                    onTransformEnd: (e) => onTransformEnd(e, l),
                    ...(l.type === 'text' ? {
                      onDblClick: () => { onSelect(l.id); setEditingId(l.id); },
                      onDblTap: () => { onSelect(l.id); setEditingId(l.id); },
                      opacity: l.id === editingId ? 0 : 1,
                    } : {}),
                  };
                  return l.type === 'image'
                    ? <ImageNode key={l.id} layer={l} common={common} />
                    : <TextNode key={l.id} layer={l} common={common} onMeasure={(id, w, h) => update(id, { width: w, height: h }, false)} />;
                })}
              </Group>
              {garment && t.imageOnTop && <KImage image={garment} width={t.width} height={t.height} listening={false} />}
              <Group x={t.printArea.left} y={t.printArea.top} scaleX={s.x} scaleY={s.y} listening={false}>
                <Rect width={pf.width} height={pf.height} stroke={lineColor} opacity={outline} dash={[7, 6]} strokeWidth={1.3} strokeScaleEnabled={false} />
                {guides.includes('v') && <Line points={[pf.width / 2, 0, pf.width / 2, pf.height]} stroke="#f0b94d" strokeWidth={1.2} strokeScaleEnabled={false} />}
                {guides.includes('h') && <Line points={[0, pf.height / 2, pf.width, pf.height / 2]} stroke="#f0b94d" strokeWidth={1.2} strokeScaleEnabled={false} />}
              </Group>
            </Group>
            <Transformer
              ref={trRef}
              rotateEnabled
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={4}
              keepRatio
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              anchorSize={anchor / view.zoom}
              anchorCornerRadius={anchor}
              anchorStroke="#f0b94d"
              anchorStrokeWidth={1.5}
              anchorFill="#0a0a0b"
              rotateAnchorOffset={(COARSE ? 28 : 22) / view.zoom}
              borderStroke="#f0b94d"
              borderStrokeWidth={1.2}
              borderDash={[4, 3]}
              padding={4 / view.zoom}
              ignoreStroke
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 14 || Math.abs(newBox.height) < 14 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>
      )}
      {editing && (
        <InlineTextEditor key={editing.id} layer={editing} node={nodes.current[editing.id]}
          onChange={(text) => update(editing.id, { text }, false)}
          onDone={() => { update(editing.id, { text: editing.text || 'TEXT' }, true); setEditingId(null); onEditDone?.(); }} />
      )}
      {showHint && !layers.length && (
        <div className="pointer-events-none absolute left-1/2 top-4 max-w-[90%] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur">
          {emb ? 'Tap the dashed area to add your embroidered text' : 'Tap the dashed area to add text — or upload a picture'}
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur">
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.25)} disabled={view.zoom <= MIN_ZOOM} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
        <button type="button" aria-label="Fit to screen" onClick={() => setView({ zoom: 1, x: 0, y: 0 })} className="h-9 min-w-[3rem] rounded-full px-2 text-xs font-semibold tabular-nums text-white/80 hover:bg-white/10">{Math.round(view.zoom * 100)}%</button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.25)} disabled={view.zoom >= MAX_ZOOM} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
        {view.zoom > 1 && <button type="button" aria-label="Reset view" onClick={() => setView({ zoom: 1, x: 0, y: 0 })} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"><Maximize2 className="h-4 w-4" /></button>}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur">
        {placement.label} · {(pf.width / pf.dpi).toFixed(1)}" × {(pf.height / pf.dpi).toFixed(1)}"{emb ? ' · embroidery' : ''}
      </div>
    </div>
  );
}
