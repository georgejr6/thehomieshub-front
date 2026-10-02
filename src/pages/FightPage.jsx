import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Crown, ExternalLink, Flame, Loader2,
  RefreshCw, Shirt, Share2, Smartphone, Sparkles, Trophy, Wallet, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';
import { payX402, walletStatus } from '@/lib/x402Pay';

// thehomies.app/fight — back Mwosa's Oct 29 fight + the platform. Fans pay in
// USDC from their own Algorand wallet through the DIGITVL x402 gateway; the
// backend (routes/fight.js) grants the perks once the payment settles.
// Membership days per tier must match homieshub-backend utils/fightSupport.js.

const FIGHT_DATE = 'Oct 29';
// Fallback only; the server's /fight/wall hoodieOpen is the source of truth.
const HOODIE_CUTOFF = Date.parse('2026-10-22T23:59:59-04:00');
const HOMIES_MONTHLY = 15;
const TIERS = [
  {
    key: 'supporter', cents: 100, name: 'Supporter', icon: Sparkles,
    perks: ['Your name on the supporter wall', 'Walkout song before it drops'],
  },
  {
    key: 'corner', cents: 500, name: 'Corner', icon: Flame, months: 1,
    perks: ['1 month of Homies membership', 'Supporter wall + early walkout song'],
  },
  {
    key: 'hoodie', cents: 1000, name: 'Walkout Hoodie', icon: Shirt, months: 1, hoodie: true,
    perks: ['Your name printed on Mwosa’s walkout hoodie', '1 month of Homies membership', 'Supporter wall + early walkout song'],
  },
  {
    key: 'ringside', cents: 2500, name: 'Ringside', icon: Zap, months: 3, hoodie: true, featured: true,
    perks: ['3 months of Homies membership', 'Your name on the walkout hoodie', 'Shoutout on the fight-night stream', 'Supporter wall + early walkout song'],
  },
  {
    key: 'champion', cents: 5000, name: 'Champion', icon: Crown, months: 12, hoodie: true,
    perks: ['A full year of Homies membership', 'Your name on the walkout hoodie', 'Shoutout on the fight-night stream', 'Champion badge on the supporter wall'],
  },
];
const tierFor = (cents) => [...TIERS].reverse().find((t) => cents >= t.cents) || null;
const usd = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const regularValue = (t) => (t?.months ? t.months * HOMIES_MONTHLY * 100 : 0);

const STEPS = ['Pick', 'Details', 'Account', 'Wallet', 'Add funds', 'Pay', 'Done'];
const DRAFT_KEY = 'fight_support_draft';
const PERA_IOS = 'https://apps.apple.com/us/app/pera-algo-wallet/id1459898525';
const PERA_ANDROID = 'https://play.google.com/store/apps/details?id=com.algorand.android';
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 .'_-]{0,19}$/;

function loadDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}

