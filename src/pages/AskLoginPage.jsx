import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import api from '@/api/homieshub';

// Sign-in bridge for Homies Ask (ask.thehomies.app, the knowledge-base agent).
// Logged in here -> mint a 60s single-use handoff code -> send it to Ask, whose
// server exchanges it with the backend. Only ever redirects to ASK_ORIGIN.
const ASK_ORIGIN = 'https://ask.thehomies.app';

export default function AskLoginPage() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // OAuth logins (Google/Discord/Apple) come back through /auth/callback, which honours this.
      try { localStorage.setItem('post_auth_redirect', '/ask-login'); localStorage.setItem('post_auth_redirect_ts', String(Date.now())); } catch { /* private mode */ }
      setOpen(true);
      return;
    }
    if (sent.current) return;
    sent.current = true;
    setOpen(false);
    (async () => {
      try {
        const r = await api.post('/auth/handoff-code', { purpose: 'web' });
        const code = r?.data?.result?.code;
        if (!code) throw new Error('no code');
        window.location.replace(`${ASK_ORIGIN}/api/sso?code=${encodeURIComponent(code)}`);
      } catch {
        sent.current = false;
        setErr("Couldn't sign you in to Ask. Try again.");
      }
    })();
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Homies Ask</h1>
        <p className="text-gray-400 mb-6">
          {err || (user ? 'Signing you in…' : 'Log in with your Homies account to continue.')}
        </p>
        {(!user || err) && !loading && (
          <button
            type="button"
            className="bg-yellow-500 text-black font-semibold rounded-full px-6 py-2"
            onClick={() => (user ? window.location.reload() : setOpen(true))}
          >
            {user ? 'Try again' : 'Log in'}
          </button>
        )}
      </div>
      <AuthModal isOpen={open} onOpenChange={setOpen} />
    </div>
  );
}
