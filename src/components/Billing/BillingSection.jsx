import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2, Loader2, ExternalLink, Zap, ArrowRight, Link2, XCircle } from 'lucide-react';
import { useBilling } from '@/hooks/useBilling';
import ClaimSubscriptionDialog from '@/components/Billing/ClaimSubscriptionDialog';

function fmtDate(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtAmount(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);
}

// Strip ✅/emoji bullet noise from Stripe product descriptions — keep only the first sentence
function shortDesc(text) {
  if (!text) return '';
  const clean = text.replace(/[✅☑️✔️]/g, '').trim();
  const firstSentence = clean.split(/[.\n]/)[0].trim();
  return firstSentence.length > 80 ? firstSentence.slice(0, 77) + '…' : firstSentence;
}

const STATUS_BADGE = {
  active:   'text-green-500 border-green-500/30 bg-green-500/10',
  trialing: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  past_due: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10',
};

// Direct Stripe payment links per plan — matched by plan name keywords
const DIRECT_LINKS = [
  { match: /homies tier|15|homies.*month/i, url: 'https://buy.stripe.com/00w5kCfqtbbQ3Nr1iqf7i07' },
  { match: /digital nomad/i,               url: 'https://buy.stripe.com/fZeg0o0xH0k2g3SfZ3' },
];

function getDirectLink(planName = '') {
  const entry = DIRECT_LINKS.find(({ match }) => match.test(planName));
  return entry?.url || null;
}

export default function BillingSection() {
  const { summary, plans, loading, error, openPortal, startCheckout } = useBilling();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [claimOpen, setClaimOpen] = useState(false);

  const activeSub = summary?.activeSubscription;
  const invoices = summary?.invoices?.slice(0, 3) || [];

  const handlePortal = async () => {
    setPortalLoading(true);
    await openPortal();
    setPortalLoading(false);
  };

  const handleCheckout = async (plan) => {
    const directUrl = getDirectLink(plan.product?.name || '');
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setCheckoutLoading(plan.id);
    await startCheckout(plan.id);
    setCheckoutLoading(null);
  };

  return (
    <>
    <ClaimSubscriptionDialog open={claimOpen} onOpenChange={setClaimOpen} />

    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <CardTitle>Billing & Subscription</CardTitle>
        </div>
        <CardDescription>Manage your plan, invoices, and payment methods.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading billing info…
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-muted-foreground py-2">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* ── Current plan ── */}
            <div className="rounded-lg border border-border bg-secondary/20 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-widest mb-1">Current Plan</p>
                {activeSub ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">
                        {activeSub.price?.product_name || 'Subscription'}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[activeSub.status] || ''}`}>
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />{activeSub.status}
                      </Badge>
                    </div>
                    {activeSub.price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {fmtAmount(activeSub.price.unit_amount, activeSub.price.currency)}/{activeSub.price.interval}
                        &nbsp;·&nbsp;Renews {fmtDate(activeSub.current_period_end)}
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <span className="font-bold text-base">Free</span>
                    <p className="text-xs text-muted-foreground mt-1">Upgrade below to unlock full access</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="min-w-[120px]"
                >
                  {portalLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Manage billing</>}
                </Button>
                {activeSub && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="min-w-[120px] text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />Cancel membership
                  </Button>
                )}
              </div>
            </div>
            {activeSub && (
              <p className="text-[11px] text-muted-foreground -mt-3">
                Update your card, download invoices, or cancel anytime in the secure Stripe billing portal.
                Cancelling stops future renewals — your access stays active until the end of the current paid period.
              </p>
            )}

            {/* ── Claim existing subscription ── */}
            {!activeSub && (
              <div className="rounded-lg border border-dashed border-border bg-secondary/10 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Already paid?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">If you subscribed via Stripe but your plan isn't showing, link it here.</p>
                </div>
                <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => setClaimOpen(true)}>
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />Link
                </Button>
              </div>
            )}

            {/* ── Available plans ── only shown when no active sub */}
            {!activeSub && plans.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-widest flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-yellow-500" />Choose a plan
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-lg border border-border bg-secondary/20 p-4 flex flex-col gap-3"
                    >
                      <div>
                        <p className="font-semibold text-sm leading-tight">
                          {plan.product?.name || plan.lookup_key || plan.id}
                        </p>
                        {shortDesc(plan.product?.description) && (
                          <p className="text-xs text-muted-foreground mt-1 leading-snug">
                            {shortDesc(plan.product?.description)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <div>
                          <span className="text-lg font-bold">
                            {fmtAmount(plan.unit_amount, plan.currency)}
                          </span>
                          <span className="text-xs text-muted-foreground">/{plan.interval || 'mo'}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCheckout(plan)}
                          disabled={checkoutLoading === plan.id}
                          className="flex-shrink-0"
                        >
                          {checkoutLoading === plan.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <>Get started <ArrowRight className="w-3 h-3 ml-1" /></>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent invoices ── */}
            {invoices.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-widest">Recent Invoices</p>
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 bg-secondary/10 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{fmtAmount(inv.amount_paid, inv.currency)}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(inv.created)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={inv.status === 'paid'
                              ? 'text-green-500 border-green-500/30 text-[10px] px-1.5'
                              : 'text-yellow-500 border-yellow-500/30 text-[10px] px-1.5'}
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
    </>
  );
}
