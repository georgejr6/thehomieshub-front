import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Lock, Play } from 'lucide-react';
import { durationLabel, openSpace } from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';

// One card in the home feed: Spaces live now and recent replays, tap to open.
// Works signed out (guests can listen for 2 minutes).
export default function SpacesFeedCards({ live = [], replays = [], index }) {
  const navigate = useNavigate();
  const row = (s, isLive) => {
    const host = s.host?.displayName || s.host?.username;
    return (
      <button key={`${isLive ? 'l' : 'r'}-${s.id}`} type="button" onClick={() => openSpace(navigate, s.id)}
        className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${isLive ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
        <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider">
          {isLive
            ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />LIVE SPACE</span>
            : <span className="inline-flex items-center gap-1 text-primary"><Play className="h-3 w-3" />REPLAY{s.replay?.durationSec ? ` \u00b7 ${durationLabel(s.replay.durationSec)}` : ''}</span>}
          {s.membersOnly && <Lock className="h-3 w-3 text-white/60" />}
        </div>
        <div className="line-clamp-2 break-words text-sm font-bold leading-snug text-white">{s.title}</div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <SpaceAvatar name={host} url={s.host?.avatarUrl} size={22} />
          <span className="min-w-0 flex-1 truncate">{host}</span>
          {isLive
            ? <span className="inline-flex shrink-0 items-center gap-1"><Headphones className="h-3 w-3" />{s.listenerCount || 0}</span>
            : s.peakListeners > 0 && <span className="shrink-0">{s.peakListeners} listened</span>}
        </div>
      </button>
    );
  };
  return (
    <div data-index={index} className="relative flex h-[100svh] w-full shrink-0 snap-start flex-col overflow-hidden bg-black">
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+10.5rem)] pt-5 md:pb-24">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Spaces</div>
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {live.slice(0, 4).map((s) => row(s, true))}
          {replays.slice(0, 4).map((s) => row(s, false))}
        </div>
      </div>
    </div>
  );
}