export default function FightPage() {
  const { user } = useAuth();
  const { connectedWallet, connectWallet, signTransactions, isConnecting } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const draft = useMemo(loadDraft, []);
  const [step, setStep] = useState(draft?.step && draft.step < 6 && user ? Math.min(draft.step, 3) : 0);
  const [dir, setDir] = useState(1);
  const [cents, setCents] = useState(draft?.cents || 2500);
  const [custom, setCustom] = useState(draft?.custom || '');
  const [showOnWall, setShowOnWall] = useState(draft?.showOnWall ?? true);
  const [wallName, setWallName] = useState(draft?.wallName || '');
  const [hoodieName, setHoodieName] = useState(draft?.hoodieName || '');
  const [message, setMessage] = useState(draft?.message || '');
  const [wall, setWall] = useState(null);
  const [funds, setFunds] = useState(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [result, setResult] = useState(null);

  const tier = tierFor(cents);
  const hoodieOpen = wall ? wall.hoodieOpen : Date.now() <= HOODIE_CUTOFF;

  useEffect(() => {
    // Paid: never write the draft back (a reload would offer to pay again).
    if (step >= 6) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, cents, custom, showOnWall, wallName, hoodieName, message }));
    } catch { /* private mode */ }
  }, [step, cents, custom, showOnWall, wallName, hoodieName, message]);

  const loadWall = useCallback(() => {
    api.get('/fight/wall').then((r) => setWall(r.data)).catch(() => {});
  }, []);
  useEffect(() => { loadWall(); }, [loadWall]);

  const go = (to) => { setDir(to > step ? 1 : -1); setStep(to); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Next step, skipping the ones already done.
  const next = () => {
    let to = step + 1;
    if (to === 2 && user) to = 3;
    if (to === 3 && connectedWallet) to = 4;
    go(to);
  };

  const checkFunds = useCallback(async () => {
    if (!connectedWallet?.address) return;
    setChecking(true);
    try { setFunds(await walletStatus(connectedWallet.address)); } catch { /* keep last */ }
    setChecking(false);
  }, [connectedWallet?.address]);

  useEffect(() => { if (step === 4) checkFunds(); }, [step, checkFunds]);
  // While they're off buying USDC in Pera, keep checking.
  useEffect(() => {
    if (step !== 4) return undefined;
    const t = setInterval(checkFunds, 10000);
    return () => clearInterval(t);
  }, [step, checkFunds]);

  const needUsdc = funds ? Math.max(0, cents / 100 - funds.usdc) : null;
  const funded = funds && funds.optedIn && needUsdc === 0;

  // USDC landed while they waited on the funding step: move on. Only after an
  // unfunded check, so swiping back from Pay doesn't bounce them forward.
  const waitedRef = useRef(false);
  useEffect(() => {
    if (step !== 4) { waitedRef.current = false; return; }
    if (funds && !funded) waitedRef.current = true;
    else if (funded && waitedRef.current) { waitedRef.current = false; go(5); }
  }, [step, funds, funded]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async () => {
    setPayError('');
    if (!connectedWallet?.address) { go(3); return; }
    setPaying(true);
    try {
      const { data: intent } = await api.post('/fight/intent', {
        amountUsd: cents / 100,
        wallet: connectedWallet.address,
        showOnWall,
        wallName: wallName.trim(),
        hoodieName: tier?.hoodie && hoodieOpen ? hoodieName.trim() : '',
        message: message.trim(),
      });
      const url = `${intent.gatewayUrl}/support?amount=${(cents / 100).toFixed(2)}&ref=${encodeURIComponent(intent.ref)}`;
      const { txId } = await payX402(url, { address: connectedWallet.address, signTransactions });
      setResult({ intentId: intent.id, txId, status: 'processing' });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      go(6);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Payment failed';
      setPayError(msg);
      if (err?.code === 'funds' || err?.code === 'optin') { checkFunds(); }
    } finally {
      setPaying(false);
    }
  };

  // Perks are granted a few seconds after the payment settles.
  useEffect(() => {
    if (step !== 6 || !result?.intentId || result.status === 'paid') return undefined;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await api.get(`/fight/intent/${result.intentId}`);
        if (data.status === 'paid' || data.status === 'rejected') {
          setResult((r) => ({ ...r, ...data }));
          loadWall();
          clearInterval(t);
          return;
        }
      } catch { /* keep polling */ }
      if (tries > 40) {
        clearInterval(t);
        setResult((r) => ({ ...r, status: 'slow' }));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [step, result?.intentId, result?.status, loadWall]);

  // App.jsx opens the auth modal from ?openAuth=1; the nonce makes a second tap
  // (after closing the modal) change the URL so it opens again.
  const openSignIn = () => {
    navigate(`/fight?openAuth=1&tab=signup&redirect=/fight&t=${Date.now()}`, { replace: true });
  };

  const share = async () => {
    const text = `I'm backing Mwosa's ${FIGHT_DATE} fight. Get in his corner:`;
    const url = 'https://www.thehomies.app/fight';
    try {
      if (navigator.share) await navigator.share({ title: 'Back Mwosa', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast({ title: 'Link copied' }); }
    } catch { /* cancelled */ }
  };

  const customValid = (v) => /^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= 1 && Number(v) <= 500;
  const detailsValid = (!wallName || NAME_RE.test(wallName.trim())) && (!hoodieName || NAME_RE.test(hoodieName.trim()));
  const canNext = [!!tier && (!custom || customValid(custom)), detailsValid, !!user, !!connectedWallet, !!funded, false, false][step];

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-6 sm:pt-10">
        <Header wall={wall} />
        {step < 6 && <Progress step={step} />}

        <div className="relative mt-5">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ x: dir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -60, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              // Swipe only on steps without text fields, never mid-payment.
              drag={(step >= 2 && step <= 4) || (step === 5 && !paying) ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (paying) return;
                if (info.offset.x > 90 && step > 0 && step < 6) go(step - 1);
                else if (info.offset.x < -90 && canNext && step < 5) next();
              }}
            >
              {step === 0 && (
                <PickStep
                  cents={cents} setCents={setCents} custom={custom} setCustom={setCustom}
                  customValid={customValid} wall={wall}
                />
              )}
              {step === 1 && (
                <DetailsStep
                  tier={tier} cents={cents} hoodieOpen={hoodieOpen}
                  showOnWall={showOnWall} setShowOnWall={setShowOnWall}
                  wallName={wallName} setWallName={setWallName}
                  hoodieName={hoodieName} setHoodieName={setHoodieName}
                  message={message} setMessage={setMessage}
                  defaultName={user?.displayName || user?.username || ''}
                />
              )}
              {step === 2 && <AccountStep user={user} onSignIn={openSignIn} />}
              {step === 3 && (
                <WalletStep connectedWallet={connectedWallet} isConnecting={isConnecting}
                  onConnect={async () => {
                    try { await connectWallet('pera'); } catch (e) {
                      if (!/closed|cancel/i.test(String(e?.message))) toast({ title: 'Could not connect', description: e?.message, variant: 'destructive' });
                    }
                  }}
                />
              )}
              {step === 4 && <FundStep funds={funds} cents={cents} needUsdc={needUsdc} checking={checking} onCheck={checkFunds} address={connectedWallet?.address} />}
              {step === 5 && (
                <PayStep tier={tier} cents={cents} paying={paying} error={payError} onPay={pay} onBack={() => go(0)}
                  hoodieName={tier?.hoodie && hoodieOpen ? hoodieName.trim() : ''} address={connectedWallet?.address} />
              )}
              {step === 6 && <DoneStep result={result} tier={tier} cents={cents} onShare={share} onHome={() => navigate('/')} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {wall?.wall?.length > 0 && step === 0 && <Wall wall={wall} />}
      </div>

      {step < 5 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07070a]/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            {step > 0 && (
              <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => go(step - 1)} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Button
              className="h-12 flex-1 rounded-xl bg-[#ff2d55] text-base font-bold text-white hover:bg-[#ff4d6d] disabled:opacity-40"
              disabled={!canNext}
              onClick={next}
            >
              {step === 0 ? (canNext ? `Back him with ${usd(cents)}` : 'Enter an amount') : step === 4 && !funded ? 'Waiting for USDC…' : 'Continue'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ wall }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff8099]">
        <Trophy className="h-3.5 w-3.5" /> Fight night · {FIGHT_DATE}
      </div>
      <h1 className="mt-3 font-black uppercase leading-[0.95] tracking-tight" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 'clamp(2.4rem, 9vw, 3.6rem)' }}>
        Get in Mwosa&apos;s corner
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
        Back the fight and the platform behind it. Every supporter gets exclusive Homies access at a major discount — and the bigger tiers put your name on fight night.
      </p>
      {wall && wall.payments > 0 && (
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div><span className="text-xl font-black text-white">{wall.supporters}</span> <span className="text-white/50">in his corner</span></div>
          <div><span className="text-xl font-black text-white">${Math.round(wall.totalUsd)}</span> <span className="text-white/50">raised</span></div>
        </div>
      )}
    </div>
  );
}

