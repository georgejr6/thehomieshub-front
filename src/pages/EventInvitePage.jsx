import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/homieshub';
import { captureGeo, getCachedGeo, flushNow } from '@/lib/tracker';

// Event landing page. On open it fires the browser's native location prompt
// once (same geo pipeline the rest of the site uses — the visit + coordinates
// are recorded through /api/track). The content stays blurred until location
// is allowed; if the visitor denies (or the prompt can't run), they're sent
// away to google.com. Once allowed it's an email-for-updates capture + a Join
// button. No event details or sensitive info live here; add real details to
// the EVENT config as the promoter confirms them.
//
// Reused by any event via the EVENTS map below; routed per-slug in App.jsx.

// Where to send a visitor who won't share location.
const BOUNCE_URL = 'https://www.google.com/';

const EVENTS = {
  'rumble-in-paradise': {
    slug: 'rumble-in-paradise',
    kicker: 'Dominican Republic · Live Event',
    title: 'Rumble In Paradise',
    subtitle: 'Boxing · Sosúa, Dominican Republic',
  },
};

export default function EventInvitePage({ slug }) {
  const navigate = useNavigate();
  const event = useMemo(() => EVENTS[slug] || EVENTS['rumble-in-paradise'], [slug]);

  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [emailDone, setEmailDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  // On open: ask for location. Allowed → unblur the card. Denied, or the
  // prompt can't run → send the visitor away. The card is blurred until then.
  useEffect(() => {
    let alive = true;
    (async () => {
      let ok = false;
      try { ok = await captureGeo({ force: true }); } catch { ok = false; }
      if (!alive) return;
      if (ok) { setVerified(true); flushNow(); }
      else { window.location.replace(BOUNCE_URL); }
    })();
    return () => { alive = false; };
  }, []);

  const submitEmail = async (e) => {
    e?.preventDefault?.();
    setErr('');
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { setErr('Enter a valid email.'); return; }
    setSending(true);
    const geo = getCachedGeo();
    try {
      await api.post('/event-interest', {
        event: event.slug,
        email: value,
        ...(geo?.lat != null && geo?.lon != null ? { lat: geo.lat, lon: geo.lon } : {}),
      });
      setEmailDone(true);
    } catch (e2) {
      const m = e2?.response?.data?.error;
      setErr(m || 'Could not save that. Try again.');
    } finally {
      setSending(false);
    }
  };

  const goJoin = () => navigate('/join');

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white relative overflow-hidden flex items-center justify-center px-4 py-14">
      <Helmet>
        <title>Rumble In Paradise — The Homies</title>
        <meta name="description" content="Rumble In Paradise — a Homies boxing weekend in Sosúa, Dominican Republic. Get updates first." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-24 w-[26rem] h-[26rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-4">
            <Trophy className="h-3.5 w-3.5" />
            {event.kicker}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">{event.title}</h1>
          <p className="text-white/55 mt-3 text-sm">{event.subtitle}</p>
        </div>

        {/* card */}
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl overflow-hidden">
          <div className={verified ? '' : 'blur-md select-none pointer-events-none'} aria-hidden={!verified}>
          <AnimatePresence mode="wait">
            {!emailDone ? (
              <motion.form
                key="email"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onSubmit={submitEmail}
                className="text-center py-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-extrabold mb-1.5">You're on the list first</h2>
                <p className="text-white/55 text-sm mb-5">
                  Drop your email for fight-card drops, dates and ticket info as they're announced.
                </p>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-base outline-none focus:border-primary mb-3"
                />
                {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
                <Button type="submit" size="lg" disabled={sending} className="w-full font-bold">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Keep me posted
                </Button>
                <button
                  type="button"
                  onClick={goJoin}
                  className="block w-full text-center text-xs text-white/40 hover:text-white/70 mt-3"
                >
                  Skip — just take me in
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-extrabold mb-1.5">You're in. We'll email you.</h2>
                <p className="text-white/55 text-sm mb-6">
                  Updates on {event.title} are coming to your inbox. Join The Homies to get it all first.
                </p>
                <Button size="lg" onClick={goJoin} className="w-full font-bold gap-2">
                  Join The Homies <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {/* while location is being requested / before it's allowed */}
          {!verified && (
            <div className="absolute inset-0 z-20 bg-neutral-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin mb-3" />
              <p className="text-white/70 text-sm max-w-xs">Checking your location…</p>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-white/30 mt-5">The Homies · Rumble In Paradise</p>
      </motion.div>
    </div>
  );
}
