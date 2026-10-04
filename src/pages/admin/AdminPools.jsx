import React, { useCallback, useEffect, useState } from 'react';
import algosdk from 'algosdk';
import { Check, ExternalLink, Gavel, Loader2, Lock, RefreshCw, TimerOff, Trophy, Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { GlassPanel, SectionTitle } from '@/components/admin/glass';
import {
  ENV_APP_ID, apiError, approveProposal, closePoolNow, fetchPools, fetchProposals, phaseLabel, poolPhase, rejectProposal,
  updateFeeReceiver, updateSigners, usdFromMicro,
} from '@/lib/pools/api';
import { explorerAccount, explorerApp, readHouse } from '@/lib/pools/chain';
import { judgeProblems } from '@/lib/pools/judges';
import ConfirmDialog from '@/components/onchain/ConfirmDialog';

// /admin/pools — review proposed pools (approve = the house key creates the pool
// on-chain with the judges picked here; proposers don't pick judges), and manage
// live pools: judges and the wallet that receives the 10% fee (both only until
// the first bet), and "Close betting now" (close_now).

const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const fmt = (d) => (d ? d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

export default function AdminPools() {
  const { toast } = useToast();
  const [proposals, setProposals] = useState(null);
  const [pools, setPools] = useState(null);
  const [error, setError] = useState('');
  const [house, setHouse] = useState(null);

  const load = useCallback(async () => {
    setError('');
    const [pr, pl] = await Promise.allSettled([fetchProposals(), fetchPools()]);
    if (pr.status === 'fulfilled') setProposals(pr.value); else { setProposals([]); setError(apiError(pr.reason, 'Could not load proposals')); }
    if (pl.status === 'fulfilled') setPools(pl.value.filter((p) => !['proposed', 'rejected'].includes(p.status))); else setPools([]);
  }, []);
  useEffect(() => { load(); }, [load]);
  // House wallet (contract global state) so judges can't be set to it.
  const appId = ENV_APP_ID || pools?.find((p) => p.appId)?.appId || proposals?.find((p) => p.appId)?.appId;
  useEffect(() => { if (appId) readHouse(appId).then(setHouse); }, [appId]);

  const done = (title) => { toast({ title }); load(); };
  const fail = (err) => toast({ title: 'Failed', description: apiError(err), variant: 'destructive' });

  return (
    <div className="space-y-8">
      <SectionTitle
        sub="Approving creates the pool on Algorand with the house key and the judges you pick. Judges and the fee wallet can be changed only until the first bet."
        right={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh</Button>}
      >
        Pools
      </SectionTitle>
      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Proposals</h3>
        {!proposals ? <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          : proposals.length === 0 ? <p className="text-sm text-white/50">No proposals waiting.</p>
            : <div className="space-y-4">{proposals.map((p) => <PoolAdminCard key={p.id} pool={p} proposal house={house} onDone={done} onFail={fail} />)}</div>}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">On-chain pools</h3>
        {!pools ? <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          : pools.length === 0 ? <p className="text-sm text-white/50">None yet.</p>
            : <div className="space-y-4">{pools.map((p) => <PoolAdminCard key={p.id} pool={p} house={house} onDone={done} onFail={fail} />)}</div>}
      </div>
    </div>
  );
}

function PoolAdminCard({ pool, proposal = false, house = null, onDone, onFail }) {
  const phase = poolPhase(pool);
  const [busy, setBusy] = useState('');
  const [editJudges, setEditJudges] = useState(false);
  const [judges, setJudges] = useState(pool.signers.length ? pool.signers : [{ address: '', name: '' }]);
  const [threshold, setThreshold] = useState(pool.threshold || 1);
  const [feeWallet, setFeeWallet] = useState(pool.feeReceiver || '');
  const [reason, setReason] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  const hasBets = pool.signersLocked || pool.total > 0;
  const judgesLocked = !proposal && (hasBets || phase !== 'open');
  const feeLocked = !proposal && (pool.feeReceiverLocked || pool.total > 0 || phase !== 'open');
  const validAddr = (a) => algosdk.isValidAddress(a || '');
  const problems = judgeProblems(judges, threshold, { house, feeWallet: feeWallet || pool.feeReceiver || '' });
  const judgesValid = problems.length === 0;
  const feeIsJudge = !!feeWallet && pool.signers.some((s) => s.address === feeWallet);
  const cleanJudges = () => judges.map((j) => ({ address: j.address.trim(), name: j.name.trim() }));

  const run = async (key, fn, msg) => {
    setBusy(key);
    try { await fn(); onDone(msg); return true; } catch (err) { onFail(err); return false; } finally { setBusy(''); }
  };

  return (
    <GlassPanel className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold">{pool.title}</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wider text-white/60">{proposal ? 'proposed' : phaseLabel(phase)}</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wider text-white/40">{pool.kind}</span>
          </div>
          {pool.description && <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-white/60">{pool.description}</p>}
          {pool.rejectReason && <p className="mt-1 text-xs text-rose-400">Rejected: {pool.rejectReason}</p>}
          <div className="mt-2 text-xs text-white/50">
            Outcomes: {pool.outcomes.join(' · ')}
          </div>
          <div className="mt-1 text-xs text-white/50">
            Closes {fmt(pool.closeAt)} · judging deadline {fmt(pool.resolveBy)}
            {pool.proposer && ` · proposed by @${pool.proposer.username || pool.proposer}`}
          </div>
          {!proposal && (
            <div className="mt-1 text-xs text-white/50">
              Pot {usdFromMicro(pool.total)} · fee {usdFromMicro(pool.fee)}
              {pool.onChainId != null && ` · pool #${pool.onChainId}`}
              {pool.appId && <> · <a href={explorerApp(pool.appId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">contract <ExternalLink className="h-3 w-3" /></a></>}
            </div>
          )}
        </div>
        {proposal && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={!!busy || !judgesValid || (feeWallet && !validAddr(feeWallet))}
              onClick={() => run('approve', () => approveProposal(pool.id, {
                signers: cleanJudges(),
                threshold,
                ...(feeWallet ? { feeReceiver: feeWallet.trim() } : {}),
              }), 'Approved — pool created on-chain')}>
              {busy === 'approve' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />} Approve
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run('reject', () => rejectProposal(pool.id, reason.trim()), 'Rejected')}>
              {busy === 'reject' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <X className="mr-1.5 h-4 w-4" />} Reject
            </Button>
          </div>
        )}
        {!proposal && phase === 'open' && pool.onChainId != null && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirmClose(true)}>
              <TimerOff className="mr-1.5 h-4 w-4" /> Close betting now
            </Button>
          </div>
        )}
      </div>

      {/* Judges */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Gavel className="h-4 w-4" /> Judges · {proposal ? threshold : pool.threshold} of {proposal ? judges.length : pool.signers.length || judges.length} must agree</div>
          {judgesLocked ? (
            <span className="inline-flex items-center gap-1 text-xs text-white/45"><Lock className="h-3.5 w-3.5" /> {hasBets ? 'Locked (bets placed)' : 'Locked (betting closed)'}</span>
          ) : !proposal && !editJudges ? (
            <Button size="sm" variant="ghost" onClick={() => setEditJudges(true)}>Change</Button>
          ) : null}
        </div>
        {(proposal || editJudges) && !judgesLocked ? (
          <div className="mt-3 space-y-2">
            {judges.map((j, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <Input value={j.name} placeholder="Name" aria-label={`Judge ${i + 1} name`} className="sm:w-40" onChange={(e) => setJudges((js) => js.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} />
                <Input value={j.address} placeholder="Wallet address" aria-label={`Judge ${i + 1} wallet address`} className={`font-mono text-xs ${j.address && !validAddr(j.address) ? 'border-rose-500' : ''}`}
                  onChange={(e) => setJudges((js) => js.map((x, n) => (n === i ? { ...x, address: e.target.value.trim() } : x)))} />
                {judges.length > 1 && <Button size="sm" variant="ghost" aria-label={`Remove judge ${i + 1}`} onClick={() => { setJudges((js) => js.filter((_, n) => n !== i)); setThreshold((t) => Math.min(t, judges.length - 1)); }}><X className="h-4 w-4" /></Button>}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              {judges.length < 3 && <Button size="sm" variant="outline" onClick={() => setJudges((js) => [...js, { address: '', name: '' }])}>Add judge</Button>}
              <span className="text-xs text-white/50">Must agree:</span>
              {Array.from({ length: judges.length }, (_, k) => k + 1).map((n) => (
                <Button key={n} size="sm" variant={threshold === n ? 'default' : 'outline'} onClick={() => setThreshold(n)}>{n} of {judges.length}</Button>
              ))}
              {!proposal && (
                <>
                  <Button size="sm" disabled={!judgesValid || !!busy} onClick={() => run('signers', () => updateSigners(pool.id, cleanJudges(), threshold), 'Judges updated').then((ok) => ok && setEditJudges(false))}>
                    {busy === 'signers' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save judges
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditJudges(false); setJudges(pool.signers); setThreshold(pool.threshold); }}>Cancel</Button>
                </>
              )}
            </div>
            {proposal && <p className="text-xs text-white/45">Pick 1–3 neutral judges (the proposer doesn&apos;t choose them). Not the house wallet or the fee wallet.</p>}
            {!judgesValid && <p className="text-xs text-amber-400">{problems[0]}</p>}
          </div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {pool.signers.map((s) => (
              <li key={s.address} className="flex items-center justify-between gap-3">
                <span>{s.name || '—'}</span>
                <a href={explorerAccount(s.address)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-white/50 hover:text-white/80">{shortAddr(s.address)}</a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fee wallet */}
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" /> Fee wallet <span className="font-normal text-white/45">(receives the 10% fee; empty = house; must hold USDC)</span></div>
          {feeLocked && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-white/45"><Lock className="h-3.5 w-3.5" /> {hasBets ? 'Locked (bets placed)' : 'Locked (betting closed)'}</span>}
        </div>
        {!feeLocked ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input value={feeWallet} placeholder="House wallet (default)" aria-label="Fee wallet address" className={`font-mono text-xs ${feeWallet && !validAddr(feeWallet) ? 'border-rose-500' : ''}`} onChange={(e) => setFeeWallet(e.target.value.trim())} />
            {!proposal && (
              <Button size="sm" aria-label="Save fee wallet" disabled={!!busy || !validAddr(feeWallet) || feeWallet === pool.feeReceiver || feeIsJudge}
                onClick={() => run('fee', () => updateFeeReceiver(pool.id, feeWallet), 'Fee wallet updated')}>
                {busy === 'fee' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-1 font-mono text-xs text-white/55">{pool.feeReceiver || 'House wallet'}</div>
        )}
        {!feeLocked && !proposal && <p className="mt-1.5 text-xs text-white/45">Can only be changed before the first bet.</p>}
        {!feeLocked && feeIsJudge && <p className="mt-1 text-xs text-amber-400">A judge can&apos;t be the fee wallet.</p>}
      </div>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        busy={busy === 'close'}
        title="Close betting now?"
        description={`"${pool.title}" stops taking bets immediately and the judges can confirm the result right away. This can't be undone.`}
        confirmLabel="Close betting"
        onConfirm={() => run('close', () => closePoolNow(pool.id), 'Betting closed').then(() => setConfirmClose(false))}
      />

      {proposal && (
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason if rejecting (optional, shown to the proposer)" aria-label="Reason if rejecting" className="mt-3" />
      )}
    </GlassPanel>
  );
}
