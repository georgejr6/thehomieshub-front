import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Ban, CheckCircle2, ExternalLink, Gavel, Landmark, Loader2, Percent,
  RotateCcw, Share2, ShieldCheck, Trophy, Users, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { walletStatus } from '@/lib/x402Pay';
import { payPoolBet } from '@/lib/pools/poolPay';
import { estimatePayoutMicro, explorerApp, explorerTx, MIN_BET_MICRO } from '@/lib/pools/chain';
import {
  DEFAULT_GATEWAY, apiError, createIntent, fetchMyBets, fetchPool, fetchPools, judgesLine, phaseLabel, poolPhase, usdFromMicro,
} from '@/lib/pools/api';
import { Card, StepProgress, usd } from '@/components/onchain/ui';
import FundStep from '@/components/onchain/FundStep';
import WalletStep from '@/components/onchain/WalletStep';
import AccountStep from '@/components/onchain/AccountStep';

// thehomies.app/fight — pari-mutuel USDC pool on Mwosa's Oct 29 fight.
// Money sits in the HomiesPools contract on Algorand; bets go through the
// DIGITVL x402 gateway /bet (see src/lib/pools/poolPay.js). The fight
// sponsorship page that used to live here is now /sponsor.

const FIGHT_DATE = 'Oct 29';
const STEPS = ['How it works', 'Pick', 'Amount', 'Account', 'Wallet', 'Add funds', 'Bet', 'Done'];
const LAST = STEPS.length - 1; // 7 = Done
const BET = LAST - 1; // 6
const FUND = 5;
const DRAFT_KEY = 'fight_pool_draft';
const ACK_KEY = 'pool_explainer_ack';
const PRESETS = [500, 1000, 2500, 5000, 10000];
const ENV_POOL = import.meta.env.VITE_FIGHT_POOL_ID || '';

function loadDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}
function loadAck() {
  try { return localStorage.getItem(ACK_KEY) === '1'; } catch { return false; }
}

