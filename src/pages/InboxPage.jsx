import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMessages } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Send, MessageSquarePlus, MoreVertical, Archive, Check, ArrowLeft, Image as ImageIcon, Smile, Gift, Mic, BellOff, Bell, Trash2, Flag, X, Square, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/api/homieshub';

// ── Stickers ──────────────────────────────────────────────────────────────────
const STICKERS = [
  '🔥','💯','😂','😍','🥶','💀',
  '👑','💎','💝','🎁','🌹','🎉',
  '🤝','💪','🙏','👏','🫡','❤️',
  '😤','🫶','🤣','😭','🤯','💫',
];

// ── Gifts ─────────────────────────────────────────────────────────────────────
const GIFTS = [
  { emoji: '🌹', label: 'Rose',    coins: 10 },
  { emoji: '💝', label: 'Heart',   coins: 25 },
  { emoji: '👑', label: 'Crown',   coins: 50 },
  { emoji: '💎', label: 'Diamond', coins: 100 },
  { emoji: '🚀', label: 'Rocket',  coins: 250 },
  { emoji: '🎉', label: 'Party',   coins: 5 },
];

// ── Message bubble renderer ───────────────────────────────────────────────────
const MessageBubble = ({ msg, isMe }) => {
  const base = cn(
    'flex w-max max-w-[75%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm',
    isMe ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'
  );

  if (msg.type === 'sticker') {
    return (
      <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
        <span className="text-5xl leading-none select-none">{msg.content}</span>
      </div>
    );
  }

  if (msg.type === 'gift') {
    return (
      <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
        <div className={cn('rounded-2xl px-4 py-3 text-center border', isMe ? 'bg-primary/20 border-primary/40' : 'bg-muted border-border')}>
          <div className="text-3xl mb-1">{msg.content?.split(' ')[0]}</div>
          <p className="text-xs font-medium text-muted-foreground">{isMe ? 'You sent a gift' : 'Sent you a gift'}</p>
          <p className="text-sm font-semibold mt-0.5">{msg.content?.split(' ').slice(2).join(' ')}</p>
        </div>
      </div>
    );
  }

  if (msg.type === 'voice' && msg.mediaUrl) {
    return (
      <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
        <div className={cn('rounded-2xl px-3 py-2 flex items-center gap-2', isMe ? 'bg-primary' : 'bg-muted')}>
          <Mic className="w-4 h-4 shrink-0 opacity-70" />
          <audio controls src={msg.mediaUrl} className="h-8 max-w-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      {msg.type === 'image' && msg.mediaUrl && (
        <div className="cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')}>
          <img src={msg.mediaUrl} alt="Shared content" className="rounded-xl max-w-full h-auto mb-1 max-h-[300px] object-cover" />
        </div>
      )}
      {msg.type === 'video' && msg.mediaUrl && (
        <video src={msg.mediaUrl} controls className="rounded-xl max-w-full h-auto mb-1 max-h-[300px]" />
      )}
      {msg.content}
    </div>
  );
};

// ── Last message preview text ─────────────────────────────────────────────────
const previewText = (msg, isMe) => {
  if (!msg) return '';
  const prefix = isMe ? 'You: ' : '';
  switch (msg.type) {
    case 'image':   return prefix + 'Sent an image';
    case 'video':   return prefix + 'Sent a video';
    case 'sticker': return prefix + `${msg.content || '🎭'} Sticker`;
    case 'gift':    return prefix + '🎁 Gift';
    case 'voice':   return prefix + '🎙 Voice message';
    default:        return prefix + (msg.content || '');
  }
};

