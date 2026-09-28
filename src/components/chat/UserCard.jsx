import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MessageCircle, User, X, AtSign, Copy, Clock, UserX, Ban, ShieldCheck, Trash2, ChevronRight,
  ChevronLeft, Loader2, Check, Link2, Timer, FileText, Heart, Play, ExternalLink,
} from 'lucide-react';
import OwnerPrivateInfo from '@/components/OwnerPrivateInfo';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Avatar from './Avatar';

// Click a name/avatar/member row in Homies Chat → this card (Discord's
// profile popout). Everyone gets Message / Profile / Mention. Staff also get
// the moderation actions they're allowed on THIS person — the server decides
// (GET /chat/members/:id/profile → `can`, the same checks the mod endpoints
// run) and every action is mirrored to the real Discord by the backend.
//
// "Message" opens the SAME DM thread as /inbox; someone who only exists on
// Discord still gets it (the bot DMs them a link to the thread).
//
// Open from anywhere: openChatUserCard(author, event). Mounted once in App.jsx.
export const openChatUserCard = (user, e) => {
  if (!user?.username || !user?.id) return;
  e?.stopPropagation?.();
  const r = e?.currentTarget?.getBoundingClientRect?.();
  window.dispatchEvent(new CustomEvent('hh:chat-user-card', { detail: { user, x: r ? r.left : 16, y: r ? r.bottom : 80 } }));
};

