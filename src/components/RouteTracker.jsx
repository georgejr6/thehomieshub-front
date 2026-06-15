import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initTracker, trackPageview } from '@/lib/tracker';

// Mounts the analytics tracker and records a pageview on every route change.
// Renders nothing.
export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => { initTracker(); }, []);
  useEffect(() => { trackPageview(location.pathname + location.search); }, [location.pathname, location.search]);

  return null;
}
