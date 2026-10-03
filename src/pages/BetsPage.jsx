import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Gavel, Loader2, Plus, Trophy } from 'lucide-react';
import { fetchPools, judgesLine, phaseLabel, poolPhase, usdFromMicro } from '@/lib/pools/api';
import { cn } from '@/lib/utils';

// thehomies.app/bets — every live (and recently finished) pool.
export default function BetsPage() {
  const [pools, setPools] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => fetchPools()
      .then((p) => { if (alive) { setPools(p); setError(''); } })
      .catch((err) => { if (alive) setError(err?.response?.status === 503 ? 'Pools open soon. Check back shortly.' : 'Couldn’t load pools.'); });
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const visible = (pools || []).filter((p) => !['proposed', 'rejected'].includes(p.status));
  const open = visible.filter((p) => poolPhase(p) === 'open');
  const rest = visible.filter((p) => poolPhase(p) !== 'open');

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6 sm:pt-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff8099]">
            <Trophy className="h-3.5 w-3.5" /> Homies pools
          </div>
          <h1 className="mt-3 font-black uppercase leading-[0.95] tracking-tight" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 'clamp(2.4rem, 9vw, 3.6rem)' }}>
            Make the call
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
            Pick the result. Winners split the pot. The money sits in a public contract, neutral judges confirm the result, and payouts land in your wallet automatically.
          </p>
          <Link to="/bets/new" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/85 hover:bg-white/10">
            <Plus className="h-4 w-4" /> Propose a pool
          </Link>
        </div>

        {!pools && !error && <div className="mt-10 flex justify-center text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {error && <p className="mt-8 text-center text-sm text-[#ffb3c1]">{error}</p>}
        {pools && visible.length === 0 && <p className="mt-10 text-center text-white/50">No pools yet. Check back soon.</p>}

        {open.length > 0 && <Section title="Open now" pools={open} />}
        {rest.length > 0 && <Section title="Finished" pools={rest} />}
      </div>
    </div>
  );
}

function Section({ title, pools }) {
  return (
    <div className="mt-10">
      <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">{title}</h2>
      <div className="mt-3 space-y-3">
        {pools.map((p) => <PoolCard key={p.id} pool={p} />)}
      </div>
    </div>
  );
}

function PoolCard({ pool }) {
  const phase = poolPhase(pool);
  const lead = pool.total ? pool.totals.indexOf(Math.max(...pool.totals)) : -1;
  return (
    <Link to={`/bets/${pool.id}`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{pool.title}</div>
          <div className="mt-0.5 text-xs text-white/50">
            {pool.outcomes.length} outcomes · {usdFromMicro(pool.total)} in the pot
            {lead >= 0 && phase === 'open' ? ` · most on “${pool.outcomes[lead]}”` : ''}
          </div>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-white/40" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className={cn('font-semibold uppercase tracking-wider', phase === 'open' ? 'text-emerald-400' : 'text-[#ff8099]')}>{phaseLabel(phase)}</span>
        {pool.closeAt && phase === 'open' && <span className="text-white/50">Closes {pool.closeAt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
        <span className="inline-flex items-center gap-1 text-white/45"><Gavel className="h-3.5 w-3.5" /> {judgesLine(pool)}</span>
      </div>
    </Link>
  );
}
