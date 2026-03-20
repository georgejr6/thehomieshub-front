import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Heart, ChevronUp, ChevronDown,
  Activity, Maximize2, Share2, X,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useMedia } from '@/contexts/MediaContext';

const MusicPlayer = () => {
  const {
    audioRef, currentTrack, isPlaying, isLoading,
    currentTime, duration, volume, isMuted, setVolume, setIsMuted,
    togglePlay, seek, skipForward, skipBack, fmtTime,
    isLiked, toggleLike, exitMediaMode,
  } = useMedia();

  const [isExpanded,  setIsExpanded]  = useState(false);
  const [vizMode,     setVizMode]     = useState(false);
  const [vizFull,     setVizFull]     = useState(false);
  const canvasStripRef = useRef(null);
  const canvasFullRef  = useRef(null);
  const animRef        = useRef(null);
  const isPlayingRef   = useRef(false);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Visualizer ─────────────────────────────────────────────────────────────
  const runViz = useCallback((canvas) => {
    if (!canvas) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const ctx2d = canvas.getContext('2d');
    let sBass = 0, sMid = 0, sTreble = 0, sEnergy = 0;
    let hue = 195, time = 0, beatPhase = 0;
    let nextBeat = 0, beatPulse = 0, flashPulse = 0;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const W = canvas.offsetWidth || 800;
      const H = canvas.offsetHeight || 120;
      if (canvas.width !== W)  canvas.width  = W;
      if (canvas.height !== H) canvas.height = H;
      const cy = H / 2;
      const playing = isPlayingRef.current;

      time      += playing ? 0.022 : 0.004;
      beatPhase += playing ? 0.022 : 0;

      let bassE = 0, midE = 0, trebleE = 0, overallE = 0;

      if (playing) {
        if (time > nextBeat) {
          beatPulse  = 0.7 + Math.random() * 0.3;
          flashPulse = beatPulse > 0.85 ? 0.6 : 0;
          nextBeat   = time + 0.38 + Math.random() * 0.22;
        }
        beatPulse  *= 0.88;
        flashPulse *= 0.75;
        bassE    = beatPulse * 0.8 + Math.abs(Math.sin(beatPhase * 1.97)) * 0.2;
        midE     = Math.abs(Math.sin(time * 2.3  + 0.8)) * 0.55 + Math.random() * 0.05;
        trebleE  = Math.abs(Math.sin(time * 4.1  + 1.5)) * 0.35 + Math.random() * 0.04;
        overallE = (bassE * 0.5 + midE * 0.3 + trebleE * 0.2);
      }

      const spd = 0.1;
      sBass    += (bassE    - sBass)    * spd;
      sMid     += (midE     - sMid)     * spd;
      sTreble  += (trebleE  - sTreble)  * spd;
      sEnergy  += (overallE - sEnergy)  * spd;

      const targetHue = 195 - sBass * 155 + sTreble * 30;
      hue += (targetHue - hue) * 0.06;

      const sat       = 88  + sEnergy * 12;
      const lit       = 52  + sEnergy * 18;
      const glowBase  = 8   + sBass   * 38 + sEnergy * 18;
      const flashBoost = flashPulse * 25;

      ctx2d.clearRect(0, 0, W, H);

      const paintWave = (phaseOff, ampScale, opacity, blur) => {
        ctx2d.beginPath();
        ctx2d.lineWidth   = 1.8;
        ctx2d.strokeStyle = `hsla(${hue}, ${sat}%, ${Math.min(lit + blur * 3, 95)}%, ${opacity})`;
        ctx2d.shadowColor = `hsl(${hue}, ${sat}%, ${lit + 20}%)`;
        ctx2d.shadowBlur  = blur + flashBoost;
        const STEPS = Math.min(W, 600);
        const amp = playing ? (0.28 + sBass * 0.48 + sMid * 0.18 + sTreble * 0.06) * ampScale : 0.04 * ampScale;
        for (let x = 0; x <= STEPS; x++) {
          const t = x / STEPS;
          const y = cy + amp * cy * (
            Math.sin(t * Math.PI * 4.2  + time * 2.8  + phaseOff)       * 0.48 +
            Math.sin(t * Math.PI * 9.7  + time * 1.4  + phaseOff * 1.6) * 0.28 +
            Math.sin(t * Math.PI * 2.1  - time * 0.85 + phaseOff * 0.7) * 0.16 +
            Math.sin(t * Math.PI * 16.3 + time * 3.5  + phaseOff * 2.1) * 0.08
          );
          x === 0 ? ctx2d.moveTo(x * (W / STEPS), y) : ctx2d.lineTo(x * (W / STEPS), y);
        }
        ctx2d.stroke();
      };

      paintWave(0,              1.00, 0.07, glowBase * 4.0);
      paintWave(0,              1.00, 0.15, glowBase * 2.2);
      paintWave(0,              1.00, 0.88, glowBase * 1.0);
      paintWave(Math.PI * 0.38, 0.52, 0.38, glowBase * 0.7);
      paintWave(Math.PI * 0.72, 0.28, 0.22, glowBase * 0.4);
    };
    draw();
  }, []);

  useEffect(() => {
    const active = vizMode || vizFull;
    if (!active) { if (animRef.current) cancelAnimationFrame(animRef.current); animRef.current = null; return; }
    const canvas = vizFull ? canvasFullRef.current : canvasStripRef.current;
    runViz(canvas);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [vizMode, vizFull, isPlaying, runViz]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (!currentTrack) return;
    const url = `https://digitvl.app/og/track/${currentTrack.id}`;
    if (navigator.share) navigator.share({ title: `${currentTrack.title} — DIGITVL`, url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* ── Fullscreen viz ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {vizFull && (
          <motion.div
            key="viz-full"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black flex flex-col"
          >
            <div className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-20"
              style={{ backgroundImage: `url(${currentTrack.cover})` }} />
            <canvas ref={canvasFullRef} className="relative z-10 w-full flex-1" />
            <div className="relative z-10 text-center py-6 px-4">
              <p className="text-white text-2xl font-bold truncate">{currentTrack.title}</p>
              <p className="text-gray-400 text-lg">{currentTrack.artist}</p>
            </div>
            <button onClick={() => setVizFull(false)}
              className="absolute top-5 right-5 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <Maximize2 className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main player ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-[90]"
      >
        {/* Viz strip */}
        <AnimatePresence>
          {vizMode && !vizFull && (
            <motion.div
              key="viz-strip"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 120 }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }}
              className="overflow-hidden bg-black/95 relative"
            >
              <canvas ref={canvasStripRef} className="w-full h-full" />
              <button onClick={() => setVizFull(true)}
                className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white">
                <Maximize2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded track view */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-30"
                  style={{ backgroundImage: `url(${currentTrack.cover})` }} />
                <div className="absolute inset-0 bg-black/70" />
                <div className="relative z-10 p-8">
                  <div className="max-w-4xl mx-auto flex gap-8">
                    <img src={currentTrack.cover} alt={currentTrack.title}
                      className="w-56 h-56 rounded-xl object-cover shadow-2xl flex-shrink-0"
                      onError={e => { e.target.src = `https://picsum.photos/seed/${currentTrack.id}/300/300`; }} />
                    <div className="flex-1 space-y-3 min-w-0">
                      <div>
                        <p className="text-3xl font-bold text-white truncate">{currentTrack.title}</p>
                        <p className="text-xl text-gray-400">{currentTrack.artist}</p>
                      </div>
                      {currentTrack.genre && <p className="text-sm text-gray-500 uppercase tracking-wider">{currentTrack.genre}</p>}
                      {currentTrack.explicit && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">EXPLICIT</span>}
                      <div className="pt-2 flex gap-2 flex-wrap">
                        <button onClick={handleShare}
                          className="flex items-center gap-2 px-4 py-2 border border-zinc-600 rounded-lg text-sm text-white hover:border-white transition-colors">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini bar */}
        <div className="bg-zinc-950/95 backdrop-blur-md border-t border-white/10 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">

              {/* Track info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img src={currentTrack.cover} alt={currentTrack.title}
                  className="w-14 h-14 rounded object-cover flex-shrink-0 cursor-pointer"
                  onClick={() => setIsExpanded(e => !e)}
                  onError={e => { e.target.src = `https://picsum.photos/seed/${currentTrack.id}/300/300`; }} />
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-semibold truncate text-sm">{currentTrack.title}</span>
                  <span className="text-gray-400 text-xs truncate">{currentTrack.artist}</span>
                </div>
                <button onClick={() => toggleLike(currentTrack)} className="ml-2 flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1">
                  <Heart className={`w-5 h-5 ${isLiked(currentTrack.id) ? 'text-red-500 fill-current' : ''}`} />
                </button>
              </div>

              {/* Controls + progress */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="flex items-center gap-4">
                  <button onClick={skipBack} className="text-white hover:text-gray-300 transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="bg-white hover:bg-white/90 text-black rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                  >
                    {isLoading
                      ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      : isPlaying
                        ? <Pause className="w-5 h-5 fill-black" />
                        : <Play  className="w-5 h-5 fill-black ml-0.5" />
                    }
                  </button>
                  <button onClick={skipForward} className="text-white hover:text-gray-300 transition-colors">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 w-full max-w-md">
                  <span className="text-xs text-gray-400 w-8 text-right">{fmtTime(currentTime)}</span>
                  <Slider value={[currentTime]} onValueChange={seek} max={duration || 100} step={1} className="flex-1" />
                  <span className="text-xs text-gray-400 w-8">{fmtTime(duration)}</span>
                </div>
              </div>

              {/* Volume + viz + exit */}
              <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                <button onClick={() => setVizMode(v => !v)}
                  className={`p-2 rounded transition-colors ${vizMode ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                  title="Visualizer">
                  <Activity className="w-4 h-4" />
                </button>
                <button onClick={() => setIsMuted(m => !m)} className="text-white hover:text-gray-300 transition-colors">
                  {isMuted || volume[0] === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <Slider value={isMuted ? [0] : volume} onValueChange={setVolume} max={100} step={1} className="w-24" />
                <button onClick={() => setIsExpanded(e => !e)} className="text-white hover:text-gray-300 transition-colors">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
                <button onClick={exitMediaMode} className="text-gray-400 hover:text-red-400 transition-colors ml-1" title="Exit media mode">
                  <X className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default MusicPlayer;
