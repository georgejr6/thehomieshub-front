import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2, Loader2, ExternalLink, Zap } from 'lucide-react';
import { useBilling } from '@/hooks/useBilling';

// summary.activeSubscription shape (from CB backend):
//   { id, status, current_period_end (unix), price: { id, product_name, unit_amount, currency, interval } }
// plans[] shape (from /billing/plans):
//   { id (priceId), lookup_key, unit_amount, currency, interval, product: { name, description }, metadata }
// invoices[] shape:
//   { id, status, currency, amount_paid, invoice_pdf, created (unix) }

function fmtDate(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtAmount(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

const STATUS_COLORS = {
  active: 'text-green-500 border-green-500/30 bg-green-500/10',
  trialing: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  past_due: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10',
};

export default function BillingSection() {
  const { summary, plans, loading, error, openPortal, startCheckout } = useBilling();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const activeSub = summary?.activeSubscription;
  const invoices = summary?.invoices?.slice(0, 3) || [];

  const handlePortal = async () => {
    setPortalLoading(true);
    await openPortal();
    setPortalLoading(false);
  };

  const handleCheckout = async (priceId) => {
    setCheckoutLoading(priceId);
    await startCheckout(priceId);
    setCheckoutLoading(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <CardTitle>Billing & Subscription</CardTitle>
        </div>
        <CardDescription>Manage your plan, invoices, and payment methods.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading billing info…
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-muted-foreground py-2">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* Current plan row */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Current Plan</p>
                {activeSub ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {activeSub.price?.product_name || 'Subscription'}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[11px] ${STATUS_COLORS[activeSub.status] || 'text-muted-foreground'}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {activeSub.status}
                      </Badge>
                    </div>
                    {activeSub.price && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtAmount(activeSub.price.unit_amount, activeSub.price.currency)}/{activeSub.price.interval}
                        {' · '}Renews {fmtDate(activeSub.current_period_end)}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="font-semibold text-muted-foreground">Free</span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={portalLoading}
                className="flex-shrink-0"
              >
                {portalLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Manage</>}
              </Button>
            </div>

            {/* Upgrade plans — only if no active subscription */}
            {!activeSub && plans.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-3 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-500" />Upgrade your plan
                  </p>
                  <div className="grid gap-2">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30"
                      >
                        <div className="min-w-0 mr-4">
                          <p className="font-medium text-sm">{plan.product?.name || plan.lookup_key || plan.id}</p>
                          {plan.product?.description && (
                            <p className="text-xs text-muted-foreground truncate">{plan.product.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-semibold whitespace-nowrap">
                            {fmtAmount(plan.unit_amount, plan.currency)}/{plan.interval || 'mo'}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleCheckout(plan.id)}
                            disabled={checkoutLoading === plan.id}
                          >
                            {checkoutLoading === plan.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : 'Upgrade'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Recent invoices */}
            {invoices.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-2">Recent Invoices</p>
                  <div className="divide-y divide-border">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2.5 gap-2">
                        <div>
                          <p className="text-sm font-medium">{fmtAmount(inv.amount_paid, inv.currency)}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(inv.created)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={inv.status === 'paid'
                              ? 'text-green-500 border-green-500/30 text-[10px]'
                              : 'text-yellow-500 border-yellow-500/30 text-[10px]'}
                          >
                            {inv.status}
                          </Badge>
                          {inv.invoice_pdf && (
                            <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">PDF</Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
