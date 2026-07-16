import React from 'react';
import { BarChart3 } from 'lucide-react';
import MediaAnalytics from './MediaAnalytics';

// Standalone admin Analytics page (outside media mode). Reuses the exact same
// MediaAnalytics component as /media/admin so the two never drift.
const AdminAnalytics = () => (
  <div className="max-w-7xl mx-auto space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5" /> Analytics
      </p>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Analytics</h1>
      <p className="text-white/50 mt-2 max-w-lg">Listeners, superfans, songs, videos and traffic — click any card or row to drill in.</p>
    </header>
    <MediaAnalytics />
  </div>
);

export default AdminAnalytics;
