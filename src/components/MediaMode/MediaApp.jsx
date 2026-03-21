import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMedia } from '@/contexts/MediaContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Info, Search, X, Minimize2, ListMusic,
  Maximize, Loader2, ArrowLeft, Film, Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManagePlaylistsModal } from './PlaylistModals';
import MediaRow from './MediaRow';
import VideoPlayer from './VideoPlayer';
import { cn } from '@/lib/utils';

// ── Mux still URLs at key timestamps ─────────────────────────────────────────
function getMuxSlides(muxPlaybackId) {
  if (!muxPlaybackId) return [];
  return [3, 25, 55, 90, 150].map(
    t => `https://image.mux.com/${muxPlaybackId}/thumbnail.png?time=${t}&width=1920`
  );
}

// ── Cycling slideshow background — exact digitvl.app design ──────────────────
const HeroBackground = ({ slides, staticFallback }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    if (slides.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % slides.length), 7000);
    return () => clearInterval(id);
  }, [slides.length, staticFallback]);

  const bgSrc = slides.length > 0 ? slides[idx] : staticFallback;

  return (
    <div className="absolute inset-0">
      {slides.length > 1 ? (
        <AnimatePresence mode="sync">
          <motion.img
            key={slides[idx]}
            src={slides[idx]}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </AnimatePresence>
      ) : bgSrc ? (
        <img src={bgSrc} alt="" className="absolute inset-0 w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}
      {/* Slight dark tint across entire image for text legibility */}
      <div className="absolute inset-0 bg-black/25" />
      {/* Netflix-style gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/20 to-transparent" />
    </div>
  );
};

const TABS = ['Home', 'Videos', 'Music', 'Likes'];

const MediaApp = () => {
  const {
    minimizeMediaMode, exitMediaMode,
    allTracks, genreRows, catalogLoading, playMedia,
    featuredVideo, trendingVideos, newVideos, movies, series, videoLoading, playVideo, currentVideo,
    likedMedia,
    activeCategory, setActiveCategory,
  } = useMedia();

  const [isScrolled, setIsScrolled]           = useState(false);
  const [isPlaylistManagerOpen, setPlaylistManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [isSearchOpen, setIsSearchOpen]       = useState(false);
  const [infoItem, setInfoItem]               = useState(null);

  useEffect(() => {
    const el = document.getElementById('media-scroller');
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 50);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen?.();
  };

  // ── Unified search ────────────────────────────────────────────────────────
  const allContent = useMemo(() => [...allTracks, ...newVideos, ...trendingVideos, ...movies, ...series], [allTracks, newVideos, trendingVideos, movies, series]);
  const searchResults = useMemo(() => searchQuery
    ? allContent.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genres?.some?.(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []
  , [searchQuery, allContent]);

  // ── Hero resolution per tab ───────────────────────────────────────────────
  const heroItem = useMemo(() => {
    if (activeCategory === 'videos') return featuredVideo || newVideos[0] || trendingVideos[0] || null;
    if (activeCategory === 'music')  return allTracks[0] || null;
    // home: prefer featured video, fallback to first track
    return featuredVideo || newVideos[0] || allTracks[0] || null;
  }, [activeCategory, featuredVideo, newVideos, trendingVideos, allTracks]);

  const heroIsVideo = heroItem?.mediaKind === 'video';

  // ── Slideshow slides for hero ─────────────────────────────────────────────
  const heroSlides = useMemo(() => {
    if (heroItem?.muxPlaybackId) return getMuxSlides(heroItem.muxPlaybackId);
    // For music tab or when no Mux id: cycle covers from available catalog
    if (!heroIsVideo) {
      return allTracks.slice(0, 8).map(t => t.cover).filter(Boolean);
    }
    // Video without Mux: cycle video thumbnails
    const pool = [
      ...(featuredVideo ? [featuredVideo] : []),
      ...newVideos.slice(0, 5),
      ...trendingVideos.slice(0, 5),
    ];
    return [...new Set(pool.map(v => v.backdropUrl || v.cover))].filter(Boolean);
  }, [heroItem, heroIsVideo, allTracks, featuredVideo, newVideos, trendingVideos]);

  const isLoading = catalogLoading || videoLoading;

  const handleFeaturedPlay = useCallback(() => {
    if (!heroItem) return;
    heroIsVideo ? playVideo(heroItem) : playMedia(heroItem);
  }, [heroItem, heroIsVideo, playVideo, playMedia]);

  // ── Renders ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-[#141414] text-white font-sans overflow-hidden flex flex-col">

      {currentVideo && <VideoPlayer />}

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-all duration-500 px-4 md:px-12 h-16 flex items-center justify-between",
        isScrolled ? "bg-[#141414]/98 shadow-lg backdrop-blur-sm" : "bg-gradient-to-b from-black/80 to-transparent"
      )}>
        <div className="flex items-center gap-4 md:gap-8">
          {/* Back to Homies */}
          <button onClick={minimizeMediaMode}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors group shrink-0"
            title="Back to The Homies">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold hidden md:block whitespace-nowrap">The Homies</span>
          </button>

          <span className="text-red-600 font-black text-xl md:text-2xl tracking-tighter cursor-pointer select-none"
            onClick={() => setActiveCategory('home')}>DIGITVL</span>

          {/* Desktop tabs */}
          <ul className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            {TABS.map(tab => (
              <li key={tab}
                className={cn("hover:text-white cursor-pointer transition-colors",
                  activeCategory === tab.toLowerCase() && "text-white font-bold")}
                onClick={() => setActiveCategory(tab.toLowerCase())}>
                {tab}
              </li>
            ))}
          </ul>

          {/* Mobile tabs */}
          <div className="flex md:hidden items-center gap-3 text-xs font-medium overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab}
                className={cn("whitespace-nowrap transition-colors",
                  activeCategory === tab.toLowerCase() ? "text-white font-bold" : "text-zinc-400")}
                onClick={() => setActiveCategory(tab.toLowerCase())}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-white shrink-0">
          {/* Search */}
          <div className={cn(
            "flex items-center transition-all duration-300 overflow-hidden bg-black/50 border border-transparent rounded-full",
            isSearchOpen ? "w-40 md:w-64 border-zinc-700 px-3 py-1" : "w-8 bg-transparent"
          )}>
            <button
              onClick={() => { setIsSearchOpen(v => !v); if (!isSearchOpen) setTimeout(() => document.getElementById('media-search')?.focus(), 100); }}
              className="hover:text-zinc-300 shrink-0">
              <Search className="h-5 w-5" />
            </button>
            <input id="media-search" type="text" placeholder="Titles, artists…"
              className={cn("bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-white placeholder:text-zinc-400 outline-none",
                !isSearchOpen && "hidden")}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && isSearchOpen && (
              <button onClick={() => setSearchQuery('')} className="hover:text-white text-zinc-400 shrink-0"><X className="h-4 w-4" /></button>
            )}
          </div>

          <button onClick={() => setPlaylistManagerOpen(true)} className="hover:text-white text-zinc-300" title="Playlists">
            <ListMusic className="h-5 w-5" />
          </button>
          <button onClick={toggleFullscreen} className="hover:text-white text-zinc-300 hidden md:block" title="Fullscreen">
            <Maximize className="h-5 w-5" />
          </button>
          <button onClick={minimizeMediaMode} className="hover:text-red-400 text-white" title="Minimize — keep music playing">
            <Minimize2 className="h-5 w-5" />
          </button>
          <button onClick={exitMediaMode} className="hover:text-red-500 text-white" title="Exit media mode">
            <X className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div id="media-scroller" className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">

        {/* SEARCH */}
        {searchQuery ? (
          <div className="pt-24 px-4 md:px-12 min-h-screen">
            <h2 className="text-xl text-zinc-400 mb-6">Results for "{searchQuery}"</h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map(item => (
                  <div key={item.id} className="cursor-pointer group"
                    onClick={() => item.mediaKind === 'video' ? playVideo(item) : playMedia(item)}>
                    <div className="aspect-video relative rounded-md overflow-hidden bg-zinc-800 mb-2">
                      <img src={item.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => e.target.src = "https://images.unsplash.com/photo-1516280440614-6697288d5d38"} />
                      <div className="absolute top-2 right-2">
                        {item.mediaKind === 'video' ? <Film className="w-3 h-3 text-white/70" /> : <Music2 className="w-3 h-3 text-white/70" />}
                      </div>
                    </div>
                    <h3 className="font-bold text-sm truncate">{item.title}</h3>
                    {item.artist && <p className="text-xs text-zinc-400 truncate">{item.artist}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-zinc-500 mt-4">No matches found.</p>}
          </div>

        ) : activeCategory === 'likes' ? (
          /* ── LIKES ─────────────────────────────────────────────────────── */
          <div className="pt-24 px-4 md:px-12 min-h-screen">
            <h1 className="text-3xl font-bold mb-8">My List</h1>
            {likedMedia.length > 0
              ? <MediaRow title="Liked Tracks" items={likedMedia} />
              : <p className="text-zinc-500 mt-4">Nothing liked yet.</p>}
          </div>

        ) : (
          /* ── HERO + ROWS (Home / Videos / Music) ─────────────────────── */
          <>
            {/* HERO */}
            {isLoading && !heroItem ? (
              <div className="h-[70vh] flex flex-col items-center justify-center bg-zinc-900">
                <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-4" />
                <p className="text-zinc-500">Loading DIGITVL…</p>
              </div>
            ) : heroItem ? (
              <div className="relative w-full h-[90vh] overflow-hidden">
                <HeroBackground slides={heroSlides} staticFallback={heroItem.backdropUrl || heroItem.cover} />

                {/* Hero content */}
                <div className="relative z-10 flex flex-col justify-end h-full px-6 md:px-16 lg:px-24 pb-28 md:pb-32">
                  <motion.div
                    key={heroItem.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="max-w-2xl"
                  >
                    {/* Genre / type label */}
                    {(heroItem.genres?.length > 0 || heroItem.genre || heroItem.type) && (
                      <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
                        {heroItem.genres?.slice(0, 2).join(' · ') || heroItem.genre || heroItem.type}
                      </p>
                    )}

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none line-clamp-2 text-white"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 4px 40px rgba(0,0,0,0.7)' }}>
                      {heroItem.title}
                    </h1>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-sm font-semibold text-white/80 mb-4">
                      {heroItem.year && <span>{heroItem.year}</span>}
                      {heroItem.rating && <span className="border border-white/40 px-1.5 py-0.5 rounded text-xs">{heroItem.rating}</span>}
                      {heroItem.duration && heroItem.duration !== '0:00' && <span>{heroItem.duration}</span>}
                      {!heroIsVideo && <span className="border border-white/40 px-1.5 py-0.5 rounded text-xs bg-black/20">HD</span>}
                    </div>

                    {heroItem.description && (
                      <p className="text-base text-gray-300 mb-8 line-clamp-3 max-w-xl leading-relaxed">
                        {heroItem.description}
                      </p>
                    )}
                    {!heroItem.description && !heroIsVideo && heroItem.artist && (
                      <p className="text-base text-gray-300 mb-8">
                        {heroItem.artist}
                        {heroItem.album ? ` — ${heroItem.album}` : ''}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <Button onClick={handleFeaturedPlay}
                        className="bg-white text-black hover:bg-white/90 font-bold text-base px-8 py-6 rounded gap-2">
                        <Play className="w-5 h-5 fill-black" /> Play
                      </Button>
                      <Button onClick={() => setInfoItem(heroItem)}
                        className="bg-white/20 text-white hover:bg-white/30 border-none font-bold text-base px-8 py-6 rounded backdrop-blur-sm gap-2">
                        <Info className="w-5 h-5" /> More Info
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : null}

            {/* CONTENT ROWS */}
            <div className="relative z-10 -mt-24 pb-36 space-y-8 px-4 md:pl-12">
              {activeCategory === 'home' && (
                <>
                  {trendingVideos.length > 0 && <MediaRow title="Trending Now" items={trendingVideos} onPlay={playVideo} />}
                  {allTracks.length > 0 && <MediaRow title="Music" items={allTracks} />}
                  {newVideos.length > 0 && <MediaRow title="New on DIGITVL" items={newVideos} onPlay={playVideo} />}
                  {movies.length > 0 && <MediaRow title="Movies" items={movies} onPlay={playVideo} />}
                  {allTracks.length >= 5 && <MediaRow title="Top 10 Tracks" items={allTracks.slice(0, 10)} isRanked />}
                  {series.length > 0 && <MediaRow title="Series" items={series} onPlay={playVideo} />}
                  {genreRows.map(({ genre, items }) => <MediaRow key={genre} title={genre} items={items} />)}
                </>
              )}
              {activeCategory === 'videos' && (
                <>
                  {trendingVideos.length > 0 && <MediaRow title="Trending Now" items={trendingVideos} onPlay={playVideo} />}
                  {newVideos.length > 0 && <MediaRow title="New Releases" items={newVideos} onPlay={playVideo} />}
                  {movies.length > 0 && <MediaRow title="Movies" items={movies} onPlay={playVideo} />}
                  {movies.length >= 5 && <MediaRow title="Top 10 Movies" items={movies.slice(0, 10)} isRanked onPlay={playVideo} />}
                  {series.length > 0 && <MediaRow title="Series" items={series} onPlay={playVideo} />}
                  {!videoLoading && !trendingVideos.length && !newVideos.length && !movies.length && (
                    <div className="text-center py-20 text-zinc-500">
                      <Film className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                      <p>No videos uploaded yet. Check back soon.</p>
                    </div>
                  )}
                </>
              )}
              {activeCategory === 'music' && (
                <>
                  {allTracks.length > 0 && <MediaRow title="All Tracks" items={allTracks} />}
                  {allTracks.length >= 5 && <MediaRow title="Top 10" items={allTracks.slice(0, 10)} isRanked />}
                  {genreRows.map(({ genre, items }) => <MediaRow key={genre} title={genre} items={items} />)}
                  {likedMedia.length > 0 && <MediaRow title="Liked Tracks" items={likedMedia} />}
                  {catalogLoading && (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-12 py-16 text-zinc-600 text-sm bg-[#141414]">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <div className="flex justify-center gap-6">
              <span className="hover:text-white cursor-pointer">Terms of Use</span>
              <span className="hover:text-white cursor-pointer">Privacy Policy</span>
              <button onClick={minimizeMediaMode} className="hover:text-white font-semibold text-zinc-400">
                ← Back to The Homies
              </button>
            </div>
            <p>&copy; 2025 DIGITVL, Inc.</p>
          </div>
        </div>
      </div>

      {/* ── Info modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {infoItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[108] bg-black/80 flex items-end md:items-center justify-center p-4"
            onClick={() => setInfoItem(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-zinc-900 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setInfoItem(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              {infoItem.cover && (
                <img src={infoItem.backdropUrl || infoItem.cover} className="w-full aspect-video object-cover rounded-lg mb-4" />
              )}
              <h2 className="text-2xl font-black text-white mb-1">{infoItem.title}</h2>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {infoItem.year && <span className="text-zinc-400 text-sm">{infoItem.year}</span>}
                {infoItem.rating && <span className="border border-zinc-600 text-zinc-400 text-xs px-1.5 py-0.5 rounded">{infoItem.rating}</span>}
                {infoItem.duration && <span className="text-zinc-400 text-sm">{infoItem.duration}</span>}
              </div>
              {infoItem.genres?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {infoItem.genres.map(g => <span key={g} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{g}</span>)}
                </div>
              )}
              {infoItem.description && <p className="text-zinc-400 text-sm leading-relaxed mb-4">{infoItem.description}</p>}
              {infoItem.director && <p className="text-zinc-500 text-xs mb-1">Director: <span className="text-zinc-300">{infoItem.director}</span></p>}
              {infoItem.cast?.length > 0 && <p className="text-zinc-500 text-xs mb-4">Cast: <span className="text-zinc-300">{infoItem.cast.slice(0, 5).join(', ')}</span></p>}
              <Button onClick={() => { infoItem.mediaKind === 'video' ? playVideo(infoItem) : playMedia(infoItem); setInfoItem(null); }}
                className="w-full bg-white text-black hover:bg-white/90 font-bold gap-2">
                <Play className="w-4 h-4 fill-black" /> Play
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ManagePlaylistsModal isOpen={isPlaylistManagerOpen} onClose={() => setPlaylistManagerOpen(false)} />
    </div>
  );
};

export default MediaApp;
