import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/pages/ShopPage';
import { fetchOrderBySession, useMerchCart } from '@/lib/merch';

// /shop/thanks?session=cs_... — Stripe sends buyers here after paying. The
// order row appears when the webhook lands, so poll for ~30 s.

const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export default function ShopThanksPage() {
  const [params] = useSearchParams();
  const session = params.get('session') || '';
  const { clear } = useMerchCart();
  const [order, setOrder] = useState(null);
  const [gaveUp, setGaveUp] = useState(!SESSION_RE.test(session));

  useEffect(() => { clear(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!SESSION_RE.test(session)) return undefined;
    let tries = 0;
    let timer = null;
    let alive = true;
    const poll = async () => {
      tries += 1;
      const o = await fetchOrderBySession(session).catch(() => null);
      if (!alive) return;
      if (o) { setOrder(o); return; }
      if (tries >= 15) { setGaveUp(true); return; }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [session]);

  return (
    <>
      <Helmet><title>Thanks for your order — The Homies Hub</title></Helmet>
      <div className="container mx-auto max-w-xl px-4 py-12">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">Thanks for repping the Homies</h1>
        </div>
        {order ? (
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
