import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Custom invite-only landing page, meant to be sent directly to someone
// (DM/text/email) rather than found on the site. Visits are logged + pinged
// to admin via the normal analytics pipeline (see routes/track.js
// INVITE_PATHS, homieshub-backend) and, if they sign up, the account is
// tagged `invitedVia` so a second Telegram ping fires on conversion too.
const INVITE_CODE = 'xxx4';
const INVITE_CODE_KEY = 'hh_invite_code';

const InvitePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem(INVITE_CODE_KEY, INVITE_CODE); } catch { /* ignore */ }
  }, []);

  return (
    <>
      <Helmet>
        <title>You're Invited — The Homies Hub</title>
        <meta name="description" content="A private invite to join The Homies Hub." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-full bg-background flex items-center justify-center relative overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-lg w-full text-center"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Private Invite
          </div>

          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Crown className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            You've been invited to{' '}
            <span className="text-primary">The Homies Hub</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md mx-auto">
            Someone who's already in wants you in too. Create your account now to
            claim your spot in the community.
          </p>

          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto px-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-glow-gold gap-2"
              onClick={() => navigate('/?openAuth=1&tab=signup')}
            >
              Join Now
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigate('/?openAuth=1&tab=signin')}
            >
              Already a member? Sign in
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default InvitePage;
