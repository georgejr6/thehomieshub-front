import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// thehomies.app/claim: people whose travel tips were picked up from other creators' public chats earn PENDING
// Homies Points. Here they link the YouTube / Twitch / Kick handle that wrote them (a YouTube channel already
// connected to their account links itself; otherwise they type a one-time code from that handle in a live chat)
// and move the points into their real balance. Server: the homies-chat-listener service.
const API = import.meta.env.VITE_LISTENER_URL || 'https://homies-chat-listener-production.up.railway.app';
const PLATFORMS = [['youtube', 'YouTube'], ['twitch', 'Twitch'], ['kick', 'Kick']];

async function call(path, opts = {}) {
  const token = localStorage.getItem('access_token');
  const r = await fetch(`${API}/api/claim${path}`, { ...opts, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status) throw new Error(j.message || 'Something went wrong');
  return j.result;
}

export default function ClaimPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [code, setCode] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setView(await call('/me')); } catch (e) { setMsg(e.message); } }, []);
  useEffect(() => { if (!loading && !user) { try { localStorage.setItem('post_auth_redirect', '/claim'); localStorage.setItem('post_auth_redirect_ts', String(Date.now())); } catch { /* private mode */ } navigate('/join', { replace: true }); } }, [user, loading, navigate]);
  useEffect(() => { if (user) load(); }, [user, load]);
  // while a code is waiting, check for the link every 8 seconds
  useEffect(() => {
    if (!code) return undefined;
    const t = setInterval(async () => { try { const s = await call(`/code/status?platform=${code.platform}`); if (s.used) { setCode(null); setMsg('Linked! You can claim now.'); load(); } } catch { /* keep waiting */ } }, 8000);
    return () => clearInterval(t);
  }, [code, load]);

  const getCode = async (platform) => { setMsg(''); try { setCode(await call('/code', { method: 'POST', body: { platform } })); } catch (e) { setMsg(e.message); } };
  const redeem = async () => {
    setBusy(true); setMsg('');
    try { const r = await call('/redeem', { method: 'POST', body: {} }); setView(r.view); setMsg(r.total > 0 ? `${r.total} points added to your balance.` : 'Nothing to claim yet.'); if (r.capReached) setMsg((m) => `${m} Daily limit reached, come back tomorrow.`); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const forget = async (key) => {
    if (!window.confirm('Delete everything we hold about this handle (messages, profile, points owed) and stop storing it?')) return;
    try { await call('/forget', { method: 'POST', body: { chatterKey: key } }); setMsg('Deleted. We will not store this handle again.'); load(); } catch (e) { setMsg(e.message); }
  };

  if (!user) return null;
  const pending = view?.pendingTotal || 0;
  return (
    <div className="min-h-screen bg-black text-white p-5 flex justify-center">
      <div className="w-full max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Claim your Homies Points</h1>
          <p className="text-gray-400 text-sm mt-1">When a travel tip you posted in a live chat helps the Homies, points are saved for your handle. Link the handle to your Homies account to move them into your balance.</p>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <div className="text-gray-400 text-sm">Waiting for you</div>
          <div className="text-4xl font-extrabold text-yellow-400">{pending}</div>
          <button type="button" disabled={busy || pending < 1} onClick={redeem} className="mt-3 w-full rounded-full bg-yellow-500 text-black font-semibold py-2 disabled:opacity-40">
            {busy ? 'Claiming...' : 'Claim points'}
          </button>
          {view && <div className="text-xs text-gray-500 mt-2">Claimed today: {view.claimedToday} / {view.dailyCap}</div>}
        </div>

        {msg && <div className="rounded-lg bg-white/10 p-3 text-sm">{msg}</div>}

        <div className="rounded-xl border border-white/10 p-4 space-y-3">
          <div className="font-semibold">Your linked handles</div>
          {!view ? <div className="text-gray-400 text-sm">Loading...</div> : view.links.length === 0 ? (
            <div className="text-gray-400 text-sm">None yet. Connect your YouTube channel in <Link className="underline" to="/settings">settings</Link>, or link a handle below.</div>
          ) : view.links.map((l) => (
            <div key={l.chatterKey} className="flex justify-between text-sm">
              <span>{l.handle} <span className="text-gray-500">({l.platform})</span></span>
              <span className="text-yellow-400">{l.pending} pts <button type="button" className="ml-2 text-xs text-gray-500 underline" onClick={() => forget(l.chatterKey)}>delete my data</button></span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500">We listen to public live chats of travel creators and keep the messages and a short interest profile per handle. Linking a handle proves it is yours, and you can delete everything we hold about it at any time.</p>

        <div className="rounded-xl border border-white/10 p-4 space-y-3">
          <div className="font-semibold">Link a handle</div>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(([k, n]) => <button key={k} type="button" onClick={() => getCode(k)} className="rounded-full border border-white/20 px-4 py-1.5 text-sm">{n}</button>)}
          </div>
          {code && (
            <div className="rounded-lg bg-white/10 p-3 text-sm space-y-1">
              <div>Type this in any live chat on {code.platform}, from the handle you want to link:</div>
              <div className="text-xl font-mono font-bold text-yellow-400 select-all">{code.code}</div>
              <div className="text-gray-400">Works for 30 minutes. This page updates when we see it.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
