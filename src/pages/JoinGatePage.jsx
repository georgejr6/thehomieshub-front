import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, Mail, Crown, MessagesSquare, Globe } from 'lucide-react';

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

const StepDots = ({ active }) => {
  const order = { connect: 0, email: 1, done: 2 };
  const cur = order[active];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i <= cur ? 'w-8 bg-primary' : 'w-4 bg-white/15'}`} />
      ))}
    </div>
  );
};

// Pricing shown per billing cycle. Discord Access is the recommended entry tier.
const TIERS = [
  {
    key: 'discord', name: 'Discord Access', tagline: 'The essentials — get into the server',
    Icon: MessagesSquare, accent: '#5865F2', recommended: true,
    monthly: { price: '$10', per: '/mo' },
    yearly:  { price: '$96', per: '/yr', sub: 'just $8/mo' },
  },
  {
    key: 'homies', name: 'The Homie', tagline: 'Full app access + Discord',
    Icon: Crown, accent: '#F0B94D',
    monthly: { price: '$15', per: '/mo' },
    yearly:  { price: '$100', per: '/yr', sub: 'just $8.33/mo' },
  },
  {
    key: 'nomad', name: 'Digital Nomad', tagline: 'Mentorship + everything',
    Icon: Globe, accent: '#23A55A',
    monthly: { price: '$100', per: '/mo' },
    yearly:  { price: '$840', per: '/yr', sub: 'just $70/mo' },
  },
];

export default function JoinGatePage() {
  const [params] = useSearchParams();
  const { setAccessToken } = useAuth();
  const { toast } = useToast();

  const [booting, setBooting] = useState(true);
  const [step, setStep] = useState('connect'); // connect | email | paywall | done
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [admittedTier, setAdmittedTier] = useState(null);

  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const [billing, setBilling] = useState('monthly'); // monthly | yearly
  const [showFreeWarning, setShowFreeWarning] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/gate/status');
      const s = data.result;
      setStatus(s);
      setEmailInput(s.email || '');
      if (s.admitted) { setStep('done'); setAdmittedTier(s.tier === 'discord' || s.tier === 'none' ? 'free' : s.tier); }
      else if (!s.emailVerified) setStep('email');
      // else: email verified but not yet admitted — boot/confirm auto-admits (email = you're in)
      return s;
    } catch {
      setStep('connect');
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = params.get('token');
      const paid = params.get('paid');
      // Suppress the in-app onboarding tutorial while inside the join funnel —
      // it should never interrupt the join flow.
      localStorage.setItem('hh_onboarding_done', '1');
      if (token) {
        await setAccessToken(token);
        window.history.replaceState({}, '', paid ? '/join?paid=1' : '/join');
      }
      if (token || localStorage.getItem('access_token')) {
        const s = await load();
        // Email confirmed = you're in. Auto-admit anyone verified-but-not-in
        // (covers fresh confirms, paid returns, and resumed/bounced sessions).
        if (s && s.emailVerified && !s.admitted) await admit();
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectDiscord = () => { window.location.href = `${API_BASE}/auth/discord?gate=1`; };

  const sendCode = async () => {
    const email = (emailInput || status?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (!status?.email || status.email !== email) await api.patch('/auth/add-email', { email });
      await api.post('/auth/verify-email/send', { email });
      setCodeSent(true);
      toast({ title: 'Code sent', description: `Check ${email} for a 6-digit code.` });
    } catch (err) {
      // Already sent one recently — don't dead-end; let them enter the code they have.
      if (err.response?.status === 429) {
        setCodeSent(true);
        toast({ title: 'A code was already sent', description: 'Check your email and enter it below — you can resend in a minute.' });
      } else {
        toast({ title: 'Could not send code', description: err.response?.data?.message || 'Try again.', variant: 'destructive' });
      }
    } finally { setBusy(false); }
  };

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) { toast({ title: 'Enter the 6-digit code', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await api.post('/auth/verify-email/confirm', { code: code.trim() });
      toast({ title: "Email confirmed ✓ — you're in!" });
      await admit(); // email confirmed = in (New Homie). Membership upsell shown after.
    } catch (err) {
      toast({ title: 'Invalid code', description: err.response?.data?.message || 'Check the code and try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const startCheckout = async (plan) => {
    setBusy(true);
    try {
      const { data } = await api.post('/subscription/checkout', { plan, billingCycle: billing, gate: true });
      const url = data?.result?.url;
      if (url) window.location.href = url; else throw new Error('no url');
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
      const errCode = err.response?.data?.error?.code || err.response?.data?.code;
      if (errCode === 'gate_reauth') { toast({ title: 'Session expired', description: 'Reconnecting your Discord…' }); return connectDiscord(); }
      toast({ title: 'Could not add you to Discord', description: err.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (booting) {
    return <Shell><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Shell>;
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

      {/* ── Step 2: Confirm email (HARD GATE, immediately after connect) ── */}
      {step === 'email' && (
        <div>
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground text-center">Confirm your email</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6 text-center">One quick step, then you're in. We'll send a 6-digit code.</p>

          {!codeSent ? (
            <div className="space-y-3">
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="you@email.com"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-foreground placeholder:text-white/30 outline-none focus:border-primary/60" />
              <Button size="lg" onClick={sendCode} disabled={busy} className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Send my code
              </Button>
              <button onClick={() => setCodeSent(true)} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">
                Already have a code? Enter it →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-xs text-muted-foreground">Enter the 6-digit code we emailed to <span className="text-foreground">{emailInput || status?.email}</span>.</p>
              <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-center tracking-[0.4em] text-lg text-foreground placeholder:tracking-normal placeholder:text-white/30 outline-none focus:border-primary/60" />
              <Button size="lg" onClick={confirmCode} disabled={busy} className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirm & continue
              </Button>
              <div className="flex items-center justify-between">
                <button onClick={() => { setCode(''); setCodeSent(false); }} disabled={busy} className="text-xs text-muted-foreground hover:text-foreground py-1">← Change email</button>
                <button onClick={sendCode} disabled={busy} className="text-xs text-muted-foreground hover:text-foreground py-1">Resend code</button>
              </div>
            </div>
          )}

          <button onClick={connectDiscord} disabled={busy} className="w-full text-[11px] text-white/30 hover:text-white/60 py-2 mt-3">
            Use a different Discord account
          </button>
        </div>
      )}

      {/* ── Step 3: You're in — Open Discord + membership upsell for free members ── */}
      {step === 'done' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <Check className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">You're in! 🎉</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6">
            {admittedTier && admittedTier !== 'free'
              ? `You've been added to The Homies as a ${admittedTier} member — everything's unlocked. Jump in below.`
              : `You've been added to The Homies Discord. Jump in below.`}
          </p>
          <Button size="lg" onClick={() => (window.location.href = OPEN_DISCORD_URL)} className="w-full h-12 font-bold text-white" style={{ background: '#5865F2' }}>
            <DiscordIcon className="w-5 h-5 mr-2" /> Open Discord
          </Button>

          {/* Upsell — only shown to free members */}
          {(!admittedTier || admittedTier === 'free') && (
            <div className="mt-8 text-left">
              <div className="rounded-xl p-3 mb-4 border text-xs" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' }}>
                <span className="text-red-400 font-semibold">You're on free — it's limited.</span>{' '}
                <span className="text-foreground/70">No prior chat history, member-only channels, or content. Upgrade to unlock everything:</span>
              </div>

              <div className="flex items-center justify-center mb-4">
                <div className="inline-flex bg-white/5 rounded-full p-1 border border-white/10">
                  {['monthly', 'yearly'].map((b) => (
                    <button key={b} onClick={() => setBilling(b)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${billing === b ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {b}{b === 'yearly' && <span className="ml-1 opacity-80">save</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {TIERS.map((t) => {
                  const p = t[billing];
                  const rec = t.recommended;
                  return (
                    <button key={t.key} onClick={() => startCheckout(t.key)} disabled={busy}
                      className={`w-full text-left rounded-2xl p-4 transition-colors relative overflow-hidden ${rec ? 'border-2 bg-white/[0.03]' : 'border border-white/10 bg-card hover:border-white/25'}`}
                      style={rec ? { borderColor: t.accent, boxShadow: `0 0 22px ${t.accent}33` } : undefined}>
                      {rec && <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: t.accent, color: '#0b0b0b' }}>Recommended</span>}
                      <div className="flex items-center gap-2 mb-1.5" style={{ color: t.accent }}>
                        <t.Icon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">{t.name}</span>
                      </div>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-extrabold text-foreground">{p.price}</span>
                        <span className="text-muted-foreground text-sm mb-1">{p.per}</span>
                        {p.sub && <span className="text-xs font-semibold mb-1.5 ml-1.5" style={{ color: t.accent }}>{p.sub}</span>}
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{t.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
