import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Crown, Zap, Globe, X, Users, Video,
  Briefcase, BookOpen, MessageCircle, TrendingUp, Folder,
  Star, Shield, Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Feature data ──────────────────────────────────────────────────────────────

const HOMIE_FEATURES = [
  { icon: Video,        text: 'Full access to members-only video content' },
  { icon: Users,        text: 'Exclusive Discord & Homies channels' },
  { icon: Star,         text: 'Patreon / behind-the-scenes content' },
  { icon: TrendingUp,   text: 'Daily investment updates & opportunities', highlight: true },
  { icon: Folder,       text: 'Unlimited Directory access' },
  { icon: Headphones,   text: 'Media Mode — full streaming library' },
  { icon: Shield,       text: 'Wager system access' },
];

const NOMAD_FEATURES = [
  { icon: CheckCircle2, text: 'Everything in The Homie tier', highlight: true },
  { icon: Users,        text: 'All exclusive Nomad channels & content' },
  { icon: Briefcase,    text: 'Remote jobs & freelance contract access', highlight: true },
  { icon: BookOpen,     text: 'Full Digital Nomad course' },
  { icon: Globe,        text: 'Website / e-commerce setup (after 3 months)', highlight: true },
  { icon: MessageCircle, text: '1-on-1 virtual mentorship sessions' },
  { icon: TrendingUp,   text: 'Daily direct mentorship' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const FeatureRow = ({ icon: Icon, text, highlight, light }) => (
  <li className="flex items-start gap-3">
    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', light ? 'text-amber-300' : 'text-primary')} />
    <span className={cn(
      'text-sm leading-relaxed',
      light ? 'text-white/90' : 'text-foreground/90',
      highlight && (light ? 'font-semibold text-white' : 'font-semibold text-foreground'),
    )}>
      {text}
    </span>
  </li>
);

const CompareRow = ({ label, homie, nomad }) => (
  <tr className="border-t border-border/50">
    <td className="py-3 pr-4 text-sm text-muted-foreground">{label}</td>
    <td className="py-3 px-4 text-center">
      {homie === true
        ? <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
        : homie === false
        ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
        : <span className="text-xs text-foreground font-medium">{homie}</span>}
    </td>
    <td className="py-3 pl-4 text-center">
      {nomad === true
        ? <CheckCircle2 className="h-4 w-4 text-amber-400 mx-auto" />
        : nomad === false
        ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
        : <span className="text-xs text-white font-medium">{nomad}</span>}
    </td>
  </tr>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const MembershipsPage = () => {
  const [billing, setBilling] = useState('yearly'); // 'monthly' | 'yearly'

  return (
    <>
      <Helmet>
        <title>Memberships — The Homies Hub</title>
        <meta name="description" content="Join The Homies Hub. Unlock exclusive content, mentorship, investment intel, and the Digital Nomad program." />
      </Helmet>

      <div className="min-h-full bg-background">

        {/* ── Hero ── */}
        <div className="relative border-b border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-amber-600/5 pointer-events-none" />
          <div className="container mx-auto px-4 py-16 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-5">
                <Crown className="h-3.5 w-3.5" />
                Membership Tiers
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
                Level Up With <span className="text-primary">The Homies</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Get exclusive content, investment intel, community access, and — if you're ready — the full Digital Nomad program.
              </p>
            </motion.div>

            {/* Billing toggle */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="inline-flex items-center mt-8 bg-muted/60 border border-border rounded-full p-1"
            >
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'px-5 py-2 rounded-full text-sm font-semibold transition-all',
                  billing === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={cn(
                  'px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2',
                  billing === 'yearly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Yearly
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">SAVE</span>
              </button>
            </motion.div>
          </div>
        </div>

        {/* ── Cards ── */}
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Card 1 — The Homie */}
            <motion.div
              key={`homie-${billing}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden"
            >
              {/* Tier header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    {billing === 'yearly' ? 'Best Value' : 'Monthly'}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-foreground">The Homie</h2>
                <p className="text-muted-foreground text-sm mt-1">For the certified Homies</p>

                <div className="mt-5 flex items-end gap-1">
                  {billing === 'yearly' ? (
                    <>
                      <span className="text-5xl font-extrabold text-foreground">$100</span>
                      <span className="text-muted-foreground text-sm mb-1.5">/ year</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-extrabold text-foreground">$15</span>
                      <span className="text-muted-foreground text-sm mb-1.5">/ month</span>
                    </>
                  )}
                </div>
                {billing === 'yearly' && (
                  <p className="text-primary text-xs font-semibold mt-1.5">Save ~$80 vs monthly billing</p>
                )}
              </div>

              {/* Features */}
              <div className="p-6 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">What's included</p>
                <ul className="space-y-3.5">
                  {HOMIE_FEATURES.map((f, i) => (
                    <FeatureRow key={i} {...f} />
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-6 pt-0">
                {billing === 'yearly' ? (
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(240,185,77,0.2)]"
                  >
                    <a href="https://buy.stripe.com/4gM3cu2DH1Bgdo15yGf7i08" target="_blank" rel="noopener noreferrer">
                      Join — $100 / year
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                  >
                    <a href="https://thehomieshub.com/the-homies-membership/" target="_blank" rel="noopener noreferrer">
                      Join — $15 / month
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Card 2 — Digital Nomad */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="flex flex-col rounded-2xl overflow-hidden relative"
              style={{ background: 'linear-gradient(145deg, #1a1200 0%, #2d1c00 50%, #1a0f00 100%)' }}
            >
              {/* Glow border */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-amber-500/30 pointer-events-none" />

              {/* Tier header */}
              <div className="p-6 border-b" style={{ borderColor: 'rgba(240,185,77,0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Premium</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Digital Nomad</h2>
                <p className="text-amber-200/60 text-sm mt-1">For those ready to thrive abroad</p>

                <div className="mt-5 flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-white">$100</span>
                  <span className="text-amber-200/60 text-sm mb-1.5">/ month</span>
                </div>
                <p className="text-amber-400/80 text-xs font-medium mt-1.5">Full mentorship + course included</p>
              </div>

              {/* Features */}
              <div className="p-6 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/60 mb-4">What's included</p>
                <ul className="space-y-3.5">
                  {NOMAD_FEATURES.map((f, i) => (
                    <FeatureRow key={i} {...f} light />
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-6 pt-0">
                <Button
                  asChild
                  size="lg"
                  className="w-full font-bold text-[#1a0f00] hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(90deg, #F0B94D 0%, #d97706 100%)' }}
                >
                  <a href="https://thehomieshub.com/digital-nomad/" target="_blank" rel="noopener noreferrer">
                    Join Digital Nomad — $100 / mo
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* ── Comparison table ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="max-w-3xl mx-auto mt-16"
          >
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">Compare tiers</h2>
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-1/2">Feature</th>
                    <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-primary">The Homie</th>
                    <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-amber-400">Digital Nomad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-card/50">
                  <CompareRow label="Members-only video content"     homie={true}          nomad={true} />
                  <CompareRow label="Discord & Homies channels"      homie={true}          nomad={true} />
                  <CompareRow label="Patreon / BTS content"          homie={true}          nomad={true} />
                  <CompareRow label="Daily investment updates"        homie={true}          nomad={true} />
                  <CompareRow label="Directory access"               homie="Unlimited"     nomad="Unlimited" />
                  <CompareRow label="Media Mode streaming"           homie={true}          nomad={true} />
                  <CompareRow label="Wager system"                   homie={true}          nomad={true} />
                  <CompareRow label="Exclusive Nomad channels"       homie={false}         nomad={true} />
                  <CompareRow label="Remote jobs & freelance access" homie={false}         nomad={true} />
                  <CompareRow label="Digital Nomad course"           homie={false}         nomad={true} />
                  <CompareRow label="Website / e-commerce setup"     homie={false}         nomad="After 3 mo" />
                  <CompareRow label="1-on-1 virtual meetings"        homie={false}         nomad={true} />
                  <CompareRow label="Daily mentorship"               homie={false}         nomad={true} />
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── FAQ ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="max-w-2xl mx-auto mt-14 space-y-6"
          >
            <h2 className="text-xl font-bold text-foreground text-center mb-8">Common questions</h2>

            {[
              {
                q: 'How do I access member content after subscribing?',
                a: 'Your account will be upgraded within minutes of payment confirmation. Log in and the exclusive feed will unlock automatically.',
              },
              {
                q: 'Can I pay with CashApp?',
                a: 'Yes — CashApp is accepted for all tiers including monthly, 3-month, 6-month, and yearly options. Start the subscription flow inside the app to get payment instructions.',
              },
              {
                q: 'What happens if I cancel?',
                a: 'Access continues until the end of your current billing period. Subscriptions are non-refundable unless explicitly authorized.',
              },
              {
                q: 'Can I upgrade from Homie to Digital Nomad later?',
                a: 'Yes. Reach out through the community or DM an admin to switch plans at any time.',
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="border-b border-border/50 pb-6 last:border-0">
                <p className="font-semibold text-foreground mb-1.5">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Legal note ── */}
          <p className="text-center text-muted-foreground text-xs mt-12 max-w-lg mx-auto">
            All memberships are subject to our{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
            Access may be limited based on verification or community standards.
          </p>
        </div>
      </div>
    </>
  );
};

export default MembershipsPage;
