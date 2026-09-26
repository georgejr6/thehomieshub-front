import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, Mail, Crown, MessagesSquare, Globe, MapPin, EyeOff, Copy, RotateCcw, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { detectPrivateMode } from '@/lib/privateMode';
import { captureFreshLocation, locationHelp } from '@/lib/joinGeo';

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

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// "No Discord needed" — the one-liner that explains Homies Chat.
function NoDiscordNeeded({ delay = 0.15 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
      className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-[#5865F2]/40 bg-[#5865F2]/15 px-3.5 py-1.5 text-xs font-semibold text-white"
    >
      <MessagesSquare className="h-3.5 w-3.5 text-[#8B95F9]" />
      No Discord needed. Our Discord now lives in the app.
    </motion.div>
  );
}

// Finish screen: a little Homies Chat that "comes alive" — channels, then messages.
const PREVIEW_CHANNELS = ['announcements', 'general', 'travel', 'nightlife'];
const PREVIEW_MESSAGES = [
  { name: 'homie_jay', color: '#F0B94D', text: "who's pulling up this weekend? 🔥" },
  { name: 'nomad.k', color: '#23A55A', text: "just landed ✈️ who's out tonight?" },
  { name: 'dre', color: '#8B95F9', text: "welcome in! say what's up 👋" },
];
function ChatPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
      className="mb-5 flex overflow-hidden rounded-2xl border border-white/10 bg-[#313338] text-left shadow-2xl"
      aria-hidden="true"
    >
      <div className="w-[38%] shrink-0 bg-[#2B2D31] p-2.5">
        <div className="mb-2 truncate px-1 text-[11px] font-bold text-white">The Homies</div>
        {PREVIEW_CHANNELS.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + i * 0.08 }}
            className={`truncate rounded px-1.5 py-1 text-[11px] ${c === 'general' ? 'bg-white/10 text-white' : 'text-[#949BA4]'}`}
          >
            # {c}
          </motion.div>
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-2 p-3">
        {PREVIEW_MESSAGES.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.35 }}
          >
            <div className="text-[11px] font-semibold" style={{ color: m.color }}>{m.name}</div>
            <div className="truncate text-[12px] text-[#DBDEE1]">{m.text}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

const Shell = ({ children }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">{children}</div>
  </div>
);

