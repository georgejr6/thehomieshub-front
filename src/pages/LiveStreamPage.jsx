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
import { Heart, Gift, Share2, CheckCircle, Loader2, Radio, Users, ShieldX, StopCircle, Pencil, Settings, Diamond, Clock, PlayCircle, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import LiveChat from '@/components/LiveChat';
import GiftDialogComponent from '@/components/GiftDialog';
import MuxPlayer from '@mux/mux-player-react';
import api from '@/api/homieshub';
import { getVodParts, partOffsetSec, vodPollDelay, endedAgoMs } from '@/lib/liveVod';

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

  // Player warm-up retry
  const [playerKey, setPlayerKey] = useState(1);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [playerGaveUp, setPlayerGaveUp] = useState(false);
  const retryTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const warmingRef = useRef(false);
  // Audio: autoplay has to start muted (browsers block unmuted autoplay). One
  // flag for live and replay, so an unmute survives moving between parts.
  const [audioMuted, setAudioMuted] = useState(true);
  // Replay: which recorded part is playing (vodParts are played in order).
  const [partIndex, setPartIndex] = useState(0);
  const handlePlayerError = () => {
    // Errors while a retry is already scheduled are the same outage: ignore.
    if (warmingRef.current) return;
    // While the stream is LIVE (or just blipped to idle after it had started),
    // transient LL-HLS errors are normal: keep retrying indefinitely behind a
    // "warming up" overlay. Only give up once the stream is really over.
    const stillLive = stream?.status === 'active' || (stream?.status === 'idle' && !!stream?.startedAt);
    if (!stillLive && retryCountRef.current >= 6) {
      setIsWarmingUp(false);
      setPlayerGaveUp(true);
      return;
    }
    retryCountRef.current += 1;
    warmingRef.current = true;
    setIsWarmingUp(true);
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      warmingRef.current = false;
      // A remount can't autoplay with sound; come back muted (Unmute button shows).
      setAudioMuted(true);
      setPlayerKey((k) => k + 1);
      setIsWarmingUp(false);
    }, 5000);
  };
  useEffect(() => () => clearTimeout(retryTimerRef.current), []);

  // Current playback position of the VOD, so recorded chat can replay in sync.
  const [vodTime, setVodTime] = useState(0);
  const lastTimeUpdateRef = useRef(0);

  // "3 minutes ago" style relative time for the ended-stream banner.
  const formatAgo = (d) => {
    if (!d) return '';
    const secs = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  // Owner controls
  const isOwner = user && stream && user.username === stream.creator?.username;
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load + poll the stream. A failed poll never drops a stream we already have.
  // Polling: 5 s while idle (starting soon / reconnecting), 10 s while active,
  // 15 s while the replay is processing, 30 s for 30 min after the end (late
  // parts) until the part count settles; paused in hidden tabs.
  useEffect(() => {
    if (!username) return undefined;
    // New creator: start from a clean slate (no stale stream, player or replay state).
    setStream(null);
    setLoading(true);
    setError(null);
    setPlayerKey(1);
    setIsWarmingUp(false);
    setPlayerGaveUp(false);
    setAudioMuted(true);
    setPartIndex(0);
    setVodTime(0);
    retryCountRef.current = 0;
    warmingRef.current = false;
    clearTimeout(retryTimerRef.current);
    const partsState = { count: -1, stable: 0 };

    let cancelled = false;
    let timer = null;
    let inFlight = false;

    const nextDelay = (s) => {
      if (s.status === 'idle') return 5000; // starting soon / reconnecting
      if (s.status === 'active') return 10000;
      if (s.status === 'disabled') {
        // Replay still processing, or recently ended (late parts): keep polling.
        return vodPollDelay({ processing: !!s.vodProcessing, endedAt: s.endedAt, parts: getVodParts(s) }, partsState);
      }
      return null;
    };

    const schedule = (ms) => {
      clearTimeout(timer);
      if (cancelled || ms == null) return;
      timer = setTimeout(load, ms);
    };

    async function load() {
      if (cancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.hidden) return; // resumes on visibilitychange
      inFlight = true;
      let retryMs = 10000;
      try {
        const { data } = await api.get(`/live/watch/${username}`);
        if (cancelled) return;
        if (data.status) {
          const s = data.result.stream;
          setStream(s);
          setError(null);
          retryMs = nextDelay(s);
        } else {
          setError(data.message || 'Stream not found');
          retryMs = 30000;
        }
      } catch (err) {
        if (cancelled) return;
        // Keep whatever we were showing; only surface the error if there is nothing to show.
        setError(err.response?.data?.message || 'This creator is not live right now.');
        retryMs = 10000;
      } finally {
        inFlight = false;
        if (!cancelled) {
          setLoading(false);
          schedule(retryMs);
        }
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        load();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
      navigate('/go-live');
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
  if (!stream) {
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

  // Stream is set up but not broadcasting yet
  if (stream.status === 'idle' && !stream.startedAt) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center text-center gap-4 max-w-sm">
          <Clock className="h-16 w-16 text-primary/60 animate-pulse" />
          <h2 className="text-xl font-bold">Stream Starting Soon</h2>
          <p className="text-white/40 text-sm">@{username} is setting up. Hang tight, this page will refresh automatically.</p>
          <Button variant="outline" onClick={() => navigate('/live')}>Browse Live Streams</Button>
        </div>
      </div>
    );
  }

  // Stream ended without a ready replay — don't show a dead player or a stale
  // months-old recording. If it ended recently the replay is likely still
  // rendering on Mux; if it ended a while ago with no VOD, one was never
  // recorded, so say so honestly instead of "check back" forever.
  const vodParts = getVodParts(stream);
  if (stream.status === 'disabled' && vodParts.length === 0) {
    const stillRendering = !!stream.vodProcessing || endedAgoMs(stream.endedAt) < 15 * 60 * 1000; // probably processing
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center text-center gap-4 max-w-md px-6">
          <PlayCircle className="h-16 w-16 text-primary/50" />
          <h2 className="text-xl font-bold">This stream has ended</h2>
          <p className="text-white/50 text-sm">
            @{username} ended the stream {formatAgo(stream.endedAt)}.{' '}
            {stillRendering
              ? 'Replay processing. It will appear here in a few minutes, no need to refresh.'
              : 'A replay isn’t available for this stream.'}
          </p>
          <Button variant="outline" onClick={() => navigate('/live')}>Browse Live Streams</Button>
        </div>
      </div>
    );
  }

  // Stream ended — show VOD recording (replay ready)
  const isVod = stream.status === 'disabled' && vodParts.length > 0;
  const safePartIndex = Math.min(partIndex, Math.max(vodParts.length - 1, 0));
  const currentPart = isVod ? vodParts[safePartIndex] : null;
  const streamStartMs = (stream.startedAt || stream.streamStartedAt) ? new Date(stream.startedAt || stream.streamStartedAt).getTime() : null;
  const priorPartsSec = isVod ? partOffsetSec(vodParts, safePartIndex, streamStartMs) : 0;
  // Encoder dropped after the broadcast had started: keep the player and chat up.
  const reconnecting = stream.status === 'idle' && !!stream.startedAt;
  const sourcePlaybackId = isVod ? currentPart?.playbackId : stream.playbackId;

  return (
    <>
      <Helmet>
        <title>{stream.title} | {stream.creator?.displayName || stream.creator?.name || username} Live on The Homies</title>
      </Helmet>

      <div className="flex flex-col lg:flex-row h-screen bg-black text-white overflow-hidden">

        {/* ── LEFT: Video + Info ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Video player */}
          <div className="relative bg-black flex-1 min-h-0">
            {sourcePlaybackId ? (
              <>
                <MuxPlayer
                  key={`${playerKey}-${isVod ? 'vod' : 'live'}`}
                  streamType={isVod ? "on-demand" : "ll-live"}
                  playbackId={sourcePlaybackId}
                  autoPlay={isVod && safePartIndex > 0 ? true : "muted"}
                  muted={audioMuted}
                  onVolumeChange={(e) => setAudioMuted(!!e?.target?.muted)}
                  onEnded={isVod ? () => setPartIndex((i) => (i + 1 < vodParts.length ? i + 1 : i)) : undefined}
                  onPlaying={() => { retryCountRef.current = 0; }}
                  onTimeUpdate={isVod ? (e) => {
                    const now = Date.now();
                    if (now - lastTimeUpdateRef.current < 1000) return;
                    lastTimeUpdateRef.current = now;
                    setVodTime(priorPartsSec + (e?.target?.currentTime || 0));
                  } : undefined}
                  // BUG FIX: forcing aspectRatio:'16/9' here fought the parent's
                  // width/height:100% sizing and the player's own object-contain
                  // fit, making vertical (portrait) broadcasts render tiny and
                  // letterboxed inside an oversized landscape box instead of
                  // filling the available space with the source's real aspect
                  // ratio. The flex-1 parent + object-contain already handle
                  // both orientations correctly without it.
                  style={{ width: '100%', height: '100%' }}
                  className="w-full h-full object-contain"
                  onError={handlePlayerError}
                  metadata={{
                    video_id: stream._id || stream.id,
                    video_title: stream.title,
                    viewer_user_id: user?._id || user?.id,
                  }}
                />
                {audioMuted && !isWarmingUp && !reconnecting && !playerGaveUp && (
                  <button
                    type="button"
                    onClick={() => setAudioMuted(false)}
                    className="absolute bottom-16 left-4 z-10 flex items-center gap-2 rounded-full bg-white text-black text-sm font-semibold px-4 py-2 shadow-lg hover:bg-white/90"
                  >
                    <Volume2 className="h-4 w-4" /> Unmute
                  </button>
                )}
                {isVod && vodParts.length > 1 && (
                  <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white/80">
                    Part {safePartIndex + 1} of {vodParts.length}
                  </div>
                )}
                {(isWarmingUp || reconnecting) && !playerGaveUp && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
                    <Radio className="h-10 w-10 text-primary animate-pulse" />
                    <p className="text-white/70 text-sm font-medium">{reconnecting ? 'Reconnecting...' : 'Stream warming up…'}</p>
                    <p className="text-white/30 text-xs">{reconnecting ? 'The stream dropped for a moment. It will resume on its own.' : 'Retrying in a moment'}</p>
                  </div>
                )}
                {playerGaveUp && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 gap-4">
                    <ShieldX className="h-12 w-12 text-white/20" />
                    <p className="text-white/60 text-sm font-medium">Stream unavailable</p>
                    <Button size="sm" variant="outline" onClick={() => { retryCountRef.current = 0; setPlayerGaveUp(false); setPlayerKey(k => k + 1); }}>
                      Try again
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-white/30 animate-spin" />
              </div>
            )}

            {/* LIVE / RECORDED badge overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              {isVod ? (
                <Badge className="bg-zinc-700 text-white font-bold px-2 py-1 text-xs tracking-widest flex items-center gap-1">
                  <PlayCircle className="h-3 w-3" /> RECORDED
                </Badge>
              ) : (
                <>
                  <Badge className={cn("text-white font-bold px-2 py-1 text-xs tracking-widest", reconnecting ? "bg-amber-600" : "bg-red-600 animate-pulse")}>
                    {reconnecting ? 'RECONNECTING' : '● LIVE'}
                  </Badge>
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1.5 text-xs text-white/80">
                    <Users className="h-3 w-3" />
                    {(stream.viewerCount || 0).toLocaleString()} watching
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Owner control bar */}
          {isOwner && !isVod && (
            <div className="px-4 py-2 bg-zinc-900 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 font-medium uppercase tracking-wide">Your Stream</span>
                <Badge className="bg-red-600 text-white text-xs animate-pulse">● LIVE</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={openEdit} className="text-white/60 hover:text-white gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/go-live')} className="text-white/60 hover:text-white gap-1.5">
                  <Settings className="h-3.5 w-3.5" /> Setup
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
                    {stream.creator?.displayName || stream.creator?.name || stream.creator?.username}
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

            {isVod && (
              <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                <PlayCircle className="h-3.5 w-3.5 text-white/40" />
                <span>This stream ended {formatAgo(stream.endedAt)}. You're watching the replay from the start.</span>
              </div>
            )}

            {stream.description && (
              <p className="text-white/40 text-sm mt-3 line-clamp-2">{stream.description}</p>
            )}
          </div>
        </main>

        {/* ── RIGHT: Live Chat ── */}
        <aside className="w-full lg:w-[340px] h-[45vh] lg:h-screen shrink-0 border-t lg:border-t-0 lg:border-l border-white/5">
          {isVod ? (
            <LiveChat
              streamId={String(stream._id || stream.id)}
              isCollapsible
              replay
              replaySeconds={vodTime}
              streamStartMs={streamStartMs}
            />
          ) : (
            <LiveChat
              streamId={String(stream._id || stream.id)}
              isCollapsible
              onLoginRequest={onLoginRequest}
              onGiftMessage={(msg) => {
                setLiveGiftEvent(msg);
                setTimeout(() => setLiveGiftEvent(null), 3500);
              }}
            />
          )}
        </aside>
      </div>

      {/* Gift overlay — visible to all stream viewers */}
      <GiftOverlay gift={liveGiftEvent} onDone={() => {}} />

      {/* Gift dialog — sender only */}
      <GiftDialogComponent
        isOpen={isGiftOpen}
        onOpenChange={setIsGiftOpen}
        recipientId={stream.creator?._id}
        recipientName={stream.creator?.displayName || stream.creator?.name || username}
        recipientUsername={stream.creator?.username || username}
        targetType="live_stream"
        targetId={stream._id || stream.id}
      />
    </>
  );
};

export default LiveStreamPage;
