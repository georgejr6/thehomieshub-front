import React, { createContext, useState, useContext, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { musicApi } from '@/lib/digitvlApi';

const MediaContext = createContext();
export const useMedia = () => useContext(MediaContext);

export const MediaProvider = ({ children }) => {
  const navigate = useNavigate();

  // ── Catalog ────────────────────────────────────────────────────────────────
  const [allTracks,      setAllTracks]      = useState([]);
  const [genreRows,      setGenreRows]      = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // ── Player ─────────────────────────────────────────────────────────────────
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [volume,         setVolume]         = useState([80]);
  const [isMuted,        setIsMuted]        = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [showWarning,    setShowWarning]    = useState(false);
  const [activeCategory, setActiveCategory] = useState('home');
  const [likedIds,       setLikedIds]       = useState([]);
  const [playlists,      setPlaylists]      = useState([]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioRef     = useRef(null);
  const isFirstRef   = useRef(true);
  const tracksRef    = useRef([]);
  const trackRef     = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => { tracksRef.current   = allTracks;    }, [allTracks]);
  useEffect(() => { trackRef.current    = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying;   }, [isPlaying]);

  // ── Fetch catalog ──────────────────────────────────────────────────────────
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

  // ── Load a track into the audio element ───────────────────────────────────
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

  // ── Controls ───────────────────────────────────────────────────────────────
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

  // ── Navigation ─────────────────────────────────────────────────────────────
  const enterMediaMode        = () => setShowWarning(true);
  const confirmEnterMediaMode = () => { setShowWarning(false); navigate('/media'); };
  const cancelEnterMediaMode  = () => setShowWarning(false);
  const exitMediaMode         = () => navigate('/');
  const minimizeMediaMode     = () => navigate('/');
  const expandMediaMode       = () => navigate('/media');

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
      allTracks, genreRows, catalogLoading,
      audioRef, currentTrack, isPlaying, isLoading,
      currentTime, duration, volume, isMuted, setVolume, setIsMuted,
      togglePlay, seek, skipForward, skipBack, playMedia, fmtTime,
      showWarning, enterMediaMode, confirmEnterMediaMode, cancelEnterMediaMode,
      exitMediaMode, minimizeMediaMode, expandMediaMode,
      likedMedia, likedIds, isLiked, toggleLike,
      playlists, createPlaylist, deletePlaylist, addToPlaylist,
      activeCategory, setActiveCategory,
      // legacy shape kept so MediaRow/PlaylistModals don't break
      popularVideos: allTracks,
      newReleases: [...allTracks].slice().reverse(),
      isFullscreenPlayer: false,
      closeFullscreen: () => {},
    }}>
      {children}
    </MediaContext.Provider>
  );
};
