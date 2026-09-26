import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, RefreshCw } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';

// Owner-only: who's watching /live (the viewer log) + stream overrides.
// Backend: GET /livechat/admin/shows|viewers, PATCH /livechat/admin/config.

const ago = (d) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};
const showLabel = (k) => (k?.startsWith('live:') ? `Live · ${new Date(k.slice(5)).toLocaleString()}` : k?.startsWith('day:') ? `Off-air · ${k.slice(4)}` : k);

export default function LiveOwnerPanel({ state, onClose, onState }) {
  const [tab, setTab] = useState('viewers');
  const [shows, setShows] = useState([]);
  const [show, setShow] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState('');
  const [msg, setMsg] = useState('');

  const load = async (s = show) => {
    setLoading(true);
    try {
      const [v, sh] = await Promise.all([
        api.get('/livechat/admin/viewers', { params: s ? { show: s } : {} }),
        api.get('/livechat/admin/shows'),
      ]);
      setData(v.data.result);
      setShows(sh.data.result.shows);
      if (!s) setShow(v.data.result.show);
    } catch (err) { setMsg(err.response?.data?.message || "Couldn't load viewers."); }
    setLoading(false);
  };
  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const config = async (patch) => {
    setMsg('');
    try {
      const { data: d } = await api.patch('/livechat/admin/config', patch);
      onState?.((cur) => ({ ...cur, ...d.result }));
      setMsg('Saved.');
    } catch (err) { setMsg(err.response?.data?.message || "Couldn't save."); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Live viewers">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="live-sheet-up relative flex h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#141518] text-white sm:h-[640px] sm:rounded-3xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex rounded-full bg-white/[0.06] p-1 text-xs font-semibold">
            {['viewers', 'stream'].map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-full px-3 py-1 capitalize', tab === t ? 'bg-white text-black' : 'text-white/70')}>{t}</button>
            ))}
          </div>
          <button type="button" onClick={() => load(show)} aria-label="Refresh" className="ml-auto rounded-full p-1.5 text-white/60 hover:bg-white/10"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        {tab === 'viewers' ? (
          <>
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
              <select value={show} onChange={(e) => { setShow(e.target.value); load(e.target.value); }} className="max-w-full rounded-lg border border-white/10 bg-[#1c1d22] px-2 py-1.5">
                {shows.map((s) => <option key={s.show} value={s.show}>{showLabel(s.show)} — {s.viewers} viewers</option>)}
              </select>
              {data && <span className="text-white/60">{data.total} total · {data.signedIn} signed in · <b className="text-white">{data.watchingNow} now</b></span>}
            </div>
            <div className="live-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {!data ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div> : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#141518] text-white/45"><tr><th className="px-2 py-1.5">Viewer</th><th className="px-2">Watched</th><th className="px-2">Chat</th><th className="px-2">Last seen</th><th className="px-2">IPs</th></tr></thead>
                  <tbody>
                    {data.viewers.map((v, i) => (
                      <tr key={`${v.username || v.visitorId}-${i}`} className="border-t border-white/[0.05] align-top">
                        <td className="px-2 py-1.5">{v.guest ? <span className="text-white/50">Guest {String(v.visitorId || '').slice(0, 6)}</span> : <b>@{v.username}</b>}{v.source && <span className="ml-1 text-white/40">· {v.source}</span>}</td>
                        <td className="px-2 py-1.5">{v.minutes}m</td>
                        <td className="px-2 py-1.5">{v.chatted || ''}</td>
                        <td className="px-2 py-1.5 text-white/60">{ago(v.lastSeen)}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white/55">{(v.ips || []).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4 p-4 text-sm">
            <div className="rounded-xl bg-white/[0.04] p-3 text-white/70">
              Detected: YouTube {state?.youtube?.live ? <b className="text-[#ff5a73]">live</b> : 'offline'} · Kick {state?.kick?.live ? <b className="text-[#53fc18]">live</b> : 'offline'} — checked every minute.
            </div>
            <div>
              <div className="mb-1 font-semibold">Pin a YouTube video</div>
              <div className="flex gap-2">
                <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 outline-none" />
                <button type="button" onClick={() => config({ youtubeVideoId: video || null })} className="rounded-lg bg-white px-3 font-semibold text-black">{video ? 'Pin' : 'Clear'}</button>
              </div>
              <p className="mt-1 text-xs text-white/45">Leave empty + Clear to follow the channel's live stream automatically.</p>
            </div>
            <div>
              <div className="mb-1 font-semibold">Live badge</div>
              <div className="flex gap-2">
                {[['Auto', null], ['Force live', true], ['Force offline', false]].map(([l, v]) => (
                  <button key={l} type="button" onClick={() => config({ forceLive: v })} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 hover:bg-white/10">{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 font-semibold">Text-to-speech</div>
              <button type="button" onClick={() => config({ ttsEnabled: !state?.ttsEnabled })} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 hover:bg-white/10">{state?.ttsEnabled ? 'Turn off' : 'Turn on'} (currently {state?.ttsEnabled ? 'on' : 'off'})</button>
              <p className="mt-1 text-xs text-white/45">Only changes what the page says — TTS playback itself isn't wired to /live yet.</p>
            </div>
          </div>
        )}
        {msg && <div className="border-t border-white/10 px-4 py-2 text-xs text-white/70">{msg}</div>}
      </div>
    </div>,
    document.body
  );
}