function Progress({ step }) {
  return (
    <div className="mt-6">
      <div className="flex gap-1.5">
        {STEPS.slice(0, 6).map((s, i) => (
          <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full bg-[#ff2d55]" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.3 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-white/40">Step {step + 1} of 6 · {STEPS[step]}</div>
    </div>
  );
}

function Card({ children, className }) {
  return <div className={cn('rounded-2xl border border-white/10 bg-white/[0.04] p-5', className)}>{children}</div>;
}

function PickStep({ cents, setCents, custom, setCustom, customValid, wall }) {
  const picked = tierFor(cents);
  return (
    <div className="space-y-3">
      {[...TIERS].reverse().map((t) => {
        const active = !custom && cents === t.cents;
        const reg = regularValue(t);
        const Icon = t.icon;
        const hoodieClosed = t.hoodie && wall && !wall.hoodieOpen;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => { setCustom(''); setCents(t.cents); }}
            className={cn(
              'relative w-full rounded-2xl border p-4 text-left transition',
              active ? 'border-[#ff2d55] bg-[#ff2d55]/10 shadow-[0_0_0_1px_#ff2d55,0_10px_40px_-10px_rgba(255,45,85,0.5)]' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
              t.featured && !active && 'border-[#ff2d55]/50',
            )}
          >
            {t.featured && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-[#ff2d55] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Biggest impact
              </span>
            )}
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', active ? 'bg-[#ff2d55] text-white' : 'bg-white/10 text-white/80')}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-bold">{t.name}</span>
                  <span className="text-right">
                    <span className="text-2xl font-black">{usd(t.cents)}</span>
                    {reg > t.cents && <span className="ml-2 text-sm text-white/40 line-through">{usd(reg)}</span>}
                  </span>
                </div>
                {reg > t.cents && (
                  <div className="mt-0.5 text-xs font-semibold text-emerald-400">
                    {Math.round((1 - t.cents / reg) * 100)}% off Homies membership
                  </div>
                )}
                <ul className="mt-2 space-y-1">
                  {t.perks.map((p) => (
                    <li key={p} className={cn('flex gap-2 text-sm text-white/75', hoodieClosed && /hoodie/i.test(p) && 'line-through opacity-50')}>
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff2d55]" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        );
      })}

      <Card className="p-4">
        <label className="text-sm font-semibold text-white/80" htmlFor="custom-amount">Or pick your own amount</label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 focus-within:border-[#ff2d55]">
          <span className="text-lg font-bold text-white/60">$</span>
          <input
            id="custom-amount"
            inputMode="decimal"
            placeholder="e.g. 20"
            value={custom}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '').slice(0, 6);
              setCustom(v);
              if (customValid(v)) setCents(Math.round(Number(v) * 100));
              else if (!v) setCents(2500);
            }}
            className="h-12 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-white/30"
          />
        </div>
        {custom && !customValid(custom) && <p className="mt-2 text-xs text-[#ff8099]">Enter $1 to $500.</p>}
        {custom && customValid(custom) && picked && (
          <p className="mt-2 text-xs text-white/60">
            Unlocks the <span className="font-semibold text-white">{picked.name}</span> perks.
            {(() => {
              const nextUp = TIERS.find((t) => t.cents > cents);
              return nextUp ? ` Add ${usd(nextUp.cents - cents)} more for ${nextUp.name}.` : '';
            })()}
          </p>
        )}
      </Card>

      <p className="px-1 text-center text-xs leading-relaxed text-white/40">
        Paid in USDC (a digital dollar, always $1) from your own wallet. 100% goes to Mwosa and the platform. We&apos;ll walk you through it.
      </p>
    </div>
  );
}

function DetailsStep({ tier, cents, hoodieOpen, showOnWall, setShowOnWall, wallName, setWallName, hoodieName, setHoodieName, message, setMessage, defaultName }) {
  const bad = (v) => v && !NAME_RE.test(v.trim());
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40">You picked</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black">{tier?.name}</span>
          <span className="text-2xl font-black text-[#ff2d55]">{usd(cents)}</span>
        </div>
      </Card>

      {tier?.hoodie && (
        <Card className="border-[#ff2d55]/40">
          <div className="flex items-center gap-2 text-base font-bold"><Shirt className="h-5 w-5 text-[#ff2d55]" /> Name on the walkout hoodie</div>
          {hoodieOpen ? (
            <>
              <p className="mt-1 text-sm text-white/60">Printed on the hoodie Mwosa wears to the ring. Letters, numbers, spaces — 20 max.</p>
              <input
                value={hoodieName}
                maxLength={20}
                onChange={(e) => setHoodieName(e.target.value)}
                placeholder={defaultName.slice(0, 20) || 'Your name'}
                className={cn('mt-3 h-12 w-full rounded-xl border bg-black/40 px-3 text-base font-semibold uppercase tracking-wide text-white outline-none placeholder:normal-case placeholder:text-white/30', bad(hoodieName) ? 'border-[#ff8099]' : 'border-white/15 focus:border-[#ff2d55]')}
              />
              {!hoodieName && <p className="mt-1.5 text-xs text-white/40">Leave it empty and we&apos;ll use your Homies name.</p>}
            </>
          ) : (
            <p className="mt-1 text-sm text-white/60">The hoodie has gone to print — the rest of your perks still apply.</p>
          )}
        </Card>
      )}

      <Card>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-base font-bold">Show me on the supporter wall</span>
            <span className="text-sm text-white/50">Your name on thehomies.app/fight</span>
          </span>
          <input type="checkbox" checked={showOnWall} onChange={(e) => setShowOnWall(e.target.checked)} className="h-6 w-6 accent-[#ff2d55]" />
        </label>
        {showOnWall && (
          <>
            <input
              value={wallName}
              maxLength={20}
              onChange={(e) => setWallName(e.target.value)}
              placeholder={defaultName || 'Name to show'}
              className={cn('mt-3 h-11 w-full rounded-xl border bg-black/40 px-3 text-white outline-none placeholder:text-white/30', bad(wallName) ? 'border-[#ff8099]' : 'border-white/15 focus:border-[#ff2d55]')}
            />
            <textarea
              value={message}
              maxLength={140}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A message for Mwosa (optional)"
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-[#ff2d55]"
            />
          </>
        )}
        {(bad(wallName) || bad(hoodieName)) && <p className="mt-2 text-xs text-[#ff8099]">Names: letters, numbers, spaces and . &apos; _ - only.</p>}
      </Card>
    </div>
  );
}

function AccountStep({ user, onSignIn }) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff2d55]/15"><Sparkles className="h-7 w-7 text-[#ff2d55]" /></div>
      <h2 className="mt-4 text-2xl font-black">Your Homies account</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">Your membership and perks land on this account the moment your payment goes through. Takes 20 seconds.</p>
      {user ? (
        <p className="mt-5 inline-flex items-center gap-2 font-semibold text-emerald-400"><CheckCircle2 className="h-5 w-5" /> Signed in as @{user.username}</p>
      ) : (
        <Button onClick={onSignIn} className="mt-6 h-12 w-full rounded-xl bg-white text-base font-bold text-black hover:bg-white/90">Sign up or sign in</Button>
      )}
    </Card>
  );
}

function Num({ n, done }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold', done ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white')}>
      {done ? <Check className="h-4 w-4" /> : n}
    </span>
  );
}

