import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDown, ArrowLeft, Eye, Gift, HeartHandshake, HelpCircle, Loader2, Send, Star, Volume2, VolumeX, X, Users, Crown, Radio,
} from 'lucide-react';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { isMemberUser } from '@/components/MembershipWall';
import { roleColor } from '@/components/chat/ChatMarkdown';
import { cn } from '@/lib/utils';
import PaySheet, { fmtUsd } from '@/components/live/PaySheet';
import LiveOwnerPanel from '@/components/live/LiveOwnerPanel';

// /live — watch Mwosa's stream (YouTube or Kick embed) and chat without
// leaving the app. The chat is the same conversation as the stream's
// YouTube/Kick chat (relayed by Restream through the Discord channel) and
// Homies Chat. Anyone can watch and read the last 24 hours; chatting,
// donating and gifting need an account. Backend: routes/livechat.js.

const MAX_MESSAGES = 300;
const TEXT_BUBBLES = ['👋 Where you watching from?', '🔥 W stream', '😂😂😂', '💯 facts', 'Big up Mwosa 🙌'];

const visitorId = (() => {
  try {
    let v = localStorage.getItem('hh_live_vid');
    if (!v) { v = (crypto?.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, ''); localStorage.setItem('hh_live_vid', v); }
    return v;
  } catch { return null; }
})();

