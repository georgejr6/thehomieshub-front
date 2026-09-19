import React, { useState, useEffect } from 'react';
import {
  Activity, Heart, MessageSquare, UserPlus, Share2, Search, Clock, Loader2, Info,
} from 'lucide-react';
import api from '@/api/homieshub';
import { GlassPanel, StatTile, InfoTip } from '@/components/admin/glass';

const fmtN = (n) => Number(n || 0).toLocaleString();
const fmtMs = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const ACTION_META = {
  like:     { label: 'Likes',     icon: Heart,        accent: 'rose' },
  unlike:   { label: 'Unlikes',   icon: Heart,        accent: 'rose' },
  comment:  { label: 'Comments',  icon: MessageSquare, accent: 'sky' },
  follow:   { label: 'Follows',   icon: UserPlus,      accent: 'emerald' },
  unfollow: { label: 'Unfollows', icon: UserPlus,      accent: 'amber' },
  share:    { label: 'Shares',    icon: Share2,        accent: 'fuchsia' },
  search:   { label: 'Searches',  icon: Search,        accent: 'primary' },
};

function ActionBars({ byAction }) {
  if (!byAction?.length) return <p className="text-white/40 text-sm py-10 text-center">No engagement events in this window yet.</p>;
  const max = Math.max(...byAction.map(a => a.count), 1);
  return (
    <div className="space-y-3">
      {byAction.map((a) => {
        const meta = ACTION_META[a.action] || { label: a.action, icon: Activity, accent: 'primary' };
        const Icon = meta.icon;
        return (
          <div key={a.action}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2 text-white/80"><Icon className="w-4 h-4 text-white/50" />{meta.label}</span>
              <span className="font-semibold">{fmtN(a.count)} <span className="text-white/40 text-xs">· {fmtN(a.uniqueUsers)} people</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((a.count / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const AdminEngagement = () => {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState(null);
  const [pages, setPages] = useState(null);
  const [shares, setShares] = useState(null);
  const [searches, setSearches] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get('/track/engagement', { params: { days } }).then(r => r.data?.result).catch(() => null),
      api.get('/track/pages',      { params: { days } }).then(r => r.data?.result).catch(() => null),
      api.get('/track/shares',     { params: { days } }).then(r => r.data?.result).catch(() => null),
      api.get('/track/searches',   { params: { days } }).then(r => r.data?.result).catch(() => null),
    ]).then(([e, p, s, q]) => {
      if (cancelled) return;
      setEngagement(e); setPages(p); setShares(s); setSearches(q);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const countFor = (action) => engagement?.byAction?.find(a => a.action === action)?.count ?? 0;
  const usersFor = (action) => engagement?.byAction?.find(a => a.action === action)?.uniqueUsers ?? 0;
  const maxShare = Math.max(...(shares?.bySurface || []).map(s => s.count), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Engagement</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Engagement</h1>
          <p className="text-white/50 mt-2 max-w-2xl">
            Every like, comment, follow, share and search, plus real time-on-page. This is <strong>not cookie-based</strong> —
            it's a first-party log tied to your own session ID (localStorage) and, when signed in, your account. No third-party
            trackers, no cross-site cookies. For WHICH person did WHAT and their IP/location, open a visitor's profile from{' '}
            <span className="text-primary">Analytics → Listeners</span> — the full action timeline is there.
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${days === d ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-white/50 hover:bg-white/[0.06]'}`}>{d}d</button>
          ))}
        </div>
      </header>

      {/* headline tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile index={0} accent="rose" icon={Heart} label="Likes" value={loading ? '' : fmtN(countFor('like'))} loading={loading} sub={`${fmtN(usersFor('like'))} people`} />
        <StatTile index={1} accent="sky" icon={MessageSquare} label="Comments" value={loading ? '' : fmtN(countFor('comment'))} loading={loading} sub={`${fmtN(usersFor('comment'))} people`} />
        <StatTile index={2} accent="fuchsia" icon={Share2} label="Shares" value={loading ? '' : fmtN(countFor('share'))} loading={loading} sub={`${fmtN(usersFor('share'))} people`} />
        <StatTile index={3} accent="primary" icon={Search} label="Searches" value={loading ? '' : fmtN(countFor('search'))} loading={loading} sub={searches ? `${fmtN(searches.totalZeroResult)} came back empty` : ''} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* action breakdown */}
        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <p className="text-sm font-semibold">All actions · {days}d</p>
            <InfoTip text="Every like/unlike, comment, follow/unfollow, share and search, with how many distinct people (accounts or anon IPs) did it." />
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
            : <ActionBars byAction={engagement?.byAction} />}
        </GlassPanel>

        {/* share surfaces */}
        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <p className="text-sm font-semibold">How people share · {days}d</p>
            <InfoTip text="Which share path they used: the OS native share sheet, copying the link, or a specific platform button (Instagram, X, WhatsApp, etc.)." />
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
            : !shares?.bySurface?.length ? <p className="text-white/40 text-sm py-10 text-center">No shares in this window.</p> : (
            <div className="space-y-3">
              {shares.bySurface.map((s) => (
                <div key={s.surface}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-white/80">{s.surface.replace(/_/g, ' ')}</span>
                    <span className="font-semibold">{fmtN(s.count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-fuchsia-400 rounded-full" style={{ width: `${Math.round((s.count / maxShare) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* top pages / dwell time */}
      <GlassPanel className="overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
          <Clock className="w-4 h-4 text-white/50" />
          <p className="text-sm font-semibold">Top pages by time spent · {days}d</p>
          <InfoTip text="Every route, including a specific /watch/:id or /profile/:username page, ranked by views. Avg time is real time-on-page (closed out on navigation, tab-hide, or unload)." />
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
          : !pages?.pages?.length ? <p className="text-center text-white/40 py-12 text-sm">No pageviews in this window.</p> : (
          <div className="divide-y divide-white/[0.06] max-h-[420px] overflow-y-auto">
            {pages.pages.map((p) => (
              <div key={p.path} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 truncate font-mono text-xs text-white/70">{p.path}</span>
                <span className="text-white/40 text-xs flex-shrink-0 w-24 text-right">{fmtN(p.views)} views</span>
                <span className="text-white/40 text-xs flex-shrink-0 w-24 text-right">{fmtN(p.visitors)} visitors</span>
                <span className="font-semibold text-primary flex-shrink-0 w-20 text-right">{fmtMs(p.avgDurationMs)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* top shared content */}
        <GlassPanel className="overflow-hidden">
          <p className="text-sm font-semibold px-4 py-3 border-b border-white/10">Most shared content · {days}d</p>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            : !shares?.topContent?.length ? <p className="text-center text-white/40 py-12 text-sm">Nothing shared yet.</p> : (
            <div className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto">
              {shares.topContent.map((c) => (
                <div key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/[0.06] text-white/60 flex-shrink-0">{c.kind || '—'}</span>
                  <span className="flex-1 truncate">{c.title || <span className="font-mono text-xs text-white/40">{c.id}</span>}</span>
                  <span className="font-semibold flex-shrink-0">{fmtN(c.shares)}×</span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* search queries */}
        <GlassPanel className="overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
            <p className="text-sm font-semibold">Search queries · {days}d</p>
            <InfoTip text="What people typed, how many results came back on average, and how many times it came back with zero results -- a direct content-gap signal." />
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            : !searches?.queries?.length ? <p className="text-center text-white/40 py-12 text-sm">No searches yet.</p> : (
            <div className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto">
              {searches.queries.map((q) => (
                <div key={q.query} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="flex-1 truncate">"{q.query}"</span>
                  {q.zeroResults > 0 && <span className="text-[10px] font-bold uppercase text-rose-400 flex-shrink-0">{q.zeroResults} empty</span>}
                  <span className="font-semibold flex-shrink-0 w-10 text-right">{fmtN(q.count)}×</span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      <div className="flex items-start gap-2 text-xs text-white/40 px-1">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>
          Traffic source (Google/Instagram/YouTube/Direct/…) and platform (web vs iOS app vs Android app) already live under{' '}
          <span className="text-white/60">Analytics → Traffic</span> — not duplicated here to avoid two places drifting out of sync.
        </p>
      </div>
    </div>
  );
};

export default AdminEngagement;
