import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Heart, Send, Volume2, VolumeX, ArrowRight, MoreHorizontal
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useContent } from '@/contexts/ContentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';

const STORY_DURATION = 30000;
const MIN_SWIPE = 50;

// ─── tiny helpers ────────────────────────────────────────────────
function previewUrl(group) {
  const first = group?.items?.[0];
  return first?.type === 'promo' || !first?.url ? null : first.url;
}

// ─── main component ──────────────────────────────────────────────
export default function StoryViewer({ stories, initialStoryIndex, onClose }) {
  const { markStoryAsViewed } = useContent();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [storyIdx, setStoryIdx] = useState(initialStoryIndex);
  const [itemIdx, setItemIdx]   = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused]     = useState(false);
  const [muted, setMuted]       = useState(false);
  const [liked, setLiked]       = useState(false);
  const [dir, setDir]           = useState(1);

  const touchX   = useRef(null);
  const interval = useRef(null);

  const group   = stories[storyIdx];
  const item    = group?.items[itemIdx];
  const hasPrev = storyIdx > 0;
  const hasNext = storyIdx < stories.length - 1;

  // ── pause all feed videos ──────────────────────────────────────
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hh:stories:open'));
    return () => window.dispatchEvent(new CustomEvent('hh:stories:close'));
  }, []);

  // ── reset state on story group change ─────────────────────────
  useEffect(() => { setLiked(false); }, [storyIdx]);

  // ── mark viewed ───────────────────────────────────────────────
  useEffect(() => {
    if (!item || !group) return;
    setProgress(0);
    markStoryAsViewed(group.userId, item.id);
  }, [storyIdx, itemIdx]);

  // ── progress timer ────────────────────────────────────────────
  useEffect(() => {
    clearInterval(interval.current);
    if (paused || !item) return;
    const start = Date.now() - (progress / 100) * STORY_DURATION;
    interval.current = setInterval(() => {
      const pct = ((Date.now() - start) / STORY_DURATION) * 100;
      if (pct >= 100) goNext();
      else setProgress(pct);
    }, 50);
    return () => clearInterval(interval.current);
  }, [storyIdx, itemIdx, paused, item]);

  // ── navigation ────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDir(1);
    if (itemIdx < group.items.length - 1) {
      setItemIdx(i => i + 1);
    } else if (hasNext) {
      setStoryIdx(i => i + 1); setItemIdx(0);
    } else {
      onClose();
    }
  }, [itemIdx, group, hasNext, onClose]);

  const goPrev = useCallback(() => {
    setDir(-1);
    if (itemIdx > 0) {
      setItemIdx(i => i - 1);
    } else if (hasPrev) {
      setStoryIdx(i => i - 1);
      setItemIdx(stories[storyIdx - 1].items.length - 1);
    } else {
      setProgress(0);
    }
  }, [itemIdx, hasPrev, storyIdx, stories]);

  const goNextUser = useCallback(() => {
    setDir(1);
    if (hasNext) { setStoryIdx(i => i + 1); setItemIdx(0); }
    else onClose();
  }, [hasNext, onClose]);

  const goPrevUser = useCallback(() => {
    setDir(-1);
    if (hasPrev) { setStoryIdx(i => i - 1); setItemIdx(0); }
  }, [hasPrev]);

  // ── swipe ─────────────────────────────────────────────────────
  const onTouchStart = (e) => { touchX.current = e.targetTouches[0].clientX; setPaused(true); };
  const onTouchEnd   = (e) => {
    setPaused(false);
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > MIN_SWIPE) { dx > 0 ? goNextUser() : goPrevUser(); }
    touchX.current = null;
  };

  if (!group || !item) return null;

  const isPromo      = item.type === 'promo';
  const isSharedPost = item.type === 'post_share';

  // ── slide variants ────────────────────────────────────────────
  const variants = {
    enter:  (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0.6 }),
    center: {
      x: 0, opacity: 1,
      transition: { x: { type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.1 } }
    },
    exit:   (d) => ({
      x: d > 0 ? '-100%' : '100%', opacity: 0.6,
      transition: { x: { type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.1 } }
    }),
  };

  // ── promo card ────────────────────────────────────────────────
  const PromoSlide = ({ p }) => (
    <div className={`absolute inset-0 flex flex-col justify-center px-8 py-10 bg-gradient-to-b ${p.bg || 'from-zinc-800 to-zinc-900'}`}>
      <div className="flex flex-col gap-5 max-w-xs">
        <span className={`self-start text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white ${p.badgeColor || 'bg-yellow-500'}`}>
          {p.badge}
        </span>
        <h2 className="text-3xl font-black text-white leading-tight">{p.title}</h2>
        <div className="space-y-3">
          {p.lines.map((line, i) => (
            <div key={i}>
              {line.label && <p className="text-white font-semibold text-base">{line.label}</p>}
              {line.desc  && <p className="text-white/60 text-sm leading-snug mt-0.5">{line.desc}</p>}
            </div>
          ))}
        </div>
        {p.ctaExternal
          ? <a href={p.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="self-start mt-2 bg-white text-black font-bold text-sm px-6 py-3 rounded-full inline-flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all">
              {p.cta} <ArrowRight className="h-4 w-4" />
            </a>
          : <Link to={p.ctaUrl} onClick={e => e.stopPropagation()}
              className="self-start mt-2 bg-white text-black font-bold text-sm px-6 py-3 rounded-full inline-flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all">
              {p.cta} <ArrowRight className="h-4 w-4" />
            </Link>
        }
      </div>
    </div>
  );

  // ── render ────────────────────────────────────────────────────
  return (
    /* Full-screen dark backdrop — rendered at App root, z above everything */
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center"
         onClick={onClose}>

      {/* ── Global X button ── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all"
        aria-label="Close stories"
      >
        <X className="h-6 w-6" />
      </button>

      {/* ── Prev user arrow (desktop) ── */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrevUser(); }}
          className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-[300]
                     w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 border border-white/20
                     items-center justify-center text-white backdrop-blur-sm transition-all"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* ── Next user arrow (desktop) ── */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNextUser(); }}
          className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-[300]
                     w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 border border-white/20
                     items-center justify-center text-white backdrop-blur-sm transition-all"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* ── Row: prev peek + active card + next peek ── */}
      <div className="flex items-center justify-center gap-3 w-full h-full px-0 md:px-24"
           onClick={e => e.stopPropagation()}>

        {/* prev story thumbnail peek (desktop) */}
        {hasPrev && (
          <div
            onClick={goPrevUser}
            className="hidden md:block flex-shrink-0 cursor-pointer group"
          >
            <div className="w-[100px] h-[176px] rounded-xl overflow-hidden opacity-50 group-hover:opacity-75 transition-opacity
                            scale-90 group-hover:scale-95 transition-transform duration-200"
                 style={{ background: '#111' }}>
              {previewUrl(stories[storyIdx - 1])
                ? <img src={previewUrl(stories[storyIdx - 1])} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-yellow-900/60 to-zinc-900">
                    <span className="text-yellow-400 text-2xl">★</span>
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── Active story card ── */}
        <div
          className="relative flex-shrink-0 bg-black overflow-hidden shadow-2xl
                     /* mobile: full viewport */
                     w-full h-[100dvh]
                     /* desktop: portrait card, centered */
                     md:w-[420px] md:h-[90vh] md:max-h-[90vh] md:rounded-2xl"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >

          {/* Animated content layer */}
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={`${storyIdx}-${itemIdx}`}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
              onMouseDown={() => setPaused(true)}
              onMouseUp={() => setPaused(false)}
            >
              {/* ── Content ── */}
              {isPromo ? <PromoSlide p={item.promo} /> :
               isSharedPost ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25" />
                  <div className="relative z-10 w-[85%] aspect-[9/16] max-h-[75%] rounded-2xl overflow-hidden shadow-xl border border-white/10 cursor-pointer"
                       onClick={() => { if (item.post) { onClose(); navigate(`/post/${item.post.id}`); } }}>
                    <img src={item.url} alt="Post" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-sm font-medium line-clamp-2">{item.post?.title || item.post?.description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <img src={item.url} alt="Story" className="absolute inset-0 w-full h-full object-cover" />
              )}

              {/* Gradient overlays for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-40% to-black/50 pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* ── Progress bars (above everything) ── */}
          <div className="absolute top-0 left-0 right-0 z-50 flex gap-[3px] px-3 pt-3 pointer-events-none">
            {group.items.map((it, i) => (
              <div key={it.id} className="h-[2.5px] flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < itemIdx ? '100%' : i === itemIdx ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* ── Header (avatar, name, time, mute, more) ── */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-3 pt-7 pb-3 pointer-events-auto">
            <Link
              to={group.isPromo ? '#' : `/profile/${group.username}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-90 transition-opacity"
            >
              <Avatar className="h-9 w-9 border-[2px] border-white/80 flex-shrink-0">
                <AvatarImage src={group.avatar} />
                <AvatarFallback className="bg-zinc-700 text-white text-sm font-bold">
                  {group.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold leading-none drop-shadow truncate">{group.username}</p>
                <p className="text-white/60 text-[11px] mt-0.5">{item.timestamp || 'now'}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isPromo && (
                <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-all">
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); }}
                className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-all">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Tap zones (left half prev, right half next) ── */}
          <div className="absolute inset-y-0 left-0 w-1/2 z-40 cursor-pointer"
               onClick={(e) => { e.stopPropagation(); goPrev(); }} />
          <div className="absolute inset-y-0 right-0 w-1/2 z-40 cursor-pointer"
               onClick={(e) => { e.stopPropagation(); goNext(); }} />

          {/* ── Side nav buttons on the card edges ── */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-50
                       w-9 h-9 rounded-full bg-black/40 hover:bg-black/70
                       border border-white/20 backdrop-blur-sm
                       flex items-center justify-center text-white
                       transition-all active:scale-90"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-50
                       w-9 h-9 rounded-full bg-black/40 hover:bg-black/70
                       border border-white/20 backdrop-blur-sm
                       flex items-center justify-center text-white
                       transition-all active:scale-90"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* ── Bottom: reply input + heart + send ── */}
          {!isPromo && (
            <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center gap-2 px-3 pb-8 pt-4 pointer-events-auto">
              <Input
                placeholder={`Reply to ${group.username}…`}
                className="flex-1 h-11 rounded-full bg-white/10 backdrop-blur-sm border-white/25
                           text-white placeholder:text-white/50 text-sm
                           focus-visible:ring-0 focus-visible:border-white/50"
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); setLiked(l => !l); }}
                className="flex-shrink-0 p-2 rounded-full hover:bg-white/15 transition-all"
              >
                <Heart className={cn('h-7 w-7', liked ? 'fill-red-500 text-red-500' : 'text-white')} />
              </button>
              <button className="flex-shrink-0 p-2 rounded-full hover:bg-white/15 transition-all text-white">
                <Send className="h-7 w-7 -rotate-45 translate-y-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* next story thumbnail peek (desktop) */}
        {hasNext && (
          <div
            onClick={goNextUser}
            className="hidden md:block flex-shrink-0 cursor-pointer group"
          >
            <div className="w-[100px] h-[176px] rounded-xl overflow-hidden opacity-50 group-hover:opacity-75 transition-opacity
                            scale-90 group-hover:scale-95 transition-transform duration-200"
                 style={{ background: '#111' }}>
              {previewUrl(stories[storyIdx + 1])
                ? <img src={previewUrl(stories[storyIdx + 1])} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-yellow-900/60 to-zinc-900">
                    <span className="text-yellow-400 text-2xl">★</span>
                  </div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
