import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/api/homieshub';

const MessageContext = createContext();

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) throw new Error('useMessages must be used within a MessageProvider');
  return context;
};

// Normalize API thread → shape InboxPage expects
function normalizeThread(t, myUsername) {
  const participantObjects = t.participants || [];
  // participants as username strings: [other, ...me] — InboxPage finds p !== me
  const otherUsernames = participantObjects
    .map((p) => (typeof p === 'object' ? p.username : p))
    .filter((u) => u && u !== myUsername);
  const participants = [...otherUsernames, myUsername];

  const lastMsg = t.lastMessage
    ? {
        ...t.lastMessage,
        sender:
          typeof t.lastMessage.sender === 'object'
            ? t.lastMessage.sender?.username
            : t.lastMessage.sender,
        timestamp: t.lastMessage.createdAt || t.lastMessage.timestamp,
        read: (t.unreadCount || 0) === 0,
      }
    : null;

  return {
    ...t,
    id: t._id || t.id,
    participants,
    participantObjects, // raw objects with avatarUrl, name
    lastMessage: lastMsg,
    muted: !!t.muted,
    archived: !!t.archived,
    messages: [], // populated separately via loadMessages
  };
}

// Normalize API message → shape InboxPage expects
function normalizeMessage(msg, myUsername) {
  return {
    ...msg,
    id: msg._id || msg.id,
    sender:
      typeof msg.sender === 'object' ? msg.sender?.username : msg.sender,
    timestamp: msg.createdAt || msg.timestamp,
    mediaUrl: msg.attachmentUrl || null,
  };
}

