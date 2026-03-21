import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ThumbsUp, Share2, Info,
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Maximize, Minimize,
} from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import { useMedia } from '@/contexts/MediaContext';
import { cn } from '@/lib/utils';

function fmt(s) {
  if (!s || isNaN(s) || s === 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

const VideoPlayer = () => {
  const { currentVideo, closeVideo, isLiked, toggleLike } = useMedia();

  const muxRef       = useRef(null);
  const containerRef = useRef(null);
  const hideTimer    = useRef(null);
  const mediaRef     = useRef(null); // cached HTMLVideoElement

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [volume,       setVolume]       = useState(1);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [buffered,     setBuffered]     = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo,     setShowInfo]     = useState(false);
  const [isScrubbing,  setIsScrubbing]  = useState(false);

  // Resolve the underlying <video> element from mux-player
  const getMedia = useCallback(() => {
    if (mediaRef.current) return mediaRef.current;
    const el = muxRef.current;
    if (!el) return null;
    // mux-player-react v3 exposes nativeEl, or fall back to querySelector
    const video = el.nativeEl || el.media?.nativeEl || el.querySelector?.('video')
      || el.shadowRoot?.querySelector('video');
    if (video) mediaRef.current = video;
    return video || null;
  }, []);

  // Bind events after mux player mounts
  useEffect(() => {
    mediaRef.current = null; // reset on new video
    let cleanup = () => {};

    const tryBind = () => {
      const m = getMedia();
      if (!m) return;

      const onPlay    = () => setIsPlaying(true);
      const onPause   = () => setIsPlaying(false);
      const onTime    = () => {
        if (!isScrubbing) setCurrentTime(m.currentTime);
        if (m.buffered.length) setBuffered(m.buffered.end(m.buffered.length - 1));
      };
      const onDur     = () => { if (!isNaN(m.duration)) setDuration(m.duration); };
      const onVol     = () => { setVolume(m.volume); setIsMuted(m.muted); };
      const onFs      = () => setIsFullscreen(!!document.fullscreenElement);

      m.addEventListener('play',           onPlay);
      m.addEventListener('pause',          onPause);
      m.addEventListener('timeupdate',     onTime);
      m.addEventListener('durationchange', onDur);
      m.addEventListener('volumechange',   onVol);
      document.addEventListener('fullscreenchange', onFs);

      cleanup = () => {
        m.removeEventListener('play',           onPlay);
        m.removeEventListener('pause',          onPause);
        m.removeEventListener('timeupdate',     onTime);
        m.removeEventListener('durationchange', onDur);
        m.removeEventListener('volumechange',   onVol);
        document.removeEventListener('fullscreenchange', onFs);
      };
    };

    const t = setTimeout(tryBind, 600);
    return () => { clearTimeout(t); cleanup(); };
  }, [currentVideo]); // eslint-disable-line

  // Auto-hide controls
  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const hideNow = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowControls(false);
  }, []);

  useEffect(() => {
    resetHide();
    return () => clearTimeout(hideTimer.current);
  }, [isPlaying, resetHide]);

  // ── Control handlers ──────────────────────────────────────────────────────
  const togglePlay = useCallback((e) => {
    e?.stopPropagation();
    const m = getMedia();
    if (!m) return;
    m.paused ? m.play().catch(() => {}) : m.pause();
  }, [getMedia]);

  const skip = useCallback((e, secs) => {
    e.stopPropagation();
    const m = getMedia();
    if (!m) return;
    m.currentTime = Math.max(0, Math.min(m.duration || 0, m.currentTime + secs));
  }, [getMedia]);

  const handleScrubChange = (e) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    const m = getMedia();
    if (m) m.currentTime = val;
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const m = getMedia();
    if (!m) return;
    m.muted = !m.muted;
  };

  const handleVolume = (e) => {
    e.stopPropagation();
    const val = Number(e.target.value);
    const m = getMedia();
    if (m) { m.volume = val; m.muted = val === 0; }
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `https://digitvl.app/browse/${currentVideo.id}`;
    if (navigator.share) navigator.share({ title: currentVideo.title, url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  };

  const progress    = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered  / duration) * 100 : 0;

  if (!currentVideo) return null;

  return (
    <motion.div
      ref={containerRef}
      key="video-player"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black"
      onMouseMove={resetHide}
      onMouseLeave={hideNow}
      onTouchStart={resetHide}
    >
      {/* ── MuxPlayer — pointer-events disabled so our overlay owns all clicks ── */}
      {currentVideo.muxPlaybackId ? (
        <MuxPlayer
          ref={muxRef}
          playbackId={currentVideo.muxPlaybackId}
          streamType="on-demand"
          autoPlay
          className="absolute inset-0 w-full h-full"
          style={{
            pointerEvents: 'none',
            '--controls': 'none',
            '--media-object-fit': 'contain',
            background: 'black',
          }}
          metadata={{ video_id: currentVideo.id, video_title: currentVideo.title }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <X className="w-12 h-12 text-zinc-700" />
          <p className="text-lg">Video not available</p>
        </div>
      )}

      {/* ── Controls overlay — always on top, owns all pointer events ─────── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            key="controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 flex flex-col"
          >
            {/* TOP BAR */}
            <div className="flex items-center justify-between px-4 md:px-8 pt-4 pb-20
                            bg-gradient-to-b from-black/80 to-transparent">
              <button
                onClick={(e) => { e.stopPropagation(); closeVideo(); }}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
                <span className="text-sm font-semibold hidden md:inline line-clamp-1 max-w-xs">
                  {currentVideo.title}
                </span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(currentVideo); }}
                  className={cn('p-2 rounded-full transition-colors',
                    isLiked(currentVideo.id) ? 'text-red-500' : 'text-white/70 hover:text-white')}
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button onClick={handleShare} className="p-2 text-white/70 hover:text-white transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
                  className={cn('p-2 rounded-full transition-colors',
                    showInfo ? 'text-white' : 'text-white/70 hover:text-white')}
                >
                  <Info className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); closeVideo(); }}
                  className="p-2 text-white/70 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MIDDLE — transparent passthrough except the 3 center buttons */}
            <div
              className="flex-1 flex items-center justify-center gap-12"
              onClick={togglePlay}  /* clicking the empty area toggles play */
            >
              <button
                onClick={(e) => skip(e, -10)}
                className="text-white/80 hover:text-white hover:scale-110 transition-all active:scale-95"
              >
                <RotateCcw className="w-9 h-9" />
                <span className="block text-[10px] text-center mt-0.5 font-bold">10</span>
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-sm
                           flex items-center justify-center text-white border border-white/30
                           transition-all hover:scale-110 active:scale-95"
              >
                {isPlaying
                  ? <Pause className="w-8 h-8 fill-white" />
                  : <Play  className="w-8 h-8 fill-white ml-1" />}
              </button>

              <button
                onClick={(e) => skip(e, 10)}
                className="text-white/80 hover:text-white hover:scale-110 transition-all active:scale-95"
              >
                <RotateCw className="w-9 h-9" />
                <span className="block text-[10px] text-center mt-0.5 font-bold">10</span>
              </button>
            </div>

            {/* BOTTOM BAR */}
            <div className="px-4 md:px-8 pb-6 pt-16 bg-gradient-to-t from-black/90 to-transparent">
              {/* Scrubber */}
              <div
                className="relative w-full h-4 mb-3 flex items-center group/scrub cursor-pointer"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/20 rounded-full" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white/30 rounded-full"
                  style={{ width: `${bufferedPct}%` }} />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-red-600 rounded-full"
                  style={{ width: `${progress}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg
                                opacity-0 group-hover/scrub:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${progress}% - 6px)` }} />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleScrubChange}
                  onMouseDown={(e) => { e.stopPropagation(); setIsScrubbing(true); }}
                  onMouseUp={(e)   => { e.stopPropagation(); setIsScrubbing(false); }}
                  onTouchStart={(e) => { e.stopPropagation(); setIsScrubbing(true); }}
                  onTouchEnd={(e)   => { e.stopPropagation(); setIsScrubbing(false); }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={togglePlay} className="text-white hover:text-white/80 active:scale-95 transition-all">
                    {isPlaying
                      ? <Pause className="w-5 h-5 fill-white" />
                      : <Play  className="w-5 h-5 fill-white" />}
                  </button>
                  <button onClick={(e) => skip(e, -10)} className="text-white hover:text-white/80 active:scale-95 transition-all hidden md:block">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => skip(e, 10)} className="text-white hover:text-white/80 active:scale-95 transition-all hidden md:block">
                    <RotateCw className="w-5 h-5" />
                  </button>

                  {/* Volume */}
                  <div
                    className="flex items-center gap-2 group/vol"
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
                      {isMuted || volume === 0
                        ? <VolumeX className="w-5 h-5" />
                        : <Volume2 className="w-5 h-5" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolume}
                        className="w-20 h-1 accent-white cursor-pointer"
                      />
                    </div>
                  </div>

                  <span className="text-white text-sm font-medium tabular-nums select-none">
                    {fmt(currentTime)}
                    {duration > 0 && <span className="text-white/50"> / {fmt(duration)}</span>}
                  </span>
                </div>

                <button onClick={toggleFullscreen} className="text-white hover:text-white/80 active:scale-95 transition-all">
                  {isFullscreen
                    ? <Minimize className="w-5 h-5" />
                    : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap anywhere (when controls hidden) to reveal them */}
      {!showControls && (
        <div className="absolute inset-0 z-10 cursor-pointer" onClick={resetHide} />
      )}

      {/* ── Info panel ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-zinc-950/95 backdrop-blur-md
                       p-6 rounded-t-2xl max-h-[55vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              {currentVideo.cover && (
                <img src={currentVideo.cover} className="w-28 h-16 object-cover rounded-md flex-shrink-0" alt="" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-white text-xl font-bold">{currentVideo.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-sm">
                  {currentVideo.year && <span className="text-zinc-400">{currentVideo.year}</span>}
                  {currentVideo.rating && (
                    <span className="border border-zinc-600 text-zinc-400 text-xs px-1.5 py-0.5 rounded">
                      {currentVideo.rating}
                    </span>
                  )}
                  {duration > 0 && <span className="text-zinc-400">{fmt(duration)}</span>}
                </div>
                {currentVideo.genres?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {currentVideo.genres.map(g => (
                      <span key={g} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{g}</span>
                    ))}
                  </div>
                )}
                {currentVideo.description && (
                  <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{currentVideo.description}</p>
                )}
                {currentVideo.director && (
                  <p className="text-zinc-500 text-xs mt-2">
                    Director: <span className="text-zinc-300">{currentVideo.director}</span>
                  </p>
                )}
                {currentVideo.cast?.length > 0 && (
                  <p className="text-zinc-500 text-xs mt-1">
                    Cast: <span className="text-zinc-300">{currentVideo.cast.slice(0,5).join(', ')}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;
