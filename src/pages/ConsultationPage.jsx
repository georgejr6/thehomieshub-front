import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Globe2, Plane, Laptop, DollarSign, Users, Camera, MapPin, Compass,
  Check, ArrowRight, Sparkles, Send, Loader2, ShieldCheck, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const reveal = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } }),
};
function Reveal({ children, i = 0, className = '' }) {
  return (
    <motion.div variants={reveal} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-70px' }} className={className}>
      {children}
    </motion.div>
  );
}

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
const scrollToPricing = () => scrollTo('pricing');
const scrollToBook = () => scrollTo('book');

function BookBtn({ label = 'Book a Consultation', className = '', size = 'lg', variant }) {
  return (
    <Button size={size} variant={variant} onClick={scrollToPricing}
      className={`font-semibold gap-2 ${!variant ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-gold' : ''} ${className}`}>
      {label} <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

/* ── data ─────────────────────────────────────────────────────── */
const PILLARS = [
  { Icon: Plane, title: 'Trip Planning', body: 'Where to go, where to stay, the safe zones, the real local playbook — itineraries built from being on the ground, not a blog.' },
  { Icon: Laptop, title: 'Remote Work', body: 'Set up so your income travels with you — tools, workflow, and the systems to actually work from anywhere.' },
  { Icon: DollarSign, title: 'Earning Overseas', body: 'Build income that follows you: freelance, online business, content, and services that pay in any timezone.' },
  { Icon: Users, title: 'Networking & Events', body: 'Plug into the right scenes and events fast. Meet people who move — not tourists, the actual network.' },
  { Icon: Camera, title: 'Content Creation', body: 'Capture the journey and grow your brand or channels while you travel — content that compounds into opportunity.' },
  { Icon: MapPin, title: 'On-the-Ground Guidance', body: 'I show up, translate, and get you acquainted fast — so day one feels like month three.' },
];

const PLANS = [
  {
    name: '30-Min Consultation', price: '$75', unit: '30 min',
    tagline: 'Focused answers, fast.',
    features: ['Trip, remote-work, or income questions', 'A clear, doable next step', 'Recap of what we cover'],
    cta: 'Book 30-Min', interest: '30-Min Consultation ($75)',
  },
  {
    name: '1-Hour Consultation', price: '$150', unit: '1 hour',
    tagline: 'Go deep on your whole move.',
    features: ['Full plan: trip · remote work · earning overseas', 'Networking + content strategy', 'Action steps you can run', 'Written recap included'],
    cta: 'Book 1-Hour', interest: '1-Hour Consultation ($150)', featured: true,
  },
  {
    name: 'City Tours', price: 'Contact', unit: 'for details',
    tagline: 'On-the-ground, in person.',
    features: ['Personal tour, any day', 'Live translation', 'Get acquainted fast', 'Skip the rookie mistakes'],
    cta: 'Contact for Details', interest: 'City Tour',
  },
];

const INTERESTS = ['30-Min Consultation ($75)', '1-Hour Consultation ($150)', 'City Tour', 'Not sure yet'];

const STEPS = [
  { n: 1, t: 'Book a call', d: 'Tell me where you are and where you want to be.' },
  { n: 2, t: 'Get your plan', d: 'A clear, custom method — trip, income, or the whole move.' },
  { n: 3, t: 'Go global', d: 'Execute with support on the ground and online.' },
];

const FAQ = [
  { q: 'Is this only for full-time nomads?', a: 'No. Whether it\'s one big trip, a remote-work setup, or going all-in on the global life — we meet you where you are and build from there.' },
  { q: 'Do you actually help on the ground?', a: 'Yes. On-Ground Guide days include a personal tour, translation, and getting you acquainted with the city so you\'re not fumbling day one.' },
  { q: 'Can you help me earn while traveling?', a: 'That\'s the core of the Go Global Roadmap — building income streams (freelance, content, business) that pay you from anywhere.' },
  { q: 'What if I only need a trip planned?', a: 'The Trip Blueprint is exactly that — a custom itinerary with safe zones, nightlife, food, and local intel, plus a recap of everything we discussed.' },
];

/* ── page ─────────────────────────────────────────────────────── */
export default function ConsultationPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', interest: '1-Hour Consultation ($150)', city: '', dates: '', needs: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Clicking a plan card pre-selects it and jumps to the form.
  const pickAndBook = (interest) => {
    setForm((f) => ({ ...f, interest }));
    scrollToBook();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.includes('@')) {
      toast({ title: 'Add your name and a valid email', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await api.post('/consultation', form);
      setSent(true);
      toast({ title: 'Request sent 🎉', description: "I'll get back to you by email shortly.", className: 'bg-green-500 text-white' });
    } catch (err) {
      // graceful fallback so a lead is never lost
      const body = `Name: ${form.name}\nEmail: ${form.email}\nInterested in: ${form.interest}\nCity: ${form.city}\nWhen: ${form.dates}\n\nWhat they need:\n${form.needs}`;
      window.location.href = `mailto:georgeedosomwan@gmail.com?subject=${encodeURIComponent('Booking request - ' + form.interest)}&body=${encodeURIComponent(body)}`;
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <Helmet><title>Book a Consultation · The Homies Hub</title></Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden px-5 py-24 text-center sm:py-28">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Globe2 className="h-3.5 w-3.5" /> Independent · Global · With a Method
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Go global.<br /><span className="text-primary">On your terms.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Plan the trip, work remote, earn overseas, build your network, and grow your content —
            all things digital nomad, travel, and the independent life, with a real playbook from someone who lives it.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BookBtn />
            <Button size="lg" variant="outline" className="border-primary/40 hover:bg-primary/10 gap-2"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              See Pricing
            </Button>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">Free discovery call · No pressure · Real answers</p>
        </div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">How we help you go global</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Six ways we turn "someday" into a plan you can actually run.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} i={i}>
              <div className="group h-full rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <p.Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                <button onClick={scrollToPricing} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                  Book a consultation <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* METHOD / STEPS */}
      <section className="border-y border-border bg-card/40 px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Compass className="h-4 w-4" /> The Method</div>
            <h2 className="text-3xl font-bold sm:text-4xl">From "I want out" to actually gone</h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} i={i} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-xl font-extrabold text-primary">{s.n}</div>
                <h3 className="mt-4 font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center"><BookBtn /></div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Pick your starting point</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Start with a free call, or jump straight into the package that fits. Every plan ends with a clear next step.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} i={i}>
              <div className={`relative flex h-full flex-col rounded-2xl border p-6 ${p.featured ? 'border-primary bg-primary/[0.06] shadow-glow-gold' : 'border-border bg-card'}`}>
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">MOST POPULAR</div>
                )}
                <div className="text-sm font-semibold text-muted-foreground">{p.name}</div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className="mb-1 text-xs text-muted-foreground">/ {p.unit}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-primary">{p.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15"><Check className="h-3 w-3 text-primary" /></span>{f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => pickAndBook(p.interest)}
                  className={`mt-6 w-full gap-2 ${p.featured ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                  variant={p.featured ? undefined : 'outline'}
                >
                  {p.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Pick an option, send your details, and I'll reply by email to set it up. Tours are custom-quoted.</p>
      </section>

      {/* WHY */}
      <section className="border-y border-border bg-card/40 px-5 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Star className="h-4 w-4" /> Why work with me</div>
            <h2 className="text-3xl font-bold sm:text-4xl">Real experience, not a slideshow</h2>
            <p className="mt-4 text-muted-foreground">
              This isn't theory pulled off YouTube. It's the exact playbook I use living and moving between cities —
              the safe zones, the money moves, the networking, the content, the mistakes you get to skip.
              You get a method, and someone in your corner while you run it.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {['Lived it, not googled it', 'On-the-ground support', 'Honest, no fluff'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> {t}</span>
              ))}
            </div>
            <div className="mt-7"><BookBtn /></div>
          </Reveal>
          <Reveal i={1}>
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-8">
              <Sparkles className="h-8 w-8 text-primary" />
              <p className="mt-4 text-lg font-medium">"The goal is simple: independent and global — with an actual method behind it, not a wish."</p>
              <p className="mt-3 text-sm text-muted-foreground">— The Homies Hub</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Reveal className="text-center"><h2 className="text-3xl font-bold sm:text-4xl">Questions</h2></Reveal>
        <div className="mt-8 space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} i={i}>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* BOOKING */}
      <section id="book" className="px-5 py-20">
        <div className="mx-auto max-w-xl">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Book your session</h2>
            <p className="mt-3 text-muted-foreground">Fill this out and it comes straight to me — I'll reply by email to set up your consultation or tour.</p>
          </Reveal>
          <Reveal i={1}>
            {sent ? (
              <div className="mt-8 rounded-2xl border border-green-500/40 bg-green-500/10 p-8 text-center">
                <Check className="mx-auto h-8 w-8 text-green-500" />
                <p className="mt-3 text-lg font-semibold">Got it — request received.</p>
                <p className="mt-1 text-sm text-muted-foreground">I'll email you back shortly to set it up. Talk soon.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border border-border bg-card p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email" type="email" className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                </div>
                <select value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  {INTERESTS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City / where (for tours)" className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                  <input value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })}
                    placeholder="When (optional)" className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                </div>
                <textarea value={form.needs} onChange={(e) => setForm({ ...form, needs: e.target.value })}
                  placeholder="What do you need? Where are you now, where do you want to go, what are you looking for?" rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <Button type="submit" disabled={sending} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send my request'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">Comes straight to my inbox. No spam — only used to set up your session.</p>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