const CARD_W = 340;
const hex = (c) => (c ? `#${Number(c).toString(16).padStart(6, '0')}` : null);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const ago = (d) => {
  if (!d) return 'never';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

const TIMEOUTS = [[1, '60 seconds'], [5, '5 minutes'], [10, '10 minutes'], [60, '1 hour'], [1440, '1 day'], [10080, '1 week']];
const BAN_HISTORY = [[0, "Don't delete any"], [1, 'Previous hour'], [24, 'Previous 24 hours'], [168, 'Previous 7 days']];
const PURGE = [10, 50, 100];

function discordNote(res) {
  if (!res?.discord) return '';
  if (res.discord === 'applied') return ' Also applied on Discord.';
  if (res.discord === 'no Discord account linked' || res.discord === 'not on Discord') return ' (Not on Discord.)';
  return ` Discord: ${res.reason || res.discord}.`;
}

// Module scope (not inside render) so they don't remount and drop focus.
function ModItem({ icon: Icon, label, onClick, danger, arrow, busy }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className={cn('flex w-full items-center gap-2.5 rounded px-2 py-2 text-left text-sm font-medium transition-colors disabled:opacity-50',
        danger ? 'text-[#F23F43] hover:bg-[#F23F43] hover:text-white' : 'text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white')}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {arrow && <ChevronRight className="h-4 w-4 opacity-70" />}
    </button>
  );
}
function BackBar({ title, onBack }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button type="button" onClick={onBack} aria-label="Back" className="rounded p-1 text-[#B5BAC1] hover:bg-white/10 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
      <span className="font-semibold text-white">{title}</span>
    </div>
  );
}
function ChoiceGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={cn('rounded-md px-2 py-1.5 text-xs font-semibold transition-colors', value === v ? 'bg-[#5865F2] text-white' : 'bg-[#1E1F22] text-[#B5BAC1] hover:text-white')}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Homies posts / videos / reels in one list (their profile content, or what
// they liked). Posts open /post/:id, videos and reels /watch/:id.
const POST_KIND = { thread: 'Post', poll: 'Poll', trip: 'Trip', event: 'Event' };
// `owner` = whose content it is; /watch needs it (router state) to load that
// creator's videos instead of guessing from the global feed.
function toItems(res, owner) {
  const posts = (res?.posts || []).map((p) => ({
    id: p._id, kind: POST_KIND[p.type] || 'Post', path: `/post/${p._id}`, at: p.createdAt, likedAt: p.likedAt,
    owner: p.author?.username || owner,
    text: p.trip?.title || p.title || p.text || p.poll?.question || '',
    thumb: (p.media || []).find((m) => !m.type || String(m.type).startsWith('image'))?.url || null,
  }));
  const vids = [...(res?.videos || []).map((v) => ({ ...v, _k: 'Video' })), ...(res?.reels || []).map((v) => ({ ...v, _k: 'Reel' }))].map((v) => ({
    id: v._id, kind: v._k, path: `/watch/${v._id}`, at: v.createdAt, likedAt: v.likedAt, video: true,
    owner: v.creator?.username || owner,
    text: v.title || v.caption || v.description || '',
    thumb: v.thumbnailUrl || v.thumbnail || (v.muxPlaybackId ? `https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?time=1&width=160` : null),
  }));
  return [...posts, ...vids];
}
function ItemList({ items, onOpen, empty }) {
  if (!items) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#949BA4]" /></div>;
  if (items.error) return <p className="py-6 text-center text-sm text-[#F5A3A5]">Couldn't load this right now.</p>;
  if (!items.length) return <p className="py-6 text-center text-sm text-[#949BA4]">{empty}</p>;
  return (
    <div className="max-h-[46vh] space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
      {items.map((it) => (
        <button key={`${it.kind}-${it.id}`} type="button" onClick={() => onOpen(it)}
          className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-white/5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#1E1F22]">
            {it.thumb ? <img src={it.thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4 text-[#6D6F78]" />}
            {it.video && <Play className="absolute h-4 w-4 fill-white text-white drop-shadow" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[13px] leading-snug text-[#DBDEE1]">{it.text || <span className="text-[#949BA4]">({it.kind.toLowerCase()})</span>}</div>
            <div className="mt-0.5 text-[11px] text-[#949BA4]">{it.kind}{it.at ? ` · ${fmtDate(it.at)}` : ''}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function UserCard({ onLoginRequest }) {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [card, setCard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('main'); // main | timeout | kick | ban | purge | roles | posts | liked
  const [items, setItems] = useState({}); // { posts: [...], liked: [...] } for the open card
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [banHours, setBanHours] = useState(0);
  const [purgeCount, setPurgeCount] = useState(50);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null); // { ok, text }
  const ref = useRef(null);
  const req = useRef(0);
  const cardId = useRef(null); // whose card is open now (actions check it before touching the UI)
  const [, setVw] = useState(0);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = useCallback(async (id) => {
    const n = ++req.current;
    try {
      const { data } = await api.get(`/chat/members/${id}/profile`);
      if (n === req.current) setProfile(data.result);
    } catch { if (n === req.current) setProfile(false); }
  }, []);

  useEffect(() => {
    const on = (e) => {
      cardId.current = e.detail.user.id;
      setCard(e.detail);
      setProfile(null);
      // Opened from the right-click menu on a mod action: go straight to it.
      setView(e.detail.view || 'main');
      setNote(null);
      setReason('');
      setItems({});
      if (me) load(e.detail.user.id);
    };
    window.addEventListener('hh:chat-user-card', on);
    return () => window.removeEventListener('hh:chat-user-card', on);
  }, [me, load]);

  useEffect(() => {
    if (!card) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setCard(null); };
    const esc = (e) => { if (e.key === 'Escape') { if (view !== 'main') setView('main'); else setCard(null); } };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('keydown', esc); };
  }, [card, view]);

  if (!card) return null;
  const u = { ...card.user, ...(profile || {}) };
  const isMe = me && (String(me._id) === String(u.id) || me.username === u.username);
  const canMessage = !isMe && !u.bot && u.username !== 'deleted';
  const inboxPath = `/inbox?user=${encodeURIComponent(u.username)}`;
  const inChat = location.pathname.startsWith('/chat');
  const can = profile?.can || {};
  const anyMod = can.timeout || can.kick || can.ban || can.unban || can.purge || (can.manageRoles && profile?.assignableRoles?.length);
  const color = hex(u.color);
  const name = u.displayName || u.username;

  const go = (path) => { setCard(null); navigate(path); };
  const openItem = (it) => { setCard(null); navigate(it.path, it.video ? { state: { username: it.owner } } : undefined); };
  const openList = async (which) => {
    setView(which);
    if (items[which]) return;
    const uid = u.id;
    try {
      const path = which === 'posts' ? `/profile/${encodeURIComponent(u.username)}/content` : `/profile/${encodeURIComponent(u.username)}/liked`;
      const { data } = await api.get(path);
      const key = which === 'liked' ? 'likedAt' : 'at'; // liked: newest like first
      const list = toItems(data.result, u.username).sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));
      if (cardId.current === uid) setItems((cur) => ({ ...cur, [which]: list }));
    } catch {
      if (cardId.current === uid) setItems((cur) => ({ ...cur, [which]: { error: true } }));
    }
  };
  const message = () => {
    if (!me) { setCard(null); onLoginRequest?.({ tab: 'signup', redirect: inboxPath }); return; }
    go(inboxPath);
  };
  const mention = () => {
    window.dispatchEvent(new CustomEvent('hh:chat-mention', { detail: { id: u.id, username: u.username } }));
    setCard(null);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`@${u.username}`); setNote({ ok: true, text: 'Username copied.' }); } catch { /* ignore */ }
  };

  const run = async (label, fn) => {
    const uid = u.id;
    setBusy(true);
    setNote(null);
    try {
      const res = await fn();
      if (cardId.current !== uid) return; // they opened someone else meanwhile
      setNote({ ok: true, text: `${label}.${discordNote(res)}` });
      setView('main');
      setReason('');
      load(u.id);
    } catch (err) {
      if (cardId.current !== uid) return;
      setNote({ ok: false, text: err.response?.data?.message || err.response?.data?.error?.message || 'That didn’t work.' });
    } finally {
      setBusy(false);
    }
  };
  const post = (path, body) => api.post(`/chat/mod/${path}`, { userId: u.id, ...body }).then((r) => r.data.result);
  const doTimeout = () => run(`@${u.username} is timed out for ${TIMEOUTS.find(([m]) => m === minutes)?.[1]}`, () => post('timeout', { minutes, reason }));
  const doUntimeout = () => run(`Timeout removed for @${u.username}`, () => post('untimeout'));
  const doKick = () => run(`@${u.username} was kicked`, () => post('kick', { reason }));
  const doBan = () => run(`@${u.username} is banned`, () => post('ban', { reason, deleteMessageHours: banHours }));
  const doUnban = () => run(`@${u.username} is unbanned`, () => post('unban'));
  const doPurge = () => run(`Deleted @${u.username}'s last ${purgeCount} messages`, async () => {
    const r = await post('purge', { count: purgeCount, reason });
    return { ...r, discord: undefined };
  });
  const toggleRole = async (role) => {
    const uid = u.id;
    setBusy(true);
    setNote(null);
    try {
      const { data } = await api[role.has ? 'delete' : 'put'](`/chat/members/${uid}/roles/${role.id}`);
      if (cardId.current !== uid) return;
      setProfile((p) => (p?.assignableRoles ? { ...p, assignableRoles: p.assignableRoles.map((r) => (r.id === role.id ? { ...r, has: !r.has } : r)) } : p));
      setNote({ ok: true, text: `${role.has ? 'Removed' : 'Added'} ${role.name}.${discordNote(data.result)}` });
      load(uid);
    } catch (err) {
      if (cardId.current !== uid) return;
      setNote({ ok: false, text: err.response?.data?.message || 'Couldn’t change that role.' });
    } finally {
      setBusy(false);
    }
  };

  // Keep the card on screen; on phones it's a bottom sheet.
  // Desktop: open by the name, nudged up so at least ~480px fits, and scroll
  // inside the card if it's still taller than the space below.
  const phone = window.innerWidth < 640;
  const top = Math.max(8, Math.min(card.y + 6, window.innerHeight - 488));
  const style = phone ? undefined : {
    left: Math.max(8, Math.min(card.x, window.innerWidth - CARD_W - 8)),
    top,
    width: CARD_W,
    maxHeight: window.innerHeight - top - 8,
  };

  const confirmBtn = (label, onClick, danger) => (
    <button type="button" onClick={onClick} disabled={busy}
      className={cn('mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60',
        danger ? 'bg-[#DA373C] hover:bg-[#A12828]' : 'bg-[#5865F2] hover:bg-[#4752C4]')}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}{label}
    </button>
  );
  const reasonInput = (
    <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} placeholder="Reason (optional, goes in the mod log)"
      className="mt-3 w-full rounded-md bg-[#1E1F22] px-3 py-2 text-sm text-[#DBDEE1] outline-none placeholder:text-[#6D6F78] focus:ring-1 focus:ring-[#5865F2]" />
  );

  let body;
  if (view === 'timeout') {
    body = (
      <div>
        <BackBar onBack={() => setView('main')} title={`Time out ${name}`} />
        <p className="mb-2 text-xs text-[#B5BAC1]">They can still read, but can't send messages or react until it ends. Also applied on Discord.</p>
        <ChoiceGrid options={TIMEOUTS} value={minutes} onChange={setMinutes} />
        {reasonInput}
        {confirmBtn('Time out', doTimeout)}
      </div>
    );
  } else if (view === 'kick') {
    body = (
      <div>
        <BackBar onBack={() => setView('main')} title={`Kick ${name}`} />
        <p className="text-xs text-[#B5BAC1]">Removes them from the chat and the Discord server. They can come back with an invite / by signing in again.</p>
        {reasonInput}
        {confirmBtn('Kick', doKick, true)}
      </div>
    );
  } else if (view === 'ban') {
    body = (
      <div>
        <BackBar onBack={() => setView('main')} title={`Ban ${name}`} />
        <p className="mb-2 text-xs text-[#B5BAC1]">Bans them from Homies Chat and the Discord server. Delete their message history:</p>
        <ChoiceGrid options={BAN_HISTORY} value={banHours} onChange={setBanHours} />
        {reasonInput}
        {confirmBtn('Ban', doBan, true)}
      </div>
    );
  } else if (view === 'purge') {
    body = (
      <div>
        <BackBar onBack={() => setView('main')} title={`Delete ${name}'s messages`} />
        <p className="mb-2 text-xs text-[#B5BAC1]">Deletes their most recent messages across every channel (and the Discord copies).</p>
        <ChoiceGrid options={PURGE.map((n) => [n, `Last ${n}`])} value={purgeCount} onChange={setPurgeCount} />
        {reasonInput}
        {confirmBtn(`Delete last ${purgeCount}`, doPurge, true)}
      </div>
    );
  } else if (view === 'posts' || view === 'liked') {
    body = (
      <div>
        <BackBar onBack={() => setView('main')} title={view === 'posts' ? `${name}'s posts` : `Liked by ${name}`} />
        <ItemList items={items[view]} onOpen={openItem} empty={view === 'posts' ? 'No Homies posts yet.' : 'Nothing liked yet.'} />
        {!u.bot && !u.placeholder && (
          <button type="button" onClick={() => go(`/profile/${encodeURIComponent(u.username)}`)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#4E5058] py-2 text-sm font-semibold text-white hover:bg-[#6D6F78]">
            <ExternalLink className="h-4 w-4" /> Open full profile
          </button>
        )}
      </div>
    );
  } else if (view === 'roles') {
    body = (
      <div>
        <BackBar onBack={() => setView('main')} title="Roles" />
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {(profile?.assignableRoles || []).map((r) => (
            <button key={r.id} type="button" onClick={() => toggleRole(r)} disabled={busy}
              className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-left text-sm text-[#DBDEE1] hover:bg-white/5 disabled:opacity-60">
              <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', r.has ? 'border-[#5865F2] bg-[#5865F2]' : 'border-[#6D6F78]')}>
                {r.has && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: hex(r.color) || '#99AAB5' }} />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[#949BA4]">Membership roles (New Homie, Homie, Nomad) follow the plan automatically.</p>
      </div>
    );
  } else {
    body = (
      <div>
        {/* Status badges */}
        {(u.placeholder || u.chatBanned || u.mutedUntil || u.siteBanned) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {u.placeholder && <span className="rounded-full bg-[#5865F2]/20 px-2 py-0.5 text-[11px] font-semibold text-[#C9CDFB]">Discord only</span>}
            {u.mutedUntil && <span className="flex items-center gap-1 rounded-full bg-[#F0B232]/20 px-2 py-0.5 text-[11px] font-semibold text-[#F0B232]"><Timer className="h-3 w-3" /> Timed out until {new Date(u.mutedUntil).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
            {u.chatBanned && <span className="rounded-full bg-[#F23F43]/20 px-2 py-0.5 text-[11px] font-semibold text-[#F23F43]">Banned{u.banReason ? `: ${u.banReason}` : ''}</span>}
            {u.siteBanned && <span className="rounded-full bg-[#F23F43]/20 px-2 py-0.5 text-[11px] font-semibold text-[#F23F43]">Banned from the app{u.banLocked ? ' (locked)' : ''}</span>}
          </div>
        )}

        {u.bio && <p className="mt-3 line-clamp-3 text-sm text-[#DBDEE1]">{u.bio}</p>}

        {profile && (
          <div className="mt-3 space-y-1 rounded-lg bg-[#1E1F22] p-3 text-xs">
            <div className="flex justify-between gap-3"><span className="text-[#949BA4]">Member since</span><span className="text-[#DBDEE1]">{fmtDate(u.joinedAt)}</span></div>
            {u.lastSeenAt !== undefined && <div className="flex justify-between gap-3"><span className="text-[#949BA4]">Last seen</span><span className="text-[#DBDEE1]">{u.status && u.status !== 'offline' ? 'online now' : ago(u.lastSeenAt)}</span></div>}
            {typeof u.messageCount === 'number' && <div className="flex justify-between gap-3"><span className="text-[#949BA4]">Messages</span><span className="text-[#DBDEE1]">{u.messageCount.toLocaleString()}</span></div>}
          </div>
        )}

        {profile && !u.bot && (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => openList('posts')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E1F22] py-2 text-xs font-semibold text-[#DBDEE1] hover:bg-[#35373C]">
              <FileText className="h-3.5 w-3.5" /> Posts <span className="text-[#949BA4]">{(u.postCount || 0).toLocaleString()}</span>
            </button>
            {typeof u.likeCount === 'number' && (
              <button type="button" onClick={() => openList('liked')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E1F22] py-2 text-xs font-semibold text-[#DBDEE1] hover:bg-[#35373C]">
                <Heart className="h-3.5 w-3.5" /> Liked <span className="text-[#949BA4]">{u.likeCount.toLocaleString()}</span>
              </button>
            )}
          </div>
        )}

        {profile?.roles?.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#949BA4]">Roles</div>
            <div className="flex flex-wrap gap-1">
              {profile.roles.map((r) => (
                <span key={r.id} className="flex items-center gap-1 rounded bg-[#1E1F22] px-1.5 py-0.5 text-xs text-[#DBDEE1]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: hex(r.color) || '#99AAB5' }} />{r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {canMessage && (
            <button type="button" onClick={message} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5865F2] py-2.5 text-sm font-semibold text-white hover:bg-[#4752C4]">
              <MessageCircle className="h-4 w-4" /> Message
            </button>
          )}
          {!u.bot && !u.placeholder && (
            <button type="button" onClick={() => go(`/profile/${encodeURIComponent(u.username)}`)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#4E5058] py-2.5 text-sm font-semibold text-white hover:bg-[#6D6F78]">
              <User className="h-4 w-4" /> Profile
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          {inChat && !u.bot && (
            <button type="button" onClick={mention} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E1F22] py-2 text-xs font-semibold text-[#DBDEE1] hover:bg-[#35373C]">
              <AtSign className="h-3.5 w-3.5" /> Mention
            </button>
          )}
          <button type="button" onClick={copy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E1F22] py-2 text-xs font-semibold text-[#DBDEE1] hover:bg-[#35373C]">
            <Copy className="h-3.5 w-3.5" /> Copy @username
          </button>
        </div>

        {/* Owner only; collapsed and not even fetched until expanded (stream-safe). */}
        {!u.bot && !u.placeholder && <OwnerPrivateInfo key={u.id} userId={u.id} compact />}

        {anyMod && (
          <div className="mt-4 border-t border-[#3F4147] pt-3">
            <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#949BA4]"><ShieldCheck className="h-3.5 w-3.5" /> Moderation</div>
            {can.manageRoles && profile?.assignableRoles?.length > 0 && <ModItem busy={busy} icon={ShieldCheck} label="Roles" arrow onClick={() => setView('roles')} />}
            {can.timeout && (u.mutedUntil
              ? <ModItem busy={busy} icon={Clock} label="Remove timeout" onClick={doUntimeout} />
              : <ModItem busy={busy} icon={Clock} label={`Time out ${name}`} arrow onClick={() => setView('timeout')} />)}
            {can.purge && <ModItem busy={busy} icon={Trash2} label="Delete recent messages" arrow onClick={() => setView('purge')} />}
            {can.kick && <ModItem busy={busy} icon={UserX} label={`Kick ${name}`} danger arrow onClick={() => setView('kick')} />}
            {can.ban && <ModItem busy={busy} icon={Ban} label={`Ban ${name}`} danger arrow onClick={() => setView('ban')} />}
            {can.unban && <ModItem busy={busy} icon={Ban} label={`Unban ${name}`} onClick={doUnban} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-chat-user-card
      role="dialog"
      aria-label={`${name}'s card`}
      className={cn('overflow-hidden bg-[#232428] shadow-2xl',
        phone ? 'chat-sheet-up fixed inset-x-0 bottom-0 z-[130] max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]'
          : 'chat-pop fixed z-[130] overflow-y-auto rounded-xl ring-1 ring-black/40 [scrollbar-width:thin]')}
      style={style}
    >
      {/* Banner in their role colour, avatar overlapping it (Discord popout). */}
      <div className="h-16" style={{ background: color || '#5865F2' }} />
      <button type="button" onClick={() => setCard(null)} aria-label="Close" className="absolute right-2 top-2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50">
        <X className="h-4 w-4" />
      </button>
      <div className="px-4 pb-4">
        <div className="-mt-9 flex items-end gap-3">
          <div className="relative">
            <Avatar user={{ ...u, displayName: name }} size={76} className="border-[5px] border-[#232428]" />
            {u.status && u.status !== 'offline' && (
              <span className={cn('absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[#232428]', u.status === 'idle' ? 'bg-[#F0B232]' : 'bg-[#23A55A]')} />
            )}
          </div>
        </div>
        <div className="mt-2 min-w-0">
          <div className="truncate text-xl font-bold" style={{ color: color || '#F2F3F5' }}>{name}</div>
          <div className="truncate text-sm text-[#B5BAC1]">@{u.username}</div>
          {u.discordUsername && (
            <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#949BA4]">
              <Link2 className="h-3 w-3 shrink-0 text-[#5865F2]" /> Discord: <span className="truncate text-[#DBDEE1]">{u.discordUsername}</span>
            </div>
          )}
        </div>

        {me && profile === null && <div className="mt-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#949BA4]" /></div>}
        {note && (
          <p className={cn('chat-fade-in mt-3 rounded-md px-3 py-2 text-xs', note.ok ? 'bg-[#23A55A]/15 text-[#7FE0A2]' : 'bg-[#F23F43]/15 text-[#F5A3A5]')}>{note.text}</p>
        )}
        <div className="mt-1">{body}</div>
      </div>
    </div>
  );
}
