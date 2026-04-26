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
  
  // Local interaction states
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Swipe State
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Animation Direction (1 = next, -1 = prev)
  const [direction, setDirection] = useState(0);

  const progressInterval = useRef(null);
  
  const currentStoryGroup = stories[currentStoryIndex];
  const currentItem = currentStoryGroup?.items[currentItemIndex];

  // Reset interaction states when story user changes
  useEffect(() => {
      setIsFollowing(false);
      setIsSubscribed(false);
      setIsLiked(false);
      setIsSaved(false);
  }, [currentStoryIndex]);

  useEffect(() => {
    if (!currentItem) return;
    
    setProgress(0);
    if (currentStoryGroup) {
        markStoryAsViewed(currentStoryGroup.userId, currentItem.id);
    }
  }, [currentStoryIndex, currentItemIndex]);

  useEffect(() => {
    if (isPaused || !currentItem) {
      clearInterval(progressInterval.current);
      return;
    }

    const startTime = Date.now() - (progress / 100) * STORY_DURATION;
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;
      
      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => clearInterval(progressInterval.current);
  }, [currentStoryIndex, currentItemIndex, isPaused, currentItem]);

  // --- Navigation Logic ---

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
      const prevUserStories = stories[currentStoryIndex - 1].items;
      setCurrentItemIndex(prevUserStories.length - 1);
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

  // --- Interaction Handlers ---
  const handleFollow = (e) => {
      e.stopPropagation();
      setIsFollowing(!isFollowing);
  };

  const handleSubscribe = (e) => {
      e.stopPropagation();
      setIsSubscribed(!isSubscribed);
  };

  const handleLike = (e) => {
      e.stopPropagation();
      setIsLiked(!isLiked);
  };

  const handleSave = (e) => {
      e.stopPropagation();
      setIsSaved(!isSaved);
  };
  
  const toggleMute = (e) => {
      e.stopPropagation();
      setIsMuted(!isMuted);
  }
  
  const handleViewSharedPost = (e) => {
      e.stopPropagation();
      if (currentItem.post) {
          onClose();
          navigate(`/post/${currentItem.post.id}`);
      }
  };


  // --- Swipe Handlers ---

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsPaused(true); 
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsPaused(false);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;
    
    if (isLeftSwipe) {
        handleNextUser();
    } else if (isRightSwipe) {
        handlePrevUser();
    }
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.9,
      zIndex: 1
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 2,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.9,
      zIndex: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  if (!currentStoryGroup || !currentItem) return null;

  const isCurrentUser = user && user.username === currentStoryGroup.username;
  const isSharedPost = currentItem.type === 'post_share';
  const isPromo = currentItem.type === 'promo';

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        {/* Background Blur */}
        <div 
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 transition-all duration-500" 
            style={{ backgroundImage: `url(${currentItem.url})` }}
        />

        {/* Content Container */}
        <div className="relative w-full h-full md:max-w-md md:h-[90vh] bg-black md:rounded-xl overflow-hidden shadow-2xl flex flex-col">
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
                    <div 
                        className="relative flex-1 flex flex-col w-full h-full"
                         onTouchStart={onTouchStart}
                         onTouchMove={onTouchMove}
                         onTouchEnd={onTouchEnd}
                         onMouseDown={() => setIsPaused(true)}
                         onMouseUp={() => setIsPaused(false)}
                    >
                        {/* Top Overlay Gradient */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

                         {/* Progress Bars */}
                        <div className="absolute top-0 left-0 right-0 z-30 p-2 flex gap-1 pt-4">
                            {currentStoryGroup.items.map((item, idx) => (
                                <div key={item.id} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white transition-all duration-100 ease-linear"
                                    style={{ 
                                    width: idx < currentItemIndex ? '100%' : idx === currentItemIndex ? `${progress}%` : '0%' 
                                    }}
                                />
                                </div>
                            ))}
                        </div>

                        {/* Top Header Info */}
                        <div className="absolute top-6 left-0 right-0 z-30 px-4 flex items-center justify-between">
                            <Link 
                                to={`/profile/${currentStoryGroup.username}`}
                                className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Avatar className="h-8 w-8 border border-white/20">
                                    <AvatarImage src={currentStoryGroup.avatar} />
                                    <AvatarFallback>{currentStoryGroup.username[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold text-sm shadow-black drop-shadow-md">{currentStoryGroup.username}</span>
                                    <span className="text-white/60 text-xs shadow-black drop-shadow-md">{currentItem.timestamp}</span>
                                </div>
                            </Link>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 rounded-full h-8 w-8" onClick={toggleMute}>
                                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={onClose}>
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>

                        {/* Image Display */}
                        <div className="flex-1 relative flex items-center justify-center bg-zinc-900 overflow-hidden">
                             {/* Promo story slide */}
                             {isPromo ? (
                                 (() => {
                                   const p = currentItem.promo;
                                   return (
                                     <div className={`relative w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b ${p.bg || 'from-zinc-800 to-zinc-900'}`}>
                                       <div className="w-full max-w-xs flex flex-col gap-5">
                                         <span className={`self-start text-[11px] font-bold uppercase tracking-widest text-white px-2.5 py-0.5 rounded-full ${p.badgeColor || 'bg-yellow-500'}`}>
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
                                           <a
                                             href={p.ctaUrl}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             onClick={e => e.stopPropagation()}
                                             className="self-start bg-white text-black font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"
                                           >
                                             {p.cta} <ArrowRight className="h-4 w-4" />
                                           </a>
                                         ) : (
                                           <Link
                                             to={p.ctaUrl}
                                             onClick={e => e.stopPropagation()}
                                             className="self-start bg-white text-black font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"
                                           >
                                             {p.cta} <ArrowRight className="h-4 w-4" />
                                           </Link>
                                         )}
                                       </div>
                                       {/* Nav Zones */}
                                       <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                                       <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                                     </div>
                                   );
                                 })()
                             ) : isSharedPost ? (
                                 <div className="relative w-full h-full flex items-center justify-center p-8 bg-zinc-900/90 backdrop-blur-sm">
                                      <img 
                                        src={currentItem.url} 
                                        alt="Shared Post Background" 
                                        className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50"
                                      />
                                      <div 
                                        className="relative z-20 w-full aspect-[9/16] max-h-[70%] bg-black rounded-xl overflow-hidden shadow-2xl border border-white/20 cursor-pointer group"
                                        onClick={handleViewSharedPost}
                                      >
                                          <img 
                                            src={currentItem.url} 
                                            alt="Post Content" 
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                                                  View Post <ArrowRight className="h-4 w-4" />
                                              </div>
                                          </div>
                                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                               <p className="text-white text-xs line-clamp-2">{currentItem.post?.description || currentItem.post?.title}</p>
                                          </div>
                                      </div>
                                 </div>
                             ) : (
                                <img
                                    src={currentItem.url}
                                    alt="Story"
                                    className="w-full h-full object-cover"
                                />
                             )}

                             {/* Nav Zones — only for non-promo (promo renders its own inside) */}
                             {!isPromo && (<>
                               <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                               <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                             </>)}
                        </div>

                        {/* Bottom Overlay Gradient */}
                        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

                        {/* Right Sidebar Actions */}
                        <div className="absolute right-4 bottom-24 z-40 flex flex-col items-center gap-5 text-white pointer-events-auto">
                            <div className="flex flex-col items-center gap-1">
                                <Button size="icon" variant="ghost" className="hover:bg-transparent rounded-full" onClick={handleLike}>
                                    <Heart className={cn("h-7 w-7", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
                                </Button>
                                <span className="text-xs font-medium">12.5k</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-1">
                                <Button size="icon" variant="ghost" className="hover:bg-transparent rounded-full">
                                    <MessageCircle className="h-7 w-7 text-white" />
                                </Button>
                                <span className="text-xs font-medium">342</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <Button size="icon" variant="ghost" className="hover:bg-transparent rounded-full">
                                    <Gift className="h-7 w-7 text-white" />
                                </Button>
                                <span className="text-xs font-medium">Gift</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <Button size="icon" variant="ghost" className="hover:bg-transparent rounded-full" onClick={handleSave}>
                                    <Bookmark className={cn("h-7 w-7", isSaved ? "fill-white text-white" : "text-white")} />
                                </Button>
                                <span className="text-xs font-medium">Save</span>
                            </div>

                             <div className="flex flex-col items-center gap-1">
                                <Button size="icon" variant="ghost" className="hover:bg-transparent rounded-full">
                                    <Share2 className="h-7 w-7 text-white" />
                                </Button>
                                <span className="text-xs font-medium">Share</span>
                            </div>

                             <Button size="icon" variant="ghost" className="hover:bg-transparent rounded-full mt-2">
                                <MoreVertical className="h-6 w-6 text-white" />
                            </Button>
                        </div>

                         {/* Footer Content */}
                        <div className="absolute bottom-0 left-0 right-0 z-40 p-4 pb-6 flex flex-col gap-3 pointer-events-auto">
                            
                            {/* User Info & Caption */}
                            <div className="flex flex-col gap-2 max-w-[80%]">
                                <div className="flex items-center gap-2">
                                    <Link 
                                        to={`/profile/${currentStoryGroup.username}`}
                                        className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Avatar className="h-9 w-9 border border-white">
                                            <AvatarImage src={currentStoryGroup.avatar} />
                                            <AvatarFallback>{currentStoryGroup.username[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-white font-bold text-sm shadow-black drop-shadow-md">@{currentStoryGroup.username}</span>
                                    </Link>
                                    
                                    {!isCurrentUser && (
                                        <>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className={cn(
                                                    "h-7 px-3 text-xs bg-transparent hover:bg-white/20 border-white/40 text-white gap-1 ml-1",
                                                    isFollowing && "bg-white/20 border-transparent"
                                                )}
                                                onClick={handleFollow}
                                            >
                                                {!isFollowing && <UserPlus className="h-3 w-3" />}
                                                {isFollowing ? "Following" : "Follow"}
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                className={cn(
                                                    "h-7 px-3 text-xs bg-[#FFC107] hover:bg-[#FFB300] text-black font-semibold gap-1 border-none",
                                                    isSubscribed && "bg-white text-black"
                                                )}
                                                onClick={handleSubscribe}
                                            >
                                                {!isSubscribed && <Star className="h-3 w-3 fill-current" />}
                                                {isSubscribed ? "Subscribed" : "Subscribe"}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                
                                {!isSharedPost && (
                                    <p className="text-white text-sm line-clamp-2 drop-shadow-md">
                                        Kyoto mornings are pure magic! 🌸
                                    </p>
                                )}
                                
                                <div className="flex items-center gap-2 text-white/80 text-xs">
                                    <Music className="h-3 w-3" />
                                    <span>Original Audio - {currentStoryGroup.username}</span>
                                </div>
                            </div>

                            {/* Message Input */}
                            <div className="flex items-center gap-3 w-[85%] mt-2">
                                <div className="relative flex-1">
                                    <Input 
                                        placeholder="Send message" 
                                        className="bg-black/40 border-white/20 text-white placeholder:text-white/60 rounded-full h-11 pr-10 focus-visible:ring-0 focus-visible:border-white/40 backdrop-blur-sm"
                                    />
                                </div>
                                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full -ml-1">
                                    <Heart className="h-7 w-7" />
                                </Button>
                                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full">
                                    <Send className="h-7 w-7 -rotate-45 mb-1" />
                                </Button>
                            </div>
                        </div>

                         {/* Current User Add Story Button (Bottom Right Overlay if viewing own story) */}
                         {isCurrentUser && (
                             <div className="absolute bottom-6 right-4 z-50">
                                 <div className="relative">
                                    <Avatar className="h-10 w-10 border-2 border-white opacity-80">
                                        <AvatarImage src={user?.avatar} />
                                        <AvatarFallback>Me</AvatarFallback>
                                    </Avatar>
                                     <div className="absolute -bottom-1 -right-1 bg-[#FFC107] text-black rounded-full w-4 h-4 flex items-center justify-center border border-black">
                                        <span className="text-10px] font-bold">+</span>
                                    </div>
                                 </div>
                             </div>
                         )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Desktop Navigation Arrows */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex absolute left-4 text-white/50 hover:text-white hover:bg-white/10 h-12 w-12 rounded-full z-50"
            onClick={handlePrevUser}
        >
            <ChevronLeft className="h-8 w-8" />
        </Button>
        <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex absolute right-4 text-white/50 hover:text-white hover:bg-white/10 h-12 w-12 rounded-full z-50"
            onClick={handleNextUser}
        >
            <ChevronRight className="h-8 w-8" />
        </Button>
    </div>
  );
};

export default StoryViewer;