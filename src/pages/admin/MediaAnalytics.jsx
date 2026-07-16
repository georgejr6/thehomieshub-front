import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, BarChart3, Music, Film, Globe, Headphones, Clock, Users,
  User as UserIcon, Radio, ExternalLink, Eye,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

// ── formatters ────────────────────────────────────────────────────────────────
const fmtMs = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// ── WHO consumed one item (song listeners OR video viewers), with IP ──────────
function AudienceDialog({ item, kind, isOpen, onOpenChange }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !item?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const path = kind === 'video' ? `/track/media/video/${encodeURIComponent(item.id)}` : `/track/music/song/${encodeURIComponent(item.id)}`;
        const res = await api.get(path, { params: { days: 90 } });
        if (!cancelled) setData(res.data?.result || null);
      } catch { if (!cancelled) toast({ title: 'Failed to load audience', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isOpen, item?.id, kind, toast]);

  const rows = kind === 'video' ? (data?.viewers || []) : (data?.listeners || []);
  const totals = data?.totals;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="truncate">{item?.title || (kind === 'video' ? 'Video' : 'Song')}</DialogTitle>
          <DialogDescription>
            {totals
              ? kind === 'video'
                ? `${totals.views} views · ${fmtMs(totals.watchMs)} total watch · last 90 days`
                : `${totals.plays} plays · ${fmtMs(totals.listenMs)} total listen · ${totals.playlistAdds} playlist add(s) · last 90 days`
              : 'Who watched / listened, from where, and for how long.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nothing recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((l, i) => (
                <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg border border-border bg-secondary/20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${l.authed ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {l.authed ? <UserIcon className="w-4 h-4 text-green-500" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{l.authed ? `@${l.username || 'member'}` : 'Anonymous'}</span>
                      <span className="font-mono text-xs text-muted-foreground">{l.ip}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {kind === 'video' ? (
                        <>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.views} view(s)</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtMs(l.watchMs)}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1"><Headphones className="w-3 h-3" /> {l.plays} play(s)</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtMs(l.listenMs)}</span>
                        </>
                      )}
                      <span>{fmtTime(l.lastPlayed || l.lastWatched)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Songs / Videos leaderboard ────────────────────────────────────────────────
function MediaLeaderboard({ kind, days }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const path = kind === 'video' ? '/track/media/videos' : '/track/music/songs';
      const { data } = await api.get(path, { params: { days } });
      setRows(kind === 'video' ? (data?.result?.videos || []) : (data?.result?.songs || []));
    } catch { toast({ title: 'Failed to load analytics', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [kind, days, toast]);

  useEffect(() => { load(); }, [load]);

  const primaryCount = kind === 'video' ? 'views' : 'plays';
  const audienceCount = kind === 'video' ? 'viewers' : 'listeners';
  const totalTimeKey = kind === 'video' ? 'watchMs' : 'listenMs';
  const avgTimeKey = kind === 'video' ? 'avgWatchMs' : 'avgListenMs';

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <p className="text-center text-muted-foreground py-16 text-sm">No {kind === 'video' ? 'views' : 'plays'} recorded in this window yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
            <th className="text-left font-semibold py-2.5 px-4">#</th>
            <th className="text-left font-semibold py-2.5 px-2">{kind === 'video' ? 'Video' : 'Song'}</th>
            <th className="text-right font-semibold py-2.5 px-3">{kind === 'video' ? 'Views' : 'Plays'}</th>
            <th className="text-right font-semibold py-2.5 px-3">{kind === 'video' ? 'Viewers' : 'Listeners'}</th>
            <th className="text-right font-semibold py-2.5 px-3">Total time</th>
            <th className="text-right font-semibold py-2.5 px-4">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s._id} onClick={() => { setTarget({ id: s._id, title: s.title }); setOpen(true); }}
              className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer">
              <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
              <td className="py-2.5 px-2 font-medium max-w-[260px] truncate">
                {s.title || <span className="text-muted-foreground font-mono text-xs">{s._id}</span>}
                {kind === 'video' && s.kind === 'reel' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">reel</span>}
              </td>
              <td className="py-2.5 px-3 text-right">{s[primaryCount]}</td>
              <td className="py-2.5 px-3 text-right">
                {s[audienceCount]}{s.members > 0 && <span className="text-muted-foreground text-xs"> ({s.members} member)</span>}
              </td>
              <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtMs(s[totalTimeKey])}</td>
              <td className="py-2.5 px-4 text-right text-muted-foreground">{fmtMs(s[avgTimeKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <AudienceDialog item={target} kind={kind} isOpen={open} onOpenChange={(o) => { setOpen(o); if (!o) setTarget(null); }} />
    </div>
  );
}

// ── Traffic sources ───────────────────────────────────────────────────────────
function TrafficSources({ days }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ sources: [], totalSessions: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/track/sources', { params: { days } });
        if (!cancelled) setData(data?.result || { sources: [], totalSessions: 0 });
      } catch { if (!cancelled) toast({ title: 'Failed to load traffic sources', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [days, toast]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!data.sources.length) return <p className="text-center text-muted-foreground py-16 text-sm">No traffic recorded in this window yet.</p>;

  const max = Math.max(...data.sources.map(s => s.sessions), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
            <th className="text-left font-semibold py-2.5 px-4">Source</th>
            <th className="text-right font-semibold py-2.5 px-3">Sessions</th>
            <th className="text-right font-semibold py-2.5 px-3">Visitors</th>
            <th className="text-right font-semibold py-2.5 px-3">Signed up</th>
            <th className="text-right font-semibold py-2.5 px-4">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {data.sources.map((s) => (
            <tr key={s.source} className="border-b border-border/50 last:border-0">
              <td className="py-2.5 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate max-w-[200px]">{s.source}</span>
                </div>
                <div className="h-1.5 mt-1.5 rounded-full bg-muted overflow-hidden max-w-[220px]">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((s.sessions / max) * 100)}%` }} />
                </div>
              </td>
              <td className="py-2.5 px-3 text-right">{s.sessions}</td>
              <td className="py-2.5 px-3 text-right">{s.visitors}</td>
              <td className="py-2.5 px-3 text-right">{s.converted}</td>
              <td className="py-2.5 px-4 text-right text-muted-foreground">{fmtMs(s.avgDurationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Live now strip ────────────────────────────────────────────────────────────
function LiveNow() {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    try { const { data } = await api.get('/track/live', { params: { minutes: 5 } }); setData(data?.result || null); }
    catch { /* non-critical */ }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  if (!data) return null;
  return (
    <div className="flex items-center gap-4 bg-card border rounded-xl p-3 mb-4 flex-wrap">
      <span className="flex items-center gap-2 text-sm font-semibold"><Radio className="w-4 h-4 text-green-500 animate-pulse" /> Live now</span>
      <span className="text-sm text-muted-foreground">{data.active} active · {data.signedIn} member · {data.anonymous} anon</span>
      {(data.sessions || []).slice(0, 4).map((s) => s.nowPlaying ? (
        <span key={s.sessionId} className="text-xs px-2 py-1 rounded-lg bg-secondary/40 truncate max-w-[220px]">
          {s.display} → {s.nowPlaying}
        </span>
      ) : null)}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'songs', label: 'Songs', icon: Music },
  { key: 'videos', label: 'Videos', icon: Film },
  { key: 'traffic', label: 'Traffic', icon: Globe },
];

export default function MediaAnalytics() {
  const [tab, setTab] = useState('songs');
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-4">
      <LiveNow />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                tab === t.key ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border hover:bg-accent'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${days === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-accent'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">
            {tab === 'songs' ? 'Song listening' : tab === 'videos' ? 'Video viewing' : 'Traffic sources'} — last {days} days
          </p>
          <span className="text-xs text-muted-foreground ml-1">click a row to see who + their IP</span>
        </div>
        {tab === 'songs' && <MediaLeaderboard kind="song" days={days} />}
        {tab === 'videos' && <MediaLeaderboard kind="video" days={days} />}
        {tab === 'traffic' && <TrafficSources days={days} />}
      </div>
    </div>
  );
}
