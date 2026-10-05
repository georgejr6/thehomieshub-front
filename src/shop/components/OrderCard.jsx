import React from 'react';
import { Check, Clock, Package, Truck, XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usd } from '@/shop/lib/pricing';

// Order status in plain words, with a little progress track.
export const STATUS = {
  awaiting_approval: { label: 'Quick check', icon: Sparkles, body: 'Paid ✓ — our team is giving your custom piece a quick look before printing. Usually within a day.' },
  processing: { label: 'Processing', icon: Clock, body: 'Paid ✓ — getting it ready for print.' },
  submitted: { label: 'Being printed', icon: Package, body: "It's at the print shop now." },
  on_hold: { label: 'On hold', icon: Clock, body: "There's a small hold-up — we're on it and will email you." },
  shipped: { label: 'Shipped', icon: Truck, body: 'On its way to you.' },
  canceled: { label: 'Canceled', icon: XCircle, body: 'This order was canceled.' },
  rejected: { label: 'Refunded', icon: XCircle, body: "We couldn't print this one, so you've been refunded in full." },
};
const TRACK = ['processing', 'submitted', 'shipped'];

export default function OrderCard({ order }) {
  const s = STATUS[order.status] || { label: order.status, icon: Clock, body: '' };
  const Icon = s.icon;
  const stage = order.status === 'awaiting_approval' ? 0 : TRACK.indexOf(order.status);
  const ended = ['canceled', 'rejected'].includes(order.status);
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111113] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl">Order #{order.number}</p>
          {order.createdAt && <p className="text-xs text-white/45">{new Date(order.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
          order.status === 'shipped' ? 'bg-[#1f8f4e]/20 text-[#7be0a5]' : ended ? 'bg-white/10 text-white/60' : 'bg-[#f0b94d]/15 text-[#f6d48f]')}>
          <Icon className="h-3.5 w-3.5" /> {s.label}
        </span>
      </div>
      {s.body && <p className="mt-3 text-sm text-white/65">{s.body}</p>}
      {!ended && stage >= 0 && (
        <div className="mt-4 flex items-center gap-2" aria-hidden>
          {TRACK.map((t, i) => (
            <React.Fragment key={t}>
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px]', i <= stage ? 'bg-[#f0b94d] text-black' : 'bg-white/10 text-white/40')}>{i < stage || (i === stage && t === 'shipped') ? <Check className="h-3 w-3" /> : i + 1}</span>
              {i < TRACK.length - 1 && <span className={cn('h-px flex-1', i < stage ? 'bg-[#f0b94d]' : 'bg-white/10')} />}
            </React.Fragment>
          ))}
        </div>
      )}
      <ul className="mt-5 space-y-1.5 border-t border-white/[0.07] pt-4 text-sm">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{i.name}{i.variantName ? <span className="text-white/45"> · {i.variantName}</span> : null} × {i.quantity}</span>
            <span className="shrink-0">{usd(i.unitCents * i.quantity)}</span>
          </li>
        ))}
        {order.shippingCents > 0 && <li className="flex justify-between text-white/50"><span>Shipping</span><span>{usd(order.shippingCents)}</span></li>}
        <li className="flex justify-between border-t border-white/[0.07] pt-2 font-semibold"><span>Total</span><span>{usd(order.totalCents)}</span></li>
      </ul>
      {order.shipments?.length > 0 && (
        <div className="mt-4 space-y-1 text-sm">
          {order.shipments.map((sh, n) => (
            <p key={n} className="text-white/70">
              {sh.carrier || 'Shipped'}{sh.trackingNumber ? ` · ${sh.trackingNumber}` : ''}{' '}
              {/^https:\/\//.test(sh.trackingUrl || '') && <a href={sh.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#f0b94d] underline-offset-4 hover:underline">Track package</a>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