export const MessageProvider = ({ children }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // True once the first /messages fetch finished — lets a /messages/<id> deep
  // link tell "not loaded yet" apart from "no such thread".
  const [hasLoaded, setHasLoaded] = useState(false);
  const [messagesByThread, setMessagesByThread] = useState({});

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await api.get('/messages');
      if (data.status) {
        setThreads((data.result.threads || []).map((t) => normalizeThread(t, user.username)));
        setRequests((data.result.requests || []).map((t) => normalizeThread(t, user.username)));
        setHasLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load threads', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // A different account (or signed out): drop the previous one's inbox.
  useEffect(() => {
    setThreads([]);
    setRequests([]);
    setMessagesByThread({});
    setHasLoaded(false);
  }, [user?._id, user?.username]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Poll for new threads every 8 seconds while logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadThreads, 8000);
    return () => clearInterval(interval);
  }, [user, loadThreads]);

  // Live DMs: useChat forwards the chat socket's dm.created as a window event
  // (when a chat socket is open); refresh the list and that thread at once
  // instead of waiting for the next poll.
  useEffect(() => {
    if (!user) return;
    // Only the list here — fetching a thread's messages marks it read on the
    // server, so InboxPage reloads messages only for the thread that's open.
    const onDm = () => { loadThreads(); };
    window.addEventListener('hh:dm-created', onDm);
    return () => window.removeEventListener('hh:dm-created', onDm);
  }, [user, loadThreads]);

  const loadMessages = useCallback(async (threadId) => {
    if (!threadId || threadId === 'temp') return [];
    try {
      const { data } = await api.get(`/messages/${threadId}`);
      if (data.status) {
        const msgs = (data.result.messages || []).map((m) =>
          normalizeMessage(m, user?.username)
        );
        setMessagesByThread((prev) => ({ ...prev, [threadId]: msgs }));
        return msgs;
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
    return [];
  }, [user]);

  const sendMessage = async (recipientUsername, content, type = 'text', attachment = null) => {
    // Optimistic update
    const existing = threads.find((t) => t.participants.includes(recipientUsername));
    const tempMsg = {
      id: `temp_${Date.now()}`,
      content: content || '',
      sender: user.username,
      timestamp: new Date().toISOString(),
      read: true,
      type,
      mediaUrl: typeof attachment === 'string' ? attachment : null,
    };
    if (existing) {
      setMessagesByThread((prev) => ({
        ...prev,
        [existing.id]: [...(prev[existing.id] || []), tempMsg],
      }));
    }

    try {
      const { data } = await api.post('/messages/send', {
        recipientUsername,
        content,
        type,
        attachmentUrl: typeof attachment === 'string' ? attachment : null,
      });
      if (data.status) {
        await loadThreads();
        return data.result;
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
    return null;
  };

  // Message requests (from people you don't follow) are real threads too —
  // a link to one must open it, not a blank new chat.
  const getThread = (username, threadId) => {
    const byId = threadId
      ? threads.find((t) => String(t.id) === String(threadId)) || requests.find((t) => String(t.id) === String(threadId))
      : null;
    const thread = byId
      || threads.find((t) => t.participants?.includes(username))
      || requests.find((t) => t.participants?.includes(username));
    if (!thread) return null;
    return { ...thread, isRequest: !threads.includes(thread), messages: messagesByThread[thread.id] || [] };
  };

  const getThreadById = (threadId) =>
    threads.find((t) => String(t.id) === String(threadId))
    || requests.find((t) => String(t.id) === String(threadId))
    || null;

  const createThread = (username) => {
    const existing = getThread(username);
    if (existing) return existing;
    return {
      id: 'temp',
      _id: null,
      participants: [username, user?.username].filter(Boolean),
      participantObjects: [],
      messages: [],
      lastMessage: null,
      muted: false,
      archived: false,
    };
  };

  const acceptRequest = async (threadId) => {
    try {
      await api.post(`/messages/${threadId}/accept`);
      setRequests((prev) => prev.filter((r) => r.id !== threadId));
      await loadThreads();
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const archiveRequest = async (threadId) => {
    setRequests((prev) => prev.filter((r) => r.id !== threadId));
  };

  const markAsRead = async (threadId) => {
    if (!threadId || threadId === 'temp') return;
    try {
      await api.post(`/messages/${threadId}/read`);
      // Same array back when nothing changed: a new array re-runs InboxPage's
      // thread effect, which marks read again — an endless request loop.
      const markOne = (prev) =>
        !prev.some((t) => t.id === threadId && (t.unreadCount || (t.lastMessage && !t.lastMessage.read)))
          ? prev
          : prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                unreadCount: 0,
                lastMessage: t.lastMessage ? { ...t.lastMessage, read: true } : null,
              }
            : t
        );
      setThreads(markOne);
      setRequests(markOne);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const muteThread = async (threadId, muted) => {
    if (!threadId || threadId === 'temp') return;
    try {
      await api.post(`/messages/${threadId}/mute`, { muted });
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, muted } : t)));
    } catch (err) {
      console.error('Failed to mute thread', err);
    }
  };

  const archiveThread = async (threadId) => {
    if (!threadId || threadId === 'temp') return;
    try {
      await api.post(`/messages/${threadId}/archive`, { archived: true });
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, archived: true } : t)));
    } catch (err) {
      console.error('Failed to archive thread', err);
    }
  };

  const deleteThread = async (threadId) => {
    if (!threadId || threadId === 'temp') return;
    try {
      await api.delete(`/messages/${threadId}`);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      console.error('Failed to delete thread', err);
    }
  };

  const searchUsers = async (query) => {
    if (!query) return [];
    try {
      const { data } = await api.get('/messages/search-users', { params: { q: query } });
      return data.result?.users || [];
    } catch (err) {
      console.error('Failed to search users', err);
      return [];
    }
  };

  const pollMessages = useCallback((threadId) => {
    if (!threadId || threadId === 'temp') return () => {};
    const interval = setInterval(() => loadMessages(threadId), 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const value = {
    threads,
    requests,
    isLoading,
    hasLoaded,
    getThreadById,
    messagesByThread,
    sendMessage,
    getThread,
    createThread,
    acceptRequest,
    archiveRequest,
    searchUsers,
    markAsRead,
    muteThread,
    archiveThread,
    deleteThread,
    loadThreads,
    loadMessages,
    pollMessages,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};
