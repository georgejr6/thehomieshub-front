import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Crown, Zap, Globe, X, Users, Video,
  Briefcase, BookOpen, MessageCircle, TrendingUp, Folder,
  Star, Shield, Headphones, Loader2, CreditCard, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';
import BundleSegment from '@/components/BundleSegment';

const TIER_LABELS = { discord: 'Discord ($10)', homies: 'The Homie ($15)', nomad: 'Digital Nomad' };

// ── Feature data ──────────────────────────────────────────────────────────────

const HOMIE_FEATURES = [
  { icon: CheckCircle2, text: 'Everything in Discord tier included', highlight: true },
  { icon: Video,        text: 'Full access to members-only video content' },
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

const DISCORD_FEATURES = [
  { icon: MessageCircle, text: 'Full Discord server access — Discord only' },
  { icon: Users,         text: 'All community channels & roles' },
  { icon: Shield,        text: 'Verified Homie role on Discord' },
];

const DiscordIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.134 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

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

const CompareRow = ({ label, discord, homie, nomad }) => (
  <tr className="border-t border-border/50">
    <td className="py-3 pr-4 text-sm text-muted-foreground">{label}</td>
    <td className="py-3 px-4 text-center">
      {discord === true
        ? <CheckCircle2 className="h-4 w-4 text-[#5865F2] mx-auto" />
        : discord === false
        ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
        : <span className="text-xs text-foreground font-medium">{discord}</span>}
    </td>
    <td className="py-3 px-4 text-center">
      {homie === true
        ? <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
        : homie === false
        ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
        : <span className="text-xs text-foreground font-medium">{homie}</span>}
    </td>
    <td className="py-3 pl-4 text-center">
      {nomad === true
        ? <CheckCircle2 className="h-4 w-4 mx-auto" style={{ color: '#23A55A' }} />
        : nomad === false
        ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
        : <span className="text-xs text-white font-medium">{nomad}</span>}
    </td>
  </tr>
);

// ── Page ──────────────────────────────────────────────────────────────────────

// plan: 'discord'|'homies'|'nomad', billingCycle: 'monthly'|'yearly'
// direct Stripe links are the fallback for logged-out users
const STRIPE_LINKS = {
  discord_monthly:  'https://buy.stripe.com/28o15u6W5eaS5pebIL',
  discord_yearly:   'https://buy.stripe.com/cNi6oGfqtcfU1Fjgdkf7i0i',  // $96/yr
  homies_yearly:    'https://buy.stripe.com/4gM3cu2DH1Bgdo15yGf7i08',
  homies_monthly:   'https://buy.stripe.com/00w5kCfqtbbQ3Nr1iqf7i07',
  nomad_monthly:    'https://buy.stripe.com/fZeg0o0xH0k2g3SfZ3',
  nomad_yearly:     'https://buy.stripe.com/8x2dR81zDbbQgAdaT0f7i0j',  // $840/yr
};

const MembershipsPage = () => {
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  const currentTier = user?.effectiveTier || null; // 'discord' | 'homies' | 'nomad' | null

  // $10 (discord) → $15 (homies): swap the price on the SAME subscription so the
  // member is NOT double-charged with a second subscription.
  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await api.post('/subscription/upgrade');
      await refreshMe();
      toast({ title: 'Upgraded to The Homie 🎉', description: 'Full access unlocked — enjoy the whole library.' });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Could not upgrade. Try again or contact support.';
      toast({ title: 'Upgrade failed', description: msg, variant: 'destructive' });
    } finally {
      setUpgrading(false);
    }
  };

  // For logged-in users, go through our checkout API so success_url = new site
  // For logged-out users, fall back to direct Stripe links
  const handleJoin = async (plan, billingCycle) => {
    const key = `${plan}_${billingCycle}`;
    if (!user) {
      const url = STRIPE_LINKS[key];
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // Discord tier has no checkout API plan — use direct link
    if (plan === 'discord') {
      window.open(STRIPE_LINKS[key] || STRIPE_LINKS.discord_monthly, '_blank', 'noopener,noreferrer');
      return;
    }
    setCheckoutLoading(key);
    try {
      const { data } = await api.post('/subscription/checkout', { plan, billingCycle });
      const url = data?.result?.url;
      if (url) window.location.href = url;
    } catch {
      // fallback to direct link
      const fallback = STRIPE_LINKS[key];
      if (fallback) window.open(fallback, '_blank', 'noopener,noreferrer');
    } finally {
      setCheckoutLoading(null);
    }
  };

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
              {currentTier && (
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                  Your current plan: {TIER_LABELS[currentTier] || currentTier}
                </p>
              )}

              {/* Manage / connect billing — always reachable for signed-in users */}
              {user && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => navigate('/billing')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {currentTier ? 'Manage or cancel membership' : 'Manage billing'}
                  </Button>
                  {!currentTier && (
                    <Button variant="ghost" onClick={() => navigate('/billing')}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Already paid? Connect your membership
                    </Button>
                  )}
                </div>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

            {/* Card 0 — Discord Access */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.02 }}
              className="flex flex-col rounded-2xl border border-[#5865F2]/30 bg-card overflow-hidden"
            >
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <DiscordIcon className="h-4 w-4 text-[#5865F2]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5865F2]">
                    Community
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-foreground">Discord Access</h2>
                <p className="text-muted-foreground text-sm mt-1">Discord only — no app content included</p>
                <div className="mt-5 flex items-end gap-1">
                  {billing === 'yearly' ? (
                    <>
                      <span className="text-5xl font-extrabold text-foreground">$96</span>
                      <span className="text-muted-foreground text-sm mb-1.5">/ year</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-extrabold text-foreground">$10</span>
                      <span className="text-muted-foreground text-sm mb-1.5">/ month</span>
                    </>
                  )}
                </div>
                {billing === 'yearly' && (
                  <p className="text-[#5865F2] text-xs font-semibold mt-1.5">Just $8/mo billed yearly — save $24</p>
                )}
              </div>
              <div className="p-6 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">What's included</p>
                <ul className="space-y-3.5">
                  {DISCORD_FEATURES.map((f, i) => (
                    <FeatureRow key={i} {...f} />
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  size="lg"
                  className="w-full font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#5865F2' }}
                  onClick={() => handleJoin('discord', billing)}
                  disabled={checkoutLoading === `discord_${billing}`}
                >
                  {checkoutLoading === `discord_${billing}` ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {billing === 'yearly' ? 'Join — $96 / year' : 'Join — $10 / month'}
                </Button>
              </div>
            </motion.div>

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
                <p className="text-muted-foreground text-sm mt-1">Full app access + Discord included</p>

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
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(240,185,77,0.2)]"
                    onClick={() => handleJoin('homies', 'yearly')}
                    disabled={checkoutLoading === 'homies_yearly'}
                  >
                    {checkoutLoading === 'homies_yearly' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Join — $100 / year
                  </Button>
                ) : currentTier === 'discord' ? (
                  <div className="space-y-1.5">
                    <Button
                      size="lg"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                      onClick={handleUpgrade}
                      disabled={upgrading}
                    >
                      {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Upgrade to The Homie — $15 / month
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">Swaps your $10 plan — no double charge, prorated instantly.</p>
                  </div>
                ) : currentTier === 'homies' || currentTier === 'nomad' ? (
                  <Button size="lg" className="w-full font-bold" variant="secondary" disabled>
                    You're on this plan ✓
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                    onClick={() => handleJoin('homies', 'monthly')}
                    disabled={checkoutLoading === 'homies_monthly'}
                  >
                    {checkoutLoading === 'homies_monthly' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Join — $15 / month
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
              style={{ background: 'linear-gradient(145deg, #071a0f 0%, #0d2b18 50%, #071a0f 100%)' }}
            >
              {/* Glow border */}
              <div className="absolute inset-0 rounded-2xl ring-1 pointer-events-none" style={{ ringColor: 'rgba(35,165,90,0.3)', boxShadow: 'inset 0 0 0 1px rgba(35,165,90,0.3)' }} />

              {/* Tier header */}
              <div className="p-6 border-b" style={{ borderColor: 'rgba(35,165,90,0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4" style={{ color: '#23A55A' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#23A55A' }}>Premium</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Digital Nomad</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(35,165,90,0.7)' }}>Everything in Homie + Discord, plus mentorship</p>

                <div className="mt-5 flex items-end gap-1">
                  {billing === 'yearly' ? (
                    <>
                      <span className="text-5xl font-extrabold text-white">$840</span>
                      <span className="text-sm mb-1.5" style={{ color: 'rgba(35,165,90,0.7)' }}>/ year</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-extrabold text-white">$100</span>
                      <span className="text-sm mb-1.5" style={{ color: 'rgba(35,165,90,0.7)' }}>/ month</span>
                    </>
                  )}
                </div>
                {billing === 'yearly'
                  ? <p className="text-xs font-semibold mt-1.5" style={{ color: '#23A55A' }}>Just $70/mo billed yearly — save $360</p>
                  : <p className="text-xs font-medium mt-1.5" style={{ color: 'rgba(35,165,90,0.8)' }}>Full mentorship + course included</p>}
              </div>

              {/* Features */}
              <div className="p-6 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(35,165,90,0.6)' }}>What's included</p>
                <ul className="space-y-3.5">
                  {NOMAD_FEATURES.map((f, i) => (
                    <FeatureRow key={i} {...f} light />
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-6 pt-0">
                <Button
                  size="lg"
                  className="w-full font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(90deg, #23A55A 0%, #1a7d44 100%)' }}
                  onClick={() => handleJoin('nomad', billing)}
                  disabled={checkoutLoading === `nomad_${billing}`}
                >
                  {checkoutLoading === `nomad_${billing}` ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {billing === 'yearly' ? 'Join Digital Nomad — $840 / year' : 'Join Digital Nomad — $100 / mo'}
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
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-2/5">Feature</th>
                    <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-[#5865F2]">Discord</th>
                    <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-primary">The Homie</th>
                    <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-amber-400">Digital Nomad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-card/50">
                  <CompareRow label="Discord & community channels"      discord={true}  homie={true}      nomad={true} />
                  <CompareRow label="Members-only video content"      discord={false} homie={true}      nomad={true} />
                  <CompareRow label="Patreon / BTS content"           discord={false} homie={true}      nomad={true} />
                  <CompareRow label="Daily investment updates"        discord={false} homie={true}      nomad={true} />
                  <CompareRow label="Directory access"                discord={false} homie="Unlimited" nomad="Unlimited" />
                  <CompareRow label="Media Mode streaming"            discord={false} homie={true}      nomad={true} />
                  <CompareRow label="Wager system"                    discord={false} homie={true}      nomad={true} />
                  <CompareRow label="Exclusive Nomad channels"        discord={false} homie={false}     nomad={true} />
                  <CompareRow label="Remote jobs & freelance access"  discord={false} homie={false}     nomad={true} />
                  <CompareRow label="Digital Nomad course"            discord={false} homie={false}     nomad={true} />
                  <CompareRow label="Website / e-commerce setup"      discord={false} homie={false}     nomad="After 3 mo" />
                  <CompareRow label="1-on-1 virtual meetings"         discord={false} homie={false}     nomad={true} />
                  <CompareRow label="Daily mentorship"                discord={false} homie={false}     nomad={true} />
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── Ecosystem bundles upsell ── */}
          <BundleSegment />

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
