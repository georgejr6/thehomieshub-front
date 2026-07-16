import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Play, Pause, Heart, Share2, Repeat, ArrowLeft, Music, Loader2 } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { musicApi } from '@/lib/digitvlApi';

// Dedicated per-song page (/song/:id and /track/:id).
// Opening a share link lands here, auto-plays the track through the shared
// MusicPlayer, and — once it ends and the user isn't looping — the MediaContext
// auto-advances to the most-popular track next.
const SongPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    allTracks, top10, playMedia, currentTrack, isPlaying, isLoading, togglePlay,
    isLiked, toggleLike, repeatOne, toggleRepeat,
  } = useMedia();

  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const autoPlayedFor = useRef(null); // song id we've already auto-started

  // Resolve the track: prefer the already-loaded catalog, else fetch it cold.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const fromCatalog = allTracks.find(t => String(t.id) === String(id));
    if (fromCatalog) {
      setTrack(fromCatalog);
      setLoading(false);
      return () => { cancelled = true; };
    }
    musicApi.getTrack(id).then(t => {
      if (cancelled) return;
      if (t) setTrack(t);
      else setNotFound(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, allTracks]);

  // Auto-play once per song when it resolves (a share link should start playing).
  useEffect(() => {
    if (!track?.audioUrl) return;
    if (autoPlayedFor.current === track.id) return;
    if (String(currentTrack?.id) === String(track.id)) { autoPlayedFor.current = track.id; return; }
    autoPlayedFor.current = track.id;
    playMedia(track);
  }, [track, currentTrack?.id, playMedia]);

  const isThis = String(currentTrack?.id) === String(track?.id);
  const showPause = isThis && isPlaying;

  const handlePlay = () => {
    if (!track?.audioUrl) return;
    if (isThis) togglePlay();
    else playMedia(track);
  };

  const handleShare = () => {
    const origin = (typeof window !== 'undefined' && window.location.origin) || 'https://www.thehomies.app';
    const url = `${origin}/track/${track.id}`;
    const title = `${track.title}${track.artist ? ` by ${track.artist}` : ''}`;
    if (navigator.share) navigator.share({ title, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
  };

  // "Up next" = the most-popular tracks (play-ranked), minus this one.
  const upNext = useMemo(
    () => (top10 || []).filter(t => String(t.id) !== String(id)).slice(0, 8),
    [top10, id]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-7 h-7 animate-spin text-gray-500" />
      </div>
    );
  }

  if (notFound || !track) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black text-white px-6 text-center">
        <Music className="w-12 h-12 text-gray-600" />
        <p className="text-lg font-semibold">Song not found</p>
        <p className="text-gray-500 text-sm">This track may have moved or been removed.</p>
        <button onClick={() => navigate('/media/music')}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm">
          Browse music
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-40">
      <Helmet>
        <title>{track.title}{track.artist ? ` · ${track.artist}` : ''}</title>
        <meta name="description" content={`Listen to ${track.title}${track.artist ? ` by ${track.artist}` : ''}`} />
      </Helmet>

      {/* Ambient cover backdrop */}
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-30"
          style={{ backgroundImage: `url(${track.cover})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />

        <div className="relative z-10 max-w-5xl mx-auto px-5 pt-5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col sm:flex-row gap-7 items-center sm:items-end">
            <img src={track.cover} alt={track.title}
              className="w-52 h-52 sm:w-60 sm:h-60 rounded-2xl object-cover shadow-2xl flex-shrink-0"
              onError={e => { e.target.src = `https://picsum.photos/seed/${track.id}/400/400`; }} />
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Song</p>
              <h1 className="text-3xl sm:text-5xl font-black leading-tight break-words">{track.title}</h1>
              <p className="text-lg text-gray-300 mt-2">{track.artist}</p>
              <div className="flex items-center gap-2 justify-center sm:justify-start mt-2 flex-wrap">
                {track.genre && <span className="text-xs uppercase tracking-wider text-gray-500">{track.genre}</span>}
                {track.explicit && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">EXPLICIT</span>}
              </div>

              <div className="flex items-center gap-3 justify-center sm:justify-start mt-6">
                <button onClick={handlePlay} disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-black rounded-full h-14 w-14 flex items-center justify-center disabled:opacity-50 shadow-lg">
                  {isLoading && isThis
                    ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    : showPause ? <Pause className="w-7 h-7 fill-black" /> : <Play className="w-7 h-7 fill-black ml-0.5" />}
                </button>
                <button onClick={() => toggleLike(track)}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Like">
                  <Heart className={`w-5 h-5 ${isLiked(track.id) ? 'text-red-500 fill-current' : 'text-white'}`} />
                </button>
                <button onClick={toggleRepeat}
                  className={`p-3 rounded-full transition-colors ${repeatOne ? 'bg-primary/20 text-primary' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  title={repeatOne ? 'Looping this song' : 'Loop this song'}>
                  <Repeat className="w-5 h-5" />
                </button>
                <button onClick={handleShare}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title="Share">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Up next — most popular */}
      {upNext.length > 0 && (
        <div className="max-w-5xl mx-auto px-5 mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Up next · Popular</h2>
          <div className="space-y-1">
            {upNext.map((t, i) => (
              <Link key={t.id} to={`/song/${t.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                <span className="w-5 text-center text-gray-500 text-sm">{i + 1}</span>
                <img src={t.cover} alt="" className="w-11 h-11 rounded object-cover flex-shrink-0"
                  onError={e => { e.target.src = `https://picsum.photos/seed/${t.id}/100/100`; }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate group-hover:text-primary transition-colors">{t.title}</p>
                  <p className="text-sm text-gray-500 truncate">{t.artist}</p>
                </div>
                <Play className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongPage;
