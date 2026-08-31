import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Live streaming paused 2026-08-15 (George) -- music is the priority right now,
// broadcasting stays gated behind this notice until it's reworked. Routed to
// from /studio/stream, /go-live, /live, /live-stream/:username, /vod/:streamId
// in App.jsx -- GoLivePage/LivePage/VodPage/LiveStreamPage themselves are
// untouched, just not routed to.
export default function LiveComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] text-white px-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
          <Radio className="w-7 h-7 text-white/60" />
        </div>
        <h1 className="text-xl font-semibold">Live streaming is paused</h1>
        <p className="text-sm text-white/50">
          We're focused on music right now — live is coming back soon.
        </p>
        <Button variant="secondary" onClick={() => navigate('/')} className="mt-2">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
