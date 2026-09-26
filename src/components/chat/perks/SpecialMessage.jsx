import React from 'react';
import { Megaphone, Sparkles } from 'lucide-react';
import ChatMarkdown, { roleColor } from '../ChatMarkdown';

// Chat cards for paid moments (backend utils/chat/perks.js):
//   gift     — "<you> gifted <them> 1 month of Homies"
//   redeem   — "<you> redeemed 1 month of Homies with points"
//   shoutout — the message on a coloured card (colour = how many points)
//   donation — a /live dollar donation, same card (utils/live/pay.js)
// `live` = it just arrived while you were watching → a short glow.

const nameColor = (a) => (a?.color ? roleColor(a.color) : '#F2F3F5');
const fmtPts = (n) => `${(n || 0).toLocaleString()} pts`;
const fmtUsd = (c) => `$${((c || 0) / 100).toFixed(2).replace(/\.00$/, '')}`;
// Paid in dollars from the /live chat (amountCents) or with Homies Points.
const paidLine = (s) => (s.amountCents ? `${fmtUsd(s.amountCents)} · from the live stream` : `${fmtPts(s.points)} · Homies Points`);

function MiniAvatar({ user }) {
  if (user?.avatarUrl) return <img src={user.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-[11px] font-semibold text-white">
      {(user?.displayName || user?.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export function GiftCard({ m, live }) {
  const s = m.special;
  const redeem = s.kind === 'redeem';
  return (
    <div
      className={`chat-pop relative mt-1 w-full max-w-[520px] overflow-hidden rounded-xl border border-[#F0B94D]/40 bg-gradient-to-br from-[#3a2e12] via-[#2b2410] to-[#1f1b12] p-3.5 ${live ? 'chat-glow' : ''}`}
      style={{ '--glow': 'rgba(240, 185, 77, 0.45)' }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#F0B94D]/15 blur-2xl" />
      <div className="flex items-center gap-3">
        <div className="chat-gift-bounce flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0B94D]/20 text-2xl">
          {redeem ? <Sparkles className="h-6 w-6 text-[#F0B94D]" /> : '🎁'}
        </div>
        <div className="min-w-0 flex-1">
          {redeem ? (
            <div className="text-[15px] leading-snug text-white">
              <span className="font-semibold" style={{ color: nameColor(m.author) }}>{m.author?.displayName}</span> redeemed{' '}
              <span className="font-bold text-[#F0B94D]">{s.planLabel}</span>{s.amountCents ? '' : ' with points'}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] leading-snug text-white">
              <span className="font-semibold" style={{ color: nameColor(m.author) }}>{m.author?.displayName}</span>
              <span>gifted</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 py-0.5 pl-0.5 pr-2">
                <MiniAvatar user={s.recipient} />
                <span className="font-semibold" style={{ color: nameColor(s.recipient) }}>{s.recipient?.displayName || s.recipient?.username}</span>
              </span>
              <span className="font-bold text-[#F0B94D]">{s.planLabel}</span>
            </div>
          )}
          <div className="mt-0.5 text-xs text-[#C9B27A]">{paidLine(s)}</div>
        </div>
      </div>
    </div>
  );
}

export function ShoutoutCard({ m, ctx, live }) {
  const s = m.special;
  const color = s.color || '#1E88E5';
  return (
    <div
      className={`chat-pop mt-1 w-full max-w-[520px] overflow-hidden rounded-xl border ${live ? 'chat-glow' : ''}`}
      style={{ borderColor: `${color}66`, background: `${color}1f`, '--glow': `${color}88` }}
    >
      <div className="flex items-center gap-2 px-3.5 py-2" style={{ background: color }}>
        <Megaphone className="h-4 w-4 shrink-0 text-white" />
        <span className="truncate text-sm font-bold text-white">{s.kind === 'donation' ? 'Live donation' : 'Shoutout'}</span>
        <span className="ml-auto shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold text-white">{s.kind === 'donation' ? fmtUsd(s.amountCents) : fmtPts(s.points)}</span>
      </div>
      {m.content ? (
        <div className="px-3.5 py-2.5 text-[15px] leading-[1.375rem] text-white">
          <ChatMarkdown text={m.content} ctx={ctx} />
        </div>
      ) : null}
    </div>
  );
}

export default function SpecialMessage({ m, ctx, live }) {
  if (!m.special) return null;
  if (m.special.kind === 'shoutout' || m.special.kind === 'donation') return <ShoutoutCard m={m} ctx={ctx} live={live} />;
  return <GiftCard m={m} live={live} />;
}
