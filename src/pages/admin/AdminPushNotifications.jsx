import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, Megaphone, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';
import { formatDistanceToNow } from 'date-fns';

// ── Pre-built notification templates ─────────────────────────────────────────
const TEMPLATES = [
  {
    label: 'New Drop',
    title: '🔥 New Drop on The Homies Hub',
    body: 'Something new just dropped. Tap to check it out!',
  },
  {
    label: 'Special Offer',
    title: '💎 Limited Time Offer',
    body: 'Exclusive deal just for Homies members. Don\'t miss out!',
  },
  {
    label: 'New Event',
    title: '🎉 New Event Live Now',
    body: 'A new event is happening on The Homies Hub. Join now!',
  },
  {
    label: 'Live Stream',
    title: '🔴 Someone is Live',
    body: 'A creator you follow just went live. Tune in now!',
  },
  {
    label: 'Weekly Recap',
    title: '📊 Your Weekly Homies Recap',
    body: 'Here\'s what you missed this week on The Homies Hub.',
  },
  {
    label: 'Membership Promo',
    title: '👑 Upgrade Your Membership',
    body: 'Get full access to exclusive content. Join as a Homies member today.',
  },
];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-6 pb-5 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value ?? '—'}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── History row ───────────────────────────────────────────────────────────────
function HistoryRow({ entry }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={cn(
        'mt-0.5 p-1.5 rounded-full',
        entry.type === 'broadcast' ? 'bg-blue-500/10' : 'bg-amber-500/10'
      )}>
        {entry.type === 'broadcast'
          ? <Megaphone className="w-3.5 h-3.5 text-blue-500" />
          : <Users className="w-3.5 h-3.5 text-amber-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.title}</p>
        <p className="text-xs text-muted-foreground truncate">{entry.body}</p>
        {entry.usernames?.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            To: {entry.usernames.join(', ')}
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <Badge variant="secondary" className="text-[10px]">{entry.sent} sent</Badge>
        <p className="text-[10px] text-muted-foreground mt-1">
          {entry.sentAt ? formatDistanceToNow(new Date(entry.sentAt), { addSuffix: true }) : ''}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const AdminPushNotifications = () => {
  const { toast } = useToast();

  const [stats, setStats]       = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Broadcast form
  const [bcTitle, setBcTitle]   = useState('');
  const [bcBody, setBcBody]     = useState('');
  const [bcSending, setBcSending] = useState(false);

  // Targeted form
  const [tgTitle, setTgTitle]   = useState('');
  const [tgBody, setTgBody]     = useState('');
  const [tgUsers, setTgUsers]   = useState('');
  const [tgSending, setTgSending] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        api.get('/admin/push/stats'),
        api.get('/admin/push/history'),
      ]);
      setStats(statsRes.data?.result);
      setHistory(historyRes.data?.result?.history || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const applyTemplate = (tpl, target) => {
    if (target === 'broadcast') { setBcTitle(tpl.title); setBcBody(tpl.body); }
    else { setTgTitle(tpl.title); setTgBody(tpl.body); }
  };

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcBody.trim()) return;
    setBcSending(true);
    try {
      const { data } = await api.post('/admin/push/broadcast', { title: bcTitle, body: bcBody });
      toast({ title: 'Broadcast sent!', description: data.message });
      setBcTitle(''); setBcBody('');
      loadData();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setBcSending(false);
    }
  };

  const sendTargeted = async () => {
    const usernames = tgUsers.split(',').map(u => u.trim().replace(/^@/, '')).filter(Boolean);
    if (!tgTitle.trim() || !tgBody.trim() || !usernames.length) return;
    setTgSending(true);
    try {
      const { data } = await api.post('/admin/push/send', { title: tgTitle, body: tgBody, usernames });
      toast({ title: 'Notification sent!', description: data.message });
      setTgTitle(''); setTgBody(''); setTgUsers('');
      loadData();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setTgSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" /> Push Notifications
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Send mobile push notifications to your users. Only users who have downloaded the app and granted permission will receive them.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Users with Push Enabled" value={stats?.usersWithTokens?.toLocaleString()} sub="Unique users who granted permission" />
        <StatCard icon={Bell} label="Total Registered Devices" value={stats?.totalTokens?.toLocaleString()} sub="Some users have multiple devices" />
      </div>

      {/* Composer */}
      <Tabs defaultValue="broadcast">
        <TabsList>
          <TabsTrigger value="broadcast" className="flex items-center gap-1.5">
            <Megaphone className="w-4 h-4" /> Broadcast to All
          </TabsTrigger>
          <TabsTrigger value="targeted" className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Send to Specific Users
          </TabsTrigger>
        </TabsList>

        {/* ── Broadcast ── */}
        <TabsContent value="broadcast" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Broadcast Notification</CardTitle>
              <CardDescription>Sends to every user who has the app installed and notifications enabled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Templates */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Templates</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.label}
                      onClick={() => applyTemplate(tpl, 'broadcast')}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors font-medium"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Title</label>
                  <Input
                    value={bcTitle}
                    onChange={e => setBcTitle(e.target.value)}
                    placeholder="e.g. 🔥 New Drop on The Homies Hub"
                    maxLength={100}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{bcTitle.length}/100</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Message</label>
                  <Textarea
                    value={bcBody}
                    onChange={e => setBcBody(e.target.value)}
                    placeholder="What do you want to tell your users?"
                    rows={3}
                    maxLength={250}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{bcBody.length}/250</p>
                </div>
              </div>

              {/* Preview */}
              {(bcTitle || bcBody) && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{bcTitle || 'Notification title'}</p>
                      <p className="text-xs text-muted-foreground">{bcBody || 'Notification body'}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={sendBroadcast}
                disabled={!bcTitle.trim() || !bcBody.trim() || bcSending}
                className="w-full"
              >
                {bcSending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  : <><Megaphone className="w-4 h-4 mr-2" /> Send to All {stats?.usersWithTokens ? `(${stats.usersWithTokens} users)` : ''}</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Targeted ── */}
        <TabsContent value="targeted" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Targeted Notification</CardTitle>
              <CardDescription>Send to one or more specific users by @username.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Templates */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Templates</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.label}
                      onClick={() => applyTemplate(tpl, 'targeted')}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors font-medium"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Recipients</label>
                  <Input
                    value={tgUsers}
                    onChange={e => setTgUsers(e.target.value)}
                    placeholder="@username1, @username2, @username3"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Comma-separated usernames. Include @ or leave it out, both work.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Title</label>
                  <Input
                    value={tgTitle}
                    onChange={e => setTgTitle(e.target.value)}
                    placeholder="e.g. 👑 Exclusive access granted"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Message</label>
                  <Textarea
                    value={tgBody}
                    onChange={e => setTgBody(e.target.value)}
                    placeholder="Personalized message..."
                    rows={3}
                    maxLength={250}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Preview */}
              {(tgTitle || tgBody) && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{tgTitle || 'Notification title'}</p>
                      <p className="text-xs text-muted-foreground">{tgBody || 'Notification body'}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={sendTargeted}
                disabled={!tgTitle.trim() || !tgBody.trim() || !tgUsers.trim() || tgSending}
                className="w-full"
              >
                {tgSending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4 mr-2" /> Send Notification</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* History */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Send History</CardTitle>
            <CardDescription className="mt-0.5">Last {history.length} notifications sent this session.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications sent yet this session.</p>
          ) : (
            history.map((entry, i) => <HistoryRow key={i} entry={entry} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPushNotifications;
