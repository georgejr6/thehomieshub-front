import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Ban, ScrollText, Inbox, RefreshCw, Loader2, Globe, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const actionColor = (a = '') => {
  if (a.includes('ban') && !a.includes('unban')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (a.includes('unban')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (a.includes('flag')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (a.includes('appeal')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  return 'bg-white/10 text-white/70 border-white/20';
};

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 ${className}`}>{children}</div>
);

const AdminModeration = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('audit');
  const [loading, setLoading] = useState(true);
  const [bans, setBans] = useState({ users: [], ips: [], counts: { users: 0, ips: 0 } });
  const [audit, setAudit] = useState([]);
  const [appeals, setAppeals] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, ap] = await Promise.all([
        api.get('/admin/bans'),
        api.get('/admin/audit?limit=200'),
        api.get('/admin/appeals'),
      ]);
      setBans(b.data.result || { users: [], ips: [], counts: { users: 0, ips: 0 } });
      setAudit(a.data.result?.rows || []);
      setAppeals(ap.data.result?.rows || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load moderation data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const pendingAppeals = appeals.filter((x) => x.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-primary/15 border border-white/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Moderation</h1>
            <p className="text-sm text-white/50">Bans, flags, IP blocks & appeals — all logged.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><div className="text-3xl font-black">{bans.counts?.users ?? 0}</div><div className="text-xs text-white/50 mt-1 flex items-center gap-1"><Ban className="h-3 w-3" /> Banned accounts</div></Card>
        <Card><div className="text-3xl font-black">{bans.counts?.ips ?? 0}</div><div className="text-xs text-white/50 mt-1 flex items-center gap-1"><Globe className="h-3 w-3" /> Banned IPs</div></Card>
        <Card><div className="text-3xl font-black">{pendingAppeals}</div><div className="text-xs text-white/50 mt-1 flex items-center gap-1"><Inbox className="h-3 w-3" /> Pending appeals</div></Card>
        <Card><div className="text-3xl font-black">{audit.length}</div><div className="text-xs text-white/50 mt-1 flex items-center gap-1"><ScrollText className="h-3 w-3" /> Recent log rows</div></Card>
      </div>

      {/* Banned accounts + IPs */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <h2 className="font-bold mb-3 flex items-center gap-2"><Ban className="h-4 w-4 text-rose-400" /> Banned accounts</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {bans.users.length === 0 && <p className="text-sm text-white/40">None.</p>}
            {bans.users.map((u) => (
              <div key={u.username} className="text-sm p-2.5 rounded-lg border border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">@{u.username}</span>
                  <span className="text-[11px] text-white/40">{fmt(u.bannedAt)}</span>
                </div>
                <div className="text-white/50 text-xs">{u.email}</div>
                {u.banReason && <div className="text-white/60 text-xs mt-1">{u.banReason}</div>}
                {u.ips?.length > 0 && <div className="text-[11px] text-white/40 mt-1 font-mono">{u.ips.join(', ')}</div>}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-rose-400" /> Hard-banned IPs</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {bans.ips.length === 0 && <p className="text-sm text-white/40">None.</p>}
            {bans.ips.map((ip) => (
              <div key={ip.ip} className="text-sm p-2.5 rounded-lg border border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{ip.ip}</span>
                  <span className="text-[11px] text-white/40">{fmt(ip.createdAt)}</span>
                </div>
                {(ip.note || ip.reason) && <div className="text-white/60 text-xs mt-1">{ip.note || ip.reason}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('audit')} className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${tab === 'audit' ? 'bg-primary/15 border-primary/30 text-white' : 'border-white/10 text-white/50 hover:text-white'}`}>
          <ScrollText className="h-4 w-4 inline mr-2" />Audit log
        </button>
        <button onClick={() => setTab('appeals')} className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${tab === 'appeals' ? 'bg-primary/15 border-primary/30 text-white' : 'border-white/10 text-white/50 hover:text-white'}`}>
          <Inbox className="h-4 w-4 inline mr-2" />Appeals{pendingAppeals > 0 && <Badge className="ml-2 bg-sky-500/20 text-sky-300">{pendingAppeals}</Badge>}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : tab === 'audit' ? (
        <Card className="p-0 overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
            {audit.length === 0 && <p className="text-sm text-white/40 p-5">No log entries.</p>}
            {audit.map((row) => (
              <div key={row._id} className="flex items-start gap-3 p-3 text-sm">
                <Badge variant="outline" className={`shrink-0 text-[11px] ${actionColor(row.action)}`}>{row.action}</Badge>
                <div className="min-w-0 flex-1">
                  <span className="text-white/80">{row.targetType}:{row.targetId}</span>
                  {row.reason && <span className="text-white/50"> — {row.reason}</span>}
                  <div className="text-[11px] text-white/35 mt-0.5">by {row.actor} · {fmt(row.createdAt)}{row.note ? ` · ${row.note}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
            {appeals.length === 0 && <p className="text-sm text-white/40 p-5">No appeals yet.</p>}
            {appeals.map((a) => (
              <div key={a._id} className="p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{a.handle}</span>
                  <Badge variant="outline" className={a.status === 'pending' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-white/10 text-white/60'}>{a.status}</Badge>
                </div>
                <div className="text-white/50 text-xs flex items-center gap-1 mt-1"><Mail className="h-3 w-3" />{a.email} · <span className="font-mono">{a.ip}</span> · {fmt(a.createdAt)}</div>
                <p className="text-white/75 mt-2 whitespace-pre-wrap">{a.message}</p>
                {a.availability && <p className="text-white/50 text-xs mt-2"><span className="text-white/40">Availability:</span> {a.availability}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminModeration;
