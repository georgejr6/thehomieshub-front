import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { fetchOrderBySession, hasCartCheckoutMarker, clearCartCheckoutMarker, SESSION_RE } from '@/lib/merch';
import { useShop } from '@/shop/ShopContext';
import { ShopButton } from '@/shop/components/ui';
import OrderCard from '@/shop/components/OrderCard';

// /shop/thanks?session=cs_... — Stripe returns buyers here. The order row
// appears when the webhook lands, so poll for ~30 s. The cart is cleared only
// for a confirmed order that started from the cart (not Buy now).
export default function ShopThanks() {
  const [params] = useSearchParams();
  const session = params.get('session') || '';
  const { cart } = useShop();
  const [order, setOrder] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const valid = SESSION_RE.test(session);

  useEffect(() => {
    if (!valid) return undefined;
    let tries = 0; let timer = null; let alive = true;
    const poll = async () => {
      tries += 1;
      const o = await fetchOrderBySession(session).catch(() => null);
      if (!alive) return;
      if (o) {
        setOrder(o);
        if (hasCartCheckoutMarker()) { cart.clear(); clearCartCheckoutMarker(); }
        return;
      }
      if (tries >= 15) {
        // Paid (Stripe sent them here with a real session) but the webhook is slow:
        // a cart checkout's bag still gets cleared so they don't buy twice.
        if (hasCartCheckoutMarker()) { cart.clear(); clearCartCheckoutMarker(); }
        setGaveUp(true); return;
      }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-10 text-center">
      <Helmet><title>Thank you | The Homies</title></Helmet>
      {valid && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <CheckCircle2 className="mx-auto h-16 w-16 text-[#f0b94d]" />
        </motion.div>
      )}
      <h1 className="font-display mt-6 text-6xl leading-[0.9] sm:text-7xl">{valid ? <>Thanks for<br />repping The Homies</> : 'Merch order'}</h1>
      {!valid ? (
        <p className="mt-6 text-white/60">We couldn't find that order. If you just paid, your confirmation email has the details.</p>
      ) : order ? (
        <div className="mt-10 text-left"><OrderCard order={order} /><p className="mt-4 text-center text-sm text-white/50">We'll email you tracking as soon as it ships.</p></div>
      ) : gaveUp ? (
        <p className="mt-6 text-white/60">Payment received — your confirmation email is on its way. Customized pieces get a quick quality check before printing.</p>
      ) : (
        <p className="mt-8 flex items-center justify-center gap-2 text-white/55"><Loader2 className="h-5 w-5 animate-spin" /> Confirming your order…</p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ShopButton as={Link} to="/shop" variant="ghost">Keep shopping</ShopButton>
        <ShopButton as={Link} to="/shop/orders" variant="outline">My orders</ShopButton>
      </div>
    </div>
  );
}
