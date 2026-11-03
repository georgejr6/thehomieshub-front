import React, { useEffect, useRef, useState } from 'react';
import { Share2, Trash2 } from 'lucide-react';
import { apiErrorCode } from '@/lib/apiErrors';
import { deleteReplay, durationLabel, getReplay, shareSpace, spacesError } from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const RATES = [1, 1.25, 1.5, 2];
const MAX_POLLS = 30; // ~5 min while a just-ended Space's file is finished and uploaded

// Ended Space with a recording: one <audio> element plays the parts back to back
// (swapping src keeps autoplay allowed on iOS). Links are signed for 3 h; a
// playback error fetches fresh links and resumes where it was.
export default function SpaceReplay({ id, space, canDelete, onBack }) {
  const [st, setSt] = useState({ status: 'loading' }); // loading | pending | ready | none | error
  const [idx, setIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const audio = useRef(null);
  const resume = useRef(null); // { idx, time, playing } to restore after a link refresh
  const retried = useRef(false);
  const recorded = useRef(space?.recordReplay === true);
  recorded.current = space?.recordReplay === true;

  useEffect(() => {
    let stop = false; let t = null; let tries = 0;
    const load = async () => {
      try {
        const r = await getReplay(id);
        if (!stop) setSt({ status: 'ready', ...r });
      } catch (err) {
        if (stop) return;
        const code = apiErrorCode(err);
        if (code === 'no_replay' && recorded.current && tries < MAX_POLLS) {
          tries += 1; setSt({ status: 'pending' }); t = setTimeout(load, Math.min(20000, 5000 + tries * 1000)); return;
        }
        if (code === 'no_replay') { setSt({ status: 'none' }); return; }
        setSt({ status: 'error', message: spacesError(err).message });
      }
    };
    load();
    return () => { stop = true; clearTimeout(t); };
  }, [id, nonce]);

  const parts = st.parts || [];
  const url = parts[idx]?.url;

  // Point the single element at the current part.
  useEffect(() => {
    const a = audio.current;
    if (!a || !url) return;
    const r = resume.current;
    const autoplay = r ? r.playing : idx > 0;
    a.src = url;
    a.playbackRate = rate;
    const onMeta = () => {
      a.playbackRate = rate;
      if (r && r.idx === idx && r.time) a.currentTime = r.time;
      resume.current = null;
      retried.current = false;
      if (autoplay) a.play().catch(() => {});
    };
    a.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => a.removeEventListener('loadedmetadata', onMeta);
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!confirmDel) return undefined;
    const t = setTimeout(() => setConfirmDel(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  const onEnded = () => { if (idx < parts.length - 1) { resume.current = { idx: idx + 1, time: 0, playing: true }; setIdx(idx + 1); } };
  const onError = () => {
    if (retried.current) { setSt({ status: 'error', message: "This replay won't play right now." }); return; }
    retried.current = true;
    const a = audio.current;
    resume.current = { idx, time: a?.currentTime || 0, playing: a ? !a.paused : false };
    setNonce((n) => n + 1);
  };

  const s = st.space || space || {};
  const host = s.host || {};
  const share = async () => { if ((await shareSpace({ id, title: s.title })) === 'copied') toast({ title: 'Link copied' }); };
  const setSpeed = (r) => { setRate(r); if (audio.current) audio.current.playbackRate = r; };
  const remove = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setBusy(true);
    try { await deleteReplay(id); toast({ title: 'Replay deleted' }); onBack?.(); } catch (err) { toast({ title: spacesError(err).message, variant: 'destructive' }); } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground">← Spaces</button>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">Replay{st.durationSec ? ` · ${durationLabel(st.durationSec)}` : ''}</div>
        <h1 className="mt-1 break-words text-2xl font-extrabold leading-tight">{s.title || 'Space'}</h1>
        {s.topic && <p className="mt-1 break-words text-sm text-muted-foreground">{s.topic}</p>}
        <div className="mt-4 flex items-center gap-3">
          <SpaceAvatar name={host.displayName || host.username} url={host.avatarUrl} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{host.displayName || host.username || 'Host'}</div>
            <div className="text-xs text-muted-foreground">{s.endedAt ? new Date(s.endedAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Host'}</div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={share}><Share2 className="h-4 w-4" />Share</Button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          {st.status === 'loading' && <p className="text-sm text-muted-foreground">Loading replay...</p>}
          {st.status === 'pending' && <p className="text-sm text-muted-foreground">The replay is being saved. It shows up here in a few minutes.</p>}
          {st.status === 'none' && <p className="text-sm text-muted-foreground">This Space has ended. No replay was saved. {recorded.current && <button type="button" className="underline" onClick={() => setNonce((n) => n + 1)}>Check again</button>}</p>}
          {st.status === 'error' && <div className="text-sm text-muted-foreground">{st.message} <button type="button" className="underline" onClick={() => { retried.current = false; setNonce((n) => n + 1); }}>Try again</button></div>}
          {/* One element for the whole replay; hidden until there is something to play. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audio} controls preload="metadata" className={st.status === 'ready' && parts.length ? 'w-full' : 'hidden'} onEnded={onEnded} onError={() => { if (url) onError(); }} />
          {st.status === 'ready' && parts.length > 0 && (
            <>
              {parts.length > 1 && <p className="mt-2 text-xs text-muted-foreground">Part {idx + 1} of {parts.length} (plays straight through)</p>}
              <div className="mt-3 flex gap-1.5">
                {RATES.map((r) => (
                  <button key={r} type="button" onClick={() => setSpeed(r)} className={`h-9 flex-1 rounded-full text-sm font-semibold ${rate === r ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{r}x</button>
                ))}
              </div>
            </>
          )}
        </div>

        {canDelete && ['ready', 'error'].includes(st.status) && (
          <Button variant="ghost" className="mt-6 w-full gap-2 text-red-400" disabled={busy} onClick={remove}>
            <Trash2 className="h-4 w-4" />{confirmDel ? 'Tap again to delete the replay for everyone' : 'Delete replay'}
          </Button>
        )}
      </div>
    </div>
  );
}
