import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useMedia } from '@/contexts/MediaContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Info, Search, X, Minimize2, ListMusic,
  Maximize, Loader2, ArrowLeft, Film, Music2, Settings2, CheckCircle2, ShoppingBag,
  LayoutGrid, List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ManagePlaylistsModal } from './PlaylistModals';
import MediaRow from './MediaRow';
import VideoPlayer from './VideoPlayer';
import MediaAdminPanel from './MediaAdminPanel';
import VideoPurchaseGate from './VideoPurchaseGate';
import { cn } from '@/lib/utils';

// ── Auto-categorize videos into binge-worthy rows ────────────────────────────
function buildSmartRows(allVideos) {
  if (!allVideos || allVideos.length === 0) return [];
  const rows = [];

  // Genre rows — up to 5 genres with 2+ items
  const genreMap = {};
  allVideos.forEach(v => {
    (v.genres || []).forEach(g => {
      if (!genreMap[g]) genreMap[g] = [];
      genreMap[g].push(v);
    });
  });
  Object.entries(genreMap)
    .filter(([, items]) => items.length >= 2)
    .slice(0, 5)
    .forEach(([genre, items]) => rows.push({ title: genre, items }));

  // Short watches — under 10 minutes
  const shortClips = allVideos.filter(v => v.durationSecs > 0 && v.durationSecs < 600);
  if (shortClips.length >= 2) rows.push({ title: 'Quick Watches', items: shortClips });

  // Feature length — over 30 minutes
  const longForm = allVideos.filter(v => v.durationSecs >= 1800);
  if (longForm.length >= 2) rows.push({ title: 'Feature Length', items: longForm });

  // Most watched — top by view count
  const popular = [...allVideos]
    .filter(v => (v.viewCount || 0) > 0)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 10);
  if (popular.length >= 2) rows.push({ title: 'Most Watched', items: popular });

  return rows;
}

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

// Tab values are canonical lowercase KEYS — they must match the lowercase
// `activeCategory === '…'` checks in the render branches below. Display labels
// come from TAB_LABELS. (Using capitalized values here silently broke tab
// switching because the render branches compare against lowercase.)
const BASE_TABS = ['home', 'videos', 'music', 'likes'];
const PURCHASED_TAB = 'purchased';
const ADMIN_TAB = 'admin';
const TAB_LABELS = {
  home: 'Home', videos: 'Videos', music: 'Music', likes: 'Likes',
  purchased: 'Purchased', admin: 'Admin',
};

