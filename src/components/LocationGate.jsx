import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isLocationVerified } from '@/lib/tracker';
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

// Site-wide content gate: logged-out visitors must verify location (browser
// geolocation) before they can browse real content — App.jsx wraps the
// MainLayout Outlet with this for every route except landing/legal pages.
// Logged-in users are never gated. A visitor who already verified once (this
// browser has `hh_geo` cached — see lib/tracker.js) is never re-prompted;
// initTracker() silently re-checks per session from then on, so this only
// ever shows once per browser.
export default function LocationGate({ children }) {
  const { user } = useAuth();
  const [verified, setVerified] = useState(isLocationVerified);

  if (user || verified) return children;

  return (
    <div className="relative">
      <BlurredPlaceholder />
      <LocationGateOverlay onGranted={() => setVerified(true)} />
    </div>
  );
}
