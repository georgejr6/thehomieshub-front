import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { fetchMyOrders } from '@/lib/merch';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Skeleton, pageMotion } from '@/shop/components/ui';
import OrderCard from '@/shop/components/OrderCard';

export default function ShopOrders() {
  const { signedIn } = useShop();
  const [orders, setOrders] = useState(undefined);
  useEffect(() => {
    if (!signedIn) { setOrders([]); return; }
    fetchMyOrders().then(setOrders).catch(() => setOrders(null));
  }, [signedIn]);
  return (
    <motion.div {...pageMotion} className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <Helmet><title>My orders | The Homies</title></Helmet>
      <h1 className="font-display text-6xl sm:text-7xl">My orders</h1>
      {!signedIn ? (
        <div className="mt-10 rounded-3xl border border-white/10 bg-[#111113] p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-white/40" />
          <p className="mt-4 font-semibold">Sign in to see your orders</p>
          <p className="mt-1 text-sm text-white/55">Ordered as a guest? Your confirmation and tracking emails have everything.</p>
          <ShopButton as={Link} to="/?openAuth=1&tab=signin&redirect=/shop/orders" className="mt-6">Sign in</ShopButton>
        </div>
      ) : orders === undefined ? (
        <div className="mt-10 space-y-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : orders === null ? (
        <p className="mt-10 text-white/60">Couldn't load your orders. Try again in a moment.</p>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-white/10 bg-[#111113] p-8 text-center">
          <p className="font-semibold">No orders yet</p>
          <ShopButton as={Link} to="/shop" className="mt-5">Browse the drop</ShopButton>
        </div>
      ) : (
        <div className="mt-10 space-y-4">{orders.map((o) => <OrderCard key={o.number} order={o} />)}</div>
      )}
    </motion.div>
  );
}
