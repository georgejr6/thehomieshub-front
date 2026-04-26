import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Send, UserPlus, Star, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContent } from '@/contexts/ContentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';

const STORY_DURATION = 30000; // 30 seconds per image slide
const MIN_SWIPE_DISTANCE = 50;

const StoryViewer = ({ stories, initialStoryIndex, onClose }) => {
  const { markStoryAsViewed } = useContent();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [direction, setDirection] = useState(0);

  const progressInterval = useRef(null);

  const currentStoryGroup = stories[currentStoryIndex];
  const currentItem = currentStoryGroup?.items[currentItemIndex];
  const hasPrev = currentStoryIndex > 0;
  const hasNext = currentStoryIndex < stories.length - 1;

  // Pause all feed videos while stories are open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hh:stories:open'));
    return () => window.dispatchEvent(new CustomEvent('hh:stories:close'));
  }, []);

  useEffect(() => {
    setIsFollowing(false);
    setIsSubscribed(false);
    setIsLiked(false);
  }, [currentStoryIndex]);

  useEffect(() => {
    if (!currentItem) return;
    setProgress(0);
    if (currentStoryGroup) markStoryAsViewed(currentStoryGroup.userId, currentItem.id);
  }, [currentStoryIndex, currentItemIndex]);

  useEffect(() => {
    if (isPaused || !currentItem) { clearInterval(progressInterval.current); return; }
    const startTime = Date.now() - (progress / 100) * STORY_DURATION;
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;
      if (newProgress >= 100) { handleNext(); } else { setProgress(newProgress); }
    }, 50);
    return () => clearInterval(progressInterval.current);
  }, [currentStoryIndex, currentItemIndex, isPaused, currentItem]);

  const handleNext = () => {
    setDirection(1);
    if (currentItemIndex < currentStoryGroup.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else if (hasNext) {
      setCurrentStoryIndex(prev => prev + 1);
      setCurrentItemIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    } else if (hasPrev) {
      setCurrentStoryIndex(prev => prev - 1);
      setCurrentItemIndex(stories[currentStoryIndex - 1].items.length - 1);
    } else {
      setProgress(0);
    }
  };

  const handleNextUser = () => {
    if (hasNext) { setDirection(1); setCurrentStoryIndex(prev => prev + 1); setCurrentItemIndex(0); }
    else { onClose(); }
  };

  const handlePrevUser = () => {
    if (hasPrev) { setDirection(-1); setCurrentStoryIndex(prev => prev - 1); setCurrentItemIndex(0); }
  };

  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); setIsPaused(true); };
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    setIsPaused(false);
    if (!touchStart || !touchEnd) return;
    const d = touchStart - touchEnd;
    if (d > MIN_SWIPE_DISTANCE) handleNextUser();
    else if (d < -MIN_SWIPE_DISTANCE) handlePrevUser();
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.15 } } },
    exit: (d) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0, transition: { x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.15 } } }),
  };

  if (!currentStoryGroup || !currentItem) return null;

  const isCurrentUser = user && user.username === currentStoryGroup.username;
  const isSharedPost = currentItem.type === 'post_share';
  const isPromo = currentItem.type === 'promo';

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">

      {/* ── Progress bars ── */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-3 pt-3 pointer-events-none">
        {currentStoryGroup.items.map((item, idx) => (
          <div key={item.id} className="h-[3px] flex-1 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: idx < currentItemIndex ? '100%' : idx === currentItemIndex ? `${progress}%` : '0%',
                transition: idx === currentItemIndex ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Header bar ── */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 pt-7 pb-2 pointer-events-auto">
        <Link
          to={currentStoryGroup.isPromo ? '#' : `/profile/${currentStoryGroup.username}`}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <Avatar className="h-9 w-9 border-2 border-white/40">
            <AvatarImage src={currentStoryGroup.avatar} />
            <AvatarFallback>{currentStoryGroup.username[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm leading-none drop-shadow">{currentStoryGroup.username}</p>
            <p className="text-white/50 text-[11px] mt-0.5">{currentItem.timestamp}</p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {!isPromo && (
            <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
          <button onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* ── Animated story content ── */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={`${currentStoryIndex}-${currentItemIndex}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
        >
          {/* Content */}
          {isPromo ? (() => {
            const p = currentItem.promo;
            return (
              <div className={`w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-b ${p.bg || 'from-zinc-800 to-zinc-900'}`}>
                <div className="w-full max-w-sm flex flex-col gap-6">
                  <span className={`self-start text-xs font-bold uppercase tracking-widest text-white px-3 py-1 rounded-full ${p.badgeColor || 'bg-yellow-500'}`}>
                    {p.badge}
                  </span>
                  <h2 className="text-3xl font-extrabold text-white leading-tight">{p.title}</h2>
                  <div className="space-y-4">
                    {p.lines.map((line, i) => (
                      <div key={i}>
                        {line.label && <p className="text-white font-semibold">{line.label}</p>}
                        {line.desc && <p className="text-white/60 text-sm leading-relaxed">{line.desc}</p>}
                      </div>
                    ))}
                  </div>
                  {p.ctaExternal ? (
                    <a href={p.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="self-start bg-white text-black font-bold px-6 py-3 rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors text-sm">
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link to={p.ctaUrl} onClick={e => e.stopPropagation()}
                      className="self-start bg-white text-black font-bold px-6 py-3 rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors text-sm">
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })() : isSharedPost ? (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
              <img src={currentItem.url} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-30" />
              <div onClick={(e) => { e.stopPropagation(); if (currentItem.post) { onClose(); navigate(`/post/${currentItem.post.id}`); } }}
                className="relative z-10 w-full max-w-sm aspect-[9/16] max-h-[80vh] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 cursor-pointer group">
                <img src={currentItem.url} alt="Post" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                    View Post <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <img src={currentItem.url} alt="Story" className="w-full h-full object-cover" />
          )}

          {/* Top gradient for readability */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Tap zones */}
          <div className="absolute inset-y-0 left-0 w-2/5 z-20" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
          <div className="absolute inset-y-0 right-0 w-2/5 z-20" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom bar: reply + like + share ── */}
      {!isPromo && (
        <div className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-3 flex items-center gap-2 pointer-events-auto">
          <div className="flex-1">
            <Input
              placeholder={`Reply to ${currentStoryGroup.username}…`}
              className="bg-black/30 border-white/20 text-white placeholder:text-white/50 rounded-full h-11 text-sm focus-visible:ring-0 focus-visible:border-white/40 backdrop-blur-sm"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <button onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-all flex-shrink-0">
            <Heart className={cn('h-7 w-7', isLiked ? 'fill-red-500 text-red-500' : '')} />
          </button>
          <button className="text-white p-2 hover:bg-white/10 rounded-full transition-all flex-shrink-0">
            <Send className="h-7 w-7 -rotate-45 mb-0.5" />
          </button>
        </div>
      )}

      {/* ── Desktop prev/next arrows ── */}
      {hasPrev && (
        <button
          onClick={handlePrevUser}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-50
                     items-center justify-center w-11 h-11 rounded-full bg-black/40 hover:bg-black/70
                     text-white transition-all border border-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={handleNextUser}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-50
                     items-center justify-center w-11 h-11 rounded-full bg-black/40 hover:bg-black/70
                     text-white transition-all border border-white/10"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default StoryViewer;
