import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, Mail, ArrowRight, CheckCircle2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/homieshub';
import { captureGeo, isLocationVerified, getCachedGeo, flushNow } from '@/lib/tracker';

// Location-gated event landing page. The visitor sees a blurred preview,
// verifies location (same browser-geo gate the rest of the site uses — the
// visit + coordinates are recorded through the normal /api/track pipeline),
// and once unblurred the page is just an email-for-updates capture + a Join
// button. No event details or sensitive info live here; add real details to
// the EVENT config as the promoter confirms them.
//
// Reused by any event via the EVENTS map below; routed per-slug in App.jsx.

const EVENTS = {
  'rumble-in-paradise': {
    slug: 'rumble-in-paradise',
    kicker: 'Dominican Republic · Live Event',
    title: 'Rumble In Paradise',
    subtitle: 'Boxing · Sosúa, Dominican Republic',
    // Generic placeholder lines shown blurred behind the gate — purely the
    // "there's an itinerary here" tease, no real/sensitive data. Swap these
    // for real details when the promoter sends them.
    teaser: [
      ['Fight Card', 'Full lineup dropping soon'],
      ['Date', 'Announcing shortly'],
      ['Venue', 'Sosúa, Dominican Republic'],
      ['Weekend', 'Fights · beach · afterparties'],
      ['Travel', 'Group rates & itinerary to follow'],
    ],
  },
};

// Stable widths (keyed by line index) so a re-render doesn't reshuffle the bars.
const SKELETON_WIDTHS = ['78%', '62%', '85%', '58%', '72%'];
const SkeletonLine = ({ i = 0 }) => (
  <div className="h-3 rounded-full bg-white/20" style={{ width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] }} />
);

export default function EventInvitePage({ slug }) {
  const navigate = useNavigate();
  const event = useMemo(() => EVENTS[slug] || EVENTS['rumble-in-paradise'], [slug]);

  const [verified, setVerified] = useState(() => isLocationVerified());
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [email, setEmail] = useState('');
  const [emailDone, setEmailDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { flushNow(); }, []); // nudge the visit ping out immediately

  const enableLocation = async () => {
    setBusy(true); setDenied(false);
    const ok = await captureGeo({ force: true });
    setBusy(false);
    if (ok) { setVerified(true); flushNow(); } else setDenied(true);
  };

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
        <meta name="description" content="Rumble In Paradise — a Homies boxing weekend in Sosúa, Dominican Republic. Verify to get updates." />
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

        {/* preview card */}
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl overflow-hidden">
          {/* the blurred/teased itinerary body */}
          <div className={verified ? '' : 'blur-md select-none pointer-events-none'} aria-hidden={!verified}>
            {!verified ? (
              <div className="space-y-4">
                {event.teaser.map(([k], i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-white/40">{k}</div>
                    <SkeletonLine i={i} />
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>

          {/* location overlay (only before verify) */}
          {!verified && (
            <div className="absolute inset-0 z-20 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-extrabold mb-1.5">Verify your location to view</h2>
              <p className="text-white/55 text-sm max-w-xs mb-5">
                This event is location-verified to keep it for real Homies, and so we can send you updates for events near you. Enable location to unlock.
              </p>
              <Button size="lg" onClick={enableLocation} disabled={busy} className="font-bold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                Enable Location
              </Button>
              {denied && (
                <p className="text-red-400 text-xs mt-4 max-w-xs">
                  Location was blocked. Turn it on in your browser's site settings, then try again.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-white/30 mt-5">The Homies · Rumble In Paradise</p>
      </motion.div>
    </div>
  );
}
