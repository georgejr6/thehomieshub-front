import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { CheckCircle2, ExternalLink, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { payX402, walletStatus } from '@/lib/x402Pay';
import { usd, shortAddr } from '@/components/onchain/ui';

// /payx — one box: amount, connect Pera, pay through x402 (gateway /support, no ref:
// anonymous, counts on the x402 leaderboard, no perks). Visitors already have Pera +
// USDC, so no onboarding. Fans pay from their OWN wallet; we never fund them.
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
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { txId, cents }
  const payLock = useRef(false);

  const n = custom !== '' ? Math.round(Number(custom) * 100) / 100 : preset;
  const valid = Number.isFinite(n) && n >= MIN && n <= MAX;
  const cents = valid ? Math.round(n * 100) : 0;
  const address = connectedWallet?.address;

  const addrRef = useRef(address);
  addrRef.current = address;
  const checkFunds = useCallback(async () => {
    if (!address) return;
    try {
      const f = await walletStatus(address);
      if (addrRef.current === address) setFunds(f); // ignore a late answer for a wallet they switched away from
    } catch { /* balance is only a hint; paying still works */ }
  }, [address]);
  useEffect(() => { setFunds(null); checkFunds(); }, [checkFunds]);

  const short = funds && valid && (!funds.optedIn || funds.usdc < cents / 100);

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
      setError(e?.code === 'funds' || e?.code === 'optin' ? msg : `${msg} Check your wallet history before trying again.`);
      checkFunds();
    } finally {
      payLock.current = false;
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-10 sm:pt-16">
      <Helmet>
        <title>Pay with x402 · The Homies</title>
        <link rel="canonical" href="https://www.thehomies.app/payx" />
      </Helmet>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
            <p className="mt-3 text-xl font-bold text-white">{usd(done.cents)} USDC sent</p>
            {done.txId && (
              <a href={`https://allo.info/tx/${done.txId}`} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                View transaction <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button type="button" onClick={() => setDone(null)} className="mt-5 block w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white hover:border-white/40">
              Send another
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-white">Pay with x402</h1>
            <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Amount">
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
            {custom !== '' && !valid && <p className="mt-2 text-sm text-amber-400">$1 to $500</p>}

            {address && (
              <p className="mt-4 text-sm text-gray-400">
                {shortAddr(address)}{funds ? ` · ${funds.optedIn ? funds.usdc.toFixed(2) : '0.00'} USDC` : ''}
              </p>
            )}
            {address && short && <p className="mt-1 text-sm text-amber-400">Not enough USDC in this wallet.</p>}
            {error && <p role="alert" className="mt-3 rounded-xl bg-[#ff2d55]/15 p-3 text-sm text-[#ffb3c1]">{error}</p>}

            {!address ? (
              <button type="button" onClick={connect} disabled={isConnecting}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
                {isConnecting && <Loader2 className="h-5 w-5 animate-spin" />}
                Connect Pera
              </button>
            ) : (
              <button type="button" onClick={pay} disabled={!valid || paying}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" fill="currentColor" />}
                {paying ? 'Approve in Pera…' : `Pay ${valid ? usd(cents) : ''} USDC`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
