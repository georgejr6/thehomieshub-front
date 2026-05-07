import React, { createContext, useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { musicApi, videoApi } from '@/lib/digitvlApi';
import { frogzApi } from '@/lib/frogzApi';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';

const MediaContext = createContext();
export const useMedia = () => useContext(MediaContext);

export const MediaProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const hasFrogzAccess = Array.isArray(user?.tags) && user.tags.includes('freakyfrogz');
  const hasFrogzFan    = Array.isArray(user?.tags) && user.tags.includes('freakyfrogz_fan');

  // ── Music Catalog ──────────────────────────────────────────────────────────
  const [allTracks,      setAllTracks]      = useState([]);
  const [genreRows,      setGenreRows]      = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // ── Video Catalog ──────────────────────────────────────────────────────────
  const [featuredVideo,   setFeaturedVideo]   = useState(null);
  const [trendingVideos,  setTrendingVideos]  = useState([]);
  const [newVideos,       setNewVideos]       = useState([]);
  const [movies,          setMovies]          = useState([]);
  const [series,          setSeries]          = useState([]);
  const [videoLoading,    setVideoLoading]    = useState(true);

  // ── HomieshHub Video Catalog ───────────────────────────────────────────────
  const [hhVideos, setHhVideos] = useState([]);

  // ── Admin-managed category rows ────────────────────────────────────────────
  const [categoryRows,       setCategoryRows]       = useState([]);
  const [categoryRowsLoading, setCategoryRowsLoading] = useState(true);

  // ── Frogz Catalog ─────────────────────────────────────────────────────────
  const [frogzClips,     setFrogzClips]     = useState([]);   // public shorts
  const [frogzFeatured,  setFrogzFeatured]  = useState(null); // paid only
  const [frogzTrending,  setFrogzTrending]  = useState([]);   // paid only
  const [frogzNew,       setFrogzNew]       = useState([]);   // paid only
  const [frogzLoading,   setFrogzLoading]   = useState(false);

  // ── Current Video Player ───────────────────────────────────────────────────
  const [currentVideo,    setCurrentVideo]    = useState(null);

  // ── Purchases — individual video purchases by non-members ─────────────────
  const [purchases,    setPurchases]    = useState([]); // full VideoPurchase docs
  const [gatedVideo,   setGatedVideo]   = useState(null); // video item awaiting gate decision

  // ── Audio Player ───────────────────────────────────────────────────────────
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [volume,         setVolume]         = useState([80]);
  const [isMuted,        setIsMuted]        = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [showWarning,         setShowWarning]         = useState(false);
  const [hasEnteredMediaMode, setHasEnteredMediaMode] = useState(false);
  const [activeCategory,      setActiveCategory]      = useState('home');
  const [likedIds,            setLikedIds]            = useState([]);
  const [playlists,           setPlaylists]           = useState([]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioRef     = useRef(null);
  const isFirstRef   = useRef(true);
  const tracksRef    = useRef([]);
  const trackRef     = useRef(null);
  const isPlayingRef = useRef(false);

  // Pending video to play after login (set by gate's "Sign In" / "Create Account" buttons)
  const pendingPlayRef = useRef(null);
  const prevUserRef    = useRef(null);
  // Stable refs so the login-detection effect doesn't need navigate/playVideo as deps
  const navigateRef    = useRef(navigate);
  const playVideoRef   = useRef(null); // populated after playVideo is defined below

  useEffect(() => { tracksRef.current    = allTracks;    }, [allTracks]);
  useEffect(() => { trackRef.current     = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying;    }, [isPlaying]);

  // ── Fetch music catalog ────────────────────────────────────────────────────
  useEffect(() => {
    musicApi.getNew()
      .then(tracks => {
        setAllTracks(tracks);
        const map = {};
        tracks.forEach(t => {
          if (t.genre) {
            if (!map[t.genre]) map[t.genre] = [];
            map[t.genre].push(t);
          }
        });
        const rows = Object.entries(map)
          .filter(([, items]) => items.length >= 2)
          .map(([genre, items]) => ({ genre, items }));
        setGenreRows(rows);
        if (tracks.length > 0) setCurrentTrack(tracks[0]);
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false));
  }, []);

  // ── Fetch video catalog ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/media/featured').then(r => r.data || null).catch(() => null),
      videoApi.getTrending().catch(() => []),
      videoApi.getNew().catch(() => []),
      videoApi.getMovies().catch(() => []),
      videoApi.getSeries().catch(() => []),
    ]).then(([featured, trending, newVids, movs, sers]) => {
      setFeaturedVideo(featured);
      setTrendingVideos(trending);
      setNewVideos(newVids);
      setMovies(movs);
      setSeries(sers);
    }).finally(() => setVideoLoading(false));
  }, []);

  // ── Fetch frogz catalog ────────────────────────────────────────────────────
  useEffect(() => {
    // Public clips: fetch for fans and paid users
    if (!hasFrogzFan && !hasFrogzAccess) return;
    frogzApi.getClips().then(setFrogzClips).catch(() => {});
  }, [hasFrogzFan, hasFrogzAccess]);

  useEffect(() => {
    // Full catalog: paid users only
    if (!hasFrogzAccess) return;
    setFrogzLoading(true);
    Promise.all([
      frogzApi.getFeatured().catch(() => null),
      frogzApi.getTrending().catch(() => []),
      frogzApi.getNew().catch(() => []),
    ]).then(([featured, trending, newVids]) => {
      setFrogzFeatured(featured);
      setFrogzTrending(trending);
      setFrogzNew(newVids);
    }).finally(() => setFrogzLoading(false));
  }, [hasFrogzAccess]);

  const requestFrogzAccess = useCallback(async (plan) => {
    return frogzApi.requestAccess(plan);
  }, []);

  // ── Fetch HomieshHub videos + reels for media mode library ────────────────
  const normalizeHhItem = useCallback((item, backendType) => {
    const playbackId = item.muxPlaybackId || null;
    if (!playbackId) return null;
    return {
      id:            item._id || item.id,
      title:         item.title || item.caption || 'Untitled',
      description:   item.description || item.caption || '',
      muxPlaybackId: playbackId,
      cover:         item.thumbnailUrl || item.thumbnail || `https://image.mux.com/${playbackId}/thumbnail.png?width=400`,
      backdropUrl:   `https://image.mux.com/${playbackId}/thumbnail.png?width=1280`,
      backdropImages: Array.isArray(item.backdropImages) ? item.backdropImages : [],
      mediaKind:     'video',
      backendType,
      user:          item.creator,
    };
  }, []);

  const refreshHhVideos = useCallback(() => {
    Promise.all([
      api.get('/user/videos', { params: { page: 1, limit: 100 } }).catch(() => null),
      api.get('/user/reels',  { params: { page: 1, limit: 100 } }).catch(() => null),
    ]).then(([vResp, rResp]) => {
      const videos = vResp?.data?.result?.items ?? vResp?.data?.result ?? [];
      const reels  = rResp?.data?.result?.items ?? rResp?.data?.result ?? [];
      const mapped = [
        ...Array.isArray(videos) ? videos.map(v => normalizeHhItem(v, 'video')) : [],
        ...Array.isArray(reels)  ? reels.map(r => normalizeHhItem(r, 'reel'))   : [],
      ].filter(Boolean);
      setHhVideos(mapped);
    });
  }, [normalizeHhItem]);

  useEffect(() => { refreshHhVideos(); }, [refreshHhVideos]);

  // ── Fetch admin category rows ──────────────────────────────────────────────
  const fetchCategoryRows = useCallback(() => {
    setCategoryRowsLoading(true);
    api.get('/media/categories')
      .then(({ data }) => setCategoryRows(data?.result?.categories || []))
      .catch(() => setCategoryRows([]))
      .finally(() => setCategoryRowsLoading(false));
  }, []);

  useEffect(() => { fetchCategoryRows(); }, [fetchCategoryRows]);

  // ── Fetch individual video purchases ──────────────────────────────────────
  const fetchPurchases = useCallback(() => {
    if (!user) { setPurchases([]); return; }
    api.get('/purchases/my')
      .then(({ data }) => setPurchases(data?.result?.purchases || []))
      .catch(() => {});
  }, [user]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const purchasedIds = useMemo(() => new Set(purchases.map(p => p.videoId)), [purchases]);

  const hasPurchased = useCallback((videoId) => purchasedIds.has(String(videoId)), [purchasedIds]);

  const setPendingPlay = useCallback((video) => { pendingPlayRef.current = video; }, []);

  // Redirect the user to Stripe Payment Link for the given video.
  // Returns true if redirect happened, false/throws if it failed.
  const purchaseVideo = useCallback(async (videoId, videoType = 'video') => {
    if (!user) return false;
    const { data } = await api.post(`/purchases/video/${videoId}`, { videoType });
    const url = data?.result?.url;
    if (!url) throw new Error('Could not create checkout session');
    window.location.href = url;
    return true;
  }, [user]);

  // ── Create audio element once ──────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = 0.8;
    audio.preload = 'none';

    const onTime     = () => setCurrentTime(audio.currentTime);
    const onDuration = () => { if (!isNaN(audio.duration)) setDuration(audio.duration); };
    const onEnded    = () => {
      setIsPlaying(false);
      const tks = tracksRef.current;
      const cur = trackRef.current;
      if (!tks.length) return;
      const idx = tks.findIndex(t => t.id === cur?.id);
      _loadTrack(tks[(idx + 1) % tks.length], true);
    };

    audio.addEventListener('timeupdate',     onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended',          onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended',          onEnded);
    };
  }, []); // eslint-disable-line

  // ── Volume ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
  }, [volume, isMuted]);

  // ── Load a track ───────────────────────────────────────────────────────────
  const _loadTrack = useCallback((track, autoplay) => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;

    setCurrentTrack(track);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audio.src = track.audioUrl;
    audio.load();

    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error',   onError);
      setIsLoading(false);
      if (autoplay) audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };
    const onError = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error',   onError);
      setIsLoading(false);
    };
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error',   onError);
  }, []);

  // ── Audio controls ─────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [isPlaying, isLoading]);

  const seek = useCallback((val) => {
    if (audioRef.current) { audioRef.current.currentTime = val[0]; setCurrentTime(val[0]); }
  }, []);

  const skipForward = useCallback(() => {
    const tks = tracksRef.current;
    const cur = trackRef.current;
    if (!tks.length) return;
    const idx = tks.findIndex(t => t.id === cur?.id);
    _loadTrack(tks[(idx + 1) % tks.length], true);
  }, [_loadTrack]);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const tks = tracksRef.current;
    const cur = trackRef.current;
    if (!tks.length) return;
    const idx = tks.findIndex(t => t.id === cur?.id);
    _loadTrack(tks[(idx - 1 + tks.length) % tks.length], true);
  }, [_loadTrack]);

  const playMedia = useCallback((track) => {
    isFirstRef.current = false;
    _loadTrack(track, true);
  }, [_loadTrack]);

  // ── Video controls ─────────────────────────────────────────────────────────
  const playVideo = useCallback((video) => {
    const videoId = video?.id || video?._id;
    if (isPremium || isAdmin || hasPurchased(videoId)) {
      if (audioRef.current && isPlayingRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setCurrentVideo(video);
      if (!video.isHH && !video.backendType) videoApi.logView(video.id);
    } else {
      setGatedVideo(video);
    }
  }, [isPremium, isAdmin, hasPurchased]);

  // Keep playVideoRef current so the login effect can call it without stale closures
  useEffect(() => { playVideoRef.current = playVideo; }, [playVideo]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // After login: navigate to /media and play the pending video (if any)
  useEffect(() => {
    if (!prevUserRef.current && user && pendingPlayRef.current) {
      const video = pendingPlayRef.current;
      pendingPlayRef.current = null;
      navigateRef.current('/media');
      // Allow navigation + auth state to settle before gating check
      setTimeout(() => playVideoRef.current?.(video), 80);
    }
    prevUserRef.current = user;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeVideo = useCallback(() => setCurrentVideo(null), []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const enterMediaMode        = () => setShowWarning(true);
  const confirmEnterMediaMode = () => { setShowWarning(false); setHasEnteredMediaMode(true); navigate('/media'); };
  const cancelEnterMediaMode  = () => setShowWarning(false);
  const exitMediaMode         = () => { setHasEnteredMediaMode(false); navigate('/'); };
  const minimizeMediaMode     = () => navigate('/');
  const expandMediaMode       = () => navigate('/media');

  // Close just the player bar without navigating away
  const closePlayer = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); }
    setIsPlaying(false);
    setHasEnteredMediaMode(false);
  }, []);

  // ── Likes / playlists ──────────────────────────────────────────────────────
  const isLiked    = (id) => likedIds.includes(id);
  const toggleLike = (item) => setLikedIds(p => p.includes(item.id) ? p.filter(x => x !== item.id) : [...p, item.id]);
  const likedMedia = allTracks.filter(t => likedIds.includes(t.id));

  const createPlaylist = (name) => setPlaylists(p => [...p, { id: Date.now(), name, items: [] }]);
  const deletePlaylist = (id)   => setPlaylists(p => p.filter(x => x.id !== id));
  const addToPlaylist  = (pid, item) => setPlaylists(p => p.map(x => x.id === pid ? { ...x, items: [...x.items, item] } : x));

  const fmtTime = (s) => {
    const m = Math.floor((s || 0) / 60);
    const sec = Math.floor((s || 0) % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <MediaContext.Provider value={{
      // Music
      allTracks, genreRows, catalogLoading,
      audioRef, currentTrack, isPlaying, isLoading,
      currentTime, duration, volume, isMuted, setVolume, setIsMuted,
      togglePlay, seek, skipForward, skipBack, playMedia, fmtTime,
      // Video
      featuredVideo, trendingVideos, newVideos, movies, series, videoLoading,
      currentVideo, playVideo, closeVideo,
      // Frogz
      hasFrogzFan, hasFrogzAccess,
      frogzClips, frogzFeatured, frogzTrending, frogzNew, frogzLoading,
      requestFrogzAccess,
      // UI
      showWarning, hasEnteredMediaMode,
      enterMediaMode, confirmEnterMediaMode, cancelEnterMediaMode,
      exitMediaMode, minimizeMediaMode, expandMediaMode, closePlayer,
      likedMedia, likedIds, isLiked, toggleLike,
      playlists, createPlaylist, deletePlaylist, addToPlaylist,
      activeCategory, setActiveCategory,
      // HomieshHub videos
      hhVideos, refreshHhVideos,
      // Admin category rows
      categoryRows, categoryRowsLoading, fetchCategoryRows,
      // Purchases
      purchases, purchasedIds, hasPurchased, purchaseVideo, fetchPurchases,
      gatedVideo, setGatedVideo,
      setPendingPlay,
      // legacy compat
      popularVideos: allTracks,
      newReleases: [...allTracks].slice().reverse(),
      isFullscreenPlayer: false,
      closeFullscreen: () => {},
    }}>
      {children}
    </MediaContext.Provider>
  );
};