function WalletStep({ connectedWallet, isConnecting, onConnect }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff2d55]/15"><Wallet className="h-6 w-6 text-[#ff2d55]" /></div>
          <div>
            <h2 className="text-xl font-black">Get your wallet</h2>
            <p className="text-sm text-white/60">Pera is a free app that holds your digital dollars.</p>
          </div>
        </div>
        <ol className="mt-5 space-y-4">
          <li className="flex gap-3">
            <Num n={1} done={!!connectedWallet} />
            <div className="flex-1">
              <div className="font-semibold">Download Pera Wallet</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={PERA_IOS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"><Smartphone className="h-4 w-4" /> iPhone</a>
                <a href={PERA_ANDROID} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"><Smartphone className="h-4 w-4" /> Android</a>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <Num n={2} done={!!connectedWallet} />
            <div>
              <div className="font-semibold">Create a wallet</div>
              <div className="text-sm text-white/60">Tap “Create a new wallet”. Write your 25 recovery words on paper and keep them safe — nobody, including us, can recover them for you.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <Num n={3} done={!!connectedWallet} />
            <div className="flex-1">
              <div className="font-semibold">Connect it here</div>
              {connectedWallet ? (
                <div className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Connected {connectedWallet.address.slice(0, 6)}…{connectedWallet.address.slice(-4)}</div>
              ) : (
                <Button onClick={onConnect} disabled={isConnecting} className="mt-2 h-11 w-full rounded-xl bg-[#ffee58] font-bold text-black hover:bg-[#fff176]">
                  {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Connect Pera Wallet
                </Button>
              )}
            </div>
          </li>
        </ol>
      </Card>
      <p className="px-1 text-center text-xs text-white/40">Already use Pera? Just tap Connect.</p>
    </div>
  );
}

function FundStep({ funds, cents, needUsdc, checking, onCheck, address }) {
  const amount = cents / 100;
  const ready = funds && funds.optedIn && needUsdc === 0;
  const lowAlgo = funds && funds.algo < 0.3;
  const copy = async () => { try { await navigator.clipboard.writeText(address); } catch { /* ignore */ } };
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Add {usd(cents)} in USDC</h2>
          <button type="button" onClick={onCheck} className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white">
            <RefreshCw className={cn('h-3.5 w-3.5', checking && 'animate-spin')} /> Check
          </button>
        </div>

        {funds && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-black/40 p-3"><div className="text-white/50">USDC</div><div className="text-lg font-black">${funds.usdc.toFixed(2)}</div></div>
            <div className="rounded-xl bg-black/40 p-3"><div className="text-white/50">ALGO (fees)</div><div className="text-lg font-black">{funds.algo.toFixed(2)}</div></div>
          </div>
        )}

        {ready ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 font-semibold text-emerald-400"><CheckCircle2 className="h-5 w-5" /> You&apos;re ready. Tap Continue.</div>
        ) : (
          <ol className="mt-5 space-y-4">
            <li className="flex gap-3">
              <Num n={1} done={funds && funds.algo >= 0.3} />
              <div>
                <div className="font-semibold">In Pera, tap <span className="text-[#ffee58]">Buy</span> and buy ALGO with your card</div>
                <div className="text-sm text-white/60">
                  Buy about <b>${Math.ceil(amount + 3)}</b> — enough for your {usd(cents)} plus a few dollars of ALGO your wallet keeps for network fees. The card provider may ask for ID the first time.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <Num n={2} done={funds && funds.optedIn && needUsdc === 0} />
              <div>
                <div className="font-semibold">Tap <span className="text-[#ffee58]">Swap</span>: ALGO → USDC</div>
                <div className="text-sm text-white/60">
                  Swap at least <b>{needUsdc != null ? `$${(Math.ceil(needUsdc * 100) / 100).toFixed(2)}` : usd(cents)}</b> worth into USDC. Pera adds USDC to your wallet automatically. Keep a little ALGO left over.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <Num n={3} done={false} />
              <div>
                <div className="font-semibold">Come back here</div>
                <div className="text-sm text-white/60">This page checks your wallet every few seconds and moves on when the USDC lands.</div>
              </div>
            </li>
          </ol>
        )}
        {!ready && lowAlgo && funds?.optedIn && <p className="mt-3 text-xs text-[#ffb3c1]">Keep at least 0.3 ALGO in the wallet so it can hold USDC.</p>}
      </Card>
      {address && (
        <button type="button" onClick={copy} className="w-full truncate px-1 text-center text-xs text-white/35 hover:text-white/60">
          Your wallet: {address} (tap to copy)
        </button>
      )}
    </div>
  );
}

