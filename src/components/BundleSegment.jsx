import React from 'react';
import { motion } from 'framer-motion';
import { Boxes, ArrowRight } from 'lucide-react';

const APPS = [
  { icon: '🏠', name: 'The Homies Hub', perk: 'Community, exclusive content, trips & private Discord' },
  { icon: '📝', name: 'MyConsent', perk: 'Consent forms, model & content releases, and NDAs' },
  { icon: '🔎', name: 'DirectoryBro', perk: 'AI-powered directory & instant answers' },
];

// Conversion-focused ecosystem-bundle promo. Used on the landing page + memberships.
export default function BundleSegment() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-4 my-12"
    >
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Boxes className="h-4 w-4" /> Ecosystem Bundles
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mt-2">One membership. Every app.</h3>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Bundle The Homies with MyConsent and DirectoryBro under a single membership and save 15–40%.
            Already a member? Upgrade and keep everything you have — you just unlock the extra apps.
          </p>
        </div>

        {/* App perks */}
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          {APPS.map((a) => (
            <div key={a.name} className="rounded-xl border border-border bg-background/40 p-4 text-center">
              <div className="text-3xl">{a.icon}</div>
              <div className="font-bold text-foreground mt-2">{a.name}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.perk}</div>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex flex-col items-center mt-8 gap-1.5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Bundles starting at</div>
          <div className="text-4xl font-extrabold text-foreground">$29<span className="text-lg font-semibold text-muted-foreground">/mo</span></div>
          <div className="text-xs font-semibold text-primary mb-3">Most popular: all 3 apps for $49/mo</div>
          <a href="https://www.viddy.cloud/bundles" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-7 py-3.5 rounded-xl hover:bg-primary/90 shadow-glow-gold transition">
            View bundles &amp; pricing <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
