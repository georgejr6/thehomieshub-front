import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Displays a dollar amount as "USD" with a small ⓘ that explains
 * USDC and Algorand when tapped/clicked.
 *
 * Props:
 *   amount  — number (already in dollars, e.g. 25.00)
 *   size    — 'sm' | 'md' | 'lg'  (controls font sizing)
 *   className — extra classes for the amount span
 */
const USDInfoBadge = ({ amount, size = 'md', className = '' }) => {
  const formatted = amount === null || amount === undefined
    ? '—'
    : `$${Number(amount).toFixed(2)}`;

  const textSize = {
    sm:  'text-sm',
    md:  'text-base',
    lg:  'text-2xl',
  }[size] ?? 'text-base';

  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className={`font-bold tabular-nums ${textSize}`}>{formatted}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
            aria-label="What currency is this?"
          >
            USD
            <Info className="h-3 w-3 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-72 p-4 bg-zinc-900 border border-white/10 rounded-xl space-y-3 text-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              {/* USDC pill */}
              <span className="mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-wide">
                USDC
              </span>
              <div>
                <p className="font-semibold text-white text-xs mb-0.5">USD Coin (USDC)</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  A <span className="text-white font-medium">stablecoin</span> always
                  worth exactly <span className="text-white font-medium">$1.00 USD</span>.
                  Issued by Circle, backed 1:1 with real dollars. You bet in dollars —
                  no crypto price swings.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1 border-t border-white/5">
              {/* Algorand pill */}
              <span className="mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary uppercase tracking-wide">
                ALGO
              </span>
              <div>
                <p className="font-semibold text-white text-xs mb-0.5">Algorand Blockchain</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  USDC lives on the <span className="text-white font-medium">Algorand</span>{' '}
                  network — one of the fastest, cheapest blockchains available. Transactions
                  settle in ~4 seconds for a fraction of a cent.
                </p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/70 border-t border-white/5 pt-2">
            Payouts go directly to your Pera Wallet — no platform holds your money.
          </p>
        </PopoverContent>
      </Popover>
    </span>
  );
};

export default USDInfoBadge;
