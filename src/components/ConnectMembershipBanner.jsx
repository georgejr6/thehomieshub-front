import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Link2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ClaimSubscriptionDialog from '@/components/Billing/ClaimSubscriptionDialog';

const DISMISS_KEY = 'hh_connect_membership_dismissed';

/**
 * Persistent nudge for signed-in users who don't have an active membership
 * linked to their account. Catches the common case where someone paid Stripe
 * with one email but signed up with another, so their plan never registered.
 *
 * Shows app-wide until they connect a membership. Dismiss only silences it for
 * the current browser session — it returns next session until resolved.
 */
const ConnectMembershipBanner = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [claimOpen, setClaimOpen] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  // Only nudge signed-in, non-admin users who have no active membership linked.
  if (!user || user.isAdmin || isPremium || dismissed) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <>
      <div className="w-full bg-primary/10 border-b border-primary/20 text-foreground">
        <div className="flex items-center gap-3 px-4 py-2 max-w-5xl mx-auto">
          <Link2 className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs sm:text-sm flex-1 min-w-0">
            <span className="font-semibold">Already a member?</span>{' '}
            <span className="text-muted-foreground">
              If you paid with a different email, connect your membership so your access unlocks.
            </span>
          </p>
          <Button size="sm" className="h-7 px-3 text-xs shrink-0" onClick={() => setClaimOpen(true)}>
            Connect
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs shrink-0 text-muted-foreground"
            onClick={() => navigate('/billing')}
          >
            Manage billing
          </Button>
          <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ClaimSubscriptionDialog open={claimOpen} onOpenChange={setClaimOpen} />
    </>
  );
};

export default ConnectMembershipBanner;
