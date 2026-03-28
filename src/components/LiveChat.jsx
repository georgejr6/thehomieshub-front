import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ChevronRight, Volume2, VolumeX, Diamond, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';

const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://backend.thehomies.app';

export default function LiveChat({ streamId, isCollapsible = true, className, onGiftMessage }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(3000);
  const historyLoadedRef = useRef(false);

  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  const speakDonation = useCallback((msg) => {
    if (!ttsEnabledRef.current || !window.speechSynthesis) return;
    const text = msg.ttsMessage?.trim()
      ? `${msg.fromUsername} says: ${msg.ttsMessage}`
      : msg.type === 'card_donation'
        ? `${msg.fromUsername} just donated with a card!`
        : `${msg.fromUsername} just sent ${msg.amount} points!`;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.volume = 1;
    window.speechSynthesis.speak(u);
  }, []);

  const usernameRef = useRef(user?.username || 'Guest');
  const avatarUrlRef = useRef(user?.avatarUrl || null);
  useEffect(() => {
    usernameRef.current = user?.username || 'Guest';
    avatarUrlRef.current = user?.avatarUrl || null;
  }, [user?.username, user?.avatarUrl]);

  const bottomRef = useRef(null);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      return next.length > 300 ? next.slice(-300) : next;
    });
  }, []);

  // Load chat history once on mount
  useEffect(() => {
    if (!streamId || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    api.get(`/live/${streamId}/chat`)
      .then(({ data }) => {
        const history = data?.result?.messages || [];
        if (history.length) setMessages(history);
      })
      .catch(() => {});
  }, [streamId]);

  const connect = useCallback(() => {
    if (!streamId) return;
    const params = new URLSearchParams({ streamId, username: usernameRef.current });
    if (avatarUrlRef.current) params.set('avatarUrl', avatarUrlRef.current);

    const ws = new WebSocket(`${WS_BASE}/ws/live-chat?${params}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = 3000;
      clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'viewer_count') {
          setViewerCount(msg.count);
        } else if (msg.type === 'gift') {
          if (onGiftMessage) onGiftMessage(msg);
          speakDonation(msg);
          addMessage({ ...msg, _key: `gift_${Date.now()}` });
        } else if (msg.type === 'card_donation') {
          speakDonation(msg);
          addMessage({ ...msg, _key: msg.id || `cd_${Date.now()}` });
        } else if (msg.type === 'join') {
          addMessage({ ...msg, _key: `join_${Date.now()}` });
        } else if (msg.type === 'chat' || msg.type === 'system') {
          addMessage({ ...msg, _key: msg.id || Math.random() });
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, reconnectDelay.current);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
    };

    ws.onerror = () => ws.close();
  }, [streamId, addMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = (e) => {
    e?.preventDefault();
    if (!input.trim() || !connected || wsRef.current?.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', content: input.trim() }));
    setInput('');
  };

  if (collapsed && isCollapsible) {
    return (
      <div className="flex flex-col items-center bg-[#0e0e0e] border-l border-white/5 h-full py-4">
        <button onClick={() => setCollapsed(false)} className="text-white/40 hover:text-white transition-colors p-2" title="Open Chat">
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col bg-[#0e0e0e] text-white h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Live Chat</h2>
          <span className="text-xs text-white/40 bg-white/5 rounded px-1.5 py-0.5">{viewerCount.toLocaleString()} watching</span>
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-green-500" : "bg-white/20")} title={connected ? "Connected" : "Connecting..."} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTtsEnabled(v => !v)}
            title={ttsEnabled ? "Mute donation TTS" : "Enable donation TTS"}
            className={cn("p-1.5 rounded transition-colors", ttsEnabled ? "text-primary hover:text-primary/80" : "text-white/20 hover:text-white/50")}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {isCollapsible && (
            <button onClick={() => setCollapsed(true)} className="text-white/40 hover:text-white transition-colors p-1.5">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {messages.length === 0 && (
          <p className="text-white/20 text-xs text-center pt-8">Chat is empty. Be the first to say something!</p>
        )}
        {messages.map((msg, i) => {

          // User joined
          if (msg.type === 'join') {
            return (
              <div key={msg._key || `join-${i}`} className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="text-xs font-semibold" style={{ color: msg.color || '#aaa' }}>{msg.username}</span>
                <span className="text-xs text-white/25">joined</span>
              </div>
            );
          }

          // Point gift
          if (msg.type === 'gift') {
            return (
              <div key={msg._key || `gift-${i}`} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Diamond className="h-3.5 w-3.5 text-primary fill-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-primary mr-1">{msg.fromUsername}</span>
                  <span className="text-xs text-white/60">sent {msg.amount} pts</span>
                  {msg.ttsMessage && (
                    <p className="text-sm text-white/90 mt-0.5 break-words">"{msg.ttsMessage}"</p>
                  )}
                </div>
              </div>
            );
          }

          // Card (Stripe) donation
          if (msg.type === 'card_donation') {
            return (
              <div key={msg._key || `cd-${i}`} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <CreditCard className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-green-400 mr-1">{msg.fromUsername}</span>
                  <span className="text-xs text-white/60">donated via card</span>
                  {msg.ttsMessage && (
                    <p className="text-sm text-white/90 mt-0.5 break-words">"{msg.ttsMessage}"</p>
                  )}
                </div>
              </div>
            );
          }

          // System (fallback)
          if (msg.type === 'system') {
            return (
              <div key={msg._key || `sys-${i}`} className="text-center text-white/25 text-xs py-1 italic">
                {msg.content}
              </div>
            );
          }

          // Regular chat
          const isMe = msg.username === user?.username;
          return (
            <div key={msg._key || msg.id || i} className="flex items-start gap-2 group hover:bg-white/[0.03] px-1 py-0.5 rounded">
              <Avatar className="h-5 w-5 shrink-0 mt-0.5">
                <AvatarImage src={msg.avatarUrl} />
                <AvatarFallback className="text-[8px]" style={{ backgroundColor: (msg.color || '#888') + '33' }}>
                  {msg.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs mr-1.5" style={{ color: msg.color || '#aaa' }}>
                  {isMe ? 'You' : msg.username}
                </span>
                <span className="text-sm text-white/80 break-words">{msg.content}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/5 shrink-0">
        {user ? (
          <form onSubmit={sendChat} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={connected ? "Say something..." : "Connecting..."}
              disabled={!connected}
              maxLength={300}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary rounded-full text-sm h-9"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || !connected} className="h-9 w-9 rounded-full shrink-0 bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <p className="text-white/30 text-xs text-center py-2">Sign in to chat</p>
        )}
      </div>
    </div>
  );
}