export default function FightPoolPage() {
  const { user } = useAuth();
  const { connectedWallet, connectWallet, signTransactions, isConnecting } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // /bets/:id = any approved pool (generic header); /fight = the fight pool.
  const { id: routePoolId } = useParams();
  const generic = !!routePoolId;
  const here = location.pathname;
  const poolParam = routePoolId || new URLSearchParams(location.search).get('pool') || ENV_POOL;

  const draft = useMemo(() => { const d = loadDraft(); return d && (d.pool || '') === (poolParam || '') ? d : null; }, [poolParam]);
  const ackedBefore = useMemo(loadAck, []);
  const [ack, setAck] = useState(ackedBefore || !!draft?.ack);
  const firstStep = draft?.step && draft.step < BET && user ? Math.min(draft.step, 4) : (ackedBefore ? 1 : 0);
  const [step, setStep] = useState(firstStep);
  const [dir, setDir] = useState(1);
  const [outcome, setOutcome] = useState(Number.isInteger(draft?.outcome) ? draft.outcome : null);
  const [cents, setCents] = useState(draft?.cents || 1000);
  const [custom, setCustom] = useState(draft?.custom || '');
  const [pool, setPool] = useState(null);
  const [poolError, setPoolError] = useState('');
  const [myBets, setMyBets] = useState([]);
  const [funds, setFunds] = useState(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (step >= BET + 1) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ pool: poolParam || '', step, outcome, cents, custom, ack })); } catch { /* private mode */ }
  }, [step, outcome, cents, custom, ack]);

  // The pool: ?pool=<id>, else VITE_FIGHT_POOL_ID, else the first live house pool.
  const poolIdRef = useRef(poolParam || null);
  const loadPool = useCallback(async () => {
    try {
      let id = poolIdRef.current;
      if (!id) {
        const pools = await fetchPools();
        const pick = pools.find((p) => p.kind === 'house' && p.status === 'live') || pools.find((p) => p.status === 'live');
        if (!pick) { setPoolError('The fight pool isn’t open yet. Check back soon.'); return; }
        id = pick.id;
        poolIdRef.current = id;
      }
      setPool(await fetchPool(id));
      setPoolError('');
    } catch (err) {
      setPoolError(err?.response?.status === 404 ? 'The fight pool isn’t open yet. Check back soon.' : 'Couldn’t load the pool. Pull to refresh.');
    }
  }, []);
  useEffect(() => {
    loadPool();
    const t = setInterval(loadPool, 15000);
    return () => clearInterval(t);
  }, [loadPool]);

  const loadMine = useCallback(async () => {
    if (!user || !pool?.id) { setMyBets([]); return; }
    try { setMyBets(await fetchMyBets(pool.id)); } catch { /* keep last */ }
  }, [user, pool?.id]);
  useEffect(() => { loadMine(); }, [loadMine]);

  const phase = poolPhase(pool);
  // Judges can't bet in a pool they judge (the contract refuses it too).
  const isJudge = !!(connectedWallet?.address && pool?.signers?.some((s) => s.address === connectedWallet.address));
  const bettingOpen = phase === 'open' && pool?.onChainId != null;

  // Every step is a browser history entry (phone back gesture walks the steps).
  const stepRef = useRef(step);
  stepRef.current = step;
  const [maxStep, setMaxStep] = useState(step);
  const go = (to, { push = true } = {}) => {
    setDir(to > stepRef.current ? 1 : -1);
    setStep(to);
    setMaxStep((m) => Math.max(m, to));
    if (push) {
      try { window.history.pushState({ ...(window.history.state || {}), poolStep: to }, ''); } catch { /* ignore */ }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkFunds = useCallback(async () => {
    if (!connectedWallet?.address) return;
    setChecking(true);
    try { setFunds(await walletStatus(connectedWallet.address)); } catch { /* keep last */ }
    setChecking(false);
  }, [connectedWallet?.address]);
  useEffect(() => { setFunds(null); }, [connectedWallet?.address]);
  useEffect(() => { if (step < LAST) checkFunds(); }, [step, checkFunds]);
  useEffect(() => {
    if (step !== FUND) return undefined;
    const t = setInterval(checkFunds, 10000);
    return () => clearInterval(t);
  }, [step, checkFunds]);

  const needUsdc = funds ? Math.max(0, cents / 100 - funds.usdc) : null;
  const funded = funds && funds.optedIn && needUsdc === 0;

  const next = () => {
    let to = step + 1;
    if (to === 3 && user) to = 4;
    if (to === 4 && connectedWallet) to = 5;
    if (to === FUND && funded) to = BET;
    go(to);
  };

  const waitedRef = useRef(false);
  useEffect(() => {
    if (step !== FUND) { waitedRef.current = false; return; }
    if (funds && !funded) waitedRef.current = true;
    else if (funded && (waitedRef.current || dir > 0)) { waitedRef.current = false; go(BET); }
  }, [step, funds, funded]); // eslint-disable-line react-hooks/exhaustive-deps

  const acknowledge = (v) => {
    setAck(v);
    try { if (v) localStorage.setItem(ACK_KEY, '1'); else localStorage.removeItem(ACK_KEY); } catch { /* ignore */ }
  };

  const placeBet = async () => {
    setPayError('');
    if (!connectedWallet?.address) { go(4); return; }
    if (funds && !funded) { go(FUND); return; }
    if (!bettingOpen) { setPayError('Betting is closed for this pool.'); return; }
    if (isJudge) return;
    setPaying(true);
    try {
      const amountUsd = cents / 100;
      const intent = await createIntent(pool.id, { outcome, amountUsd, wallet: connectedWallet.address });
      const gw = intent.gatewayUrl || DEFAULT_GATEWAY;
      const url = intent.betUrl || `${gw}/bet?pool=${pool.onChainId}&outcome=${outcome}&amount=${amountUsd.toFixed(2)}&ref=${encodeURIComponent(intent.ref)}`;
      const { txId } = await payPoolBet(url, {
        address: connectedWallet.address,
        signTransactions,
        poolId: pool.onChainId,
        outcome,
        amountMicro: Math.round(amountUsd * 1e6),
        appId: intent.appId || pool.appId,
      });
      setResult({ txId, outcome, cents, estMicro: estimatePayoutMicro(pool.totals, outcome, cents * 1e4) });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      go(LAST);
      loadPool();
    } catch (err) {
      setPayError(apiError(err, 'Bet failed'));
      if (err?.code === 'funds' || err?.code === 'optin') { checkFunds(); go(FUND); }
    } finally {
      setPaying(false);
    }
  };

  // After the bet: the backend records it a few seconds after the gateway settles.
  useEffect(() => {
    if (step !== LAST || !result?.txId) return undefined;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      await loadMine();
      if (tries > 30) clearInterval(t);
    }, 4000);
    return () => clearInterval(t);
  }, [step, result?.txId, loadMine]);

  const openSignIn = () => {
    navigate(`${here}?openAuth=1&tab=signup&redirect=${encodeURIComponent(here)}&t=${Date.now()}`, { replace: true });
  };

  const share = async () => {
    const text = generic ? `I just made my pick on "${pool?.title}". Think you know better?` : `I just called Mwosa's ${FIGHT_DATE} fight. Think you know better? Put your pick in:`;
    const url = `https://www.thehomies.app${here}`;
    try {
      if (navigator.share) await navigator.share({ title: generic ? pool?.title || 'Homies pool' : 'Call the fight', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast({ title: 'Link copied' }); }
    } catch { /* cancelled */ }
  };

  const customValid = (v) => /^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= 1 && Number(v) <= 500;
  const amountOk = cents >= MIN_BET_MICRO / 1e4 && cents <= 50000 && (!custom || customValid(custom));
  const done = [ack, outcome != null && outcome < (pool?.outcomes.length || 0) && bettingOpen, amountOk, !!user, !!connectedWallet, !!funded];
  const canNext = [...done, false, false][step];
  const reachable = (i) => step < LAST && !paying && i <= BET && (i <= step || i <= maxStep) && done.slice(0, i).every(Boolean);
  const reachableRef = useRef(reachable);
  reachableRef.current = reachable;

  useEffect(() => {
    try { window.history.replaceState({ ...(window.history.state || {}), poolStep: stepRef.current }, ''); } catch { /* ignore */ }
    const onPop = (e) => {
      const cur = stepRef.current;
      const want = Number.isInteger(e.state?.poolStep) ? e.state.poolStep : Math.max(0, cur - 1);
      if (cur >= LAST || paying) {
        try { window.history.pushState({ ...(window.history.state || {}), poolStep: cur }, ''); } catch { /* ignore */ }
        return;
      }
      if (want !== cur && reachableRef.current(want)) go(want, { push: false });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [paying]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextLabel = () => {
    if (step === 0) return ack ? 'Got it — pick a result' : 'Tick the box to continue';
    if (step === 1) return !bettingOpen ? (phase === 'loading' ? 'Loading…' : 'Betting is closed') : outcome == null ? 'Pick a result' : 'Continue';
    if (step === 2) return amountOk ? `Bet ${usd(cents)}` : 'Enter $1 to $500';
    if (step === FUND && !funded) return 'Waiting for USDC…';
    return 'Continue';
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-6 sm:pt-10">
        {generic ? <PoolHeader pool={pool} phase={phase} /> : <Header pool={pool} phase={phase} />}
        {poolError && <p className="mt-4 rounded-xl bg-white/5 p-3 text-center text-sm text-white/70">{poolError}</p>}
        {step < LAST && <StepProgress steps={STEPS.slice(0, LAST)} step={step} reachable={reachable} onJump={(i) => go(i)} />}

        <div className="relative mt-5">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ x: dir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -60, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              drag={(step === 1 || (step >= 3 && step <= FUND) || (step === BET && !paying)) ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (paying) return;
                if (info.offset.x > 90 && step > 0 && step < LAST) go(step - 1);
                else if (info.offset.x < -90 && canNext && step < BET) next();
              }}
            >
              {step === 0 && <ExplainStep pool={pool} ack={ack} setAck={acknowledge} />}
              {step === 1 && <PickStep pool={pool} phase={phase} outcome={outcome} setOutcome={setOutcome} />}
              {step === 2 && (
                <AmountStep pool={pool} outcome={outcome} cents={cents} setCents={setCents} custom={custom} setCustom={setCustom} customValid={customValid} />
              )}
              {step === 3 && <AccountStep user={user} onSignIn={openSignIn} body="Your bets are saved to your account so you can always see them and their payouts. Takes 20 seconds." />}
              {step === 4 && (
                <WalletStep connectedWallet={connectedWallet} isConnecting={isConnecting}
                  onConnect={async () => {
                    try { await connectWallet('pera'); } catch (e) {
                      if (!/closed|cancel/i.test(String(e?.message))) toast({ title: 'Could not connect', description: e?.message, variant: 'destructive' });
                    }
                  }}
                />
              )}
              {step === FUND && <FundStep funds={funds} cents={cents} needUsdc={needUsdc} checking={checking} onCheck={checkFunds} address={connectedWallet?.address} onSkip={() => go(BET)} actionWord="place your bet" />}
              {step === BET && (
                <BetStep pool={pool} outcome={outcome} cents={cents} paying={paying} error={payError} onBet={placeBet}
                  onChange={() => go(1)} address={connectedWallet?.address} open={bettingOpen} isJudge={isJudge} />
              )}
              {step === LAST && (
                <DoneStep pool={pool} result={result} myBets={myBets} onShare={share}
                  onAgain={() => { setResult(null); setPayError(''); setMaxStep(1); go(1); }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step < LAST && step <= 2 && user && myBets.length > 0 && <MyBets pool={pool} bets={myBets} />}
        <p className="mt-10 text-center text-xs text-white/35">
          {!generic && <>Want to back the fight without betting? <Link to="/sponsor" className="underline hover:text-white/60">Sponsor Mwosa</Link>{' · '}</>}
          <Link to="/bets" className="underline hover:text-white/60">All pools</Link>
        </p>
      </div>

      {step < LAST && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07070a]/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            {step > 0 && (
              <Button
                variant="ghost"
                className={cn('h-12 text-white/70 hover:bg-white/10 hover:text-white', step === BET ? 'flex-1 rounded-xl border border-white/15' : 'w-12 px-0')}
                onClick={() => go(step - 1)}
                disabled={paying}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />{step === BET && <span className="ml-2 font-semibold">Back</span>}
              </Button>
            )}
            {step < BET && (
              <Button
                className="h-12 flex-1 rounded-xl bg-[#ff2d55] text-base font-bold text-white hover:bg-[#ff4d6d] disabled:opacity-40"
                disabled={!canNext}
                onClick={next}
              >
                {nextLabel()}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ pool, phase }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff8099]">
        <Trophy className="h-3.5 w-3.5" /> Fight night · {FIGHT_DATE}
      </div>
      <h1 className="mt-3 font-black uppercase leading-[0.95] tracking-tight" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 'clamp(2.4rem, 9vw, 3.6rem)' }}>
        Call the fight
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
        {pool?.title && pool.title !== 'Pool' ? `${pool.title}. ` : ''}Pick how Mwosa&apos;s fight ends. Everyone who calls it right splits the pot.
      </p>
      {pool && (
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div><span className="text-xl font-black text-white">{usdFromMicro(pool.total)}</span> <span className="text-white/50">in the pot</span></div>
          {pool.bettors != null && <div><span className="text-xl font-black text-white">{pool.bettors}</span> <span className="text-white/50">bettors</span></div>}
          {phase !== 'open' && phase !== 'loading' && <div className="font-semibold uppercase tracking-wider text-[#ff8099]">{phaseLabel(phase)}</div>}
        </div>
      )}
    </div>
  );
}

function PoolHeader({ pool, phase }) {
  return (
    <div className="text-center">
      <Link to="/bets" className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff8099]">
        <Trophy className="h-3.5 w-3.5" /> Homies pools
      </Link>
      <h1 className="mt-3 break-words font-black uppercase leading-[0.95] tracking-tight" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 'clamp(2rem, 8vw, 3.2rem)' }}>
        {pool?.title || '…'}
      </h1>
      {pool?.description && <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-[15px] leading-relaxed text-white/70">{pool.description}</p>}
      {pool && (
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
          <div><span className="text-xl font-black text-white">{usdFromMicro(pool.total)}</span> <span className="text-white/50">in the pot</span></div>
          {pool.closeAt && <div className="text-white/50">{phase === 'open' ? 'Closes' : 'Closed'} {pool.closeAt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
          {phase !== 'open' && phase !== 'loading' && <div className="font-semibold uppercase tracking-wider text-[#ff8099]">{phaseLabel(phase)}</div>}
        </div>
      )}
    </div>
  );
}

function Point({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff2d55]/15"><Icon className="h-[18px] w-[18px] text-[#ff2d55]" /></span>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-sm leading-relaxed text-white/65">{children}</div>
      </div>
    </li>
  );
}

function ExplainStep({ pool, ack, setAck }) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-black">How it works</h2>
        <ul className="mt-4 space-y-4">
          <Point icon={Users} title="One pot, shared by the winners">
            Everyone&apos;s bets go into one pot. When it&apos;s over, the people who picked the right result split it — the more you put in, the bigger your share.
          </Point>
          <Point icon={Percent} title="10% house fee, taken once">
            When there&apos;s a winner, 10% of the pot goes to the house. The other 90% goes to the winners. No fee on refunds.
          </Point>
        </ul>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Example</div>
          <p className="mt-1.5 leading-relaxed text-white/80">
            The pot has <b>$1,000</b>. <b>$200</b> of it is on &ldquo;Mwosa by KO&rdquo;. After the 10% fee, <b>$900</b> is paid out.
            If it ends by KO, every $1 on KO gets <b>$900 ÷ $200 = $4.50</b>. You bet <b>$10</b> → you get <b className="text-emerald-400">$45</b>.
          </p>
          <p className="mt-2 text-xs text-white/50">Your payout moves as people bet. It&apos;s locked in when betting closes (for the fight: at the first bell).</p>
        </div>

        <ul className="mt-5 space-y-4">
          <Point icon={Landmark} title="Your money sits in a public contract">
            Your USDC goes into a smart contract on Algorand, not to us. Its rules can&apos;t be changed by anyone, including us, and anyone can check it.
            {pool?.appId && (
              <> <a href={explorerApp(pool.appId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-white underline">See it live <ExternalLink className="h-3 w-3" /></a></>
            )}
          </Point>
          <Point icon={Gavel} title="Neutral judges confirm the result">
            {judgesLine(pool)} Nobody else can decide who won.
          </Point>
          <Point icon={RotateCcw} title="Automatic refunds">
            If the event is cancelled, no result is confirmed in time, or nobody picked the winning result, everyone gets every cent back.
          </Point>
          <Point icon={Wallet} title="Automatic payouts">
            Win, and your money lands in your wallet by itself. Nothing to claim.
          </Point>
        </ul>
      </Card>

      <Card className={cn(ack && 'border-emerald-500/40')}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[#ff2d55]" />
          <span className="text-sm leading-relaxed text-white/85">
            I&apos;m <b>18 or older</b>, betting is legal where I live, and I&apos;ll <b>only bet what I can afford to lose</b>.
          </span>
        </label>
      </Card>
    </div>
  );
}

function PickStep({ pool, phase, outcome, setOutcome }) {
  if (!pool) return <Card className="flex items-center justify-center gap-2 text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading the pool…</Card>;
  const open = phase === 'open';
  return (
    <div className="space-y-3">
      {!open && <p className="rounded-xl bg-[#ff2d55]/10 p-3 text-center text-sm text-[#ffb3c1]">{phaseLabel(phase)} — no new bets.</p>}
      {pool.outcomes.map((label, i) => {
        const active = outcome === i;
        const share = pool.total ? (pool.totals[i] / pool.total) * 100 : 0;
        const perDollar = estimatePayoutMicro(pool.totals, i, 1e6) / 1e6;
        const winner = phase === 'resolved' && Number(pool.winner) === i;
        return (
          <button
            key={label + i}
            type="button"
            disabled={!open}
            onClick={() => setOutcome(i)}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border p-4 text-left transition disabled:cursor-default',
              active ? 'border-[#ff2d55] bg-[#ff2d55]/10 shadow-[0_0_0_1px_#ff2d55,0_10px_40px_-10px_rgba(255,45,85,0.5)]' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
              winner && 'border-emerald-500',
            )}
          >
            <span className="absolute inset-y-0 left-0 bg-white/[0.04]" style={{ width: `${share}%` }} aria-hidden />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-bold">{label}{winner && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}</div>
                <div className="mt-0.5 text-xs text-white/55">{usdFromMicro(pool.totals[i])} in · {share.toFixed(0)}% of the pot</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-black">${perDollar.toFixed(2)}</div>
                <div className="text-[11px] text-white/45">est. per $1</div>
              </div>
            </div>
          </button>
        );
      })}
      <p className="px-1 text-center text-xs leading-relaxed text-white/40">
        &ldquo;Est. per $1&rdquo; is what $1 would pay back if that result wins and nobody else bets. It changes as people bet.
      </p>
    </div>
  );
}

function AmountStep({ pool, outcome, cents, setCents, custom, setCustom, customValid }) {
  const label = pool?.outcomes?.[outcome] || '';
  const est = pool && outcome != null ? estimatePayoutMicro(pool.totals, outcome, cents * 1e4) : 0;
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Your pick</div>
        <div className="mt-1 text-xl font-black">{label}</div>
      </Card>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {PRESETS.map((c) => (
          <button key={c} type="button" onClick={() => { setCustom(''); setCents(c); }}
            className={cn('h-14 rounded-xl border text-lg font-black transition', !custom && cents === c ? 'border-[#ff2d55] bg-[#ff2d55]/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25')}>
            {usd(c)}
          </button>
        ))}
      </div>
      <Card className="p-4">
        <label className="text-sm font-semibold text-white/80" htmlFor="bet-amount">Or your own amount</label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 focus-within:border-[#ff2d55]">
          <span className="text-lg font-bold text-white/60">$</span>
          <input
            id="bet-amount"
            inputMode="decimal"
            placeholder="1 to 500"
            value={custom}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '').slice(0, 6);
              setCustom(v);
              if (customValid(v)) setCents(Math.round(Number(v) * 100));
              else if (!v) setCents(1000);
            }}
            className="h-12 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-white/30"
          />
        </div>
        {custom && !customValid(custom) && <p className="mt-2 text-xs text-[#ff8099]">Enter $1 to $500.</p>}
      </Card>
      <Card className="border-emerald-500/30 bg-emerald-500/[0.06]">
        <div className="text-sm text-white/70">If &ldquo;{label}&rdquo; wins, you&apos;d get about</div>
        <div className="mt-1 text-4xl font-black text-emerald-400">{usdFromMicro(est)}</div>
        <div className="mt-1 text-xs text-white/50">Based on the pot right now, including your {usd(cents)}. Final payout is set when betting closes.</div>
      </Card>
    </div>
  );
}

