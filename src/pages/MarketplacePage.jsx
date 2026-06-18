import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Loader2, Store as StoreIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const TYPES = [
  { value: '', label: 'All' },
  { value: 'digital', label: 'Digital' },
  { value: 'trip_guide', label: 'Trip guides' },
  { value: 'physical', label: 'Physical' },
];
const SORTS = [
  { value: 'new', label: 'Newest' },
  { value: 'popular', label: 'Best selling' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

const MarketplacePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), sort });
      if (q.trim()) params.set('q', q.trim());
      if (type) params.set('type', type);
      const { data: resp } = await api.get(`/marketplace/products?${params.toString()}`);
      setData(resp?.result || { items: [], pagination: { pages: 1, total: 0 } });
    } catch {
      setData({ items: [], pagination: { pages: 1, total: 0 } });
    } finally {
      setLoading(false);
    }
  }, [page, sort, type, q]);

  useEffect(() => { load(); }, [page, sort, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const buy = async (product) => {
    if (!user) {
      toast({ title: 'Log in to buy', description: 'Create a free account to purchase.' });
      return;
    }
    setBuyingId(product._id);
    try {
      const { data: resp } = await api.post('/marketplace/checkout', { productId: product._id });
      const url = resp?.result?.url;
      if (url) window.location.href = url;
      else throw new Error('no url');
    } catch (err) {
      toast({ title: 'Checkout failed', description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBuyingId(null);
    }
  };

  const { items, pagination } = data;

  return (
    <>
      <Helmet><title>Marketplace — The Homies Hub</title></Helmet>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">Marketplace</h1>
        </div>
        <p className="text-muted-foreground mb-6">Digital products, trip guides, and gear from the homies. {pagination?.total ? `${pagination.total} listings.` : ''}</p>

        {/* Controls */}
        <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products or creators…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Button type="submit">Search</Button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No products found.</p>
            <p className="text-sm mt-1">Be the first to sell — open a store in Creator Studio.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/studio">Open a store</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => (
              <Card key={p._id} className="overflow-hidden flex flex-col">
                <Link to={`/profile/${p.seller?.username || ''}`} className="block h-36 bg-muted">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                    : <div className="h-full w-full flex items-center justify-center"><StoreIcon className="h-8 w-8 text-muted-foreground/40" /></div>}
                </Link>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm line-clamp-2">{p.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">{usd(p.priceCents)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {String(p.type).replace('_', ' ')}
                    {p.seller?.username && <> · <Link to={`/profile/${p.seller.username}`} className="hover:text-primary">@{p.seller.username}</Link></>}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button size="sm" className="w-full" onClick={() => buy(p)} disabled={buyingId === p._id}>
                    {buyingId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buy'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination?.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pagination.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" /> Want to sell? Open a store in Creator Studio — digital products convert best.
        </p>
      </div>
    </>
  );
};

export default MarketplacePage;
