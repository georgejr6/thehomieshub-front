import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';

// "Who reacted" — opened by right-clicking (or long-pressing) a reaction,
// like Discord. Emojis on the left with counts, the people on the right.
// Reactions made on the real Discord are included (fetched server-side) and
// tagged "Discord"; people not linked to an app account show their Discord name.

function Avatar({ u }) {
  if (u.avatarUrl) return <img src={u.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full bg-[#1E1F22] object-cover" />;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-sm font-semibold text-white">
      {(u.displayName || u.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

const EmojiIcon = ({ r, size = 'h-5 w-5' }) => (r.emojiUrl ? <img src={r.emojiUrl} alt={r.emoji} className={size} /> : <span className="text-lg leading-none">{r.emoji}</span>);

export default function ReactionsModal({ messageId, initialEmoji, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(initialEmoji);

  useEffect(() => {
    let alive = true;
    api.get(`/chat/messages/${messageId}/reactions`)
      .then(({ data: d }) => { if (alive) setData(d.result?.reactions || []); })
      .catch((err) => { if (alive) setError(err.response?.data?.message || "Couldn't load reactions."); });
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { alive = false; window.removeEventListener('keydown', onKey); };
  }, [messageId, onClose]);

  const current = data?.find((r) => r.emoji === active) || data?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Reactions">
      <div className="chat-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="chat-sheet-up relative flex h-[70dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#313338] shadow-2xl sm:h-[440px] sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[#1F2023] px-4 py-3">
          <h2 className="font-semibold text-white">Reactions</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#B5BAC1] hover:bg-[#404249] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {!data ? (
          <div className="flex flex-1 items-center justify-center">{error ? <span className="px-6 text-center text-sm text-[#F23F43]">{error}</span> : <Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" />}</div>
        ) : !data.length ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#949BA4]">No reactions.</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Emoji list: row on phones, column on desktop */}
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#1F2023] bg-[#2B2D31] p-2 sm:w-28 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
              {data.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => setActive(r.emoji)}
                  className={cn('flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors', current?.emoji === r.emoji ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-white')}
                >
                  <EmojiIcon r={r} /><span className="tabular-nums">{r.count}</span>
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {current?.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-[#35373C]">
                  <Avatar u={u} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium" style={{ color: u.color ? roleColor(u.color) : '#F2F3F5' }}>{u.displayName || u.username}</div>
                    {u.username && u.username !== u.displayName && <div className="truncate text-xs text-[#949BA4]">{u.username}</div>}
                  </div>
                  {u.viaDiscord && <span className="shrink-0 rounded bg-[#5865F2]/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#C9CDFB]">Discord</span>}
                </div>
              ))}
              {current?.hidden > 0 && (
                <div className="px-2 py-2 text-xs text-[#949BA4]">+{current.hidden} more we can't show (reacted on Discord before the bridge, or removed since).</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
