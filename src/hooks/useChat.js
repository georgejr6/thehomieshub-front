import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import api from '@/api/homieshub';
import { ChatSocket } from '@/lib/chatSocket';

// All Homies Chat client state: bootstrap (server, roles, me, channels with
// unread/mention counts), per-channel message lists, typing, presence and
// the member list. Live events from /ws/chat are folded in here, so the UI
// components just render.

const initial = {
  status: 'idle', // idle | connecting | connected | reconnecting | unauthorized | banned | chat_banned | error
  error: null,
  server: null,
  roles: [],
  me: null,
  channels: [],
  messages: {}, // channelId -> { list: [oldest..newest], hasMore, loading, loaded }
  typing: {},   // channelId -> { userId: expiresAt }
  presence: {},
  members: [],
  users: {},    // userId -> author card (from messages + member list)
  // Homies Points (utils/points.js on the backend)
  wallet: { balance: null, pulse: null }, // pulse: last change { change, label, earned, at }
  shoutouts: {}, // channelId -> active (still pinned) shoutout messages
  celebration: null, // { id, kind, channelId, at } — a gift/shoutout just landed
  notice: null, // { kind: 'gifted', from, planLabel, endsAt, at } — shown to the recipient
};

const liveShoutouts = (list) => list.filter((m) => m.special?.pinnedUntil && new Date(m.special.pinnedUntil) > new Date())
  .sort((a, b) => (b.special.points - a.special.points) || (a.id < b.id ? 1 : -1));

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const cmpId = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // ObjectId hex sorts by time

function upsertMessage(list, msg) {
  const i = list.findIndex((m) => m.id === msg.id || (msg.nonce && m.nonce === msg.nonce && m.pending));
  if (i >= 0) {
    const next = list.slice();
    next[i] = { ...msg, pending: false, failed: false };
    return next;
  }
  const next = [...list, msg];
  // Keep order even if a live event races a history page.
  if (list.length && cmpId(list[list.length - 1].id, msg.id) > 0 && !msg.pending) next.sort((a, b) => cmpId(a.id, b.id));
  return next;
}

