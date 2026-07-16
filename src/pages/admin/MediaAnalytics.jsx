import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, BarChart3, Music, Film, Globe, Headphones, Clock, Eye,
  User as UserIcon, Radio, Users, UserCheck, PlayCircle, Timer, Download,
  Bell, Ban, Activity, ChevronRight, MapPin, Link2, MessageSquare, Star,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';
import { GlassPanel, StatTile, MetricPill } from '@/components/admin/glass';

// ── formatters ────────────────────────────────────────────────────────────────
const fmtMs = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const fmtN = (n) => Number(n || 0).toLocaleString();

// ── CSV export (client-side) ──────────────────────────────────────────────────
function toCsv(rows) {
  return rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}
function downloadCsv(filename, header, dataRows) {
  const blob = new Blob([toCsv([header, ...dataRows])], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}
const CsvButton = ({ onClick }) => (
  <button onClick={onClick} className="ml-auto flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1 transition-colors">
    <Download className="w-3.5 h-3.5" /> Export CSV
  </button>
);

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
                <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg border border-white/10 bg-white/[0.03]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${l.authed ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                    {l.authed ? <UserIcon className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4 text-white/40" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{l.authed ? `@${l.username || 'member'}` : 'Anonymous'}</span>
                      <span className="font-mono text-xs text-white/40">{l.ip}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/45 mt-0.5 flex-wrap">
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

  // Interactive headline stats for the window.
  const summary = useMemo(() => rows.reduce((a, r) => ({
    plays: a.plays + (r[primaryCount] || 0),
    audience: Math.max(a.audience, 0) + (r[audienceCount] || 0),
    time: a.time + (r[totalTimeKey] || 0),
    items: a.items + 1,
  }), { plays: 0, audience: 0, time: 0, items: 0 }), [rows, primaryCount, audienceCount, totalTimeKey]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile index={0} accent="primary" icon={kind === 'video' ? Film : Music}
          label={kind === 'video' ? 'Videos played' : 'Songs played'} value={loading ? '' : fmtN(summary.items)} loading={loading} sub={`in the last ${days} days`} />
        <StatTile index={1} accent="sky" icon={PlayCircle}
          label={kind === 'video' ? 'Total views' : 'Total plays'} value={loading ? '' : fmtN(summary.plays)} loading={loading} sub="across all items" />
        <StatTile index={2} accent="emerald" icon={Users}
          label={kind === 'video' ? 'Viewers' : 'Listeners'} value={loading ? '' : fmtN(summary.audience)} loading={loading} sub="reach (may double-count)" />
        <StatTile index={3} accent="fuchsia" icon={Timer}
          label={kind === 'video' ? 'Watch time' : 'Listen time'} value={loading ? '' : fmtMs(summary.time)} loading={loading} sub="total time" />
      </div>

      <GlassPanel className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">{kind === 'video' ? 'Top videos' : 'Top songs'} · last {days} days</p>
          <span className="text-xs text-white/40 ml-1 hidden sm:inline">click a row to see who + their IP</span>
          {rows.length > 0 && <CsvButton onClick={() => {
            const header = kind === 'video'
              ? ['Rank', 'Video', 'Kind', 'Views', 'Viewers', 'Members', 'Watch time (s)', 'Avg watch (s)', 'Last watched', 'ID']
              : ['Rank', 'Song', 'Plays', 'Listeners', 'Members', 'Listen time (s)', 'Avg listen (s)', 'Playlist adds', 'Last played', 'ID'];
            const dataRows = rows.map((s, i) => kind === 'video'
              ? [i + 1, s.title || '', s.kind || 'video', s.views, s.viewers, s.members || 0, Math.round((s.watchMs || 0) / 1000), Math.round((s.avgWatchMs || 0) / 1000), fmtTime(s.lastWatched), s._id]
              : [i + 1, s.title || '', s.plays, s.listeners, s.members || 0, Math.round((s.listenMs || 0) / 1000), Math.round((s.avgListenMs || 0) / 1000), s.playlistAdds || 0, fmtTime(s.lastPlayed), s._id]);
            downloadCsv(`${kind === 'video' ? 'videos' : 'songs'}-${days}d.csv`, header, dataRows);
          }} />}
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-white/40 py-16 text-sm">No {kind === 'video' ? 'views' : 'plays'} recorded in this window yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-white/40 border-b border-white/10">
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
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.04] cursor-pointer">
                    <td className="py-2.5 px-4 text-white/40">{i + 1}</td>
                    <td className="py-2.5 px-2 font-medium max-w-[260px] truncate">
                      {s.title || <span className="text-white/40 font-mono text-xs">{s._id}</span>}
                      {kind === 'video' && s.kind === 'reel' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">reel</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right">{s[primaryCount]}</td>
                    <td className="py-2.5 px-3 text-right">
                      {s[audienceCount]}{s.members > 0 && <span className="text-white/40 text-xs"> ({s.members} member)</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-white/50">{fmtMs(s[totalTimeKey])}</td>
                    <td className="py-2.5 px-4 text-right text-white/50">{fmtMs(s[avgTimeKey])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
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

  const summary = useMemo(() => data.sources.reduce((a, s) => ({
    sessions: a.sessions + (s.sessions || 0),
    visitors: a.visitors + (s.visitors || 0),
    converted: a.converted + (s.converted || 0),
  }), { sessions: 0, visitors: 0, converted: 0 }), [data.sources]);

  const max = Math.max(...data.sources.map(s => s.sessions), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile index={0} accent="primary" icon={Globe} label="Sources" value={loading ? '' : fmtN(data.sources.length)} loading={loading} sub={`in the last ${days} days`} />
        <StatTile index={1} accent="sky" icon={Radio} label="Sessions" value={loading ? '' : fmtN(summary.sessions)} loading={loading} sub="total visits" />
        <StatTile index={2} accent="emerald" icon={Users} label="Visitors" value={loading ? '' : fmtN(summary.visitors)} loading={loading} sub="unique by IP" />
        <StatTile index={3} accent="fuchsia" icon={UserCheck} label="Signed up" value={loading ? '' : fmtN(summary.converted)} loading={loading} sub="converted to member" />
      </div>

      <GlassPanel className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <Globe className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Where visitors come from · last {days} days</p>
          {data.sources.length > 0 && <CsvButton onClick={() => downloadCsv(
            `traffic-${days}d.csv`,
            ['Source', 'Sessions', 'Visitors', 'Signed up', 'Avg time (s)'],
            data.sources.map(s => [s.source, s.sessions, s.visitors, s.converted, Math.round((s.avgDurationMs || 0) / 1000)]),
          )} />}
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
        ) : !data.sources.length ? (
          <p className="text-center text-white/40 py-16 text-sm">No traffic recorded in this window yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-white/40 border-b border-white/10">
                  <th className="text-left font-semibold py-2.5 px-4">Source</th>
                  <th className="text-right font-semibold py-2.5 px-3">Sessions</th>
                  <th className="text-right font-semibold py-2.5 px-3">Visitors</th>
                  <th className="text-right font-semibold py-2.5 px-3">Signed up</th>
                  <th className="text-right font-semibold py-2.5 px-4">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.source} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-2.5 px-4">
                      <span className="font-medium truncate max-w-[200px] inline-block align-middle">{s.source}</span>
                      <div className="h-1.5 mt-1.5 rounded-full bg-white/10 overflow-hidden max-w-[220px]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((s.sessions / max) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">{s.sessions}</td>
                    <td className="py-2.5 px-3 text-right">{s.visitors}</td>
                    <td className="py-2.5 px-3 text-right">{s.converted}</td>
                    <td className="py-2.5 px-4 text-right text-white/50">{fmtMs(s.avgDurationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
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
    <GlassPanel className="flex items-center gap-4 p-3 flex-wrap">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        Live now
      </span>
      <span className="text-sm text-white/50">{data.active} active · {data.signedIn} member · {data.anonymous} anon</span>
      {(data.sessions || []).slice(0, 4).map((s) => s.nowPlaying ? (
        <span key={s.sessionId} className="text-xs px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 truncate max-w-[220px]">
          {s.display} → {s.nowPlaying}
        </span>
      ) : null)}
    </GlassPanel>
  );
}

// ── One visitor's analytics profile (account OR anonymous-by-IP) ──────────────
const EVENT_LABEL = {
  music_play: 'Played', music_listen: 'Listened', video_watch: 'Watched', reel_watch: 'Watched reel',
  video_save: 'Saved', playlist_add: 'Added to playlist', pageview: 'Viewed page', session_start: 'Started session', app_active: 'Opened app',
};

function AudienceProfileDialog({ visitor, isOpen, onOpenChange }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [watched, setWatched] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [sending, setSending] = useState(false);

  const vType = visitor?.authed ? 'user' : 'anon';
  const vId = visitor?.authed ? visitor?.userSub : visitor?.ip;
  const vLabel = visitor?.authed ? `@${visitor?.username || 'member'}` : (visitor?.ip || 'visitor');

  useEffect(() => {
    if (!isOpen || !visitor) return;
    let cancelled = false;
    setMsg(''); setPushTitle('');
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/track/audience/profile', { params: { type: vType, id: vId, days: 90 } });
        if (!cancelled) { setData(res.data?.result || null); setWatched(!!res.data?.result?.watched); }
      } catch { if (!cancelled) toast({ title: 'Failed to load profile', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isOpen, visitor, vType, vId, toast]);

  const toggleWatch = async () => {
    setWatchBusy(true);
    try {
      if (watched) {
        await api.delete('/track/audience/watch', { params: { type: vType, id: vId } });
        setWatched(false); toast({ title: 'Stopped watching' });
      } else {
        await api.post('/track/audience/watch', { type: vType, id: vId, label: vLabel });
        setWatched(true); toast({ title: "You'll be pinged when they return" });
      }
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
    finally { setWatchBusy(false); }
  };

  const sendDM = async () => {
    if (!msg.trim() || !visitor?.username) return;
    setSending(true);
    try {
      await api.post('/messages/send', { recipientUsername: visitor.username, content: msg.trim() });
      toast({ title: `Message sent to @${visitor.username}` }); setMsg('');
    } catch (e) { toast({ title: 'Failed to send', description: e.response?.data?.message, variant: 'destructive' }); }
    finally { setSending(false); }
  };

  const sendPush = async () => {
    if (!msg.trim() || !visitor?.username) return;
    setSending(true);
    try {
      const { data } = await api.post('/admin/push/send', { title: pushTitle.trim() || 'The Homies', body: msg.trim(), usernames: [visitor.username] });
      toast({ title: data?.message || 'Push sent' });
    } catch (e) { toast({ title: 'Push failed', description: e.response?.data?.message, variant: 'destructive' }); }
    finally { setSending(false); }
  };

  const idn = data?.identity;
  const t = data?.totals;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center ${visitor?.authed ? 'bg-emerald-500/15' : 'bg-white/10'}`}>
              {visitor?.authed ? <UserIcon className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4 text-white/60" />}
            </span>
            <span className="truncate">{visitor?.authed ? `@${visitor.username || 'member'}` : 'Anonymous visitor'}</span>
            {idn?.isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 flex items-center gap-1"><Ban className="w-3 h-3" />banned</span>}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 flex-wrap">
            {idn?.ip && <span className="font-mono flex items-center gap-1"><MapPin className="w-3 h-3" />{idn.ip}</span>}
            {idn?.source && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{idn.source}</span>}
            {idn?.lastSeen && <span>last seen {fmtTime(idn.lastSeen)}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-1 px-1 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
          ) : !data ? (
            <p className="text-center text-sm text-white/40 py-10">No data.</p>
          ) : (
            <>
              {/* stat pills */}
              <div className="flex flex-wrap gap-2">
                <MetricPill label="plays" value={fmtN(t.plays)} accent="primary" />
                <MetricPill label="listen" value={fmtMs(t.listenMs)} accent="fuchsia" />
                <MetricPill label="views" value={fmtN(t.views)} accent="sky" />
                <MetricPill label="time in app" value={fmtMs(t.activeMs)} accent="emerald" />
              </div>

              {/* Re-engage: watch toggle + (members) message/push composer */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold flex items-center gap-1.5"><Bell className="w-4 h-4 text-primary" /> Re-engage</span>
                  <button onClick={toggleWatch} disabled={watchBusy}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${watched ? 'bg-primary/15 text-primary border-primary/30' : 'border-white/15 text-white/70 hover:bg-white/10'}`}>
                    {watchBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (watched ? <Star className="w-3.5 h-3.5 fill-current" /> : <Bell className="w-3.5 h-3.5" />)}
                    {watched ? 'Watching — notify on return' : 'Notify me when they return'}
                  </button>
                </div>
                {data.canPush ? (
                  <div className="space-y-2">
                    <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Push title (optional)"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-9 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25" />
                    <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder={`Message @${visitor.username || 'member'}…`}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={sendDM} disabled={sending || !msg.trim()}
                        className="flex-1 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Send message
                      </button>
                      <button onClick={sendPush} disabled={sending || !msg.trim()}
                        className="flex-1 h-9 rounded-lg bg-primary text-black text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Send push
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/50">Anonymous — can't push a browser directly. With <span className="text-white/70">notify on return</span> on, you'll get a Telegram ping the moment this IP is back so you can catch them live. (Also auto-flagged if the IP matches a dormant account.)</p>
                )}
              </div>

              {/* linked accounts */}
              {(idn?.linkedAccounts?.length > 0 || idn?.ips?.length > 1) && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1"><Link2 className="w-3 h-3" /> Linked</p>
                  {idn.linkedAccounts?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {idn.linkedAccounts.map((a) => (
                        <span key={a._id} className="text-xs px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10">@{a.username}{a.isBanned ? ' (banned)' : ''}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {idn.ips.map((ip) => <span key={ip} className="text-xs font-mono px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10">{ip}</span>)}
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                {/* songs */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1"><Music className="w-3 h-3" /> Songs they play</p>
                  {data.songs.length === 0 ? <p className="text-sm text-white/40 py-2">No plays yet.</p> : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {data.songs.map((s) => (
                        <div key={s._id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate">{s.title || <span className="font-mono text-xs text-white/40">{s._id}</span>}</span>
                          <span className="text-xs text-white/45 flex-shrink-0">{s.plays}× · {fmtMs(s.listenMs)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* videos */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1"><Film className="w-3 h-3" /> Videos they watch</p>
                  {data.videos.length === 0 ? <p className="text-sm text-white/40 py-2">No views yet.</p> : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {data.videos.map((v) => (
                        <div key={v._id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate">{v.title || <span className="font-mono text-xs text-white/40">{v._id}</span>}{v.kind === 'reel' && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-primary/15 text-primary">reel</span>}</span>
                          <span className="text-xs text-white/45 flex-shrink-0">{v.views}× · {fmtMs(v.watchMs)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* timeline */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> Recent activity</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {data.timeline.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                      <span className="text-white/40 w-24 flex-shrink-0">{fmtTime(e.ts)}</span>
                      <span className="text-white/80 flex-shrink-0">{EVENT_LABEL[e.type] || e.type}</span>
                      <span className="truncate">{e.target?.title || e.path || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Audience list (mode: 'recent' | 'superfans') ──────────────────────────────
function Audience({ days, mode = 'recent' }) {
  const { toast } = useToast();
  const superfans = mode === 'superfans';
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState([]);
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/track/audience', { params: { days, sort: superfans ? 'engagement' : 'recent' } });
        if (!cancelled) setVisitors(data?.result?.visitors || []);
      } catch { if (!cancelled) toast({ title: 'Failed to load audience', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [days, superfans, toast]);

  const filtered = q.trim()
    ? visitors.filter((v) => `${v.username || ''} ${v.ip || ''}`.toLowerCase().includes(q.toLowerCase()))
    : visitors;

  const members = visitors.filter((v) => v.authed).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile index={0} accent="primary" icon={Users} label="Visitors" value={loading ? '' : fmtN(visitors.length)} loading={loading} sub={`in the last ${days} days`} />
        <StatTile index={1} accent="emerald" icon={UserCheck} label="Members" value={loading ? '' : fmtN(members)} loading={loading} sub="signed-in accounts" />
        <StatTile index={2} accent="sky" icon={Globe} label="Anonymous" value={loading ? '' : fmtN(visitors.length - members)} loading={loading} sub="by IP" />
        <StatTile index={3} accent="fuchsia" icon={PlayCircle} label="Total plays" value={loading ? '' : fmtN(visitors.reduce((a, v) => a + (v.plays || 0), 0))} loading={loading} sub="across everyone" />
      </div>

      <GlassPanel className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          {superfans ? <Star className="w-4 h-4 text-primary fill-current" /> : <Users className="w-4 h-4 text-primary" />}
          <p className="text-sm font-semibold">{superfans ? 'Superfans · most listening' : 'Audience'} · last {days} days</p>
          <span className="text-xs text-white/40 ml-1 hidden sm:inline">click anyone to see their profile</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or IP…"
            className="ml-auto bg-white/[0.04] border border-white/10 rounded-lg h-8 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 w-44" />
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/40 py-16 text-sm">No visitors in this window yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((v, i) => (
              <button key={v.key} onClick={() => { setTarget(v); setOpen(true); }}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors">
                {superfans && <span className={`w-6 text-center text-sm font-bold flex-shrink-0 ${i < 3 ? 'text-primary' : 'text-white/40'}`}>{i + 1}</span>}
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${v.authed ? 'bg-emerald-500/15' : 'bg-white/[0.06]'}`}>
                  {v.authed ? <UserIcon className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4 text-white/50" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{v.authed ? `@${v.username || 'member'}` : 'Anonymous'}</span>
                    <span className="font-mono text-xs text-white/40">{v.ip}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/45 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{v.plays} plays</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.views} views</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtMs(v.listenMs)}</span>
                    <span>last seen {fmtTime(v.lastSeen)}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </GlassPanel>

      <AudienceProfileDialog visitor={target} isOpen={open} onOpenChange={(o) => { setOpen(o); if (!o) setTarget(null); }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'audience', label: 'Listeners', icon: Users },
  { key: 'superfans', label: 'Superfans', icon: Star },
  { key: 'songs', label: 'Songs', icon: Music },
  { key: 'videos', label: 'Videos', icon: Film },
  { key: 'traffic', label: 'Traffic', icon: Globe },
];

export default function MediaAnalytics() {
  const [tab, setTab] = useState('audience');
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-4">
      <LiveNow />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                tab === t.key ? 'bg-primary/15 text-primary border-primary/30' : 'text-white/50 border-white/10 hover:bg-white/[0.06]'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${days === d ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-white/50 hover:bg-white/[0.06]'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {tab === 'audience' && <Audience days={days} mode="recent" />}
      {tab === 'superfans' && <Audience days={days} mode="superfans" />}
      {tab === 'songs' && <MediaLeaderboard kind="song" days={days} />}
      {tab === 'videos' && <MediaLeaderboard kind="video" days={days} />}
      {tab === 'traffic' && <TrafficSources days={days} />}
    </div>
  );
}