// ── Toolbar: sticker / gift / voice / attachment ──────────────────────────────
const MessageToolbar = ({ onStickerSend, onGiftSend, onFileClick, onVoiceToggle, isRecording, isUploadingVoice, disabled }) => {
  const [stickerOpen, setStickerOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  return (
    <div className="flex items-center gap-0.5">
      {/* Attachment */}
      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9" onClick={onFileClick} disabled={disabled}>
        <ImageIcon className="h-5 w-5" />
      </Button>

      {/* Sticker picker */}
      <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9" disabled={disabled}>
            <Smile className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Stickers</p>
          <div className="grid grid-cols-6 gap-1">
            {STICKERS.map(s => (
              <button key={s} type="button"
                className="text-2xl leading-none p-1.5 rounded hover:bg-accent transition-colors"
                onClick={() => { onStickerSend(s); setStickerOpen(false); }}>
                {s}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Gift picker */}
      <Popover open={giftOpen} onOpenChange={setGiftOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9" disabled={disabled}>
            <Gift className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Send a Gift</p>
          <div className="grid grid-cols-3 gap-2">
            {GIFTS.map(g => (
              <button key={g.label} type="button"
                className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => { onGiftSend(g); setGiftOpen(false); }}>
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-xs font-medium">{g.label}</span>
                <span className="text-[10px] text-muted-foreground">{g.coins} coins</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Voice message */}
      <Button type="button" variant="ghost" size="icon"
        className={cn('shrink-0 h-9 w-9 transition-colors', isRecording ? 'text-red-500 hover:text-red-400 animate-pulse' : 'text-muted-foreground hover:text-foreground')}
        onClick={onVoiceToggle} disabled={isUploadingVoice || disabled}
        title={isRecording ? 'Stop recording' : 'Voice message'}>
        {isUploadingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
      </Button>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const InboxPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { threads, requests, sendMessage, getThread, createThread, acceptRequest, archiveRequest, searchUsers, markAsRead, muteThread, archiveThread, deleteThread, loadMessages, pollMessages } = useMessages();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  const activeUserParam = searchParams.get('user');
  const [activeThread, setActiveThread] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('primary');

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  useEffect(() => {
    if (activeUserParam) {
      const thread = getThread(activeUserParam) || createThread(activeUserParam);
      setActiveThread(thread);
      if (thread.id && thread.id !== 'temp') {
        markAsRead(thread.id);
        loadMessages(thread.id);
        return pollMessages(thread.id);
      }
    } else {
      setActiveThread(null);
    }
  }, [activeUserParam, threads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  const getRecipient = () =>
    activeThread?.participants.find(p => p !== user.username) || activeUserParam;

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q) {
      const results = await searchUsers(q);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (username) => {
    setSearchParams({ user: username });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedMedia) || !activeThread) return;
    const recipient = getRecipient();
    if (selectedMedia) {
      sendMessage(recipient, messageInput || (mediaType === 'image' ? 'Sent an image' : 'Sent a video'), mediaType, selectedMedia);
    } else {
      sendMessage(recipient, messageInput);
    }
    setMessageInput('');
    setSelectedMedia(null);
    setMediaType(null);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'messages');
      const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data?.result?.url || data?.url;
      if (url) {
        setSelectedMedia(url);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      }
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStickerSend = (emoji) => {
    if (!activeThread) return;
    sendMessage(getRecipient(), emoji, 'sticker', null);
  };

  const handleGiftSend = (gift) => {
    if (!activeThread) return;
    sendMessage(getRecipient(), `${gift.emoji} Sent a ${gift.label}`, 'gift', null);
    toast({ title: `${gift.emoji} Gift sent!`, description: `You sent a ${gift.label} (${gift.coins} coins)` });
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsUploadingVoice(true);
        try {
          const fd = new FormData();
          fd.append('file', blob, 'voice.webm');
          fd.append('folder', 'voice_messages');
          const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const url = data?.result?.url || data?.url;
          if (url && activeThread) sendMessage(getRecipient(), '🎙 Voice message', 'voice', url);
        } catch (err) {
          toast({ title: 'Voice upload failed', description: err.message, variant: 'destructive' });
        } finally {
          setIsUploadingVoice(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      toast({ title: '🎙 Recording...', description: 'Tap the stop button when done' });
    } catch {
      toast({ title: 'Microphone access denied', description: 'Allow microphone access to send voice messages', variant: 'destructive' });
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSettingsAction = (action) => {
    if (!activeThread) return;
    switch (action) {
      case 'mute':
        muteThread(activeThread.id, !activeThread.muted);
        toast({ title: activeThread.muted ? 'Notifications On' : 'Notifications Off' });
        break;
      case 'archive':
        archiveThread(activeThread.id);
        setActiveThread(null);
        setSearchParams({});
        toast({ title: 'Conversation Archived' });
        break;
      case 'delete':
        deleteThread(activeThread.id);
        setActiveThread(null);
        setSearchParams({});
        toast({ title: 'Conversation Deleted', variant: 'destructive' });
        break;
      case 'report':
        toast({ title: 'Report Sent', description: 'We will review this conversation shortly.' });
        break;
    }
  };

  const getOtherParticipant = (thread) => {
    const other = thread.participants.find(p => p !== user.username);
    const otherObj = thread.participantObjects?.find(p => (typeof p === 'object' ? p.username : p) === other);
    return {
      username: other,
      avatar: otherObj?.avatarUrl || `https://avatar.vercel.sh/${other}.png`,
      name: otherObj?.name || other,
    };
  };

  const filteredThreads = threads.filter(t => {
    if (t.archived) return false;
    const other = t.participants.find(p => p !== user.username) || '';
    return other.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const ThreadMenu = ({ thread }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSettingsAction('mute')}>
          {thread.muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
          {thread.muted ? 'Unmute' : 'Mute'} Notifications
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSettingsAction('archive')}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSettingsAction('report')}><Flag className="mr-2 h-4 w-4" /> Report</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => handleSettingsAction('delete')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ChatInput = ({ mobile = false }) => (
    <div className={cn('border-t border-border bg-background', mobile ? 'p-3' : 'p-4')}>
      {selectedMedia && (
        <div className="mb-2 flex items-center gap-3 bg-muted/30 rounded-xl px-3 py-2">
          <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-black/50 shrink-0">
            {mediaType === 'image'
              ? <img src={selectedMedia} alt="Preview" className="h-full w-full object-cover" />
              : <video src={selectedMedia} className="h-full w-full object-cover" />}
          </div>
          <p className="text-xs text-muted-foreground flex-1">{mediaType === 'image' ? 'Image' : 'Video'} ready to send</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleRemoveMedia}><X className="h-4 w-4" /></Button>
        </div>
      )}
      <form onSubmit={handleSendMessage} className={cn('flex items-center gap-2', !mobile && 'max-w-3xl mx-auto')}>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
        <MessageToolbar
          onStickerSend={handleStickerSend}
          onGiftSend={handleGiftSend}
          onFileClick={() => fileInputRef.current?.click()}
          onVoiceToggle={handleVoiceToggle}
          isRecording={isRecording}
          isUploadingVoice={isUploadingVoice}
          disabled={!activeThread || isUploading}
        />
        <div className="flex-1 relative">
          <Input
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder={isUploading ? 'Uploading...' : isRecording ? 'Recording...' : 'Type a message...'}
            className="rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-input"
            disabled={isUploading || isRecording}
          />
        </div>
        <Button type="submit" size="icon" className="rounded-full shrink-0"
          disabled={(!messageInput.trim() && !selectedMedia) || isUploading || isRecording}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  // ── Mobile view ────────────────────────────────────────────────────────────
  if (isMobile && activeThread) {
    const other = getOtherParticipant(activeThread);
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        <div className="flex items-center p-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => { setSearchParams({}); setActiveThread(null); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center ml-2 flex-1 gap-2 cursor-pointer" onClick={() => navigate(`/profile/${other.username}`)}>
            <Avatar className="h-8 w-8"><AvatarImage src={other.avatar} /><AvatarFallback>{other.username?.charAt(0)}</AvatarFallback></Avatar>
            <span className="font-semibold text-sm">{other.username}</span>
          </div>
          <ThreadMenu thread={activeThread} />
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {activeThread.messages?.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isMe={msg.sender === user.username} />
            ))}
            {(!activeThread.messages || activeThread.messages.length === 0) && (
              <p className="text-center text-muted-foreground mt-10 text-sm">Start the conversation!</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <ChatInput mobile />
      </div>
    );
  }

  // ── Desktop view ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Thread list */}
      <div className={cn('w-full md:w-80 border-r border-border flex flex-col', isMobile && activeThread ? 'hidden' : 'flex')}>
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Messages</h1>
            <Button variant="ghost" size="icon"><MessageSquarePlus className="h-5 w-5" /></Button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-9 bg-muted/50" value={searchQuery} onChange={handleSearch} />
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
                <p className="text-xs font-semibold text-muted-foreground px-3 py-2 bg-muted/50">Suggestions</p>
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer" onClick={() => handleUserSelect(u.username)}>
                    <Avatar className="h-8 w-8"><AvatarImage src={u.avatar} /><AvatarFallback>{u.username?.charAt(0)}</AvatarFallback></Avatar>
                    <div><p className="font-medium text-sm">{u.name}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-2 mt-2">
            <Tabs defaultValue="primary" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="primary">Primary</TabsTrigger>
                <TabsTrigger value="requests">Requests {requests.length > 0 && `(${requests.length})`}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="flex-1">
            {activeTab === 'primary' ? (
              <div className="flex flex-col p-2 gap-1">
                {filteredThreads.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No messages yet.</p>}
                {filteredThreads.map(thread => {
                  const participant = getOtherParticipant(thread);
                  const isActive = activeThread?.id === thread.id;
                  const isUnread = !thread.lastMessage?.read && thread.lastMessage?.sender !== user.username;
                  return (
                    <div key={thread.id} onClick={() => handleUserSelect(participant.username)}
                      className={cn('flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors', isActive ? 'bg-accent' : 'hover:bg-muted/50', isUnread && 'font-semibold bg-primary/5')}>
                      <div className="relative">
                        <Avatar><AvatarImage src={participant.avatar} /><AvatarFallback>{participant.username?.charAt(0)}</AvatarFallback></Avatar>
                        {isUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-sm">{participant.username}</span>
                            {thread.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                            {thread.updatedAt ? formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: false }) : ''}
                          </span>
                        </div>
                        <p className={cn('text-xs truncate', isUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                          {previewText(thread.lastMessage, thread.lastMessage?.sender === user.username)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col p-2 gap-2">
                {requests.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No new message requests.</p>}
                {requests.map(req => (
                  <Card key={req.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://avatar.vercel.sh/${req.participants[0]}.png`} />
                          <AvatarFallback>{req.participants[0]?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">@{req.participants[0]}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{req.lastMessage?.content}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => acceptRequest(req.id)}><Check className="w-3 h-3 mr-1" /> Accept</Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => archiveRequest(req.id)}><Archive className="w-3 h-3 mr-1" /> Archive</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Chat area */}
      <div className={cn('flex-1 flex flex-col bg-background/50', isMobile ? 'hidden' : 'flex')}>
        {activeThread ? (
          <>
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${getOtherParticipant(activeThread).username}`)}>
                <Avatar>
                  <AvatarImage src={getOtherParticipant(activeThread).avatar} />
                  <AvatarFallback>{getOtherParticipant(activeThread).username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{getOtherParticipant(activeThread).username}</h2>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </div>
              <ThreadMenu thread={activeThread} />
            </header>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-3 max-w-3xl mx-auto">
                {activeThread.messages?.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isMe={msg.sender === user.username} />
                ))}
                {(!activeThread.messages || activeThread.messages.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <MessageSquarePlus className="h-12 w-12 mb-2 opacity-20" />
                    <p>Start the conversation with @{activeUserParam}</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <ChatInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="bg-muted/50 p-6 rounded-full mb-4">
              <Send className="h-10 w-10 opacity-50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
            <p>Send private photos and messages to a friend or group.</p>
            <Button variant="default" className="mt-6" onClick={() => document.querySelector('input[placeholder="Search users..."]')?.focus()}>
              Start a Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
