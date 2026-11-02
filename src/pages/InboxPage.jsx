import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useMessages } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Send, MessageSquarePlus, MoreVertical, Archive, Check, ArrowLeft, Image as ImageIcon, Smile, Gift, Mic, BellOff, Bell, Trash2, Flag, X, Square, Loader2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/api/homieshub';
import { GifPanel } from '@/components/GifPicker';
import { useGifsEnabled, gifToAttachment } from '@/lib/gifs';
import { messageAttachments, isHttps, isVideoLike, messagePreview, MAX_DM_PHOTOS, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/dmAttachments';

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

// ── Links ─────────────────────────────────────────────────────────────────────
// Same idea as the backend's LINK_RE (homieshub-backend utils/linkPreview.js):
// full URLs, www. hosts and bare domains (subdomains too) on common TLDs.
// A match right after "@" is an email address, not a link.
const LINK_RE = /(https?:\/\/[^\s<>]+)|(\bwww\.[^\s<>]+)|(\b(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|gg|co|app|me|tv|gov|edu|biz|info|xyz|link|live|store|shop|online|site|club|stream|fans|cash|page|bio|to|ly|sh|fm|gl)\b(?:\/[^\s<>]*)?)/gi;
const TRAILING_PUNCT = /[.,!?;:)\]}'"]+$/;

const toHref = (raw) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

// Splits text into plain strings and { link } parts; trailing punctuation stays text.
function splitLinks(text) {
  const parts = [];
  let last = 0;
  for (const m of String(text || '').matchAll(LINK_RE)) {
    const link = m[0].replace(TRAILING_PUNCT, '');
    if (!link || (m.index > 0 && text[m.index - 1] === '@')) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ link });
    last = m.index + link.length;
  }
  if (last < String(text || '').length) parts.push(text.slice(last));
  return parts;
}

const firstLink = (text) => splitLinks(text).find((p) => typeof p === 'object')?.link || null;

const LinkifiedText = ({ text }) => (
  <span className="whitespace-pre-wrap break-words">
    {splitLinks(text).map((p, i) => (typeof p === 'string' ? p : (
      <a key={i} href={toHref(p.link)} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 break-all hover:opacity-80">
        {p.link}
      </a>
    )))}
  </span>
);

// Open Graph card from GET /messages/link-preview (SSRF-guarded server-side).
// Cached per URL so the 5 s message poll doesn't refetch it; a failed
// request isn't cached, so a blip doesn't hide the preview for good.
const previewCache = new Map();
const LinkPreviewCard = ({ url }) => {
  const href = toHref(url);
  const [preview, setPreview] = useState(previewCache.get(href));
  useEffect(() => {
    if (previewCache.has(href)) { setPreview(previewCache.get(href)); return undefined; }
    let cancelled = false;
    api.get('/messages/link-preview', { params: { url: href } })
      .then(({ data }) => {
        const p = data?.result?.preview || null;
        previewCache.set(href, p);
        if (!cancelled) setPreview(p);
      })
      .catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [href]);
  if (!preview) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block w-64 max-w-full overflow-hidden rounded-xl border border-border bg-background text-foreground hover:bg-muted/60">
      {preview.image && <img src={preview.image} alt="" referrerPolicy="no-referrer" className="h-32 w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div className="p-2">
        <p className="text-sm font-semibold line-clamp-2">{preview.title}</p>
        {preview.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{preview.description}</p>}
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{preview.siteName || href}</p>
      </div>
    </a>
  );
};

// ── Attachments (new `attachments` array; legacy type + attachmentUrl) ────────
// Only https URLs are rendered/opened (see lib/dmAttachments). Formats a browser
// can't show (HEIC, 3GP from iOS) fall back to an "Open file" link.
const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const OpenFileLink = ({ url }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg border border-border/60 px-3 py-2 text-xs font-medium underline underline-offset-2 hover:opacity-80">
    Open file
  </a>
);

// GIF as a looping muted video: plays only while on screen, doesn't preload
// until needed, and doesn't autoplay at all under prefers-reduced-motion.
const GifVideo = ({ a, className, onFail }) => {
  const ref = useRef(null);
  const reduced = prefersReducedMotion();
  const poster = a.poster || a.preview || a.still || undefined;
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play?.().catch(() => {}); else v.pause?.();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);
  return (
    <video ref={ref} src={a.url} poster={poster} loop muted playsInline controls={reduced} preload={poster ? 'none' : 'metadata'}
      aria-label="GIF" className={className} onError={onFail} />
  );
};

