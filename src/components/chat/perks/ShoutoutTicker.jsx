import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

// Active shoutouts pinned along the top of the channel (like Super Chat).
// Each chip drains as its pin time runs out; tap to jump to the message.

export default function ShoutoutTicker({ shoutouts, onJump, onExpire }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!shoutouts?.length) return undefined;
    const t = setInterval(() => {
      setNow(Date.now());
      if (shoutouts.some((s) => new Date(s.special.pinnedUntil) <= new Date())) onExpire();
    }, 1000);
    return () => clearInterval(t);
  }, [shoutouts, onExpire]);

  if (!shoutouts?.length) return null;
  return (
    <div className="chat-fade-in flex shrink-0 gap-2 overflow-x-auto border-b border-[#1F2023] px-3 py-2 [scrollbar-width:none]">
      {shoutouts.map((s) => {
        const end = new Date(s.special.pinnedUntil).getTime();
        const start = new Date(s.createdAt).getTime();
        const left = Math.max(0, Math.min(1, (end - now) / Math.max(1, end - start)));
        const color = s.special.color || '#1E88E5';
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onJump(s.id)}
            title={s.content || 'Shoutout'}
            className="chat-pop relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            style={{ background: `${color}55` }}
          >
            <span className="absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear" style={{ width: `${left * 100}%`, background: color }} />
            <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-black/25">
              {s.author?.avatarUrl ? <img src={s.author.avatarUrl} alt="" className="h-full w-full object-cover" /> : <Megaphone className="h-3.5 w-3.5" />}
            </span>
            <span className="relative max-w-[120px] truncate">{s.author?.displayName}</span>
            <span className="relative rounded-full bg-black/25 px-1.5 text-xs">{s.special.points.toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}
