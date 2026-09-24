import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Hash, Megaphone, Menu, Users, X, Loader2, CornerDownRight, Globe, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import ChannelSidebar from '@/components/chat/ChannelSidebar';
import MessageList from '@/components/chat/MessageList';
import Composer from '@/components/chat/Composer';
import MemberList from '@/components/chat/MemberList';
import ClaimNameBar from '@/components/chat/ClaimNameBar';
import PointsPill from '@/components/chat/perks/PointsPill';
import PerksSheet, { takePendingPerk } from '@/components/chat/perks/PerksSheet';
import ShoutoutTicker from '@/components/chat/perks/ShoutoutTicker';
import Celebration from '@/components/chat/perks/Celebration';
import Leaderboard from '@/components/chat/perks/Leaderboard';
import { cn } from '@/lib/utils';

// Homies Chat — the Discord-style community chat, built into the app.
// Full-screen layout (server header, channel sidebar, messages, member
// list), backed by /api/chat + the /ws/chat realtime gateway.
export default function ChatPage({ onLoginRequest }) {
  const { user, loading } = useAuth();
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { state, actions } = useChat({ enabled: !!user, activeChannelId: channelId });
  const [drawer, setDrawer] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [toast, setToast] = useState(null);
  const [editRequest, setEditRequest] = useState(null);
  const [newSince, setNewSince] = useState({}); // channelId -> lastReadId when opened
  const [perks, setPerks] = useState({ open: false, initial: null });
  const openPerks = useCallback((initial) => setPerks({ open: true, initial: initial || null }), []);
  const closePerks = useCallback(() => setPerks((p) => ({ ...p, open: false })), []);
  // Leaderboard: probed once on sign-in; the trophy only shows if the API
  // answers (older backends 404 → stays hidden).
  const [board, setBoard] = useState({ available: false, initial: null, open: false });
  const closeBoard = useCallback(() => setBoard((b) => ({ ...b, open: false })), []);

  const channel = state.channels.find((c) => c.id === channelId);

  // No channel in the URL (or one you can't see): go to the default/first visible one.
  useEffect(() => {
    if (!state.channels.length || channel) return;
    const def = state.channels.find((c) => c.id === state.server?.defaultChannelId) || state.channels.find((c) => c.can?.send) || state.channels[0];
    if (def) navigate(`/chat/${def.id}`, { replace: true });
  }, [state.channels, channel, state.server, navigate]);

  // Remember where "NEW" starts at the moment a channel is opened.
  useEffect(() => {
    if (!channel || newSince[channel.id] !== undefined) return;
    setNewSince((s) => ({ ...s, [channel.id]: channel.unread ? channel.lastReadId : null }));
  }, [channel?.id]); // eslint-disable-line

  useEffect(() => { setReplyTo(null); }, [channelId]);
  // Homies Points: balance once signed in, pinned shoutouts per channel.
  useEffect(() => { if (user) actions.loadWallet().catch(() => {}); }, [user]); // eslint-disable-line
  useEffect(() => { if (user && channelId) actions.loadShoutouts(channelId).catch(() => {}); }, [user, channelId]); // eslint-disable-line
  useEffect(() => {
    if (!user) return undefined;
    let live = true;
    actions.leaderboard('week')
      .then((r) => { if (live && r) setBoard((b) => ({ ...b, available: true, initial: r })); })
      .catch(() => {});
    return () => { live = false; };
  }, [user]); // eslint-disable-line

  // Back from Stripe Checkout (?points=success|cancel): refresh the balance
  // (the webhook can land a moment later) and reopen whatever they were doing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('points');
    if (!user || !result) return;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    const pending = takePendingPerk();
    if (result === 'success') {
      setToast('Payment received — adding your points…');
      let n = 0;
      const tick = setInterval(() => { actions.loadWallet().catch(() => {}); if (++n >= 6) clearInterval(tick); }, 1500);
      if (pending) setTimeout(() => openPerks({ tab: pending.resume || pending.tab, gift: pending.gift, shoutout: pending.shoutout, resume: pending.resume }), 1800);
    } else {
      setToast('Checkout canceled — nothing was charged.');
      if (pending) openPerks({ tab: pending.tab, gift: pending.gift, shoutout: pending.shoutout, need: pending.need, resume: pending.resume });
    }
  }, [user]); // eslint-disable-line

  // Someone gifted you membership: banner + confetti.
  const noticeBurst = useMemo(() => (state.notice ? { id: `notice-${state.notice.at}`, kind: 'gift' } : null), [state.notice]);
  useEffect(() => {
    if (!state.notice) return undefined;
    const t = setTimeout(() => actions.clearNotice(), 9000);
    return () => clearTimeout(t);
  }, [state.notice]); // eslint-disable-line
  useEffect(() => {
    if (!state.error) return undefined;
    setToast(state.error);
    actions.clearError();
    return undefined;
  }, [state.error]); // eslint-disable-line
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const open = useCallback((id) => navigate(`/chat/${id}`), [navigate]);
  // Polls/events use the app's post endpoints, which need a paid membership (or admin).
  const canCreatePosts = !!(user?.isAdmin || ['homie', 'nomad'].includes(state.me?.tier));
  const toggleDiscoverable = async (value) => {
    try {
      await actions.setChatDiscoverable(value);
      setToast(value ? 'Discoverable posts on — good posts in public channels can be found in The Homies.' : 'Discoverable posts off — your chat posts stay in chat unless you make one public.');
    } catch (err) {
      setToast(err.response?.data?.message || "Couldn't change that setting.");
    }
  };
  const deleteHistory = async (channelId, name) => {
    const where = channelId ? `in #${name}` : 'across the whole chat';
    if (!window.confirm(`Delete ALL of your messages ${where}? This can't be undone.`)) return;
    try {
      const r = await actions.deleteMyHistory(channelId);
      setToast(`Deleted ${r.deleted} message${r.deleted === 1 ? '' : 's'}.`);
    } catch (err) {
      setToast(err.response?.data?.message || "Couldn't delete your messages.");
    }
  };
  const unreadTotal = useMemo(() => state.channels.reduce((n, c) => n + (c.mentions || 0), 0), [state.channels]);

  const ctx = useMemo(() => ({
    users: state.users,
    roles: state.roles,
    channels: state.channels,
    meId: state.me?.id,
    openChannel: open,
    editRequest,
    clearEditRequest: () => setEditRequest(null),
  }), [state.users, state.roles, state.channels, state.me?.id, open, editRequest]);

  const editLast = () => {
    const list = state.messages[channelId]?.list || [];
    const mine = [...list].reverse().find((m) => m.author?.id === state.me?.id && !m.pending && !m.source && !m.special);
    if (mine) setEditRequest(mine.id);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#313338]"><Loader2 className="h-8 w-8 animate-spin text-[#949BA4]" /></div>;

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#313338] px-6 text-center text-[#DBDEE1]">
        <Helmet><title>Chat · The Homies</title></Helmet>
        <h1 className="text-3xl font-bold text-white">The Homies Chat</h1>
        <p className="max-w-md text-[#B5BAC1]">The community chat lives right here in the app now. Log in to jump back into the conversation.</p>
        <button onClick={onLoginRequest} className="rounded bg-[#5865F2] px-6 py-2.5 font-medium text-white hover:bg-[#4752C4]">Log in</button>
      </div>
    );
  }

  if (state.status === 'banned' || state.status === 'chat_banned' || state.status === 'account_banned') {
    return <div className="flex h-screen items-center justify-center bg-[#313338] text-[#DBDEE1]">You've been banned from this chat.</div>;
  }

  const ChannelIcon = channel?.type === 'announcement' ? Megaphone : channel?.type === 'thread' ? CornerDownRight : Hash;

  return (
    <div className="fixed inset-0 flex bg-[#313338] font-sans text-[#DBDEE1]">
      <Helmet><title>{channel ? `#${channel.name}` : 'Chat'} · The Homies</title></Helmet>

      {/* Server rail */}
      <div className="hidden w-[72px] shrink-0 flex-col items-center gap-2 bg-[#1E1F22] py-3 md:flex">
        <div className="relative">
          <span className="absolute -left-3 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r bg-white" />
          {state.server?.iconUrl ? (
            <img src={state.server.iconUrl} alt="The Homies" className="h-12 w-12 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f47fff] text-lg font-bold text-white">TH</div>
          )}
          {unreadTotal > 0 && <span className="absolute -bottom-1 -right-1 rounded-full border-4 border-[#1E1F22] bg-[#F23F43] px-1 text-[11px] font-bold text-white">{unreadTotal}</span>}
        </div>
        <div className="mx-auto h-0.5 w-8 rounded bg-[#35363C]" />
      </div>

      {/* Channel sidebar: static on desktop, drawer on mobile */}
      <div className="hidden md:flex"><ChannelSidebar state={state} activeChannelId={channelId} onOpen={open} onDeleteHistory={deleteHistory} onToggleDiscoverable={toggleDiscoverable} /></div>
      {drawer && (
        <div className="chat-fade-in fixed inset-0 z-40 flex md:hidden">
          <div className="chat-slide-right flex h-full">
            <div className="w-[72px] bg-[#1E1F22]" />
            <ChannelSidebar state={state} activeChannelId={channelId} onOpen={open} onClose={() => setDrawer(false)} onDeleteHistory={deleteHistory} onToggleDiscoverable={toggleDiscoverable} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#1F2023] px-4 shadow-sm">
          <button onClick={() => setDrawer(true)} className="mr-1 text-[#B5BAC1] md:hidden"><Menu className="h-6 w-6" /></button>
          {channel && <ChannelIcon className="h-6 w-6 shrink-0 text-[#80848E]" />}
          <span key={channel?.id} className="chat-fade-in truncate font-semibold text-white">{channel?.name}</span>
          {channel?.discoverable && (
            <span title="Good posts here can become discoverable Homies posts (you control yours from the ⋯ menu)" className="chat-fade-in ml-1 hidden items-center gap-1 rounded-full bg-[#23A55A]/15 px-2 py-0.5 text-[11px] font-semibold text-[#23A55A] sm:flex">
              <Globe className="h-3 w-3" /> Discoverable
            </span>
          )}
          {channel?.topic && <><div className="mx-2 hidden h-6 w-px bg-[#3F4147] sm:block" /><span className="hidden truncate text-sm text-[#B5BAC1] sm:block">{channel.topic}</span></>}
          <div className="ml-auto flex items-center gap-3">
            {state.status !== 'connected' && state.status !== 'idle' && (
              <span className="chat-fade-in flex items-center gap-1 text-xs text-[#F0B232]"><Loader2 className="h-3 w-3 animate-spin" /> {state.status === 'connecting' ? 'Connecting' : 'Reconnecting'}</span>
            )}
            {board.available && (
              <button type="button" onClick={() => setBoard((b) => ({ ...b, open: true }))} title="Leaderboard" aria-label="Leaderboard"
                className="chat-pop rounded-full p-1 text-[#F0B94D] transition-colors hover:bg-[#F0B94D]/15 active:scale-95">
                <Trophy className="h-5 w-5" />
              </button>
            )}
            <PointsPill wallet={state.wallet} onClick={() => openPerks({ tab: 'points' })} />
            <button onClick={() => setShowMembers((s) => !s)} title="Member list" className={cn('hidden lg:block', showMembers ? 'text-white' : 'text-[#B5BAC1] hover:text-[#DBDEE1]')}><Users className="h-6 w-6" /></button>
          </div>
        </div>

        <ClaimNameBar me={state.me} onSaved={(name) => { setToast(`You're now @${name} — everyone sees your new name.`); actions.reload(); }} />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {channel ? (
              <>
                <ShoutoutTicker
                  shoutouts={state.shoutouts[channel.id]}
                  onExpire={() => actions.expireShoutouts(channel.id)}
                  onJump={(id) => document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
                />
                <div className="relative flex min-h-0 flex-1 flex-col">
                <Celebration celebration={state.celebration} onDone={actions.clearCelebration} />
                <MessageList
                  channel={channel}
                  data={state.messages[channel.id]}
                  state={state}
                  ctx={ctx}
                  actions={actions}
                  onReply={setReplyTo}
                  onError={setToast}
                  newSinceId={newSince[channel.id]}
                />
                </div>
                <Composer
                  channel={channel}
                  state={state}
                  actions={actions}
                  replyTo={replyTo}
                  clearReply={() => setReplyTo(null)}
                  onError={setToast}
                  onEditLast={editLast}
                  canCreatePosts={canCreatePosts}
                  onOpenPerks={openPerks}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#949BA4]" /></div>
            )}
          </div>
          {showMembers && <MemberList state={state} />}
        </div>
      </div>

      {board.available && <Leaderboard open={board.open} onClose={closeBoard} actions={actions} meId={state.me?.id} initial={board.initial} />}
      <PerksSheet open={perks.open} initial={perks.initial} onClose={closePerks} state={state} actions={actions} channel={channel} onToast={setToast} />

      {state.notice?.kind === 'gifted' && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <Celebration fall celebration={noticeBurst} onDone={() => {}} />
          <button type="button" onClick={actions.clearNotice} className="chat-pop chat-glow flex max-w-md items-center gap-3 rounded-2xl border border-[#F0B94D]/50 bg-gradient-to-br from-[#3a2e12] to-[#1f1b12] px-4 py-3 text-left shadow-2xl" style={{ '--glow': 'rgba(240, 185, 77, 0.5)' }}>
            <span className="chat-gift-bounce text-3xl">🎁</span>
            <span>
              <span className="block font-bold text-white">@{state.notice.from} gifted you {state.notice.planLabel}!</span>
              <span className="block text-sm text-[#C9B27A]">Full access until {new Date(state.notice.endsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}. Say thanks 👇</span>
            </span>
          </button>
        </div>
      )}

      {toast && (
        <div key={toast} className="chat-fade-up fixed bottom-24 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg bg-[#111214] px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
          <button onClick={() => setToast(null)} className="text-[#B5BAC1] hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
