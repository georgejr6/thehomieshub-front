import { useState, useEffect, useCallback } from 'react';
import cbApi from '../api/centralbilling';

export function useBilling() {
  const [summary, setSummary] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      cbApi.get('/billing/summary'),
      cbApi.get('/billing/plans'),
    ])
      .then(([sumRes, plansRes]) => {
        if (!cancelled) {
          setSummary(sumRes.data);
          setPlans(plansRes.data?.plans || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load billing info');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const { data } = await cbApi.post('/billing/portal', {
        returnUrl: window.location.href,
      });
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      // portal unavailable — redirect to CB site
      window.open('https://viddy.cloud/billing', '_blank', 'noopener,noreferrer');
    }
  }, []);

  const startCheckout = useCallback(async (priceId) => {
    try {
      const { data } = await cbApi.post('/billing/checkout', {
        priceId,
        successUrl: `${window.location.origin}/settings?billing=success`,
        cancelUrl: window.location.href,
      });
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  }, []);

  return { summary, plans, loading, error, openPortal, startCheckout };
}
