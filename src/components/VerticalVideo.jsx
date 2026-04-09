import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, MessageCircle, Share2, Music, Play, Pause, Volume2, VolumeX,
    Bookmark, Plus, ShieldAlert, Lock, Eye, Check, Crown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ShareDialog from '@/components/ShareDialog';
import CommentsSheet from '@/components/CommentsSheet';
import SubscriptionDialog from '@/components/SubscriptionDialog';
import GiftDialog from '@/components/GiftDialog';
import { useContent } from '@/contexts/ContentContext';
import MintedCollectibleModal from '@/components/MintedCollectibleModal';
import { useMedia } from '@/contexts/MediaContext';
import MuxPlayer from '@mux/mux-player-react';
import { useNavigate } from 'react-router-dom';

// Global mute state tracking outside component to persist across renders
let consecutiveMuteCount = 0;
let globalIsMuted = false;

const OVERLAY_HIDE_MS = 800;
const PREVIEW_LIMIT_SECONDS = 60;

const VerticalVideo = ({ post, index, isVisible, onLoginRequest }) => {
    const { user, isPremium, triggerLockedFeature } = useAuth();
    const { users, isPostLiked, togglePostLike, isPostSaved, togglePostSave,toggleContentLike } = useContent();
    const { toggleLike: toggleMediaLike, isLiked: isMediaLiked, isPlaying: musicIsPlaying } = useMedia();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Works for both <video> and <MuxPlayer>
    const videoRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Default to sound ON
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // play/pause overlay
    const [showPlayPause, setShowPlayPause] = useState(false);
    const overlayTimerRef = useRef(null);

    // Description Toggle
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    // Member access: subscription OR Discord member tag
    const isMember = isPremium || (user?.tags || []).includes('member');

    // Preview gate for subscriber content
    const [previewExpired, setPreviewExpired] = useState(false);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);

    // Blur logic — only NSFW gets immediate blur; subscriber content uses 60s preview gate
    const [isUnlocked, setIsUnlocked] = useState(false);
    const isBlurred = post.isNSFW && !isUnlocked;

    // likes/saves
    const liked = isPostLiked(post.id);
    const saved = isPostSaved(post.id);

    const [likeCount, setLikeCount] = useState(post.engagement.likes);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [isSubscribeLoading] = useState(false);

    const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
    const [isGiftDialogOpen, setIsGiftDialogOpen] = useState(false);
    const [isMintModalOpen, setIsMintModalOpen] = useState(false);

    const postUser = users?.[post.user.username];
    const subscription = post.user?.subscription;
    const postUrl = `${window.location.origin}/watch/${post.id}`;

    // mux
    const playbackId = post.muxPlaybackId || null;
    const isMux = !!playbackId;
    const muxPoster = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1` : null;
const commentTargetType =
  post?.backendType === "reel" || post?.type === "reel" ? "reel" : "video";
    const audioTrack = post.music || {
        id: `original-${post.id}`,
        title: 'Original Audio',
        artist: post.user.username,
        cover: post.user.avatar,
        type: 'audio',
        duration: '0:00',
        audioUrl: post.videoUrl
    };

    const formatTime = (timeInSeconds) => {
        if (!timeInSeconds) return "0:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const showOverlayTemporarily = () => {
        setShowPlayPause(true);
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = setTimeout(() => {
            setShowPlayPause(false);
        }, OVERLAY_HIDE_MS);
    };

    useEffect(() => {
        return () => {
            if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        };
    }, []);

    // Handle mute logic based on global state
    useEffect(() => {
        if (consecutiveMuteCount > 2) {
            setIsMuted(globalIsMuted);
            if (videoRef.current) videoRef.current.muted = globalIsMuted;
        } else {
            if (!post.isNSFW) {
                setIsMuted(false);
                if (videoRef.current) videoRef.current.muted = false;
            }
        }
    }, [isVisible, post.isNSFW]);

    // ✅ Autoplay when visible, pause when not visible or when music is playing
useEffect(() => {
  if (!isVisible || isBlurred || musicIsPlaying) {
    if (isMux) setIsPlaying(false);
    else videoRef.current?.pause?.();
    return;
  }

  // Autoplay when visible
  if (isMux) {
    setIsPlaying(true); // ✅ mux autoplay via paused prop
    return;
  }

  const timer = setTimeout(() => {
    const el = videoRef.current;
    const p = el?.play?.();
    if (p?.catch) {
      p.catch(() => {
        setIsPlaying(false);
        showOverlayTemporarily();
      });
    }
    setIsPlaying(true);
  }, 200);

  return () => clearTimeout(timer);
}, [isVisible, isBlurred, isMux, musicIsPlaying]);

    // Sync time updates (works for video & mux-player element)
    useEffect(() => {
        if (post.isNSFW) {
            setIsMuted(true);
            if (videoRef.current) videoRef.current.muted = true;
        }

        const video = videoRef.current;
        if (!video?.addEventListener) return;

        const handleTimeUpdate = () => {
            if (!isDragging && video.duration > 0) {
                setProgress((video.currentTime / video.duration) * 100);
                setCurrentTime(video.currentTime);
                setDuration(video.duration);
            }
            // 60-second preview gate for subscriber content
            if (post.isSubscriberOnly && !isMember && video.currentTime >= PREVIEW_LIMIT_SECONDS) {
                video.pause?.();
                setIsPlaying(false);
                setPreviewExpired(true);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration || 0);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [post.isNSFW, isDragging]);

    const handleSeek = (value) => {
        const newTime = (value[0] / 100) * duration;
        setCurrentTime(newTime);
        setProgress(value[0]);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };

    const handleSeekStart = () => {
        setIsDragging(true);
        videoRef.current?.pause?.();
    };

    const handleSeekEnd = () => {
        setIsDragging(false);
        videoRef.current?.play?.().catch(e => console.error("Play failed after seek", e));
        setIsPlaying(true);
    };

    // ✅ Tap on video to play/pause; show overlay briefly
const togglePlayPause = () => {
  if (isBlurred || previewExpired) return;

  if (isMux) {
    // ✅ Mux controlled playback
    setIsPlaying((prev) => !prev);
    showOverlayTemporarily();
    return;
  }

  // ✅ Native <video> playback
  const el = videoRef.current;
  if (!el) return;

  if (el.paused) {
    el.play?.().catch(() => {});
    setIsPlaying(true);
  } else {
    el.pause?.();
    setIsPlaying(false);
  }

  showOverlayTemporarily();
};

    const handleBlurClick = () => {
        if (post.isNSFW) setIsUnlocked(true);
    };

    const handlePaywallCTA = () => {
        if (!user) {
            onLoginRequest?.();
        } else {
            setShowSubscribeModal(true);
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        const el = videoRef.current;
        if (!el) return;

        const newMutedState = !el.muted;
        el.muted = newMutedState;
        setIsMuted(newMutedState);

        globalIsMuted = newMutedState;
        if (newMutedState) consecutiveMuteCount++;
        else consecutiveMuteCount = 0;
    };

    const handleInteraction = async(action) => {
        if (!user) { onLoginRequest(); return; }

        if (action === 'like') {
            if (isLikeLoading) return;
            if (post.isFrogzClip) return; // external clips have no DB id
            setIsLikeLoading(true);
            const currentlyLiked = isPostLiked(String(post.id));
            setLikeCount(prev => currentlyLiked ? Math.max(0, prev - 1) : prev + 1);
            await toggleContentLike({ targetType: commentTargetType, targetId: post.id });
            setTimeout(() => setIsLikeLoading(false), 500);
        } else if (action === 'save') {
            if (isSaveLoading) return;
            if (post.isFrogzClip) return; // external clips have no DB id
            setIsSaveLoading(true);
            await togglePostSave({ targetType: commentTargetType, targetId: post.id });
            setTimeout(() => setIsSaveLoading(false), 500);
        } else if (action === 'follow') {
            if (isFollowLoading) return;
            setIsFollowLoading(true);
            setTimeout(() => { setIsFollowing(!isFollowing); setIsFollowLoading(false); }, 500);
        } else if (action === 'subscribe') {
            if (!isSubscribed) setIsSubscriptionDialogOpen(true);
            else handleInteraction('subscribe-confirm');
        } else if (action === 'subscribe-confirm') {
            setIsSubscribed(!isSubscribed);
            setIsSubscriptionDialogOpen(false);
        }
    };

    const handleUseSound = (e) => {
        e.stopPropagation();
        if (!user) { onLoginRequest(); return; }
        if (!isMediaLiked(audioTrack.id)) {
            toggleMediaLike(audioTrack);
        }
        toast({
            title: "Sound Selected!",
            description: "Audio saved to library.",
        });
    };

    if (postUser?.isBanned) return null;

    return (
        <div
            data-index={index}
            className="h-[100svh] w-full bg-black snap-start shrink-0 overflow-hidden flex flex-col"
        >
            {/* MAIN ROW: video + side controls */}
            <div className="flex-1 min-h-0 relative flex items-end justify-center overflow-hidden">

            {/* VIDEO AREA — constrained to 85vw max on desktop */}
            <div
                className="relative z-10 h-full flex-1 min-w-0 md:max-w-[85vw] flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={togglePlayPause}
            >
                {isMux ? (
                    <MuxPlayer
                        ref={videoRef}
                        playbackId={playbackId}
                        streamType="on-demand"
                        poster={muxPoster || post.thumbnail}
                        loop
                        muted={isMuted}
                        playsInline
                        autoPlay={false}
                        paused={!isPlaying}
                        className={cn(
                            "w-full h-full object-contain",
                            isBlurred && "opacity-0"
                        )}
                        style={{ width: "100%", height: "100%" }}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        src={post.videoUrl}
                        loop
                        muted={isMuted}
                        onClick={togglePlayPause}
                        className={cn(
                            "w-full h-full object-contain",
                            isBlurred && "opacity-0"
                        )}
                        playsInline
                        disablePictureInPicture
                    />
                )}

                {/* Center Play/Pause Indicator */}
                <AnimatePresence>
                    {showPlayPause && !isBlurred && (
                        <motion.div
                            initial={{ opacity: 0, scale: 1.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                        >
                            <div className="bg-black/40 p-5 rounded-full backdrop-blur-sm">
                                {isPlaying
                                    ? <Pause className="h-10 w-10 text-white/90" fill="white" />
                                    : <Play className="h-10 w-10 text-white/90" fill="white" />
                                }
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOTTOM LEFT METADATA */}
                <div className="absolute bottom-6 left-0 right-16 md:right-4 p-4 z-40 pointer-events-none mb-1">
                    <div className="flex flex-col gap-2 items-start pointer-events-auto max-w-[85%]">
                        <Link to={`/profile/${post.user.username}`} className="font-bold text-white text-[17px] shadow-black drop-shadow-md hover:underline mb-1">
                            @{post.user.username}
                        </Link>

                        <div className="text-white/90 text-[15px] leading-snug drop-shadow-md mb-2">
                            <span className="break-words font-normal">
                                {isDescExpanded ? post.description : post.description?.substring(0, 80) + (post.description?.length > 80 ? '...' : '')}
                            </span>
                            {post.description && post.description.length > 80 && (
                                <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="font-semibold text-white/70 hover:text-white ml-1 text-sm">
                                    {isDescExpanded ? "less" : "more"}
                                </button>
                            )}
                        </div>

                        {audioTrack && (
                            <div className="flex items-center gap-2 mt-1 cursor-pointer" onClick={handleUseSound}>
                                <Music className="h-3.5 w-3.5 text-white" />
                                <div className="overflow-hidden w-[200px] h-5 relative">
                                    <div className="whitespace-nowrap text-[15px] text-white font-medium animate-marquee absolute top-0 left-0">
                                        {audioTrack.title} • {audioTrack.artist} &nbsp;&nbsp;&nbsp;&nbsp; {audioTrack.title} • {audioTrack.artist}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SEEKER BAR */}
                <div className="absolute bottom-0 left-0 right-0 z-50 px-2 pb-2 pt-4 group">
                    <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-medium drop-shadow-md">
                        <span>{formatTime(currentTime)}</span>
                        <div className="flex-1"></div>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div
                        className="relative h-1 group-hover:h-[5px] transition-all rounded-full bg-white/20 cursor-pointer"
                        onPointerDown={(e) => {
                            handleSeekStart();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                            handleSeek([pct * 100]);
                        }}
                        onPointerMove={(e) => {
                            if (!isDragging) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                            handleSeek([pct * 100]);
                        }}
                        onPointerUp={handleSeekEnd}
                    >
                        <div
                            className="absolute left-0 top-0 h-full rounded-full bg-yellow-400"
                            style={{ width: `${progress}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
                            style={{ left: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* NSFW Overlay */}
                {isBlurred && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center cursor-pointer backdrop-blur-md" onClick={handleBlurClick}>
                        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Sensitive Content</h2>
                        <Button variant="outline" className="mt-4 border-red-500 text-red-500 hover:bg-red-500/10">
                            <Eye className="mr-2 h-4 w-4" /> Reveal
                        </Button>
                    </div>
                )}

                {/* PREVIEW EXPIRED OVERLAY — mobile full screen */}
                {previewExpired && post.isSubscriberOnly && !isMember && (
                    <div className="md:hidden absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-black/85 backdrop-blur-sm">
                        <div className="mb-5">
                            {post.thumbnail && <img src={post.thumbnail} alt="" className="w-20 h-20 rounded-xl object-cover mx-auto mb-3 opacity-70" />}
                            <p className="text-[#F0B94D] text-xs font-semibold uppercase tracking-widest mb-1">Members Only</p>
                            <h3 className="text-white font-bold text-base leading-snug line-clamp-2">{post.title || post.description?.slice(0, 60) || 'Exclusive Content'}</h3>
                            <p className="text-white/50 text-xs mt-1">@{post.user.username}</p>
                        </div>
                        <p className="text-white/70 text-sm mb-5 leading-relaxed">You've watched the free preview.<br/>Become a member to watch in full.</p>
                        <Button onClick={handlePaywallCTA} className="bg-[#F0B94D] hover:bg-[#e0a83a] text-black font-bold w-full max-w-[260px] h-12 text-base rounded-xl">
                            Watch Full Video
                        </Button>
                        <p className="text-white/30 text-xs mt-4">or <button onClick={() => setPreviewExpired(false)} className="underline hover:text-white/60">rewatch preview</button></p>
                    </div>
                )}

                {/* PREVIEW EXPIRED OVERLAY — desktop (subtle darken only, CTA lives in strip below) */}
                {previewExpired && post.isSubscriberOnly && !isMember && (
                    <div className="hidden md:flex absolute inset-0 z-50 bg-black/60 backdrop-blur-[2px] items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Crown className="h-8 w-8 text-[#F0B94D]" />
                            <p className="text-white/80 text-sm font-medium">Preview ended — see CTA below</p>
                        </div>
                    </div>
                )}

            </div>{/* end video area */}

            {/* SIDE CONTROLS end tag is below */}

            {/* CONTROLS
                Mobile:  absolute over the video at bottom-right (TikTok style)
                Desktop: flex column sibling sitting beside the video
            */}
            <div className="absolute bottom-20 right-2 md:relative md:bottom-auto md:right-auto z-40 flex flex-col items-center gap-6 w-[60px] md:w-[72px] md:self-end md:pb-20 md:shrink-0">

                {/* Avatar */}
                <div className="relative mb-2">
                    <Link to={`/profile/${post.user.username}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar className="h-12 w-12 border border-white/50 cursor-pointer hover:scale-105 transition-transform">
                            <AvatarImage src={post.user.avatar} alt={post.user.name} />
                            <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Link>
                    {!isFollowing && (
                        <div
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FE2C55] rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInteraction('follow'); }}
                        >
                            <Plus className="h-3 w-3 text-white font-bold" />
                        </div>
                    )}
                    {isFollowing && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full w-5 h-5 flex items-center justify-center">
                            <Check className="h-3 w-3 text-[#FE2C55]" />
                        </div>
                    )}
                </div>

                {/* Like */}
                <button className="flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); handleInteraction('like'); }}>
                    <div className="rounded-full transition-transform active:scale-90">
                        <Heart className={cn("h-9 w-9 drop-shadow-md transition-all", liked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white fill-white/10")} />
                    </div>
                    <span className="text-xs font-semibold text-white drop-shadow-md">{likeCount}</span>
                </button>

                {/* Comments */}
                <CommentsSheet post={post} targetType={commentTargetType} onLoginRequest={onLoginRequest}>
                    <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <div className="rounded-full transition-transform active:scale-90">
                            <MessageCircle className="h-9 w-9 text-white fill-white/10 drop-shadow-md" />
                        </div>
                        <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement.comments}</span>
                    </button>
                </CommentsSheet>

                {/* Save */}
                <button className="flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); handleInteraction('save'); }}>
                    <div className="rounded-full transition-transform active:scale-90">
                        <Bookmark className={cn("h-9 w-9 drop-shadow-md transition-transform", saved ? "fill-yellow-400 text-yellow-400" : "text-white fill-white/10")} />
                    </div>
                    <span className="text-xs font-semibold text-white drop-shadow-md">{saved ? "Saved" : "Save"}</span>
                </button>

                {/* Share */}
                <ShareDialog postUrl={postUrl} postTitle={post.description}>
                    <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <div className="rounded-full transition-transform active:scale-90">
                            <Share2 className="h-9 w-9 text-white fill-white/10 drop-shadow-md" />
                        </div>
                        <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement.shares}</span>
                    </button>
                </ShareDialog>

                {/* Mute */}
                <button onClick={toggleMute} className="flex flex-col items-center gap-1">
                    <div className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors backdrop-blur-sm transition-transform active:scale-90">
                        {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                    </div>
                </button>

                {/* Spinning Disc */}
                <div className="mt-2 relative cursor-pointer" onClick={(e) => { e.stopPropagation(); handleUseSound(e); }}>
                    <div className={cn("h-10 w-10 rounded-full border-[6px] border-[#2F2F2F] bg-[#2F2F2F] flex items-center justify-center overflow-hidden", isPlaying && "animate-spin-slow")}>
                        <img src={audioTrack.cover} alt="Music" className="h-full w-full object-cover rounded-full" />
                    </div>
                </div>
            </div>{/* end controls */}

            </div>{/* end main row */}

            {/* DESKTOP CTA STRIP — appears when preview expires */}
            {previewExpired && post.isSubscriberOnly && !isMember && (
                <div className="hidden md:flex shrink-0 items-center gap-4 px-6 py-4 bg-zinc-900/95 border-t border-white/10 backdrop-blur-md">
                    {post.thumbnail && (
                        <img src={post.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 opacity-80" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{post.title || post.description?.slice(0, 70) || 'Exclusive Content'}</p>
                        <p className="text-white/40 text-xs mt-0.5">@{post.user.username} · Members only — subscribe to watch in full</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => setPreviewExpired(false)} className="text-white/40 hover:text-white/70 text-xs underline">
                            Rewatch preview
                        </button>
                        <Button onClick={handlePaywallCTA} className="bg-[#F0B94D] hover:bg-[#e0a83a] text-black font-bold h-10 px-5 rounded-xl text-sm">
                            Watch Full Video →
                        </Button>
                    </div>
                </div>
            )}

            <SubscriptionDialog
                isOpen={isSubscriptionDialogOpen}
                onOpenChange={setIsSubscriptionDialogOpen}
                creator={post.user}
                subscription={subscription}
                onConfirm={() => handleInteraction('subscribe-confirm')}
                isSubscribing={isSubscribeLoading}
            />

            <GiftDialog
                isOpen={isGiftDialogOpen}
                onOpenChange={setIsGiftDialogOpen}
                recipientId={post.user._id}
                recipientName={post.user.name}
                recipientUsername={post.user.username}
                targetType="reel"
                targetId={post._id}
            />

            <MintedCollectibleModal
                isOpen={isMintModalOpen}
                onClose={() => setIsMintModalOpen(false)}
                data={post.mintData}
            />

            {/* SUBSCRIBE TO WATCH MODAL */}
            {showSubscribeModal && (
                <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowSubscribeModal(false)}>
                    <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Video meta header */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/10">
                            {post.thumbnail && <img src={post.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover opacity-80 shrink-0" />}
                            <div className="min-w-0">
                                <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title || post.description?.slice(0, 80) || 'Exclusive Content'}</p>
                                <p className="text-white/40 text-xs mt-0.5">@{post.user.username}</p>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="h-5 w-5 text-[#F0B94D] shrink-0" />
                                <h3 className="text-white font-bold text-base">Members Only</h3>
                            </div>
                            <p className="text-white/60 text-sm leading-relaxed mb-5">
                                You've watched the 1-minute free preview. Subscribe to watch the full video and unlock all member content.
                            </p>
                            <Button
                                className="w-full bg-[#F0B94D] hover:bg-[#e0a83a] text-black font-bold h-12 text-base rounded-xl mb-3"
                                onClick={() => { setShowSubscribeModal(false); navigate('/subscribe'); }}
                            >
                                Become a Member
                            </Button>
                            <p className="text-center text-white/30 text-xs">
                                Already a member?{' '}
                                <button className="underline hover:text-white/60" onClick={() => { setShowSubscribeModal(false); onLoginRequest?.(); }}>
                                    Log in
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerticalVideo;
