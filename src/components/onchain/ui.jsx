import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shared building blocks for the on-chain step flows (/sponsor, /fight).

export const usd = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export function Card({ children, className }) {
  return <div className={cn('rounded-2xl border border-white/10 bg-white/[0.04] p-5', className)}>{children}</div>;
}

export function Num({ n, done }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold', done ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white')}>
      {done ? <Check className="h-4 w-4" /> : n}
    </span>
  );
}

// Tap a segment to jump to any step you've already reached.
// `steps` = labels of the steps that show in the bar (the final "Done" step is left out).
export function StepProgress({ steps, step, reachable, onJump }) {
  return (
    <div className="mt-6">
      <div className="flex gap-1.5">
        {steps.map((s, i) => {
          const can = i !== step && reachable(i);
          return (
            <button
              key={s}
              type="button"
              disabled={!can}
              onClick={() => onJump(i)}
              aria-label={`Step ${i + 1}: ${s}`}
              className={cn('flex-1 py-2', can ? 'cursor-pointer' : 'cursor-default')}
            >
              <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.span className="block h-full bg-[#ff2d55]" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.3 }} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">Step {step + 1} of {steps.length} · {steps[step]}</div>
    </div>
  );
}
