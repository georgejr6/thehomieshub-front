import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, MessageCircle, Share2, Music, Play, Pause, Volume2, VolumeX,
    Bookmark, Plus, ShieldAlert, Lock, Eye, Check
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
import { Slider } from '@/components/ui/slider';
import MuxPlayer from '@mux/mux-player-react';

// Global mute state tracking outside component to persist across renders
let consecutiveMuteCount = 0;
let globalIsMuted = false;

const OVERLAY_HIDE_MS = 800;

const VerticalVideo = ({ post, index, isVisible, onLoginRequest }) => {
    const { user, isPremium, triggerLockedFeature } = useAuth();
    const { users, isPostLiked, togglePostLike, isPostSaved, togglePostSave,toggleContentLike } = useContent();
    const { toggleLike: toggleMediaLike, isLiked: isMediaLiked, isPlaying: musicIsPlaying } = useMedia();
    const { toast } = useToast();

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

    // Blur logic
    const [isUnlocked, setIsUnlocked] = useState(false);
    const isBlurred = (post.isSubscriberOnly && !isPremium) || (post.isNSFW && !isUnlocked);

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
  if (isBlurred) return;

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
        if (post.isSubscriberOnly && !isPremium) {
            triggerLockedFeature();
        } else if (post.isNSFW) {
            setIsUnlocked(true);
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
            setIsLikeLoading(true);
            await toggleContentLike({
  targetType: commentTargetType, // 'video' or 'reel'
  targetId: post.id,
});
const likeCount = post?.engagement?.likes ?? 0;
            setLikeCount(likeCount);
            setTimeout(() => setIsLikeLoading(false), 500);
        } else if (action === 'save') {
            if (isSaveLoading) return;
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
            className="h-[100svh] w-full relative flex items-center justify-center bg-black snap-start shrink-0 overflow-hidden"
        >
            {/* Blurred Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                    src={post.thumbnail}
                    className="w-full h-full object-cover blur-[100px] opacity-30 scale-150"
                    alt="Background"
                />
            </div>

            {/* VIDEO / MUX PLAYER */}
            <div onClick={togglePlayPause} className="relative z-10 w-full h-full max-h-[100svh] max-w-[100vw] flex items-center justify-center">
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
                        paused={!isPlaying}   // ✅ this is the key
                        className={cn(
                            "w-full h-full max-h-[100svh] max-w-[100vw] object-contain",
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
                            "w-full h-full max-h-[100svh] max-w-[100vw] object-contain",
                            isBlurred && "opacity-0"
                        )}
                        playsInline
                        disablePictureInPicture
                    />
                )}
            </div>

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
                            {/* ✅ Correct icons: Pause when playing, Play when paused */}
                            {isPlaying
                                ? <Pause className="h-10 w-10 text-white/90" fill="white" />
                                : <Play className="h-10 w-10 text-white/90" fill="white" />
                            }
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RIGHT SIDEBAR CONTROLS */}
            <div className="absolute bottom-20 right-2 z-40 flex flex-col items-center gap-6 w-[60px]">
                {/* Avatar Profile Link */}
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
                <button className="flex flex-col items-center gap-1 group/btn" onClick={(e) => { e.stopPropagation(); handleInteraction('like'); }}>
                    <div className="rounded-full transition-transform active:scale-90">
                        <Heart className={cn("h-9 w-9 drop-shadow-md transition-all", liked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white fill-white/10")} />
                    </div>
                    <span className="text-xs font-semibold text-white drop-shadow-md">{likeCount}</span>
                </button>

                {/* Comments */}
                <CommentsSheet post={post} targetType={commentTargetType} onLoginRequest={onLoginRequest}>
                    <button className="flex flex-col items-center gap-1 group/btn" onClick={(e) => e.stopPropagation()}>
                        <div className="rounded-full transition-transform active:scale-90">
                            <MessageCircle className="h-9 w-9 text-white fill-white/10 drop-shadow-md" />
                        </div>
                        <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement.comments}</span>
                    </button>
                </CommentsSheet>

                {/* Save */}
                <button className="flex flex-col items-center gap-1 group/btn" onClick={(e) => { e.stopPropagation(); handleInteraction('save'); }}>
                    <div className="rounded-full transition-transform active:scale-90">
                        <Bookmark className={cn("h-9 w-9 drop-shadow-md transition-transform", saved ? "fill-yellow-400 text-yellow-400" : "text-white fill-white/10")} />
                    </div>
                    <span className="text-xs font-semibold text-white drop-shadow-md">{saved ? "Saved" : "Save"}</span>
                </button>

                {/* Share */}
                <ShareDialog postUrl={postUrl} postTitle={post.description}>
                    <button className="flex flex-col items-center gap-1 group/btn" onClick={(e) => e.stopPropagation()}>
                        <div className="rounded-full transition-transform active:scale-90">
                            <Share2 className="h-9 w-9 text-white fill-white/10 drop-shadow-md" />
                        </div>
                        <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement.shares}</span>
                    </button>
                </ShareDialog>

                {/* Mute */}
                <button onClick={toggleMute} className="flex flex-col items-center gap-1 group/btn">
                    <div className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors backdrop-blur-sm rounded-full transition-transform active:scale-90">
                        {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                    </div>
                </button>

                {/* Spinning Disc */}
                <div className="mt-2 relative group/disc cursor-pointer" onClick={(e) => { e.stopPropagation(); handleUseSound(e); }}>
                    <div className={cn("h-10 w-10 rounded-full border-[6px] border-[#2F2F2F] bg-[#2F2F2F] flex items-center justify-center overflow-hidden", isPlaying && "animate-spin-slow")}>
                        <img src={audioTrack.cover} alt="Music" className="h-full h-full object-cover rounded-full" />
                    </div>
                </div>
            </div>

            {/* BOTTOM LEFT METADATA */}
            <div className="absolute bottom-6 left-0 right-16 p-4 z-40 pointer-events-none mb-1">
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
            <div className="absolute bottom-0 left-0 right-0 z-50 px-2 pb-2 pt-4 group hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-medium drop-shadow-md">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex-1"></div>
                    <span>{formatTime(duration)}</span>
                </div>

                <Slider
                    defaultValue={[0]}
                    value={[progress]}
                    max={100}
                    step={0.1}
                    className="cursor-pointer"
                    onValueChange={handleSeek}
                    onPointerDown={handleSeekStart}
                    onPointerUp={handleSeekEnd}
                />
            </div>

            {/* Locked/NSFW Overlay */}
            {isBlurred && (
                <div
                    className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center cursor-pointer backdrop-blur-md"
                    onClick={handleBlurClick}
                >
                    {post.isNSFW && (
                        <>
                            <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Sensitive Content</h2>
                            <Button variant="outline" className="mt-4 border-red-500 text-red-500 hover:bg-red-500/10">
                                <Eye className="mr-2 h-4 w-4" /> Reveal
                            </Button>
                        </>
                    )}
                    {!post.isNSFW && post.isSubscriberOnly && (
                        <>
                            <Lock className="h-16 w-16 text-yellow-500 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Subscriber Only</h2>
                            <Button className="mt-4 bg-[#FE2C55] text-white border-none hover:bg-[#FE2C55]/90">
                                Subscribe to Watch
                            </Button>
                        </>
                    )}
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
                recipientName={post.user.name}
            />

            <MintedCollectibleModal
                isOpen={isMintModalOpen}
                onClose={() => setIsMintModalOpen(false)}
                data={post.mintData}
            />
        </div>
    );
};

export default VerticalVideo;