const AttachmentItem = ({ a, single }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <OpenFileLink url={a.url} />;
  const mediaCls = cn('rounded-xl max-w-full', single ? 'h-auto max-h-[300px]' : 'h-full w-full object-cover');
  if (a.kind === 'video') {
    return <video src={a.url} controls playsInline preload="metadata" className={mediaCls} onError={() => setFailed(true)} />;
  }
  if (a.kind === 'gif' && isVideoLike(a)) {
    return <GifVideo a={a} className={mediaCls} onFail={() => setFailed(true)} />;
  }
  return (
    <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label="Open image in a new tab" className="block">
      <img src={a.url} alt={a.name || 'Shared content'} loading="lazy" onError={() => setFailed(true)}
        className={cn('rounded-xl max-w-full object-cover', single ? 'h-auto max-h-[300px]' : 'h-full w-full')} />
    </a>
  );
};

const AttachmentGrid = ({ attachments }) => {
  if (!attachments.length) return null;
  if (attachments.length === 1) return <div className="mb-1"><AttachmentItem a={attachments[0]} single /></div>;
  return (
    <div className="grid grid-cols-2 gap-1 mb-1 w-64 max-w-full">
      {attachments.slice(0, 4).map((a, i) => (
        <div key={i} className="aspect-square overflow-hidden rounded-xl bg-black/20"><AttachmentItem a={a} /></div>
      ))}
    </div>
  );
};

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

  if (msg.type === 'voice' && isHttps(msg.mediaUrl)) {
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
      <AttachmentGrid attachments={messageAttachments(msg)} />
      {msg.content ? <LinkifiedText text={msg.content} /> : null}
      {firstLink(msg.content) && <LinkPreviewCard url={firstLink(msg.content)} />}
    </div>
  );
};

// ── Last message preview text ─────────────────────────────────────────────────
const previewText = (msg, isMe) => {
  if (!msg) return '';
  const prefix = isMe ? 'You: ' : '';
  if (msg.type === 'image' && !msg.content) return prefix + '📷 Photo';
  if (msg.type === 'video' && !msg.content) return prefix + '🎥 Video';
  return prefix + messagePreview(msg);
};

// ── Toolbar: attachment / GIF / sticker / gift ────────────────────────────────
const StickerGrid = ({ onPick }) => (
  <div className="grid grid-cols-6 gap-1">
    {STICKERS.map(s => (
      <button key={s} type="button" aria-label={`Send sticker ${s}`}
        className="text-2xl leading-none min-h-[40px] p-1.5 rounded hover:bg-accent transition-colors"
        onClick={() => onPick(s)}>
        {s}
      </button>
    ))}
  </div>
);

const GiftGrid = ({ onPick }) => (
  <div className="grid grid-cols-3 gap-2">
    {GIFTS.map(g => (
      <button key={g.label} type="button"
        className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors"
        onClick={() => onPick(g)}>
        <span className="text-3xl">{g.emoji}</span>
        <span className="text-xs font-medium">{g.label}</span>
        <span className="text-[10px] text-muted-foreground">{g.coins} coins</span>
      </button>
    ))}
  </div>
);

const ghostBtn = 'shrink-0 text-muted-foreground hover:text-foreground h-10 w-10 sm:h-9 sm:w-9';

