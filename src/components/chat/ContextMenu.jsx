import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  SmilePlus, User as UserIcon, MessageCircle, AtSign, Copy, Hash, ShieldCheck, Clock, Trash2, UserX, Ban, Settings, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';

// Discord-style right-click menu used across Homies Chat: a popover at the
// pointer on desktop, a bottom sheet on phones.
// `items`: {label, icon, onClick, danger} | {heading} | {divider} | {note}.
export default function ContextMenu({ menu, items, quick = [], onReact, onMoreEmoji, onClose, header }) {
  const box = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (menu.sheet || !box.current) return;
    const { offsetWidth: w, offsetHeight: h } = box.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      left: Math.max(8, Math.min(menu.x, vw - w - 8)),
      top: menu.y + h > vh - 8 ? Math.max(8, vh - h - 8) : menu.y,
    });
  }, [menu, items.length]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Desktop popover: the user scrolling or resizing closes it, like Discord.
    // Only wheel counts — the list also auto-scrolls when new messages arrive.
    // (Not the phone sheet: its backdrop covers the chat, and mobile browsers
    // fire resize when the address bar moves.)
    const onWheel = (e) => { if (!box.current?.contains(e.target)) onClose(); };
    if (!menu.sheet) {
      window.addEventListener('resize', onClose);
      window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('wheel', onWheel, { capture: true });
    };
  }, [onClose, menu.sheet]);

  const list = items.map((it, i) => {
    if (it.divider) return <div key={i} className="mx-1 my-1 h-px bg-[#2B2D31]" />;
    if (it.heading) return <div key={i} className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase text-[#949BA4]">{it.heading}</div>;
    if (it.note) return <div key={i} className="flex items-center gap-2 px-2.5 pb-1 text-[11px] text-[#949BA4]">{it.loading && <Loader2 className="h-3 w-3 animate-spin" />}{it.note}</div>;
    const Icon = it.icon;
    return (
      <button
        key={i}
        type="button"
        onClick={() => { onClose(); it.onClick(); }}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded px-2.5 text-left transition-colors',
          menu.sheet ? 'py-3 text-[15px]' : 'py-1.5 text-sm',
          it.danger ? 'text-[#F23F43] hover:bg-[#F23F43] hover:text-white active:bg-[#F23F43] active:text-white' : 'text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white active:bg-[#5865F2] active:text-white'
        )}
      >
        <span className="truncate">{it.label}</span>
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
      </button>
    );
  });

  const reactRow = quick.length > 0 && (
    <div className={cn('flex items-center', menu.sheet ? 'justify-between gap-1 px-1 pb-2' : 'gap-0.5 px-1 pb-1')}>
      {quick.map((e) => (
        <button key={e} type="button" onClick={() => { onClose(); onReact(e); }} title={`React ${e}`}
          className={cn('flex items-center justify-center rounded-full bg-[#1E1F22] transition-transform duration-100 hover:scale-110 hover:bg-[#404249] active:scale-95',
            menu.sheet ? 'h-12 w-12 text-[26px]' : 'h-9 w-9 text-xl')}>{e}</button>
      ))}
      <button type="button" onClick={() => { onClose(); onMoreEmoji(); }} title="More emoji"
        className={cn('flex items-center justify-center rounded-full bg-[#1E1F22] text-[#B5BAC1] transition-colors hover:bg-[#404249] hover:text-white',
          menu.sheet ? 'h-12 w-12' : 'h-9 w-9')}><SmilePlus className={menu.sheet ? 'h-6 w-6' : 'h-5 w-5'} /></button>
    </div>
  );
  const head = header && <div className="truncate px-2.5 pb-1.5 pt-1 text-xs font-semibold text-[#B5BAC1]">{header}</div>;

  // Events inside the menu must not reach whatever it was opened from (React
  // bubbles portal events through the component tree).
  const stop = (e) => e.stopPropagation();
  return createPortal(
    <div className="fixed inset-0 z-[60]" onMouseDown={onClose} onTouchStart={stop} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
      {menu.sheet ? (
        <div className="chat-fade-in absolute inset-0 flex flex-col justify-end bg-black/50">
          <div ref={box} onMouseDown={stop} onClick={stop}
            className="chat-sheet-up max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-[#232428] px-3 pt-2"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#4E5058]" />
            {head}
            {reactRow}
            <div className="rounded-xl bg-[#2B2D31] p-1">{list}</div>
          </div>
        </div>
      ) : (
        <div ref={box} onMouseDown={stop} onClick={stop}
          className="chat-fade-up absolute w-[240px] max-h-[calc(100vh-16px)] overflow-y-auto rounded-lg border border-[#1E1F22] bg-[#111214] p-1.5 shadow-2xl"
          style={pos ? { left: pos.left, top: pos.top } : { left: menu.x, top: menu.y, visibility: 'hidden' }}>
          {head}
          {reactRow}
          {reactRow && <div className="mx-1 mb-1 h-px bg-[#2B2D31]" />}
          {list}
        </div>
      )}
    </div>,
    document.body
  );
}

