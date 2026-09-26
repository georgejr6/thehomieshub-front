import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Play, Pause, Music2, Volume2, VolumeX, ListMusic } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMedia } from '@/contexts/MediaContext';
import CommentsSheet from '@/components/CommentsSheet';
import ShareDialog from '@/components/ShareDialog';
import { openSignupPrompt } from '@/components/SignupPrompt';
import WaveViz from './WaveViz';
import { cn } from '@/lib/utils';

// A song in the home feed (ContentContext mixes one in every ~6 videos).
// Scroll onto it → the song starts (signed out: the server's 30s preview;
// signed in: the real file, from the top) over its cover with the Media Mode
// wave. Tap / "Open in player" hands off to the full music player at the
// same position (/song/:id). Comments are the song's own thread (targetType
// "music"). Only one thing plays at a time: it stays quiet while the Media
// Mode player is already playing.
const FEED_LISTEN_SECONDS = 30;

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function MusicFeedCard({ post, index, isVisible, onLoginRequest }) {
  const { user } = useAuth();
  const { playMedia, isPlaying: playerIsPlaying, isLiked, toggleLike } = useMedia();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [t, setT] = useState(0);
  const [ended, setEnded] = useState(false);
  const isPreview = post.access === 'preview';
  const limit = isPreview ? (post.previewSeconds || 30) : FEED_LISTEN_SECONDS;

  const track = {
    id: post.trackId, title: post.title, artist: post.artist, cover: post.cover,
    audioUrl: post.audioUrl, type: 'audio', durationSecs: post.duration,
    access: post.access, previewSeconds: post.previewSeconds,
  };
  const liked = isLiked(post.trackId);

  // Play while on screen, stop + rewind when scrolled away.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isVisible && !playerIsPlaying && !ended) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
      if (!isVisible) { a.currentTime = 0; setT(0); setEnded(false); }
    }
  }, [isVisible, playerIsPlaying, ended]);

  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setT(a.currentTime);
    if (a.currentTime >= limit) finish();
  };
  const finish = () => {
    const a = audioRef.current;
    a?.pause();
    setPlaying(false);
    setEnded(true);
    if (isPreview) openSignupPrompt({ kind: 'music', title: `${post.title} · ${post.artist}`, cover: post.cover, redirect: `/song/${post.trackId}` });
  };

  // Hand off to the real player (full song for accounts) at this position.
  const openInPlayer = (e) => {
    e?.stopPropagation();
    const a = audioRef.current;
    const at = a && !ended ? a.currentTime : 0;
    a?.pause();
    setPlaying(false);
    if (isPreview && ended) { finish(); return; }
    playMedia(track, { startAt: at });
    navigate(`/song/${post.trackId}`);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (ended) { a.currentTime = 0; setEnded(false); a.play().then(() => setPlaying(true)).catch(() => {}); return; }
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  };

  const like = (e) => {
    e.stopPropagation();
    if (!user) { onLoginRequest?.({ tab: 'signup', redirect: `/song/${post.trackId}` }); return; }
    toggleLike(track);
  };

  const pct = Math.min(100, (t / limit) * 100);

  return (
    <div data-index={index} className="relative flex h-[100svh] w-full shrink-0 snap-start flex-col overflow-hidden bg-black">
      {/* Blurred cover backdrop */}
      {post.cover && <img src={post.cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/90" />

      <audio
        ref={audioRef}
        src={isVisible || index === 0 ? post.audioUrl : undefined}
        preload={isVisible ? 'auto' : 'none'}
        muted={muted}
        onTimeUpdate={onTime}
        onEnded={finish}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pr-16 sm:pr-6" onClick={openInPlayer}>
        <div className="mb-3 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
          <Music2 className="h-3.5 w-3.5" /> {isPreview ? 'Song preview' : 'Music'}
        </div>

        {/* Cover with the wave under-glow + over-lay */}
        <div className="relative w-[min(72vw,340px)]">
          <WaveViz playing={playing} active={isVisible} className="pointer-events-none absolute -inset-x-10 top-1/2 h-40 w-[calc(100%+5rem)] -translate-y-1/2 opacity-70 blur-[1px]" />
          <div className={cn('relative aspect-square overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 transition-transform duration-500', playing && 'scale-[1.02]')}>
            {post.cover ? (
              <img src={post.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5865F2] to-[#F0B94D]"><Music2 className="h-20 w-20 text-white/80" /></div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
            <WaveViz playing={playing} active={isVisible} className="absolute inset-x-0 bottom-0 h-20 w-full" />
          </div>
        </div>

        <h2 className="mt-6 line-clamp-2 max-w-[80vw] text-center text-2xl font-extrabold text-white">{post.title}</h2>
        <p className="mt-1 text-white/70">{post.artist}</p>

        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg active:scale-95">
            {playing ? <Pause className="h-6 w-6" fill="black" /> : <Play className="ml-0.5 h-6 w-6" fill="black" />}
          </button>
          <button type="button" onClick={openInPlayer}
            className="flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/25">
            <ListMusic className="h-4 w-4" /> {isPreview ? 'Open in player' : 'Full song'}
          </button>
        </div>

        <div className="mt-5 w-[min(72vw,340px)]">
          <div className="h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#F0B94D] transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
          <div className="mt-1 flex justify-between text-[11px] text-white/50"><span>{fmt(t)}</span><span>{isPreview ? `${limit}s preview` : fmt(post.duration || 0)}</span></div>
        </div>
      </div>

      {/* Side controls — same spots as video cards */}
      <div className="absolute bottom-24 right-2 z-20 flex w-[60px] flex-col items-center gap-5 md:bottom-8">
        <button type="button" onClick={like} className="flex flex-col items-center gap-1" aria-label={liked ? 'Unlike' : 'Like'}>
          <Heart className={cn('h-9 w-9 drop-shadow-md', liked ? 'fill-[#FE2C55] text-[#FE2C55]' : 'fill-white/10 text-white')} />
          <span className="text-xs font-semibold text-white drop-shadow-md">Like</span>
        </button>
        <CommentsSheet post={{ ...post, id: post.trackId }} targetType="music" onLoginRequest={() => onLoginRequest?.({ tab: 'signup', redirect: `/song/${post.trackId}` })}>
          <button type="button" className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()} aria-label="Comments">
            <MessageCircle className="h-9 w-9 fill-white/10 text-white drop-shadow-md" />
            <span className="text-xs font-semibold text-white drop-shadow-md">{post.engagement?.comments || 0}</span>
          </button>
        </CommentsSheet>
        <ShareDialog postUrl={`${window.location.origin}/song/${post.trackId}`} postTitle={`${post.title} · ${post.artist}`} post={{ ...post, id: post.trackId, thumbnail: post.cover, backendType: 'music' }}>
          <button type="button" className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()} aria-label="Share">
            <Share2 className="h-9 w-9 fill-white/10 text-white drop-shadow-md" />
            <span className="text-xs font-semibold text-white drop-shadow-md">Share</span>
          </button>
        </ShareDialog>
        <button type="button" onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} aria-label={muted ? 'Unmute' : 'Mute'}
          className="rounded-full bg-black/20 p-2 backdrop-blur-sm hover:bg-black/40">
          {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
        </button>
      </div>
    </div>
  );
}
