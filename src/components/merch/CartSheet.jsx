import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useMerchCart, usd, startCheckout, checkoutItems, merchError, MAX_QTY } from '@/lib/merch';

// Merch cart drawer. Checkout = POST /merch/checkout → Stripe; the server
// re-prices every line, so the subtotal here is only an estimate.
export default function CartSheet({ open, onOpenChange, onUnavailable }) {
  const { cart, subtotal, setQty, remove } = useMerchCart();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const checkout = async () => {
    setBusy(true);
    try {
      await startCheckout(checkoutItems(cart));
    } catch (err) {
      setBusy(false);
      toast({ title: 'Checkout failed', description: merchError(err, 'Could not start checkout. Try again.'), variant: 'destructive' });
      if (err?.response?.status === 409) onUnavailable?.();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Printed for you, ships in about 1–2 weeks.</SheetDescription>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingBag className="mb-3 h-10 w-10 opacity-40" />
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <>
            <ul className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {cart.map((l) => (
                <li key={l.variantId} className="flex gap-3">
                  <Link to={l.slug ? `/shop/${l.slug}` : '/shop'} onClick={() => onOpenChange(false)} className="block h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {l.image && <img src={l.image} alt={l.name} className="h-full w-full object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    {l.variant && <p className="text-xs text-muted-foreground">{l.variant}</p>}
                    <p className="mt-1 text-sm">{usd(l.priceCents)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" aria-label="Decrease quantity" onClick={() => setQty(l.variantId, l.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm" aria-label="Quantity">{l.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" aria-label="Increase quantity" disabled={l.quantity >= MAX_QTY} onClick={() => setQty(l.variantId, l.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label={`Remove ${l.name}`} onClick={() => remove(l.variantId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{usd(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Shipping is added at checkout.</p>
              <Button className="mt-4 w-full" size="lg" onClick={checkout} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Checkout'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
