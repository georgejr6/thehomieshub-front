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

const DiscordIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.134 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const YouTubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

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

              {/* Community links */}
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <a href="https://discord.gg/cxz8FQnbGf" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[#5865F2] hover:bg-[#5865F2]/10 gap-2">
                    <DiscordIcon className="h-4 w-4" />
                    Join Discord
                  </Button>
                </a>
                <a href="https://www.youtube.com/@TheHomiesHub_" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[#FF0000] hover:bg-[#FF0000]/10 gap-2">
                    <YouTubeIcon className="h-4 w-4" />
                    YouTube
                  </Button>
                </a>
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
                <a href="https://discord.gg/cxz8FQnbGf" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-[#5865F2]/40 text-[#5865F2] hover:bg-[#5865F2]/10 gap-2">
                    <DiscordIcon className="h-5 w-5" />
                    Join Discord
                  </Button>
                </a>
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
                <h5 className="text-sm font-semibold">Follow Us</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    <a href="https://discord.gg/cxz8FQnbGf" target="_blank" rel="noopener noreferrer" className="hover:text-[#5865F2] flex items-center gap-1">
                      <DiscordIcon className="h-3 w-3" /> Discord
                    </a>
                  </li>
                  <li>
                    <a href="https://www.youtube.com/@TheHomiesHub_" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF0000] flex items-center gap-1">
                      <YouTubeIcon className="h-3 w-3" /> YouTube
                    </a>
                  </li>
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
