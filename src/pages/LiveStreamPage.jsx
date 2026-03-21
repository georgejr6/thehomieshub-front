import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Heart, Gift, Share2, CheckCircle, Loader2, Radio, Users, ShieldX, StopCircle, Pencil, Settings, Diamond } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import LiveChat from '@/components/LiveChat';
import GiftDialogComponent from '@/components/GiftDialog';
import MuxPlayer from '@mux/mux-player-react';
import api from '@/api/homieshub';

// Receiver gift overlay — shown to everyone in the stream room
const GiftOverlay = ({ gift, onDone }) => (
  <AnimatePresence>
    {gift && (
      <motion.div
        key={gift.timestamp}
        initial={{ opacity: 0, y: 40, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onAnimationComplete={onDone}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/80 border border-primary/40 shadow-xl backdrop-blur-sm">
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(5, Math.ceil(gift.amount / 100) + 1) }).map((_, i) => (
              <Diamond key={i} className="w-5 h-5 text-primary fill-primary" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{gift.fromUsername} sent {gift.amount} pts!</p>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const LiveStreamPage = ({ onLoginRequest }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [liveGiftEvent, setLiveGiftEvent] = useState(null);

  // Owner controls
  const isOwner = user && stream && user.username === stream.creator?.username;
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/live/watch/${username}`);
        if (data.status) {
          setStream(data.result.stream);
        } else {
          setError(data.message || 'Stream not found');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'This creator is not live right now.');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Poll for stream status every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [username]);

  const handleFollow = async () => {
    if (!user) { onLoginRequest(); return; }
    if (!stream?.creator?._id) return;
    setFollowLoading(true);
    try {
      await api.post(`/user/follow/${stream.creator._id}`);
      setIsFollowing((prev) => !prev);
      toast({ title: isFollowing ? `Unfollowed @${username}` : `Following @${username}!` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to follow.', variant: 'destructive' });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied!', description: 'Share it with your friends.' });
  };

  const handleEndStream = async () => {
    if (!stream?.id) return;
    if (!window.confirm('End your live stream?')) return;
    setIsEndingStream(true);
    try {
      await api.delete(`/live/${stream.id}`);
      toast({ title: 'Stream ended.' });
      navigate('/studio');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to end stream.', variant: 'destructive' });
    } finally {
      setIsEndingStream(false);
    }
  };

  const openEdit = () => {
    setEditTitle(stream?.title || '');
    setEditDescription(stream?.description || '');
    setEditThumbnail(stream?.thumbnailUrl || '');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!stream?.id) return;
    setIsSavingEdit(true);
    try {
      await api.patch(`/live/${stream.id}`, {
        title: editTitle,
        description: editDescription,
        thumbnailUrl: editThumbnail,
      });
      setStream(prev => ({ ...prev, title: editTitle, description: editDescription, thumbnailUrl: editThumbnail }));
      setIsEditOpen(false);
      toast({ title: 'Stream updated.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update stream.', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-white">
          <Radio className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-white/60">Loading stream...</p>
        </div>
      </div>
    );
  }

  // Error / not live
  if (error || !stream) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center text-center gap-4 max-w-sm">
          <ShieldX className="h-16 w-16 text-white/20" />
          <h2 className="text-xl font-bold">{error || 'Stream not found'}</h2>
          <p className="text-white/40 text-sm">@{username} is not live right now. Check back later.</p>
          <Button variant="outline" onClick={() => navigate('/live')}>Browse Live Streams</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{stream.title} — {stream.creator?.name || username} Live on The Homies Hub</title>
      </Helmet>

      <div className="flex flex-col lg:flex-row h-screen bg-black text-white overflow-hidden">

        {/* ── LEFT: Video + Info ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Video player */}
          <div className="relative bg-black flex-1 min-h-0">
            {stream.playbackId ? (
              <MuxPlayer
                streamType="ll-live"
                playbackId={stream.playbackId}
                autoPlay
                muted={false}
                style={{ width: '100%', height: '100%', aspectRatio: '16/9' }}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-white/30 animate-spin" />
              </div>
            )}

            {/* LIVE badge overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <Badge className="bg-red-600 text-white animate-pulse font-bold px-2 py-1 text-xs tracking-widest">
                ● LIVE
              </Badge>
              <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1.5 text-xs text-white/80">
                <Users className="h-3 w-3" />
                {(stream.viewerCount || 0).toLocaleString()} watching
              </div>
            </div>
          </div>

          {/* Owner control bar */}
          {isOwner && (
            <div className="px-4 py-2 bg-zinc-900 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 font-medium uppercase tracking-wide">Your Stream</span>
                <Badge className="bg-red-600 text-white text-xs animate-pulse">● LIVE</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={openEdit} className="text-white/60 hover:text-white gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/studio')} className="text-white/60 hover:text-white gap-1.5">
                  <Settings className="h-3.5 w-3.5" /> Studio
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleEndStream}
                  disabled={isEndingStream}
                  className="gap-1.5"
                >
                  {isEndingStream ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
                  End Stream
                </Button>
              </div>
            </div>
          )}

          {/* Edit stream dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Stream</DialogTitle>
                <DialogDescription>Update your stream info while live.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={100} placeholder="Stream title" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="resize-none h-24" placeholder="What are you streaming?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Thumbnail URL</Label>
                  <Input value={editThumbnail} onChange={e => setEditThumbnail(e.target.value)} placeholder="https://..." />
                  {editThumbnail && <img src={editThumbnail} alt="preview" className="w-full aspect-video object-cover rounded-md mt-1" />}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stream info bar */}
          <div className="p-4 border-t border-white/5 bg-[#111] shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {/* Creator info */}
              <Link to={`/profile/${stream.creator?.username}`} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-primary">
                    <AvatarImage src={stream.creator?.avatarUrl} />
                    <AvatarFallback>{stream.creator?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 bg-red-600 rounded-full h-3 w-3 border-2 border-[#111]" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-base leading-tight truncate">{stream.title}</h1>
                  <p className="text-white/50 text-sm truncate">
                    {stream.creator?.name || stream.creator?.username}
                    {stream.creator?.username && ` · @${stream.creator.username}`}
                  </p>
                </div>
              </Link>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  size="sm"
                  variant={isFollowing ? 'default' : 'outline'}
                  className={isFollowing ? 'bg-primary' : 'border-white/20 hover:border-primary hover:text-primary'}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isFollowing ? <CheckCircle className="mr-1.5 h-4 w-4" /> : <Heart className="mr-1.5 h-4 w-4" />}
                      {isFollowing ? 'Following' : 'Follow'}
                    </>
                  )}
                </Button>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500"
                    onClick={() => { if (!user) { onLoginRequest(); return; } setIsGiftOpen(true); }}
                  >
                    <Gift className="mr-2 h-4 w-4" /> Gift
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleShare} className="text-white/50 hover:text-white">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {stream.description && (
              <p className="text-white/40 text-sm mt-3 line-clamp-2">{stream.description}</p>
            )}
          </div>
        </main>

        {/* ── RIGHT: Live Chat ── */}
        <aside className="w-full lg:w-[340px] h-[45vh] lg:h-screen shrink-0 border-t lg:border-t-0 lg:border-l border-white/5">
          <LiveChat
            streamId={String(stream._id || stream.id)}
            isCollapsible
            onGiftMessage={(msg) => {
              setLiveGiftEvent(msg);
              setTimeout(() => setLiveGiftEvent(null), 3500);
            }}
          />
        </aside>
      </div>

      {/* Gift overlay — visible to all stream viewers */}
      <GiftOverlay gift={liveGiftEvent} onDone={() => {}} />

      {/* Gift dialog — sender only */}
      <GiftDialogComponent
        isOpen={isGiftOpen}
        onOpenChange={setIsGiftOpen}
        recipientId={stream.creator?._id}
        recipientName={stream.creator?.name || username}
        recipientUsername={stream.creator?.username || username}
        targetType="live_stream"
        targetId={stream._id || stream.id}
      />
    </>
  );
};

export default LiveStreamPage;
