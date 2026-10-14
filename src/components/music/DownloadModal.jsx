import React, { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/api/homieshub';

// Buy a song as an MP3, pay what you want (owner 2026-10-14: minimum $2.99).
// Stripe Checkout (backend routes/tips.js POST /tips/download); no account
// needed. The private download link is emailed and shown on return
// (SongPage reads ?download=thanks&session=).
const MIN = 299;
const SUGGESTED = 499;
const MAX = 50000;
const PRESETS = [299, 499, 999];
const usd = (c) => `$${(c / 100).toFixed(2)}`;

export default function DownloadModal({ open, onClose, track, returnPath }) {
  const [amount, setAmount] = useState(SUGGESTED);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setError(''); setBusy(false); } }, [open]);
  // Back from Stripe: iOS restores this page from its cache with busy=true.
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setBusy(false); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const customText = custom.trim().replace(',', '.').replace(/^\$/, '');
  const customOk = /^\d{1,5}(\.\d{0,2})?$/.test(customText);
  const cents = customText ? (customOk ? Math.round(parseFloat(customText) * 100) : NaN) : amount;
  const valid = Number.isFinite(cents) && cents >= MIN && cents <= MAX;

  const buy = async () => {
    if (!valid || busy || !track?.id) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/tips/download', { trackId: track.id, amountCents: cents, returnPath });
      if (!data?.url) throw new Error('no url');
      window.location.assign(data.url);
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not start checkout. Try again.');
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white w-[calc(100%-2rem)] max-w-sm rounded-xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Download “{track?.title}”</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-400 -mt-1">
          MP3, yours to keep. Pay what you want — {usd(MIN)} minimum. It goes straight to {track?.artist || 'the artist'}.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
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
          {error && <p className="text-sm text-red-400">{error}</p>}
          {custom && !valid && <p className="text-xs text-gray-400">Pay {usd(MIN)} or more (up to $500).</p>}
          <button type="button" onClick={buy} disabled={!valid || busy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-black font-bold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {valid ? `Buy for ${usd(cents)}` : 'Buy'}
          </button>
          <p className="text-[11px] text-gray-500 text-center">Card, Apple Pay or Google Pay through Stripe. No account needed — the download link is emailed to you.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
