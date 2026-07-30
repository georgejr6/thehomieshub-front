import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X, CreditCard } from 'lucide-react';
import api from '@/api/homieshub';

// Loads Stripe.js from Stripe's CDN on demand — no npm package needed, and
// it's the same script tag Stripe's own docs recommend for the Payment
// Element. Cached on window so multiple modals on the same page don't
// re-inject it.
function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (window.__stripeJsPromise) return window.__stripeJsPromise;
  window.__stripeJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(window.Stripe);
    script.onerror = () => reject(new Error('Failed to load payment form'));
    document.head.appendChild(script);
  });
  return window.__stripeJsPromise;
}

// A normal-looking card payment modal — no wallet, no crypto terminology.
// `intentFetcher` is an async fn returning { client_secret, amount_micro_usdc }
// from one of the /api/x402/*-intent endpoints. `onSettled(confirmResult)`
// fires once the backend has independently verified the charge and settled
// it (unlock -> stream_url etc; tip -> { tipped: true, ... }).
export default function PayWithCardModal({ open, onClose, title, intentFetcher, onSettled }) {
  const [stage, setStage] = useState('loading'); // loading | ready | paying | error | done
  const [errorMsg, setErrorMsg] = useState('');
  const [amountLabel, setAmountLabel] = useState('');
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentIntentIdRef = useRef(null);
  const mountRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStage('loading');
    setErrorMsg('');

    (async () => {
      try {
        const [StripeCtor, intent] = await Promise.all([loadStripeJs(), intentFetcher()]);
        if (cancelled) return;

        if (!intent?.client_secret) throw new Error(intent?.error || 'Could not start payment');
        paymentIntentIdRef.current = intent.payment_intent_id;
        setAmountLabel(`$${(intent.amount_micro_usdc / 1_000_000).toFixed(2)}`);

        // Publishable key is safe to expose client-side by design (Stripe's
        // whole model) — read from build-time env, same convention as any
        // other VITE_ var in this app.
        const publishableKey = import.meta.env.VITE_DIGITVL_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) throw new Error('Payments are not configured yet');

        const stripe = StripeCtor(publishableKey);
        const elements = stripe.elements({ clientSecret: intent.client_secret });
        const paymentElement = elements.create('payment');
        stripeRef.current = stripe;
        elementsRef.current = elements;

        // mountRef.current is set by the JSX below before this effect's
        // async work resolves in practice, but guard anyway.
        if (mountRef.current) paymentElement.mount(mountRef.current);
        setStage('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err.message || 'Something went wrong starting the payment');
        setStage('error');
      }
    })();

    return () => { cancelled = true; };
  }, [open, intentFetcher]);

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setStage('paying');
    setErrorMsg('');

    const { error, paymentIntent } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      redirect: 'if_required', // stays in-page for a card payment instead of bouncing to a return URL
    });

    if (error) {
      setErrorMsg(error.message || 'Payment failed');
      setStage('ready');
      return;
    }

    try {
      const resp = await api.post('/x402/confirm', { paymentIntentId: paymentIntent.id });
      setStage('done');
      onSettled?.(resp?.data?.result);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Payment succeeded but we could not finish unlocking — contact support.');
      setStage('error');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-sm p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-white font-bold text-lg">{title}</h2>
        </div>
        {amountLabel && <p className="text-gray-400 text-sm mb-4">{amountLabel} — charged to your card</p>}

        {stage === 'loading' && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        )}

        {/* Kept mounted (just hidden) once loading finishes so Stripe's
            Payment Element has a stable DOM node to attach to. */}
        <div ref={mountRef} className={stage === 'loading' || stage === 'error' ? 'hidden' : ''} />

        {stage === 'error' && (
          <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
        )}

        {(stage === 'ready' || stage === 'paying') && (
          <>
            {errorMsg && <p className="text-red-400 text-sm mt-2">{errorMsg}</p>}
            <button
              onClick={handlePay}
              disabled={stage === 'paying'}
              className="w-full mt-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-black font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
            >
              {stage === 'paying' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {stage === 'paying' ? 'Processing…' : 'Pay'}
            </button>
          </>
        )}

        {stage === 'done' && (
          <p className="text-green-400 text-sm mt-4">Done! 🎉</p>
        )}
      </div>
    </div>
  );
}
