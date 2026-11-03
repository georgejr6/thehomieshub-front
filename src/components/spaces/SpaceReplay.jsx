import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Share2, Trash2 } from 'lucide-react';
import { apiErrorCode } from '@/lib/apiErrors';
import { deleteReplay, durationLabel, getReplay, shareSpace, spacesError, speakingIdsAt } from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';
import SpaceTile from '@/components/spaces/SpaceTile';
import PersonSheet from '@/components/spaces/PersonSheet';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const RATES = [1, 1.25, 1.5, 2];
const MAX_POLLS = 30; // ~5 min while a just-ended Space's file is finished and uploaded

// Ended Space with a recording: one <audio> element plays the parts back to back
// (swapping src keeps autoplay allowed on iOS). Links are signed for 3 h; a
// playback error fetches fresh links and resumes where it was.
export default function SpaceReplay({ id, space, canDelete, onBack, signedIn = true, onLoginRequest }) {
  const [st, setSt] = useState({ status: 'loading' }); // loading | pending | ready | none | error
  const [idx, setIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const audio = useRef(null);
  const resume = useRef(null); // { idx, time, playing } to restore after a link refresh
  const retried = useRef(false);
  const [speaking, setSpeaking] = useState('');
  const [walled, setWalled] = useState(false);
  const [person, setPerson] = useState(null);
  const [restart, setRestart] = useState(0);
  const durs = useRef({}); // measured length of each part that has been opened
  const wasSignedIn = useRef(signedIn);
  const recorded = useRef(space?.recordReplay !== false);
  recorded.current = space?.recordReplay !== false;

  useEffect(() => {
    let stop = false; let t = null; let tries = 0;
    const load = async () => {
      try {
        const r = await getReplay(id, !signedIn);
        if (!stop) setSt({ status: 'ready', ...r });
      } catch (err) {
        if (stop) return;
        const code = apiErrorCode(err);
        if (code === 'sign_in_required') { setSt({ status: 'signin' }); return; }
        if (code === 'no_replay' && recorded.current && tries < MAX_POLLS) {
          tries += 1; setSt({ status: 'pending' }); t = setTimeout(load, Math.min(20000, 5000 + tries * 1000)); return;
        }
        if (code === 'no_replay') { setSt({ status: 'none' }); return; }
        setSt({ status: 'error', message: spacesError(err).message });
      }
    };
    load();
    return () => { stop = true; clearTimeout(t); };
  }, [id, nonce, signedIn]);

  const parts = useMemo(() => st.parts || [], [st.parts]);
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
      if (Number.isFinite(a.duration)) durs.current[idx] = a.duration;
      a.playbackRate = rate;
      if (r && r.idx === idx && r.time) a.currentTime = r.time;
      resume.current = null;
      retried.current = false;
      if (autoplay) a.play().catch(() => {});
    };
    a.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => a.removeEventListener('loadedmetadata', onMeta);
  }, [url, restart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Signed in from the wall: start over with the full replay.
  useEffect(() => {
    if (signedIn && !wasSignedIn.current) {
      setWalled(false); setIdx(0); resume.current = null; durs.current = {};
      setRestart((n) => n + 1); setNonce((n) => n + 1);
    }
    wasSignedIn.current = signedIn;
  }, [signedIn]);

  // Who is talking now, and the signed-out preview limit, checked while playing.
  const speech = st.speech;
  const previewSec = st.guest || !signedIn ? (st.previewSec || 120) : 0;
  useEffect(() => {
    if (st.status !== 'ready' || !parts.length) return undefined;
    const tick = () => {
      const a = audio.current;
      if (!a) return;
      const startMs = parts[idx]?.startMs;
      if (Number.isFinite(startMs) && speech?.length && !a.paused) {
        const key = Array.from(speakingIdsAt(speech, startMs + a.currentTime * 1000)).join(',');
        setSpeaking((prev) => (prev === key ? prev : key));
      } else if (a.paused) {
        setSpeaking((prev) => (prev ? '' : prev));
      }
      if (previewSec) {
        const before = parts.slice(0, idx).reduce((n, x, j) => n + (durs.current[j] ?? x.durationSec ?? 0), 0);
        if (before + a.currentTime >= previewSec) {
          a.pause();
          setWalled(true);
        }
      }
    };
    const t = setInterval(tick, 150);
    const a0 = audio.current;
    a0?.addEventListener('seeked', tick);
    return () => { clearInterval(t); a0?.removeEventListener('seeked', tick); };
  }, [st.status, parts, idx, speech, previewSec]);
  useEffect(() => {
    if (!walled) return;
    const a = audio.current;
    if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
  }, [walled]);

  useEffect(() => {
    if (!confirmDel) return undefined;
    const t = setTimeout(() => setConfirmDel(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  const onEnded = () => {
    if (idx < parts.length - 1) { resume.current = { idx: idx + 1, time: 0, playing: true }; setIdx(idx + 1); } else if (previewSec && (st.durationSec || 0) > previewSec) setWalled(true);
  };
  const onError = () => {
    if (retried.current) { setSt({ status: 'error', message: "This replay won't play right now." }); return; }
    retried.current = true;
    const a = audio.current;
    resume.current = { idx, time: a?.currentTime || 0, playing: a ? !a.paused : false };
    setNonce((n) => n + 1);
  };

  const s = st.space || space || {};
  const speakingSet = new Set(speaking ? speaking.split(',') : []);
  const stage = (st.people && st.people.length ? st.people : (s.host?.id ? [{ ...s.host, role: 'host' }] : []))
    .map((p) => ({ id: p.id, name: p.displayName || p.username || 'Homie', avatarUrl: p.avatarUrl || null, role: p.role || 'speaker' }));
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

        {st.status === 'ready' && stage.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On stage</h2>
            <div className="grid grid-cols-3 gap-x-2 gap-y-4">
              {stage.map((p) => <SpaceTile key={p.id} p={{ ...p, speaking: speakingSet.has(String(p.id)) }} big onTap={() => (signedIn ? setPerson(p) : onLoginRequest?.({ redirect: `/spaces/${id}` }))} />)}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          {st.status === 'signin' && <div className="text-sm"><p className="text-muted-foreground">Sign in to listen to this replay.</p><Button className="mt-3" onClick={() => onLoginRequest?.({ redirect: `/spaces/${id}` })}>Sign in</Button></div>}
          {st.status === 'loading' && <p className="text-sm text-muted-foreground">Loading replay...</p>}
          {st.status === 'pending' && <p className="text-sm text-muted-foreground">The replay is being saved. It shows up here in a few minutes.</p>}
          {st.status === 'none' && <p className="text-sm text-muted-foreground">This Space has ended. No replay was saved. {recorded.current && <button type="button" className="underline" onClick={() => setNonce((n) => n + 1)}>Check again</button>}</p>}
          {st.status === 'error' && <div className="text-sm text-muted-foreground">{st.message} <button type="button" className="underline" onClick={() => { retried.current = false; setNonce((n) => n + 1); }}>Try again</button></div>}
          {/* One element for the whole replay; hidden until there is something to play. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audio} controls preload="metadata" className={st.status === 'ready' && parts.length && !walled ? 'w-full' : 'hidden'} onEnded={onEnded} onError={() => { if (url) onError(); }} />
          {walled && (
            <div className="text-center text-sm">
              <p className="font-semibold">Sign in to keep listening</p>
              <p className="mt-1 text-muted-foreground">Guests can listen to the first 2 minutes.</p>
              <Button className="mt-3" onClick={() => onLoginRequest?.({ redirect: `/spaces/${id}` })}>Sign in</Button>
            </div>
          )}
          {st.status === 'ready' && parts.length > 0 && !walled && (
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
      <PersonSheet spaceId={id} signedIn={signedIn} person={person} onClose={() => setPerson(null)} />
    </div>
  );
}