function reducer(state, a) {
  switch (a.type) {
    case 'status':
      return { ...state, status: a.status, error: a.error ?? state.error };
    case 'bootstrap': {
      const r = a.data;
      return {
        ...state,
        server: r.server,
        roles: r.roles,
        me: r.me,
        channels: r.channels,
        presence: { ...r.presence },
        users: { ...state.users, [r.me.id]: r.me },
      };
    }
    case 'members':
      return { ...state, members: a.list, users: { ...state.users, ...byId(a.list) } };
    case 'history': {
      const cur = state.messages[a.channelId] || { list: [] };
      const incoming = a.list.slice().reverse(); // API is newest-first
      const merged = a.replace ? incoming : [...incoming, ...cur.list.filter((m) => !incoming.some((x) => x.id === m.id))];
      merged.sort((x, y) => (x.pending ? 1 : y.pending ? -1 : cmpId(x.id, y.id)));
      const users = { ...state.users };
      for (const m of incoming) if (m.author?.id) users[m.author.id] = m.author;
      return {
        ...state,
        users,
        messages: { ...state.messages, [a.channelId]: { list: merged, hasMore: a.hasMore, loading: false, loaded: true } },
      };
    }
    case 'loading':
      return { ...state, messages: { ...state.messages, [a.channelId]: { ...(state.messages[a.channelId] || { list: [] }), loading: true } } };
    case 'message': {
      const m = a.live && a.message.special ? { ...a.message, live: true } : a.message;
      const cur = state.messages[m.channelId];
      const messages = cur ? { ...state.messages, [m.channelId]: { ...cur, list: upsertMessage(cur.list, m) } } : state.messages;
      let channels = state.channels;
      if (a.live && !m.pending) {
        channels = state.channels.map((c) => {
          if (c.id !== m.channelId) return c;
          const mine = m.author?.id === state.me?.id;
          const pinged = !mine && (m.mentions?.includes(state.me?.id) || m.mentionEveryone || m.mentionRoles?.some((r) => state.me?.roleIds?.includes(r)));
          return {
            ...c,
            lastMessageId: m.id,
            unread: mine || a.focused ? c.unread : (c.unread || 0) + 1,
            mentions: pinged && !a.focused ? (c.mentions || 0) + 1 : c.mentions,
          };
        });
      }
      const typing = state.typing[m.channelId]?.[m.author?.id]
        ? { ...state.typing, [m.channelId]: Object.fromEntries(Object.entries(state.typing[m.channelId]).filter(([u]) => u !== m.author.id)) }
        : state.typing;
      return { ...state, messages, channels, typing, users: m.author?.id ? { ...state.users, [m.author.id]: m.author } : state.users };
    }
    case 'patchMessage': {
      const cur = state.messages[a.channelId];
      if (!cur) return state;
      return {
        ...state,
        messages: { ...state.messages, [a.channelId]: { ...cur, list: cur.list.map((m) => (m.id === a.id || m.nonce === a.id ? { ...m, ...a.patch } : m)) } },
      };
    }
    case 'removeMessages': {
      const cur = state.messages[a.channelId];
      if (!cur) return state;
      const ids = new Set(a.ids);
      return { ...state, messages: { ...state.messages, [a.channelId]: { ...cur, list: cur.list.filter((m) => !ids.has(m.id) && !ids.has(m.nonce)) } } };
    }
    case 'reaction': {
      const d = a.d;
      const cur = state.messages[d.channelId];
      if (!cur) return state;
      const list = cur.list.map((m) => {
        if (m.id !== d.messageId) return m;
        let reactions = m.reactions.map((r) => {
          if (r.emoji !== d.emoji) return r;
          const users = d.added ? [...new Set([...r.users, d.userId])] : r.users.filter((u) => u !== d.userId);
          return { ...r, count: d.count, users };
        });
        if (!reactions.some((r) => r.emoji === d.emoji) && d.count > 0) reactions = [...reactions, { emoji: d.emoji, count: d.count, users: d.added ? [d.userId] : [] }];
        return { ...m, reactions: reactions.filter((r) => r.count > 0) };
      });
      return { ...state, messages: { ...state.messages, [d.channelId]: { ...cur, list } } };
    }
    case 'postUpdated': {
      // Same post can be shared in several channels; keep this viewer's vote.
      const messages = {};
      for (const [cid, cur] of Object.entries(state.messages)) {
        if (!cur.list.some((m) => m.post?.id === a.postId)) { messages[cid] = cur; continue; }
        messages[cid] = {
          ...cur,
          list: cur.list.map((m) => {
            if (m.post?.id !== a.postId) return m;
            const next = { ...m.post, ...a.post };
            if (next.poll) next.poll = { ...next.poll, myVote: a.myVote !== undefined ? a.myVote : m.post.poll?.myVote ?? null };
            return { ...m, post: next };
          }),
        };
      }
      return { ...state, messages };
    }
    case 'read':
      return { ...state, channels: state.channels.map((c) => (c.id === a.channelId ? { ...c, unread: 0, mentions: 0, lastReadId: a.lastReadId || c.lastReadId } : c)) };
    case 'typing': {
      const ch = { ...(state.typing[a.channelId] || {}), [a.userId]: Date.now() + 8000 };
      return { ...state, typing: { ...state.typing, [a.channelId]: ch } };
    }
    case 'typingSweep': {
      const now = Date.now();
      const typing = {};
      let changed = false;
      for (const [cid, users] of Object.entries(state.typing)) {
        const kept = Object.fromEntries(Object.entries(users).filter(([, exp]) => exp > now));
        if (Object.keys(kept).length !== Object.keys(users).length) changed = true;
        if (Object.keys(kept).length) typing[cid] = kept;
      }
      return changed ? { ...state, typing } : state;
    }
    case 'presence':
      return { ...state, presence: { ...state.presence, [a.userId]: a.status === 'offline' ? undefined : a.status } };
    case 'channelUpdated':
      return { ...state, channels: state.channels.map((c) => (c.id === a.channel.id ? { ...c, ...a.channel } : c)) };
    case 'me':
      return { ...state, me: { ...state.me, ...a.patch } };
    case 'wallet':
      return { ...state, wallet: { balance: a.balance ?? state.wallet.balance, pulse: a.change ? { change: a.change, label: a.label, earned: !!a.earned, at: Date.now() } : state.wallet.pulse } };
    case 'shoutouts':
      return { ...state, shoutouts: { ...state.shoutouts, [a.channelId]: liveShoutouts(a.list) } };
    case 'celebrate':
      return { ...state, celebration: a.celebration };
    case 'notice':
      return { ...state, notice: a.notice };
    default:
      return state;
  }
}

