import React from 'react';
import { ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, Num, usd } from './ui';

// "Add funds" step shared by /sponsor and /fight: walks a fan through buying
// ALGO in Pera and swapping it to USDC. The parent polls walletStatus() and
// passes the result in as `funds`.
// actionWord: what they do once funded ("pay", "place your bet").
export default function FundStep({ funds, cents, needUsdc, checking, onCheck, address, onSkip, actionWord = 'pay' }) {
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
                <div className="font-semibold">Come back here and {actionWord}</div>
                <div className="text-sm text-white/60">This page checks your wallet every few seconds. When the USDC lands it opens the next screen, where you approve the {usd(cents)} in Pera.</div>
              </div>
            </li>
          </ol>
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
          Your wallet: {address} (tap to copy)
        </button>
      )}
    </div>
  );
}
