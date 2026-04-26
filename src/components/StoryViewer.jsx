import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Send, MessageCircle, Gift, Bookmark, Share2, MoreVertical, Music, UserPlus, Star, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContent } from '@/contexts/ContentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';

const STORY_DURATION = 5000;
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
  const [isSaved, setIsSaved] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [direction, setDirection] = useState(0);

  const progressInterval = useRef(null);

  const currentStoryGroup = stories[currentStoryIndex];
  const currentItem = currentStoryGroup?.items[currentItemIndex];
  const prevStory = currentStoryIndex > 0 ? stories[currentStoryIndex - 1] : null;
  const nextStory = currentStoryIndex < stories.length - 1 ? stories[currentStoryIndex + 1] : null;

  useEffect(() => {
    setIsFollowing(false);
    setIsSubscribed(false);
    setIsLiked(false);
    setIsSaved(false);
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
    } else if (currentStoryIndex < stories.length - 1) {
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
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setCurrentItemIndex(stories[currentStoryIndex - 1].items.length - 1);
    } else {
      setProgress(0);
    }
  };

  const handleNextUser = () => {
    if (currentStoryIndex < stories.length - 1) {
      setDirection(1);
      setCurrentStoryIndex(prev => prev + 1);
      setCurrentItemIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevUser = () => {
    if (currentStoryIndex > 0) {
      setDirection(-1);
      setCurrentStoryIndex(prev => prev - 1);
      setCurrentItemIndex(0);
    }
  };

  const handleFollow = (e) => { e.stopPropagation(); setIsFollowing(!isFollowing); };
  const handleSubscribe = (e) => { e.stopPropagation(); setIsSubscribed(!isSubscribed); };
  const handleLike = (e) => { e.stopPropagation(); setIsLiked(!isLiked); };
  const handleSave = (e) => { e.stopPropagation(); setIsSaved(!isSaved); };
  const toggleMute = (e) => { e.stopPropagation(); setIsMuted(!isMuted); };

  const handleViewSharedPost = (e) => {
    e.stopPropagation();
    if (currentItem.post) { onClose(); navigate(`/post/${currentItem.post.id}`); }
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsPaused(true);
  };
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    setIsPaused(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > MIN_SWIPE_DISTANCE) handleNextUser();
    else if (distance < -MIN_SWIPE_DISTANCE) handlePrevUser();
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1, transition: { x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.15 } } },
    exit: (d) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0, scale: 0.95, transition: { x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.15 } } }),
  };

  if (!currentStoryGroup || !currentItem) return null;

  const isCurrentUser = user && user.username === currentStoryGroup.username;
  const isSharedPost = currentItem.type === 'post_share';
  const isPromo = currentItem.type === 'promo';

  // Helper: first visible frame for a story group (for adjacent preview)
  const previewUrl = (group) => {
    const first = group?.items?.[0];
    return first?.type === 'promo' ? null : first?.url;
  };

  const AdjacentPreview = ({ group, onClick, side }) => {
    const url = previewUrl(group);
    return (
      <div
        onClick={onClick}
        className={cn(
          'hidden md:flex flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden shadow-lg transition-all duration-200 hover:opacity-70',
          'w-[110px] h-[195px] opacity-40 hover:opacity-60',
          side === 'left' ? 'mr-2' : 'ml-2'
        )}
        style={{ background: '#111' }}
      >
        {url
          ? <img src={url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-b from-yellow-900/60 to-zinc-900 flex items-center justify-center">
              <span className="text-yellow-400 text-2xl">★</span>
            </div>
        }
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* ── X close button — always top-right of the black backdrop ── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* ── Layout row: prev preview | active card | next preview ── */}
      <div
        className="flex items-center justify-center w-full h-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Previous story peek */}
        {prevStory && (
          <AdjacentPreview group={prevStory} onClick={handlePrevUser} side="left" />
        )}

        {/* ── Active story card ── */}
        <div
          className="relative flex-shrink-0 bg-black overflow-hidden shadow-2xl
                     w-full h-full
                     md:w-[390px] md:h-auto md:max-h-[90vh] md:aspect-[9/16] md:rounded-2xl"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={`${currentStoryIndex}-${currentItemIndex}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex flex-col"
            >
              {/* Top gradient */}
              <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-3">
                {currentStoryGroup.items.map((item, idx) => (
                  <div key={item.id} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-none"
                      style={{ width: idx < currentItemIndex ? '100%' : idx === currentItemIndex ? `${progress}%` : '0%' }}
                    />
                  </div>
                ))}
              </div>

              {/* Top header */}
              <div className="absolute top-6 left-0 right-0 z-30 px-3 flex items-center justify-between mt-1">
                <Link
                  to={currentStoryGroup.isPromo ? '#' : `/profile/${currentStoryGroup.username}`}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <Avatar className="h-8 w-8 border border-white/30">
                    <AvatarImage src={currentStoryGroup.avatar} />
                    <AvatarFallback>{currentStoryGroup.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm drop-shadow-md">{currentStoryGroup.username}</span>
                    <span className="text-white/50 text-xs drop-shadow-md">{currentItem.timestamp}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  {!isPromo && (
                    <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 rounded-full h-8 w-8" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  )}
                  {/* Close button inside card for mobile */}
                  <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={onClose}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* ── Story content ── */}
              <div className="absolute inset-0">
                {isPromo ? (() => {
                  const p = currentItem.promo;
                  return (
                    <div className={`w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b ${p.bg || 'from-zinc-800 to-zinc-900'}`}>
                      <div className="w-full max-w-xs flex flex-col gap-5">
                        <span className={`self-start text-[11px] font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full ${p.badgeColor || 'bg-yellow-500'}`}>
                          {p.badge}
                        </span>
                        <h2 className="text-2xl font-extrabold text-white leading-tight">{p.title}</h2>
                        <div className="space-y-3">
                          {p.lines.map((line, i) => (
                            <div key={i}>
                              {line.label && <p className="text-white font-semibold text-sm">{line.label}</p>}
                              {line.desc && <p className="text-white/60 text-xs leading-snug">{line.desc}</p>}
                            </div>
                          ))}
                        </div>
                        {p.ctaExternal ? (
                          <a href={p.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="self-start bg-white text-black font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors">
                            {p.cta} <ArrowRight className="h-4 w-4" />
                          </a>
                        ) : (
                          <Link to={p.ctaUrl} onClick={e => e.stopPropagation()}
                            className="self-start bg-white text-black font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors">
                            {p.cta} <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })() : isSharedPost ? (
                  <div className="relative w-full h-full flex items-center justify-center p-6 bg-zinc-900/90">
                    <img src={currentItem.url} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40" />
                    <div onClick={handleViewSharedPost}
                      className="relative z-10 w-full aspect-[9/16] max-h-[70%] bg-black rounded-xl overflow-hidden shadow-2xl border border-white/20 cursor-pointer group">
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
              </div>

              {/* Tap zones — left 40% = prev, right 40% = next, middle 20% = pause */}
              <div className="absolute inset-y-0 left-0 w-2/5 z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
              <div className="absolute inset-y-0 right-0 w-2/5 z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

              {/* Bottom bar — reply input + actions */}
              {!isPromo && (
                <div className="absolute bottom-0 left-0 right-0 z-40 px-3 pb-5 pt-2 flex items-center gap-2 pointer-events-auto">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Reply to ${currentStoryGroup.username}…`}
                      className="bg-black/30 border-white/20 text-white placeholder:text-white/50 rounded-full h-10 text-sm focus-visible:ring-0 focus-visible:border-white/40 backdrop-blur-sm"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full h-9 w-9 flex-shrink-0" onClick={handleLike}>
                    <Heart className={cn('h-6 w-6', isLiked ? 'fill-red-500 text-red-500' : '')} />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full h-9 w-9 flex-shrink-0">
                    <Send className="h-6 w-6 -rotate-45 mb-0.5" />
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next story peek */}
        {nextStory && (
          <AdjacentPreview group={nextStory} onClick={handleNextUser} side="right" />
        )}
      </div>

      {/* ── Desktop nav arrows — outside the card ── */}
      {prevStory && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrevUser(); }}
          className="hidden md:flex absolute left-[calc(50%-280px)] top-1/2 -translate-y-1/2 z-[110]
                     items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/25
                     text-white transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {nextStory && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNextUser(); }}
          className="hidden md:flex absolute right-[calc(50%-280px)] top-1/2 -translate-y-1/2 z-[110]
                     items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/25
                     text-white transition-all"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default StoryViewer;
