import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Search, Loader2, RefreshCw, Globe, User as UserIcon, Eye, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const fmtDur = (ms) => {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// Timeline for one session.
const SessionDialog = ({ sessionId, isOpen, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/track/sessions/${sessionId}`);
        if (!cancelled) setEvents(data.result?.events || []);
      } catch { if (!cancelled) toast({ title: 'Error', description: 'Failed to load session.', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isOpen, sessionId, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Session timeline</DialogTitle>
          <DialogDescription className="font-mono text-xs">{sessionId}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No events.</p>
          ) : (
            <div className="space-y-1.5">
              {events.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg border border-border bg-secondary/20">
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.type}</Badge>
                  <div className="min-w-0 flex-1">
                    {e.path && <span className="text-foreground">{e.path}</span>}
                    {e.target?.title && <span className="text-foreground">{e.target.title}</span>}
                    {e.target?.kind && !e.target?.title && <span className="text-muted-foreground">{e.target.kind} {e.target.id}</span>}
                    {e.durationMs > 0 && <span className="text-muted-foreground ml-2">· {fmtDur(e.durationMs)}</span>}
                  </div>
                  <span className="text-muted-foreground shrink-0">{fmtTime(e.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Friendly names for the first path segment of a landing page.
const SURFACE_LABELS = {
  home: 'Shorts / For You',
  browse: 'Browse',
  explore: 'Explore',
  watch: 'Watch (deep link)',
  live: 'Live',
  AI: 'AI Assistant',
  memberships: 'Memberships',
  profile: 'Profile',
  'my-apps': 'My Apps',
  library: 'Library',
};
const surfaceName = (k) => SURFACE_LABELS[k] || (k ? `/${k}` : 'Other');

// Per-landing-surface retention & conversion. Answers: does landing on the
// shorts feed help or hurt return/conversion vs other entry points?
const LandingBreakdown = ({ rows }) => {
  const data = [...(rows || [])].sort((a, b) => b.visitors - a.visitors);
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const fmtMin = (ms) => {
    const m = Math.round((ms || 0) / 60000);
    return m >= 1 ? `${m}m` : `${Math.round((ms || 0) / 1000)}s`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5" /> Where they land → did it work? (by first visit, last 30d)
      </p>
      <p className="text-[11px] text-muted-foreground mb-3">Compare the Shorts feed vs other entry points. Return = came back for another session; Converted = ever logged in.</p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Not enough traffic yet — this fills in as visitors arrive.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2 pr-3">Landing surface</th>
                <th className="text-right font-semibold py-2 px-3">Visitors</th>
                <th className="text-right font-semibold py-2 px-3">Returned</th>
                <th className="text-right font-semibold py-2 px-3">Converted</th>
                <th className="text-right font-semibold py-2 pl-3">Avg session</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s._id || 'other'} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{surfaceName(s._id)}</td>
                  <td className="py-2.5 px-3 text-right">{s.visitors}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-foreground">{pct(s.returning, s.visitors)}%</span>
                    <span className="text-muted-foreground text-xs"> ({s.returning})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span style={{ color: '#22c55e' }}>{pct(s.converted, s.visitors)}%</span>
                    <span className="text-muted-foreground text-xs"> ({s.converted})</span>
                  </td>
                  <td className="py-2.5 pl-3 text-right text-muted-foreground">{fmtMin(s.avgDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminVisitors = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [landing, setLanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [sessionTarget, setSessionTarget] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  // IP lookup
  const [ipQuery, setIpQuery] = useState('');
  const [ipResult, setIpResult] = useState(null);
  const [ipLoading, setIpLoading] = useState(false);

  const load = useCallback(async (d = days) => {
    setLoading(true);
    try {
      const [vis, land] = await Promise.all([
        api.get('/track/visitors', { params: { days: d } }),
        api.get('/track/landing', { params: { days: Math.max(d, 30) } }).catch(() => ({ data: {} })),
      ]);
      setSessions(vis.data.result?.sessions || []);
      setLanding(land.data.result?.surfaces || []);
    } catch { toast({ title: 'Error', description: 'Failed to load visitors.', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [days, toast]);

  useEffect(() => { load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const lookupIp = async (e) => {
    e?.preventDefault();
    const ip = ipQuery.trim();
    if (!ip) return;
    setIpLoading(true); setIpResult(null);
    try {
      const { data } = await api.get(`/track/ip/${encodeURIComponent(ip)}`);
      setIpResult(data.result);
    } catch { toast({ title: 'Error', description: 'IP lookup failed.', variant: 'destructive' }); }
    finally { setIpLoading(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> Visitors & Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Anonymous + logged-in sessions, correlated by IP. Recorded since tracking went live.</p>
        </div>
        <div className="flex gap-2 items-center">
          {[1, 7, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border"
              style={days === d ? { borderColor: '#F0B94D', color: '#F0B94D', background: 'rgba(240,185,77,0.1)' } : { borderColor: '#333', color: '#888' }}>
              {d}d
            </button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => load()} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* IP lookup */}
      <form onSubmit={lookupIp} className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Look up an IP</p>
        <div className="flex gap-2">
          <Input placeholder="e.g. 181.58.39.225" value={ipQuery} onChange={e => setIpQuery(e.target.value)} className="font-mono" />
          <Button type="submit" disabled={ipLoading}>{ipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}</Button>
        </div>
        {ipResult && (
          <div className="mt-3 text-sm space-y-2">
            <div>
              <span className="text-muted-foreground text-xs">Accounts that have used this IP:</span>
              {ipResult.accounts?.length ? (
                <div className="mt-1 space-y-1">
                  {ipResult.accounts.map(a => (
                    <div key={a._id} className="flex items-center gap-2 text-xs">
                      <UserIcon className="w-3 h-3 text-muted-foreground" />
                      <span className="font-semibold">@{a.username}</span>
                      <span className="text-muted-foreground">{a.email}</span>
                      {a.isBanned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                      <span className="text-muted-foreground">· last login {a.lastLoginAt ? fmtTime(a.lastLoginAt) : 'never'}</span>
                    </div>
                  ))}
                </div>
              ) : <span className="text-xs text-muted-foreground ml-1">none</span>}
            </div>
            <div className="text-xs text-muted-foreground">{ipResult.sessions?.length || 0} session(s) from this IP.</div>
          </div>
        )}
      </form>

      {/* Landing surface -> retention & conversion */}
      <LandingBreakdown rows={landing} />

      {/* Sessions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No sessions in this window yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map(s => (
              <button key={s._id} onClick={() => { setSessionTarget(s._id); setSessionOpen(true); }}
                className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors text-left">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.authed ? 'bg-green-500/10' : 'bg-muted'}`}>
                  {s.authed ? <UserIcon className="w-4 h-4 text-green-500" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{s.authed ? `@${s.username || 'member'}` : 'Anonymous'}</span>
                    <span className="font-mono text-xs text-muted-foreground">{s.ip}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {s.pageViews} views</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDur(s.totalDuration)}</span>
                    <span>{s.events} events</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmtTime(s.lastSeen)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <SessionDialog sessionId={sessionTarget} isOpen={sessionOpen} onOpenChange={(o) => { setSessionOpen(o); if (!o) setSessionTarget(null); }} />
    </div>
  );
};

export default AdminVisitors;