function PayStep({ tier, cents, paying, error, onPay, onBack, hoodieName, address }) {
  return (
    <div className="space-y-4">
      {!paying && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Change amount
        </button>
      )}
      <Card className="border-[#ff2d55]/40 bg-gradient-to-b from-[#ff2d55]/15 to-transparent">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/50">You&apos;re backing Mwosa</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-2xl font-black">{tier?.name}</span>
          <span className="text-4xl font-black">{usd(cents)}</span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {tier?.perks.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-white/80"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff2d55]" /> {p}</li>
          ))}
        </ul>
        {hoodieName && <div className="mt-3 rounded-lg bg-black/40 px-3 py-2 text-sm">Hoodie name: <b className="uppercase">{hoodieName}</b></div>}
      </Card>

      <Button onClick={onPay} disabled={paying} className="h-14 w-full rounded-2xl bg-[#ff2d55] text-lg font-black text-white hover:bg-[#ff4d6d]">
        {paying ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Approve in Pera…</> : <>Pay {usd(cents)} from my wallet</>}
      </Button>
      {paying && <p className="text-center text-sm text-white/60">Open Pera and tap <b>Confirm</b>. Network fees are covered for you.</p>}
      {error && <p className="rounded-xl bg-[#ff2d55]/15 p-3 text-center text-sm text-[#ffb3c1]">{error}</p>}
      <p className="text-center text-xs text-white/40">
        Paid in USDC on Algorand from {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'your wallet'}. Payments are final.
      </p>
    </div>
  );
}

