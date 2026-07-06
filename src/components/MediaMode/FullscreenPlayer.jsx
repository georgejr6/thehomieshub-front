import React, { useEffect, useRef, useState } from 'react';
import { useMedia } from '@/contexts/MediaContext';
import { Play, Pause, X, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, MessageSquare, List } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Watermark from '@/components/Watermark';

const FullscreenPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, closeFullscreen } = useMedia();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
        setProgress(videoRef.current.currentTime);
        setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (value) => {
      if (videoRef.current) {
          videoRef.current.currentTime = value[0];
          setProgress(value[0]);
      }
  };

  const toggleMute = () => {
      if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
          setIsMuted(!isMuted);
      }
  };

  const formatTime = (time) => {
      if (!time) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(e => console.error(e));
        setIsBrowserFullscreen(true);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen(); 
            setIsBrowserFullscreen(false);
        }
    }
  };

  if (!currentTrack) return null;

  return (
    <motion.div 
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black flex items-center justify-center font-sans"
    >
        <Watermark />
        {currentTrack.type === 'video' ? (
             <video 
                ref={videoRef}
                src={currentTrack.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-winter-snowfall-forest-422-large.mp4"} // Fallback for mock
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                loop
            />
        ) : (
            <div className="flex flex-col items-center gap-6">
                <img src={currentTrack.cover} alt={currentTrack.title} className="w-64 h-64 md:w-96 md:h-96 rounded shadow-2xl object-cover animate-pulse-slow" />
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2">{currentTrack.title}</h1>
                    <p className="text-xl text-zinc-400">{currentTrack.artist}</p>
                </div>
            </div>
        )}

        {/* Top Gradient */}
        <div className={cn("absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none", showControls ? "opacity-100" : "opacity-0")} />
        
        {/* Back Button */}
        <button 
            onClick={closeFullscreen}
            className={cn("absolute top-6 left-6 z-[130] p-2 rounded-full bg-black/50 hover:bg-white/20 text-white transition-all duration-300", showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4")}
        >
            <X className="h-8 w-8" />
        </button>

        {/* Bottom Controls */}
        <div className={cn("absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300", showControls ? "opacity-100" : "opacity-0")}>
            <div className="max-w-6xl mx-auto space-y-4">
                 {/* Title Info */}
                 <div className="flex flex-col">
                     <h2 className="text-2xl font-bold text-white drop-shadow-md">{currentTrack.title}</h2>
                     <span className="text-lg text-zinc-300 drop-shadow-md">{currentTrack.artist}</span>
                 </div>

                 {/* Progress Bar */}
                 <div className="flex items-center gap-4 group">
                     <span className="text-sm font-medium text-zinc-300 w-10 text-right">{formatTime(progress)}</span>
                     <Slider 
                        value={[progress]} 
                        max={duration || 100} 
                        step={0.1} 
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                     />
                     <span className="text-sm font-medium text-zinc-300 w-10">{formatTime(duration)}</span>
                 </div>

                 {/* Control Buttons */}
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-6">
                         <button onClick={togglePlay} className="p-2 hover:text-white text-zinc-300 transition-colors">
                             {isPlaying ? <Pause className="h-10 w-10 fill-current" /> : <Play className="h-10 w-10 fill-current" />}
                         </button>
                         <button className="p-2 hover:text-white text-zinc-300 transition-colors">
                             <SkipBack className="h-8 w-8 fill-current" />
                         </button>
                         <button className="p-2 hover:text-white text-zinc-300 transition-colors">
                             <SkipForward className="h-8 w-8 fill-current" />
                         </button>
                         <div className="flex items-center gap-2 group/vol">
                             <button onClick={toggleMute} className="p-2 hover:text-white text-zinc-300 transition-colors">
                                 {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                             </button>
                             <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                                <Slider defaultValue={[80]} max={100} className="w-24" />
                             </div>
                         </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                         <button className="p-2 hover:text-white text-zinc-300 transition-colors" title="Subtitle / Audio">
                             <MessageSquare className="h-6 w-6" />
                         </button>
                         <button className="p-2 hover:text-white text-zinc-300 transition-colors" title="Episodes">
                             <List className="h-6 w-6" />
                         </button>
                         <button onClick={toggleBrowserFullscreen} className="p-2 hover:text-white text-zinc-300 transition-colors" title="Fullscreen">
                             {isBrowserFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
                         </button>
                     </div>
                 </div>
            </div>
        </div>
    </motion.div>
  );
};

export default FullscreenPlayer;