import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CreditCard, Coins, Bitcoin, Lock, ChevronLeft, HeartHandshake } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { fmtUsd } from '@/components/live/PaySheet';

// "Send money" from the chat composer's + menu: a tip to The Homies, posted
// in the channel as a highlighted card. Step 1 picks how to pay, step 2 the
// amount. Card = the /live donation flow (utils/live/pay.js with channelId):
// saved card → one tap, otherwise Stripe Checkout (Apple Pay / Google Pay /
// card), which returns to this channel. Points hand off to the shoutout
// sheet. Crypto shows but stays locked until crypto onboarding exists.

const PRESETS = [200, 500, 1000, 2000, 5000];
const MIN = 100;
const MAX = 100000;
const newRequestId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function Method({ icon: Icon, title, desc, accent, onClick, locked }) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      aria-disabled={locked}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all',
        locked ? 'cursor-not-allowed' : 'hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.99]'
      )}
    >
      <div className={cn('flex w-full items-center gap-3', locked && 'select-none blur-[3px] opacity-60')}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}26`, color: accent }}><Icon className="h-6 w-6" /></span>
        <span className="min-w-0">
          <span className="block font-semibold text-white">{title}</span>
          <span className="block text-sm text-white/55">{desc}</span>
        </span>
      </div>
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <Lock className="h-3.5 w-3.5" /> Coming soon
          </span>
        </span>
      )}
    </button>
  );
}

export default function SendMoneySheet({ open, channel, onClose, onDone, onPoints }) {
  const [step, setStep] = useState('method'); // 'method' | 'card'
  const [cents, setCents] = useState(500);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(newRequestId());
  // After a timeout / 5xx the charge may have gone through: until a definite
  // answer, every retry (even after reopening or editing) reuses the same key,
  // so it can never charge twice (Stripe refuses a changed amount on that key).
  const uncertain = useRef(false);
  const freshKey = () => { if (!uncertain.current) requestId.current = newRequestId(); };
  const closeBtn = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep('method'); setCents(500); setCustom(''); setMessage(''); setError(''); setBusy(false);
    freshKey();
    setTimeout(() => closeBtn.current?.focus(), 0);
    api.get('/livechat/me').then(({ data }) => setCard(data?.result?.card || null)).catch(() => setCard(null));
  }, [open]);
  useEffect(() => { freshKey(); }, [cents, custom, message]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, busy, onClose]);

  const amount = custom ? Math.round(Number(custom) * 100) : cents;
  const amountOk = Number.isFinite(amount) && amount >= MIN && amount <= MAX;

  const pay = async () => {
    if (busy || !amountOk || !channel) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/livechat/pay', { kind: 'donation', channelId: channel.id, amountCents: amount, message: message.trim(), requestId: requestId.current, returnOrigin: window.location.origin });
      const r = data.result;
      uncertain.current = false;
      requestId.current = newRequestId();
      if (r.status === 'checkout' && r.url) { window.location.href = r.url; return; }
      onDone?.(`Sent ${fmtUsd(amount)} to The Homies — thank you! 💛`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't complete the payment.");
      const st = err.response?.status;
      if (st >= 400 && st < 500) { uncertain.current = false; requestId.current = newRequestId(); } else uncertain.current = true;
      setBusy(false);
    }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Send money">
      <div className="chat-fade-in absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="live-sheet-up relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#141518] text-white shadow-2xl sm:rounded-3xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-2 sm:hidden"><span className="h-1 w-10 rounded-full bg-white/20" /></div>
        <div className="flex items-center gap-2 px-5 pb-1 pt-3">
          {step !== 'method' && (
            <button type="button" onClick={() => !busy && setStep('method')} aria-label="Back" className="-ml-1.5 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
          )}
          <HeartHandshake className="h-5 w-5 text-[#F0B94D]" />
          <h2 className="text-lg font-bold">Send money</h2>
          <button ref={closeBtn} type="button" onClick={onClose} disabled={busy} aria-label="Close" className="ml-auto rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[75dvh] overflow-y-auto px-5 pb-5">
          {step === 'method' ? (
            <div className="chat-fade-up">
              <p className="mb-4 text-sm text-white/60">Support The Homies. Your tip shows up in #{channel?.name} as a highlighted card. How do you want to send it?</p>
              <div className="grid gap-2.5">
                <Method icon={CreditCard} accent="#5865F2" title="Card, Apple Pay or Google Pay" desc={card ? `One tap with ${card.brand?.toUpperCase?.() || 'card'} •• ${card.last4}` : 'Secure checkout by Stripe'} onClick={() => setStep('card')} />
                <Method icon={Coins} accent="#F0B94D" title="Homies Points" desc="Send points as a pinned shoutout" onClick={() => { onClose(); onPoints?.(); }} />
                <Method icon={Bitcoin} accent="#F7931A" title="Crypto" desc="USDC, ETH, BTC and more" locked />
              </div>
            </div>
          ) : (
            <div className="chat-fade-up">
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((c) => (
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
              {custom && !amountOk && <p className="mt-1.5 text-xs text-[#ff8a80]">Between {fmtUsd(MIN)} and {fmtUsd(MAX)}.</p>}
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} rows={2} placeholder="Add a message (optional)"
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
              {error && <p className="mt-3 rounded-lg bg-[#ff5252]/15 px-3 py-2 text-sm text-[#ff8a80]">{error}</p>}
              <button type="button" onClick={pay} disabled={busy || !amountOk}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5865F2] to-[#8B5CF6] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#5865F2]/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                {card ? `Send ${fmtUsd(amountOk ? amount : 0)} · ${card.brand?.toUpperCase?.() || 'Card'} •• ${card.last4}` : `Continue · ${fmtUsd(amountOk ? amount : 0)}`}
              </button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
                <Lock className="h-3 w-3" />
                {card ? 'Charged right away to your saved card. Receipt by email.' : 'Secure checkout by Stripe — your card is saved so next time is one tap.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
