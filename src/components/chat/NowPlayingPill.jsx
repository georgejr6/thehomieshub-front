import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, Loader2 } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { shouldShowPill, pillLabel, songPath, trackKey, readDismissed, saveDismissed } from '@/lib/nowPlaying';

// Small "♪ Title · Artist" pill in the chat header while music is loaded:
// play/pause, tap the title for the song page, ✕ hides it until a different
// track starts (this session only).
// variant "header": in the chat header, 2xl (1536px+) only — narrower headers
// already fill up with the channel name, topic, search and points. "bar": a
// slim row under the header below 2xl (phones, tablets, laptops).
const DISMISS_EVENT = 'hh:chat-np-dismissed';

export default function NowPlayingPill({ variant = 'header' }) {
  const media = useMedia() || {};
  const { currentTrack, isPlaying, isLoading, togglePlay, hasEnteredMediaMode, currentVideo, audioRef } = media;
  const navigate = useNavigate();
  const [dismissedId, setDismissedId] = useState(readDismissed);
  // Header pill and phone bar are two instances: keep them in step so a
  // dismissal survives a resize across the 2xl breakpoint.
  useEffect(() => {
    const sync = (e) => setDismissedId(e.detail || '');
    window.addEventListener(DISMISS_EVENT, sync);
    return () => window.removeEventListener(DISMISS_EVENT, sync);
  }, []);

  const show = shouldShowPill({
    track: currentTrack,
    hasEnteredMediaMode,
    hasSource: !!audioRef?.current?.getAttribute?.('src'),
    currentVideo,
    dismissedId,
  });
  if (!show) return null;

  const bar = variant === 'bar';
  // The bar is the phone/tablet control row: bigger tap targets than the header pill.
  const btn = bar ? 'p-2' : 'p-1';
  const label = pillLabel(currentTrack);
  const path = songPath(currentTrack);
  const dismiss = () => {
    const id = trackKey(currentTrack);
    saveDismissed(id);
    setDismissedId(id);
    window.dispatchEvent(new CustomEvent(DISMISS_EVENT, { detail: id }));
  };

  return (
    <div className={bar
      ? 'chat-fade-in flex h-9 shrink-0 items-center gap-0.5 border-b border-[#1F2023] px-2 text-sm text-[#DBDEE1] 2xl:hidden'
      : 'chat-fade-in hidden min-w-0 max-w-[16rem] items-center gap-0.5 rounded-full bg-white/[0.06] py-0.5 pl-1 pr-0.5 text-sm text-[#DBDEE1] 2xl:flex'}
      data-testid="now-playing-pill">
      <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} title={isPlaying ? 'Pause' : 'Play'}
        className={`shrink-0 rounded-full ${btn} text-white transition-colors hover:bg-white/10 active:scale-95`}>
        {isLoading && !isPlaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={() => path && navigate(path)} disabled={!path} title={label}
        className="min-w-0 flex-1 truncate px-1 text-left font-medium hover:underline disabled:no-underline">
        <span aria-hidden className="mr-1 text-[#949BA4]">♪</span>{label}
      </button>
      <button type="button" onClick={dismiss} aria-label="Hide now playing" title="Hide"
        className={`shrink-0 rounded-full ${btn} text-[#949BA4] transition-colors hover:bg-white/10 hover:text-white`}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