const StepDots = ({ active }) => {
  const order = { connect: 0, email: 1, location: 2, done: 3, review: 3 };
  const cur = order[active];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[0, 1, 2, 3].map((i) => (
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
  const navigate = useNavigate();
  const { setAccessToken, signOut } = useAuth();
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
  const [locationHelpText, setLocationHelpText] = useState('');
  // Private/incognito windows can't join (the session is forgotten, so people
  // can't resume, and location is often blocked). null = can't tell → allowed.
  const [privateMode, setPrivateMode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Coming back via the browser Back button (bfcache) after leaving for
  // Discord/Google: un-stick the buttons.
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setBusy(false); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/gate/status');
      const s = data.result;
      setStatus(s);
      setEmailInput(s.email || '');
      // Re-verifying account (server: utils/reverifyFlow.js) that already
      // confirmed location → neutral "under review"; never the admit steps.
      if (s.reverifyPending && s.locationEnabled) setStep('review');
      else if (s.admitted) { setStep('done'); setAdmittedTier(s.tier === 'discord' || s.tier === 'none' ? 'free' : s.tier); }
      else if (!s.emailVerified && !s.reverifyPending) setStep('email');
      else if (!s.locationEnabled) setStep('location');
      // else: email verified + location enabled, not yet admitted — boot/confirm auto-admits
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
      // Came back from "Join our Discord too" (either link flow) → finish by adding them to the server.
      // Timestamped so a cancelled Discord trip (which lands on /auth/callback,
      // not here) can't fire a surprise Discord redirect on a later visit.
      let linkPending = false;
      try {
        const at = Number(sessionStorage.getItem('hh_join_link_discord'));
        linkPending = !!at && Date.now() - at < 10 * 60 * 1000;
        sessionStorage.removeItem('hh_join_link_discord');
      } catch { /* private window */ }
      const discordLinked = params.get('discord') === 'connected' || linkPending;
      const discordError = params.get('discord_error');
      if (discordLinked || discordError) window.history.replaceState({}, '', '/join');
      if (discordError) {
        toast({
          title: "Couldn't link that Discord",
          description: discordError === 'already_linked' ? 'That Discord account is already linked to another Homies account.' : 'Please try again.',
          variant: 'destructive',
        });
      }
      detectPrivateMode().then(setPrivateMode).catch(() => {});
      // Suppress the in-app onboarding tutorial while inside the join funnel —
      // it should never interrupt the join flow. (Storage can throw in some
      // private windows — that must never stop the page from loading.)
      try { localStorage.setItem('hh_onboarding_done', '1'); } catch { /* private window */ }
      if (token) {
        await setAccessToken(token);
        window.history.replaceState({}, '', paid ? '/join?paid=1' : '/join');
      }
      let hasToken = !!token;
      try { hasToken = hasToken || !!localStorage.getItem('access_token'); } catch { /* private window */ }
      if (hasToken) {
        const s = await load();
        // Email confirmed + location enabled = you're in. Auto-admit anyone
        // fully verified-but-not-in (covers fresh confirms, paid returns, and
        // resumed/bounced sessions). If location isn't enabled yet, load()
        // already parked them on the 'location' step above.
        if (s && !s.reverifyPending && s.emailVerified && s.locationEnabled && !s.admitted) await admit();
        // Already in Homies Chat and just linked Discord ("Join our Discord too") → add them to the server.
        else if (s && discordLinked && s.admitted && s.hasDiscord && !s.inDiscord && !s.reverifyPending) await admit({ discordOnly: true });
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectDiscord = () => { window.location.href = `${API_BASE}/auth/discord?gate=1`; };
  const markLinkPending = () => { try { sessionStorage.setItem('hh_join_link_discord', String(Date.now())); } catch { /* private window */ } };
  const connectGoogle = () => { window.location.href = `${API_BASE}/auth/google?gate=1`; };
  // Signed-in account that's already in Homies Chat (e.g. Google) → link Discord
  // to THIS account and come back to /join, which then adds them to the server.
  const linkDiscord = async () => {
    setBusy(true);
    markLinkPending();
    // Discord already linked (e.g. from Settings) but not in the server yet →
    // Discord sign-in in gate mode re-grants the server-join permission.
    if (status?.hasDiscord) { connectDiscord(); return; }
    try {
      const { data } = await api.post('/auth/discord/connect?gate=1');
      const url = data?.result?.url;
      if (url) { window.location.href = url; return; }
      throw new Error('no url');
    } catch (err) {
      toast({ title: "Couldn't start Discord", description: err.response?.data?.message || 'Please try again.', variant: 'destructive' });
      setBusy(false);
    }
  };
  const openChat = () => navigate('/chat');

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
      toast({ title: 'Email confirmed ✓' });
      setStatus((st) => ({ ...(st || {}), emailVerified: true }));
      setStep('location'); // last step before admit — enable location, then in
    } catch (err) {
      toast({ title: 'Invalid code', description: err.response?.data?.message || 'Check the code and try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  // Always a fresh reading from the device (never a cached one — cached
  // readings could be old or planted), with fallbacks + hard timeouts so the
  // button can't spin forever. Clear, device-specific help when it fails.
  const enableLocation = async () => {
    setBusy(true);
    setLocationHelpText('');
    try {
      const loc = await captureFreshLocation();
      if (!loc.ok) {
        setLocationHelpText(locationHelp(loc.reason));
        setBusy(false);
        return;
      }
      await api.post('/gate/location', { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy });
      if (status?.reverifyPending) { setStep('review'); setBusy(false); return; }
      await admit(); // location enabled + email confirmed = in
    } catch (err) {
      toast({ title: 'Could not save location', description: err.response?.data?.message || 'Try again.', variant: 'destructive' });
      setBusy(false);
    }
  };

  // Wrong Discord account / want to redo it: sign out of this join session.
  const startOver = () => {
    try { signOut(); } catch { /* ignore */ }
    try { localStorage.removeItem('access_token'); } catch { /* ignore */ }
    setStatus(null); setCode(''); setCodeSent(false); setEmailInput(''); setLocationHelpText('');
    setStep('connect');
  };

  const copyJoinLink = async () => {
    try { await navigator.clipboard.writeText('https://www.thehomies.app/join'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  // Back / Next between join steps. Next only unlocks once that step is done
  // (Discord connected → email confirmed); location must be done with the button.
  const goBack = () => setStep((st) => (st === 'location' ? 'email' : st === 'email' ? 'connect' : st));
  const canGoNext = (step === 'connect' && !!status) || (step === 'email' && !!status?.emailVerified);
  const goNext = () => {
    if (step === 'connect' && status) setStep(status.emailVerified ? 'location' : 'email');
    else if (step === 'email' && status?.emailVerified) setStep('location');
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

  const admit = async ({ discordOnly = false } = {}) => {
    setBusy(true);
    try {
      const { data } = await api.post('/gate/admit');
      setAdmittedTier(data?.result?.tier || 'free');
      setStep('done');
      // discord:false = Homies Chat only (no Discord linked yet).
      const inDiscord = data?.result?.discord !== false;
      setStatus((st) => ({ ...(st || {}), admitted: true, inDiscord }));
      if (discordOnly && inDiscord) toast({ title: "You're in the Discord too ✓" });
    } catch (err) {
      const errCode = err.response?.data?.error?.code || err.response?.data?.code;
      if (errCode === 'gate_reauth') {
        toast({ title: 'Session expired', description: 'Reconnecting your Discord…' });
        if (discordOnly) markLinkPending(); // finish adding them to the server when they're back
        return connectDiscord();
      }
      toast({ title: discordOnly ? 'Could not add you to Discord' : 'Could not finish joining', description: err.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (booting) {
    return <Shell><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Shell>;
  }

  return (
    <Shell>
      {/* Private / incognito window: joining isn't possible here — say so up front. */}
      {privateMode === true && step !== 'done' ? (
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-5">
            <EyeOff className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Private windows can't join</h1>
          <p className="text-muted-foreground text-sm mt-2">
            You're in a private / incognito window. Joining needs your regular browser so we can verify your location and save your progress.
          </p>
          <ol className="mt-5 space-y-2 rounded-xl bg-white/5 p-4 text-left text-sm text-foreground">
            <li><b>1.</b> Close this private window.</li>
            <li><b>2.</b> Open your normal Safari or Chrome.</li>
            <li><b>3.</b> Go to <b>thehomies.app/join</b> and allow location when asked.</li>
          </ol>
          <Button size="lg" onClick={copyJoinLink} className="mt-5 w-full h-12 font-bold">
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}{copied ? 'Link copied' : 'Copy the join link'}
          </Button>
          <button type="button" onClick={() => detectPrivateMode().then(setPrivateMode)} className="mt-3 text-xs text-muted-foreground underline">
            Already in a regular window? Check again
          </button>
        </div>
      ) : (<>
      <StepDots active={step} />

      {/* ── Step 1: Sign in (Discord or Google) ── */}
      {step === 'connect' && (
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-foreground">Join The Homies</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-4">
            Sign in with Discord or Google. Takes 30 seconds and keeps the community clean.
          </p>
          <NoDiscordNeeded />
          {status ? (
            <>
              <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-foreground">
                <Check className="mr-1 inline h-4 w-4 text-emerald-400" />Signed in{status.discordUsername ? <> as <b>@{status.discordUsername}</b></> : status.email ? <> as <b>{status.email}</b></> : ''}
              </div>
              <Button size="lg" onClick={goNext} className="w-full font-bold h-12">Continue</Button>
              <button type="button" onClick={startOver} className="mt-3 w-full text-xs text-muted-foreground underline">Use a different account</button>
            </>
          ) : (
            <div className="space-y-3">
              <Button size="lg" onClick={connectDiscord} className="w-full font-bold text-white h-12" style={{ background: '#5865F2' }}>
                <DiscordIcon className="w-5 h-5 mr-2" /> Continue with Discord
              </Button>
              <Button size="lg" onClick={connectGoogle} variant="outline" className="w-full font-bold h-12 border-white bg-white text-[#1f1f1f] hover:bg-white/90 hover:text-[#1f1f1f]">
                <GoogleIcon className="w-5 h-5 mr-2" /> Continue with Google
              </Button>
            </div>
          )}
          <p className="text-white/30 text-[11px] mt-4">We never post anything for you. We only verify who you are.</p>
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

          {status?.emailVerified ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <Check className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-1 text-sm text-foreground">Email confirmed{status?.email ? <>: <b>{status.email}</b></> : ''}</p>
              <Button size="lg" onClick={goNext} className="mt-3 w-full h-11 font-bold">Continue</Button>
            </div>
          ) : !codeSent ? (
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

          <button onClick={startOver} disabled={busy} className="w-full text-[11px] text-white/30 hover:text-white/60 py-2 mt-3">
            Use a different account
          </button>
        </div>
      )}

      {/* ── Step 3: Enable location (HARD GATE, last step before admit) ── */}
      {step === 'location' && (
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Enable your location</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6">
            Last step — The Homies Hub uses location to keep the community safe. Enable it to finish joining.
          </p>
          <Button size="lg" onClick={enableLocation} disabled={busy} className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />} Enable location
          </Button>
          {locationHelpText && (
            <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-left text-sm text-red-300">{locationHelpText}</div>
          )}
        </div>
      )}

      {/* ── Re-verification submitted (banned account's re-verify window) ── */}
      {step === 'review' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <Check className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Verification submitted</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Thanks — your details are in and your account is being reviewed. You'll get access back once the review is done. Nothing else is needed from you.
          </p>
        </div>
      )}

      {/* ── Step 4: You're in — Homies Chat first, Discord optional, upsell for free members ── */}
      {step === 'done' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <Check className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">You're in! 🎉</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-4">
            {admittedTier && admittedTier !== 'free'
              ? `Welcome to The Homies as a ${admittedTier} member. Everything's unlocked.`
              : `Welcome to The Homies.`}
          </p>
          <NoDiscordNeeded delay={0.1} />
          <ChatPreview />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
            <Button size="lg" onClick={openChat} className="w-full h-14 text-base font-bold text-white" style={{ background: '#5865F2' }}>
              <MessagesSquare className="w-5 h-5 mr-2" /> Check out Homies Chat <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
          {status?.inDiscord ? (
            <button type="button" onClick={() => (window.location.href = OPEN_DISCORD_URL)} className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <DiscordIcon className="w-4 h-4" /> Also open the Discord
            </button>
          ) : (
            <button type="button" onClick={linkDiscord} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">
              <DiscordIcon className="w-4 h-4" /> Join our Discord too (optional)
            </button>
          )}

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
      {step !== 'done' && step !== 'review' && !status?.reverifyPending && (step !== 'connect' || canGoNext) && (
        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={goBack} disabled={busy || step === 'connect'} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:invisible">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button type="button" onClick={goNext} disabled={busy || !canGoNext} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-30">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {(step === 'email' || step === 'location') && (
        <div className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-muted-foreground">
          <p>Your progress is saved. Leave any time — come back to <b>thehomies.app/join</b>, sign in the same way, and you'll pick up right here.</p>
          <button type="button" onClick={startOver} className="mt-2 inline-flex items-center gap-1 underline hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Wrong account? Start over
          </button>
        </div>
      )}
      </>)}
    </Shell>
  );
}
