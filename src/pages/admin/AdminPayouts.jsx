import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, DollarSign, Wallet, CreditCard, Coins, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const AdminPayouts = () => {
  const { toast } = useToast();
  const [data, setData] = useState({ requests: [], owedCreators: [], totalRequestedCents: 0, totalOwedCents: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/payouts');
      if (res.status) setData(res.result);
    } catch {
      toast({ title: 'Error', description: 'Failed to load payouts.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const pay = async ({ requestId, creatorId, method, key }) => {
    const label = method === 'stripe' ? 'Stripe' : method === 'algorand' ? 'USDC' : 'Manual';
    if (!window.confirm(`Pay this creator via ${label}?`)) return;
    setBusyId(key);
    try {
      const body = requestId ? { requestId, method } : { creatorId, method };
      const { data: res } = await api.post('/admin/payouts/pay', body);
      if (res.status) {
        toast({ title: 'Payout sent 💸', description: `${res.result.points} pts (${usd(res.result.points)}) via ${label}.` });
        await load();
      } else {
        toast({ title: 'Payout failed', description: res.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Payout failed', description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    if (!window.confirm('Reject this request? The points are refunded to the creator.')) return;
    setBusyId(`reject-${id}`);
    try {
      await api.post(`/admin/payouts/${id}/reject`, {});
      toast({ title: 'Request rejected', description: 'Points refunded to the creator.' });
      await load();
    } catch (err) {
      toast({ title: 'Could not reject', description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const PayButtons = ({ creator, requestId, points, keyBase }) => (
    <div className="flex flex-wrap gap-1.5 justify-end">
      <Button size="sm" variant="outline" className="gap-1 h-8" disabled={!creator?.stripeConnectId || busyId === `${keyBase}-stripe`}
        onClick={() => pay({ requestId, creatorId: creator?._id, method: 'stripe', key: `${keyBase}-stripe` })}
        title={creator?.stripeConnectId ? 'Pay via Stripe' : 'No Stripe Connect'}>
        {busyId === `${keyBase}-stripe` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Stripe
      </Button>
      <Button size="sm" variant="outline" className="gap-1 h-8" disabled={!creator?.algorandAddress || busyId === `${keyBase}-algo`}
        onClick={() => pay({ requestId, creatorId: creator?._id, method: 'algorand', key: `${keyBase}-algo` })}
        title={creator?.algorandAddress ? 'Pay via USDC' : 'No Algorand wallet'}>
        {busyId === `${keyBase}-algo` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />} USDC
      </Button>
      <Button size="sm" variant="ghost" className="gap-1 h-8" disabled={busyId === `${keyBase}-manual`}
        onClick={() => pay({ requestId, creatorId: creator?._id, method: 'manual', key: `${keyBase}-manual` })}>
        {busyId === `${keyBase}-manual` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Mark paid
      </Button>
    </div>
  );

  const CreatorCell = ({ c }) => (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar className="h-7 w-7"><AvatarImage src={c?.avatarUrl} /><AvatarFallback>{(c?.username || '?')[0]?.toUpperCase()}</AvatarFallback></Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">@{c?.username || 'unknown'}</p>
        <p className="text-xs text-muted-foreground truncate">{c?.email || 'no email'}</p>
      </div>
    </div>
  );

  const methodBadges = (c) => (
    <div className="flex gap-1">
      <Badge variant={c?.stripeConnectId ? 'secondary' : 'outline'} className="text-[10px] h-5">{c?.stripeConnectId ? 'Stripe ✓' : 'Stripe ✗'}</Badge>
      <Badge variant={c?.algorandAddress ? 'secondary' : 'outline'} className="text-[10px] h-5">{c?.algorandAddress ? 'USDC ✓' : 'USDC ✗'}</Badge>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Creator Payouts</h1>
          <p className="text-muted-foreground text-sm">Everyone you owe tip earnings. Pay via Stripe, USDC, or mark manual.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Open requests total</CardDescription><CardTitle className="text-2xl">{usd(data.totalRequestedCents)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Total owed (all creators)</CardDescription><CardTitle className="text-2xl">{usd(data.totalOwedCents)}</CardTitle></CardHeader></Card>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin inline text-primary" /></div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Payout requests ({data.requests?.length || 0})</CardTitle><CardDescription>Creators who asked to cash out.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {(data.requests || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No open payout requests.</p>
              ) : data.requests.map((r) => (
                <div key={r._id} className="flex flex-col md:flex-row md:items-center gap-3 justify-between border rounded-xl p-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <CreatorCell c={r.creator} />
                    <div className="text-right md:text-left">
                      <p className="font-bold">{usd(r.amountCents)}</p>
                      {methodBadges(r.creator)}
                    </div>
                    {r.status === 'processing' && <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/20">processing</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <PayButtons creator={r.creator} requestId={r._id} points={r.points} keyBase={`req-${r._id}`} />
                    <Button size="sm" variant="ghost" className="h-8 text-destructive" disabled={busyId === `reject-${r._id}`} onClick={() => reject(r._id)}>
                      {busyId === `reject-${r._id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Creators with an owed balance ({data.owedCreators?.length || 0})</CardTitle><CardDescription>Owed tips even without a formal request — you can pay them directly.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {(data.owedCreators || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nobody's carrying an owed balance.</p>
              ) : data.owedCreators.map((c) => (
                <div key={c._id} className="flex flex-col md:flex-row md:items-center gap-3 justify-between border rounded-xl p-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <CreatorCell c={c} />
                    <div className="text-right md:text-left">
                      <p className="font-bold">{usd(c.tipEarnings?.owedPoints)}</p>
                      {methodBadges(c)}
                    </div>
                  </div>
                  <PayButtons creator={c} creatorId={c._id} points={c.tipEarnings?.owedPoints} keyBase={`owed-${c._id}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminPayouts;
