import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Click a name/avatar in Homies Chat → this card. "Message" opens the SAME
// DM thread as /inbox (one messaging system: chat DMs are inbox threads —
// backend /api/messages). Someone who only exists on Discord still gets the
// message: the bot DMs them a link straight to the thread.
//
// Open from anywhere: openChatUserCard(author, event). Mounted once in App.jsx.
export const openChatUserCard = (user, e) => {
  if (!user?.username || !user?.id) return;
  e?.stopPropagation?.();
  const r = e?.currentTarget?.getBoundingClientRect?.();
  window.dispatchEvent(new CustomEvent('hh:chat-user-card', { detail: { user, x: r ? r.left : 16, y: r ? r.bottom : 80 } }));
};

const CARD_W = 300;

export default function UserCard({ onLoginRequest }) {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const on = (e) => setCard(e.detail);
    window.addEventListener('hh:chat-user-card', on);
    return () => window.removeEventListener('hh:chat-user-card', on);
  }, []);

  useEffect(() => {
    if (!card) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setCard(null); };
    const esc = (e) => { if (e.key === 'Escape') setCard(null); };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('keydown', esc); };
  }, [card]);

  if (!card) return null;
  const u = card.user;
  const isMe = me && (String(me._id) === String(u.id) || me.username === u.username);
  const canMessage = !isMe && !u.bot && u.username !== 'deleted';
  const inboxPath = `/inbox?user=${encodeURIComponent(u.username)}`;
  const go = (path) => { setCard(null); navigate(path); };
  const message = () => {
    if (!me) { setCard(null); onLoginRequest?.({ tab: 'signup', redirect: inboxPath }); return; }
    go(inboxPath);
  };

  // Keep the card on screen; on phones it's a bottom sheet.
  const phone = window.innerWidth < 640;
  const style = phone ? undefined : {
    left: Math.max(8, Math.min(card.x, window.innerWidth - CARD_W - 8)),
    top: Math.max(8, Math.min(card.y + 6, window.innerHeight - 240)),
    width: CARD_W,
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${u.displayName || u.username}'s card`}
      className={phone
        ? 'fixed inset-x-0 bottom-0 z-[130] rounded-t-2xl bg-[#232428] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl'
        : 'fixed z-[130] rounded-xl bg-[#232428] p-4 shadow-2xl ring-1 ring-black/40'}
      style={style}
    >
      <button type="button" onClick={() => setCard(null)} aria-label="Close" className="absolute right-3 top-3 rounded p-1 text-[#B5BAC1] hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2] text-xl font-semibold text-white">{(u.displayName || u.username || '?')[0].toUpperCase()}</div>
        )}
        <div className="min-w-0 pr-6">
          <div className="truncate text-lg font-bold text-white">{u.displayName || u.username}</div>
          <div className="truncate text-sm text-[#B5BAC1]">@{u.username}</div>
        </div>
      </div>
      {u.placeholder && canMessage && (
        <p className="mt-3 rounded-lg bg-[#1E1F22] px-3 py-2 text-xs text-[#B5BAC1]">On Discord, not the app yet. They'll get a Discord DM with a link to reply here.</p>
      )}
      <div className="mt-4 flex gap-2">
        {canMessage && (
          <button type="button" onClick={message} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5865F2] py-2.5 text-sm font-semibold text-white hover:bg-[#4752C4]">
            <MessageCircle className="h-4 w-4" /> Message
          </button>
        )}
        {!u.placeholder && !u.bot && (
          <button type="button" onClick={() => go(`/profile/${encodeURIComponent(u.username)}`)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#4E5058] py-2.5 text-sm font-semibold text-white hover:bg-[#6D6F78]">
            <User className="h-4 w-4" /> Profile
          </button>
        )}
      </div>
    </div>
  );
}
