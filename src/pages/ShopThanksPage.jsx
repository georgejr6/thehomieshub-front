import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/pages/ShopPage';
import { fetchOrderBySession, useMerchCart, hasCartCheckoutMarker, clearCartCheckoutMarker, SESSION_RE } from '@/lib/merch';

// /shop/thanks?session=cs_... — Stripe sends buyers here after paying. The
// order row appears when the webhook lands, so poll for ~30 s.

export default function ShopThanksPage() {
  const [params] = useSearchParams();
  const session = params.get('session') || '';
  const { clear } = useMerchCart();
  const [order, setOrder] = useState(null);
  const validSession = SESSION_RE.test(session);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!SESSION_RE.test(session)) return undefined;
    let tries = 0;
    let timer = null;
    let alive = true;
    const poll = async () => {
      tries += 1;
      const o = await fetchOrderBySession(session).catch(() => null);
      if (!alive) return;
      if (o) {
        setOrder(o);
        // Only a cart checkout empties the cart (Buy now leaves saved items alone).
        if (hasCartCheckoutMarker()) { clear(); clearCartCheckoutMarker(); }
        return;
      }
      if (tries >= 15) { setGaveUp(true); return; }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Helmet><title>Thanks for your order — The Homies Hub</title></Helmet>
      <div className="container mx-auto max-w-xl px-4 py-12">
        <div className="text-center">
          {validSession && <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" />}
          <h1 className="text-3xl font-extrabold tracking-tight">{validSession ? 'Thanks for repping the Homies' : 'Merch order'}</h1>
        </div>
        {!validSession ? (
          <p className="mt-6 text-center text-muted-foreground">We couldn't find that order. If you just paid, your confirmation email has the details.</p>
        ) : order ? (
          <div className="mt-8">
            <p className="mb-4 text-center text-sm text-muted-foreground">We're printing it now. You'll get an email with tracking when it ships.</p>
            <OrderCard order={order} />
          </div>
        ) : gaveUp ? (
          <p className="mt-6 text-center text-muted-foreground">Payment received — your confirmation email is on its way.</p>
        ) : (
          <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Confirming your order…
          </div>
        )}
        <div className="mt-8 text-center">
          <Button asChild variant="outline"><Link to="/shop">Back to merch</Link></Button>
        </div>
      </div>
    </>
  );
}
