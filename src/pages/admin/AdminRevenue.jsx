import React, { useState, useEffect } from 'react';
import { DollarSign, Repeat, ShoppingBag, Loader2, Users, Music, Film, Store, Smartphone, Heart } from 'lucide-react';
import api from '@/api/homieshub';
import { GlassPanel, StatTile, InfoTip } from '@/components/admin/glass';

const money = (cents) => `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const SOURCE_ICON = { 'Video purchases': Film, 'Song licenses': Music, 'Marketplace (our cut)': Store, 'In-app purchases': Smartphone, 'Fundraisers': Heart };

// Tiny bar chart for the daily revenue series (values in cents).
function RevBars({ series }) {
  if (!series?.length) return <div className="h-32 flex items-center justify-center text-white/30 text-sm">No revenue in this window.</div>;
  const max = Math.max(...series.map(d => d.cents || 0), 1);
  return (
    <div className="h-32 flex items-end gap-0.5">
      {series.map((d, i) => (
        <div key={i} className="flex-1 min-w-0 group relative flex flex-col justify-end h-full">
          <div className="bg-emerald-400 rounded-sm opacity-70 group-hover:opacity-100 transition-opacity" style={{ height: `${Math.max(2, Math.round(((d.cents || 0) / max) * 100))}%` }} />
          <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-black/90 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white z-10">
            {(d.date || '').slice(5)} · {money(d.cents)}
          </div>
        </div>
      ))}
    </div>
  );
}

const AdminRevenue = () => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/revenue', { params: { days } })
      .then(r => { if (!cancelled) setData(r.data?.result || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const winMax = Math.max(...((data?.window?.bySource || []).map(s => s.amountCents)), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Revenue</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Revenue</h1>
          <p className="text-white/50 mt-2 max-w-lg">What you're earning — recurring memberships plus one-off sales. Hover any ⓘ for what a number means.</p>
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${days === d ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-white/50 hover:bg-white/[0.06]'}`}>{d}d</button>
          ))}
        </div>
      </header>

      {/* headline tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile index={0} accent="emerald" icon={Repeat} label="Est. MRR" value={loading ? '' : money(data?.mrr?.totalCents)} loading={loading} sub="monthly recurring" info="Estimated Monthly Recurring Revenue from active memberships (tier counts × plan price). Exact billing lives in Stripe." />
        <StatTile index={1} accent="sky" icon={Users} label="Paying members" value={loading ? '' : (data?.mrr?.payingMembers ?? 0).toLocaleString()} loading={loading} sub="active + manual" info="Accounts with an active Stripe subscription OR an unexpired manual membership." />
        <StatTile index={2} accent="primary" icon={ShoppingBag} label={`One-off · ${days}d`} value={loading ? '' : money(data?.window?.oneOffCents)} loading={loading} sub="sales this window" info="One-time sales in this window: video purchases, song licenses, marketplace (our cut) and in-app purchases." />
        <StatTile index={3} accent="fuchsia" icon={DollarSign} label="One-off · all-time" value={loading ? '' : money(data?.allTime?.oneOffCents)} loading={loading} sub="lifetime sales" info="All one-time sales ever recorded (excludes recurring memberships)." />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* by source (window) */}
        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <p className="text-sm font-semibold">One-off revenue by source · {days}d</p>
            <InfoTip text="Marketplace shows OUR platform cut, not gross sales. Everything else is the full amount." />
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
            : (data?.window?.bySource || []).every(s => !s.amountCents) ? <p className="text-white/40 text-sm py-10 text-center">No sales in this window.</p> : (
            <div className="space-y-3">
              {(data?.window?.bySource || []).map((s) => {
                const Icon = SOURCE_ICON[s.source] || DollarSign;
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-white/80"><Icon className="w-4 h-4 text-white/50" />{s.source}</span>
                      <span className="font-semibold">{money(s.amountCents)} <span className="text-white/40 text-xs">· {s.count}</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((s.amountCents / winMax) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>

        {/* MRR by tier */}
        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <p className="text-sm font-semibold">Memberships by tier</p>
            <InfoTip text="Active subscriptions per plan and the recurring revenue each contributes (estimated from plan price)." />
          </div>
          {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
            : (data?.mrr?.byTier || []).length === 0 ? <p className="text-white/40 text-sm py-10 text-center">No active subscriptions.</p> : (
            <div className="space-y-2">
              {(data?.mrr?.byTier || []).map((t) => (
                <div key={t.tier} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="font-semibold capitalize">{t.tier}</p>
                    <p className="text-xs text-white/45">{t.count} × {money(t.priceCents)}/mo</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{money(t.mrrCents)}</p>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* revenue over time */}
      <GlassPanel className="p-5">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-3">One-off revenue per day · {days}d</p>
        {loading ? <div className="h-32 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div> : <RevBars series={data?.series || []} />}
      </GlassPanel>

      {/* recent transactions */}
      <GlassPanel className="overflow-hidden">
        <p className="text-sm font-semibold px-4 py-3 border-b border-white/10">Recent transactions</p>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
          : (data?.recent || []).length === 0 ? <p className="text-center text-white/40 py-12 text-sm">No transactions yet.</p> : (
          <div className="divide-y divide-white/[0.06]">
            {(data?.recent || []).map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/[0.06] text-white/60 w-14 text-center flex-shrink-0">{t.source}</span>
                <span className="flex-1 truncate">{t.label}</span>
                <span className="text-white/40 text-xs flex-shrink-0 hidden sm:block">{fmtTime(t.ts)}</span>
                <span className="font-semibold text-emerald-400 flex-shrink-0 w-20 text-right">{money(t.amountCents)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default AdminRevenue;
