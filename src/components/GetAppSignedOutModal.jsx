import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import StoreBadges from '@/components/StoreBadges';

const DELAY_MS = 15000;
const DISMISS_KEY = 'hh_get_app_modal_dismissed';

/**
 * One-time-per-session popup nudging SIGNED-OUT web visitors to the app,
 * 15s after landing. Auto-cancels if they sign in before the timer fires,
 * and never reappears once dismissed (in this session) or once signed in.
 */
const GetAppSignedOutModal = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* ignore */ }
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [user]);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    }
  };

  if (user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">The Homies Hub is on mobile</DialogTitle>
          <DialogDescription className="text-center">
            Get the full experience — download the app for iOS or Android.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-2">
          <StoreBadges surface="signed_out_modal" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GetAppSignedOutModal;
