import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CreditCard, Gift, HeartHandshake, Lock } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';

// Donate / gift a membership from the /live chat, in dollars (Stripe).
// With a saved card the pay button IS the confirmation ("Pay $10 · Visa ••
// 4242") and charges right away; otherwise it opens Stripe's secure checkout,
// which saves the card so the next one is one tap. Backend: utils/live/pay.js.

export const fmtUsd = (c) => `$${((c || 0) / 100).toFixed(2).replace(/\.00$/, '')}`;
const newRequestId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function PaySheet({ open, tab: initialTab = 'donate', preset = {}, catalog, card, onClose, onDone }) {
  const [tab, setTab] = useState(initialTab);
  const [cents, setCents] = useState(preset.amountCents || 500);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState(preset.message || '');
  const [to, setTo] = useState(preset.to || '');
  const [forMe, setForMe] = useState(false);
  const [plan, setPlan] = useState(preset.plan || 'homies_1m');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(newRequestId());
  const closeBtn = useRef(null);

  // Fresh state every time it opens (a new request id = a new payment).
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setCents(preset.amountCents || 500);
    setCustom(preset.amountCents && !(catalog?.donation?.presets || []).includes(preset.amountCents) ? String(preset.amountCents / 100) : '');
    setMessage(preset.message || '');
    setTo(preset.to || '');
    setForMe(false);
    setPlan(preset.plan || 'homies_1m');
    setError('');
    setBusy(false);
    requestId.current = newRequestId();
    setTimeout(() => closeBtn.current?.focus(), 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // A different payment (amount, message, recipient, plan) = a new idempotency key.
  useEffect(() => { requestId.current = newRequestId(); }, [tab, cents, custom, message, to, forMe, plan]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, busy, onClose]);

  const d = catalog?.donation || { minCents: 100, maxCents: 100000, presets: [200, 500, 1000, 2000, 5000], tiers: [] };
  const gifts = catalog?.gifts || [];
  const amount = custom ? Math.round(Number(custom) * 100) : cents;
  const amountOk = Number.isFinite(amount) && amount >= d.minCents && amount <= d.maxCents;
  const tier = useMemo(() => [...(d.tiers || [])].reverse().find((t) => amount >= t.min), [d.tiers, amount]);
  const giftPlan = gifts.find((g) => g.id === plan);
  const total = tab === 'donate' ? amount : giftPlan?.amountCents;
  const toName = to.replace(/^@/, '').trim();
  const canPay = !busy && (tab === 'donate' ? amountOk : !!giftPlan && (forMe || toName.length > 0));

  const pay = async () => {
    if (!canPay) return;
    setBusy(true);
    setError('');
    try {
      const body = tab === 'donate'
        ? { kind: 'donation', amountCents: amount, message: message.trim(), requestId: requestId.current }
        : { kind: 'gift', plan, to: forMe ? undefined : toName, requestId: requestId.current };
      const { data } = await api.post('/livechat/pay', body);
      const r = data.result;
      if (r.status === 'checkout' && r.url) { window.location.href = r.url; return; }
      if (r.payment?.status === 'refunded' || r.payment?.status === 'failed') throw new Error(r.payment.reason || "That gift couldn't be applied — you weren't charged.");
      onDone?.(r);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't complete the payment.");
      // Only a definite refusal (4xx) gets a new id. After a timeout / 5xx the
      // charge may have gone through, so a retry must reuse the same
      // idempotency key and can never charge twice.
      const st = err.response?.status;
      if (st >= 400 && st < 500) requestId.current = newRequestId();
      setBusy(false);
    }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={tab === 'donate' ? 'Donate' : 'Gift a membership'}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="live-sheet-up relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#141518] text-white shadow-2xl sm:rounded-3xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-2 sm:hidden"><span className="h-1 w-10 rounded-full bg-white/20" /></div>
        <div className="flex items-center gap-2 px-5 pb-2 pt-3">
          <div className="flex rounded-full bg-white/[0.06] p-1 text-sm font-semibold">
            <button type="button" onClick={() => setTab('donate')} className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors', tab === 'donate' ? 'bg-white text-black' : 'text-white/70 hover:text-white')}>
              <HeartHandshake className="h-4 w-4" /> Donate
            </button>
            <button type="button" onClick={() => setTab('gift')} className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors', tab === 'gift' ? 'bg-white text-black' : 'text-white/70 hover:text-white')}>
              <Gift className="h-4 w-4" /> Gift membership
            </button>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} disabled={busy} aria-label="Close" className="ml-auto rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto px-5 pb-5">
          {tab === 'donate' ? (
            <>
              <p className="mb-3 text-sm text-white/60">Support the stream. Your message is pinned in chat{tier?.pinMinutes ? ` for ${tier.pinMinutes} min` : ''} and shows on stream.</p>
              <div className="grid grid-cols-5 gap-2">
                {d.presets.map((c) => (
                  <button key={c} type="button" onClick={() => { setCents(c); setCustom(''); }}
                    className={cn('rounded-xl border py-2.5 text-sm font-bold transition-all', !custom && cents === c ? 'scale-[1.03] border-transparent bg-white text-black' : 'border-white/10 bg-white/[0.04] hover:bg-white/10')}>
                    {fmtUsd(c)}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-white/30">
                <span className="text-white/50">$</span>
                <input inputMode="decimal" placeholder="Other amount" value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/, '$1'))}
                  className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30" />
              </label>
              {custom && !amountOk && <p className="mt-1.5 text-xs text-[#ff8a80]">Between {fmtUsd(d.minCents)} and {fmtUsd(d.maxCents)}.</p>}
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} rows={2} placeholder="Add a message (optional)"
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
              {amountOk && (
                <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: `${tier?.color || '#1E88E5'}66` }}>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold" style={{ background: tier?.color || '#1E88E5' }}>
                    <span>Preview</span><span>{fmtUsd(amount)}</span>
                  </div>
                  <div className="px-3 py-2 text-sm text-white/85" style={{ background: `${tier?.color || '#1E88E5'}22` }}>{message.trim() || 'Your message shows here'}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-white/60">Buy Homies membership time for someone in chat — they get it instantly, and chat sees it.</p>
              <div className="flex items-center gap-2">
                <label className={cn('flex flex-1 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-white/30', forMe && 'opacity-40')}>
                  <span className="text-white/50">@</span>
                  <input value={forMe ? '' : to} disabled={forMe} onChange={(e) => setTo(e.target.value.replace(/\s/g, '').slice(0, 40))} placeholder="username"
                    className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30" />
                </label>
                <button type="button" onClick={() => setForMe((v) => !v)} className={cn('rounded-xl border px-3 py-2.5 text-sm font-semibold', forMe ? 'border-transparent bg-white text-black' : 'border-white/10 bg-white/[0.04] hover:bg-white/10')}>For me</button>
              </div>
              <div className="mt-3 grid gap-2">
                {gifts.map((g) => (
                  <button key={g.id} type="button" onClick={() => setPlan(g.id)}
                    className={cn('flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all', plan === g.id ? 'border-[#F0B94D] bg-[#F0B94D]/15' : 'border-white/10 bg-white/[0.04] hover:bg-white/10')}>
                    <span className="font-semibold">{g.label}</span>
                    <span className="font-bold text-[#F0B94D]">{fmtUsd(g.amountCents)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <p className="mt-3 rounded-lg bg-[#ff5252]/15 px-3 py-2 text-sm text-[#ff8a80]">{error}</p>}

          <button type="button" onClick={pay} disabled={!canPay}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff3d5a] to-[#ff7a45] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#ff3d5a]/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
            {card ? `Pay ${fmtUsd(total)} · ${card.brand?.toUpperCase?.() || 'Card'} •• ${card.last4}` : `Continue · ${fmtUsd(total)}`}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
            <Lock className="h-3 w-3" />
            {card ? 'Charged right away to your saved card. Receipt by email.' : 'Secure checkout by Stripe — your card is saved so next time is one tap.'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
