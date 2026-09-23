import React, { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureGeo } from '@/lib/tracker';

// Shown over gated content for anyone (logged in or not) who hasn't
// verified location yet. By default uses the same capture pipeline as the
// passive per-session re-check in lib/tracker.js (captureGeo) — one source
// of truth for "has this browser verified location," shared with the /join
// flow's location step. force:true skips the deny-backoff since this is a
// deliberate, user-initiated retry, not an automatic background check.
// Pass `onEnable` to override the capture step itself (e.g. LocationGate
// uses this for logged-in users, to also persist the verification on their
// account via POST /gate/location instead of just the browser-local cache).
export default function LocationGateOverlay({ onGranted, onEnable }) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const enable = async () => {
    setBusy(true);
    setDenied(false);
    const ok = onEnable ? await onEnable() : await captureGeo({ force: true });
    setBusy(false);
    if (ok) onGranted?.();
    else setDenied(true);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-5">
        <MapPin className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-extrabold text-white mb-2">Enable location to continue</h2>
      <p className="text-white/60 text-sm max-w-xs mb-6">
        The Homies Hub uses your location to keep the community safe. Enable it to view content.
      </p>
      <Button size="lg" onClick={enable} disabled={busy} className="font-bold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
        Enable Location
      </Button>
      {denied && (
        <p className="text-red-400 text-xs mt-4 max-w-xs">
          Location access was blocked. Enable it in your browser's site settings, then try again.
        </p>
      )}
    </div>
  );
}
