import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// Stream safety for admin screens: IP addresses and IP-based locations are
// masked (•••) until the owner deliberately hits "Show IPs". Off on every
// page load, never remembered, and turns itself back off after 5 minutes.
let revealed = false;
let timer = null;
const listeners = new Set();
const set = (v) => {
  revealed = v;
  clearTimeout(timer);
  if (v) timer = setTimeout(() => set(false), 5 * 60 * 1000);
  listeners.forEach((fn) => fn(v));
};

export function useReveal() {
  const [v, setV] = useState(revealed);
  useEffect(() => { listeners.add(setV); return () => listeners.delete(setV); }, []);
  return v;
}

// Wrap any IP / location text. Hidden = placeholder text (nothing to read in
// the DOM or a screen share), not just a blur.
export function Sensitive({ children, className, mask = '•••.•••.•••' }) {
  const shown = useReveal();
  if (children == null || children === '') return null;
  return shown
    ? <span className={className}>{children}</span>
    : <span className={cn(className, 'select-none tracking-widest text-muted-foreground/60')} title="Hidden. Use Show IPs.">{mask}</span>;
}
// For places that need a string (labels, props).
export const sensitiveText = (value, shown, mask = '•••.•••.•••') => (shown ? value : mask);

export function RevealToggle({ className }) {
  const shown = useReveal();
  return (
    <button type="button" onClick={() => set(!shown)}
      className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
        shown ? 'border-amber-500/50 bg-amber-500/15 text-amber-400' : 'border-white/15 text-muted-foreground hover:text-foreground', className)}
      title={shown ? 'IPs are visible (auto-hides in 5 min)' : 'IPs are hidden (stream-safe)'}>
      {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {shown ? 'Hide IPs' : 'Show IPs'}
    </button>
  );
}
