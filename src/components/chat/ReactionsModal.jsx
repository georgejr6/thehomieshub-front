import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';

// "Who reacted": opened by right-clicking (or long-pressing) a reaction, or
// from the message's ⋯ menu, like Discord. Emojis on the left with counts,
// the people on the right. Reactions made on the real Discord are included
// (fetched server-side); people who aren't on the app show their Discord
// username with a "Discord" tag.

function Avatar({ u }) {
  if (u.avatarUrl) return <img src={u.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full bg-[#1E1F22] object-cover" />;
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', u.viaDiscord ? 'bg-[#4E5058]' : 'bg-[#5865F2]')}>
      {(u.displayName || u.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

const EmojiIcon = ({ r, size = 'h-5 w-5' }) => (r.emojiUrl ? <img src={r.emojiUrl} alt={r.emoji} className={size} /> : <span className="text-lg leading-none">{r.emoji}</span>);

export default function ReactionsModal({ messageId, initialEmoji, signature, onClose }) {
  const [data, setData] = useState(null);
  const [partial, setPartial] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(initialEmoji);
  const [reload, setReload] = useState(0);
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  // onClose changes identity on every parent render — keep it in a ref.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Load on open, and again whenever someone reacts while it's open
  // (signature changes). Keeps showing the old list while refreshing.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.get(`/chat/messages/${messageId}/reactions`)
        .then(({ data: d }) => {
          if (!alive) return;
          setData(d.result?.reactions || []);
          setPartial(!!d.result?.partial);
          setError('');
        })
        .catch((err) => { if (alive) setError(err.response?.data?.message || "Couldn't load reactions."); });
    }, data ? 400 : 0); // debounce refreshes during a burst of reactions
    return () => { alive = false; clearTimeout(t); };
  }, [messageId, signature, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the panel, keep Tab inside it, Escape closes (before the composer
  // or anything else sees it), and give focus back on close.
  useEffect(() => {
    const opener = document.activeElement;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); opener?.focus?.(); };
  }, []);

  const current = data?.find((r) => r.emoji === active) || data?.[0];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Reactions">
      <div className="chat-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={panelRef}
        className="chat-sheet-up relative flex h-[70dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#313338] shadow-2xl sm:h-[440px] sm:max-w-lg sm:rounded-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-2 sm:hidden"><span className="h-1 w-10 rounded-full bg-[#4E5058]" /></div>
        <div className="flex items-center justify-between border-b border-[#1F2023] px-4 py-3">
          <h2 className="font-semibold text-white">Reactions</h2>
          <button ref={closeBtnRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#B5BAC1] hover:bg-[#404249] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5865F2]"><X className="h-5 w-5" /></button>
        </div>
        {!data ? (
          <div className="flex flex-1 items-center justify-center">{error ? <span className="px-6 text-center text-sm text-[#F23F43]">{error}</span> : <Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" />}</div>
        ) : !data.length ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#949BA4]">No reactions.</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Emoji list: row on phones, column on desktop */}
            <div role="tablist" aria-label="Emoji" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#1F2023] bg-[#2B2D31] p-2 sm:w-28 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
              {data.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  role="tab"
                  aria-selected={current?.emoji === r.emoji}
                  aria-label={`${r.emoji} ${r.count}`}
                  onClick={() => setActive(r.emoji)}
                  className={cn('flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5865F2]', current?.emoji === r.emoji ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-white')}
                >
                  <EmojiIcon r={r} /><span className="tabular-nums">{r.count}</span>
                </button>
              ))}
            </div>
            <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-2">
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
              {partial && current?.hidden > 0 ? (
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-[#949BA4]">
                  +{current.hidden} more — couldn't reach Discord right now.
                  <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold text-[#00A8FC] hover:underline">Try again</button>
                </div>
              ) : current?.hidden > 0 && (
                <div className="px-2 py-2 text-xs text-[#949BA4]">+{current.hidden} more we can't show.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
