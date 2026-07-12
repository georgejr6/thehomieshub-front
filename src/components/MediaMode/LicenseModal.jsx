import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Check, Loader2, Music } from 'lucide-react';
import api from '@/api/homieshub';

const fmtPrice = (cents) => `$${(cents / 100).toFixed((cents % 100) ? 2 : 0)}`;

// Buy/license a song. Tiers come from the backend listing (real Stripe prices).
export default function LicenseModal({ track, listing, isOpen, onOpenChange }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const tiers = listing?.tiers || [];
  const [selected, setSelected] = useState(tiers[0]?.key || null);
  const [loading, setLoading] = useState(false);

  const buy = async () => {
    if (!user) { toast({ title: 'Log in to license this track' }); return; }
    const tierKey = selected || tiers[0]?.key;
    if (!tierKey) return;
    setLoading(true);
    try {
      const { data } = await api.post('/marketplace/license-checkout', { trackId: track.id, tierKey });
      const url = data?.result?.url;
      if (url) { window.location.href = url; return; }
      toast({ title: 'Could not start checkout', variant: 'destructive' });
    } catch {
      toast({ title: 'Could not start checkout', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> License “{track?.title}”</DialogTitle>
          <DialogDescription>Buy a license to use this track. Instant checkout — you get a receipt and license record.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {tiers.map((t) => {
            const active = selected === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.licenseType} license</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold">{fmtPrice(t.amountCents)}</span>
                  {active && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            );
          })}
          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">This track isn’t available to license right now.</p>
          )}
        </div>

        <Button onClick={buy} disabled={loading || !tiers.length} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
          {loading ? 'Starting checkout…' : 'Continue to checkout'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
