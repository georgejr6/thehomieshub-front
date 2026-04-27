import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Copy, Check, Download, Loader2, Send, Search, Share2, X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMessages } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ── helpers ──────────────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function useDebounceValue(val, ms = 350) {
  const [deb, setDeb] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setDeb(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return deb;
}

// Platform share links that open intent pages in a new tab
const PLATFORMS = [
  {
    name: 'X / Twitter',
    bg: 'bg-black',
    fg: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    ),
    url: (u, t) => `https://x.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    name: 'Facebook',
    bg: 'bg-[#1877f2]',
    fg: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"/>
      </svg>
    ),
    url: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    name: 'WhatsApp',
    bg: 'bg-[#25d366]',
    fg: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    ),
    url: (u, t) => `https://wa.me/?text=${encodeURIComponent(t + '\n' + u)}`,
  },
  {
    name: 'Telegram',
    bg: 'bg-[#229ed9]',
    fg: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    url: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
];

// ── component ─────────────────────────────────────────────────────────────────

const ShareDialog = ({ children, postUrl, postTitle, post }) => {
  const { toast }       = useToast();
  const { user }        = useAuth();
  const { sendMessage } = useMessages();

  const shareUrl   = postUrl   || window.location.href;
  const shareTitle = postTitle || post?.title || post?.caption || 'Check this out on The Homies Hub';
  const thumbnail  = post?.thumbnailUrl || post?.thumbnail
    || (post?.muxPlaybackId
        ? `https://image.mux.com/${post.muxPlaybackId}/thumbnail.jpg?width=1280&height=720&time=3`
        : null);

  const [open,         setOpen]         = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [dmQuery,      setDmQuery]      = useState('');
  const [dmResults,    setDmResults]    = useState([]);
  const [dmSearching,  setDmSearching]  = useState(false);
  const [sentTo,       setSentTo]       = useState({});
  const [sendingTo,    setSendingTo]    = useState({});
  const [showDm,       setShowDm]       = useState(false);

  const debouncedQ = useDebounceValue(dmQuery);

  // ── DM user search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQ.trim()) { setDmResults([]); return; }
    setDmSearching(true);
    api.get('/messages/search-users', { params: { q: debouncedQ } })
      .then(r => setDmResults(r.data?.result?.users || []))
      .catch(() => setDmResults([]))
      .finally(() => setDmSearching(false));
  }, [debouncedQ]);

  // Reset DM state when dialog closes
  useEffect(() => {
    if (!open) {
      setDmQuery(''); setDmResults([]); setShowDm(false); setSentTo({});
    }
  }, [open]);

  // ── Native share (opens OS share sheet — handles Stories, WhatsApp, iMessage) ──
  const handleNativeShare = async () => {
    if (!navigator.share) { handleCopyLink(); return; }

    const shareData = { title: shareTitle, text: shareTitle, url: shareUrl };

    // Try to share the thumbnail image file — enables "Add to Instagram Story"
    if (thumbnail && navigator.canShare) {
      try {
        const blob = await fetch(thumbnail).then(r => r.blob());
        const file = new File([blob], 'homies-post.jpg', { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
          return;
        }
      } catch (_) {}
    }

    try {
      await navigator.share(shareData);
    } catch (e) {
      if (e.name !== 'AbortError') handleCopyLink();
    }
  };

  // ── Copy link ───────────────────────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Download with watermark (canvas composite) ──────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const src = thumbnail || '/og-default.png';
      const img = await loadImage(src);

      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  || 1080;
      canvas.height = img.naturalHeight || 1080;
      const ctx = canvas.getContext('2d');

      // Base image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Dark gradient at bottom for watermark legibility
      const grad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Logo watermark (bottom right)
      try {
        const logo = await loadImage('/logo.png');
        const logoSize = Math.round(canvas.width * 0.18);
        const pad = Math.round(canvas.width * 0.04);
        ctx.globalAlpha = 0.92;
        ctx.drawImage(logo,
          canvas.width - logoSize - pad,
          canvas.height - logoSize - pad,
          logoSize, logoSize);
        ctx.globalAlpha = 1;
      } catch (_) {}

      // URL text (bottom left)
      const fontSize = Math.round(canvas.width * 0.028);
      ctx.font        = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle   = 'rgba(255,255,255,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur  = 6;
      const pad = Math.round(canvas.width * 0.04);
      ctx.fillText('TheHomies.app', pad, canvas.height - pad);

      canvas.toBlob(blob => {
        const a   = document.createElement('a');
        a.href    = URL.createObjectURL(blob);
        a.download = `homies-${post?.id || Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(a.href);
        setDownloading(false);
        toast({ title: 'Saved!', description: 'Downloaded with The Homies Hub watermark.' });
      }, 'image/jpeg', 0.93);
    } catch (err) {
      setDownloading(false);
      toast({ title: 'Download failed', description: 'Could not save image.', variant: 'destructive' });
    }
  };

  // ── Send DM ─────────────────────────────────────────────────────────────────
  const handleSend = async (contact) => {
    if (!user) { toast({ title: 'Please log in to send messages.' }); return; }
    if (sentTo[contact.username] || sendingTo[contact.username]) return;

    setSendingTo(p => ({ ...p, [contact.username]: true }));
    try {
      await sendMessage(contact.username, `Check this out: ${shareUrl}`, 'text', null);
      setSentTo(p => ({ ...p, [contact.username]: true }));
      toast({ title: `Sent to @${contact.username}` });
    } catch (_) {
      toast({ title: 'Failed to send', variant: 'destructive' });
    } finally {
      setSendingTo(p => ({ ...p, [contact.username]: false }));
    }
  };

  const nativeShareSupported = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base font-bold">Share</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ── Native Share — primary CTA ────────────────────────────────── */}
          {nativeShareSupported && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl
                         bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold
                         shadow-md hover:shadow-lg transition-all text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share to Stories, Messages & More
            </motion.button>
          )}

          {/* ── Platform buttons ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Share to
            </p>
            <div className="grid grid-cols-4 gap-3">
              {PLATFORMS.map(p => (
                <a
                  key={p.name}
                  href={p.url(shareUrl, shareTitle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95',
                    p.bg, p.fg
                  )}>
                    {p.icon}
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{p.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* ── Send in DM ───────────────────────────────────────────────── */}
          <div>
            <button
              onClick={() => setShowDm(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 hover:text-foreground transition-colors"
            >
              <span>Send in Message</span>
              <span className="normal-case font-normal text-primary text-xs">{showDm ? 'Hide' : 'Show'}</span>
            </button>

            <AnimatePresence>
              {showDm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={dmQuery}
                      onChange={e => setDmQuery(e.target.value)}
                      placeholder="Search users…"
                      className="pl-8 h-9 text-sm"
                      autoComplete="off"
                    />
                    {dmSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {dmResults.length > 0 && (
                    <div className="space-y-1 max-h-44 overflow-y-auto rounded-lg border border-border">
                      {dmResults.map(contact => (
                        <div
                          key={contact.username}
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={contact.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {(contact.name || contact.username || '?')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{contact.name || contact.username}</p>
                              <p className="text-xs text-muted-foreground">@{contact.username}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={sentTo[contact.username] ? 'ghost' : 'default'}
                            className="h-7 px-3 text-xs flex-shrink-0 ml-2"
                            disabled={!!sentTo[contact.username] || !!sendingTo[contact.username]}
                            onClick={() => handleSend(contact)}
                          >
                            {sentTo[contact.username]   ? <><Check className="w-3 h-3 mr-1" /> Sent</>
                             : sendingTo[contact.username] ? <Loader2 className="w-3 h-3 animate-spin" />
                             : <><Send className="w-3 h-3 mr-1" /> Send</>}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {dmQuery.trim() && !dmSearching && dmResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">No users found</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Copy link ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Link
            </p>
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1 h-9 text-sm" />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyLink}
                className={cn(
                  'h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-1.5 transition-colors flex-shrink-0',
                  copied
                    ? 'bg-green-500/10 border-green-500/30 text-green-600'
                    : 'bg-background border-border hover:bg-muted'
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </motion.button>
            </div>
          </div>

          {/* ── Download with watermark ───────────────────────────────────── */}
          {(thumbnail || post) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Save
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           border border-border bg-muted/40 hover:bg-muted text-sm font-medium
                           transition-colors disabled:opacity-60"
              >
                {downloading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Download className="w-4 h-4" /> Download with Watermark</>
                }
              </motion.button>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Saved images include The Homies Hub watermark.
              </p>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
