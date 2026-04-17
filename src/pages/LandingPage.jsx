import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Compass, Radio, Users, Library, Swords,
  Crown, Bot, ArrowRight, Shield, FileText, Mail, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const FeatureCard = ({ to, icon: Icon, title, description, delay = 0, accent = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Link to={to} className="block h-full">
      <div className={cn(
        "group h-full bg-card border rounded-xl p-5 flex flex-col gap-3 transition-all duration-300",
        accent
          ? "border-primary/40 shadow-[0_0_20px_rgba(240,185,77,0.08)]"
          : "border-border hover:border-primary/40 hover:shadow-[0_0_20px_rgba(240,185,77,0.08)]"
      )}>
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
      </div>
    </Link>
  </motion.div>
);

const LandingPage = ({ onLoginRequest }) => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/browse',
      icon: Play,
      title: 'Browse',
      description: 'Explore videos, stories, and content from the community.',
    },
    {
      to: '/explore',
      icon: Compass,
      title: 'Explore',
      description: 'Discover trending creators and new content.',
    },
    {
      to: '/live',
      icon: Radio,
      title: 'Live',
      description: 'Watch and join real-time live streams.',
    },
    {
      to: '/communities',
      icon: Users,
      title: 'Communities',
      description: 'Connect with your people across shared interests.',
    },
    {
      to: '/wagers',
      icon: Swords,
      title: 'Wagers',
      description: 'Participate in community challenges and wagers.',
    },
    {
      to: '/memberships',
      icon: Crown,
      title: 'Memberships',
      description: 'Unlock premium access, exclusive content, and more.',
      accent: true,
    },
  ];

  if (user) {
    navItems.push({
      to: '/AI',
      icon: Bot,
      title: 'AI Assistant',
      description: 'Chat with your personal AI built for the community.',
    });
    navItems.push({
      to: '/library',
      icon: Library,
      title: 'Library',
      description: 'Your saved videos and personal content collection.',
    });
  }

  return (
    <>
      <Helmet>
        <title>The Homies Hub — Home</title>
        <meta name="description" content="The Homies Hub — a community for men to connect, share, and grow." />
      </Helmet>

      <div className="min-h-full bg-background">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-3 py-1 rounded-full mb-6">
                Welcome
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
                The Homies{' '}
                <span className="text-primary">Hub</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-8">
                A community built for men who are leveling up — connect, learn, earn, and grow.
              </p>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-glow-gold">
                  <Link to="/browse">Browse Content</Link>
                </Button>
                {!user ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary/40 text-foreground hover:bg-primary/10"
                    onClick={onLoginRequest}
                  >
                    Sign In
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="outline" className="border-primary/40 text-foreground hover:bg-primary/10">
                    <Link to="/memberships">View Memberships</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Navigation Directory */}
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-foreground">Explore The Hub</h2>
            <p className="text-muted-foreground mt-1">Jump into any section of the community.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {navItems.map((item, i) => (
              <FeatureCard key={item.to} {...item} delay={0.05 * i} />
            ))}
          </div>
        </div>

        {/* Membership CTA */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="container mx-auto px-4 pb-12"
          >
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12 text-center">
              <Crown className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Ready to go all in?
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Get full access to exclusive content, investment opportunities, Discord tiers, and more.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-glow-gold">
                  <Link to="/memberships">See Memberships</Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={onLoginRequest}
                >
                  Already a member? Sign in
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="border-t border-border bg-background/50 mt-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="col-span-2 md:col-span-1 space-y-2">
                <h4 className="font-bold text-primary">The Homies Hub</h4>
                <p className="text-xs text-muted-foreground">A community for men to connect, share, and grow together.</p>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-semibold">Navigate</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li><Link to="/browse" className="hover:text-primary">Browse</Link></li>
                  <li><Link to="/live" className="hover:text-primary">Live</Link></li>
                  <li><Link to="/communities" className="hover:text-primary">Communities</Link></li>
                  <li><Link to="/memberships" className="hover:text-primary">Memberships</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-semibold">Legal</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    <Link to="/terms" className="hover:text-primary flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-primary flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/community-guidelines" className="hover:text-primary flex items-center gap-1">
                      <Heart className="h-3 w-3" /> Guidelines
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-semibold">Contact</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    <a href="mailto:support@homieshub.com" className="hover:text-primary flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Support
                    </a>
                  </li>
                  <li>
                    <a href="mailto:abuse@homieshub.com" className="hover:text-primary flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Report Abuse
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} The Homies Hub. All rights reserved.</p>
              <p>18+ Content Available</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