// ── Right-click a person (name, avatar, @mention, member-list row) ────────

/** Call from an onContextMenu handler: opens the menu for that member. */
export function openUserMenu(user, e) {
  if (!user?.id || !user?.username || user.username === 'deleted') return;
  // Phones: press-and-hold opens the message sheet (tap a name for the card).
  // Android also fires contextmenu on long-press — don't stack a second sheet.
  if (!window.matchMedia?.('(hover: hover)').matches) { e.preventDefault(); return; }
  e.preventDefault();
  e.stopPropagation();
  window.dispatchEvent(new CustomEvent('hh:chat-user-menu', {
    detail: { user, x: e.clientX, y: e.clientY, sheet: typeof window !== 'undefined' && window.innerWidth < 640 },
  }));
}

/** Mounted once by ChatPage. Mod options come from the same `can` the member card uses. */
export function UserMenuHost({ me, onOpenSettings, onToast }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // { user, x, y, sheet }
  const [profile, setProfile] = useState(null); // null = loading, false = failed
  const req = useRef(0);

  useEffect(() => {
    const on = (e) => {
      const d = e.detail;
      setOpen(d);
      setProfile(null);
      const n = ++req.current;
      // Only staff can have mod options — everyone else skips the lookup.
      if (!me?.isStaff) return;
      api.get(`/chat/members/${d.user.id}/profile`)
        .then(({ data }) => { if (n === req.current) setProfile(data.result); })
        .catch(() => { if (n === req.current) setProfile(false); });
    };
    window.addEventListener('hh:chat-user-menu', on);
    return () => window.removeEventListener('hh:chat-user-menu', on);
  }, [me?.isStaff]);

  if (!open) return null;
  const u = open.user;
  const isMe = me && String(me.id) === String(u.id);
  const name = u.displayName || u.username;
  // Mod options open the member card straight on that action (reason, duration, confirm).
  const card = (view) => window.dispatchEvent(new CustomEvent('hh:chat-user-card', { detail: { user: u, x: open.x, y: open.y, view } }));
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); onToast?.(`${what} copied.`); } catch { onToast?.("Couldn't copy."); }
  };
  const can = profile?.can || {};

  const items = [
    { label: 'Profile', icon: UserIcon, onClick: () => card('main') },
    isMe && { label: 'Edit Profile', icon: Settings, onClick: () => onOpenSettings?.() },
    !isMe && !u.bot && { label: 'Message', icon: MessageCircle, onClick: () => navigate(`/inbox?user=${encodeURIComponent(u.username)}`) },
    { label: 'Mention', icon: AtSign, onClick: () => window.dispatchEvent(new CustomEvent('hh:chat-mention', { detail: { id: u.id, username: u.username } })) },
    { divider: true },
    { label: 'Copy Username', icon: Copy, onClick: () => copy(`@${u.username}`, 'Username') },
    me?.isStaff && { label: 'Copy User ID', icon: Hash, onClick: () => copy(String(u.id), 'User ID') },
    ...(me?.isStaff && !isMe ? [
      { divider: true },
      { heading: `Moderate ${name}` },
      profile === null && { note: 'Checking what you can do…', loading: true },
      profile === false && { note: "Couldn't load mod options." },
      can.manageRoles && profile?.assignableRoles?.length > 0 && { label: 'Roles', icon: ShieldCheck, onClick: () => card('roles') },
      can.timeout && (profile?.mutedUntil
        ? { label: 'Remove Timeout', icon: Clock, onClick: () => card('main') }
        : { label: `Timeout ${name}`, icon: Clock, onClick: () => card('timeout') }),
      can.purge && { label: 'Delete Recent Messages', icon: Trash2, danger: true, onClick: () => card('purge') },
      can.kick && { label: `Kick ${name}`, icon: UserX, danger: true, onClick: () => card('kick') },
      can.ban && { label: `Ban ${name}`, icon: Ban, danger: true, onClick: () => card('ban') },
      can.unban && { label: `Unban ${name}`, icon: Ban, onClick: () => card('main') },
      profile && !can.timeout && !can.kick && !can.ban && !can.unban && !can.purge && !can.manageRoles && { note: "They're above you — no mod actions." },
    ] : []),
  ].filter(Boolean).filter((it, i, arr) => !(it.divider && (i === arr.length - 1 || arr[i + 1]?.divider)));

  return (
    <ContextMenu
      menu={{ x: open.x, y: open.y, sheet: open.sheet }}
      header={`${name} · @${u.username}`}
      items={items}
      onClose={() => setOpen(null)}
    />
  );
}

