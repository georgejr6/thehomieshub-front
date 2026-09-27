import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

// The full emoji picker (every standard emoji Discord has, with search, skin
// tones and a "frequently used" row) — the same set on reactions and in the
// composer. The emoji data (~400 KB) only loads the first time it's opened.
const Picker = lazy(() => Promise.all([import('@emoji-mart/react'), import('@emoji-mart/data')])
  .then(([p, d]) => ({ default: (props) => <p.default data={d.default} {...props} /> })));

export const QUICK_EMOJI = ['👍', '❤️', '😂', '🔥', '😮', '😢', '🙏', '💯', '👀', '🎉', '💀', '🤝'];

// Reactions you used last come first in the right-click menu, like Discord.
const RECENT_KEY = 'hh_chat_recent_reactions';
export function recentReactions(n = 6) {
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { /* storage blocked */ }
  if (!Array.isArray(recent)) recent = [];
  return [...new Set([...recent.filter((e) => typeof e === 'string'), ...QUICK_EMOJI])].slice(0, n);
}
export function rememberReaction(emoji) {
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    localStorage.setItem(RECENT_KEY, JSON.stringify([emoji, ...(Array.isArray(recent) ? recent : []).filter((e) => e !== emoji)].slice(0, 12)));
  } catch { /* storage blocked */ }
}

const narrow = () => typeof window !== 'undefined' && window.innerWidth < 640;
const PICKER_W = 352;
const PICKER_H = 435;

/**
 * anchor: a DOMRect (opens beside it) or {x, y} (a click point).
 * On phones it's a bottom sheet instead.
 */
export default function EmojiPicker({ anchor, onPick, onClose }) {
  const box = useRef(null);
  const [pos, setPos] = useState(null);
  const sheet = narrow();

  useLayoutEffect(() => {
    if (sheet) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const a = anchor || { x: vw / 2, y: vh / 2 };
    const top = a.bottom != null ? a.bottom + 6 : a.y;
    const left = a.right != null ? a.right - PICKER_W : a.x;
    setPos({
      left: Math.max(8, Math.min(left, vw - PICKER_W - 8)),
      top: top + PICKER_H > vh - 8 ? Math.max(8, (a.top ?? a.y) - PICKER_H - 6) : top,
    });
  }, [anchor, sheet]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Emoji buttons are 36px; fill the phone's width.
  const perLine = sheet ? Math.max(6, Math.min(12, Math.floor((window.innerWidth - 24) / 36))) : 9;
  const picker = (
    <Suspense fallback={<div className="flex h-[320px] w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" /></div>}>
      <Picker
        theme="dark"
        set="native"
        autoFocus={!sheet}
        previewPosition="none"
        skinTonePosition="search"
        navPosition="top"
        perLine={perLine}
        maxFrequentRows={2}
        dynamicWidth={false}
        onEmojiSelect={(e) => { if (e?.native) onPick(e.native); onClose(); }}
      />
    </Suspense>
  );

  return createPortal(
    <div className="fixed inset-0 z-[70]" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      {sheet ? (
        <div className="absolute inset-0 flex flex-col justify-end bg-black/50 chat-fade-in">
          <div
            ref={box}
            onMouseDown={(e) => e.stopPropagation()}
            className="chat-sheet-up hh-emoji-sheet flex max-h-[70dvh] flex-col items-center overflow-hidden rounded-t-2xl bg-[#2B2D31] pt-2"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="mb-1 h-1 w-10 shrink-0 rounded-full bg-[#4E5058]" />
            {picker}
          </div>
        </div>
      ) : pos && (
        <div ref={box} onMouseDown={(e) => e.stopPropagation()} className="chat-fade-up absolute overflow-hidden rounded-lg shadow-2xl" style={{ left: pos.left, top: pos.top }}>
          {picker}
        </div>
      )}
    </div>,
    document.body
  );
}