// Divider between the video and music groups on the Home tab so it's obvious
// which rows are watch vs listen.
const SectionHeading = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 pt-2 pb-1">
    <Icon className="w-6 h-6 text-red-500 shrink-0" />
    <div>
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const MediaApp = () => {
  const { postId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Safety net: Radix can leave `pointer-events: none` on <body> if a dialog
  // unmounts while open, freezing the whole UI. Clear it whenever no dialog is
  // actually open. (Root causes are fixed too — this is belt-and-suspenders.)
  useEffect(() => {
    const fix = () => {
      if (document.body.style.pointerEvents === 'none' &&
          !document.querySelector('[role="dialog"][data-state="open"]')) {
        document.body.style.pointerEvents = '';
      }
    };
    const obs = new MutationObserver(fix);
    obs.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, []);

  const {
    minimizeMediaMode, exitMediaMode,
    allTracks, genreRows, topTracks, top10, newReleases, catalogLoading, playMedia,
    featuredVideo, trendingVideos, newVideos, movies, series, videoLoading, playVideo, currentVideo,
    hhVideos,
    likedMedia, likedIds,
    activeCategory, setActiveCategory,
    categoryRows, fetchCategoryRows,
    refreshHhVideos,
    purchases, fetchPurchases,
  } = useMedia();


  // Re-fetch HH videos every time Media Mode opens (picks up newly uploaded content)
  useEffect(() => { refreshHhVideos(); }, []); // eslint-disable-line

  // ── Handle return from Stripe purchase ────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('purchased') === 'true') {
      fetchPurchases();
      toast({ title: '✅ Purchase confirmed!', description: 'Your video is now unlocked in the Purchased tab.' });
      setActiveCategory(PURCHASED_TAB);
      // Clean the URL param without triggering a navigation
      window.history.replaceState({}, '', location.pathname);
    }
  }, []); // eslint-disable-line

  // ── Deep-link: /media?track=<id> opens straight to a shared song ──────────
  const trackParamHandled = React.useRef(false);
  useEffect(() => {
    if (trackParamHandled.current) return;
    const id = new URLSearchParams(location.search).get('track');
    if (!id || allTracks.length === 0) return;
    const track = allTracks.find(t => String(t.id) === String(id));
    if (track) {
      trackParamHandled.current = true;
      setActiveCategory('music');
      playMedia(track);
      // Drop the param so a refresh/minimize doesn't re-trigger playback.
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search, allTracks]); // eslint-disable-line

  // ── Auto-play video from vertical feed navigation ─────────────────────────
  useEffect(() => {
    const post = location.state?.post;
    if (!post || !postId) return;
    // Normalize the post into a media item if not already
    const video = {
      id:            post.id,
      title:         post.content?.title || post.title || 'Untitled',
      description:   post.content?.description || post.description || '',
      muxPlaybackId: post.muxPlaybackId || post.content?.muxPlaybackId || null,
      cover:         post.thumbnail || post.cover || '',
      backdropUrl:   post.backdropUrl || post.cover || '',
      mediaKind:     'video',
      backendType:   post.backendType || 'reel',
      isHH:          true,
    };
    if (video.muxPlaybackId) playVideo(video);
  }, [postId]); // eslint-disable-line

  const TABS = [
    ...BASE_TABS,
    ...(user && purchases.length > 0 ? [PURCHASED_TAB] : []),
    ...(user?.isAdmin ? [ADMIN_TAB] : []),
  ];

  const [isScrolled, setIsScrolled]           = useState(false);
  const [isPlaylistManagerOpen, setPlaylistManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [isSearchOpen, setIsSearchOpen]       = useState(false);
  const [infoItem, setInfoItem]               = useState(null);

  // ── Music tab: isolated catalog search + genre filter + view mode ──────────
  const [musicSearch, setMusicSearch] = useState('');
  const [musicGenre, setMusicGenre]   = useState('all');
  const [musicView, setMusicView]     = useState('rows'); // 'rows' | 'grid'
  // Clicking a section title opens that section full-page as a paginated gallery.
  const [sectionView, setSectionView] = useState(null); // { title, items } | null

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
  const allContent = useMemo(() => [...allTracks, ...newVideos, ...trendingVideos, ...movies, ...series, ...hhVideos], [allTracks, newVideos, trendingVideos, movies, series, hhVideos]);
  const searchResults = useMemo(() => searchQuery
    ? allContent.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genres?.some?.(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []
  , [searchQuery, allContent]);

  // ── Music catalog: genres, counts, and the filtered/searched result ────────
  const musicGenres = useMemo(() => {
    const counts = new Map();
    allTracks.forEach(t => { if (t.genre) counts.set(t.genre, (counts.get(t.genre) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([genre, count]) => ({ genre, count }));
  }, [allTracks]);

  const musicFiltered = useMemo(() => {
    const q = musicSearch.trim().toLowerCase();
    return allTracks.filter(t => {
      if (musicGenre !== 'all' && t.genre !== musicGenre) return false;
      if (!q) return true;
      return (t.title?.toLowerCase().includes(q)
        || t.artist?.toLowerCase().includes(q)
        || t.genre?.toLowerCase().includes(q));
    });
  }, [allTracks, musicSearch, musicGenre]);

  const musicIsFiltering = musicSearch.trim() !== '' || musicGenre !== 'all';

  // ── Hero resolution per tab ───────────────────────────────────────────────
  const heroItem = useMemo(() => {
    if (activeCategory === 'videos') return featuredVideo || newVideos[0] || trendingVideos[0] || null;
    if (activeCategory === 'music')  return allTracks[0] || null;
    return featuredVideo || newVideos[0] || allTracks[0] || null;
  }, [activeCategory, featuredVideo, newVideos, trendingVideos, allTracks]);

  const heroIsVideo = heroItem?.mediaKind === 'video';

  // ── Slideshow slides for hero ─────────────────────────────────────────────
  const heroSlides = useMemo(() => {
    if (heroItem?.backdropImages?.length > 0) return heroItem.backdropImages;
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

  // ── Smart auto-categories from all video content ──────────────────────────
  const smartVideoRows = useMemo(() => {
    const pool = [...trendingVideos, ...newVideos, ...movies, ...series, ...hhVideos];
    return buildSmartRows(pool);
  }, [trendingVideos, newVideos, movies, series, hhVideos]);

  const hasVideos = trendingVideos.length > 0 || newVideos.length > 0 || movies.length > 0
    || series.length > 0 || hhVideos.length > 0 || categoryRows.some(c => c.items?.length > 0);

  // ── Liked content, split so videos and music stay cleanly separated ───────
  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
  const likedTracks = useMemo(
    () => allTracks.filter(t => likedSet.has(t.id)),
    [allTracks, likedSet]);
  const likedVideos = useMemo(
    () => [...hhVideos, ...trendingVideos, ...newVideos, ...movies, ...series].filter(v => likedSet.has(v.id)),
    [hhVideos, trendingVideos, newVideos, movies, series, likedSet]);

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
                className={cn("hover:text-white cursor-pointer transition-colors flex items-center gap-1",
                  activeCategory === tab && "text-white font-bold",
                  tab === ADMIN_TAB && activeCategory !== ADMIN_TAB && "text-zinc-500 hover:text-zinc-300")}
                onClick={() => setActiveCategory(tab)}>
                {tab === ADMIN_TAB ? <><Settings2 className="w-3.5 h-3.5" />Admin</>
                  : tab === PURCHASED_TAB ? <><ShoppingBag className="w-3.5 h-3.5" />Purchased</>
                  : TAB_LABELS[tab] || tab}
              </li>
            ))}
          </ul>

          {/* Mobile tabs */}
          <div className="flex md:hidden items-center gap-3 text-xs font-medium overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab}
                className={cn("whitespace-nowrap transition-colors flex items-center gap-1",
                  activeCategory === tab ? "text-white font-bold" : "text-zinc-400",
                  tab === ADMIN_TAB && activeCategory !== ADMIN_TAB && "text-zinc-500")}
                onClick={() => setActiveCategory(tab)}>
                {tab === ADMIN_TAB ? <><Settings2 className="w-3 h-3" />Admin</>
                  : tab === PURCHASED_TAB ? <><ShoppingBag className="w-3 h-3" />Purchased</>
                  : TAB_LABELS[tab] || tab}
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
      <div id="media-scroller" className="flex-1 overflow-y-auto overflow-x-hidden relative">

        {/* ── ADMIN (full page, replaces all content) ──────────────────── */}
        {activeCategory === ADMIN_TAB && user?.isAdmin ? (
          <div className="pt-16 min-h-screen bg-black">
            <MediaAdminPanel isInline onCategoriesChange={fetchCategoryRows} />
          </div>

        ) : searchQuery ? (
          /* ── SEARCH ──────────────────────────────────────────────────── */
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
          /* ── LIKES — liked videos and music, kept separate ───────────── */
          <div className="pt-24 px-4 md:px-12 min-h-screen space-y-8">
            <h1 className="text-3xl font-bold">My List</h1>
            {likedVideos.length === 0 && likedTracks.length === 0 ? (
              <p className="text-zinc-500 mt-4">Nothing liked yet. Tap the heart on any video or track to save it here.</p>
            ) : (
              <>
                {likedVideos.length > 0 && <MediaRow title="Liked Videos" items={likedVideos} onPlay={playVideo} isGrid />}
                {likedTracks.length > 0 && <MediaRow title="Liked Music" items={likedTracks} />}
              </>
            )}
          </div>

        ) : activeCategory === PURCHASED_TAB ? (
          /* ── PURCHASED VIDEOS ────────────────────────────────────────── */
          <div className="pt-24 px-4 md:px-12 min-h-screen">
            <div className="flex items-center gap-3 mb-8">
              <ShoppingBag className="w-7 h-7 text-red-500" />
              <h1 className="text-3xl font-bold">My Purchases</h1>
            </div>
            {purchases.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {purchases.map(p => {
                  const item = {
                    id: p.videoId,
                    title: p.videoTitle || 'Untitled',
                    muxPlaybackId: p.muxPlaybackId,
                    cover: p.videoThumb || (p.muxPlaybackId ? `https://image.mux.com/${p.muxPlaybackId}/thumbnail.png?width=400` : ''),
                    backdropUrl: p.muxPlaybackId ? `https://image.mux.com/${p.muxPlaybackId}/thumbnail.png?width=1280` : '',
                    mediaKind: 'video',
                    backendType: p.videoType,
                  };
                  return (
                    <div key={p._id} className="cursor-pointer group" onClick={() => playVideo(item)}>
                      <div className="aspect-video relative rounded-md overflow-hidden bg-zinc-800 mb-2">
                        {item.cover
                          ? <img src={item.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.title} />
                          : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Film className="w-8 h-8 text-zinc-600" /></div>
                        }
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <Play className="w-10 h-10 fill-white text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm truncate text-white">{item.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Purchased</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                <p className="text-lg mb-2">No purchases yet</p>
                <p className="text-sm">Buy individual videos for $4.99 or become a member for unlimited access.</p>
              </div>
            )}
          </div>

        ) : (
          /* ── HERO + ROWS (Home / Videos / Music / Private) ───────────── */
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
                    {(heroItem.genres?.length > 0 || heroItem.genre || heroItem.type) && (
                      <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
                        {heroItem.genres?.slice(0, 2).join(' · ') || heroItem.genre || heroItem.type}
                      </p>
                    )}
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none line-clamp-2 text-white"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 4px 40px rgba(0,0,0,0.7)' }}>
                      {heroItem.title}
                    </h1>
                    <div className="flex items-center gap-3 text-sm font-semibold text-white/80 mb-4">
                      {heroItem.year && <span>{heroItem.year}</span>}
                      {heroItem.rating && <span className="border border-white/40 px-1.5 py-0.5 rounded text-xs">{heroItem.rating}</span>}
                      {heroItem.duration && heroItem.duration !== '0:00' && <span>{heroItem.duration}</span>}
                      {!heroIsVideo && <span className="border border-white/40 px-1.5 py-0.5 rounded text-xs bg-black/20">HD</span>}
                    </div>
                    {heroItem.description && (
                      <p className="text-base text-gray-300 mb-8 line-clamp-3 max-w-xl leading-relaxed">{heroItem.description}</p>
                    )}
                    {!heroItem.description && !heroIsVideo && heroItem.artist && (
                      <p className="text-base text-gray-300 mb-8">
                        {heroItem.artist}{heroItem.album ? ` — ${heroItem.album}` : ''}
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
            <div className={cn("relative z-10 pb-36 space-y-8 px-4 md:pl-12", heroItem ? "-mt-24" : "pt-24")}>
              {activeCategory === 'home' && (
                <>
                  {/* ── WATCH: all video content grouped together ─────────── */}
                  {hasVideos && (
                    <>
                      <SectionHeading icon={Film} title="Watch" subtitle="Movies, series & clips" />
                      {categoryRows.map(cat => cat.items.length > 0 && (
                        <MediaRow key={cat.id} title={cat.name} items={cat.items} onPlay={playVideo} />
                      ))}
                      {hhVideos.length > 0 && <MediaRow title="The Homies" items={hhVideos} onPlay={playVideo} isGrid />}
                      {trendingVideos.length > 0 && <MediaRow title="Trending Now" items={trendingVideos} onPlay={playVideo} />}
                      {newVideos.length > 0 && <MediaRow title="New on DIGITVL" items={newVideos} onPlay={playVideo} />}
                      {movies.length > 0 && <MediaRow title="Movies" items={movies} onPlay={playVideo} />}
                      {series.length > 0 && <MediaRow title="Series" items={series} onPlay={playVideo} />}
                      {smartVideoRows.map(({ title, items }) => (
                        <MediaRow key={title} title={title} items={items} onPlay={playVideo} />
                      ))}
                    </>
                  )}

                  {/* ── LISTEN: music, segmented by genre (full browse in Music tab) ── */}
                  {allTracks.length > 0 && (
                    <>
                      <div className="flex items-end justify-between">
                        <SectionHeading icon={Music2} title="Listen"
                          subtitle={`${allTracks.length} tracks across ${musicGenres.length} genres`} />
                        <button onClick={() => setActiveCategory('music')}
                          className="text-sm font-semibold text-red-500 hover:text-red-400 shrink-0 pb-1">
                          Browse all →
                        </button>
                      </div>
                      {(topTracks.length ? topTracks : allTracks.slice(0, 10)).length >= 5 && (
                        <MediaRow title="Top 10" items={(topTracks.length ? topTracks : allTracks.slice(0, 10))} isRanked />
                      )}
                      {genreRows.map(({ genre, items }) => (
                        <MediaRow key={genre} title={`${genre} · ${items.length}`} items={items} />
                      ))}
                    </>
                  )}
                </>
              )}
              {activeCategory === 'videos' && (
                <>
                  {categoryRows.map(cat => cat.items.length > 0 && (
                    <MediaRow key={cat.id} title={cat.name} items={cat.items} onPlay={playVideo} />
                  ))}
                  {hhVideos.length > 0 && <MediaRow title="The Homies" items={hhVideos} onPlay={playVideo} isGrid />}
                  {trendingVideos.length > 0 && <MediaRow title="Trending Now" items={trendingVideos} onPlay={playVideo} />}
                  {newVideos.length > 0 && <MediaRow title="New Releases" items={newVideos} onPlay={playVideo} />}
                  {movies.length > 0 && <MediaRow title="Movies" items={movies} onPlay={playVideo} />}
                  {movies.length >= 5 && <MediaRow title="Top 10 Movies" items={movies.slice(0, 10)} isRanked onPlay={playVideo} />}
                  {series.length > 0 && <MediaRow title="Series" items={series} onPlay={playVideo} />}
                  {smartVideoRows.map(({ title, items }) => (
                    <MediaRow key={title} title={title} items={items} onPlay={playVideo} />
                  ))}
                  {!videoLoading && !trendingVideos.length && !newVideos.length && !movies.length && !hhVideos.length && !categoryRows.length && (
                    <div className="text-center py-20 text-zinc-500">
                      <Film className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                      <p>No videos uploaded yet. Check back soon.</p>
                    </div>
                  )}
                </>
              )}
              {activeCategory === 'music' && (
                <>
                  {/* ── Catalog controls: isolated search · genre filter · view ── */}
                  <div className="space-y-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {/* Isolated music search — parses ONLY the music catalog */}
                      <div className="flex items-center gap-2 bg-black/40 border border-zinc-700 focus-within:border-red-500 rounded-full px-4 py-2.5 w-full md:max-w-md transition-colors">
                        <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          placeholder={`Search ${allTracks.length} tracks — title, artist, genre…`}
                          className="bg-transparent border-none focus:ring-0 text-sm w-full text-white placeholder:text-zinc-500 outline-none"
                          value={musicSearch}
                          onChange={e => setMusicSearch(e.target.value)}
                        />
                        {musicSearch && (
                          <button onClick={() => setMusicSearch('')} className="text-zinc-400 hover:text-white shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* View toggle: genre rows vs full grid */}
                      <div className="flex items-center gap-1 bg-black/40 border border-zinc-700 rounded-full p-1 shrink-0 self-start">
                        <button
                          onClick={() => setMusicView('rows')}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                            musicView === 'rows' && !musicIsFiltering ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white")}
                          title="Browse by genre">
                          <List className="w-3.5 h-3.5" /> Genres
                        </button>
                        <button
                          onClick={() => setMusicView('grid')}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                            musicView === 'grid' || musicIsFiltering ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white")}
                          title="See the whole catalog">
                          <LayoutGrid className="w-3.5 h-3.5" /> All {allTracks.length > 0 && `(${allTracks.length})`}
                        </button>
                      </div>
                    </div>

                    {/* Genre filter chips */}
                    {musicGenres.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setMusicGenre('all')}
                          className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                            musicGenre === 'all' ? "bg-white text-black border-white" : "bg-transparent text-zinc-300 border-zinc-700 hover:border-zinc-500")}>
                          All Genres
                        </button>
                        {musicGenres.map(({ genre, count }) => (
                          <button
                            key={genre}
                            onClick={() => setMusicGenre(g => g === genre ? 'all' : genre)}
                            className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                              musicGenre === genre ? "bg-red-600 text-white border-red-600" : "bg-transparent text-zinc-300 border-zinc-700 hover:border-zinc-500")}>
                            {genre} <span className="opacity-60">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {catalogLoading && allTracks.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                    </div>
                  ) : musicIsFiltering || musicView === 'grid' ? (
                    /* ── FULL GRID — the entire (filtered) catalog, paginated ── */
                    musicFiltered.length > 0 ? (
                      <MediaRow
                        title={
                          musicSearch.trim()
                            ? `Results for "${musicSearch.trim()}" (${musicFiltered.length})`
                            : musicGenre !== 'all'
                              ? `${musicGenre} (${musicFiltered.length})`
                              : `All Tracks (${musicFiltered.length})`
                        }
                        items={musicFiltered}
                        isGrid
                      />
                    ) : (
                      <div className="text-center py-20 text-zinc-500">
                        <Music2 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                        <p>No tracks match your search or filter.</p>
                      </div>
                    )
                  ) : sectionView ? (
                    /* ── SECTION GALLERY — a section opened full-page, paginated ── */
                    <div>
                      <button
                        onClick={() => setSectionView(null)}
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white mb-4"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to browse
                      </button>
                      <MediaRow
                        title={`${sectionView.title} (${sectionView.items.length})`}
                        items={sectionView.items}
                        isGrid
                        isRanked={!!sectionView.ranked}
                      />
                    </div>
                  ) : (
                    /* ── GENRE-SEGMENTED ROWS (default browse) ────────────────── */
                    <>
                      {top10.length >= 5 && (
                        <MediaRow title="Top 10" items={top10} isRanked
                          onTitleClick={() => setSectionView({ title: 'Top 10', items: top10, ranked: true })} />
                      )}
                      {newReleases.length > 0 && (
                        <MediaRow title="New Releases" items={newReleases}
                          onTitleClick={() => setSectionView({ title: 'New Releases', items: newReleases })} />
                      )}
                      {likedMedia.length > 0 && (
                        <MediaRow title="Liked Tracks" items={likedMedia}
                          onTitleClick={() => setSectionView({ title: 'Liked Tracks', items: likedMedia })} />
                      )}
                      {genreRows.map(({ genre, items }) => (
                        <MediaRow key={genre} title={`${genre} · ${items.length}`} items={items}
                          onTitleClick={() => setSectionView({ title: genre, items })} />
                      ))}
                      {/* Everything else that didn't land in a genre row */}
                      {allTracks.some(t => !t.genre) && (
                        <MediaRow title="More from the Catalog" items={allTracks.filter(t => !t.genre)}
                          onTitleClick={() => setSectionView({ title: 'More from the Catalog', items: allTracks.filter(t => !t.genre) })} />
                      )}
                    </>
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

      <VideoPurchaseGate />
      <ManagePlaylistsModal isOpen={isPlaylistManagerOpen} onClose={() => setPlaylistManagerOpen(false)} />


    </div>
  );
};

export default MediaApp;
