import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Loader2, Package, ShoppingBag, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import CartSheet from '@/components/merch/CartSheet';
import { fetchShop, fetchMyOrders, useMerchCart, usd, ORDER_STATUS } from '@/lib/merch';

// /shop — Homies merch (Printful). Anyone can browse and buy; "My orders"
// shows for signed-in accounts.

export function CartButton({ onClick }) {
  const { count } = useMerchCart();
  return (
    <Button variant="outline" onClick={onClick} className="relative" aria-label={`Cart, ${count} items`}>
      <ShoppingBag className="mr-2 h-4 w-4" /> Cart
      {count > 0 && (
        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{count}</span>
      )}
    </Button>
  );
}

export default function ShopPage({ initialTab = 'shop', openCart = false }) {
  const { user } = useAuth();
  const [shop, setShop] = useState(null); // { enabled, products }
  const [error, setError] = useState(false);
  const [cartOpen, setCartOpen] = useState(openCart);
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { if (openCart) setCartOpen(true); }, [openCart]);

  const load = useCallback(() => {
    setError(false);
    fetchShop().then(setShop).catch(() => { setError(true); setShop({ enabled: true, products: [] }); });
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Helmet>
        <title>Merch — The Homies Hub</title>
        <meta name="description" content="Official Homies Hub merch. Printed for you and shipped to your door." />
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shirt className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Merch</h1>
          </div>
          {shop?.enabled && <CartButton onClick={() => setCartOpen(true)} />}
        </div>

        {!shop ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !shop.enabled ? (
          <ComingSoon />
        ) : (
          <Tabs value={user ? tab : 'shop'} onValueChange={setTab}>
            {user && (
              <TabsList className="mb-6">
                <TabsTrigger value="shop">Shop</TabsTrigger>
                <TabsTrigger value="orders">My orders</TabsTrigger>
              </TabsList>
            )}
            <TabsContent value="shop">
              {error ? (
                <div className="py-20 text-center text-muted-foreground">
                  <p>Couldn't load the shop.</p>
                  <Button variant="outline" className="mt-4" onClick={load}>Try again</Button>
                </div>
              ) : shop.products.length === 0 ? (
                <ComingSoon />
              ) : (
                <ProductGrid products={shop.products} />
              )}
            </TabsContent>
            {user && (
              <TabsContent value="orders">
                <MyOrders />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} onUnavailable={load} />
    </>
  );
}

function ComingSoon() {
  return (
    <div className="py-20 text-center text-muted-foreground">
      <Shirt className="mx-auto mb-4 h-12 w-12 opacity-40" />
      <p className="font-medium text-foreground">Merch is coming soon.</p>
      <p className="mt-1 text-sm">Check back for the first Homies drop.</p>
    </div>
  );
}

function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <Link key={p.id} to={`/shop/${p.slug}`} className="group block overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative aspect-square bg-muted">
            {p.thumbnail
              ? <img src={p.thumbnail} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              : <div className="flex h-full w-full items-center justify-center"><Shirt className="h-10 w-10 text-muted-foreground/40" /></div>}
            {p.soldOut && <Badge variant="secondary" className="absolute left-2 top-2">Sold out</Badge>}
          </div>
          <div className="p-3">
            <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.variants.length > 1 && new Set(p.variants.map((v) => v.priceCents)).size > 1 ? 'From ' : ''}{usd(p.minPriceCents)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MyOrders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { fetchMyOrders().then(setOrders).catch(() => setOrders([])); }, []);
  if (!orders) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!orders.length) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>No merch orders yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {orders.map((o) => <OrderCard key={o.number} order={o} />)}
    </div>
  );
}

export function OrderCard({ order }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Order #{order.number}</p>
        <Badge variant={order.status === 'shipped' ? 'default' : 'secondary'}>{ORDER_STATUS[order.status] || order.status}</Badge>
      </div>
      {order.createdAt && <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{i.name}{i.variantName ? <span className="text-muted-foreground"> · {i.variantName}</span> : null} × {i.quantity}</span>
            <span className="shrink-0">{usd(i.unitCents * i.quantity)}</span>
          </li>
        ))}
        {order.shippingCents > 0 && <li className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{usd(order.shippingCents)}</span></li>}
        <li className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total</span><span>{usd(order.totalCents)}</span></li>
      </ul>
      {order.shipments?.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          {order.shipments.map((s, n) => (
            <p key={n}>
              {s.carrier || 'Shipped'}{s.trackingNumber ? ` · ${s.trackingNumber}` : ''}{' '}
              {/^https:\/\//.test(s.trackingUrl || '') && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Track package</a>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
