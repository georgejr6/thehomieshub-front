import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ShoppingBag, Loader2, Download, MapPin, Package, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/api/homieshub';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(); } catch { return ''; } };

const PurchasesPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/marketplace/purchases')
      .then((r) => setOrders(r.data?.result?.items || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const access = (p) => {
    if (!p) return null;
    if (p.type === 'digital') {
      return p.digitalUrl
        ? <Button asChild size="sm" className="gap-2"><a href={p.digitalUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /> Open / Download</a></Button>
        : <Badge variant="secondary">Awaiting delivery from seller</Badge>;
    }
    if (p.type === 'trip_guide') {
      return p.linkedPostId
        ? <Button asChild size="sm" variant="outline" className="gap-2"><Link to={`/post/${p.linkedPostId}`}><MapPin className="h-4 w-4" /> View guide</Link></Button>
        : <Badge variant="secondary">Guide unlocked</Badge>;
    }
    return <Badge variant="secondary">Order placed — seller ships</Badge>;
  };

  const icon = (type) => type === 'trip_guide' ? MapPin : type === 'physical' ? Package : Download;

  return (
    <>
      <Helmet><title>My Purchases — The Homies Hub</title></Helmet>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">My Purchases</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No purchases yet.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/marketplace">Browse the marketplace</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const p = o.product || {};
              const Icon = icon(p.type);
              return (
                <Card key={o._id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="h-14 w-14 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" /> : <Icon className="h-6 w-6 text-muted-foreground/50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.title || 'Product'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{String(p.type || '').replace('_', ' ')} · {usd(o.amountCents)} · {fmtDate(o.createdAt)}</p>
                    </div>
                    <div className="shrink-0">{access(p)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default PurchasesPage;
