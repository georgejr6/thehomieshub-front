import React, { createContext, useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { musicApi, videoApi } from '@/lib/digitvlApi';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';
import { trackEvent } from '@/lib/tracker';

const MediaContext = createContext();
export const useMedia = () => useContext(MediaContext);

export const MediaProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  const isAdmin = !!user?.isAdmin;

  // ── Music Catalog ──────────────────────────────────────────────────────────
  const [allTracks,      setAllTracks]      = useState([]);
  const [genreRows,      setGenreRows]      = useState([]);
  const [topTracks,      setTopTracks]      = useState([]);
  const [newReleases,    setNewReleases]    = useState([]);
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

  // ── Current Video Player ───────────────────────────────────────────────────
  const [currentVideo,    setCurrentVideo]    = useState(null);

  // ── Purchases — individual video purchases by non-members ─────────────────
  const [purchases,    setPurchases]    = useState([]); // full VideoPurchase docs
  const [gatedVideo,   setGatedVideo]   = useState(null); // video item awaiting gate decision

  // ── Audio Player ───────────────────────────────────────────────────────────
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  // NOTE: playback position (currentTime/duration) is intentionally NOT kept in
  // this provider. It ticks ~4×/second and would re-render every consumer —
  // including all 100+ media cards — freezing the UI on hover/click. The audio
  // <element> is the source of truth; MusicPlayer reads position locally off
  // audioRef. See MusicPlayer's own currentTime/duration state.
  const [volume,         setVolume]         = useState([80]);
  const [isMuted,        setIsMuted]        = useState(false);
  const [repeatOne,      setRepeatOne]      = useState(false); // loop the current track

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
  // Play-ranked queue (most-popular first) + what we've already auto-played this
  // session + the loop flag — all refs so the mount-once audio 'ended' handler
  // reads live values without being re-created.
  const rankedRef    = useRef([]);
  const playedRef    = useRef(new Set());
  const repeatRef    = useRef(false);
  useEffect(() => { repeatRef.current = repeatOne; }, [repeatOne]);

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
  // Prefer the admin-curated playlists (/music/categories) — that's the FULL
  // library synced from digitvl, one row per playlist (Fresh Drops/trending
  // first). Fall back to the trending-grouped catalog if none are curated yet.
  useEffect(() => {
    (async () => {
      try {
        const cats = await musicApi.getCategories();
        if (cats.length) {
          setGenreRows(cats.map(c => ({ genre: c.name, items: c.items })));
          const flat = [];
          const seen = new Set();
          cats.forEach(c => c.items.forEach(t => {
            if (!seen.has(t.id)) { seen.add(t.id); flat.push(t); }
          }));
          setAllTracks(flat);
          if (flat.length > 0) setCurrentTrack(flat[0]);
          return;
        }
        // Fallback: no curated playlists yet.
        const tracks = await musicApi.getNew();
        setAllTracks(tracks);
        const map = {};
        tracks.forEach(t => {
          if (t.genre) {
            if (!map[t.genre]) map[t.genre] = [];
            map[t.genre].push(t);
          }
        });
        setGenreRows(
          Object.entries(map)
            .filter(([, items]) => items.length >= 2)
            .map(([genre, items]) => ({ genre, items }))
        );
        if (tracks.length > 0) setCurrentTrack(tracks[0]);
      } catch { /* degrade gracefully */ }
      finally { setCatalogLoading(false); }
    })();
  }, []);

  // ── Top 10 (play-ranked, human-seeded) ─────────────────────────────────────
  useEffect(() => { musicApi.getTop(10).then(setTopTracks).catch(() => {}); }, []);

  // ── New Releases (newest uploads, catalog -created_at) ─────────────────────
  useEffect(() => { musicApi.getNewReleases(15).then(setNewReleases).catch(() => {}); }, []);

  // Top 10 padded with the freshest drops when there aren't yet 10 played tracks
  // (young catalog) — so a brand-new release still surfaces on the Top 10 row.
  const top10 = useMemo(() => {
    const base = (topTracks || []).slice(0, 10);
    if (base.length >= 10) return base;
    const have = new Set(base.map(t => t.id));
    const pad = (newReleases || []).filter(t => !have.has(t.id));
    return [...base, ...pad].slice(0, 10);
  }, [topTracks, newReleases]);

  // ── Play-ranked queue for "most popular next" auto-advance ─────────────────
  // Most-popular tracks (play-ranked, see backend /music/top) first, then the
  // rest of the catalog. When a song ends and the user isn't looping, we play
  // the next most-popular track they haven't heard yet this session.
  useEffect(() => {
    const seen = new Set();
    const ranked = [];
    for (const t of [...(topTracks || []), ...(allTracks || [])]) {
      if (t && t.id && t.audioUrl && !seen.has(t.id)) { seen.add(t.id); ranked.push(t); }
    }
    rankedRef.current = ranked;
  }, [topTracks, allTracks]);

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
      api.get('/user/videos', { params: { page: 1, limit: 40 } }).catch(() => null),
      api.get('/user/reels',  { params: { page: 1, limit: 40 } }).catch(() => null),
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

  // NOTE: hhVideos is only consumed inside Media Mode (MediaApp), which fetches
  // it itself when opened. We deliberately do NOT fetch it on provider mount —
  // that made every page load app-wide fire two heavy /user/videos + /user/reels
  // calls for content most visitors never see.

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

    // No timeupdate/durationchange listeners here on purpose — position is read
    // locally by MusicPlayer to keep this provider (and the card grid) from
    // re-rendering on every tick. Only 'ended' matters here (auto-advance).
    const onEnded    = () => {
      setIsPlaying(false);
      // Loop the current track if the user turned repeat on.
      if (repeatRef.current) {
        const a = audioRef.current;
        if (a) { a.currentTime = 0; a.play().then(() => setIsPlaying(true)).catch(() => {}); }
        return;
      }
      const next = _pickNextPopular();
      if (next) _loadTrack(next, true);
    };

    audio.addEventListener('ended',          onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('ended',          onEnded);
    };
  }, []); // eslint-disable-line

  // ── Volume ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
  }, [volume, isMuted]);

  // ── Pick the next most-popular track not yet auto-played this session ───────
  const _pickNextPopular = useCallback(() => {
    const ranked = rankedRef.current;
    const cur = trackRef.current;
    if (!ranked.length) return null;
    let next = ranked.find(t => t.id !== cur?.id && !playedRef.current.has(t.id));
    if (!next) {
      // Heard everything — start the rotation over (keep current out of the pick).
      playedRef.current = new Set(cur?.id ? [cur.id] : []);
      next = ranked.find(t => t.id !== cur?.id);
    }
    return next || null;
  }, []);

  // ── Load a track ───────────────────────────────────────────────────────────
  const _loadTrack = useCallback((track, autoplay) => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;

    if (track.id) playedRef.current.add(track.id); // mark heard (for popular-next)
    setCurrentTrack(track);
    setIsLoading(true);
    setIsPlaying(false);
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
    // Setting audio.currentTime fires 'timeupdate', which MusicPlayer's local
    // listener picks up — no provider state needed.
    if (audioRef.current) { audioRef.current.currentTime = val[0]; }
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
    // Being on the /media route via the mobile nav or a video deep-link doesn't run
    // confirmEnterMediaMode, so hasEnteredMediaMode can still be false here. Set it
    // when playback actually starts so the MusicPlayer bar renders regardless of how
    // the user got into media mode.
    setHasEnteredMediaMode(true);
    _loadTrack(track, true);
    if (track) trackEvent('music_play', { target: { kind: 'music', id: track.id || track._id, title: track.title || track.name } });
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
      trackEvent('video_watch', { target: { kind: video.backendType === 'reel' ? 'reel' : 'video', id: videoId, title: video.title || video.caption } });
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

  // ── Likes / playlists (persisted per user → survive reloads & devices) ───────
  const [likedTracks, setLikedTracks] = useState([]); // snapshots for My Likes

  // Hydrate from the backend when the signed-in user changes.
  useEffect(() => {
    if (!user) { setLikedIds([]); setLikedTracks([]); setPlaylists([]); return; }
    let cancelled = false;
    api.get('/music/me/library')
      .then(({ data }) => {
        if (cancelled) return;
        const r = data?.result || {};
        setLikedIds(r.likedIds || []);
        setLikedTracks(r.likes || []);
        setPlaylists((r.playlists || []).map(p => ({ id: p.id, name: p.name, image: p.image, items: p.items || [] })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.sub]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLiked    = (id) => likedIds.includes(id);
  const toggleLike = (item) => {
    const id = item.id;
    const wasLiked = likedIds.includes(id);
    setLikedIds(p => wasLiked ? p.filter(x => x !== id) : [...p, id]);
    setLikedTracks(p => wasLiked ? p.filter(x => x.id !== id) : [...p, item]);
    if (user) api.post('/music/me/likes', { track: item }).catch(() => {});
  };
  // Prefer LIVE catalog data (fresh covers/titles) over the like-time snapshot,
  // so a track whose cover changed after being liked shows the updated art.
  // Fall back to the snapshot for liked tracks not present in the current catalog.
  const likedMedia = useMemo(() => {
    const liveById = new Map(allTracks.map(t => [t.id, t]));
    const snapById = new Map(likedTracks.map(t => [t.id, t]));
    return likedIds.map(id => liveById.get(id) || snapById.get(id)).filter(Boolean);
  }, [likedIds, likedTracks, allTracks]);

  const createPlaylist = (name, image = '') => {
    if (!name?.trim()) return;
    if (user) {
      api.post('/music/me/playlists', { name: name.trim(), image })
        .then(({ data }) => { const p = data?.result?.playlist; if (p) setPlaylists(prev => [...prev, p]); })
        .catch(() => {});
    } else {
      setPlaylists(prev => [...prev, { id: `local-${Date.now()}`, name: name.trim(), image, items: [] }]);
    }
  };
  const deletePlaylist = (id) => {
    setPlaylists(p => p.filter(x => x.id !== id));
    if (user && !String(id).startsWith('local-')) api.delete(`/music/me/playlists/${id}`).catch(() => {});
  };
  const addToPlaylist  = (pid, item) => {
    setPlaylists(p => p.map(x => x.id === pid
      ? (x.items.some(i => i.id === item.id) ? x : { ...x, items: [...x.items, item] })
      : x));
    if (item && (item.type === 'audio' || item.mediaKind !== 'video')) {
      trackEvent('playlist_add', { target: { kind: 'music', id: item.id || item._id, title: item.title || item.name } });
    }
    if (user && !String(pid).startsWith('local-')) api.post(`/music/me/playlists/${pid}/items`, { track: item }).catch(() => {});
  };

  const fmtTime = (s) => {
    const m = Math.floor((s || 0) / 60);
    const sec = Math.floor((s || 0) % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <MediaContext.Provider value={{
      // Music
      allTracks, genreRows, topTracks, top10, newReleases, catalogLoading,
      audioRef, currentTrack, isPlaying, isLoading,
      volume, isMuted, setVolume, setIsMuted,
      repeatOne, setRepeatOne, toggleRepeat: () => setRepeatOne(v => !v),
      togglePlay, seek, skipForward, skipBack, playMedia, fmtTime,
      // Video
      featuredVideo, trendingVideos, newVideos, movies, series, videoLoading,
      currentVideo, playVideo, closeVideo,
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
      isFullscreenPlayer: false,
      closeFullscreen: () => {},
    }}>
      {children}
    </MediaContext.Provider>
  );
};
