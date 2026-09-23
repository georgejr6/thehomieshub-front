import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { captureGeo, getCachedGeo, isLocationVerified } from '@/lib/tracker';
import api from '@/api/homieshub';
import LocationGateOverlay from './LocationGateOverlay';

// Decorative stand-in for gated content — never mounts the real page, so
// nothing loads/plays/fetches until location is verified.
const BlurredPlaceholder = () => (
  <div className="w-full min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-900 to-black">
    {[0.9, 0.6, 0.35].map((o, i) => (
      <div key={i} className="w-[85%] max-w-sm h-24 rounded-2xl bg-white/10 blur-xl" style={{ opacity: o }} />
    ))}
  </div>
);

// Site-wide content gate — App.jsx wraps the MainLayout Outlet with this for
// every route except landing/legal pages. Applies to EVERYONE, logged in or
// not (tightened 2026-09-22 in response to suspected info-gathering by
// non-paying accounts): anonymous visitors need this browser's `hh_geo`
// cache (lib/tracker.js); logged-in users need their OWN account's
// `gate.locationEnabledAt` — an existing member who never went through the
// /join location step (added the same day) is gated exactly like anyone
// else until they verify once here.
//
// Once satisfied, never asked again: anonymous verification persists in
// this browser's localStorage; account verification persists on the user
// document. initTracker() silently re-checks per session from then on.
export default function LocationGate({ children }) {
  const { user, refreshMe } = useAuth();
  const [verified, setVerified] = useState(() =>
    user ? !!user?.gate?.locationEnabledAt : isLocationVerified()
  );

  // Recompute on login/logout — a login mid-session doesn't remount this
  // component, so the initial computed value would otherwise go stale.
  useEffect(() => {
    setVerified(user ? !!user?.gate?.locationEnabledAt : isLocationVerified());
  }, [user?._id, user?.gate?.locationEnabledAt]);

  if (verified) return children;

  const enableForAccount = async () => {
    let cached = getCachedGeo();
    if (!cached) {
      const ok = await captureGeo({ force: true });
      if (!ok) return false;
      cached = getCachedGeo();
    }
    if (!cached) return false;
    try {
      await api.post('/gate/location', { lat: cached.lat, lng: cached.lon, accuracy: cached.accuracy });
      await refreshMe();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="relative">
      <BlurredPlaceholder />
      <LocationGateOverlay
        onGranted={() => setVerified(true)}
        onEnable={user ? enableForAccount : undefined}
      />
    </div>
  );
}