const MessageToolbar = ({ onGifSend, onStickerSend, onGiftSend, onFileClick, onVoiceToggle, isRecording, isUploadingVoice, disabled }) => {
  const compact = useMediaQuery('(max-width: 639px)');
  const gifsEnabled = useGifsEnabled();
  const [stickerOpen, setStickerOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [panel, setPanel] = useState(null); // compact "+" menu: null | 'sticker' | 'gift' | 'gif'

  const attach = (
    <Button type="button" variant="ghost" size="icon" className={ghostBtn} onClick={onFileClick} disabled={disabled} aria-label="Attach photos or a video">
      <ImageIcon className="h-5 w-5" />
    </Button>
  );

  const voice = (
    <Button type="button" variant="ghost" size="icon"
      className={cn(ghostBtn, 'transition-colors', isRecording && 'text-red-500 hover:text-red-400 animate-pulse')}
      onClick={onVoiceToggle} disabled={isUploadingVoice || disabled}
      aria-label={isRecording ? 'Stop recording' : 'Record a voice message'}
      title={isRecording ? 'Stop recording' : 'Voice message'}>
      {isUploadingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
    </Button>
  );

  if (compact) {
    return (
      <div className="flex items-center">
        {attach}
        <Popover open={moreOpen} onOpenChange={(o) => { setMoreOpen(o); if (!o) setPanel(null); }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={ghostBtn} disabled={disabled} aria-label="More: GIF, stickers, gifts">
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(20rem,calc(100vw-1.5rem))] p-3" align="start" side="top">
            {!panel && (
              <div className="grid gap-1">
                {gifsEnabled && (
                  <button type="button" onClick={() => setPanel('gif')} className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent">
                    <span className="flex h-6 w-6 items-center justify-center text-[11px] font-bold">GIF</span> GIF
                  </button>
                )}
                <button type="button" onClick={() => setPanel('sticker')} className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent"><Smile className="h-5 w-5" /> Stickers</button>
                <button type="button" onClick={() => setPanel('gift')} className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent"><Gift className="h-5 w-5" /> Send a gift</button>
              </div>
            )}
            {panel && (
              <div>
                <button type="button" onClick={() => setPanel(null)} className="mb-2 flex min-h-[40px] items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {panel === 'sticker' && <StickerGrid onPick={(s) => { onStickerSend(s); setMoreOpen(false); }} />}
                {panel === 'gift' && <GiftGrid onPick={(g) => { onGiftSend(g); setMoreOpen(false); }} />}
                {panel === 'gif' && <GifPanel className="h-72" onPick={(g) => { onGifSend(g); setMoreOpen(false); }} />}
              </div>
            )}
          </PopoverContent>
        </Popover>
        {voice}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {attach}

      {gifsEnabled && (
        <Popover open={gifOpen} onOpenChange={setGifOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={cn(ghostBtn, 'text-[11px] font-bold')} disabled={disabled} aria-label="Send a GIF" title="GIF">
              GIF
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <GifPanel className="h-80" onPick={(g) => { onGifSend(g); setGifOpen(false); }} />
          </PopoverContent>
        </Popover>
      )}

      <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={ghostBtn} disabled={disabled} aria-label="Stickers">
            <Smile className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Stickers</p>
          <StickerGrid onPick={(s) => { onStickerSend(s); setStickerOpen(false); }} />
        </PopoverContent>
      </Popover>

      <Popover open={giftOpen} onOpenChange={setGiftOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={ghostBtn} disabled={disabled} aria-label="Send a gift">
            <Gift className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Send a Gift</p>
          <GiftGrid onPick={(g) => { onGiftSend(g); setGiftOpen(false); }} />
        </PopoverContent>
      </Popover>
      {voice}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const InboxPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { threads, requests, promos, hasLoaded, getThreadById, messagesByThread, sendMessage, getThread, createThread, acceptRequest, archiveRequest, searchUsers, markAsRead, muteThread, archiveThread, deleteThread, loadMessages, pollMessages } = useMessages();
  const { threadId: threadIdParam } = useParams();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  const activeUserParam = searchParams.get('user');
  const activeThreadParam = searchParams.get('thread'); // exact thread from a deep link
  const [activeThread, setActiveThread] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('primary');

  const [media, setMedia] = useState([]); // uploaded attachments waiting to send: up to 4 photos, or 1 video
  const textInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  // /messages/<threadId> (DM email / push / Discord nudge links): once the
  // thread list has loaded, open that conversation — requests included.
  useEffect(() => {
    if (!threadIdParam || !hasLoaded) return;
    const t = getThreadById(threadIdParam);
    if (!t) {
      toast({ title: 'Conversation not found', description: 'It may have been deleted.' });
      navigate('/inbox', { replace: true });
      return;
    }
    const other = t.participants.find((p) => p !== user.username);
    if (requests.some((r) => r.id === t.id)) setActiveTab('requests');
    else if (promos.some((r) => r.id === t.id)) setActiveTab('promo');
    navigate(other ? `/inbox?user=${encodeURIComponent(other)}&thread=${encodeURIComponent(t.id)}` : '/inbox', { replace: true });
  }, [threadIdParam, hasLoaded, threads, requests, promos]);

  useEffect(() => {
    if (activeUserParam) {
      const thread = getThread(activeUserParam, activeThreadParam) || createThread(activeUserParam);
      setActiveThread(thread);
      if (thread.id && thread.id !== 'temp') {
        if (thread.unreadCount || (thread.lastMessage && !thread.lastMessage.read)) markAsRead(thread.id);
        loadMessages(thread.id);
        return pollMessages(thread.id);
      }
    } else {
      setActiveThread(null);
    }
  }, [activeUserParam, activeThreadParam, threads, requests, promos]);

  // Live DM into the open conversation: show it now, not on the next 5s poll.
  useEffect(() => {
    const id = activeThread?.id;
    if (!id || id === 'temp') return;
    const onDm = (e) => { if (String(e.detail?.threadId) === String(id)) loadMessages(id); };
    window.addEventListener('hh:dm-created', onDm);
    return () => window.removeEventListener('hh:dm-created', onDm);
  }, [activeThread?.id]);

  // The open thread's messages come straight from the context, so a fetch
  // (poll or live dm.created) shows up immediately — not on the next thread-list
  // refresh. Scroll only when the count changes, not on every poll.
  const activeMessages = activeThread
    ? (messagesByThread[activeThread.id] || activeThread.messages || [])
    : [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.id, activeMessages.length]);

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

  const errText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
  const focusInput = () => { setTimeout(() => textInputRef.current?.focus(), 0); };

  // Content and media are only gone for good once the server accepts the
  // message; on failure they come back (unless you have started typing again)
  // and a toast says why (links paywall, block, rate limit...).
  const deliver = async (text, type, attachment, attachments, restore) => {
    try {
      await sendMessage(getRecipient(), text, type, attachment, attachments, { throwOnError: true });
      return true;
    } catch (err) {
      toast({ title: 'Message not sent', description: errText(err, 'Please try again.'), variant: 'destructive' });
      restore?.();
      return false;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !media.length) || !activeThread) return;
    const text = messageInput;
    const sentMedia = media;
    setMessageInput('');
    setMedia([]);
    deliver(sentMedia.length ? text.trim() : text, 'text', null, sentMedia.length ? sentMedia : null, () => {
      setMessageInput((cur) => cur || text);
      setMedia((cur) => (cur.length ? cur : sentMedia));
    });
    focusInput();
  };

  const handleFileSelect = (e) => uploadMedia(Array.from(e.target.files || []));

  // Up to 4 photos or 1 video per DM: from the picker, a drag from the
  // desktop, or a pasted screenshot. One upload request for the batch.
  const uploadMedia = async (input) => {
    const files = (Array.isArray(input) ? input : [input]).filter(Boolean);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!files.length || !activeThread || isUploading) return;
    const bad = files.find((f) => !/^(image|video)\//.test(f.type || '') || f.type === 'image/svg+xml');
    if (bad) {
      toast({ title: 'Images and videos only', description: `${bad.name || 'That file'} can't be sent here.`, variant: 'destructive' });
      return;
    }
    const videos = files.filter((f) => f.type.startsWith('video/'));
    if (videos.length > 1 || (videos.length === 1 && (files.length > 1 || media.length))) {
      toast({ title: 'One video at a time', description: 'Send a single video on its own, or up to 4 photos.', variant: 'destructive' });
      return;
    }
    if (videos.length === 0 && media.some((m) => m.kind === 'video')) {
      toast({ title: 'Remove the video first', description: 'A message can have one video or up to 4 photos.', variant: 'destructive' });
      return;
    }
    const room = MAX_DM_PHOTOS - media.length;
    const batch = videos.length ? files : files.slice(0, Math.max(room, 0));
    if (!batch.length) {
      toast({ title: 'Photo limit reached', description: `Up to ${MAX_DM_PHOTOS} photos per message.`, variant: 'destructive' });
      return;
    }
    if (files.length > batch.length) toast({ title: `Only ${MAX_DM_PHOTOS} photos per message`, description: `Added the first ${batch.length}.` });
    const tooBig = batch.find((f) => f.size > (f.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES));
    if (tooBig) {
      toast({ title: 'File too large', description: `${tooBig.name || 'That file'} is over ${tooBig.type.startsWith('video/') ? '100' : '25'} MB.`, variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      batch.forEach((f) => fd.append('files', f));
      const { data } = await api.post('/messages/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const got = (data?.result?.attachments || []).filter((a) => a?.url);
      if (got.length) setMedia((cur) => [...cur, ...got].slice(0, videos.length ? 1 : MAX_DM_PHOTOS));
    } catch (err) {
      toast({ title: 'Upload failed', description: errText(err, 'Please try again.'), variant: 'destructive' });
    } finally {
      setIsUploading(false);
      focusInput();
    }
  };

  const handleGifSend = (g) => {
    const att = gifToAttachment(g);
    if (!activeThread || !att) return;
    deliver('', 'text', null, [att]);
  };

  const handleStickerSend = (emoji) => {
    if (!activeThread) return;
    deliver(emoji, 'sticker', null, null);
  };

  const handleGiftSend = (gift) => {
    if (!activeThread) return;
    deliver(`${gift.emoji} Sent a ${gift.label}`, 'gift', null, null).then((ok) => {
      if (ok) toast({ title: `${gift.emoji} Gift sent!`, description: `You sent a ${gift.label} (${gift.coins} coins)` });
    });
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
          if (url && activeThread) await deliver('🎙 Voice message', 'voice', url, null);
        } catch (err) {
          toast({ title: 'Voice upload failed', description: errText(err, 'Please try again.'), variant: 'destructive' });
        } finally {
          setIsUploadingVoice(false);
          focusInput();
        }
      };

      recorder.start();
      setIsRecording(true);
      toast({ title: '🎙 Recording...', description: 'Tap the stop button when done' });
    } catch {
      toast({ title: 'Microphone access denied', description: 'Allow microphone access to send voice messages', variant: 'destructive' });
    }
  };

  const handleRemoveMedia = (i) => {
    setMedia((cur) => cur.filter((_, j) => j !== i));
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
      name: otherObj?.displayName || otherObj?.name || other,
    };
  };

  const filteredThreads = (activeTab === 'promo' ? promos : threads).filter(t => {
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

  const pickDropped = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []);
    if (list.length) uploadMedia(list);
  };
  const pastedMedia = (e) => {
    const list = Array.from(e.clipboardData?.files || []);
    if (!list.length || (e.clipboardData.getData('text/plain') || '').trim()) return;
    e.preventDefault();
    uploadMedia(list);
  };

  const ChatInput = ({ mobile = false }) => (
    <div
      className={cn('border-t border-border bg-background', mobile ? 'p-3' : 'p-4')}
      onDragOver={(e) => { if (Array.from(e.dataTransfer?.types || []).includes('Files')) e.preventDefault(); }}
      onDrop={pickDropped}
    >
      {media.length > 0 && (
        <div className="mb-2 flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2 overflow-x-auto">
          {media.map((m, i) => (
            <div key={m.url} className="relative h-14 w-14 shrink-0 rounded-lg bg-black/50">
              <div className="h-full w-full overflow-hidden rounded-lg">
                {m.kind === 'video'
                  ? <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  : <img src={m.url} alt={`Attachment ${i + 1} preview`} className="h-full w-full object-cover" />}
              </div>
              <button type="button" onClick={() => handleRemoveMedia(i)} aria-label={`Remove ${m.kind === 'video' ? 'video' : `photo ${i + 1}`}`}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border before:absolute before:-inset-2 before:content-['']">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pl-1 shrink-0">
            {media[0].kind === 'video' ? 'Video' : `${media.length} photo${media.length === 1 ? '' : 's'}`} ready to send
          </p>
        </div>
      )}
      <form onSubmit={handleSendMessage} className={cn('flex items-center gap-1 sm:gap-2', !mobile && 'max-w-3xl mx-auto')}>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFileSelect} />
        <MessageToolbar
          onGifSend={handleGifSend}
          onStickerSend={handleStickerSend}
          onGiftSend={handleGiftSend}
          onFileClick={() => fileInputRef.current?.click()}
          onVoiceToggle={handleVoiceToggle}
          isRecording={isRecording}
          isUploadingVoice={isUploadingVoice}
          disabled={!activeThread || isUploading}
        />
        <div className="flex-1 min-w-0 relative">
          <Input
            ref={textInputRef}
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onPaste={pastedMedia}
            placeholder={isUploading ? 'Uploading...' : isRecording ? 'Recording...' : 'Type a message...'}
            className="rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-input"
            disabled={isUploading || isRecording}
          />
        </div>
        <Button type="submit" size="icon" className="rounded-full shrink-0"
          aria-label="Send message"
          disabled={(!messageInput.trim() && !media.length) || isUploading || isRecording}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  // A message request (sender you don't follow) opens read-only-ish: the
  // conversation shows, with Accept / Archive above the input.
  const RequestBar = () => activeThread?.isRequest ? (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/30 text-sm">
      <span className="flex-1 text-muted-foreground">@{getOtherParticipant(activeThread).username} wants to message you.</span>
      <Button size="sm" className="h-8 text-xs" onClick={() => acceptRequest(activeThread.id)}><Check className="w-3 h-3 mr-1" /> Accept</Button>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { archiveRequest(activeThread.id); setSearchParams({}); }}><Archive className="w-3 h-3 mr-1" /> Archive</Button>
    </div>
  ) : null;

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
            {activeMessages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isMe={msg.sender === user.username} />
            ))}
            {activeMessages.length === 0 && (
              <p className="text-center text-muted-foreground mt-10 text-sm">Start the conversation!</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <RequestBar />
        {ChatInput({ mobile: true })}
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
              <TabsList className={cn('w-full grid', promos.length > 0 || activeTab === 'promo' ? 'grid-cols-3' : 'grid-cols-2')}>
                <TabsTrigger value="primary">Primary</TabsTrigger>
                <TabsTrigger value="requests">Requests {requests.length > 0 && `(${requests.length})`}</TabsTrigger>
                {(promos.length > 0 || activeTab === 'promo') && <TabsTrigger value="promo">Promo</TabsTrigger>}
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="flex-1">
            {activeTab !== 'requests' ? (
              <div className="flex flex-col p-2 gap-1">
                {filteredThreads.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">{activeTab === 'promo' ? 'No promo messages.' : 'No messages yet.'}</p>}
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
                      <div className="flex items-center gap-3 mb-2 cursor-pointer" onClick={() => setSearchParams({ user: req.participants[0] })}>
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
                {activeMessages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isMe={msg.sender === user.username} />
                ))}
                {activeMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <MessageSquarePlus className="h-12 w-12 mb-2 opacity-20" />
                    <p>Start the conversation with @{activeUserParam}</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <RequestBar />
            {ChatInput({})}
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
