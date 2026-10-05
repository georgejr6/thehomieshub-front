import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Group, Rect, Line, Text, Image as KImage, Transformer } from 'react-konva';
import { textConfig, getImage, ensureFonts } from '@/shop/studio/exporter';
import { clampToArea, snapToCenter, isEmbroidery } from '@/shop/studio/model';

// The Studio canvas: the printable area of one placement, scaled to fit, with
// drag / resize / rotate (Konva Transformer), snap-to-centre guides and a
// dashed print boundary. Layers are stored in printfile pixels.

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

function ImageNode({ layer, common }) {
  const [img, setImg] = useState(null);
  useEffect(() => { let alive = true; getImage(layer.src).then((i) => alive && setImg(i)).catch(() => {}); return () => { alive = false; }; }, [layer.src]);
  return <KImage image={img} width={layer.width} height={layer.height} {...common} />;
}

function TextNode({ layer, common, onMeasure }) {
  const ref = useRef(null);
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => { ensureFonts([layer]).then(() => setFontsReady((n) => n + 1)); }, [layer.font]);
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    const w = Math.ceil(n.width()); const h = Math.ceil(n.height());
    if (Math.abs(w - layer.width) > 1 || Math.abs(h - layer.height) > 1) onMeasure(layer.id, w, h);
  });
  return <Text ref={ref} key={fontsReady} {...textConfig(layer)} {...common} />;
}

export default function StudioCanvas({ placement, layers, selectedId, onSelect, onPreview, onCommit, garmentHex = '#1a1a1a', stageRef }) {
  const wrap = useRef(null);
  const { width, height } = useSize(wrap);
  const area = placement.area;
  const pad = width < 500 ? 18 : 40;
  const scale = width && height ? Math.min((width - pad * 2) / area.width, (height - pad * 2) / area.height) : 0;
  const ox = (width - area.width * scale) / 2;
  const oy = (height - area.height * scale) / 2;
  const trRef = useRef(null);
  const nodes = useRef({});
  const [guides, setGuides] = useState([]);
  const emb = isEmbroidery(placement);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const n = selectedId ? nodes.current[selectedId] : null;
    tr.nodes(n ? [n] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, layers]);

  const byId = useMemo(() => Object.fromEntries(layers.map((l) => [l.id, l])), [layers]);
  const update = (id, patch, commit) => {
    const next = layers.map((l) => (l.id === id ? { ...l, ...patch } : l));
    (commit ? onCommit : onPreview)(next);
  };

  const onDragMove = (e, l) => {
    const n = e.target;
    const raw = { ...l, x: n.x(), y: n.y() };
    const c = clampToArea(raw, area);
    const s = snapToCenter(c, area, 14 / Math.max(scale, 0.01));
    n.position({ x: s.x, y: s.y });
    setGuides(s.guides);
  };
  const onDragEnd = (e, l) => { setGuides([]); update(l.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true); };
  const onTransformEnd = (e, l) => {
    const n = e.target;
    const sx = n.scaleX(); const sy = n.scaleY();
    n.scale({ x: 1, y: 1 });
    if (l.type === 'text') {
      const fontSize = Math.max(12, Math.round(l.fontSize * Math.max(sx, sy)));
      update(l.id, { x: Math.round(n.x()), y: Math.round(n.y()), rotation: Math.round(n.rotation()), fontSize }, true);
    } else {
      const w = Math.max(20, Math.round(l.width * sx)); const h = Math.max(20, Math.round(l.height * sy));
      const c = clampToArea({ ...l, x: n.x(), y: n.y(), width: w, height: h }, area);
      update(l.id, { x: Math.round(c.x), y: Math.round(c.y), width: c.width, height: c.height, rotation: Math.round(n.rotation()) }, true);
    }
  };

  const dark = /^#(0|1|2|3)/i.test(garmentHex);
  const line = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  return (
    <div ref={wrap} className="relative h-full w-full touch-none select-none" aria-label={`${placement.label} design canvas`} role="application">
      {scale > 0 && (
        <Stage ref={stageRef} width={width} height={height}
          onMouseDown={(e) => { if (e.target === e.target.getStage() || e.target.name() === 'bg') onSelect(null); }}
          onTouchStart={(e) => { if (e.target === e.target.getStage() || e.target.name() === 'bg') onSelect(null); }}>
          <Layer>
            <Rect name="bg" x={0} y={0} width={width} height={height} fill="transparent" />
            <Rect name="bg" x={ox - pad * 0.6} y={oy - pad * 0.6} width={area.width * scale + pad * 1.2} height={area.height * scale + pad * 1.2} fill={garmentHex} cornerRadius={22} stroke="rgba(255,255,255,0.10)" strokeWidth={1} shadowColor="black" shadowBlur={40} shadowOpacity={0.35} />
          </Layer>
          <Layer>
            <Group x={ox} y={oy} scaleX={scale} scaleY={scale} clipX={-2} clipY={-2} clipWidth={area.width + 4} clipHeight={area.height + 4}>
              {layers.map((l) => {
                const common = {
                  id: l.id,
                  x: l.x, y: l.y, rotation: l.rotation || 0,
                  draggable: true,
                  ref: (n) => { if (n) nodes.current[l.id] = n; else delete nodes.current[l.id]; },
                  onMouseDown: () => onSelect(l.id),
                  onTap: () => onSelect(l.id),
                  onDragStart: () => onSelect(l.id),
                  onDragMove: (e) => onDragMove(e, l),
                  onDragEnd: (e) => onDragEnd(e, l),
                  onTransformEnd: (e) => onTransformEnd(e, l),
                };
                return l.type === 'image'
                  ? <ImageNode key={l.id} layer={l} common={common} />
                  : <TextNode key={l.id} layer={l} common={common} onMeasure={(id, w, h) => update(id, { width: w, height: h }, false)} />;
              })}
            </Group>
            <Rect x={ox} y={oy} width={area.width * scale} height={area.height * scale} stroke={line} dash={[8, 6]} strokeWidth={1.2} listening={false} />
            {guides.includes('v') && <Line points={[ox + (area.width * scale) / 2, oy, ox + (area.width * scale) / 2, oy + area.height * scale]} stroke="#f0b94d" strokeWidth={1} listening={false} />}
            {guides.includes('h') && <Line points={[ox, oy + (area.height * scale) / 2, ox + area.width * scale, oy + (area.height * scale) / 2]} stroke="#f0b94d" strokeWidth={1} listening={false} />}
            <Transformer
              ref={trRef}
              rotateEnabled
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              keepRatio
              enabledAnchors={byId[selectedId]?.type === 'text' ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              anchorSize={width < 500 ? 16 : 11}
              anchorCornerRadius={8}
              anchorStroke="#f0b94d"
              anchorFill="#0a0a0b"
              borderStroke="#f0b94d"
              borderDash={[4, 3]}
              padding={4}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 12 || newBox.height < 12 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>
      )}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/70 backdrop-blur">
        {placement.label} · {(area.width / area.dpi).toFixed(1)}" × {(area.height / area.dpi).toFixed(1)}" printable{emb ? ' · embroidery' : ''}
      </div>
    </div>
  );
}
