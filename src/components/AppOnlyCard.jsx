import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import StoreBadges from '@/components/StoreBadges';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { isMemberUser } from '@/components/MembershipWall';

// Videos the owner made app-only (backend access "app_only": no playback ID on the web,
// previews included). The app blocks screen recording; the web can't.
export default function AppOnlyCard({ poster, title, videoId, videoType = 'video', surface = 'app_only_video' }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const canBuy = !!user && !isMemberUser(user) && !!videoId;
  const unlock = async (e) => {
    e.stopPropagation();
    setBusy(true); setMsg('');
    try {
      const { data } = await api.post(`/purchases/video/${videoId}`, { videoType });
      const url = data?.result?.url;
      if (typeof url === 'string' && /^https:\/\/(buy|checkout)\.stripe\.com\//.test(url)) { window.location.href = url; return; }
      setMsg("Couldn't start checkout. Try again.");
    } catch (err) {
      setMsg(err?.response?.data?.code === 'already_purchased' ? 'You already unlocked it. Open the app to watch.' : "Couldn't start checkout. Try again.");
    }
    setBusy(false);
  };
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
      {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm" />}
      <div className="relative z-10 mx-4 flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-black/70 px-6 py-6 text-center backdrop-blur">
        <Smartphone className="h-10 w-10 text-primary" />
        <div className="text-lg font-bold text-white">Watch this in The Homies app</div>
        {title && <p className="line-clamp-2 text-sm text-white/70">{title}</p>}
        <p className="text-xs text-white/50">This one plays in the app only. Members watch free, or unlock it for $4.99.</p>
        {canBuy && (
          <button type="button" onClick={unlock} disabled={busy} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black disabled:opacity-60">
            {busy ? 'Opening checkout...' : 'Unlock for $4.99'}
          </button>
        )}
        {msg && <p className="text-xs text-white/70">{msg}</p>}
        <div onClick={(e) => e.stopPropagation()}><StoreBadges surface={surface} size="sm" className="justify-center" /></div>
      </div>
    </div>
  );
}
