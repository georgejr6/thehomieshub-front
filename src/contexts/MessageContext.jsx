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
  const [messagesByThread, setMessagesByThread] = useState({});

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await api.get('/messages');
      if (data.status) {
        setThreads((data.result.threads || []).map((t) => normalizeThread(t, user.username)));
        setRequests((data.result.requests || []).map((t) => normalizeThread(t, user.username)));
      }
    } catch (err) {
      console.error('Failed to load threads', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

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

  const getThread = (username) => {
    const thread = threads.find((t) => t.participants?.includes(username));
    if (!thread) return null;
    return { ...thread, messages: messagesByThread[thread.id] || [] };
  };

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
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                unreadCount: 0,
                lastMessage: t.lastMessage ? { ...t.lastMessage, read: true } : null,
              }
            : t
        )
      );
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

  const value = {
    threads,
    requests,
    isLoading,
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
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};
