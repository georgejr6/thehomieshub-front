import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import api from '@/api/homieshub';

// Sign-in bridge for Homies Ask (ask.thehomies.app, the knowledge-base agent).
// Ask's /api/sso-start sends people here with ?state= (bound to their browser by an
// HttpOnly cookie on Ask). Logged in here -> mint a 60s single-use handoff code ->
// back to Ask with code + state. Only ever redirects to ASK_ORIGIN.
const ASK_ORIGIN = 'https://ask.thehomies.app';
const STATE_RE = /^[a-f0-9]{32}$/;

export default function AskLoginPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const state = params.get('state') || '';
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    // Opened without a valid state (e.g. a shared link): start properly from Ask.
    if (!STATE_RE.test(state)) { window.location.replace(`${ASK_ORIGIN}/api/sso-start`); return; }
    if (loading) return;
    if (!user) {
      // OAuth logins (Google/Discord/Apple/YouTube) come back through /auth/callback, which honours this.
      try { localStorage.setItem('post_auth_redirect', `/ask-login?state=${state}`); localStorage.setItem('post_auth_redirect_ts', String(Date.now())); } catch { /* private mode */ }
      setOpen(true);
      return;
    }
    try { if ((localStorage.getItem('post_auth_redirect') || '').startsWith('/ask-login')) { localStorage.removeItem('post_auth_redirect'); localStorage.removeItem('post_auth_redirect_ts'); } } catch { /* ignore */ }
    if (sent.current) return;
    sent.current = true;
    setOpen(false);
    (async () => {
      try {
        const r = await api.post('/auth/handoff-code', { purpose: 'web' });
        const code = r?.data?.result?.code;
        if (!code) throw new Error('no code');
        window.location.replace(`${ASK_ORIGIN}/api/sso?code=${encodeURIComponent(code)}&state=${state}`);
      } catch {
        sent.current = false;
        setErr("Couldn't sign you in to Ask. Try again.");
      }
    })();
  }, [user, loading, state]);

  // Closing the login window without signing in: don't leave a redirect behind that would
  // bounce a later, unrelated login over to Ask.
  const onOpenChange = (v) => {
    setOpen(v);
    if (!v && !user) {
      try { if ((localStorage.getItem('post_auth_redirect') || '').startsWith('/ask-login')) { localStorage.removeItem('post_auth_redirect'); localStorage.removeItem('post_auth_redirect_ts'); } } catch { /* ignore */ }
    }
  };
  const reopen = () => {
    try { localStorage.setItem('post_auth_redirect', `/ask-login?state=${state}`); localStorage.setItem('post_auth_redirect_ts', String(Date.now())); } catch { /* private mode */ }
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Homies Ask</h1>
        <p className="text-gray-400 mb-6">
          {err || (user ? 'Signing you in…' : 'Log in or sign up with your Homies account to continue.')}
        </p>
        {(!user || err) && !loading && (
          <button
            type="button"
            className="bg-yellow-500 text-black font-semibold rounded-full px-6 py-2"
            onClick={() => (user ? window.location.reload() : reopen())}
          >
            {user ? 'Try again' : 'Log in'}
          </button>
        )}
      </div>
      <AuthModal isOpen={open} onOpenChange={onOpenChange} />
    </div>
  );
}
