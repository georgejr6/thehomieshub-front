import React from 'react';
import { MicOff } from 'lucide-react';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';

// Shared by the live room and the replay so the speaking ring looks identical.
export const SPACES_CSS = `
@keyframes hh-float { 0% { transform: translate(-50%, 0) scale(.6); opacity: 0 } 15% { opacity: 1; transform: translate(-50%, -12px) scale(1.1) } 100% { transform: translate(-50%, -90px) scale(1); opacity: 0 } }
@keyframes hh-speak { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,.7) } 50% { box-shadow: 0 0 0 7px rgba(52,211,153,0) } }
.hh-speaking { animation: hh-speak 1.1s ease-out infinite; background: #34d399 }
@media (prefers-reduced-motion: reduce) { .hh-speaking { animation: none } }
`;

const ROLE_TAG = { host: 'Host', cohost: 'Cohost' };

export default function SpaceTile({ p, big, floats = [], onTap }) {
  const size = big ? 76 : 52;
  return (
    <button type="button" onClick={onTap} disabled={!onTap}
      className="relative flex min-w-0 flex-col items-center gap-1 rounded-xl p-1 text-center disabled:cursor-default">
      <div className="relative">
        <div className={`rounded-full p-[3px] ${p.speaking && !p.muted ? 'hh-speaking' : 'bg-transparent'}`}>
          <SpaceAvatar name={p.name} url={p.avatarUrl} size={size} />
        </div>
        {big && p.muted && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-zinc-700 text-white"><MicOff className="h-3 w-3" /></span>
        )}
        {p.hand && <span className="absolute -right-1 -top-1 rounded-full bg-background text-base leading-none">✋</span>}
        {floats.filter((f) => f.id === p.id).map((f) => (
          <span key={f.key} className="pointer-events-none absolute left-1/2 top-0 z-10 text-3xl" style={{ animation: 'hh-float 2s ease-out forwards' }}>{f.emoji}</span>
        ))}
      </div>
      <div className={`w-full truncate font-medium ${big ? 'text-sm' : 'text-xs'}`}>{p.name}{p.isLocal ? ' (you)' : ''}</div>
      {ROLE_TAG[p.role] && <div className="-mt-0.5 rounded-full bg-primary/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-primary">{ROLE_TAG[p.role]}</div>}
    </button>
  );
}
