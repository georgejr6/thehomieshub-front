import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMedia } from '@/contexts/MediaContext';
import { cn } from '@/lib/utils';

// Homies AI chat bubble (owner 2026-11-09): floating bottom-right button that opens the same
// AI as ask.thehomies.app (embedded, same account, limits, points and teaching). Desktop: X on
// the bubble closes it for this visit. Mobile: swipe the bubble away to close it; the open
// panel is full screen and swipes down to close.
//
// Signed-in visitors get Ask in a frame (it signs them in silently through this site's
// /ask-login). Signed-out visitors get a sign-in button instead: Google/Discord sign-in
// can't run inside a frame.
const ASK_URL = (import.meta.env.VITE_ASK_URL || 'https://ask.thehomies.app').replace(/\/$/, '');
const OFF_KEY = 'hh_ai_bubble_off';
const HIDE_ON = ['/chat', '/live', '/ask-login', '/join', '/auth', '/admin', '/appeal', '/pay'];

const readOff = () => { try { return sessionStorage.getItem(OFF_KEY) === '1'; } catch { return false; } };
const writeOff = () => { try { sessionStorage.setItem(OFF_KEY, '1'); } catch { /* private mode */ } };

const HomiesAIBubble = ({ onLoginRequest }) => {
  const { user } = useAuth();
  const { hasEnteredMediaMode, currentTrack } = useMedia();
  const location = useLocation();
  const [off, setOff] = useState(readOff);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [drag, setDrag] = useState(null); // {x, y} offset while swiping the bubble
  const [sheetY, setSheetY] = useState(0); // swipe-down offset of the mobile panel
  const start = useRef(null);
  const sheetStart = useRef(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (off || window.self !== window.top || HIDE_ON.some((p) => location.pathname.startsWith(p))) return null;

  const dismiss = () => { writeOff(); setOff(true); setOpen(false); };
  const musicUp = hasEnteredMediaMode && !!currentTrack;

  // Bubble swipe-away (touch). A tap opens; a drag of 70px+ sideways or down dismisses.
  const onTouchStart = (e) => { const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY }; moved.current = false; };
  const onTouchMove = (e) => {
    if (!start.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x, dy = t.clientY - start.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved.current = true;
    setDrag({ x: dx, y: Math.max(0, dy) });
  };
  const onTouchEnd = () => {
    const d = drag;
    start.current = null; setDrag(null);
    if (d && (Math.abs(d.x) > 70 || d.y > 70)) dismiss();
  };
  const onBubbleClick = () => { if (moved.current) { moved.current = false; return; } setOpen(true); };

  // Mobile panel: swipe down on the header to close.
  const onSheetStart = (e) => { sheetStart.current = e.touches[0].clientY; };
  const onSheetMove = (e) => { if (sheetStart.current != null) setSheetY(Math.max(0, e.touches[0].clientY - sheetStart.current)); };
  const onSheetEnd = () => { if (sheetY > 120) setOpen(false); setSheetY(0); sheetStart.current = null; };

  return (
    <>
      {!open && (
        <div
          className={cn('group fixed right-4 z-[95] md:right-6', musicUp ? 'bottom-40 md:bottom-28' : 'bottom-20 md:bottom-6')}
          style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)`, opacity: Math.max(0.2, 1 - (Math.abs(drag.x) + drag.y) / 160) } : undefined}
        >
          <button
            type="button"
            onClick={onBubbleClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            aria-label="Ask the Homies AI"
            className="flex h-14 items-center gap-2 rounded-full bg-[#F0B94D] pl-4 pr-5 text-sm font-bold text-black shadow-2xl ring-1 ring-black/10 transition hover:scale-[1.03] active:scale-95 touch-none"
          >
            <Sparkles className="h-5 w-5" />
            <span className="hidden sm:inline">Ask the Homies AI</span>
            <span className="sm:hidden">Ask AI</span>
          </button>
          {/* Desktop close; on touch screens the bubble is swiped away instead. */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide the Homies AI button"
            className="absolute -left-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow md:flex md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-[96] hidden bg-black/30 md:block" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Homies AI"
            className="fixed inset-0 z-[97] flex flex-col overflow-hidden bg-[#0D0D0D] md:inset-auto md:bottom-6 md:right-6 md:h-[min(680px,calc(100vh-6rem))] md:w-[420px] md:rounded-2xl md:border md:border-border md:shadow-2xl"
            style={sheetY ? { transform: `translateY(${sheetY}px)` } : undefined}
          >
            <div
              className="flex items-center gap-2 border-b border-white/10 px-4 py-3"
              onTouchStart={onSheetStart}
              onTouchMove={onSheetMove}
              onTouchEnd={onSheetEnd}
            >
              <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20 md:hidden" />
              <Sparkles className="h-4 w-4 text-[#F0B94D]" />
              <div className="flex-1">
                <div className="text-sm font-bold text-white">Homies AI</div>
                <div className="text-[11px] text-white/50">Travel, prices, stays, the streams · teach it and earn points</div>
              </div>
              <a href={ASK_URL} target="_blank" rel="noopener noreferrer" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Open the Homies AI in a new tab">
                <ExternalLink className="h-4 w-4" />
              </a>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {user ? (
              <div className="relative flex-1">
                {!loaded && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#F0B94D]" /></div>}
                <iframe
                  title="Homies AI"
                  src={`${ASK_URL}/?embed=1`}
                  onLoad={() => setLoaded(true)}
                  allow="microphone; clipboard-write"
                  className="h-full w-full border-0 bg-[#0D0D0D]"
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <Sparkles className="h-10 w-10 text-[#F0B94D]" />
                <div className="text-lg font-bold text-white">Ask the Homies AI anything travel</div>
                <div className="max-w-xs text-sm text-white/60">Prices, places to stay, nightlife, safety and everything covered on the streams. Free to try with a Homies account.</div>
                <button type="button" onClick={() => { setOpen(false); onLoginRequest?.(); }} className="w-full max-w-xs rounded-full bg-[#F0B94D] px-5 py-3 font-bold text-black">Sign in to ask</button>
                <a href={ASK_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[#F0B94D] underline">or open it in a new tab</a>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default HomiesAIBubble;
