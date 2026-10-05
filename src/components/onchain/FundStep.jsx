import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, Num, usd } from './ui';

// "Add funds" step shared by /sponsor and /fight. Coinbase is the default
// (Pera's in-app Buy is blocked in New York, where most supporters are): buy
// ALGO + USDC there and send both to Pera. Pera Buy + Swap is the fast option
// outside NY. Fans always fund their own wallet — we never send them crypto
// (that would be self-payment under the x402 challenge rules). The parent polls walletStatus() and
// passes the result in as `funds`.
// actionWord: what they do once funded ("pay", "place your bet").
// error: optional message from a failed payment that bounced the fan back here.
export default function FundStep({ funds, cents, needUsdc, checking, onCheck, address, onSkip, actionWord = 'pay', error = '' }) {
  const amount = cents / 100;
  const ready = funds && funds.optedIn && needUsdc === 0;
  const lowAlgo = funds && funds.algo < 0.3;
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState('coinbase');
  const copiedTimer = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  const hasAlgo = funds && funds.algo >= 0.3;
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-[#ff2d55]/15 p-3 text-center text-sm text-[#ffb3c1]">{error}</p>}
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
          <>
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1 text-sm font-semibold" role="group" aria-label="How to get USDC">
              {[['coinbase', 'Coinbase'], ['pera', 'Pera Buy (not NY)']].map(([k, label]) => (
                <button key={k} type="button" aria-pressed={method === k} onClick={() => setMethod(k)}
                  className={cn('rounded-lg px-2 py-2 transition', method === k ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>
                  {label}
                </button>
              ))}
            </div>
            {method === 'coinbase' ? (
              <ol className="mt-5 space-y-4">
                <li className="flex gap-3">
                  <Num n={1} done={hasAlgo && funds?.usdc > 0} />
                  <div>
                    <div className="font-semibold">On Coinbase, buy about <span className="text-[#ffee58]">$3 of ALGO</span> and <span className="text-[#ffee58]">{usd(cents + 100)} of USDC</span></div>
                    <div className="text-sm text-white/60">The extra $1 covers Coinbase&apos;s fee for sending it out. The ALGO lets your wallet hold USDC and covers tiny network fees. Use a debit card if you can: bank transfers can be held for days.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Num n={2} done={hasAlgo} />
                  <div>
                    <div className="font-semibold">Send the ALGO to your Pera wallet first</div>
                    <div className="text-sm text-white/60">In Coinbase: <b>Send</b> → ALGO → paste your Pera address (copy it below). No memo needed.</div>
                    {address && (
                      <button type="button" onClick={copy} className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10">
                        {copied ? 'Copied ✔' : 'Copy my Pera address'}
                      </button>
                    )}
                  </div>
                </li>
                <li className="flex gap-3">
                  <Num n={3} done={funds && funds.optedIn} />
                  <div>
                    <div className="font-semibold">In Pera, add <span className="text-[#ffee58]">USDC</span></div>
                    <div className="text-sm text-white/60">Tap <b>+</b> / Add asset, search USDC and pick the one with ID <b>31566704</b>. It uses a tiny bit of the ALGO.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Num n={4} done={funds && funds.optedIn && needUsdc === 0} />
                  <div>
                    <div className="font-semibold">Send the USDC to Pera on the <span className="text-[#ffee58]">Algorand</span> network</div>
                    <div className="text-sm text-white/60">In Coinbase: <b>Send</b> → USDC → same Pera address. When it asks for a network, pick <b>Algorand</b>. Any other network can lose the money.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Num n={5} done={false} />
                  <div>
                    <div className="font-semibold">Come back here and {actionWord}</div>
                    <div className="text-sm text-white/60">This page checks your wallet every few seconds and moves on when the USDC lands.</div>
                  </div>
                </li>
              </ol>
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
                  <div className="font-semibold">Come back here and {actionWord}</div>
                  <div className="text-sm text-white/60">This page checks your wallet every few seconds. When the USDC lands it opens the {actionWord === 'pay' ? 'payment' : 'next'} screen, where you approve the {usd(cents)} in Pera.</div>
                </div>
              </li>
            </ol>
            )}
          </>
        )}
        {!ready && lowAlgo && funds?.optedIn && <p className="mt-3 text-xs text-[#ffb3c1]">Keep at least 0.3 ALGO in the wallet so it can hold USDC.</p>}
      </Card>
      {!funds && (
        <button type="button" onClick={onSkip} className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          Already have USDC? Go straight to {actionWord === 'pay' ? 'payment' : 'the next step'} <ArrowRight className="ml-1 inline h-4 w-4" />
        </button>
      )}
      {address && (
        <button type="button" onClick={copy} className="w-full truncate px-1 text-center text-xs text-white/35 hover:text-white/60">
          Your wallet: {address} ({copied ? 'copied ✔' : 'tap to copy'})
        </button>
      )}
    </div>
  );
}
