import React, { useEffect, useMemo } from 'react';

// A burst of confetti over the chat when a gift or shoutout lands in the
// channel you're looking at. Purely decorative (pointer-events: none) and
// skipped entirely for people who prefer reduced motion (see index.css).

const GIFT = ['🎁', '🎉', '✨', '💛', '🥳'];
const SHOUT = ['📣', '🔥', '✨', '💯'];

export default function Celebration({ celebration, onDone, fall = false }) {
  useEffect(() => {
    if (!celebration) return undefined;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [celebration, onDone]);

  const pieces = useMemo(() => {
    if (!celebration) return [];
    const emoji = celebration.kind === 'shoutout' ? SHOUT : GIFT;
    const color = celebration.color || '#F0B94D';
    const colors = [color, '#F0B94D', '#FFFFFF', '#5865F2', '#23A55A', '#EB459E'];
    return Array.from({ length: 34 }, (_, i) => {
      const isEmoji = i % 3 === 0;
      const angle = (Math.random() * 140 + 20) * (Math.PI / 180); // mostly upward fan
      const dist = 160 + Math.random() * 260;
      return {
        key: `${celebration.id}-${i}`,
        left: `${40 + Math.random() * 20}%`,
        style: {
          '--dx': `${Math.cos(angle) * dist * (Math.random() > 0.5 ? 1 : -1)}px`,
          '--dy': `${(fall ? 1 : -1) * Math.sin(angle) * dist}px`,
          '--rot': `${(Math.random() - 0.5) * 720}deg`,
          '--delay': `${Math.random() * 0.25}s`,
          '--dur': `${1.4 + Math.random() * 0.9}s`,
        },
        content: isEmoji ? emoji[i % emoji.length] : null,
        color: colors[i % colors.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
      };
    });
  }, [celebration, fall]);

  if (!celebration) return null;
  return (
    <div className={`pointer-events-none absolute inset-x-0 z-30 h-0 ${fall ? 'top-full' : 'bottom-0'}`} aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.key} className={`chat-confetti absolute ${fall ? 'top-0' : 'bottom-6'}`} style={{ left: p.left, ...p.style }}>
          {p.content
            ? <span className="text-2xl">{p.content}</span>
            : <span className="block rounded-sm" style={{ width: p.w, height: p.h, background: p.color }} />}
        </span>
      ))}
    </div>
  );
}
