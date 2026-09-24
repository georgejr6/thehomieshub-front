import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// In-chat image viewer (lightbox). Images open big and contained inside the
// app; "open in new tab" / download are explicit buttons.
//   Touch: swipe ←/→ between images, swipe down to close, pinch or double-tap
//          to zoom, drag to pan while zoomed, tap to hide/show the bars.
//   Mouse: click to zoom at the cursor, wheel to zoom, drag to pan, ←/→/Esc.
//   The browser/phone Back button closes it instead of leaving the chat.
//
// Usage: openImageViewer([{ url, name }], index); mount <ImageViewerHost /> once.

let current = null;
const subs = new Set();
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const snapshot = () => current;
const setCurrent = (v) => { current = v; subs.forEach((fn) => fn()); };

export function openImageViewer(images, index = 0) {
  const list = (images || []).filter((i) => i?.url);
  if (!list.length) return;
  setCurrent({ images: list, index: Math.min(Math.max(index, 0), list.length - 1), key: Date.now() });
}

export function ImageViewerHost() {
  const s = useSyncExternalStore(subscribe, snapshot);
  if (!s) return null;
  return createPortal(<Viewer key={s.key} images={s.images} start={s.index} />, document.body);
}

const MAX_SCALE = 5;
const ZOOM_STEP = 2.5;
const DOUBLE_TAP_MS = 280;

async function downloadImage(img) {
  try {
    const res = await fetch(img.url, { mode: 'cors' });
    if (!res.ok) throw new Error();
    const href = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href, download: img.name || img.url.split('/').pop().split('?')[0] || 'image' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
  } catch {
    window.open(img.url, '_blank', 'noopener,noreferrer'); // storage without CORS: let the browser handle it
  }
}

