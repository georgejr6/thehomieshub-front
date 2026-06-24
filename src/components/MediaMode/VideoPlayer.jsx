import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ThumbsUp, Share2, Info, Pencil,
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Maximize, Minimize,
} from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import { useMedia } from '@/contexts/MediaContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import EditVideoModal from './EditVideoModal';
import api from '@/api/homieshub';

function fmt(s) {
  if (!s || isNaN(s) || s === 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

// Parse a WebVTT string into clickable cues: [{ t: seconds, text }]
function vttToSec(ts) {
  const [hh, mm, ss] = ts.trim().split(':');
  if (ss === undefined) return (+hh) * 60 + parseFloat(mm); // mm:ss form
  return (+hh) * 3600 + (+mm) * 60 + parseFloat(ss);
}
function parseVtt(vtt) {
  if (!vtt) return [];
  const cues = [];
  for (const block of vtt.replace(/\r/g, '').split('\n\n')) {
    const lines = block.split('\n').filter(Boolean);
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;
    const start = timeLine.split('-->')[0].trim();
    const text = lines.slice(lines.indexOf(timeLine) + 1).join(' ').trim();
    if (text) cues.push({ t: vttToSec(start), text });
  }
  return cues;
}

const VideoPlayer = () => {
  const { currentVideo, closeVideo, isLiked, toggleLike } = useMedia();
  const { user } = useAuth();

  const muxRef       = useRef(null);
  const containerRef = useRef(null);
  const hideTimer    = useRef(null);

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
  const [mediaError,   setMediaError]   = useState(false);
  // Visual flash for skip feedback
  const [skipFlash,    setSkipFlash]    = useState(null); // 'back' | 'fwd' | null

  // Admin edit
  const [showEdit,      setShowEdit]      = useState(false);
  const [editCategories, setEditCategories] = useState([]);

  // Transcript + AI summary (Media Mode). Loaded on demand from the backend.
  const [transcript,       setTranscript]       = useState(null); // { summary, text, vtt, ... }
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [showTranscript,   setShowTranscript]   = useState(false);

  const transcriptCues = React.useMemo(() => parseVtt(transcript?.vtt), [transcript]);

  const seekTo = useCallback((t) => {
    const el = muxRef.current;
    if (!el || isNaN(t)) return;
    el.currentTime = t;
    el.play?.();
  }, []);

  // ── Bind media events directly on the <mux-player> element ──────────────
  // mux-player is a custom element that proxies all standard HTMLMediaElement
  // events (play, pause, timeupdate, durationchange, volumechange) so we
  // don't need to drill into the shadow DOM to find the inner <video>.
  useEffect(() => {
    const el = muxRef.current;
    if (!el) return;

    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime  = () => {
      if (!isScrubbing) setCurrentTime(el.currentTime ?? 0);
      if (el.buffered?.length) setBuffered(el.buffered.end(el.buffered.length - 1));
    };
    const onDur = () => { if (!isNaN(el.duration)) setDuration(el.duration); };
    const onVol = () => { setVolume(el.volume ?? 1); setIsMuted(el.muted ?? false); };
    const onFs  = () => setIsFullscreen(!!document.fullscreenElement);

    el.addEventListener('play',           onPlay);
    el.addEventListener('pause',          onPause);
    el.addEventListener('timeupdate',     onTime);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('volumechange',   onVol);
    document.addEventListener('fullscreenchange', onFs);

    return () => {
      el.removeEventListener('play',           onPlay);
      el.removeEventListener('pause',          onPause);
      el.removeEventListener('timeupdate',     onTime);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('volumechange',   onVol);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [currentVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset playback state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setMediaError(false);
    setTranscript(null);
    setShowTranscript(false);
  }, [currentVideo]);

  // Lazily load transcript + summary when the info panel is opened.
  useEffect(() => {
    if (!showInfo || !currentVideo?.id || transcript || transcriptLoading) return;
    const type = currentVideo.backendType === 'reel' ? 'reel' : 'video';
    setTranscriptLoading(true);
    api.get(`/media/transcript/${type}/${currentVideo.id}`)
      .then((res) => setTranscript(res?.data?.result?.transcript || null))
      .catch(() => setTranscript(null))
      .finally(() => setTranscriptLoading(false));
  }, [showInfo, currentVideo, transcript, transcriptLoading]);

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
    const el = muxRef.current;
    if (!el) return;
    el.paused ? el.play().catch(() => {}) : el.pause();
  }, []);

  const skip = useCallback((e, secs) => {
    e.stopPropagation();
    const el = muxRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + secs));
    // Visual flash
    setSkipFlash(secs < 0 ? 'back' : 'fwd');
    setTimeout(() => setSkipFlash(null), 500);
  }, []);

  const handleScrubChange = (e) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    const el = muxRef.current;
    if (el) el.currentTime = val;
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const el = muxRef.current;
    if (!el) return;
    el.muted = !el.muted;
  };

  const handleVolume = (e) => {
    e.stopPropagation();
    const val = Number(e.target.value);
    const el = muxRef.current;
    if (el) { el.volume = val; el.muted = val === 0; }
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
    const url = `https://www.thehomieshub.com/media/${currentVideo.id}`;
    if (navigator.share) navigator.share({ title: currentVideo.title, url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  };

  const openEdit = useCallback(async (e) => {
    e.stopPropagation();
    try {
      const { data } = await api.get('/admin/media-categories');
      setEditCategories(data?.result?.categories || []);
    } catch { setEditCategories([]); }
    setShowEdit(true);
  }, []);

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
      {currentVideo.muxPlaybackId && !mediaError ? (
        <MuxPlayer
          key={currentVideo.id}
          ref={muxRef}
          playbackId={currentVideo.muxPlaybackId}
          streamType="on-demand"
          autoPlay
          preload="auto"
          className="absolute inset-0 w-full h-full"
          style={{
            pointerEvents: 'none',
            '--controls': 'none',
            '--media-object-fit': 'contain',
            background: 'black',
          }}
          metadata={{ video_id: currentVideo.id, video_title: currentVideo.title }}
          onError={() => setMediaError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <X className="w-12 h-12 text-zinc-700" />
          <p className="text-lg">{mediaError ? 'Failed to load video' : 'Video not available'}</p>
          {mediaError && (
            <button
              onClick={() => setMediaError(false)}
              className="text-sm text-zinc-400 border border-zinc-700 px-4 py-1.5 rounded-full hover:border-zinc-400 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── Skip flash overlays ───────────────────────────────────────────── */}
      <AnimatePresence>
        {skipFlash === 'back' && (
          <motion.div key="flash-back"
            initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="absolute left-0 top-0 bottom-0 w-1/3 bg-white/10 rounded-r-full pointer-events-none z-20
                       flex items-center justify-center"
          >
            <div className="text-white text-center">
              <RotateCcw className="w-10 h-10 mx-auto" />
              <span className="text-sm font-bold">10</span>
            </div>
          </motion.div>
        )}
        {skipFlash === 'fwd' && (
          <motion.div key="flash-fwd"
            initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 rounded-l-full pointer-events-none z-20
                       flex items-center justify-center"
          >
            <div className="text-white text-center">
              <RotateCw className="w-10 h-10 mx-auto" />
              <span className="text-sm font-bold">10</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls overlay ─────────────────────────────────────────────── */}
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
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); toggleLike(currentVideo); }}
                  className={cn('p-2 rounded-full transition-colors',
                    isLiked(currentVideo.id) ? 'text-red-500' : 'text-white/70 hover:text-white')}
                >
                  <ThumbsUp className="w-5 h-5" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleShare} className="p-2 text-white/70 hover:text-white transition-colors">
                  <Share2 className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
                  className={cn('p-2 rounded-full transition-colors',
                    showInfo ? 'text-white' : 'text-white/70 hover:text-white')}
                >
                  <Info className="w-5 h-5" />
                </motion.button>
                {user?.isAdmin && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={openEdit}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    title="Edit video"
                  >
                    <Pencil className="w-5 h-5" />
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); closeVideo(); }}
                  className="p-2 text-white/70 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* MIDDLE — transparent passthrough except the 3 center buttons */}
            <div
              className="flex-1 flex items-center justify-center gap-12"
              onClick={togglePlay}
            >
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => skip(e, -10)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <RotateCcw className="w-9 h-9" />
                <span className="block text-[10px] text-center mt-0.5 font-bold">10</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-sm
                           flex items-center justify-center text-white border border-white/30
                           transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isPlaying
                    ? <motion.span key="pause" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
                        <Pause className="w-8 h-8 fill-white" />
                      </motion.span>
                    : <motion.span key="play" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </motion.span>
                  }
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => skip(e, 10)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <RotateCw className="w-9 h-9" />
                <span className="block text-[10px] text-center mt-0.5 font-bold">10</span>
              </motion.button>
            </div>

            {/* BOTTOM BAR */}
            <div className="px-4 md:px-8 pb-6 pt-16 bg-gradient-to-t from-black/90 to-transparent">
              {/* Scrubber */}
              <div
                className="relative w-full h-5 mb-3 flex items-center cursor-pointer group/scrub"
                onClick={e => e.stopPropagation()}
              >
                {/* Track background */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/20 rounded-full" />
                {/* Buffered */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white/30 rounded-full transition-all"
                  style={{ width: `${bufferedPct}%` }} />
                {/* Progress */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-red-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }} />
                {/* Thumb — always visible */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none
                             scale-100 group-hover/scrub:scale-125 transition-transform"
                  style={{ left: `calc(${progress}% - 7px)` }}
                />
                {/* Invisible range input on top */}
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
                  <motion.button whileTap={{ scale: 0.8 }} onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
                    {isPlaying
                      ? <Pause className="w-5 h-5 fill-white" />
                      : <Play  className="w-5 h-5 fill-white" />}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => skip(e, -10)} className="text-white hover:text-white/80 transition-colors hidden md:block">
                    <RotateCcw className="w-5 h-5" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => skip(e, 10)} className="text-white hover:text-white/80 transition-colors hidden md:block">
                    <RotateCw className="w-5 h-5" />
                  </motion.button>

                  {/* Volume */}
                  <div
                    className="flex items-center gap-2 group/vol"
                    onClick={e => e.stopPropagation()}
                  >
                    <motion.button whileTap={{ scale: 0.8 }} onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
                      {isMuted || volume === 0
                        ? <VolumeX className="w-5 h-5" />
                        : <Volume2 className="w-5 h-5" />}
                    </motion.button>
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

                <motion.button whileTap={{ scale: 0.8 }} onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors">
                  {isFullscreen
                    ? <Minimize className="w-5 h-5" />
                    : <Maximize className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap anywhere (when controls hidden) to reveal them */}
      {!showControls && (
        <div className="absolute inset-0 z-10 cursor-pointer" onClick={resetHide} />
      )}

      {/* ── Admin edit modal ─────────────────────────────────────────────── */}
      {showEdit && currentVideo && (
        <EditVideoModal
          item={{
            _id: currentVideo.id,
            id: currentVideo.id,
            title: currentVideo.title,
            description: currentVideo.description || '',
            thumbnailUrl: currentVideo.thumbnailUrl || currentVideo.cover || '',
            backdropImages: currentVideo.backdropImages || [],
            muxPlaybackId: currentVideo.muxPlaybackId,
            _collectionType: currentVideo._collectionType || currentVideo.backendType || 'video',
          }}
          categories={editCategories}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
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

            {/* ── AI summary + transcript ─────────────────────────────────── */}
            {transcriptLoading && (
              <p className="text-zinc-500 text-sm mt-4">Loading summary…</p>
            )}
            {transcript?.summary && (
              <div className="mt-5 border-t border-zinc-800 pt-4">
                <h3 className="text-white text-sm font-bold mb-2">Summary</h3>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{transcript.summary}</p>
              </div>
            )}
            {transcript?.hasTranscript && transcriptCues.length > 0 && (
              <div className="mt-5 border-t border-zinc-800 pt-4">
                <button
                  onClick={() => setShowTranscript(v => !v)}
                  className="flex items-center justify-between w-full text-white text-sm font-bold mb-2"
                >
                  <span>Transcript</span>
                  <span className="text-zinc-500 text-xs font-normal">{showTranscript ? 'Hide' : 'Show'}</span>
                </button>
                {showTranscript && (
                  <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
                    {transcriptCues.map((cue, i) => (
                      <button
                        key={i}
                        onClick={() => seekTo(cue.t)}
                        className="flex gap-3 w-full text-left rounded px-2 py-1 hover:bg-zinc-800/70 transition-colors group"
                      >
                        <span className="text-pink-400/80 text-xs font-mono pt-0.5 w-12 flex-shrink-0 group-hover:text-pink-400">
                          {fmt(cue.t)}
                        </span>
                        <span className="text-zinc-300 text-sm leading-snug">{cue.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;
