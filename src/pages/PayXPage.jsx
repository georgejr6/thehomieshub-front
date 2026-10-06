import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { CheckCircle2, ExternalLink, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { payX402, walletStatus } from '@/lib/x402Pay';
import { Card, usd, shortAddr } from '@/components/onchain/ui';
import WalletStep from '@/components/onchain/WalletStep';
import FundStep from '@/components/onchain/FundStep';

// /payx — the shortest x402 path: pick an amount, connect a wallet, pay. No Homies
// account and no intent: the gateway's /support takes anonymous payments, which
// settle through the facilitator (so they count on the x402 leaderboard) but carry
// no perks (perks need /sponsor's signed ref). Fans always pay from their OWN
// wallet; we never fund them (self-payment rule).
const GATEWAY = (import.meta.env.VITE_X402_GATEWAY_URL || 'https://digitvl-x402-gateway-production.up.railway.app').replace(/\/$/, '');
const PRESETS = [1, 5, 10, 25, 50];
const MIN = 1;
const MAX = 500;

export default function PayXPage() {
  const { connectedWallet, connectWallet, signTransactions, isConnecting } = useWallet();
  const { toast } = useToast();
  const [preset, setPreset] = useState(5);
  const [custom, setCustom] = useState('');
  const [funds, setFunds] = useState(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { txId, cents }
  const [readFailed, setReadFailed] = useState(false);
  const payLock = useRef(false);

  const n = custom !== '' ? Math.round(Number(custom) * 100) / 100 : preset;
  const valid = Number.isFinite(n) && n >= MIN && n <= MAX;
  const cents = valid ? Math.round(n * 100) : 0;
  const address = connectedWallet?.address;

  const addrRef = useRef(address);
  addrRef.current = address;
  const checkFunds = useCallback(async () => {
    if (!address) return;
    setChecking(true);
    try {
      const f = await walletStatus(address);
      if (addrRef.current === address) { setFunds(f); setReadFailed(false); } // ignore a late answer for a wallet they switched away from
    } catch {
      if (addrRef.current === address) setReadFailed(true);
    }
    setChecking(false);
  }, [address]);
  useEffect(() => { setFunds(null); checkFunds(); }, [checkFunds]);

  const needUsdc = funds && valid ? Math.max(0, cents / 100 - funds.usdc) : null;
  const funded = !!funds && funds.optedIn && needUsdc === 0;
  // While they're off adding USDC, keep checking.
  useEffect(() => {
    if (!address || funded || done) return undefined;
    const t = setInterval(checkFunds, 10000);
    return () => clearInterval(t);
  }, [address, funded, done, checkFunds]);

  const connect = async () => {
    try { await connectWallet('pera'); } catch (e) {
      if (!/closed|cancel/i.test(String(e?.message))) toast({ title: 'Could not connect', description: e?.message, variant: 'destructive' });
    }
  };

  const pay = async () => {
    if (!valid || !address || payLock.current) return;
    payLock.current = true;
    setPaying(true); setError('');
    try {
      const { txId } = await payX402(`${GATEWAY}/support?amount=${(cents / 100).toFixed(2)}`, { address, signTransactions });
      setDone({ txId, cents });
      checkFunds();
    } catch (e) {
      const msg = e?.message || 'Payment failed.';
      setError(e?.code === 'funds' || e?.code === 'optin' ? msg : `${msg} Check your wallet's history before trying again, in case it went through.`);
      if (e?.code === 'funds' || e?.code === 'optin') checkFunds();
    } finally {
      payLock.current = false;
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-8 sm:pt-12">
      <Helmet>
        <title>Pay with USDC (x402) · The Homies</title>
        <meta name="description" content="Back The Homies and DIGITVL in USDC on Algorand through x402. No account needed." />
        <link rel="canonical" href="https://www.thehomies.app/payx" />
      </Helmet>

      <header className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Zap className="h-7 w-7 text-primary" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Pay with USDC</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gray-400">
          Send USDC on Algorand straight from your wallet through x402. No account, no sign-up.
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
          Want the supporter wall, a hoodie with your name and membership? Use <a href="/sponsor" className="text-primary hover:underline">/sponsor</a> instead.
        </p>
      </header>

      {done ? (
        <Card className="mt-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
          <h2 className="mt-3 text-2xl font-black text-white">Thank you!</h2>
          <p className="mt-2 text-sm text-gray-300">{usd(done.cents)} USDC went through on Algorand.</p>
          {done.txId && (
            <a href={`https://allo.info/tx/${done.txId}`} target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              View the transaction <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button type="button" onClick={() => setDone(null)} className="mt-6 block w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white hover:border-white/40">
            Send another
          </button>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          <Card>
            <h2 className="text-base font-semibold text-white">1. Amount</h2>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Amount">
              {PRESETS.map((p) => {
                const on = custom === '' && preset === p;
                return (
                  <button key={p} type="button" role="radio" aria-checked={on} onClick={() => { setPreset(p); setCustom(''); }}
                    className={cn('h-12 rounded-xl border text-base font-semibold transition',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-white/15 text-white hover:border-white/40')}>
                    ${p}
                  </button>
                );
              })}
              <label className={cn('flex h-12 items-center rounded-xl border', custom !== '' ? 'border-primary' : 'border-white/15')}>
                <span className="pl-3 font-semibold text-gray-400">$</span>
                <input type="number" inputMode="decimal" min={MIN} max={MAX} placeholder="Other" aria-label="Other amount"
                  value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 6))}
                  className="h-full w-full min-w-0 bg-transparent pl-1 pr-2 text-base font-semibold text-white outline-none placeholder:font-normal placeholder:text-gray-500" />
              </label>
            </div>
            {custom !== '' && !valid && <p className="mt-2 text-sm text-amber-400">Enter $1 to $500.</p>}
          </Card>

          {!address ? (
            <div>
              <h2 className="mb-2 px-1 text-base font-semibold text-white">2. Connect your wallet</h2>
              <WalletStep connectedWallet={connectedWallet} isConnecting={isConnecting} onConnect={connect} />
            </div>
          ) : (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">2. Wallet</h2>
                  <p className="text-sm text-gray-400">{shortAddr(address)}{funds ? ` · ${funds.usdc.toFixed(2)} USDC` : ''}</p>
                </div>
                {checking && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
              {readFailed && !funds && (
                <p className="mt-2 text-sm text-amber-400">
                  Couldn't read your wallet. <button type="button" onClick={checkFunds} className="font-semibold underline">Try again</button>
                </p>
              )}
            </Card>
          )}

          {address && valid && funds && !funded && (
            <div>
              <h2 className="mb-2 px-1 text-base font-semibold text-white">3. Add USDC</h2>
              <FundStep funds={funds} cents={cents} needUsdc={needUsdc} checking={checking} onCheck={checkFunds} address={address} error={error} />
            </div>
          )}

          {address && funded && (
            <Card>
              {error && <p role="alert" className="mb-3 rounded-xl bg-[#ff2d55]/15 p-3 text-center text-sm text-[#ffb3c1]">{error}</p>}
              <button type="button" onClick={pay} disabled={!valid || paying}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" fill="currentColor" />}
                {paying ? 'Approve in your wallet…' : `Pay ${usd(cents)} USDC`}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">Paid through x402 on Algorand. You approve it in your wallet. No network fee for the payment itself (your wallet just needs a little ALGO to hold USDC).</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