function Viewer({ images, start }) {
  const [index, setIndex] = useState(start);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [swipe, setSwipe] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [chrome, setChrome] = useState(true);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const tapTimer = useRef(null);
  const lastTap = useRef(0);
  const pushed = useRef(false);
  const closeOnClick = useRef(false);

  const img = images[index];
  const many = images.length > 1;
  const zoomed = view.s > 1.01;

  const requestClose = useCallback(() => {
    if (pushed.current) window.history.back(); // popstate below does the actual close
    else setCurrent(null);
  }, []);

  const go = useCallback((d) => {
    if (!many) return;
    setIndex((i) => (i + d + images.length) % images.length);
  }, [many, images.length]);

  useEffect(() => {
    setView({ s: 1, x: 0, y: 0 });
    setLoaded(false);
    setFailed(false);
    if (many) {
      for (const d of [1, -1]) new Image().src = images[(index + d + images.length) % images.length].url;
    }
  }, [index, many, images]);

  // Scroll lock, Back button closes, keyboard.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.history.pushState({ ...(window.history.state || {}), homiesImageViewer: true }, '');
    pushed.current = true;
    const onPop = () => { pushed.current = false; setCurrent(null); };
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      clearTimeout(tapTimer.current);
    };
  }, [go, requestClose]);

  // Keep a zoomed image from being dragged off-screen.
  const clamp = useCallback((pos, s) => {
    const st = stageRef.current;
    const im = imgRef.current;
    if (!st || !im || s <= 1) return { s: Math.max(1, s), x: 0, y: 0 };
    const mx = Math.max(0, (im.offsetWidth * s - st.clientWidth) / 2);
    const my = Math.max(0, (im.offsetHeight * s - st.clientHeight) / 2);
    return { s, x: Math.min(mx, Math.max(-mx, pos.x)), y: Math.min(my, Math.max(-my, pos.y)) };
  }, []);

  // Zoom to scale S keeping the point under (cx, cy) fixed.
  const zoomAt = useCallback((cx, cy, S, from = viewRef.current) => {
    const r = stageRef.current.getBoundingClientRect();
    const px = cx - (r.left + r.width / 2);
    const py = cy - (r.top + r.height / 2);
    const k = S / from.s;
    setView(clamp({ x: px - (px - from.x) * k, y: py - (py - from.y) * k }, S));
  }, [clamp]);

  const toggleZoom = (cx, cy) => {
    if (viewRef.current.s > 1.01) setView({ s: 1, x: 0, y: 0 });
    else zoomAt(cx, cy, ZOOM_STEP);
  };

  const onPointerDown = (e) => {
    closeOnClick.current = false;
    if (e.button !== undefined && e.button !== 0) return;
    stageRef.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = {
        type: 'one', sx: e.clientX, sy: e.clientY, t: Date.now(), view: viewRef.current,
        moved: false, axis: null, onImage: imgRef.current?.contains(e.target), mouse: e.pointerType === 'mouse',
      };
    } else if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = {
        type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, view: viewRef.current,
        mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
      };
      setSwipe({ x: 0, y: 0 });
    }
    setDragging(true);
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const S = Math.min(MAX_SCALE, Math.max(1, g.view.s * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist)));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      zoomAt(g.mx, g.my, S, { ...g.view, x: g.view.x + (mx - g.mx), y: g.view.y + (my - g.my) });
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.abs(dx) + Math.abs(dy) > 6) { g.moved = true; g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
    if (!g.moved) return;
    if (g.view.s > 1.01) setView(clamp({ x: g.view.x + dx, y: g.view.y + dy }, g.view.s));
    else if (g.axis === 'x' && many) setSwipe({ x: dx, y: 0 });
    else if (g.axis === 'y') setSwipe({ x: 0, y: Math.max(0, dy) });
  };

  const endPointer = (e, cancelled) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // Pinch → one finger left: start a fresh pan from here, no jump.
      const [p] = [...pointers.current.values()];
      gesture.current = { type: 'one', sx: p.x, sy: p.y, t: Date.now(), view: viewRef.current, moved: true, axis: null, onImage: true };
      return;
    }
    gesture.current = null;
    setDragging(false);
    setSwipe({ x: 0, y: 0 });
    if (!g || cancelled) return;
    if (g.type === 'pinch') {
      if (viewRef.current.s < 1.05) setView({ s: 1, x: 0, y: 0 });
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (g.moved) {
      if (g.view.s > 1.01) return;
      if (g.axis === 'x' && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      else if (g.axis === 'y' && dy > 100) requestClose();
      return;
    }
    // A tap.
    // Tap on the dark area: close on the click that follows, not here — closing
    // on pointerup unmounts us before the click, which then lands on the chat
    // image underneath and reopens the viewer (ghost click).
    if (!g.onImage) { closeOnClick.current = true; return; }
    if (g.mouse) { toggleZoom(e.clientX, e.clientY); return; }
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      toggleZoom(e.clientX, e.clientY);
    } else {
      lastTap.current = now;
      tapTimer.current = setTimeout(() => setChrome((c) => !c), DOUBLE_TAP_MS);
    }
  };

  const onWheel = (e) => {
    const S = Math.min(MAX_SCALE, Math.max(1, viewRef.current.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
    if (S <= 1.01) setView({ s: 1, x: 0, y: 0 });
    else zoomAt(e.clientX, e.clientY, S);
  };

  const fade = 1 - Math.min(0.7, swipe.y / 400);
  const bar = cn('pointer-events-none absolute inset-x-0 z-10 flex items-center gap-2 px-3 transition-opacity duration-200 sm:px-4', chrome ? 'opacity-100' : 'opacity-0');
  const btn = 'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/90 transition-colors hover:bg-white/15 hover:text-white';

  return (
    <div className="fixed inset-0 z-[200] select-none text-white" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" style={{ opacity: fade }} />

      <div
        ref={stageRef}
        className="absolute inset-0 flex touch-none items-center justify-center overflow-hidden sm:px-16 sm:py-16"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, false)}
        onPointerCancel={(e) => endPointer(e, true)}
        onWheel={onWheel}
        onClick={() => { if (closeOnClick.current) { closeOnClick.current = false; requestClose(); } }}
      >
        {!failed ? (
          <img
            ref={imgRef}
            src={img.url}
            alt={img.name || ''}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn('max-h-full max-w-full object-contain transition-opacity duration-150', loaded ? 'opacity-100' : 'opacity-0')}
            style={{
              transform: `translate3d(${view.x + swipe.x}px, ${view.y + swipe.y}px, 0) scale(${view.s})`,
              transition: dragging ? 'opacity 150ms' : 'transform 200ms ease-out, opacity 150ms',
              cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
          />
        ) : (
          <div className="px-6 text-center text-sm text-white/70">
            Couldn't load this image.{' '}
            <a href={img.url} target="_blank" rel="noopener noreferrer" className="pointer-events-auto underline" onPointerDown={(e) => e.stopPropagation()}>Open it in a new tab</a>
          </div>
        )}
        {!loaded && !failed && <Loader2 className="absolute h-8 w-8 animate-spin text-white/60" />}
      </div>

      {/* Top bar */}
      <div className={cn(bar, 'top-0 justify-between bg-gradient-to-b from-black/70 to-transparent pb-6')} style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0 text-sm">
          {many && <span className="font-semibold">{index + 1} / {images.length}</span>}
          {img.name && <span className="ml-2 hidden truncate text-white/60 sm:inline">{img.name}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <a href={img.url} target="_blank" rel="noopener noreferrer" className={btn} title="Open in new tab" aria-label="Open in new tab"><ExternalLink className="h-5 w-5" /></a>
          <button type="button" onClick={() => downloadImage(img)} className={btn} title="Download" aria-label="Download"><Download className="h-5 w-5" /></button>
          <button type="button" onClick={requestClose} className={btn} title="Close (Esc)" aria-label="Close"><X className="h-6 w-6" /></button>
        </div>
      </div>

      {/* Desktop arrows */}
      {many && (
        <>
          <button type="button" onClick={() => go(-1)} className={cn(btn, 'absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 sm:flex', !chrome && 'opacity-0')} aria-label="Previous image"><ChevronLeft className="h-7 w-7" /></button>
          <button type="button" onClick={() => go(1)} className={cn(btn, 'absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 sm:flex', !chrome && 'opacity-0')} aria-label="Next image"><ChevronRight className="h-7 w-7" /></button>
        </>
      )}

      {/* Mobile position dots */}
      {many && images.length <= 12 && (
        <div className={cn(bar, 'bottom-0 justify-center pt-6 sm:hidden')} style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {images.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40')} />)}
        </div>
      )}
    </div>
  );
}