function BetStep({ pool, outcome, cents, paying, error, onBet, onChange, address, open, isJudge }) {
  if (isJudge) {
    return (
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff2d55]/15"><Gavel className="h-7 w-7 text-[#ff2d55]" /></div>
        <h2 className="mt-4 text-2xl font-black">You&apos;re a judge on this pool</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          The wallet you connected ({address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''}) confirms the result of this pool, so it can&apos;t bet in it. That keeps the judging fair.
        </p>
        {pool?.id && <Link to={`/bets/${pool.id}/judge`} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 font-bold text-black hover:bg-white/90">Go to the judge page</Link>}
      </Card>
    );
  }
  const est = pool && outcome != null ? estimatePayoutMicro(pool.totals, outcome, cents * 1e4) : 0;
  return (
    <div className="space-y-4">
      {!paying && (
        <button type="button" onClick={onChange} className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Change pick
        </button>
      )}
      <Card className="border-[#ff2d55]/40 bg-gradient-to-b from-[#ff2d55]/15 to-transparent">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/50">Your bet</div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-2xl font-black">{pool?.outcomes?.[outcome]}</span>
          <span className="text-4xl font-black">{usd(cents)}</span>
        </div>
        <div className="mt-3 flex justify-between text-sm text-white/70">
          <span>Est. payout if it wins</span><span className="font-bold text-emerald-400">{usdFromMicro(est)}</span>
        </div>
      </Card>
      <Button onClick={onBet} disabled={paying || !open} className="h-14 w-full rounded-2xl bg-[#ff2d55] text-lg font-black text-white hover:bg-[#ff4d6d]">
        {paying ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Approve in Pera…</> : <>Place {usd(cents)} bet</>}
      </Button>
      {paying && <p className="text-center text-sm text-white/60">Open Pera and tap <b>Confirm</b>. It shows two parts: your USDC going into the pool contract, and the bet itself. Network fees are covered.</p>}
      {error && <p className="rounded-xl bg-[#ff2d55]/15 p-3 text-center text-sm text-[#ffb3c1]">{error}</p>}
      <p className="text-center text-xs text-white/40">
        From {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'your wallet'}. Bets can&apos;t be taken back, but you&apos;re refunded automatically if there&apos;s no result.
      </p>
    </div>
  );
}

function DoneStep({ pool, result, myBets, onShare, onAgain }) {
  const recorded = result?.txId && myBets.some((b) => b.txId === result.txId);
  return (
    <div className="space-y-4 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ff2d55]">
        <Trophy className="h-10 w-10 text-white" />
      </motion.div>
      <h2 className="text-3xl font-black uppercase" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif' }}>You&apos;re in</h2>
      <Card className="text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Receipt</div>
        <div className="mt-2 space-y-1.5 text-sm">
          <Row k="Pick" v={pool?.outcomes?.[result?.outcome] || '—'} />
          <Row k="Bet" v={usd(result?.cents || 0)} />
          <Row k="Est. payout if it wins" v={usdFromMicro(result?.estMicro || 0)} />
          <Row k="Saved to your bets" v={recorded ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Yes</span> : <span className="inline-flex items-center gap-1 text-white/60"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming…</span>} />
        </div>
        {result?.txId && (
          <a href={explorerTx(result.txId)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
            View on Algorand <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Card>
      <Button onClick={onShare} className="h-12 w-full rounded-xl bg-white text-base font-bold text-black hover:bg-white/90"><Share2 className="mr-2 h-5 w-5" /> Challenge your people</Button>
      <Button onClick={onAgain} variant="ghost" className="h-12 w-full rounded-xl text-white/70 hover:bg-white/10 hover:text-white">Place another bet</Button>
      {myBets.length > 0 && <div className="text-left"><MyBets pool={pool} bets={myBets} /></div>}
    </div>
  );
}

function Row({ k, v }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-white/55">{k}</span><span className="font-semibold">{v}</span></div>;
}

// The signed-in user's bets on this pool with their payout status.
export function MyBets({ pool, bets }) {
  const phase = poolPhase(pool);
  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">My bets</h3>
      <div className="mt-3 space-y-2">
        {bets.map((b) => {
          let status; let tone = 'text-white/60'; let amount = null;
          if (phase === 'resolved') {
            if (Number(pool.winner) === b.outcome) {
              amount = b.payoutMicro ?? estimatePayoutMicro(pool.totals, b.outcome, b.amountMicro, 0);
              status = b.claimed ? 'Paid ✔' : 'Won · paying out…'; tone = 'text-emerald-400';
            } else { status = 'Lost'; tone = 'text-white/40'; }
          } else if (phase === 'cancelled') {
            amount = b.payoutMicro ?? b.amountMicro;
            status = b.claimed ? 'Refunded ✔' : 'Refunding…'; tone = 'text-sky-300';
          } else if (phase === 'swept') {
            status = b.claimed ? 'Paid ✔' : 'Closed'; amount = b.payoutMicro;
          } else {
            amount = pool ? estimatePayoutMicro(pool.totals, b.outcome, b.amountMicro, 0) : null;
            status = phase === 'closed' ? 'Waiting for the result' : 'Open';
          }
          return (
            <div key={b.txId} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{pool?.outcomes?.[b.outcome] ?? `Outcome ${b.outcome + 1}`} · {usdFromMicro(b.amountMicro)}</div>
                <div className={cn('text-xs', tone)}>{status}</div>
              </div>
              <div className="shrink-0 text-right">
                {amount != null && (
                  <div className="text-sm font-bold">{['open', 'closed'].includes(phase) ? 'est. ' : ''}{usdFromMicro(amount)}</div>
                )}
                <a href={explorerTx(b.claimTxId || b.txId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-white/40 hover:text-white/70">
                  {b.claimTxId ? 'payout' : 'receipt'} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
      {phase === 'resolved' && <p className="mt-2 flex items-center gap-1 text-xs text-white/40"><ShieldCheck className="h-3.5 w-3.5" /> Payouts are sent by the contract automatically.</p>}
      {phase === 'cancelled' && <p className="mt-2 flex items-center gap-1 text-xs text-white/40"><Ban className="h-3.5 w-3.5" /> No result — everyone gets their full bet back.</p>}
    </div>
  );
}
