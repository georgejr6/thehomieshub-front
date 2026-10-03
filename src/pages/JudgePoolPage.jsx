import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, ExternalLink, Gavel, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, shortAddr } from '@/components/onchain/ui';
import { apiError, fetchPool, phaseLabel, poolPhase, usdFromMicro } from '@/lib/pools/api';
import { CANCEL_VOTE, buildVoteTxn, explorerApp, explorerTx, readHouse, readPoolBox, sendSigned } from '@/lib/pools/chain';
import { cn } from '@/lib/utils';

// thehomies.app/bets/:id/judge — a pool's judges confirm the result here by
// signing vote(pool_id, choice) from their own wallet. When enough judges
// agree, the contract settles the pool by itself.

const NO_VOTE = 255;

export default function JudgePoolPage() {
  const { id } = useParams();
  const { connectedWallet, connectWallet, signTransactions, isConnecting } = useWallet();
  const { toast } = useToast();
  const [pool, setPool] = useState(null);
  const [chainVotes, setChainVotes] = useState(null);
  const [chainBox, setChainBox] = useState(null);
  const [error, setError] = useState('');
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);

  const load = useCallback(async () => {
    try {
      const p = await fetchPool(id);
      setPool(p);
      setError('');
      if (p.appId && p.onChainId != null) {
        const box = await readPoolBox(p.appId, p.onChainId);
        if (box?.votes) setChainVotes(Array.from(box.votes, Number));
        if (box) setChainBox(box);
      }
    } catch (err) {
      setError(apiError(err, 'Couldn’t load this pool'));
    }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const phase = poolPhase(pool);
  const me = connectedWallet?.address;
  const myIndex = pool?.signers?.findIndex((s) => s.address === me) ?? -1;
  const isSigner = myIndex >= 0;
  const votes = (chainVotes || pool?.votes || []).map(Number);
  const cast = votes.slice(0, pool?.signers?.length || 0).filter((v) => v !== NO_VOTE && !Number.isNaN(v)).length;
  const now = Date.now();
  const afterClose = pool?.closeAt ? now >= pool.closeAt.getTime() : false;
  const beforeDeadline = pool?.resolveBy ? now <= pool.resolveBy.getTime() : true;
  // The chain is the truth: the backend syncs every couple of minutes, so a
  // pool can already be settled on-chain while it still reads 'live' here.
  const chainOpen = chainBox ? Number(chainBox.status) === 0 : true;
  const canVote = isSigner && pool?.onChainId != null && ['open', 'closed'].includes(phase) && chainOpen && beforeDeadline;

  const choiceLabel = (v) => (v === CANCEL_VOTE ? 'Cancel / no contest' : pool?.outcomes?.[v] ?? `Outcome ${v + 1}`);

  const vote = async () => {
    if (pick == null || !canVote) return;
    setBusy(true);
    try {
      // Fee receiver from the pool box (what the contract pays), else the backend's copy.
      // No fee wallet set on the pool (null) means the house gets the fee.
      const house = pick !== CANCEL_VOTE ? await readHouse(pool.appId) : null;
      const feeReceiver = chainBox?.fee_receiver ? String(chainBox.fee_receiver) : (pool.feeReceiver || house);
      if (pick !== CANCEL_VOTE && !feeReceiver) throw new Error('Couldn’t read this pool from the chain. Refresh and try again.');
      const txn = await buildVoteTxn({ appId: pool.appId, poolId: pool.onChainId, choice: pick, signer: me, feeReceiver, house });
      const signed = await signTransactions([[{ txn, signers: [me] }]]);
      const txId = await sendSigned(signed || []);
      setLastTx(txId);
      setPick(null);
      toast({ title: 'Vote recorded', description: choiceLabel(pick) });
      load();
    } catch (err) {
      const msg = String(err?.message || err);
      if (!/reject|cancel|closed/i.test(msg)) toast({ title: 'Vote failed', description: /balance|below min/i.test(msg) ? 'Your wallet needs a little ALGO for the network fee.' : msg.slice(0, 200), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-xl px-4 pb-20 pt-6 sm:pt-10">
        <Link to={`/bets/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to the pool</Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff2d55]/15"><Gavel className="h-6 w-6 text-[#ff2d55]" /></span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Judge</div>
            <h1 className="truncate text-2xl font-black">{pool?.title || '…'}</h1>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-[#ffb3c1]">{error}</p>}

        {pool && (
          <>
            <Card className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm text-white/60">Status</div>
                <div className="font-bold">{phaseLabel(phase)}</div>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <div className="text-sm text-white/60">Votes in</div>
                <div className="text-xl font-black">{cast} <span className="text-sm font-semibold text-white/50">of {pool.threshold} needed</span></div>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <div className="text-sm text-white/60">In the pot</div>
                <div className="font-bold">{usdFromMicro(pool.total)}</div>
              </div>
              {pool.resolveBy && <div className="mt-2 text-xs text-white/45">Judges have until {pool.resolveBy.toLocaleString()} to confirm. After that everyone is refunded.</div>}
              <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
                {pool.signers.map((s, i) => {
                  const v = votes[i];
                  return (
                    <li key={s.address} className={cn('flex items-center justify-between gap-3 text-sm', i === myIndex && 'font-semibold')}>
                      <span className="min-w-0 truncate">{s.name || shortAddr(s.address)}{i === myIndex ? ' (you)' : ''}</span>
                      <span className="shrink-0 text-white/60">{v == null || v === NO_VOTE || Number.isNaN(v) ? (chainVotes || pool.votes ? 'No vote yet' : '—') : choiceLabel(v)}</span>
                    </li>
                  );
                })}
              </ul>
              {pool.appId && <a href={explorerApp(pool.appId)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70">Contract on Algorand <ExternalLink className="h-3 w-3" /></a>}
            </Card>

            {!me ? (
              <Card className="mt-4 text-center">
                <Wallet className="mx-auto h-8 w-8 text-[#ff2d55]" />
                <p className="mt-2 text-sm text-white/70">Connect the wallet you were listed with as a judge.</p>
                <Button onClick={() => connectWallet('pera').catch(() => {})} disabled={isConnecting} className="mt-4 h-11 w-full rounded-xl bg-[#ffee58] font-bold text-black hover:bg-[#fff176]">
                  {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Connect Pera Wallet
                </Button>
              </Card>
            ) : !isSigner ? (
              <Card className="mt-4 text-center text-sm text-white/70">
                {shortAddr(me)} isn&apos;t a judge on this pool. Only the judges listed above can confirm the result.
              </Card>
            ) : !canVote ? (
              <Card className="mt-4 text-center text-sm text-white/70">
                {['resolved', 'cancelled', 'swept'].includes(phase) || !chainOpen ? 'This pool is settled. Nothing left to do.' : !beforeDeadline ? 'The judging deadline has passed. Bettors will be refunded.' : 'Voting isn’t available for this pool yet.'}
              </Card>
            ) : (
              <Card className="mt-4">
                <h2 className="text-lg font-black">Confirm the result</h2>
                <p className="mt-1 text-sm text-white/60">
                  {afterClose ? 'Pick what actually happened.' : 'Betting is still open, so you can only cancel for now. Results can be confirmed once betting closes.'} You can change your vote until the pool is settled.
                </p>
                <div className="mt-4 space-y-2">
                  {pool.outcomes.map((label, i) => (
                    <button key={label + i} type="button" disabled={!afterClose || busy} onClick={() => setPick(i)}
                      className={cn('flex w-full items-center justify-between rounded-xl border p-3 text-left font-semibold transition disabled:opacity-40',
                        pick === i ? 'border-[#ff2d55] bg-[#ff2d55]/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25')}>
                      {label}
                      {votes[myIndex] === i && <span className="text-xs text-emerald-400">your vote</span>}
                    </button>
                  ))}
                  <button type="button" disabled={busy} onClick={() => setPick(CANCEL_VOTE)}
                    className={cn('flex w-full items-center justify-between rounded-xl border p-3 text-left font-semibold transition',
                      pick === CANCEL_VOTE ? 'border-sky-400 bg-sky-400/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25')}>
                    <span className="inline-flex items-center gap-2"><Ban className="h-4 w-4" /> Cancel / no contest (refund everyone)</span>
                    {votes[myIndex] === CANCEL_VOTE && <span className="text-xs text-emerald-400">your vote</span>}
                  </button>
                </div>
                <Button onClick={vote} disabled={pick == null || busy} className="mt-4 h-12 w-full rounded-xl bg-[#ff2d55] text-base font-bold text-white hover:bg-[#ff4d6d] disabled:opacity-40">
                  {busy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Approve in your wallet…</> : pick == null ? 'Pick one' : `Vote: ${choiceLabel(pick)}`}
                </Button>
                <p className="mt-2 text-center text-xs text-white/45">Your wallet pays a tiny ALGO network fee (under $0.01).</p>
                {lastTx && (
                  <a href={explorerTx(lastTx)} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Vote on Algorand <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
