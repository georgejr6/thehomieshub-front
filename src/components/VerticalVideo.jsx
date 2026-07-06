import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, MessageCircle, Share2, Music, Play, Pause, Volume2, VolumeX,
    Bookmark, Plus, ShieldAlert, Lock, Eye, Check, Crown, MoreVertical, Trash2, EyeOff
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import api from '@/api/homieshub';
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
import MembershipUpgradeModal from '@/components/MembershipUpgradeModal';
import { useMedia } from '@/contexts/MediaContext';
import MuxPlayer from '@mux/mux-player-react';
import Watermark from '@/components/Watermark';
import { useNavigate } from 'react-router-dom';

// Global mute state tracking outside component to persist across renders
let consecutiveMuteCount = 0;
let globalIsMuted = false;

// Session-level window tracking: videoId → Set of 60-second bucket indices already played.
// Lives for the lifetime of the browser session (cleared on page refresh).
// Guarantees a user never sees the same 60-second window of a video twice in one session.
const sessionWindowMap = new Map();

function pickStartTime(postId, duration) {
  if (duration < 20) return 0; // Too short to slice — play from beginning

  const WINDOW = 60; // seconds per bucket
  const totalWindows = Math.max(1, Math.floor(duration / WINDOW));
  const seen = sessionWindowMap.get(postId) || new Set();

  // Prefer unseen windows; if all exhausted reset so content can recycle
  const all = Array.from({ length: totalWindows }, (_, i) => i);
  const unseen = all.filter(i => !seen.has(i));
  const pool = unseen.length > 0 ? unseen : (sessionWindowMap.set(postId, new Set()), all);

  const windowIdx = pool[Math.floor(Math.random() * pool.length)];

  // Mark this window as seen
  const updated = new Set(sessionWindowMap.get(postId));
  updated.add(windowIdx);
  sessionWindowMap.set(postId, updated);

  // Pick a random second inside the chosen window, leaving a 5s buffer at end
  const winStart = windowIdx * WINDOW;
  const winEnd   = Math.min(winStart + WINDOW, duration - 5);
  return winEnd > winStart
    ? winStart + Math.random() * (winEnd - winStart)
    : winStart;
}

const OVERLAY_HIDE_MS = 800;
const PREVIEW_LIMIT_SECONDS = 60;
const LONG_VIDEO_LIMIT = 180; // 3 minutes — nudge long-form to media mode

