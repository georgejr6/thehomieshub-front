import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, CreditCard, ShieldCheck, Banknote, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

// Real, step-by-step Stripe Connect onboarding so a creator can start getting
// paid. Backed by /wallet/payout/status + /wallet/payout/connect-link.
const PayoutConnect = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState(null); // null while loading
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [{ data: s }, dash] = await Promise.all([
        api.get('/wallet/payout/status'),
        api.get('/marketplace/dashboard').catch(() => null),
      ]);
      setStatus(s?.result || null);
      if (dash?.data?.result?.stats) setEarnings(dash.data.result.stats);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Coming back from Stripe's hosted onboarding — refresh and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payout_success') || params.get('payout_refresh')) {
      if (params.get('payout_success')) {
        toast({ title: 'Welcome back 👋', description: "Checking your payout status…" });
      }
      loadStatus();
      params.delete('payout_success');
      params.delete('payout_refresh');
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', clean);
    }
  }, [loadStatus, toast]);

  const startOnboarding = async () => {
    setStarting(true);
    try {
      const { data } = await api.get('/wallet/payout/connect-link');
      const url = data?.result?.url;
      if (url) { window.location.href = url; return; }
      throw new Error('no url');
    } catch (err) {
      toast({ title: "Couldn't open Stripe", description: err?.response?.data?.message || 'Try again in a moment.', variant: 'destructive' });
      setStarting(false);
    }
  };

  const openDashboard = async () => {
    try {
      const { data } = await api.get('/wallet/payout/dashboard-link');
      const url = data?.result?.url;
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      toast({ title: "Couldn't open Stripe dashboard", variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const connected = !!status?.connected;
  const detailsSubmitted = !!status?.detailsSubmitted;
  const ready = connected && !status?.needsOnboarding;

  // Which of the 3 steps are done.
  const steps = [
    {
      key: 'create',
      icon: CreditCard,
      title: 'Create your payout account',
      desc: 'Takes 10 seconds — no cost to you.',
      done: connected,
    },
    {
      key: 'verify',
      icon: ShieldCheck,
      title: 'Verify identity & add your bank',
      desc: 'Stripe securely handles your ID and bank details.',
      done: detailsSubmitted,
    },
    {
      key: 'paid',
      icon: Banknote,
      title: 'Get paid automatically',
      desc: 'Your 70% cut lands in your bank on every sale.',
      done: ready,
    },
  ];

  const currentStep = steps.findIndex((s) => !s.done); // -1 if all done

  return (
    <Card className={ready ? 'border-green-500/40 bg-green-500/5' : 'border-primary/30'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Banknote className="h-5 w-5 text-primary" />
              Get paid on Homies
            </CardTitle>
            <CardDescription className="mt-1">
              {ready
                ? 'Your payouts are active — you keep 70% of every sale, paid straight to your bank.'
                : 'Connect a payout account so your earnings reach your bank. You keep 70%; we handle the rest.'}
            </CardDescription>
          </div>
          {ready && <Badge className="bg-green-600 shrink-0">Payouts active</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Money owed callout — only when they've earned but can't be paid yet */}
        {!ready && earnings?.pendingPayoutCents > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm">
              You've earned <span className="font-bold">{usd(earnings.pendingPayoutCents)}</span> that's waiting.
              Finish the steps below to get it sent to your bank.
            </p>
          </div>
        )}

        {/* Step list */}
        <ol className="space-y-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isCurrent = i === currentStep;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  s.done ? 'border-green-500/30 bg-green-500/5'
                  : isCurrent ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-muted/20 opacity-70'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  s.done ? 'bg-green-500/15 text-green-500'
                  : isCurrent ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {s.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
                    {s.done && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Done</Badge>}
                  </div>
                  <p className="text-sm font-medium leading-tight">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {status?.disabledReason && !ready && (
          <p className="text-xs text-amber-500 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Stripe needs a bit more info to finish verification.
          </p>
        )}

        {/* Primary action */}
        <div className="flex flex-col sm:flex-row gap-2">
          {ready ? (
            <Button variant="outline" onClick={openDashboard} className="gap-2">
              Open Stripe dashboard <ExternalLink className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={startOnboarding} disabled={starting} className="gap-2 h-11 text-base">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {connected ? 'Continue setup' : 'Set up payouts'}
              {!starting && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Payouts are powered by Stripe. Your bank details are stored by Stripe, never by Homies.
        </p>
      </CardContent>
    </Card>
  );
};

export default PayoutConnect;
