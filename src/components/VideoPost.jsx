import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import MuxPlayer from '@mux/mux-player-react';
import { useMedia } from '@/contexts/MediaContext';

const VideoPost = ({ post }) => {
  const { username } = useParams();
  const navigate = useNavigate();

  const { isPremium, triggerLockedFeature } = useAuth();
  const { isPlaying: musicIsPlaying } = useMedia();

  const playerRef = useRef(null);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Blur Logic
  const isBlurred = (post.isSubscriberOnly && !isPremium) || (post.isNSFW && !isUnlocked);

  const playbackId = post?.muxPlaybackId || post?.videoUrl || null;
  const isMux = !!playbackId && typeof playbackId === 'string' && playbackId.length > 10;
  const muxPoster = isMux ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1` : null;

  // Pause video when music player is active
  useEffect(() => {
    if (musicIsPlaying) {
      const media = getMediaEl();
      if (media && !media.paused) {
        media.pause();
        setIsPlaying(false);
      }
    }
  }, [musicIsPlaying]); // eslint-disable-line

  // ✅ Always use the real HTMLMediaElement for controls/events
  const getMediaEl = () => {
    const el = playerRef.current;
    if (!el) return null;
    // mux-player exposes the underlying media element on `.media`
    if (isMux && el.media) return el.media;
    return el; // native <video>
  };

  useEffect(() => {
    const media = getMediaEl();
    if (!media) return;

    const handleTimeUpdate = () => {
      if (!isDragging && media.duration > 0) {
        setProgress((media.currentTime / media.duration) * 100);
        setCurrentTime(media.currentTime);
        setDuration(media.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (media.duration) setDuration(media.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('ended', handleEnded);
    };
  }, [isDragging, isMux]);

  const handleBlurClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (post.isSubscriberOnly && !isPremium) {
      triggerLockedFeature();
    } else if (post.isNSFW) {
      setIsUnlocked(true);
    }
  };

  const togglePlay = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBlurred) return;

    const media = getMediaEl();
    if (!media) return;

    try {
      if (isPlaying) {
        media.pause();
        setIsPlaying(false);
      } else {
        await media.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('play failed:', err);
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBlurred) return;

    const media = getMediaEl();
    if (!media) return;

    const nextMuted = !isMuted;

    // ✅ set both state + media element
    media.muted = nextMuted;

    // ✅ if unmuting, make sure volume is audible
    if (!nextMuted) {
      try {
        if (typeof media.volume === 'number') media.volume = 1;
      } catch (_) {}
    }

    setIsMuted(nextMuted);
  };

  const handleSeek = (value) => {
    const media = getMediaEl();
    if (!media || !duration) return;

    const newTime = (value[0] / 100) * duration;
    setCurrentTime(newTime);
    setProgress(value[0]);

    media.currentTime = newTime;
  };

  const handleSeekStart = () => {
    setIsDragging(true);
    const media = getMediaEl();
    if (media) media.pause();
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
    const media = getMediaEl();
    if (media && isPlaying) {
      media.play().catch(console.error);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleOpenWatch = (p) => {
    const postId = p._id || p.id;
    if (!postId) return;
    if (isBlurred) return;
    navigate(`/watch/${postId}`, { state: { username } });
  };

  // ⚠️ Your thumbnails still use unsplash fallback — leaving it as-is since you didn’t ask here.
  const imageSrcs = useMemo(
    () => [
      'https://images.unsplash.com/photo-1504983875-d3b163aba9e6',
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963',
      'https://images.unsplash.com/photo-1533105079780-52b9be462077',
      'https://images.unsplash.com/photo-1542051841857-5f90071e7989',
      'https://images.unsplash.com/photo-1588665396287-209a3d1321b1',
      'https://images.unsplash.com/photo-1579033461380-adb47c3eb938',
      'https://images.unsplash.com/photo-1502602898657-3e91760c0337',
      'https://images.unsplash.com/photo-1500930287093-354a74653457',
    ],
    []
  );

  const thumbnail = post.thumbnail || imageSrcs[(post.id || 0) % imageSrcs.length];

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <motion.div
        className="group cursor-pointer"
        onClick={() => handleOpenWatch(post)}
        whileHover={!isBlurred ? { y: -5, transition: { duration: 0.2 } } : {}}
      >
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-black shadow-md">
          <div className={`w-full h-full ${isBlurred ? 'filter blur-[20px] opacity-50 transition-all duration-300' : ''}`}>
            {isMux ? (
              <MuxPlayer
                ref={playerRef}
                playbackId={playbackId}
                streamType="on-demand"
                poster={muxPoster || thumbnail}
                className="w-full h-full object-contain object-center"
                muted={isMuted}
                loop
                playsInline
                autoPlay={false}
                controls={false}
              />
            ) : (
              <video
                ref={playerRef}
                src={post.videoUrl}
                poster={thumbnail}
                className="w-full h-full object-contain object-center"
                muted={isMuted}
                playsInline
                loop
              />
            )}
          </div>

          {!isBlurred && (
            <div
              className={cn(
                'absolute inset-0 z-20 flex flex-col justify-end transition-opacity duration-300 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none',
                isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" onClick={togglePlay}>
                {!isPlaying && (
                  <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                )}
              </div>

              <div className="p-3 w-full pointer-events-auto flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="w-full group/slider">
                  <Slider
                    value={[progress]}
                    max={100}
                    step={0.1}
                    onValueChange={handleSeek}
                    onPointerDown={handleSeekStart}
                    onPointerUp={handleSeekEnd}
                    className="cursor-pointer h-2"
                  />
                </div>

                <div className="flex items-center justify-between text-white text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="hover:text-primary transition-colors">
                      {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                    </button>
                    <span>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <button onClick={toggleMute} className="hover:text-primary transition-colors">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isBlurred && (
            <div
              className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center p-4 text-center cursor-pointer"
              onClick={handleBlurClick}
            >
              {post.isNSFW && (
                <>
                  <ShieldAlert className="h-8 w-8 text-red-500 mb-2" />
                  <p className="text-white font-bold text-sm">NSFW Content</p>
                  <p className="text-xs text-zinc-400 mt-1 mb-2">Tap to reveal</p>
                </>
              )}
              {!post.isNSFW && post.isSubscriberOnly && (
                <>
                  <Lock className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-white font-bold text-sm">Subscriber Only</p>
                  <p className="text-xs text-zinc-400 mt-1">Unlock this video</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start space-x-3">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={`https://avatar.vercel.sh/${(post?.creator?.name || 'user').replace(' ', '')}.png`}
              alt={post?.creator?.name || 'User'}
            />
            <AvatarFallback>{(post?.creator?.name || 'U').charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{post.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{post?.creator?.name || 'User'}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>{post.views || 0} views</span>
              <span className="mx-1.5 font-bold">·</span>
              <span>{post.timestamp || 'Just now'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoPost;
