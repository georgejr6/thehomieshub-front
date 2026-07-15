import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Info } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { AddToPlaylistModal } from './PlaylistModals';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ── Card — clean inline hover, no floating popup ─────────────────────────────
const MediaCard = ({ item, isRanked, rank, onPlay, onInfo, onAddToPlaylist, fullWidth = false }) => {
  const { isLiked, toggleLike } = useMedia();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn(
      "relative",
      fullWidth ? "w-full" : "flex-none",
      !fullWidth && (isRanked ? "w-[200px] md:w-[240px]" : "w-[180px] md:w-[220px]")
    )}>
      {/* Rank number */}
      {isRanked && (
        <span className="absolute -left-3 bottom-0 text-[80px] font-black leading-[0.85] z-0 select-none"
          style={{ color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.15)' }}>
          {rank}
        </span>
      )}

      {/* Card — square for audio (shows the full album cover), 16:9 for video */}
      <motion.div
        className={cn(
          "relative bg-zinc-800 rounded-sm overflow-hidden cursor-pointer",
          item.type === 'audio' ? "aspect-square" : "aspect-video"
        )}
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
              onClick={e => { e.stopPropagation(); onAddToPlaylist?.(item); }}
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

      {/* Below-card info — always visible */}
      <div className="mt-2 px-0.5 space-y-0.5">
        <p className="text-white text-xs font-semibold truncate leading-tight">{item.title}</p>
        {item.duration && item.duration !== '0:00' && (
          <p className="text-zinc-500 text-[10px]">{item.duration}</p>
        )}
      </div>
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────
const MediaRow = ({ title, items, isRanked = false, isGrid = false, onPlay, onInfo, onTitleClick }) => {
  const rowRef = useRef(null);
  const { playMedia } = useMedia();
  const handlePlay = onPlay || playMedia;
  const [page, setPage] = useState(0);
  // One shared "add to playlist" modal per row instead of one mounted per card.
  const [playlistItem, setPlaylistItem] = useState(null);

  useEffect(() => { setPage(0); }, [title]);

  const totalPages = isGrid ? Math.ceil(items.length / PAGE_SIZE) : 1;
  const pageItems = isGrid ? items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : items;

  // Infinite-loop scroll: hitting the right arrow past the end wraps back to the
  // first item; hitting left from the start wraps to the end.
  const scroll = dir => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = 700;
    if (dir === 'right') {
      if (el.scrollLeft >= max - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step, behavior: 'smooth' });
    } else {
      if (el.scrollLeft <= 8) el.scrollTo({ left: max, behavior: 'smooth' });
      else el.scrollBy({ left: -step, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-8 relative group/row">
      <h2
        onClick={onTitleClick}
        className={cn(
          "text-lg md:text-xl font-bold text-white mb-3 px-0.5 inline-flex items-center gap-1.5 transition-colors",
          onTitleClick ? "cursor-pointer hover:text-zinc-300" : ""
        )}
      >
        {title}
        {onTitleClick && (
          <ChevronRight className="h-4 w-4 opacity-0 group-hover/row:opacity-100 transition-opacity text-zinc-400" />
        )}
      </h2>

      {isGrid ? (
        /* Grid layout — wraps into multiple rows with pagination */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {pageItems.map((item, index) => (
              <MediaCard
                key={item.id}
                item={item}
                isRanked={isRanked}
                rank={page * PAGE_SIZE + index + 1}
                onPlay={handlePlay}
                onInfo={onInfo}
                onAddToPlaylist={setPlaylistItem}
                fullWidth
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-zinc-400 text-sm font-medium">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Horizontal scroll row */
        <div className="relative group">
          <button
            className="absolute left-0 top-0 bottom-0 z-40 w-10 flex items-center justify-center bg-black/70 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all duration-200"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <div
            ref={rowRef}
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
                onAddToPlaylist={setPlaylistItem}
              />
            ))}
          </div>

          <button
            className="absolute right-0 top-0 bottom-0 z-40 w-10 flex items-center justify-center bg-black/70 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all duration-200"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      <AddToPlaylistModal
        isOpen={!!playlistItem}
        onClose={() => setPlaylistItem(null)}
        mediaToAdd={playlistItem}
      />
    </div>
  );
};

export default MediaRow;
