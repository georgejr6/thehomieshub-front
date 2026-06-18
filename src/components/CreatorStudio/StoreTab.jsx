import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, ShoppingBag, Users, Package, Loader2, Plus, Store as StoreIcon,
  Wallet, Sparkles, Lock,
} from 'lucide-react';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const PRODUCT_TYPES = [
  { value: 'digital', label: 'Digital product', hint: 'File / download / access — instant delivery, best margins' },
  { value: 'trip_guide', label: 'Trip guide', hint: 'Sell access to one of your trip posts' },
  { value: 'physical', label: 'Physical product', hint: 'You ship it; we handle the payment' },
];

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

const StoreTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [products, setProducts] = useState([]);

  // store setup form
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [savingStore, setSavingStore] = useState(false);

  // product form
  const [showForm, setShowForm] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pType, setPType] = useState('digital');
  const [pPrice, setPPrice] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pDigitalUrl, setPDigitalUrl] = useState('');
  const [pImage, setPImage] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace/dashboard');
      setDash(data?.result || null);
      if (data?.result?.hasStore) {
        const pr = await api.get('/marketplace/products/mine');
        setProducts(pr.data?.result?.items || []);
      }
    } catch {
      /* not fatal */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createStore = async () => {
    if (!storeName.trim()) return;
    setSavingStore(true);
    try {
      await api.post('/marketplace/store', { name: storeName.trim(), description: storeDesc });
      toast({ title: 'Store opened 🎉', description: 'Add your first product below.' });
      await load();
    } catch (err) {
      toast({ title: 'Could not open store', description: err?.response?.data?.message || 'You need a Homie ($15/mo) membership.', variant: 'destructive' });
    } finally {
      setSavingStore(false);
    }
  };

  const createProduct = async () => {
    const priceCents = Math.round(parseFloat(pPrice || '0') * 100);
    if (!pTitle.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
      toast({ title: 'Add a title and price', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/marketplace/products', {
        title: pTitle.trim(), type: pType, priceCents, description: pDesc,
        digitalUrl: pType === 'digital' ? pDigitalUrl : undefined,
        images: pImage ? [pImage] : [],
      });
      toast({ title: 'Product listed', description: 'It\'s live in the marketplace.' });
      setPTitle(''); setPPrice(''); setPDesc(''); setPDigitalUrl(''); setPImage(''); setShowForm(false);
      await load();
    } catch (err) {
      toast({ title: 'Could not create product', description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  // ── No store yet → setup ──
  if (!dash?.hasStore) {
    const canSell = dash?.connected !== undefined; // dashboard loaded
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5 text-primary" />
            <CardTitle>Open your store</CardTitle>
          </div>
          <CardDescription>
            Sell digital products, trip guides, and physical goods to the whole community.
            Requires a Homie ($15/mo) membership. We take 30% — you keep the rest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Store name (e.g. Mwosa's Travel Shop)" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <Textarea placeholder="What do you sell? (optional)" value={storeDesc} onChange={(e) => setStoreDesc(e.target.value)} rows={3} />
          <Button onClick={createStore} disabled={savingStore || !storeName.trim()} className="w-full">
            {savingStore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <StoreIcon className="h-4 w-4 mr-2" />}
            Open my store
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You can connect your own Stripe anytime to get paid directly. Until then, sales are collected for you and your balance shows here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const s = dash.stats || {};
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total earned" value={usd(s.totalEarnedCents)} sub="Your share after the 30% fee" />
        <StatCard icon={Wallet} label="Pending payout" value={usd(s.pendingPayoutCents)} sub={dash.connected ? 'Paid via Stripe' : 'Owed to you — connect Stripe to withdraw'} />
        <StatCard icon={ShoppingBag} label="Sales" value={s.salesCount || 0} sub="All-time orders" />
        <StatCard icon={Users} label="Subscribers" value={s.subscriberCount || 0} sub="Paying your creator sub" />
      </div>

      {/* Connect Stripe banner */}
      {!dash.connected && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Get paid directly.</span> Connect your Stripe to receive your earnings automatically.
                Until you do, we hold your balance ({usd(s.pendingPayoutCents)}) and pay you out.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled title="Stripe Connect onboarding coming soon">Connect Stripe (soon)</Button>
          </CardContent>
        </Card>
      )}

      {/* Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Products ({products.length})</CardTitle>
            <CardDescription>Digital products convert best — instant delivery, no shipping.</CardDescription>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} className="gap-2"><Plus className="h-4 w-4" /> Add product</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
              <Input placeholder="Product title" value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <select value={pType} onChange={(e) => setPType(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <Input type="number" min="0" step="0.01" placeholder="Price (USD)" value={pPrice} onChange={(e) => setPPrice(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground -mt-1">{PRODUCT_TYPES.find((t) => t.value === pType)?.hint}</p>
              <Textarea placeholder="Description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={2} />
              {pType === 'digital' && (
                <Input placeholder="Delivery link / file URL (shown after purchase)" value={pDigitalUrl} onChange={(e) => setPDigitalUrl(e.target.value)} />
              )}
              <Input placeholder="Cover image URL (optional)" value={pImage} onChange={(e) => setPImage(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={createProduct} disabled={creating} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} List product
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Tip: price digital guides at $5–$15 for the most sales.
              </p>
            </div>
          )}

          {products.length === 0 && !showForm ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No products yet. Add your first to start selling.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Card key={p._id} className="overflow-hidden">
                  {p.images?.[0] && <div className="h-32 bg-muted"><img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" /></div>}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base line-clamp-1">{p.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">{usd(p.priceCents)}</Badge>
                    </div>
                    <CardDescription className="capitalize">{String(p.type).replace('_', ' ')} · {p.salesCount || 0} sold</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreTab;
