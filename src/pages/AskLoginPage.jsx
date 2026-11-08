import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';
import { setAskReturn, clearAskReturn } from '@/lib/askReturn';

// Sign-in bridge for Homies Ask (ask.thehomies.app, the knowledge-base agent).
// Ask's /api/sso-start sends people here with ?state= (bound to their browser by an
// HttpOnly cookie on Ask). Everyone goes through the same /join gate as the rest of
// the community (connect -> email -> location -> admitted); once admitted we mint a
// 60s single-use handoff code and send them back to Ask. Only redirects to ASK_ORIGIN.
const ASK_ORIGIN = 'https://ask.thehomies.app';
const STATE_RE = /^[a-f0-9]{32}$/;

export default function AskLoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const state = params.get('state') || '';
  const [err, setErr] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    // Opened without a valid state (e.g. a shared link): start properly from Ask.
    if (!STATE_RE.test(state)) { window.location.replace(`${ASK_ORIGIN}/api/sso-start`); return; }
    if (loading || sent.current) return;
    const here = `/ask-login?state=${state}`;
    // Not signed up / signed in yet: the normal join gate, then back here.
    if (!user) { setAskReturn(here); navigate('/join', { replace: true }); return; }
    sent.current = true;
    (async () => {
      try {
        const g = await api.get('/gate/status').catch(() => null);
        const s = g?.data?.result || g?.data || {};
        if (s && s.admitted === false) { sent.current = false; setAskReturn(here); navigate('/join', { replace: true }); return; }
        clearAskReturn();
        const r = await api.post('/auth/handoff-code', { purpose: 'web' });
        const code = r?.data?.result?.code;
        if (!code) throw new Error('no code');
        window.location.replace(`${ASK_ORIGIN}/api/sso?code=${encodeURIComponent(code)}&state=${state}`);
      } catch {
        sent.current = false;
        setErr("Couldn't sign you in to Ask. Try again.");
      }
    })();
  }, [user, loading, state, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Homies Ask</h1>
        <p className="text-gray-400 mb-6">{err || 'Getting your cheat sheet ready…'}</p>
        {err && (
          <button type="button" className="bg-yellow-500 text-black font-semibold rounded-full px-6 py-2" onClick={() => window.location.reload()}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
