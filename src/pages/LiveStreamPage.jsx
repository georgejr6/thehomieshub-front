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
import { Heart, Gift, Share2, CheckCircle, Loader2, Radio, Users, ShieldX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import LiveChat from '@/components/LiveChat';
import MuxPlayer from '@mux/mux-player-react';
import api from '@/api/homieshub';

const giftTiers = [10, 50, 100, 500, 1000];

const GiftDialog = ({ creatorName, onLoginRequest }) => {
  const { user } = useAuth();
  const { balance, spendPoints } = useWallet();
  const { toast } = useToast();
  const [selected, setSelected] = useState(giftTiers[1]);
  const [custom, setCustom] = useState('');

  const amount = custom ? Number(custom) : selected;

  const handleSend = () => {
    if (!user) { onLoginRequest(); return; }
    if (balance < amount) {
      toast({ title: 'Insufficient Balance', description: `You need ${amount} points but only have ${balance}.`, variant: 'destructive' });
      return;
    }
    spendPoints(amount);
    toast({ title: '🎁 Gift Sent!', description: `You sent ${amount} points to ${creatorName}.` });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500">
          <Gift className="mr-2 h-4 w-4" /> Gift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gift to {creatorName}</DialogTitle>
          <DialogDescription>Balance: {balance} pts</DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {giftTiers.map((t) => (
              <Button key={t} size="sm" variant={selected === t && !custom ? 'default' : 'outline'} onClick={() => { setSelected(t); setCustom(''); }}>
                {t}
              </Button>
            ))}
          </div>
          <Input type="number" placeholder="Custom amount" value={custom} onChange={(e) => { setCustom(e.target.value); setSelected(null); }} className="mt-1" />
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={!amount || amount <= 0} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
            Send {amount || '?'} pts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
                <GiftDialog creatorName={stream.creator?.name || username} onLoginRequest={onLoginRequest} />
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
          <LiveChat streamId={String(stream.id)} isCollapsible />
        </aside>
      </div>
    </>
  );
};

export default LiveStreamPage;
