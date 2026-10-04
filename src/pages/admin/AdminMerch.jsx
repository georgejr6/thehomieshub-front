import React, { useCallback, useEffect, useState } from 'react';
import { EyeOff, Eye, Loader2, RefreshCw, RotateCw, Webhook, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { GlassPanel, SectionTitle } from '@/components/admin/glass';
import api from '@/api/homieshub';
import { usd, merchError } from '@/lib/merch';

// /admin/merch — Homies merch (Printful store). Products, prices and variants
// are edited in Printful; here: sync, hide/show, order in the shop, orders,
// retry orders that didn't reach Printful, register the Printful webhook.

const STATUS_COLOR = {
  paid: 'text-amber-300', submitted: 'text-sky-300', shipped: 'text-emerald-300',
  failed: 'text-rose-400', on_hold: 'text-amber-300', canceled: 'text-white/40',
};
const fmt = (d) => (d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

export default function AdminMerch() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: d } = await api.get('/merch/admin/overview');
      setData(d);
    } catch (err) {
      setError(merchError(err, 'Could not load merch admin'));
      setData((prev) => prev || { products: [], orders: [] });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, okTitle) => {
    setBusy(key);
    try {
      const msg = await fn();
      toast({ title: okTitle, description: typeof msg === 'string' ? msg : undefined });
      await load();
    } catch (err) {
      toast({ title: 'Failed', description: merchError(err), variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const sync = () => run('sync', async () => {
    const { data: r } = await api.post('/merch/admin/sync');
    return `${r.synced} products synced${r.deactivated ? `, ${r.deactivated} removed from the shop` : ''}.`;
  }, 'Synced from Printful');
  const toggleHidden = (p) => run(`hide:${p.id}`, () => api.patch(`/merch/admin/products/${p.id}`, { hidden: !p.hidden }), p.hidden ? 'Shown in the shop' : 'Hidden from the shop');
  const setSort = (p, sort) => run(`sort:${p.id}`, () => api.patch(`/merch/admin/products/${p.id}`, { sort }), 'Order saved');
  const retry = (o) => run(`retry:${o.id}`, async () => {
    const { data: r } = await api.post(`/merch/admin/orders/${o.id}/retry`);
    return r.order?.status === 'submitted' ? 'Printful has it now.' : `Still failing: ${r.order?.lastError || 'unknown error'}`;
  }, 'Retried');
  const webhook = () => run('webhook', () => api.post('/merch/admin/printful-webhook'), 'Printful webhook registered');

  return (
    <div className="space-y-8">
      <SectionTitle
        sub="Products, variants and prices are edited in Printful (Homies Hub store), then synced here. Orders go to Printful automatically once paid."
        right={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh</Button>
            <Button size="sm" onClick={sync} disabled={busy === 'sync' || !data?.enabled}>
              {busy === 'sync' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RotateCw className="mr-1.5 h-4 w-4" />} Sync from Printful
            </Button>
          </div>
        )}
      >
        Merch
      </SectionTitle>
      {error && <p className="text-sm text-rose-400">{error}</p>}

      {data && !data.enabled && (
        <GlassPanel className="p-4 text-sm text-amber-200">
          The shop is off: set <code>PRINTFUL_HOMIES_TOKEN</code> (a token scoped to the Homies Hub Printful store) on the backend.
        </GlassPanel>
      )}
      {data?.enabled && (
        <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-white/70">
            Shipping updates from Printful: {data.webhookConfigured ? 'key set on the server. Register once (safe to repeat).' : <span className="text-amber-200">set MERCH_WEBHOOK_KEY (16+ chars) on the backend first.</span>}
          </span>
          <Button size="sm" variant="outline" onClick={webhook} disabled={!data.webhookConfigured || busy === 'webhook'}>
            {busy === 'webhook' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Webhook className="mr-1.5 h-4 w-4" />} Register Printful webhook
          </Button>
        </GlassPanel>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Products</h3>
        {!data ? <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          : data.products.length === 0 ? <p className="text-sm text-white/50">No products yet. Create them in Printful, then Sync.</p>
            : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.products.map((p) => (
                  <GlassPanel key={p.id} className={`flex gap-3 p-3 ${!p.active || p.hidden ? 'opacity-60' : ''}`}>
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
                      {p.thumbnail && <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-semibold text-white">{p.name}</p>
                      <p className="text-white/50">{usd(p.minPriceCents)} · {p.variants} variants</p>
                      <p className="text-xs text-white/40">
                        {!p.active ? 'Removed in Printful' : p.hidden ? 'Hidden' : <a href={`/shop/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center hover:text-white">/shop/{p.slug} <ExternalLink className="ml-1 h-3 w-3" /></a>}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2" disabled={!p.active || busy === `hide:${p.id}`} onClick={() => toggleHidden(p)}>
                          {p.hidden ? <><Eye className="mr-1 h-3 w-3" /> Show</> : <><EyeOff className="mr-1 h-3 w-3" /> Hide</>}
                        </Button>
                        <SortInput value={p.sort} onSave={(v) => setSort(p, v)} />
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Orders (latest 100)</h3>
        {!data ? <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          : data.orders.length === 0 ? <p className="text-sm text-white/50">No orders yet.</p>
            : (
              <div className="space-y-3">
                {data.orders.map((o) => (
                  <GlassPanel key={o.id} className="p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">#{o.number} · {usd(o.totalCents)}{o.discountCents > 0 && <span className="ml-2 text-xs font-normal text-white/50">({usd(o.discountCents)} off)</span>}</p>
                      <p className={`font-semibold uppercase tracking-wide ${STATUS_COLOR[o.status] || 'text-white/70'}`}>
                        {o.status}{o.printfulStatus ? <span className="ml-2 font-normal normal-case text-white/40">Printful: {o.printfulStatus}</span> : null}
                      </p>
                    </div>
                    <p className="text-white/50">{fmt(o.createdAt)} · {o.name || '—'}{o.city ? ` · ${o.city}, ${o.state || ''}` : ''}{o.email ? ` · ${o.email}` : ''}</p>
                    <p className="mt-1 text-white/70">{o.items.map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ''} × ${i.quantity}`).join(', ')}</p>
                    {o.printfulOrderId && <p className="text-xs text-white/40">Printful order {o.printfulOrderId}</p>}
                    {o.lastError && <p className="mt-1 text-rose-400">{o.lastError}</p>}
                    {o.shipments?.map((s, n) => (
                      <p key={n} className="mt-1 text-emerald-300">
                        {s.carrier} {s.trackingNumber}{' '}
                        {/^https:\/\//.test(s.trackingUrl || '') && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">track</a>}
                      </p>
                    ))}
                    {(o.status === 'failed' || o.status === 'paid') && (
                      <Button size="sm" variant="outline" className="mt-2" disabled={busy === `retry:${o.id}`} onClick={() => retry(o)}>
                        {busy === `retry:${o.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RotateCw className="mr-1.5 h-4 w-4" />} Retry sending to Printful
                      </Button>
                    )}
                  </GlassPanel>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}

function SortInput({ value, onSave }) {
  const [v, setV] = useState(String(value ?? 0));
  useEffect(() => setV(String(value ?? 0)), [value]);
  const save = () => { const n = Number.parseInt(v, 10); if (Number.isInteger(n) && n !== value) onSave(n); };
  return (
    <label className="flex items-center gap-1 text-xs text-white/50">
      Order
      <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && save()} inputMode="numeric" className="h-7 w-14 px-2 text-xs" aria-label="Shop order" />
    </label>
  );
}
