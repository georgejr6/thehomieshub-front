import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, Loader2 } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { shouldShowPill, pillLabel, songPath, trackKey, readDismissed, saveDismissed } from '@/lib/nowPlaying';

// Small "♪ Title · Artist" pill in the chat header while music is loaded:
// play/pause, tap the title for the song page, ✕ hides it until a different
// track starts (this session only).
// variant "header": in the chat header, sm+ only. "bar": a slim row under
// the header on phones (the header's controls already fill a phone's width).
export default function NowPlayingPill({ variant = 'header' }) {
  const media = useMedia() || {};
  const { currentTrack, isPlaying, isLoading, togglePlay, hasEnteredMediaMode, currentVideo, audioRef } = media;
  const navigate = useNavigate();
  const [dismissedId, setDismissedId] = useState(readDismissed);

  const show = shouldShowPill({
    track: currentTrack,
    hasEnteredMediaMode,
    hasSource: !!audioRef?.current?.getAttribute?.('src'),
    currentVideo,
    dismissedId,
  });
  if (!show) return null;

  const label = pillLabel(currentTrack);
  const path = songPath(currentTrack);
  const dismiss = () => {
    const id = trackKey(currentTrack);
    saveDismissed(id);
    setDismissedId(id);
  };

  return (
    <div className={variant === 'bar'
      ? 'chat-fade-in flex h-8 shrink-0 items-center gap-0.5 border-b border-[#1F2023] px-3 text-sm text-[#DBDEE1] sm:hidden'
      : 'chat-fade-in hidden max-w-[16rem] shrink-0 items-center gap-0.5 rounded-full bg-white/[0.06] py-0.5 pl-1 pr-0.5 text-sm text-[#DBDEE1] sm:flex lg:max-w-[20rem]'}
      data-testid="now-playing-pill">
      <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} title={isPlaying ? 'Pause' : 'Play'}
        className="shrink-0 rounded-full p-1 text-white transition-colors hover:bg-white/10 active:scale-95">
        {isLoading && !isPlaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={() => path && navigate(path)} disabled={!path} title={label}
        className="min-w-0 flex-1 truncate px-1 text-left font-medium hover:underline disabled:no-underline">
        <span aria-hidden className="mr-1 text-[#949BA4]">♪</span>{label}
      </button>
      <button type="button" onClick={dismiss} aria-label="Hide now playing" title="Hide"
        className="shrink-0 rounded-full p-1 text-[#949BA4] transition-colors hover:bg-white/10 hover:text-white">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
