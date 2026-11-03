import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import useLiveSpacesNow from '@/hooks/useLiveSpacesNow';
import { openSpace } from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';

// "Live Spaces" row for /live: every Space that is live right now, tap to listen in.
// Renders nothing when none are live.
export default function LiveSpacesStrip({ onLoginRequest, className = '' }) {
  const live = useLiveSpacesNow();
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!live.length) return null;
  return (
    <div className={`live-scroll flex gap-2 overflow-x-auto px-3 py-1.5 lg:px-5 ${className}`}>
      {live.map((s) => (
        <button key={s.id} type="button" onClick={() => openSpace(navigate, s.id, user, onLoginRequest)}
          className="flex min-w-[220px] max-w-[300px] shrink-0 items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-left transition-colors hover:bg-emerald-500/20">
          <div className="rounded-full bg-emerald-400 p-[2px]"><SpaceAvatar name={s.host?.displayName || s.host?.username} url={s.host?.avatarUrl} size={30} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />LIVE SPACE{s.membersOnly && <Lock className="h-3 w-3" />}
            </div>
            <div className="truncate text-sm font-bold text-white">{s.title}</div>
            <div className="flex items-center gap-1 truncate text-xs text-white/60">
              {s.host?.displayName || s.host?.username}<span className="mx-1">·</span><Headphones className="h-3 w-3" />{s.listenerCount || 0}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black">Listen</span>
        </button>
      ))}
    </div>
  );
}