export function useChat({ enabled, activeChannelId }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const sockRef = useRef(null);
  const activeRef = useRef(activeChannelId);
  activeRef.current = activeChannelId;
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadBootstrap = useCallback(async () => {
    const { data } = await api.get('/chat/bootstrap');
    dispatch({ type: 'bootstrap', data: data.result });
    return data.result;
  }, []);

  const loadMembers = useCallback(async () => {
    const { data } = await api.get('/chat/members');
    dispatch({ type: 'members', list: data.result || [] });
  }, []);

  const loadHistory = useCallback(async (channelId, { before, replace } = {}) => {
    dispatch({ type: 'loading', channelId });
    const { data } = await api.get(`/chat/channels/${channelId}/messages`, { params: { limit: 50, ...(before ? { before } : {}) } });
    dispatch({ type: 'history', channelId, list: data.result.messages, hasMore: data.result.hasMore, replace });
  }, []);

  const markRead = useCallback(async (channelId) => {
    const ch = stateRef.current.channels.find((c) => c.id === channelId);
    if (!ch || (!ch.unread && !ch.mentions && ch.lastReadId === ch.lastMessageId)) return;
    dispatch({ type: 'read', channelId, lastReadId: ch.lastMessageId });
    try { await api.post(`/chat/channels/${channelId}/read`, {}); } catch { /* next open retries */ }
  }, []);

  // Connect once enabled (signed in).
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const onEvent = (op, d) => {
      switch (op) {
        case 'ready':
          // Fresh session (not a resume): reload state so nothing is stale.
          if (!d.resumed) {
            loadBootstrap().catch(() => {});
            if (activeRef.current) loadHistory(activeRef.current, { replace: true }).catch(() => {});
          }
          break;
        case 'resync':
          loadBootstrap().catch(() => {});
          if (activeRef.current) loadHistory(activeRef.current, { replace: true }).catch(() => {});
          break;
        case 'message.created': {
          const focused = d.channelId === activeRef.current && document.visibilityState === 'visible';
          dispatch({ type: 'message', message: d, live: true, focused });
          if (d.special) {
            if (d.special.kind === 'shoutout') dispatch({ type: 'shoutouts', channelId: d.channelId, list: [...(stateRef.current.shoutouts[d.channelId] || []), d] });
            if (d.channelId === activeRef.current) dispatch({ type: 'celebrate', celebration: { id: d.id, kind: d.special.kind, color: d.special.color, channelId: d.channelId, at: Date.now() } });
          }
          if (focused) setTimeout(() => markRead(d.channelId), 300);
          break;
        }
        case 'message.updated':
          dispatch({ type: 'message', message: d });
          break;
        case 'message.deleted':
          dispatch({ type: 'removeMessages', channelId: d.channelId, ids: [d.id] });
          break;
        case 'message.bulk_deleted':
          dispatch({ type: 'removeMessages', channelId: d.channelId, ids: d.ids });
          break;
        case 'message.pinned':
          dispatch({ type: 'patchMessage', channelId: d.channelId, id: d.id, patch: { pinned: d.pinned } });
          break;
        case 'post.updated':
          dispatch({ type: 'postUpdated', postId: d.postId, post: d.post });
          break;
        case 'reaction.updated':
          dispatch({ type: 'reaction', d });
          break;
        case 'typing.started':
          dispatch({ type: 'typing', channelId: d.channelId, userId: d.userId });
          break;
        case 'presence.updated':
          dispatch({ type: 'presence', userId: d.userId, status: d.status });
          break;
        case 'read.updated':
          dispatch({ type: 'read', channelId: d.channelId, lastReadId: d.lastReadId });
          break;
        case 'channel.updated':
          dispatch({ type: 'channelUpdated', channel: d });
          break;
        case 'channels.changed':
        case 'roles.updated':
        case 'channel.created':
          loadBootstrap().catch(() => {});
          break;
        case 'wallet.updated':
          dispatch({ type: 'wallet', balance: d.balance, change: d.change, label: d.label, earned: d.earned });
          break;
        case 'membership.updated':
          if (d.from) dispatch({ type: 'notice', notice: { kind: 'gifted', from: d.from, planLabel: d.planLabel, endsAt: d.endsAt, at: Date.now() } });
          break;
        case 'mod.action':
          if (d.type === 'timeout') dispatch({ type: 'me', patch: { mutedUntil: d.until } });
          if (d.type === 'untimeout') dispatch({ type: 'me', patch: { mutedUntil: null } });
          dispatch({ type: 'status', status: stateRef.current.status, error: d.type === 'timeout' ? `You've been timed out until ${new Date(d.until).toLocaleTimeString()}.${d.reason ? ` Reason: ${d.reason}` : ''}` : d.type === 'kick' ? 'You were kicked from the chat.' : null });
          break;
        default:
          break;
      }
    };
    const sock = new ChatSocket({
      getToken: () => localStorage.getItem('access_token'),
      onEvent: (op, d) => !cancelled && onEvent(op, d),
      onStatus: (status, d) => !cancelled && dispatch({ type: 'status', status, error: d?.message || null }),
    });
    sockRef.current = sock;
    sock.connect();
    loadMembers().catch(() => {});
    const sweep = setInterval(() => dispatch({ type: 'typingSweep' }), 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sock.send('presence', { status: 'online' });
        if (activeRef.current) markRead(activeRef.current);
      } else sock.send('presence', { status: 'idle' });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(sweep);
      document.removeEventListener('visibilitychange', onVisible);
      sock.close();
    };
  }, [enabled, loadBootstrap, loadHistory, loadMembers, markRead]);

  // Open a channel: load history once, mark read, tell the server we're looking.
  useEffect(() => {
    if (!enabled || !activeChannelId || !state.channels.length) return;
    if (!state.channels.some((c) => c.id === activeChannelId)) return;
    if (!state.messages[activeChannelId]?.loaded) loadHistory(activeChannelId).catch(() => {});
    markRead(activeChannelId);
    sockRef.current?.send('focus', { channelId: activeChannelId });
  }, [enabled, activeChannelId, state.channels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async ({ channelId, content, attachments, replyTo, postId, postCard }) => {
    const sock = sockRef.current;
    const nonce = sock.nextNonce();
    const me = stateRef.current.me;
    // Optimistic copy, replaced by the server's version when the ack lands.
    dispatch({
      type: 'message',
      message: {
        id: nonce, nonce, pending: true, channelId, content, attachments: attachments || [], reactions: [], mentions: [], post: postCard || null,
        author: me, replyTo: replyTo ? { id: replyTo.id, author: replyTo.author, content: replyTo.content } : null,
        createdAt: new Date().toISOString(),
      },
    });
    const payload = { channelId, content, attachments, replyToId: replyTo?.id, nonce, postId };
    let ack;
    try {
      ack = await sock.request('message.create', payload);
    } catch {
      // Socket down: same nonce over REST, so a double delivery is impossible.
      try {
        const { data } = await api.post(`/chat/channels/${channelId}/messages`, payload);
        ack = { message: data.result.message, held: data.result.held };
      } catch (err) {
        ack = { error: { message: err.response?.data?.message || 'Message failed to send.' } };
      }
    }
    if (ack.error) {
      dispatch({ type: 'patchMessage', channelId, id: nonce, patch: { pending: false, failed: true, error: ack.error.message } });
      return { error: ack.error };
    }
    dispatch({ type: 'message', message: { ...ack.message, held: ack.held } });
    return { message: ack.message };
  }, []);

  const actions = useMemo(() => ({
    sendMessage,
    loadOlder: (channelId) => {
      const list = stateRef.current.messages[channelId]?.list || [];
      const oldest = list.find((m) => !m.pending);
      return loadHistory(channelId, { before: oldest?.id });
    },
    typing: (channelId) => sockRef.current?.send('typing', { channelId }),
    uploadFiles: async (channelId, files, onProgress) => {
      const form = new FormData();
      for (const f of files) form.append('files', f);
      const { data } = await api.post(`/chat/channels/${channelId}/uploads`, form, {
        onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0),
      });
      return data.result.attachments;
    },
    editMessage: async (id, content) => (await api.patch(`/chat/messages/${id}`, { content })).data.result,
    deleteMessage: async (id) => api.delete(`/chat/messages/${id}`),
    discardFailed: (channelId, nonce) => dispatch({ type: 'removeMessages', channelId, ids: [nonce] }),
    // Instant: show the reaction immediately, confirm over the open socket
    // (REST if it's down), undo if the server says no.
    react: async (id, emoji, add) => {
      const me = stateRef.current.me?.id;
      let channelId = null;
      let before = 0;
      for (const [cid, cur] of Object.entries(stateRef.current.messages)) {
        const msg = cur.list.find((x) => x.id === id);
        if (msg) { channelId = cid; before = msg.reactions?.find((r) => r.emoji === emoji)?.count || 0; break; }
      }
      const optimistic = { messageId: id, channelId, emoji, userId: me, added: add, count: Math.max(0, before + (add ? 1 : -1)) };
      if (channelId) dispatch({ type: 'reaction', d: optimistic });
      const undo = () => channelId && dispatch({ type: 'reaction', d: { ...optimistic, added: !add, count: before } });
      let result;
      try {
        const sock = sockRef.current;
        const nonce = sock.nextNonce();
        const ack = await sock.request('reaction', { messageId: id, emoji, add, nonce });
        if (ack.error) { undo(); throw Object.assign(new Error(ack.error.message), { response: { data: { message: ack.error.message } } }); }
        result = ack.reaction;
      } catch (err) {
        if (err.response) throw err; // server refused: already undone
        try {
          const { data } = await api[add ? 'put' : 'delete'](`/chat/messages/${id}/reactions/${encodeURIComponent(emoji)}`);
          result = data?.result;
        } catch (e2) { undo(); throw e2; }
      }
      if (result) dispatch({ type: 'reaction', d: result });
      return result;
    },
    pin: async (id, pinned) => api[pinned ? 'put' : 'delete'](`/chat/messages/${id}/pin`),
    report: async (id, reason, note) => api.post(`/chat/messages/${id}/report`, { reason, note }),
    // Moderation — the server applies it in Homies Chat and on Discord, and
    // reports the Discord outcome in `discord`.
    timeout: async (userId, minutes, reason) => (await api.post('/chat/mod/timeout', { userId, minutes, reason })).data.result,
    kick: async (userId, reason) => (await api.post('/chat/mod/kick', { userId, reason })).data.result,
    ban: async (userId, reason, deleteMessageHours) => (await api.post('/chat/mod/ban', { userId, reason, deleteMessageHours })).data.result,
    searchMembers: async (query) => (await api.get('/chat/members', { params: { query, limit: 8 } })).data.result || [],
    // Polls/events are real Homies posts (same endpoints as the app feed),
    // then shared into the channel as a live card.
    createPost: async (kind, body) => (await api.post(`/user/community/${kind}`, body)).data.result.post,
    votePoll: async (postId, optionId) => {
      const { data } = await api.post(`/user/posts/${postId}/vote`, { optionId });
      const poll = data.result?.poll;
      if (poll) {
        dispatch({
          type: 'postUpdated', postId, myVote: optionId,
          post: { poll: { question: poll.question, options: poll.options.map((o) => ({ id: o.id, text: o.text, votes: o.votesCount || 0 })), allowsMultiple: !!poll.allowsMultiple, expiresAt: poll.expiresAt || null } },
        });
      }
    },
    deleteMyHistory: async (channelId) => (await api.post('/chat/me/delete-history', channelId ? { channelId } : {})).data.result,
    // Discoverable posts: per-message public/private, and the global switch.
    setDiscover: async (id, mode) => {
      const { data } = await api.patch(`/chat/messages/${id}/discover`, { mode });
      dispatch({ type: 'message', message: data.result });
      return data.result;
    },
    setChatDiscoverable: async (value) => {
      await api.patch('/chat/me/settings', { chatDiscoverable: value });
      dispatch({ type: 'me', patch: { chatDiscoverable: value } });
    },
    reload: () => loadBootstrap(),
    // ── Homies Points ──
    loadWallet: async () => {
      const { data } = await api.get('/wallet/me');
      dispatch({ type: 'wallet', balance: data.result?.walletPoints || 0 });
      return data.result;
    },
    loadShoutouts: async (channelId) => {
      const { data } = await api.get(`/chat/channels/${channelId}/shoutouts`);
      dispatch({ type: 'shoutouts', channelId, list: data.result?.shoutouts || [] });
    },
    expireShoutouts: (channelId) => dispatch({ type: 'shoutouts', channelId, list: stateRef.current.shoutouts[channelId] || [] }),
    perksCatalog: async () => (await api.get('/chat/perks')).data.result,
    // Gift membership (toUserId omitted = redeem for yourself). Throws the API
    // error so the sheet can offer "buy points" on insufficient_points.
    gift: async (channelId, { toUserId, plan }) => {
      const { data } = await api.post(`/chat/channels/${channelId}/gift`, { toUserId, plan });
      dispatch({ type: 'message', message: data.result.message, live: true, focused: true });
      dispatch({ type: 'wallet', balance: data.result.balance });
      return data.result;
    },
    shoutout: async (channelId, { points, message }) => {
      const { data } = await api.post(`/chat/channels/${channelId}/shoutout`, { points, message });
      const m = data.result.message;
      dispatch({ type: 'message', message: m, live: true, focused: true });
      dispatch({ type: 'shoutouts', channelId, list: [...(stateRef.current.shoutouts[channelId] || []).filter((x) => x.id !== m.id), m] });
      dispatch({ type: 'wallet', balance: data.result.balance });
      return data.result;
    },
    points: {
      packs: async () => (await api.get('/wallet/packs')).data.result.packs,
      card: async () => (await api.get('/wallet/card')).data.result.card,
      removeCard: async () => (await api.delete('/wallet/card')).data.result,
      buy: async (body) => {
        const { data } = await api.post('/wallet/points/buy', body);
        if (data.result?.status === 'succeeded') dispatch({ type: 'wallet', balance: data.result.balance, change: data.result.credits, label: `Bought ${data.result.credits.toLocaleString()} points` });
        return data.result;
      },
    },
    clearCelebration: () => dispatch({ type: 'celebrate', celebration: null }),
    clearNotice: () => dispatch({ type: 'notice', notice: null }),
    markRead,
    clearError: () => dispatch({ type: 'status', status: stateRef.current.status, error: null }),
  }), [sendMessage, loadHistory, markRead, loadBootstrap]);

  return { state, actions };
}