const LINK_RE = /(https?:\/\/[^\s<]+)/g;
function Linkified({ text }) {
  const parts = String(text || '').split(LINK_RE);
  return parts.map((p, i) => (i % 2 === 1
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-[#6cb6ff] hover:underline">{p}</a>
    : <React.Fragment key={i}>{p}</React.Fragment>));
}

const PLATFORM = {
  youtube: { label: 'YouTube', cls: 'bg-[#ff0033]', glyph: '▶' },
  kick: { label: 'Kick', cls: 'bg-[#53fc18] text-black', glyph: 'K' },
  twitch: { label: 'Twitch', cls: 'bg-[#9146ff]', glyph: 'T' },
  facebook: { label: 'Facebook', cls: 'bg-[#1877f2]', glyph: 'f' },
  x: { label: 'X', cls: 'bg-black border border-white/30', glyph: 'X' },
  discord: { label: 'Discord', cls: 'bg-[#5865F2]', glyph: 'D' },
  restream: { label: 'Stream', cls: 'bg-[#ff3d5a]', glyph: '●' },
  homies: { label: 'The Homies', cls: 'bg-white text-black', glyph: 'H' },
};
function PlatformDot({ platform }) {
  const p = PLATFORM[platform] || PLATFORM.homies;
  return <span title={`via ${p.label}`} className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-black leading-none text-white', p.cls)}>{p.glyph}</span>;
}

function LiveMessage({ m, fresh }) {
  const s = m.special;
  const name = m.author?.name || 'Homie';
  const color = m.author?.owner ? '#ffd166' : m.author?.color ? roleColor(m.author.color) : '#e8e8ea';
  if (s && (s.kind === 'donation' || s.kind === 'shoutout')) {
    const c = s.color || '#1E88E5';
    return (
      <div className={cn('my-1.5 overflow-hidden rounded-xl border', fresh && 'live-msg-in')} style={{ borderColor: `${c}66`, background: `${c}1c` }}>
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white" style={{ background: c }}>
          <span className="truncate">{name}</span>
          <span className="ml-auto shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-xs">{s.kind === 'donation' ? fmtUsd(s.amountCents) : `${(s.points || 0).toLocaleString()} pts`}</span>
        </div>
        {m.content && <div className="px-3 py-2 text-[14px] leading-snug text-white"><Linkified text={m.content} /></div>}
      </div>
    );
  }
  if (s && (s.kind === 'gift' || s.kind === 'redeem')) {
    return (
      <div className={cn('my-1.5 flex items-center gap-3 rounded-xl border border-[#F0B94D]/40 bg-gradient-to-r from-[#3a2e12] to-[#1f1b12] px-3 py-2.5', fresh && 'live-msg-in')}>
        <span className="text-2xl">{s.kind === 'gift' ? '🎁' : '✨'}</span>
        <div className="min-w-0 text-[14px] leading-snug text-white">
          <span className="font-semibold" style={{ color }}>{name}</span>{' '}
          {s.kind === 'gift' ? <>gifted <span className="font-semibold">{s.recipient || 'a homie'}</span></> : 'got'}{' '}
          <span className="font-bold text-[#F0B94D]">{s.planLabel}</span>
          {s.amountCents ? <span className="ml-1 text-xs text-[#C9B27A]">· {fmtUsd(s.amountCents)}</span> : null}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('group rounded-md px-1.5 py-[3px] text-[14px] leading-[1.45] hover:bg-white/[0.03]', fresh && 'live-msg-in')}>
      <span className="mr-1.5 inline-flex translate-y-[2px] items-center gap-1 align-baseline">
        <PlatformDot platform={m.platform} />
        {m.author?.owner && <Crown className="h-3.5 w-3.5 text-[#ffd166]" aria-label="Host" />}
      </span>
      <span className="font-semibold" style={{ color }}>{name}</span>
      <span className="text-white/40">: </span>
      <span className="break-words text-white/90"><Linkified text={m.content} /></span>
      {m.attachments?.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 block"><img src={a.url} alt="" className="max-h-40 rounded-lg" loading="lazy" /></a>)}
      {m.reactions?.length > 0 && (
        <span className="ml-1.5 inline-flex gap-1 align-middle">
          {m.reactions.map((r) => <span key={r.emoji} className="rounded-md bg-white/[0.06] px-1 text-[11px] text-white/70">{r.emojiUrl ? <img src={r.emojiUrl} alt={r.emoji} className="inline h-3.5 w-3.5" /> : r.emoji} {r.count}</span>)}
        </span>
      )}
    </div>
  );
}

function Player({ state, source }) {
  if (!state) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>;
  const yt = state.youtube || {};
  const kick = state.kick || {};
  if (source === 'kick') {
    return <iframe key="kick" title="Kick stream" src={`https://player.kick.com/${kick.slug}?autoplay=true&muted=true`} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  if (!state.live && !state.upcoming) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(ellipse_at_top,#2a1418,transparent_60%),#0b0b0d] px-6 text-center">
        <Radio className="h-10 w-10 text-white/30" />
        <div className="text-lg font-bold text-white">Mwosa is offline right now</div>
        <p className="max-w-sm text-sm text-white/55">This page lights up the moment the stream starts. The chat from the last 24 hours is right here.</p>
        <div className="mt-1 flex gap-2">
          <a href={yt.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#ff0033] px-4 py-1.5 text-sm font-semibold text-white">YouTube</a>
          <a href={kick.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#53fc18] px-4 py-1.5 text-sm font-semibold text-black">Kick</a>
        </div>
      </div>
    );
  }
  const src = yt.videoId
    ? `https://www.youtube.com/embed/${yt.videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/live_stream?channel=${yt.channelId}&autoplay=1&mute=1&playsinline=1`;
  return <iframe key={src} title="YouTube stream" src={src} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />;
}

export default function LiveWatchPage({ onLoginRequest }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [pinned, setPinned] = useState([]);
  const [supporters, setSupporters] = useState([]);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isOwnerView, setIsOwnerView] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [me, setMe] = useState(null);
  const [source, setSource] = useState(null);
  const [pay, setPay] = useState(null); // { tab, preset }
  const [toast, setToast] = useState(null);
  const [alert, setAlert] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [help, setHelp] = useState(false);
  const [ownerPanel, setOwnerPanel] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const freshIds = useRef(new Set());
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const atBottomRef = useRef(true);

  const flash = useCallback((msg, tone = 'info') => {
    setToast({ msg, tone, at: Date.now() });
  }, []);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 4200); return () => clearTimeout(t); }, [toast]);

  // ── Data ────────────────────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    try {
      const { data } = await api.get('/livechat/state');
      const r = data.result;
      setState(r.state); setPinned(r.pinned || []); setSupporters(r.supporters || []); setCatalog(r.catalog);
    } catch { /* keep what we have */ }
  }, []);

  const mergeMessages = useCallback((incoming, { prepend = false } = {}) => {
    setMessages((cur) => {
      const byId = new Map(cur.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      const all = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
      return prepend ? all : all.slice(-MAX_MESSAGES);
    });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/livechat/messages', { params: { limit: 80 } });
      mergeMessages(data.result.messages);
      setHasMore(data.result.hasMore);
      setIsOwnerView(!!data.result.owner);
    } catch { /* offline blip */ }
  }, [mergeMessages]);

  const loadOlder = async () => {
    if (!messages.length || loadingOlder) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const before = el?.scrollHeight || 0;
    try {
      const { data } = await api.get('/livechat/messages', { params: { before: messages[0].id, limit: 80 } });
      mergeMessages(data.result.messages, { prepend: true });
      setHasMore(data.result.hasMore);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - before; });
    } finally { setLoadingOlder(false); }
  };

  useEffect(() => { loadState(); loadMessages(); }, [loadState, loadMessages, user?.id]);

  useEffect(() => {
    if (!user) { setMe(null); return; }
    api.get('/livechat/me').then(({ data }) => setMe(data.result)).catch(() => setMe(null));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default player: whichever platform is live (YouTube first).
  useEffect(() => {
    if (!state || source) return;
    setSource(state.kick?.live && !state.youtube?.live ? 'kick' : 'youtube');
  }, [state, source]);

  // After a gap (reconnect), replace the list so deletions during the gap disappear too.
  const reloadMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/livechat/messages', { params: { limit: 80 } });
      setMessages(data.result.messages);
      setHasMore(data.result.hasMore);
    } catch { /* next reconnect tries again */ }
  }, []);

  // Live updates (Server-Sent Events, no login needed). Browsers give up on
  // an EventSource after an HTTP error (e.g. a 502 while the backend
  // restarts on deploy), so a closed stream is recreated with backoff.
  useEffect(() => {
    let es;
    let stopped = false;
    let retryTimer;
    let delay = 2000;
    const connect = () => {
      if (stopped) return;
      let hadError = false;
      try { es = new EventSource(`${api.defaults.baseURL}/livechat/stream`); } catch { return; }
      wire(es);
      es.onerror = () => {
        hadError = true;
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          retryTimer = setTimeout(() => { delay = Math.min(delay * 2, 30000); connect(); }, delay);
        }
      };
      es.onopen = () => { delay = 2000; if (hadError || connect.reconnecting) { hadError = false; reloadMessages(); loadState(); } connect.reconnecting = true; };
    };
    const wire = (src) => {
    const on = (ev, fn) => src.addEventListener(ev, (e) => { try { fn(JSON.parse(e.data)); } catch { /* bad frame */ } });
    on('state', (s) => setState(s));
    on('watching', ({ n }) => setState((cur) => (cur ? { ...cur, watching: n } : cur)));
    on('message', (m) => {
      freshIds.current.add(m.id);
      mergeMessages([m]);
      if (!atBottomRef.current) setUnread((n) => n + 1);
      if (m.special?.pinnedUntil) setPinned((p) => [m, ...p.filter((x) => x.id !== m.id)].slice(0, 10));
    });
    on('update', (m) => setMessages((cur) => cur.map((x) => (x.id === m.id ? m : x))));
    on('delete', ({ id }) => { setMessages((cur) => cur.filter((x) => x.id !== id)); setPinned((p) => p.filter((x) => x.id !== id)); });
    on('reaction', ({ id, emoji, count }) => setMessages((cur) => cur.map((x) => {
      if (x.id !== id) return x;
      const rs = (x.reactions || []).filter((r) => r.emoji !== emoji);
      return { ...x, reactions: count > 0 ? [...rs, { emoji, count }] : rs };
    })));
    on('alert', (a) => { setAlert({ ...a, key: Date.now() }); loadState(); });
    };
    connect();
    return () => { stopped = true; clearTimeout(retryTimer); es?.close(); };
  }, [mergeMessages, reloadMessages, loadState]);
  useEffect(() => { if (!alert) return undefined; const t = setTimeout(() => setAlert(null), 6500); return () => clearTimeout(t); }, [alert]);

  // Viewer log heartbeat.
  useEffect(() => {
    const beat = () => api.post('/livechat/presence', { visitorId, source: source || undefined }).catch(() => {});
    beat();
    const t = setInterval(() => { if (document.visibilityState === 'visible') beat(); }, 30000);
    return () => clearInterval(t);
  }, [source, user?.id]);

  // Back from Stripe Checkout.
  useEffect(() => {
    const paid = params.get('paid');
    if (!paid) return;
    const clear = () => { params.delete('paid'); setParams(params, { replace: true }); };
    if (paid === 'cancel') { flash('Payment cancelled — nothing was charged.'); clear(); return; }
    if (!user) { flash('Payment received — sign in to see it. It will show in chat in a moment.', 'good'); clear(); return; }
    api.post('/livechat/pay/confirm', { sessionId: paid })
      .then(({ data }) => {
        const st = data.result.status;
        if (st === 'refunded' || st === 'failed') flash(st === 'refunded' ? "That gift couldn't be applied, so you were refunded in full." : "That gift couldn't be applied — we've been alerted and will refund you.", 'bad');
        else flash(st === 'succeeded' ? 'Payment done — thank you! 🙌 Your card is saved for one-tap next time.' : 'Payment received — it will show in chat in a moment.', 'good'); api.get('/livechat/me').then(({ data: d }) => setMe(d.result)).catch(() => {}); })
      .catch(() => flash('Payment received — it will show in chat in a moment.', 'good'))
      .finally(clear);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scrolling ─────────────────────────────────────────────────────────────
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setUnread(0);
  };
  const toBottom = (smooth = true) => { const el = listRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); };
  useEffect(() => { if (atBottomRef.current) requestAnimationFrame(() => toBottom(false)); }, [messages.length]);

  // ── Suggestion pop-ups while live ───────────────────────────────────────
  const member = isMemberUser(user);
  const bubbles = useMemo(() => {
    const list = [];
    if (!user) list.push({ icon: '💬', text: 'Sign in to chat with everyone watching on YouTube, Kick and The Homies.', cta: 'Sign in', action: 'login' });
    list.push({ icon: '💸', text: 'Enjoying the stream? Send Mwosa a tip — it gets pinned in chat and shown live.', cta: 'Tip', action: 'donate' });
    list.push({ icon: '👋', text: 'Say what’s up — where are you watching from?', cta: 'Say hi', action: 'hi' });
    list.push({ icon: '🎁', text: 'Put a homie on — gift someone a membership right from chat.', cta: 'Gift', action: 'gift' });
    if (!member) list.push({ icon: '⭐', text: 'Members get every stream, the full archive and the Discord.', cta: 'Join', action: 'member' });
    return list;
  }, [user, member]);
  useEffect(() => {
    if (!state?.live) { setBubble(null); return undefined; }
    let off = false;
    try { off = sessionStorage.getItem('hh_live_popups_off') === '1'; } catch { /* private mode */ }
    if (off) return undefined;
    let i = 0;
    const show = () => { setBubble({ ...bubbles[i % bubbles.length], key: Date.now() }); i += 1; };
    const first = setTimeout(show, 40000);
    const every = setInterval(show, 4 * 60 * 1000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [state?.live, bubbles]);
  useEffect(() => { if (!bubble) return undefined; const t = setTimeout(() => setBubble(null), 14000); return () => clearTimeout(t); }, [bubble]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const needLogin = () => { flash('Sign in to do that — it takes a few seconds.'); onLoginRequest?.(); };
  const openPay = (tab, preset = {}) => {
    if (!user) return needLogin();
    return setPay({ tab, preset });
  };
  const act = (action) => {
    setBubble(null);
    if (action === 'login') return onLoginRequest?.();
    if (action === 'donate') return openPay('donate');
    if (action === 'gift') return openPay('gift');
    if (action === 'member') return navigate('/memberships');
    if (action === 'tts') return flash('Text-to-speech is off right now — donations still show on stream.');
    if (action === 'hi') { setText('👋 Watching from '); inputRef.current?.focus(); }
    return undefined;
  };

  // /donate 10 message · /gift @name 1m · /tts · /member · /help
  const runCommand = (raw) => {
    const [cmd, ...rest] = raw.trim().split(/\s+/);
    const c = cmd.toLowerCase();
    if (c === '/donate' || c === '/tip') {
      const amt = rest[0] && /^\$?\d+(\.\d{1,2})?$/.test(rest[0]) ? Math.round(Number(rest[0].replace('$', '')) * 100) : undefined;
      openPay('donate', { amountCents: amt, message: (amt ? rest.slice(1) : rest).join(' ') });
      return true;
    }
    if (c === '/gift') {
      const to = rest.find((x) => x.startsWith('@')) || (rest[0] && !/^\d/.test(rest[0]) ? rest[0] : '');
      const len = rest.find((x) => /^(1|3|12)(m|mo|month|months)?$/i.test(x));
      const plan = len ? { 1: 'homies_1m', 3: 'homies_3m', 12: 'homies_12m' }[parseInt(len, 10)] : undefined;
      openPay('gift', { to: to.replace(/^@/, ''), plan });
      return true;
    }
    if (c === '/tts') { act('tts'); return true; }
    if (c === '/member' || c === '/membership' || c === '/join') { act('member'); return true; }
    if (c === '/help') { setHelp(true); return true; }
    return false;
  };

  const send = async (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    if (content.startsWith('/') && runCommand(content)) { setText(''); return; }
    setSending(true);
    try {
      const { data } = await api.post('/livechat/messages', { content, nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      if (data.result?.message) { freshIds.current.add(data.result.message.id); mergeMessages([data.result.message]); }
      setText('');
      atBottomRef.current = true;
      requestAnimationFrame(() => toBottom());
    } catch (err) {
      flash(err.response?.data?.message || "Couldn't send that.", 'bad');
    } finally { setSending(false); }
  };

  const chatBlocked = user && me && !me.canChat;
  const live = !!state?.live;
  const pinnedNow = pinned.filter((m) => m.special?.pinnedUntil && new Date(m.special.pinnedUntil) > new Date());

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0b0b0d] text-white lg:flex-row">
      {/* ── Stream column ── */}
      <div className="flex shrink-0 flex-col lg:min-w-0 lg:flex-1">
        <header className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 lg:px-5">
          <Link to="/" aria-label="Home" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
          <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-wider', live ? 'bg-[#ff0033] text-white' : state?.upcoming ? 'bg-[#ffb300] text-black' : 'bg-white/10 text-white/60')}>
            {live && <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />}
            {live ? 'LIVE' : state?.upcoming ? 'STARTING SOON' : 'OFFLINE'}
          </span>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold lg:text-base">{state?.title || 'Mwosa — The Homies'}</h1>
          {state?.watching > 0 && <span className="flex items-center gap-1 text-xs text-white/60"><Eye className="h-4 w-4" />{state.watching}</span>}
          {me?.owner && (
            <button type="button" onClick={() => setOwnerPanel(true)} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/15"><Users className="h-3.5 w-3.5" /> Viewers</button>
          )}
        </header>

        <div className="relative aspect-video w-full bg-black lg:aspect-auto lg:flex-1">
          <Player state={state} source={source} />
          {alert && (
            <div key={alert.key} className="live-alert pointer-events-none absolute inset-x-3 top-3 z-10 mx-auto max-w-lg overflow-hidden rounded-2xl shadow-2xl" style={{ background: alert.color || '#F0B94D' }}>
              <div className="flex items-center gap-3 px-4 py-3 text-white">
                <span className="text-2xl">{alert.kind === 'gift' ? '🎁' : '💸'}</span>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-extrabold">
                    {alert.kind === 'gift' ? `${alert.name} gifted ${alert.to || 'themselves'} ${alert.planLabel}` : `${alert.name} donated ${fmtUsd(alert.amountCents)}`}
                  </div>
                  {alert.message && <div className="line-clamp-2 text-sm text-white/90">{alert.message}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 lg:px-5">
          {['youtube', 'kick'].map((p) => (
            <button key={p} type="button" onClick={() => setSource(p)}
              className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors', source === p ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/10')}>
              <PlatformDot platform={p} /> {p === 'youtube' ? 'YouTube' : 'Kick'}
              {state?.[p]?.live && <span className="h-1.5 w-1.5 rounded-full bg-[#ff0033]" />}
            </button>
          ))}
          {supporters.length > 0 && (
            <div className="ml-auto hidden min-w-0 items-center gap-2 truncate text-xs text-white/50 sm:flex">
              <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-[#ff7a45]" />
              {supporters.slice(0, 3).map((s) => <span key={s.name} className="truncate"><span className="font-semibold text-white/80">{s.name}</span> {fmtUsd(s.amountCents)}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat column ── */}
      <aside className="relative flex min-h-0 flex-1 flex-col border-white/[0.06] lg:w-[400px] lg:flex-none lg:border-l">
        {pinnedNow.length > 0 && (
          <div className="live-scroll flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-2 py-1.5">
            {pinnedNow.map((m) => (
              <span key={m.id} className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: m.special.color || '#F0B94D' }}>
                {m.author?.name} · {m.special.kind === 'donation' ? fmtUsd(m.special.amountCents) : `${(m.special.points || 0).toLocaleString()} pts`}
              </span>
            ))}
          </div>
        )}

        <div ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Live chat" className="live-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {hasMore ? (
            <button type="button" onClick={loadOlder} className="mx-auto mb-2 flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70 hover:bg-white/10">
              {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" />} Load older{isOwnerView ? " (owner: full history)" : ""}
            </button>
          ) : (
            <div className="mb-2 text-center text-[11px] text-white/35">{isOwnerView ? 'Start of the live chat' : 'Live chat · last 24 hours'}</div>
          )}
          {messages.length === 0 && <div className="mt-10 text-center text-sm text-white/40">No messages yet — say something 👋</div>}
          {messages.map((m) => <LiveMessage key={m.id} m={m} fresh={freshIds.current.has(m.id)} />)}
        </div>

        <div className="relative border-t border-white/[0.06] bg-[#0f1013] px-2 pt-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          {!atBottom && (
            <button type="button" onClick={() => { toBottom(); setUnread(0); }} className="absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow-lg">
              <ArrowDown className="h-3.5 w-3.5" /> {unread ? `${unread} new` : 'Latest'}
            </button>
          )}

          {bubble && (
            <div key={bubble.key} className="live-bubble absolute bottom-full left-2 right-2 z-20 mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1b1c20]/95 p-3 shadow-2xl backdrop-blur">
              <span className="text-2xl">{bubble.icon}</span>
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/85">{bubble.text}</p>
              <button type="button" onClick={() => act(bubble.action)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">{bubble.cta}</button>
              <button type="button" aria-label="Dismiss" onClick={() => { setBubble(null); try { sessionStorage.setItem('hh_live_popups_off', '1'); } catch { /* ignore */ } }} className="shrink-0 rounded-full p-1 text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          )}

          {help && (
            <div className="absolute bottom-full left-2 right-2 z-30 mb-2 rounded-xl border border-white/10 bg-[#16171b] p-3 shadow-2xl text-xs leading-relaxed text-white/70">
              <div className="mb-1 flex items-center justify-between"><span className="font-bold text-white">Chat actions</span><button type="button" onClick={() => setHelp(false)} aria-label="Close help"><X className="h-3.5 w-3.5" /></button></div>
              <div><b className="text-white">Donate</b> — tip any amount; it’s pinned in chat and pops up on stream. <code className="text-white/90">/donate 10 big up</code></div>
              <div><b className="text-white">Gift</b> — buy a Homies membership for anyone in chat (or yourself). <code className="text-white/90">/gift @name 1m</code></div>
              <div><b className="text-white">Membership</b> — join The Homies for every stream, the archive and the Discord.</div>
              <div><b className="text-white">TTS</b> — text-to-speech for donations. <span className="text-white/45">Off right now.</span></div>
              <div className="mt-1 text-white/45">Your messages show here and in the Discord.</div>
            </div>
          )}
          {/* What you can do here */}
          <div className="mb-2 grid grid-cols-4 gap-1.5">
            {[
              { k: 'donate', icon: HeartHandshake, label: 'Donate', hint: 'Tip any amount', tone: 'text-[#ff7a45]' },
              { k: 'gift', icon: Gift, label: 'Gift', hint: 'Membership for someone', tone: 'text-[#F0B94D]' },
              { k: 'member', icon: Star, label: member ? 'Member ✓' : 'Join', hint: member ? 'You’re a Homie' : 'Become a member', tone: 'text-[#7aa2ff]' },
              { k: 'tts', icon: state?.ttsEnabled ? Volume2 : VolumeX, label: 'TTS', hint: state?.ttsEnabled ? 'On' : 'Off right now', tone: 'text-white/40' },
            ].map((a) => (
              <button key={a.k} type="button" onClick={() => act(a.k)} className={cn('flex flex-col items-center rounded-xl bg-white/[0.04] px-1 py-1.5 transition-colors hover:bg-white/[0.08]', a.k === 'tts' && !state?.ttsEnabled && 'opacity-60')}>
                <a.icon className={cn('h-4 w-4', a.tone)} />
                <span className="mt-0.5 text-[11px] font-semibold">{a.label}</span>
                <span className="hidden text-[10px] leading-tight text-white/40 sm:block">{a.hint}</span>
              </button>
            ))}
          </div>

          {/* Quick text bubbles */}
          {(!user || me?.canChat) && (
            <div className="live-scroll mb-2 flex gap-1.5 overflow-x-auto">
              {TEXT_BUBBLES.map((t) => (
                <button key={t} type="button" onClick={() => { if (!user) return needLogin(); setText(t); inputRef.current?.focus(); return undefined; }}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/75 hover:border-white/25 hover:text-white">{t}</button>
              ))}
            </div>
          )}

          {!user ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onLoginRequest?.()} className="flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-black">Sign in to chat</button>
              <span className="text-[11px] text-white/40">Watching as a guest</span>
            </div>
          ) : chatBlocked ? (
            <div className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white/75">
              {me.chatBlock?.code === 'gate_required'
                ? <>Finish joining The Homies to chat. <Link to="/join" className="font-semibold text-[#6cb6ff] hover:underline">Continue →</Link></>
                : me.chatBlock?.message || "You can't chat right now."}
            </div>
          ) : (
            <form onSubmit={send} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input ref={inputRef} aria-label="Chat message" value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} maxLength={300}
                  placeholder={live ? 'Chat with the stream…  (/donate 5, /gift @name)' : 'Say something…'}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 pl-3 pr-9 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
                <button type="button" onClick={() => setHelp((v) => !v)} aria-label="Chat commands" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"><HelpCircle className="h-4 w-4" /></button>
              </div>
              <button type="submit" disabled={!text.trim() || sending} aria-label="Send" className="rounded-xl bg-[#ff3d5a] p-2.5 text-white transition-opacity disabled:opacity-30">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      </aside>

      {toast && (
        <div role="status" aria-live="polite" className={cn('live-bubble fixed left-1/2 top-14 z-[80] max-w-[92vw] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold shadow-2xl', toast.tone === 'bad' ? 'bg-[#ff5252] text-white' : toast.tone === 'good' ? 'bg-[#10b981] text-white' : 'bg-white text-black')}>
          {toast.msg}
        </div>
      )}

      <PaySheet
        open={!!pay}
        tab={pay?.tab}
        preset={pay?.preset || {}}
        catalog={catalog}
        card={me?.card}
        onClose={() => setPay(null)}
        onDone={(r) => {
          flash(r.payment?.kind === 'gift' ? 'Gift sent 🎁' : 'Donation sent — thank you! 🙌', 'good');
          api.get('/livechat/me').then(({ data }) => setMe(data.result)).catch(() => {});
        }}
      />
      {ownerPanel && <LiveOwnerPanel state={state} onClose={() => setOwnerPanel(false)} onState={setState} />}
    </div>
  );
}