function DoneStep({ result, tier, cents, onShare, onHome }) {
  const granted = result?.status === 'paid';
  const rejected = result?.status === 'rejected';
  const days = result?.membershipDays || 0;
  return (
    <div className="space-y-4 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ff2d55]">
        <Trophy className="h-10 w-10 text-white" />
      </motion.div>
      <h2 className="text-3xl font-black uppercase" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif' }}>You&apos;re in his corner</h2>
      <p className="text-white/70">{usd(result?.amountCents || cents)} sent. Thank you for backing the fight and the platform.</p>

      <Card className="text-left">
        {rejected ? (
          <p className="text-sm text-[#ffb3c1]">We couldn&apos;t match your payment automatically. Mwosa&apos;s team has been alerted and will sort out your perks.</p>
        ) : result?.status === 'slow' ? (
          <p className="text-sm text-white/70">Your payment went through and is still confirming. Your perks will be added shortly. Keep the receipt below.</p>
        ) : granted ? (
          <ul className="space-y-2 text-sm">
            {days > 0 && (
              <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                {result.membershipGranted ? `${days >= 365 ? '1 year' : `${Math.round(days / 30)} month${days >= 60 ? 's' : ''}`} of Homies membership is active` : 'Membership will be added by the team'}
              </li>
            )}
            {result.hoodieName && <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> “{result.hoodieName}” is going on the hoodie</li>}
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> {tier?.perks?.[tier.perks.length - 1]}</li>
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" /> Unlocking your perks…</p>
        )}
        {result?.txId && (
          <a href={`https://allo.info/tx/${result.txId}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
            View receipt on Algorand <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Card>

      <Button onClick={onShare} className="h-12 w-full rounded-xl bg-white text-base font-bold text-black hover:bg-white/90"><Share2 className="mr-2 h-5 w-5" /> Bring your people</Button>
      <Button onClick={onHome} variant="ghost" className="h-12 w-full rounded-xl text-white/70 hover:bg-white/10 hover:text-white">Go to The Homies</Button>
    </div>
  );
}

function Wall({ wall }) {
  return (
    <div className="mt-10">
      <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">In his corner</h3>
      <div className="mt-3 space-y-2">
        {wall.wall.slice(0, 30).map((w, i) => (
          <div key={`${w.username}-${w.at}-${i}`} className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
            <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black', w.tier === 'champion' ? 'bg-[#ffee58] text-black' : 'bg-white/10')}>
              {w.tier === 'champion' ? <Crown className="h-4 w-4" /> : (w.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{w.name}</div>
              {w.message && <div className="text-sm text-white/60">{w.message}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
