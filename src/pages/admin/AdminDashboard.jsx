import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Video, FileText, Activity, TrendingUp, MessageSquare, Send, Gift, Loader2,
  Radio, Music, Globe, Film, BarChart3, DollarSign, Bell, ArrowUpRight, Headphones,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';
import { GlassPanel, SectionTitle, StatTile, MetricPill } from '@/components/admin/glass';

const fmt = (n) => (n != null ? Number(n).toLocaleString() : '—');
const fmtMs = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

// ── Recent activity feed (new members, watch returns, applications) ───────────
const ALERT_ICON = { signup: Users, watch: Bell, application: FileText };
function AlertsFeed() {
  const [alerts, setAlerts] = useState(null);
  useEffect(() => {
    api.get('/admin/alerts').then(({ data }) => setAlerts(data?.result?.alerts || [])).catch(() => setAlerts([]));
  }, []);
  return (
    <GlassPanel className="p-5">
      <SectionTitle sub="New members, watched-visitor returns, and pending applications.">Recent activity</SectionTitle>
      {alerts === null ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : alerts.length === 0 ? (
        <p className="text-white/40 text-sm py-6 text-center">Nothing new right now.</p>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {alerts.map((a, i) => {
            const Icon = ALERT_ICON[a.kind] || Bell;
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-white/60" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-white/45 truncate">{a.detail}</p>
                </div>
                <span className="text-xs text-white/35 flex-shrink-0">{timeAgo(a.ts)}</span>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

// ── Gift points dialog ────────────────────────────────────────────────────────
const AdminGiftDialog = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGift = async () => {
    if (!username || !amount) return;
    setLoading(true);
    try {
      const { data } = await api.post('/admin/users/gift-by-username', {
        username: username.replace('@', ''),
        points: Number(amount),
      });
      if (data.status) {
        toast({ title: 'Points Gifted!', description: `Gifted ${amount} points to @${username.replace('@', '')}.` });
        setUsername(''); setAmount('');
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to gift points.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Gift Points</DialogTitle>
        <DialogDescription>Manually add points to a user's wallet.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="gift-username">Username</Label>
          <Input id="gift-username" placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gift-amount">Amount</Label>
          <Input id="gift-amount" type="number" placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleGift} disabled={!username || !amount || loading} className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
          Send Points
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// ── Broadcast / DM dialog ─────────────────────────────────────────────────────
const AdminMessageDialog = () => {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState('all');
  const [specificUser, setSpecificUser] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message) return;
    setLoading(true);
    try {
      if (recipientType === 'specific' && specificUser) {
        await api.post('/messages/send', { recipientUsername: specificUser.replace('@', ''), content: message });
      }
      toast({ title: 'Message Sent', description: recipientType === 'all' ? 'Broadcast message sent to all users.' : `Message sent to @${specificUser}.` });
      setMessage(''); setSpecificUser('');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Send Admin Message</DialogTitle>
        <DialogDescription>Send a direct message to a specific user.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Recipient</Label>
          <Select value={recipientType} onValueChange={setRecipientType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users (Broadcast)</SelectItem>
              <SelectItem value="specific">Specific User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {recipientType === 'specific' && (
          <div className="space-y-2">
            <Label>Username</Label>
            <Input placeholder="@username" value={specificUser} onChange={(e) => setSpecificUser(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Message Content</Label>
          <Textarea placeholder="Type your message here..." className="min-h-[100px]" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSend} disabled={!message || (recipientType === 'specific' && !specificUser) || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Send Message
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// ── Live snapshot (auto-refreshing) ───────────────────────────────────────────
const LiveSnapshot = ({ onOpenAnalytics }) => {
  const [live, setLive] = useState(null);
  const [topSong, setTopSong] = useState(null);
  const [topSource, setTopSource] = useState(null);

  const loadLive = useCallback(async () => {
    try { const { data } = await api.get('/track/live', { params: { minutes: 5 } }); setLive(data?.result || null); }
    catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 20000);
    return () => clearInterval(t);
  }, [loadLive]);

  useEffect(() => {
    api.get('/track/music/songs', { params: { days: 7 } }).then(({ data }) => setTopSong((data?.result?.songs || [])[0] || null)).catch(() => {});
    api.get('/track/sources', { params: { days: 30 } }).then(({ data }) => setTopSource((data?.result?.sources || [])[0] || null)).catch(() => {});
  }, []);

  const sessions = live?.sessions || [];
  const nowPlaying = sessions.filter((s) => s.nowPlaying).slice(0, 5);

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h3 className="text-lg font-bold">Live right now</h3>
        </div>
        <button onClick={onOpenAnalytics} className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
          Full analytics <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <MetricPill label="active" value={live?.active ?? '—'} accent="emerald" />
        <MetricPill label="members" value={live?.signedIn ?? '—'} accent="sky" />
        <MetricPill label="anon" value={live?.anonymous ?? '—'} accent="primary" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1"><Music className="w-3 h-3" /> Top song · 7d</p>
          {topSong ? (
            <>
              <p className="font-semibold truncate">{topSong.title || 'Untitled'}</p>
              <p className="text-xs text-white/45">{topSong.plays} plays · {topSong.listeners} listeners · {fmtMs(topSong.listenMs)} listened</p>
            </>
          ) : <p className="text-sm text-white/40">No plays yet</p>}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1"><Globe className="w-3 h-3" /> Top traffic · 30d</p>
          {topSource ? (
            <>
              <p className="font-semibold truncate">{topSource.source}</p>
              <p className="text-xs text-white/45">{topSource.sessions} sessions · {topSource.visitors} visitors · {topSource.converted} signed up</p>
            </>
          ) : <p className="text-sm text-white/40">No traffic yet</p>}
        </div>
      </div>

      {nowPlaying.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Now playing</p>
          {nowPlaying.map((s) => (
            <div key={s.sessionId} className="flex items-center gap-2 text-sm">
              <Headphones className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              <span className="text-white/70 flex-shrink-0">{s.display}</span>
              <span className="text-white/40">→</span>
              <span className="truncate">{s.nowPlaying}</span>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
};

// ── Quick action tile ─────────────────────────────────────────────────────────
// Static accent classes (Tailwind JIT can't see interpolated class names).
const ACTION_ACCENTS = {
  primary: 'bg-primary/15 text-primary',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  sky: 'bg-sky-500/15 text-sky-400',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-400',
  rose: 'bg-rose-500/15 text-rose-400',
};
const ActionTile = ({ icon: Icon, label, desc, onClick, accent = 'primary' }) => (
  <button onClick={onClick}
    className="group text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 transition-all hover:-translate-y-0.5">
    <div className="flex items-center justify-between mb-2">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${ACTION_ACCENTS[accent] || ACTION_ACCENTS.primary}`}>
        <Icon className="w-4 h-4" />
      </span>
      <ArrowUpRight className="w-4 h-4 text-white/25 group-hover:text-white/70 transition-colors" />
    </div>
    <p className="font-semibold text-sm">{label}</p>
    <p className="text-xs text-white/45 mt-0.5">{desc}</p>
  </button>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      try { const { data } = await api.get('/admin/stats'); if (data.status) setStats(data.result); }
      catch (err) { console.error('Failed to load admin stats', err); }
      finally { setStatsLoading(false); }
    })();
  }, []);

  const tiles = [
    { label: 'Total Users', key: 'totalUsers', icon: Users, accent: 'sky', sub: 'Registered accounts', trend: stats?.recentSignups != null ? `+${fmt(stats.recentSignups)} / 7d` : null, nav: '/admin/users' },
    { label: 'Videos', key: 'totalVideos', icon: Video, accent: 'primary', sub: 'Published videos', nav: '/admin/media' },
    { label: 'Community Posts', key: 'totalPosts', icon: FileText, accent: 'fuchsia', sub: 'Threads, polls & more', nav: '/admin/content' },
    { label: 'Subscribers', key: 'activeSubscriptions', icon: TrendingUp, accent: 'emerald', sub: 'Active subscriptions', nav: '/admin/monetization' },
  ];

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Command Center</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Dashboard</h1>
          <p className="text-white/50 mt-2 max-w-lg">Everything at a glance — who's on, what's popular, and where growth is coming from. Tap any card to dive in.</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 bg-transparent">
                <Gift className="mr-2 h-4 w-4" /> Gift Points
              </Button>
            </DialogTrigger>
            <AdminGiftDialog />
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <MessageSquare className="mr-2 h-4 w-4" /> Send Message
              </Button>
            </DialogTrigger>
            <AdminMessageDialog />
          </Dialog>
        </div>
      </motion.header>

      {/* Pending applications banner */}
      {stats?.pendingApplications > 0 && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => navigate('/admin/monetization')}
          className="w-full text-left p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between hover:bg-amber-500/15 transition-colors">
          <p className="text-sm text-amber-300 font-medium">
            {stats.pendingApplications} creator application{stats.pendingApplications > 1 ? 's' : ''} pending review.
          </p>
          <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">Review now <ArrowUpRight className="w-3.5 h-3.5" /></span>
        </motion.button>
      )}

      {/* Big stat tiles */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <StatTile key={t.key} index={i} label={t.label} value={fmt(stats?.[t.key])}
              icon={t.icon} accent={t.accent} sub={t.sub} trend={t.trend}
              loading={statsLoading} onClick={() => navigate(t.nav)} />
          ))}
        </div>
      </section>

      {/* Live + quick actions */}
      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <LiveSnapshot onOpenAnalytics={() => navigate('/admin/analytics')} />

        <GlassPanel className="p-5">
          <SectionTitle sub="Jump straight into the tools you use most.">Quick actions</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <ActionTile icon={BarChart3} label="Analytics" desc="Listeners, growth & traffic" accent="emerald" onClick={() => navigate('/admin/analytics')} />
            <ActionTile icon={DollarSign} label="Revenue" desc="MRR, sales & transactions" accent="emerald" onClick={() => navigate('/admin/revenue')} />
            <ActionTile icon={Film} label="Media" desc="Videos, music & thumbnails" accent="primary" onClick={() => navigate('/admin/media')} />
            <ActionTile icon={Users} label="Users" desc="Manage & moderate" accent="sky" onClick={() => navigate('/admin/users')} />
            <ActionTile icon={Activity} label="Visitors" desc="Sessions & IP lookup" accent="fuchsia" onClick={() => navigate('/admin/visitors')} />
            <ActionTile icon={Bell} label="Push" desc="Send notifications" accent="rose" onClick={() => navigate('/admin/push')} />
          </div>
        </GlassPanel>
      </section>

      {/* Recent activity feed */}
      <section>
        <AlertsFeed />
      </section>

      {/* Platform summary */}
      <section>
        <GlassPanel className="p-5">
          <SectionTitle sub="Cumulative totals across the whole platform.">Platform summary</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              ['Total Users', stats?.totalUsers, Users],
              ['Videos', stats?.totalVideos, Video],
              ['Reels', stats?.totalReels, Film],
              ['Community Posts', stats?.totalPosts, FileText],
              ['Active Subs', stats?.activeSubscriptions, TrendingUp],
              ['Pending Apps', stats?.pendingApplications, Radio],
              ['New Users · 7d', stats?.recentSignups, Users],
            ].map(([label, val, Icon]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-1.5 text-white/40 mb-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">{statsLoading ? '···' : fmt(val)}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>
    </div>
  );
};

export default AdminDashboard;
