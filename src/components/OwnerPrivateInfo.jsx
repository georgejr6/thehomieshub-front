import React, { useEffect, useRef, useState } from 'react';
import { Lock, ChevronDown, Loader2, MapPin, Globe, EyeOff, ShieldAlert, ExternalLink } from 'lucide-react';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// OWNER ONLY. IP addresses + verified-location history for one account.
// Collapsed by default and fetches NOTHING until the owner deliberately
// expands it, so it can never show by accident (e.g. on stream). Collapses
// again whenever the person changes or the card/page closes.
// Backend: GET /admin/users/:id/private (403 for everyone but the owner).
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const SOURCE = { gate: 'Join / verify', browser: 'Browser check', backfill: 'Earlier record' };

export default function OwnerPrivateInfo({ userId, compact = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  useEffect(() => { setOpen(false); setData(null); setError(''); }, [userId]);

  if (!user?.isOwner || !userId) return null;

  const expand = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (data) return;
    const forId = userId;
    try {
      const { data: res } = await api.get(`/admin/users/${forId}/private`);
      if (forId === userIdRef.current) setData(res.result); // ignore a late answer for someone else
    } catch (err) {
      if (forId === userIdRef.current) setError(err.response?.data?.message || "Couldn't load private info.");
    }
  };

  const vpn = data?.vpn?.suspected && !data?.vpn?.clearedAt;
  return (
    <div className={cn('rounded-lg border border-[#F23F43]/30 bg-[#F23F43]/5', compact ? 'mt-3' : 'mt-4')}>
      <button type="button" onClick={expand} aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[#F5A3A5] hover:bg-[#F23F43]/10">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">Owner details</span>
        {open ? <EyeOff className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="border-t border-[#F23F43]/20 px-3 pb-3 pt-2 text-xs text-[#DBDEE1]">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#F0B232]">
            <ShieldAlert className="h-3.5 w-3.5" /> Don't open this on stream. Only you can see it.
          </p>
          {error && <p className="text-[#F5A3A5]">{error}</p>}
          {!data && !error && <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-[#949BA4]" /></div>}
          {data && (
            <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <div>
                <div className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wide text-[#949BA4]">
                  <Globe className="h-3 w-3" /> IP addresses ({data.ips.length})
                  {vpn && <span className="rounded bg-[#F0B232]/20 px-1.5 py-0.5 text-[10px] text-[#F0B232]">VPN suspected</span>}
                </div>
                {data.signupIp && <div className="mb-1 text-[#949BA4]">Signed up from <span className="font-mono text-[#DBDEE1]">{data.signupIp}</span></div>}
                {!data.ips.length && <div className="text-[#949BA4]">None recorded.</div>}
                {data.ips.map((k) => (
                  <div key={k.ip} className="border-b border-white/5 py-1.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="select-all font-mono text-[#F2F3F5]">{k.ip}</span>
                      <span className="shrink-0 text-[10px] text-[#949BA4]">{k.hits}×</span>
                    </div>
                    {k.geo && <div className="text-[#B5BAC1]">{[k.geo.city, k.geo.region, k.geo.country].filter(Boolean).join(', ')}{k.geo.isp ? ` · ${k.geo.isp}` : ''}</div>}
                    <div className="text-[10px] text-[#949BA4]">Last seen {fmt(k.lastSeen)} · first {fmt(k.firstSeen)}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wide text-[#949BA4]">
                  <MapPin className="h-3 w-3" /> Verified locations ({data.locations.length})
                </div>
                {!data.locations.length && !data.currentLocation && <div className="text-[#949BA4]">None verified yet.</div>}
                {!data.locations.length && data.currentLocation && (
                  <LocationRow l={{ ...data.currentLocation, source: 'gate' }} />
                )}
                {data.locations.map((l, i) => <LocationRow key={`${l.at}-${i}`} l={l} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationRow({ l }) {
  const map = `https://www.google.com/maps?q=${l.lat},${l.lng}`;
  return (
    <div className="border-b border-white/5 py-1.5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[#F2F3F5]">{l.place || `${Number(l.lat).toFixed(4)}, ${Number(l.lng).toFixed(4)}`}</span>
        <a href={map} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-0.5 text-[#00A8FC] hover:underline">
          Map <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {l.road && <div className="text-[#B5BAC1]">near {l.road}</div>}
      <div className="text-[10px] text-[#949BA4]">
        {fmt(l.at)} · {SOURCE[l.source] || l.source}{l.accuracy != null ? ` · ±${Math.round(l.accuracy)} m` : ''}{l.ip ? ` · ${l.ip}` : ''}
      </div>
    </div>
  );
}
