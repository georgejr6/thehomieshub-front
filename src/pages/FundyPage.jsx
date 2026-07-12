import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import {
  Heart, ArrowRight, X, Loader2, Check, Sparkles, Crown,
  CreditCard, DollarSign, Send, PartyPopper,
} from 'lucide-react';
import api from '@/api/homieshub';

const GOLD = '#E5A62E';
const BR_GREEN = '#009B3A';
const BR_YELLOW = '#FEDF00';

const PRESETS = [25, 50, 100, 250];

function money(n) {
  return `$${Number(n || 0).toLocaleString()}`;
}

/* ── animated count-up ─────────────────────────────────────────── */
function useCountUp(target, on) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf, start;
    const dur = 1100;
    const from = 0;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, on]);
  return val;
}

export default function FundyPage() {
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  const load = () => api.get('/fund/brazil').then((r) => setFund(r.data)).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('thanks') === '1') {
      setThanks(true);
      window.history.replaceState({}, '', '/fundy');
      // give the Stripe webhook a moment, then refresh totals
      setTimeout(load, 2500);
    }
  }, []);

  const raised = fund?.raised || 0;
  const goal = fund?.goal || 5000;
  const percent = fund?.percent ?? Math.min(100, Math.round((raised / goal) * 100));
  const shown = useCountUp(raised, !!fund);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  const whale = (fund?.tiers || []).find((t) => t.id === 'whale');

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080808] text-white">
      <Helmet><title>Mwosa Meets Brazil · Homies Hub</title></Helmet>

      {/* animated backdrop */}
      <motion.div aria-hidden className="pointer-events-none fixed -top-40 left-1/4 h-[38rem] w-[38rem] rounded-full blur-[130px]"
        style={{ background: `${BR_GREEN}33` }} animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 9, repeat: Infinity }} />
      <motion.div aria-hidden className="pointer-events-none fixed bottom-0 right-1/4 h-[32rem] w-[32rem] rounded-full blur-[130px]"
        style={{ background: `${GOLD}2e` }} animate={{ scale: [1.1, 1, 1.1], opacity: [0.35, 0.6, 0.35] }} transition={{ duration: 11, repeat: Infinity }} />

      {/* thank-you ribbon */}
      <AnimatePresence>
        {thanks && (
          <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 py-3 text-sm font-bold text-black"
            style={{ background: GOLD }}>
            <PartyPopper className="h-4 w-4" /> Gracias! You're officially part of the movement. 🇧🇷
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-20 text-center">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, delay: 0.1 }}
          className="text-6xl">{fund?.coverEmoji || '🇧🇷'}</motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-4 text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
          {fund?.title || 'Mwosa Meets Brazil'}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="mt-4 max-w-xl text-lg text-white/60">{fund?.subtitle}</motion.p>

        {/* progress */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="mt-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold" style={{ color: GOLD }}>{money(shown)}</div>
            <div className="pb-1 text-sm text-white/50">of {money(goal)} goal</div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${BR_GREEN}, ${BR_YELLOW})` }}
              initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.5 }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-white/45">
            <span>{percent}% funded</span>
            <span>{fund?.backersCount || 0} backers</span>
          </div>
        </motion.div>

        <motion.button initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
          onClick={() => setPanelOpen(true)}
          className="group mt-8 flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-black shadow-xl transition hover:brightness-110"
          style={{ background: GOLD, boxShadow: `0 20px 60px -15px ${GOLD}88` }}>
          <Heart className="h-5 w-5" /> Back the trip
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </motion.button>
        <p className="mt-3 text-xs text-white/40">Card, Apple/Google Pay, CashApp, Venmo, PayPal &amp; more</p>
      </section>

      {/* STORY */}
      {fund?.story && (
        <section className="mx-auto max-w-2xl px-5 pb-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 text-lg leading-relaxed text-white/70">
            {fund.story}
          </motion.div>
        </section>
      )}

      {/* WHALES tier */}
      {whale && (
        <section className="mx-auto max-w-2xl px-5 py-10">
          <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border p-8"
            style={{ borderColor: `${GOLD}66`, background: `linear-gradient(160deg, ${GOLD}1f, #0a0a0a 65%)` }}>
            <div className="absolute right-5 top-5 opacity-20"><Crown className="h-16 w-16" style={{ color: GOLD }} /></div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-black" style={{ background: GOLD }}>
              <Crown className="h-3.5 w-3.5" /> {whale.name}
            </div>
            <div className="mt-3 text-4xl font-extrabold">{money(whale.amount)}</div>
            <p className="mt-1 text-sm text-white/50">The founding-backer tier for those who go big.</p>
            <ul className="mt-5 space-y-2.5">
              {whale.perks.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${GOLD}22` }}>
                    <Check className="h-3 w-3" style={{ color: GOLD }} />
                  </span>{p}
                </li>
              ))}
            </ul>
            <TierButton fund={fund} tier="whale" label={`Become a Whale · ${money(whale.amount)}`} />
          </motion.div>
        </section>
      )}

      {/* DONOR WALL */}
      {fund?.backers?.length > 0 && (
        <section className="mx-auto max-w-2xl px-5 py-10">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5" style={{ color: GOLD }} /> The backers</h3>
          <div className="space-y-2">
            {fund.backers.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    {b.name || 'Anonymous'}
                    {b.tier === 'whale' && <Crown className="h-3.5 w-3.5" style={{ color: GOLD }} />}
                  </div>
                  {b.message && <div className="truncate text-xs text-white/50">"{b.message}"</div>}
                </div>
                <div className="shrink-0 font-bold" style={{ color: GOLD }}>{money(b.amount)}</div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-white/5 px-5 py-10 text-center text-sm text-white/40">
        <div className="font-extrabold tracking-wide text-white/70">HOMIES <span style={{ color: GOLD }}>HUB</span></div>
        <p className="mt-2">Back the movement. Vem pro Brasil. 🇧🇷</p>
      </footer>

      {/* DONATE PANEL ("another page") */}
      <AnimatePresence>
        {panelOpen && <DonatePanel fund={fund} onClose={() => setPanelOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ── Whale / tier checkout button ──────────────────────────────── */
function TierButton({ fund, tier, label }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/fund/${fund.slug}/checkout`, { tier });
      if (data?.url) window.location.href = data.url;
    } catch { setBusy(false); }
  };
  return (
    <button onClick={go} disabled={busy}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-black transition hover:brightness-110"
      style={{ background: GOLD }}>
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />} {label}
    </button>
  );
}

