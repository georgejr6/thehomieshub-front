import React, { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent, flushNow } from '@/lib/tracker';

export const HOME_LOCATION_KEY = 'hh_home_location';

export function hasHomeLocation() {
  try { return localStorage.getItem(HOME_LOCATION_KEY) === '1'; } catch { return false; }
}

// Shown over the home feed for logged-out visitors who haven't granted
// location yet — content underneath stays blurred until they enable it.
export default function LocationGateOverlay({ onGranted }) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const enable = () => {
    if (!('geolocation' in navigator)) { setDenied(true); return; }
    setBusy(true);
    setDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try { localStorage.setItem(HOME_LOCATION_KEY, '1'); } catch { /* ignore */ }
        trackEvent('location_enabled', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        flushNow();
        setBusy(false);
        onGranted?.();
      },
      () => { setBusy(false); setDenied(true); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
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