const VerticalVideo = ({ post, index, isVisible, onLoginRequest, startFraction }) => {
    const { user, isPremium, triggerLockedFeature } = useAuth();
    const { users, isPostLiked, togglePostLike, isPostSaved, togglePostSave, toggleContentLike, deletePost } = useContent();
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
    const [storiesOpen, setStoriesOpen] = useState(false);

    // play/pause overlay
    const [showPlayPause, setShowPlayPause] = useState(false);
    const overlayTimerRef = useRef(null);

    // Description Toggle
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    // Member access: subscription OR Discord member tag
    const isMember = isPremium || (user?.tags || []).includes('member');

    // Preview gate for subscriber content
    const [previewExpired, setPreviewExpired] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Track where playback started so gates are based on elapsed time, not absolute position
    const playbackStartRef = useRef(null);
    // Deferred play — set true when we're waiting for a seek to land before calling play()
    const pendingPlayRef = useRef(false);
    // Ref-copy of isVisible so event handlers inside the sync effect see the current value
    const isVisibleRef = useRef(isVisible);
    useEffect(() => { isVisibleRef.current = isVisible; }, [isVisible]);

    useEffect(() => {
      const open = () => setStoriesOpen(true);
      const close = () => setStoriesOpen(false);
      window.addEventListener('hh:stories:open', open);
      window.addEventListener('hh:stories:close', close);
      return () => {
        window.removeEventListener('hh:stories:open', open);
        window.removeEventListener('hh:stories:close', close);
      };
    }, []);

    // Long-video gate (>3 min) — nudge to media mode
    const [longVideoExpired, setLongVideoExpired] = useState(false);
    // True once we know this video is longer than 3 min (shows persistent media mode pill)
    const [isLongVideo, setIsLongVideo] = useState(false);

    // Blur logic — only NSFW gets immediate blur; subscriber content uses 60s preview gate
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [localIsNSFW, setLocalIsNSFW] = useState(post.isNSFW);
    const isBlurred = localIsNSFW && !isUnlocked;

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

    // Reset gates when scrolled away
    useEffect(() => {
        if (!isVisible) {
            setPreviewExpired(false);
            setLongVideoExpired(false);
            playbackStartRef.current = null;
            pendingPlayRef.current = false;
            // Reset currentTime so gate elapsed starts from 0 on return.
            // Without this, elapsed = currentTime - null(0) fires immediately
            // if the video had already played past the gate threshold.
            try { if (videoRef.current) videoRef.current.currentTime = 0; } catch (_) {}
        }
    }, [isVisible]);

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

    // Autoplay when visible, pause when not visible / music playing / stories open
useEffect(() => {
  if (!isVisible || isBlurred || musicIsPlaying || storiesOpen) {
    pendingPlayRef.current = false;
    try { videoRef.current?.pause?.(); } catch (_) {}
    setIsPlaying(false);
    return;
  }

  const el = videoRef.current;
  if (!el) { setIsPlaying(true); return; }

  const p = el.play?.();
  if (p instanceof Promise) {
    p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  } else {
    setIsPlaying(true);
  }
}, [isVisible, isBlurred, isMux, musicIsPlaying, storiesOpen]);

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
            // Gate checks use elapsed time from where playback started, not absolute position
            const start = playbackStartRef.current ?? 0;
            const elapsed = video.currentTime - start;
            // 60-second preview gate for subscriber content (non-members)
            if (post.isSubscriberOnly && !isMember && elapsed >= PREVIEW_LIMIT_SECONDS) {
                video.pause?.();
                setIsPlaying(false);
                setPreviewExpired(true);
                return;
            }
            // 3-minute gate — nudge anonymous visitors to media mode (logged-in users watch freely)
            if (!user && video.duration > LONG_VIDEO_LIMIT && elapsed >= LONG_VIDEO_LIMIT) {
                video.pause?.();
                setIsPlaying(false);
                setLongVideoExpired(true);
            }
        };

        const handleLoadedMetadata = () => {
            const d = video.duration || 0;
            setDuration(d);
            if (d > LONG_VIDEO_LIMIT) setIsLongVideo(true);
            // Only seek to a random start point when this video is the visible one.
            // Seeking on a non-visible HLS stream wastes a segment fetch and stalls buffering.
            if (!isVisibleRef.current) return;
            const start = pickStartTime(post.id, d);
            playbackStartRef.current = start;
            if (start > 0) {
                // Seeking to a non-zero position on an HLS stream pauses internal buffering.
                // handleSeeked will call play() again once the seek has landed.
                video.currentTime = start;
            }
        };

        // HLS seek interrupts playback — resume as soon as the seek lands.
        const handleSeeked = () => {
            if (isVisibleRef.current) {
                video.play?.().then(() => setIsPlaying(true)).catch(() => {});
            }
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [post.isNSFW, isDragging, isMember, post.isSubscriberOnly, startFraction, !!user]);

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
  if (isBlurred || previewExpired || longVideoExpired) return;

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

    // Owner: delete own post
    const isOwnPost = user && (user._id === post.user._id || user.username === post.user.username);

    const handleOwnerDelete = async (e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this video? This cannot be undone.')) return;
        try {
            const endpoint = post.backendType === 'video'
                ? `/user/videos/${post.id}`
                : `/user/reels/${post.id}`;
            await api.delete(endpoint);
            deletePost(post.id);
            toast({ title: 'Deleted', description: 'Your video has been removed.' });
        } catch {
            toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
        }
    };

    const handleOwnerHide = async (e) => {
        e.stopPropagation();
        try {
            const endpoint = post.backendType === 'video'
                ? `/user/videos/${post.id}/visibility`
                : `/user/reels/${post.id}/visibility`;
            await api.patch(endpoint, { visibility: 'private' });
            deletePost(post.id);
            toast({ title: 'Hidden', description: 'Video set to private.' });
        } catch {
            toast({ title: 'Error', description: 'Failed to hide.', variant: 'destructive' });
        }
    };

    // Admin: delete or hide a vertical video
    const handleAdminDelete = async (e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete "${post.title || post.description?.slice(0,40) || 'this video'}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/admin/videos/${post.id}`, {
                params: { collectionType: commentTargetType },
            });
            deletePost(post.id);
            toast({ title: 'Deleted', description: 'Video removed.' });
        } catch {
            toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
        }
    };

    const handleAdminHide = async (e) => {
        e.stopPropagation();
        try {
            await api.patch(`/admin/videos/${post.id}`, {
                visibility: 'private',
                _collectionType: commentTargetType,
            });
            deletePost(post.id); // remove from local feed
            toast({ title: 'Hidden', description: 'Video set to private.' });
        } catch {
            toast({ title: 'Error', description: 'Failed to hide.', variant: 'destructive' });
        }
    };

    const handleAdminToggleNSFW = async (e) => {
        e.stopPropagation();
        const next = !localIsNSFW;
        setLocalIsNSFW(next);
        if (next) setIsUnlocked(false); // re-blur immediately
        try {
            await api.patch(`/admin/videos/${post.id}`, {
                isNSFW: next,
                _collectionType: commentTargetType,
            });
            toast({ title: next ? 'Marked as NSFW' : 'NSFW removed' });
        } catch {
            setLocalIsNSFW(!next); // revert
            toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
        }
    };

    // Unified handler for all "watch full / open media mode" CTAs
    const handleMediaMode = () => {
        if (!user) { onLoginRequest?.(); return; }
        if (post.isSubscriberOnly && !isMember) { setShowUpgradeModal(true); return; }
        navigate(`/media/${post.id}`, { state: { post } });
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
            {/* ── MAIN ROW: video + side controls ──────────────────────────── */}
            <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">

                {/* VIDEO AREA */}
                <div
                    className="relative h-full flex-1 min-w-0 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={togglePlayPause}
                >
                    <Watermark />
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
                            preload={isVisible ? "auto" : "none"}
                            className={cn("w-full h-full object-contain", isBlurred && "opacity-0")}
                            style={{ width: "100%", height: "100%" }}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={post.videoUrl}
                            loop
                            muted={isMuted}
                            className={cn("w-full h-full object-contain", isBlurred && "opacity-0")}
                            playsInline
                            disablePictureInPicture
                            preload={isVisible ? "auto" : "none"}
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

                    {/* SUBSCRIBER PAYWALL OVERLAY */}
                    {previewExpired && post.isSubscriberOnly && !isMember && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-black/85 backdrop-blur-sm">
                            <div className="mb-5">
                                {post.thumbnail && <img src={post.thumbnail} alt="" className="w-20 h-20 rounded-xl object-cover mx-auto mb-3 opacity-70" />}
                                <p className="text-[#F0B94D] text-xs font-semibold uppercase tracking-widest mb-1">Members Only</p>
                                <h3 className="text-white font-bold text-base leading-snug line-clamp-2">{post.title || post.description?.slice(0, 60) || 'Exclusive Content'}</h3>
                                <p className="text-white/50 text-xs mt-1">@{post.user.username}</p>
                            </div>
                            <p className="text-white/70 text-sm mb-5 leading-relaxed">
                                You've watched the free preview.<br/>
                                {user ? 'Become a member to watch in full.' : 'Become a member or log in to watch in full.'}
                            </p>
                            <Button onClick={user ? handleMediaMode : onLoginRequest} className="bg-[#F0B94D] hover:bg-[#e0a83a] text-black font-bold w-full max-w-[260px] h-12 text-base rounded-xl">
                                {user ? 'Become a Member' : 'Log In / Sign Up'}
                            </Button>
                            <p className="text-white/30 text-xs mt-4">or <button onClick={() => {
                                const video = videoRef.current;
                                if (video && playbackStartRef.current != null) {
                                    video.currentTime = playbackStartRef.current;
                                    video.play?.();
                                    setIsPlaying(true);
                                }
                                setPreviewExpired(false);
                            }} className="underline hover:text-white/60">rewatch preview</button></p>
                        </div>
                    )}

                    {/* LONG VIDEO OVERLAY */}
                    {longVideoExpired && !previewExpired && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-black/85 backdrop-blur-sm">
                            <div className="mb-5">
                                {post.thumbnail && <img src={post.thumbnail} alt="" className="w-20 h-20 rounded-xl object-cover mx-auto mb-3 opacity-70" />}
                                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Long Video</p>
                                <h3 className="text-white font-bold text-base leading-snug line-clamp-2">{post.title || post.description?.slice(0, 60) || 'Full Video'}</h3>
                            </div>
                            <p className="text-white/70 text-sm mb-5 leading-relaxed">Continue watching in Media Mode<br/>for the full experience.</p>
                            <Button onClick={handleMediaMode} className="bg-white hover:bg-white/90 text-black font-bold w-full max-w-[260px] h-12 text-base rounded-xl">
                                Open in Media Mode
                            </Button>
                            <p className="text-white/30 text-xs mt-4">or <button onClick={() => {
                                // Reset elapsed so the gate doesn't immediately re-trigger
                                playbackStartRef.current = videoRef.current?.currentTime ?? 0;
                                setLongVideoExpired(false);
                                videoRef.current?.play?.().catch(() => {});
                                setIsPlaying(true);
                            }} className="underline hover:text-white/60">keep watching here</button></p>
                        </div>
                    )}

                </div>{/* end video area */}

                {/* SIDE CONTROLS — absolute on mobile, relative column on desktop */}
                <div className="absolute bottom-4 right-2 md:relative md:bottom-auto md:right-auto z-40 flex flex-col items-center gap-5 w-[60px] md:w-[72px] md:self-end md:pb-4 md:shrink-0">

                    <div className="relative mb-1">
                        <Link to={`/profile/${post.user.username}`} onClick={(e) => e.stopPropagation()}>
                            <Avatar className="h-12 w-12 border border-white/50 cursor-pointer hover:scale-105 transition-transform">
                                <AvatarImage src={post.user.avatar} alt={post.user.name} />
                                <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Link>
                        {!isFollowing ? (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FE2C55] rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInteraction('follow'); }}>
                                <Plus className="h-3 w-3 text-white font-bold" />
                            </div>
                        ) : (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full w-5 h-5 flex items-center justify-center">
                                <Check className="h-3 w-3 text-[#FE2C55]" />
                            </div>
                        )}
                    </div>

                    <button className="flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); handleInteraction('like'); }}>
                        <Heart className={cn("h-9 w-9 drop-shadow-md transition-all", liked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white fill-white/10")} />
                        <span className="text-xs font-semibold text-white drop-shadow-md">{likeCount}</span>
                    </button>

                    <CommentsSheet post={post} targetType={commentTargetType} onLoginRequest={onLoginRequest}>
                        <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <MessageCircle className="h-9 w-9 text-white fill-white/10 drop-shadow-md" />
                            <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement.comments}</span>
                        </button>
                    </CommentsSheet>

                    <button className="flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); handleInteraction('save'); }}>
                        <Bookmark className={cn("h-9 w-9 drop-shadow-md", saved ? "fill-yellow-400 text-yellow-400" : "text-white fill-white/10")} />
                        <span className="text-xs font-semibold text-white drop-shadow-md">{saved ? "Saved" : "Save"}</span>
                    </button>

                    <ShareDialog postUrl={postUrl} postTitle={post.description} post={post}>
                        <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Share2 className="h-9 w-9 text-white fill-white/10 drop-shadow-md" />
                            <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement.shares}</span>
                        </button>
                    </ShareDialog>

                    <button onClick={toggleMute} className="flex flex-col items-center gap-1">
                        <div className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors backdrop-blur-sm">
                            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                        </div>
                    </button>

                    <div className="mt-1 relative cursor-pointer" onClick={(e) => { e.stopPropagation(); handleUseSound(e); }}>
                        <div className={cn("h-10 w-10 rounded-full border-[6px] border-[#2F2F2F] bg-[#2F2F2F] flex items-center justify-center overflow-hidden", isPlaying && "animate-spin-slow")}>
                            <img src={audioTrack.cover} alt="Music" className="h-full w-full object-cover rounded-full" />
                        </div>
                    </div>

                    {/* Owner / Admin moderation — at the bottom so it's out of the way */}
                    {(user?.isAdmin || isOwnPost) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-6 w-6 text-white/60 drop-shadow-md" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="top" className="z-[200]">
                                {isOwnPost && !user?.isAdmin && (
                                    <>
                                        <DropdownMenuItem onClick={handleOwnerHide}>
                                            <EyeOff className="mr-2 h-4 w-4" /> Make Private
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleOwnerDelete}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete My Video
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {user?.isAdmin && (
                                    <>
                                        <DropdownMenuItem onClick={handleAdminHide}>
                                            <EyeOff className="mr-2 h-4 w-4" /> Make Private
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleAdminToggleNSFW}>
                                            <ShieldAlert className="mr-2 h-4 w-4" />
                                            {localIsNSFW ? 'Remove NSFW' : 'Mark as NSFW / Blur'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleAdminDelete}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Video
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                </div>{/* end side controls */}

            </div>{/* end main row */}

            {/* ── BOTTOM CHROME — always in view ───────────────────────────── */}
            <div className="shrink-0 px-4 pt-2 pb-3 pr-[76px] md:pr-[88px]">

                {/* Username row + Full video pill */}
                <div className="flex items-center justify-between gap-2 mb-1">
                    <Link
                        to={`/profile/${post.user.username}`}
                        className="font-bold text-white text-[17px] drop-shadow-md hover:underline truncate"
                        onClick={e => e.stopPropagation()}
                    >
                        @{post.user.username}
                    </Link>
                    {isLongVideo && !longVideoExpired && !previewExpired && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleMediaMode(); }}
                            className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm"
                        >
                            <Play className="h-3 w-3 fill-white" />
                            Full video
                        </button>
                    )}
                </div>

                {/* Description */}
                {post.description && (
                    <div className="text-white/80 text-sm leading-snug mb-1.5">
                        <span className="break-words">
                            {isDescExpanded ? post.description : post.description.substring(0, 90) + (post.description.length > 90 ? '…' : '')}
                        </span>
                        {post.description.length > 90 && (
                            <button onClick={(e) => { e.stopPropagation(); setIsDescExpanded(!isDescExpanded); }} className="font-semibold text-white/50 hover:text-white ml-1 text-xs">
                                {isDescExpanded ? "less" : "more"}
                            </button>
                        )}
                    </div>
                )}

                {/* Music ticker */}
                {audioTrack && (
                    <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={handleUseSound}>
                        <Music className="h-3.5 w-3.5 text-white shrink-0" />
                        <div className="overflow-hidden w-[180px] h-4 relative">
                            <div className="whitespace-nowrap text-xs text-white/80 font-medium animate-marquee absolute top-0 left-0">
                                {audioTrack.title} • {audioTrack.artist} &nbsp;&nbsp;&nbsp; {audioTrack.title} • {audioTrack.artist}
                            </div>
                        </div>
                    </div>
                )}

                {/* Seeker bar */}
                <div className="group pt-1">
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-white/50 font-medium">
                        <span>{formatTime(currentTime)}</span>
                        <div className="flex-1" />
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
                        <div className="absolute left-0 top-0 h-full rounded-full bg-yellow-400" style={{ width: `${progress}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5" style={{ left: `${progress}%` }} />
                    </div>
                </div>

            </div>{/* end bottom chrome */}

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

            <MembershipUpgradeModal
                open={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                post={post}
            />
        </div>
    );
};

export default VerticalVideo;
