import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CreditCard, Coins, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/api/homieshub';
import { TIP_WALLETS } from '@/lib/tipWallets';

// Tip the artist. Card → Stripe Checkout (anyone, no account needed; backend
// routes/tips.js). Crypto → the artist's own wallet addresses with QR codes;
// on a phone "Open in wallet" hands the address to Pera / MetaMask / etc.
const PRESETS = [200, 500, 1000, 2000];
const MIN = 100;
const MAX = 50000;
const usd = (c) => `$${(c / 100).toFixed(2).replace(/\.00$/, '')}`;

function CryptoWallet({ wallet }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    // Plain address in the QR: every wallet/exchange scanner reads it (the
    // algorand://?asset= link is only for the "Open in wallet" button).
    QRCode.toDataURL(wallet.address, { margin: 1, width: 360 }).then((d) => { if (alive) setQr(d); }).catch(() => {});
    return () => { alive = false; };
  }, [wallet.address]);
  const copy = () => {
    navigator.clipboard?.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  return (
    <div className="flex flex-col items-center gap-3">
      {qr
        ? <img src={qr} alt={`${wallet.label} address QR code`} className="w-44 h-44 rounded-lg bg-white p-1" />
        : <div className="w-44 h-44 rounded-lg bg-white/5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>}
      <p className="text-xs text-amber-300/90 text-center">{wallet.note}</p>
      <div className="w-full flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
        <code className="flex-1 text-[11px] text-gray-300 break-all">{wallet.address}</code>
        <button type="button" onClick={copy} className="p-1.5 rounded hover:bg-white/10 text-gray-300" title="Copy address">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <a href={wallet.uri}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-white">
        <ExternalLink className="w-4 h-4" /> Open in wallet app
      </a>
    </div>
  );
}

export default function TipModal({ open, onClose, artist, trackId, returnPath }) {
  const [tab, setTab] = useState('card');
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [walletId, setWalletId] = useState(TIP_WALLETS[0]?.id);

  useEffect(() => { if (open) { setError(''); setBusy(false); } }, [open]);
  // Back from Stripe: iOS restores this page from its cache with busy=true.
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setBusy(false); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // Custom amount is typed text ("5", "5.50", "5,50"); anything else is invalid
  // rather than silently falling back to the preset.
  const customText = custom.trim().replace(',', '.');
  const customOk = /^\d{1,5}(\.\d{0,2})?$/.test(customText);
  const cents = customText ? (customOk ? Math.round(parseFloat(customText) * 100) : NaN) : amount;
  const valid = Number.isFinite(cents) && cents >= MIN && cents <= MAX;

  const payByCard = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/tips/checkout', { amountCents: cents, trackId, message, returnPath });
      if (!data?.url) throw new Error('no url');
      window.location.assign(data.url);
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not start checkout. Try again.');
      setBusy(false);
    }
  };

  const wallet = TIP_WALLETS.find((w) => w.id === walletId) || TIP_WALLETS[0];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white w-[calc(100%-2rem)] max-w-sm rounded-xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tip {artist || 'the artist'}</DialogTitle>
        </DialogHeader>

        {TIP_WALLETS.length > 0 && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-lg">
            {[['card', CreditCard, 'Card'], ['crypto', Coins, 'Crypto']].map(([id, Icon, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-black' : 'text-gray-300 hover:text-white'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'card' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => { setAmount(c); setCustom(''); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${!custom && amount === c ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 hover:border-white/30'}`}>
                  {usd(c)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 border border-white/10 focus-within:border-primary/60">
              <span className="text-gray-400">$</span>
              <input type="text" inputMode="decimal" autoComplete="off" placeholder="Other amount"
                value={custom} onChange={(e) => setCustom(e.target.value)}
                className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </div>
            <textarea rows={2} maxLength={200} placeholder="Add a message (optional)"
              value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-primary/60 resize-none" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {custom && !valid && <p className="text-xs text-gray-400">Tips can be $1 to $500.</p>}
            <button type="button" onClick={payByCard} disabled={!valid || busy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-black font-bold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {valid ? `Tip ${usd(cents)}` : 'Tip'}
            </button>
            <p className="text-[11px] text-gray-500 text-center">Card, Apple Pay or Google Pay through Stripe. No account needed.</p>
          </div>
        ) : wallet && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {TIP_WALLETS.map((w) => (
                <button key={w.id} type="button" onClick={() => setWalletId(w.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${w.id === wallet.id ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-gray-300 hover:border-white/30'}`}>
                  {w.label}{w.label !== w.network ? ` · ${w.network}` : ''}
                </button>
              ))}
            </div>
            <CryptoWallet wallet={wallet} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
