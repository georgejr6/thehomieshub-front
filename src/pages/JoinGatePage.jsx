import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, ShieldCheck, Mail, Crown } from 'lucide-react';

const API_BASE = 'https://backend.thehomies.app/api';
const GUILD_ID = '1293582001840062525';
const OPEN_DISCORD_URL = `https://discord.com/channels/${GUILD_ID}`;

function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 127.14 96.36" fill="currentColor">
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
  );
}

const Shell = ({ children }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">{children}</div>
  </div>
);

const StepDots = ({ active }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {['connect', 'email', 'paywall', 'done'].map((s, i) => {
      const order = { connect: 0, email: 1, paywall: 2, done: 3 };
      const cur = order[active];
      return (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${i <= cur ? 'w-8 bg-primary' : 'w-4 bg-white/15'}`}
        />
      );
    })}
  </div>
);

export default function JoinGatePage() {
  const [params] = useSearchParams();
  const { setAccessToken } = useAuth();
  const { toast } = useToast();

  const [booting, setBooting] = useState(true);
  const [step, setStep] = useState('connect'); // connect | email | paywall | done
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [admittedTier, setAdmittedTier] = useState(null);

  // email sub-state
  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // free-tier warning gate
  const [showFreeWarning, setShowFreeWarning] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/gate/status');
      const s = data.result;
      setStatus(s);
      setEmailInput(s.email || '');
      if (s.admitted) { setStep('done'); setAdmittedTier(s.tier === 'discord' || s.tier === 'none' ? 'free' : s.tier); }
      else if (!s.emailVerified) setStep('email');
      else setStep('paywall');
      return s;
    } catch {
      setStep('connect'); // not authenticated yet
      return null;
    }
  }, []);

  // boot: consume ?token= from the gate OAuth redirect, then load status
  useEffect(() => {
    (async () => {
      const token = params.get('token');
      const paid = params.get('paid');
      if (token) {
        await setAccessToken(token);
        window.history.replaceState({}, '', paid ? '/join?paid=1' : '/join');
      }
      if (token || localStorage.getItem('access_token')) {
        const s = await load();
        // returning from a successful paid checkout → drop them straight in
        if (paid && s && s.emailVerified && !s.admitted) admit();
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectDiscord = () => {
    window.location.href = `${API_BASE}/auth/discord?gate=1`;
  };

  const sendCode = async () => {
    const email = (emailInput || status?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      // If the account has no email yet (or it changed), save it first.
      if (!status?.email || status.email !== email) {
        await api.patch('/auth/add-email', { email });
      }
      await api.post('/auth/verify-email/send', { email });
      setCodeSent(true);
      toast({ title: 'Code sent', description: `Check ${email} for a 6-digit code.` });
    } catch (err) {
      toast({ title: 'Could not send code', description: err.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      toast({ title: 'Enter the 6-digit code', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/verify-email/confirm', { code: code.trim() });
      toast({ title: 'Email confirmed ✓' });
      await load(); // advances to paywall
    } catch (err) {
      toast({ title: 'Invalid code', description: err.response?.data?.message || 'Check the code and try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const startCheckout = async (plan, billingCycle) => {
    setBusy(true);
    try {
      const { data } = await api.post('/subscription/checkout', { plan, billingCycle, gate: true });
      const url = data?.result?.url;
      if (url) window.location.href = url;
      else throw new Error('no url');
    } catch (err) {
      toast({ title: 'Checkout failed', description: err.response?.data?.message || 'Try again.', variant: 'destructive' });
      setBusy(false);
    }
  };

  const admit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/gate/admit');
      setAdmittedTier(data?.result?.tier || 'free');
      setStep('done');
    } catch (err) {
      const code = err.response?.data?.error?.code || err.response?.data?.code;
      if (code === 'gate_reauth') {
        toast({ title: 'Session expired', description: 'Reconnecting your Discord…' });
        return connectDiscord();
      }
      toast({ title: 'Could not add you to Discord', description: err.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (booting) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <StepDots active={step} />

      {/* ── Step 1: Connect Discord ── */}
      {step === 'connect' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#5865F2] flex items-center justify-center mx-auto mb-6">
            <DiscordIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Join The Homies</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-8">
            Verify with Discord to get in. Takes 30 seconds — it keeps the community clean and gets you your role instantly.
          </p>
          <Button size="lg" onClick={connectDiscord} className="w-full font-bold text-white h-12" style={{ background: '#5865F2' }}>
            <DiscordIcon className="w-5 h-5 mr-2" /> Continue with Discord
          </Button>
          <p className="text-white/30 text-[11px] mt-4">We never post to Discord for you. We only verify who you are.</p>
        </div>
      )}

      {/* ── Step 2: Confirm email (HARD GATE) ── */}
      {step === 'email' && (
        <div>
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground text-center">Confirm your email</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6 text-center">
            One quick step before you get in. We'll send a 6-digit code.
          </p>

          {!codeSent ? (
            <div className="space-y-3">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@email.com"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-foreground placeholder:text-white/30 outline-none focus:border-primary/60"
              />
              <Button size="lg" onClick={sendCode} disabled={busy} className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Send my code
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-center tracking-[0.4em] text-lg text-foreground placeholder:tracking-normal placeholder:text-white/30 outline-none focus:border-primary/60"
              />
              <Button size="lg" onClick={confirmCode} disabled={busy} className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirm & continue
              </Button>
              <button onClick={sendCode} disabled={busy} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">
                Didn't get it? Resend code
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Paywall (upsell, free is the floor) ── */}
      {step === 'paywall' && !showFreeWarning && (
        <div>
          <h1 className="text-2xl font-extrabold text-foreground text-center">You're verified ✓</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6 text-center">
            Pick how you want in. Members get everything; free gets you a limited seat.
          </p>

          {/* Hero — Homie Yearly */}
          <button
            onClick={() => startCheckout('homies', 'yearly')}
            disabled={busy}
            className="w-full text-left rounded-2xl border-2 border-primary bg-primary/5 p-5 mb-3 relative overflow-hidden hover:bg-primary/10 transition-colors"
          >
            <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Best value</span>
            <div className="flex items-center gap-2 text-primary mb-1"><Crown className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">The Homie — Yearly</span></div>
            <div className="flex items-end gap-1"><span className="text-3xl font-extrabold text-foreground">$100</span><span className="text-muted-foreground text-sm mb-1">/ year</span></div>
            <p className="text-primary text-xs font-semibold mt-1">Just $8.33/mo — full app + Discord, everything unlocked</p>
          </button>

          {/* Primary — Homie Monthly */}
          <button
            onClick={() => startCheckout('homies', 'monthly')}
            disabled={busy}
            className="w-full text-left rounded-2xl border border-white/10 bg-card p-5 mb-3 hover:border-primary/40 transition-colors"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-foreground/70 mb-1">The Homie — Monthly</div>
            <div className="flex items-end gap-1"><span className="text-2xl font-extrabold text-foreground">$15</span><span className="text-muted-foreground text-sm mb-0.5">/ month</span></div>
            <p className="text-muted-foreground text-xs mt-1">Full app access + Discord included</p>
          </button>

          {/* Secondary — Nomad */}
          <button
            onClick={() => startCheckout('nomad', 'yearly')}
            disabled={busy}
            className="w-full text-left rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 mb-5 hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-400">Digital Nomad — mentorship + everything</span>
              <span className="text-xs text-emerald-400/80">$840/yr</span>
            </div>
          </button>

          <div className="flex items-center gap-2 my-4"><div className="h-px bg-white/10 flex-1" /><span className="text-white/30 text-xs">or</span><div className="h-px bg-white/10 flex-1" /></div>

          <button
            onClick={() => setShowFreeWarning(true)}
            disabled={busy}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
          >
            Just want in? Continue with free limited access →
          </button>
        </div>
      )}

      {/* Free-tier warning */}
      {step === 'paywall' && showFreeWarning && (
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-7 h-7 text-white/50" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Heads up — free is limited</h1>
          <div className="text-sm text-muted-foreground mt-3 mb-6 text-left bg-white/5 rounded-xl p-4 space-y-2">
            <p>• You'll get in, but with a limited set of channels.</p>
            <p>• <span className="text-foreground font-medium">You won't see prior chat history</span> or member-only channels.</p>
            <p>• No members-only content, media library, or perks.</p>
            <p className="text-white/50">You can upgrade any time to unlock everything.</p>
          </div>
          <Button size="lg" onClick={admit} disabled={busy} className="w-full h-12 font-bold text-white" style={{ background: '#5865F2' }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Continue with limited access
          </Button>
          <button onClick={() => setShowFreeWarning(false)} disabled={busy} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 mt-2">
            ← See membership options
          </button>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <Check className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">You're in! 🎉</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-8">
            You've been added to The Homies Discord{admittedTier && admittedTier !== 'free' ? ` as a ${admittedTier} member` : ''}. Open Discord to jump in.
          </p>
          <Button size="lg" onClick={() => (window.location.href = OPEN_DISCORD_URL)} className="w-full h-12 font-bold text-white" style={{ background: '#5865F2' }}>
            <DiscordIcon className="w-5 h-5 mr-2" /> Open Discord
          </Button>
        </div>
      )}
    </Shell>
  );
}
