import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Info } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { AddToPlaylistModal } from './PlaylistModals';
import { cn } from '@/lib/utils';

// ── Card — clean inline hover, no floating popup ─────────────────────────────
const MediaCard = ({ item, isRanked, rank, onPlay, onInfo }) => {
  const { isLiked, toggleLike } = useMedia();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);

  return (
    <div className={cn(
      "relative flex-none",
      isRanked ? "w-[200px] md:w-[240px]" : "w-[180px] md:w-[220px]"
    )}>
      {/* Rank number */}
      {isRanked && (
        <span className="absolute -left-3 bottom-0 text-[80px] font-black leading-[0.85] z-0 select-none"
          style={{ color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.15)' }}>
          {rank}
        </span>
      )}

      {/* Card */}
      <motion.div
        className="relative aspect-video bg-zinc-800 rounded-sm overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onPlay(item)}
      >
        <img
          src={item.cover}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={e => e.target.src = "https://images.unsplash.com/photo-1516280440614-6697288d5d38"}
        />

        {/* Duration badge */}
        {item.duration && item.duration !== '0:00' && (
          <div className="absolute top-2 right-2 px-1 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded-sm">
            {item.duration}
          </div>
        )}

        {/* Hover overlay — gradient + controls inside card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 12 }}
          transition={{ duration: 0.25 }}
          className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5"
        >
          <p className="text-white font-semibold text-sm line-clamp-1">{item.title}</p>
          {item.artist && <p className="text-zinc-400 text-xs truncate">{item.artist}</p>}

          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={e => { e.stopPropagation(); onPlay(item); }}
              className="bg-white rounded-full p-1.5 hover:bg-white/90 transition-colors"
            >
              <Play className="h-3 w-3 fill-black text-black" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); toggleLike(item); }}
              className={cn(
                "border border-zinc-500 rounded-full p-1.5 hover:border-white transition-colors",
                isLiked(item.id) ? "text-white border-white" : "text-zinc-400"
              )}
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setIsAddToPlaylistOpen(true); }}
              className="border border-zinc-500 rounded-full p-1.5 hover:border-white text-zinc-400 hover:text-white transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
            {onInfo && (
              <button
                onClick={e => { e.stopPropagation(); onInfo(item); }}
                className="border border-zinc-500 rounded-full p-1.5 hover:border-white text-zinc-400 hover:text-white transition-colors ml-auto"
              >
                <Info className="h-3 w-3" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Below-card title (always visible, not hovered) */}
      {!isHovered && (
        <p className="mt-1.5 px-0.5 text-zinc-400 text-xs truncate">{item.title}</p>
      )}

      <AddToPlaylistModal isOpen={isAddToPlaylistOpen} onClose={() => setIsAddToPlaylistOpen(false)} mediaToAdd={item} />
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────
const MediaRow = ({ title, items, isRanked = false, onPlay, onInfo }) => {
  const rowRef = useRef(null);
  const { playMedia } = useMedia();
  const handlePlay = onPlay || playMedia;
  const [showLeftArrow, setShowLeftArrow] = useState(false);

  const scroll = dir => {
    if (!rowRef.current) return;
    const amount = dir === 'left' ? -700 : 700;
    rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (rowRef.current) setShowLeftArrow(rowRef.current.scrollLeft > 0);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 relative group/row">
      <h2 className="text-lg md:text-xl font-bold text-white mb-3 px-0.5 inline-flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors">
        {title}
        <ChevronRight className="h-4 w-4 opacity-0 group-hover/row:opacity-100 transition-opacity text-zinc-400" />
      </h2>

      <div className="relative group">
        {/* Left arrow */}
        <button
          className={cn(
            "absolute left-0 top-0 bottom-0 z-40 w-10 flex items-center justify-center bg-black/70 hover:bg-black/90 transition-all duration-200",
            showLeftArrow ? "opacity-0 group-hover:opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        {/* Scroll container — no extra py padding needed with inline hover */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <MediaCard
              key={item.id}
              item={item}
              isRanked={isRanked}
              rank={index + 1}
              onPlay={handlePlay}
              onInfo={onInfo}
            />
          ))}
        </div>

        {/* Right arrow */}
        <button
          className="absolute right-0 top-0 bottom-0 z-40 w-10 flex items-center justify-center bg-black/70 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all duration-200"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default MediaRow;
