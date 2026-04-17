import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle2, Crown, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = {
  homieMonthly: [
    { text: 'Unlimited access to the free discord/Homies channels', bold: false },
    { text: 'Full access to Patreon/BTS Content', bold: false },
    { text: 'Daily investment updates/opportunities', bold: true },
    { text: 'Unlimited Directory access', bold: false },
  ],
  homieYearly: [
    { text: 'Unlimited access to the free discord/Homies channels', bold: false },
    { text: 'Full access to Patreon/BTS Content', bold: false },
    { text: 'Daily investment updates/opportunities', bold: true },
    { text: 'Unlimited Directory access', bold: false },
  ],
  nomad: [
    { text: 'Access to all exclusive channels and content', bold: true },
    { text: 'Access to remote job/freelance contracts', bold: false },
    { text: 'Full digital nomad course', bold: false },
    { text: 'Website/E-commerce set up after 3 months', bold: false },
    { text: '1 on 1 virtual meetings', bold: true },
    { text: 'Daily mentorship', bold: false },
  ],
};

const FeatureItem = ({ text, bold, light = false }) => (
  <li className="flex items-start gap-3">
    <CheckCircle2 className={cn('h-5 w-5 mt-0.5 shrink-0', light ? 'text-amber-300' : 'text-primary')} />
    <span className={cn(
      'text-sm leading-relaxed',
      light ? 'text-white' : 'text-foreground',
      bold && 'font-semibold'
    )}>
      {text}
    </span>
  </li>
);

const MembershipsPage = () => {
  return (
    <>
      <Helmet>
        <title>Memberships — The Homies Hub</title>
        <meta name="description" content="Choose the membership tier that fits your journey. Monthly, yearly, or full Digital Nomad access." />
      </Helmet>

      <div className="min-h-full bg-background">
        {/* Header */}
        <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-12 text-center">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Crown className="h-10 w-10 text-primary mx-auto mb-4" />
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
                Pick Your <span className="text-primary">Level</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                Every tier gives you more access, more opportunity, and more community. Start where you are.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Cards */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">

            {/* Card 1 — The Homie $15/month */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Monthly</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">The Homie</h2>
                <p className="text-muted-foreground text-sm mt-1">For the certified Homies</p>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-foreground">$15</span>
                  <span className="text-muted-foreground text-sm ml-1">/ month</span>
                </div>
              </div>
              <div className="p-6 flex-1">
                <ul className="space-y-3">
                  {features.homieMonthly.map((f, i) => (
                    <FeatureItem key={i} {...f} />
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  asChild
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  size="lg"
                >
                  <a href="https://thehomieshub.com/the-homies-membership/" target="_blank" rel="noopener noreferrer">
                    Join (monthly)
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Card 2 — The Homie $100/year (featured) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col rounded-2xl border-2 border-primary bg-card overflow-hidden relative shadow-[0_0_40px_rgba(240,185,77,0.15)]"
            >
              <div className="absolute top-0 left-0 right-0 flex justify-center pt-0">
                <span className="bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase px-4 py-1 rounded-b-lg">
                  Best Value
                </span>
              </div>
              <div className="p-6 border-b border-border mt-6">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Yearly</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">The Homie</h2>
                <p className="text-muted-foreground text-sm mt-1">For the certified Homies</p>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-foreground">$100</span>
                  <span className="text-muted-foreground text-sm ml-1">/ year</span>
                </div>
                <p className="text-primary text-xs mt-2 font-medium">Save ~$80 vs monthly</p>
              </div>
              <div className="p-6 flex-1">
                <ul className="space-y-3">
                  {features.homieYearly.map((f, i) => (
                    <FeatureItem key={i} {...f} />
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  asChild
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-glow-gold"
                  size="lg"
                >
                  <a href="https://buy.stripe.com/4gM3cu2DH1Bgdo15yGf7i08" target="_blank" rel="noopener noreferrer">
                    Join (yearly)
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Card 3 — Digital Nomad $100/month */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #1a1200 0%, #2d1c00 40%, #1a0f00 100%)' }}
            >
              <div
                className="p-6 border-b"
                style={{ borderColor: 'rgba(240,185,77,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-5 w-5 text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Premium</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Digital Nomad</h2>
                <p className="text-amber-200/70 text-sm mt-1">For those looking to thrive abroad</p>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-white">$100</span>
                  <span className="text-amber-200/70 text-sm ml-1">/ month</span>
                </div>
              </div>
              <div className="p-6 flex-1">
                <ul className="space-y-3">
                  {features.nomad.map((f, i) => (
                    <FeatureItem key={i} {...f} light />
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  asChild
                  className="w-full font-semibold text-[#1a0f00]"
                  size="lg"
                  style={{ background: 'linear-gradient(90deg, #F0B94D 0%, #d97706 100%)' }}
                >
                  <a href="https://thehomieshub.com/digital-nomad/" target="_blank" rel="noopener noreferrer">
                    Join (monthly)
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* FAQ / note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto mt-12 text-center"
          >
            <p className="text-muted-foreground text-sm">
              All memberships are subject to our{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
              Access may be limited based on verification or community standards.
              Subscriptions are non-refundable unless explicitly authorized.
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default MembershipsPage;
