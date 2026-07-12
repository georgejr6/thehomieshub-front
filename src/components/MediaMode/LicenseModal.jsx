import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Loader2, Music } from 'lucide-react';
import api from '@/api/homieshub';

const fmtPrice = (cents) => `$${(cents / 100).toFixed((cents % 100) ? 2 : 0)}`;

// Buy/license a song. Tiers come from the backend listing (real Stripe prices).
export default function LicenseModal({ track, listing, isOpen, onOpenChange }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const tiers = listing?.tiers || [];
  const [loadingKey, setLoadingKey] = useState(null);

  // Selecting a tier goes straight to checkout, in a NEW TAB. The blank tab is
  // opened synchronously inside the click handler so browsers don't block it as
  // a popup (opening after the await would be blocked).
  const startCheckout = async (tier) => {
    if (loadingKey) return;
    if (!user) { toast({ title: 'Log in to license this track' }); return; }

    const win = window.open('', '_blank');
    setLoadingKey(tier.key);
    try {
      const { data } = await api.post('/marketplace/license-checkout', { trackId: track.id, tierKey: tier.key });
      const url = data?.result?.url;
      if (url) {
        if (win) win.location.href = url;
        else window.open(url, '_blank'); // fallback if the blank tab was blocked
        onOpenChange(false);
      } else {
        if (win) win.close();
        toast({ title: 'Could not start checkout', variant: 'destructive' });
      }
    } catch {
      if (win) win.close();
      toast({ title: 'Could not start checkout', variant: 'destructive' });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> License “{track?.title}”</DialogTitle>
          <DialogDescription>Pick a license — checkout opens in a new tab. You get a receipt and a license record.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {tiers.map((t) => {
            const busy = loadingKey === t.key;
            return (
              <button
                key={t.key}
                onClick={() => startCheckout(t)}
                disabled={!!loadingKey}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.licenseType} license</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold">{fmtPrice(t.amountCents)}</span>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ShoppingCart className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
            );
          })}
          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">This track isn’t available to license right now.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
