import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, ShieldBan, ShieldCheck, ShieldOff, UserCheck, MessageSquare, MicOff, Mic, Loader2, RefreshCw, CheckCircle2, XCircle, Crown, CalendarDays, Filter } from 'lucide-react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // kept for DirectMessageDialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import api from '@/api/homieshub';

const PLAN_LABELS = [
  'Homies Monthly', 'Homies 3 Months', 'Homies 6 Months', 'Homies Yearly',
  'Digital Nomad Monthly', 'Digital Nomad 3 Months', 'Digital Nomad 6 Months', 'Digital Nomad Yearly',
  'Discord Only', 'Manual Grant',
];
const DURATION_PRESETS = [
  { label: '1 Month',  days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year',   days: 365 },
];

function fmtExpiry(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isMembershipActive(user) {
  if (!user.tags?.includes('member')) return false;
  if (!user.membership?.expiresAt) return true; // legacy tag, no expiry
  return new Date(user.membership.expiresAt) > new Date();
}

const TIERS = [
  { value: 'discord', label: 'Discord Only',  color: '#5865F2', desc: 'Discord server access only' },
  { value: 'homies',  label: 'The Homie',      color: '#F0B94D', desc: 'Full app + Discord access' },
  { value: 'nomad',   label: 'Digital Nomad',  color: '#23A55A', desc: 'Everything + mentorship' },
];

const ManageMembershipDialog = ({ user, isOpen, onOpenChange, onUpdate }) => {
  const { toast } = useToast();
  const [tier, setTier] = useState('homies');
  const [mode, setMode] = useState('grant'); // 'grant' | 'custom'
  const [selectedDays, setSelectedDays] = useState(30);
  const [customDate, setCustomDate] = useState('');
  const [planLabel, setPlanLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const active = user ? isMembershipActive(user) : false;
  const expiry = user?.membership?.expiresAt ? fmtExpiry(user.membership.expiresAt) : null;

  useEffect(() => {
    if (user) {
      setTier(user.membership?.tier || 'homies');
      setPlanLabel(user.membership?.planLabel || '');
      setNotes(user.membership?.notes || '');
    }
  }, [user]);

  const handleGrant = async () => {
    setLoading(true);
    try {
      const body = {
        tier,
        planLabel: planLabel || TIERS.find(t => t.value === tier)?.label || 'Manual Grant',
        notes,
        ...(mode === 'custom' && customDate
          ? { expiresAt: customDate }
          : { durationDays: selectedDays }),
      };
      const { data } = await api.post(`/admin/users/${user._id}/membership`, body);
      toast({ title: 'Membership granted!', description: `@${user.username} — expires ${fmtExpiry(data.result.membership?.expiresAt)}` });
      onUpdate(user._id, { membership: data.result.membership, tags: data.result.tags });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to grant membership.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm(`Revoke membership for @${user.username}?`)) return;
    setLoading(true);
    try {
      await api.delete(`/admin/users/${user._id}/membership`);
      toast({ title: 'Membership revoked', description: `@${user.username}` });
      onUpdate(user._id, { tags: (user.tags || []).filter(t => t !== 'member') });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            Manage Membership — @{user.username}
          </DialogTitle>
          <DialogDescription>
            {active
              ? `Currently active${expiry ? ` · expires ${expiry}` : ''}`
              : user.membership?.expiresAt
                ? `Expired ${expiry}`
                : 'No membership on file'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tier selector */}
          <div className="space-y-1.5">
            <Label>Subscription Tier</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTier(t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tier === t.value
                      ? 'border-2'
                      : 'border-border bg-secondary/20 hover:border-foreground/30'
                  }`}
                  style={tier === t.value ? { borderColor: t.color, background: `${t.color}15` } : {}}
                >
                  <p className="font-bold text-xs" style={tier === t.value ? { color: t.color } : {}}>{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Plan label (optional record note) */}
          <div className="space-y-1.5">
            <Label>Plan Label <span className="text-muted-foreground text-xs">(optional — billing record)</span></Label>
            <Select value={planLabel} onValueChange={setPlanLabel}>
              <SelectTrigger><SelectValue placeholder={TIERS.find(t2 => t2.value === tier)?.label || 'Select…'} /></SelectTrigger>
              <SelectContent>
                {PLAN_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_PRESETS.map(p => (
                <button
                  key={p.days}
                  onClick={() => { setMode('grant'); setSelectedDays(p.days); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    mode === 'grant' && selectedDays === p.days
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setMode('custom')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                  mode === 'custom'
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                    : 'border-border text-muted-foreground hover:border-foreground'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />Custom
              </button>
            </div>
            {mode === 'custom' && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-2"
                style={{ colorScheme: 'dark' }}
              />
            )}
            {active && mode === 'grant' && (
              <p className="text-xs text-muted-foreground">
                Extends from current expiry: new expiry will be <span className="text-foreground font-medium">{
                  fmtExpiry(new Date(
                    Math.max(new Date(user.membership?.expiresAt || 0), new Date()).getTime()
                    + selectedDays * 86400000
                  ).toISOString())
                }</span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              placeholder="e.g. CashApp $homieshub, manual payment, promo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {active && (
            <Button variant="destructive" onClick={handleRevoke} disabled={loading} className="sm:mr-auto">
              Revoke
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleGrant} disabled={loading || (mode === 'custom' && !customDate)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
            {active ? 'Extend' : 'Grant'} Membership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DirectMessageDialog = ({ recipient, isOpen, onOpenChange }) => {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !recipient?.username) return;
    setLoading(true);
    try {
      await api.post('/messages/send', { recipientUsername: recipient.username, content: message });
      toast({ title: 'Message Sent', description: `Direct message sent to @${recipient.username}.` });
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!recipient) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Message @{recipient.username}</DialogTitle>
          <DialogDescription>Send a private message to this user.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!message.trim() || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminUsers = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmRecipient, setDmRecipient] = useState(null);
  const [membershipTarget, setMembershipTarget] = useState(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'discord' | 'homies' | 'nomad' | 'stripe' | 'free'
  const limit = 20;

  const loadUsers = useCallback(async (q = searchTerm, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, page: p, limit } });
      if (data.status) {
        setUsers(data.result.items || []);
        setTotal(data.result.pagination?.total || 0);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers(searchTerm, 1);
  };

  const handleBan = async (user) => {
    try {
      const { data } = await api.post(`/admin/users/${user._id}/ban`);
      if (data.status) {
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isBanned: data.result.isBanned } : u));
        toast({ title: data.result.isBanned ? 'User Banned' : 'User Unbanned', description: `@${user.username}` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    }
  };

  const handlePromote = async (user) => {
    const endpoint = user.isAdmin ? `/admin/users/${user._id}/demote` : `/admin/users/${user._id}/promote`;
    try {
      const { data } = await api.post(endpoint);
      if (data.status) {
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isAdmin: data.result.isAdmin } : u));
        toast({ title: data.result.isAdmin ? 'Promoted to Admin' : 'Admin Role Removed', description: `@${user.username}` });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update role.', variant: 'destructive' });
    }
  };

  const handleMute = async (user) => {
    try {
      const { data } = await api.post(`/admin/users/${user._id}/mute`);
      if (data.status) {
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isMuted: data.result.isMuted } : u));
        toast({ title: data.result.isMuted ? 'User Muted' : 'User Unmuted', description: `@${user.username}` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    }
  };

  const handleMembershipUpdate = (userId, patch) => {
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...patch } : u));
  };

  const filteredUsers = users.filter(u => {
    if (tierFilter === 'all') return true;
    if (tierFilter === 'stripe') return u.subscription?.isActive;
    if (tierFilter === 'free') return !u.subscription?.isActive && !isMembershipActive(u);
    if (tierFilter === 'expired') return !isMembershipActive(u) && u.membership?.expiresAt;
    return isMembershipActive(u) && u.membership?.tier === tierFilter;
  });

  const totalPages = Math.ceil(total / limit);

  const FILTERS = [
    { key: 'all',     label: 'All Users',      color: null,       textColor: '#fff' },
    { key: 'discord', label: 'Discord Only',   color: '#5865F2',  textColor: '#fff' },
    { key: 'homies',  label: 'The Homie',      color: '#F0B94D',  textColor: '#000' },
    { key: 'nomad',   label: 'Digital Nomad',  color: '#23A55A',  textColor: '#fff' },
    { key: 'stripe',  label: 'Stripe Active',  color: '#22c55e',  textColor: '#000' },
    { key: 'expired', label: 'Expired',        color: '#ef4444',  textColor: '#fff' },
    { key: 'free',    label: 'Free',           color: '#6b7280',  textColor: '#fff' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total users</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="icon" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => loadUsers()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* ── Membership filter ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" /> Filter by Membership
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTierFilter(f.key)}
              className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
              style={tierFilter === f.key
                ? { backgroundColor: f.color || '#333', borderColor: f.color || '#666', color: f.textColor }
                : { backgroundColor: 'transparent', borderColor: '#333', color: '#888' }
              }
            >
              {f.label}
              {tierFilter === f.key && tierFilter !== 'all' && (
                <span className="ml-1.5 opacity-80 text-xs">({filteredUsers.length})</span>
              )}
              {tierFilter === 'all' && f.key === 'all' && (
                <span className="ml-1.5 opacity-70 text-xs">({users.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── User list ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No users match this filter.</p>
        ) : (
          <div className="divide-y divide-border">
              {filteredUsers.map((user) => {
                const manualActive = isMembershipActive(user);
                const stripeActive = user.subscription?.isActive;
                const expiry = user.membership?.expiresAt ? fmtExpiry(user.membership.expiresAt) : null;
                const tierInfo = TIERS.find(t => t.value === user.membership?.tier);

                return (
                  <div key={user._id} className="flex items-center gap-3 py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors">

                    {/* Avatar + name */}
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${user.username}`)}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.name || user.username}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                          {user.email && (
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                              · {user.email}
                              {user.emailVerified
                                ? <CheckCircle2 className="inline w-2.5 h-2.5 text-green-500 ml-0.5" />
                                : <XCircle className="inline w-2.5 h-2.5 text-yellow-500 ml-0.5" />}
                            </span>
                          )}
                          {user.discordUsername && (
                            <span className="text-xs text-[#5865F2] font-medium">· @{user.discordUsername}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Membership badge — click opens dialog */}
                    <button
                      onClick={() => { setMembershipTarget(user); setMembershipOpen(true); }}
                      className="flex-shrink-0 flex flex-col items-center gap-0.5 group"
                      title="Manage Membership"
                    >
                      {stripeActive ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px] group-hover:bg-green-500/20">Stripe</Badge>
                      ) : manualActive ? (
                        <>
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full group-hover:opacity-80"
                            style={{ background: `${tierInfo?.color || '#F0B94D'}20`, color: tierInfo?.color || '#F0B94D', border: `1px solid ${tierInfo?.color || '#F0B94D'}40` }}
                          >
                            <Crown className="w-2.5 h-2.5" />
                            {tierInfo?.label || 'Member'}
                          </span>
                          {expiry && <span className="text-[10px] text-muted-foreground">until {expiry}</span>}
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground border border-dashed border-border rounded-full px-2 py-0.5">
                          Free
                        </span>
                      )}
                    </button>

                    {/* Status badges */}
                    <div className="flex-shrink-0 hidden sm:flex gap-1">
                      {user.isBanned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                      {user.isMuted && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-[10px]">Muted</Badge>}
                      {user.isAdmin && <Badge className="text-[10px]">Admin</Badge>}
                    </div>

                    {/* Always-visible Crown button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-8 w-8 text-yellow-500 hover:bg-yellow-500/10"
                      title="Manage Membership"
                      onClick={() => { setMembershipTarget(user); setMembershipOpen(true); }}
                    >
                      <Crown className="h-4 w-4" />
                    </Button>

                    {/* ··· more actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)}>
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setDmRecipient(user); setDmOpen(true); }}>
                          <MessageSquare className="mr-2 h-4 w-4" /> Message
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMute(user)}>
                          {user.isMuted ? <><Mic className="mr-2 h-4 w-4" /> Unmute</> : <><MicOff className="mr-2 h-4 w-4" /> Mute</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePromote(user)}>
                          {user.isAdmin
                            ? <><ShieldOff className="mr-2 h-4 w-4" /> Remove Admin</>
                            : <><ShieldCheck className="mr-2 h-4 w-4" /> Make Admin</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={user.isBanned ? '' : 'text-destructive focus:text-destructive'}
                          onClick={() => handleBan(user)}
                        >
                          {user.isBanned ? <><UserCheck className="mr-2 h-4 w-4" /> Unban</> : <><ShieldBan className="mr-2 h-4 w-4" /> Ban</>}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">{filteredUsers.length} shown · {total} total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DirectMessageDialog recipient={dmRecipient} isOpen={dmOpen} onOpenChange={setDmOpen} />
      <ManageMembershipDialog
        user={membershipTarget}
        isOpen={membershipOpen}
        onOpenChange={(o) => { setMembershipOpen(o); if (!o) setMembershipTarget(null); }}
        onUpdate={handleMembershipUpdate}
      />
    </div>
  );
};

export default AdminUsers;