/* ── Full-screen donate panel: amount + all methods ────────────── */
function DonatePanel({ fund, onClose }) {
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;
  const m = fund?.methods || {};

  const methodLinks = useMemo(() => {
    const out = [];
    if (m.cashapp) out.push({ key: 'cashapp', label: 'CashApp', url: `https://cash.app/${m.cashapp.replace(/^\$?/, '$')}${finalAmount ? `/${finalAmount}` : ''}`, color: '#00D632' });
    if (m.venmo) out.push({ key: 'venmo', label: 'Venmo', url: `https://venmo.com/${m.venmo.replace(/^@/, '')}`, color: '#3D95CE' });
    if (m.paypal) out.push({ key: 'paypal', label: 'PayPal', url: m.paypal, color: '#0070BA' });
    if (m.gofundme) out.push({ key: 'gofundme', label: 'GoFundMe', url: m.gofundme, color: '#00B964' });
    return out;
  }, [m, finalAmount]);

  const payWithCard = async () => {
    if (!finalAmount || finalAmount < 1) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/fund/${fund.slug}/checkout`, {
        amount: finalAmount, name: name.trim() || undefined, message: message.trim() || undefined,
      });
      if (data?.url) window.location.href = data.url;
      else setBusy(false);
    } catch { setBusy(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-white/40 hover:text-white"><X className="h-5 w-5" /></button>

        <h2 className="text-2xl font-extrabold">Back the trip</h2>
        <p className="mt-1 text-sm text-white/50">Pick an amount, then choose how you want to give.</p>

        {/* amount chips */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {PRESETS.map((v) => (
            <button key={v} onClick={() => { setAmount(v); setCustom(''); }}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${!custom && amount === v ? 'text-black' : 'border border-white/15 text-white hover:bg-white/5'}`}
              style={!custom && amount === v ? { background: GOLD } : {}}>
              ${v}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 px-3">
          <DollarSign className="h-4 w-4 text-white/40" />
          <input type="number" min="1" placeholder="Custom amount" value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30" />
        </div>

        {/* optional name/message */}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)"
          className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-white/30" />
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something (optional)"
          className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-white/30" />

        {/* card / apple pay via Stripe */}
        <button onClick={payWithCard} disabled={busy || !finalAmount || finalAmount < 1}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-black transition hover:brightness-110 disabled:opacity-50"
          style={{ background: GOLD }}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          {busy ? 'Opening checkout…' : `Give ${finalAmount ? money(finalAmount) : ''} with card`}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-white/35">Card · Apple Pay · Google Pay — secured by Stripe</p>

        {/* other methods */}
        {methodLinks.length > 0 && (
          <>
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-white/30">
              <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {methodLinks.map((ml) => (
                <a key={ml.key} href={ml.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5">
                  <span className="h-2 w-2 rounded-full" style={{ background: ml.color }} /> {ml.label}
                </a>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-white/35">Sending outside the site? Reply so we can add you to the backer wall.</p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
