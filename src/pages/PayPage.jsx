import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import PayWithCardModal from '@/components/PayWithCardModal';
import api from '@/api/homieshub';

// Standalone payment page for the mobile app to open in an in-app browser
// sheet (expo-web-browser) -- no parent page exists underneath it the way
// SongPage.jsx has for the web tip flow, so this owns its own terminal
// states instead of just toggling a modal closed.
//
// Auth: the mobile app has its own session (expo-secure-store), which this
// browser sheet does NOT share -- it's a fresh browser context with empty
// localStorage. Rather than force a second login inside the sheet, the
// caller passes a short-lived single-use handoff code via ?code= (minted by
// POST /auth/handoff-code with the app's real token), which this page
// exchanges server-side for a real session token.
//
// SECURITY: an earlier version of this passed the mobile app's real 90-day
// access token directly as ?token=. A code-review pass found that gets
// permanently logged (RouteTracker writes every page's path+query to the
// analytics DB on every pageview, visible in the admin Visitors panel) plus
// any CDN/hosting access logs. A handoff code is worthless the moment it's
// used or expires, so the same logging exposure is a non-issue.
//
// Only 'tip' is supported here by design (see plan/PR notes) -- card-based
// content unlock is intentionally not wired up on mobile yet.
export default function PayPage() {
  const [params] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [outcome, setOutcome] = useState(null); // null | 'done' | 'cancelled'

  const kind = params.get('kind');
  const ownerSlug = params.get('ownerSlug');
  const amountMicroUsdc = Number(params.get('amountMicroUsdc') || 0);
  const label = params.get('label') || 'Send Tip';

  useEffect(() => {
    const code = params.get('code');
    if (!code) { setTokenError(true); return; }
    (async () => {
      try {
        const resp = await api.post('/auth/handoff-exchange', { code });
        const token = resp?.data?.result?.access_token;
        if (!token) throw new Error('no token');
        localStorage.setItem('access_token', token);
        setReady(true);
      } catch {
        setTokenError(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const intentFetcher = useCallback(async () => {
    if (kind !== 'tip') throw new Error('Unsupported payment type');
    if (!ownerSlug || !amountMicroUsdc) throw new Error('Missing payment details');
    const resp = await api.post('/x402/tip-intent', { ownerSlug, amountMicroUsdc });
    return resp?.data?.result;
  }, [kind, ownerSlug, amountMicroUsdc]);

  const handleSettled = useCallback(() => setOutcome('done'), []);
  const handleClose = useCallback(() => setOutcome('cancelled'), []);

  if (tokenError) {
    return (
      <PayPageShell>
        <XCircle className="w-10 h-10 text-red-400" />
        <p className="text-white text-center mt-3">
          This payment link is invalid or expired. Please go back to the app and try again.
        </p>
      </PayPageShell>
    );
  }

  if (outcome === 'done') {
    return (
      <PayPageShell>
        <CheckCircle2 className="w-10 h-10 text-green-400" />
        <p className="text-white font-semibold text-center mt-3">Payment successful!</p>
        <p className="text-gray-400 text-sm text-center mt-1">You can close this tab and return to the app.</p>
      </PayPageShell>
    );
  }

  if (outcome === 'cancelled') {
    return (
      <PayPageShell>
        <p className="text-white text-center">Payment cancelled — you can close this tab.</p>
      </PayPageShell>
    );
  }

  if (!ready) return <PayPageShell />;

  return (
    <PayPageShell>
      <PayWithCardModal
        open
        onClose={handleClose}
        title={label}
        intentFetcher={intentFetcher}
        onSettled={handleSettled}
      />
    </PayPageShell>
  );
}

function PayPageShell({ children }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {children}
    </div>
  );
}
