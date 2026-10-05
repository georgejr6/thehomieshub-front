import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Heart, Loader2, Lock, Copy, Check, ChevronDown, PartyPopper, ExternalLink } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { CryptoWallet } from '@/components/TipModal';
import { TIP_WALLETS } from '@/lib/tipWallets';
import cashappIcon from '@/assets/cashapp.svg';

// /donate — support The Homies Hub. Card first (our own Stripe Checkout via
// POST /api/tips/donate, recorded by the webhook as a "donation" Tip), then
// Cash App ($Homieshub, amount prefilled), then crypto wallet addresses.

const PRESETS = [5, 10, 25, 50, 100];
const MIN = 1;
const MAX = 2500;
const CASHTAG = '$Homieshub';
const cashUrl = (dollars) => `https://cash.app/${CASHTAG}${dollars ? `/${dollars}` : ''}`;
const fmt = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

function CashApp({ dollars }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(cashUrl(), { margin: 1, width: 320 }).then((d) => { if (alive) setQr(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const copy = () => navigator.clipboard?.writeText(CASHTAG).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-4">
        <img src={cashappIcon} alt="" className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">Cash App</h2>
          <button type="button" onClick={copy} className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white" title="Copy cashtag">
            {CASHTAG} {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        {qr && <img src={qr} alt={`QR code for ${CASHTAG}`} className="hidden h-20 w-20 rounded-md bg-white p-1 sm:block" />}
      </div>
      <a href={cashUrl(dollars)} target="_blank" rel="noopener noreferrer"
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00D632] text-[15px] font-semibold text-black transition hover:brightness-105">
        Send {dollars ? fmt(dollars) : ''} with Cash App <ExternalLink className="h-4 w-4" />
      </a>
      <p className="mt-2 text-center text-xs text-gray-500">Opens Cash App with the amount filled in. On a computer, scan the code with your phone.</p>
    </section>
  );
}

function Crypto() {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(TIP_WALLETS[0]?.id);
  const wallet = TIP_WALLETS.find((w) => w.id === id);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left">
        <div>
          <h2 className="text-base font-semibold text-white">Crypto</h2>
          <p className="text-sm text-gray-400">{TIP_WALLETS.map((w) => w.label).join(', ')}</p>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Choose a coin">
            {TIP_WALLETS.map((w) => (
              <button key={w.id} type="button" role="tab" aria-selected={w.id === id} onClick={() => setId(w.id)}
                className={cn('rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                  w.id === id ? 'border-white bg-white text-black' : 'border-white/15 text-gray-300 hover:border-white/40')}>
                {w.label}<span className="ml-1 text-xs opacity-60">{w.network}</span>
              </button>
            ))}
          </div>
          {wallet && <CryptoWallet key={wallet.id} wallet={wallet} />}
        </div>
      )}
    </section>
  );
}

export default function DonatePage() {
  const [params, setParams] = useSearchParams();
  const [thanks, setThanks] = useState(params.get('thanks') === '1');
  const [preset, setPreset] = useState(10);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('thanks') === '1') { setThanks(true); setParams({}, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const customNum = Number(custom);
  const dollars = custom !== '' ? (Number.isFinite(customNum) ? Math.round(customNum * 100) / 100 : 0) : preset;
  const valid = dollars >= MIN && dollars <= MAX;

  const donate = async () => {
    if (!valid || busy) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/tips/donate', { amountCents: Math.round(dollars * 100), message: message.trim() });
      if (!data?.url?.startsWith('https://checkout.stripe.com/')) throw new Error('Could not start checkout');
      window.location.assign(data.url);
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not start checkout. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-8 sm:pt-12">
      <Helmet>
        <title>Donate · The Homies Hub</title>
        <meta name="description" content="Support The Homies Hub. Donate by card, Apple Pay, Google Pay, Cash App ($Homieshub) or crypto." />
        <link rel="canonical" href="https://www.thehomies.app/donate" />
      </Helmet>

      {thanks && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
          <div>
            <p className="font-semibold text-white">Thank you!</p>
            <p className="text-sm text-gray-300">Your donation went through. It means a lot.</p>
          </div>
        </div>
      )}

      <header className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Heart className="h-7 w-7 text-primary" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Support The Homies</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gray-400">
          The Homies Hub is 100% community-funded. Every donation goes into streams, the app and new features.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-semibold text-white">Choose an amount</h2>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Donation amount">
          {PRESETS.map((n) => {
            const on = custom === '' && preset === n;
            return (
              <button key={n} type="button" role="radio" aria-checked={on}
                onClick={() => { setPreset(n); setCustom(''); setError(''); }}
                className={cn('h-12 rounded-xl border text-base font-semibold transition',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-white/15 text-white hover:border-white/40')}>
                ${n}
              </button>
            );
          })}
          <label className={cn('relative flex h-12 items-center rounded-xl border transition',
            custom !== '' ? 'border-primary' : 'border-white/15 focus-within:border-white/40')}>
            <span className="pl-3 text-base font-semibold text-gray-400">$</span>
            <input type="number" inputMode="decimal" min={MIN} max={MAX} step="1" placeholder="Other" aria-label="Other amount"
              value={custom} onChange={(e) => { setCustom(e.target.value.slice(0, 8)); setError(''); }}
              className="h-full w-full min-w-0 bg-transparent pl-1 pr-2 text-base font-semibold text-white outline-none placeholder:font-normal placeholder:text-gray-500" />
          </label>
        </div>
        {custom !== '' && !valid && <p className="mt-2 text-sm text-amber-400">Enter an amount from ${MIN} to {fmt(MAX)}.</p>}

        {showMessage ? (
          <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} rows={2} maxLength={200}
            placeholder="Leave a message (optional)" aria-label="Message"
            className="mt-4 w-full resize-none rounded-xl border border-white/15 bg-transparent p-3 text-base text-white outline-none placeholder:text-gray-500 focus:border-white/40" />
        ) : (
          <button type="button" onClick={() => setShowMessage(true)} className="mt-4 text-sm text-gray-400 underline-offset-4 hover:text-white hover:underline">
            + Add a message
          </button>
        )}

        <button type="button" onClick={donate} disabled={!valid || busy}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" fill="currentColor" />}
          {busy ? 'Opening secure checkout…' : `Donate ${valid ? fmt(dollars) : ''}`}
        </button>
        {error && <p role="alert" className="mt-2 text-center text-sm text-red-400">{error}</p>}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5" /> Card, Apple Pay or Google Pay · Secure checkout by Stripe · No account needed
        </p>
      </section>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-500">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-4">
        <CashApp dollars={valid ? dollars : 0} />
        <Crypto />
      </div>
    </div>
  );
}
