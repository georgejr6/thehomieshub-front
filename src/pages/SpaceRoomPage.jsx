import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, ConnectionState, DisconnectReason } from 'livekit-client';
import { Mic, MicOff, Hand, SmilePlus, PhoneOff, Headphones, Volume2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  REACTION_EMOJIS, REACTION_TOPIC, ACTION_LABELS, SPEAKER_API_ACTION,
  actionsFor, deriveRole, encodeReaction, endSpace, getSpace, isHandRaised, isMod, isSpeakerRole,
  joinSpace, limitListeners, muteInSpace, parseMetadata, parseReaction, removeFromSpace,
  sortByRole, speakerAction, spacesError, startSpace,
} from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';

const CSS = `
@keyframes hh-float { 0% { transform: translate(-50%, 0) scale(.6); opacity: 0 } 15% { opacity: 1; transform: translate(-50%, -12px) scale(1.1) } 100% { transform: translate(-50%, -90px) scale(1); opacity: 0 } }
@keyframes hh-speak { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,.7) } 50% { box-shadow: 0 0 0 7px rgba(52,211,153,0) } }
.hh-speaking { animation: hh-speak 1.1s ease-out infinite; background: #34d399 }
@media (prefers-reduced-motion: reduce) { .hh-speaking { animation: none } }
`;

const ROLE_TAG = { host: 'Host', cohost: 'Cohost' };

// Everyone currently in the LiveKit room, as plain objects.
function snapshot(room, space) {
  if (!room) return [];
  const all = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
  return all.map((p) => {
    const meta = parseMetadata(p.metadata);
    return {
      id: p.identity,
      name: p.name || meta.username || 'Homie',
      avatarUrl: meta.avatarUrl || null,
      role: deriveRole({ identity: p.identity, metadata: p.metadata, space, canPublish: p.permissions?.canPublish }),
      hand: isHandRaised(p.attributes),
      speaking: !!p.isSpeaking,
      muted: !p.isMicrophoneEnabled,
      isLocal: p.isLocal,
    };
  });
}

function Tile({ p, big, floats, onTap }) {
  const size = big ? 76 : 52;
  return (
    <button type="button" onClick={onTap} disabled={!onTap}
      className="relative flex min-w-0 flex-col items-center gap-1 rounded-xl p-1 text-center disabled:cursor-default">
      <div className="relative">
        <div className={`rounded-full p-[3px] ${p.speaking && !p.muted ? 'hh-speaking' : 'bg-transparent'}`}>
          <SpaceAvatar name={p.name} url={p.avatarUrl} size={size} />
        </div>
        {big && p.muted && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-zinc-700 text-white"><MicOff className="h-3 w-3" /></span>
        )}
        {p.hand && <span className="absolute -right-1 -top-1 rounded-full bg-background text-base leading-none">✋</span>}
        {floats.filter((f) => f.id === p.id).map((f) => (
          <span key={f.key} className="pointer-events-none absolute left-1/2 top-0 z-10 text-3xl" style={{ animation: 'hh-float 2s ease-out forwards' }}>{f.emoji}</span>
        ))}
      </div>
      <div className={`w-full truncate font-medium ${big ? 'text-sm' : 'text-xs'}`}>{p.name}{p.isLocal ? ' (you)' : ''}</div>
      {ROLE_TAG[p.role] && <div className="-mt-0.5 rounded-full bg-primary/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-primary">{ROLE_TAG[p.role]}</div>}
    </button>
  );
}

function Notice({ emoji, title, body, children }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl">{emoji}</div>
      <h1 className="mt-3 text-xl font-bold">{title}</h1>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      <div className="mt-5 flex gap-2">{children}</div>
    </div>
  );
}

export default function SpaceRoomPage({ onLoginRequest }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [, bump] = useReducer((n) => n + 1, 0);
  const [phase, setPhase] = useState('loading'); // loading | scheduled | connecting | live | ended | lost | error
  const [space, setSpace] = useState(null);
  const [me, setMe] = useState(null);
  const [failure, setFailure] = useState(null);
  const [tick, setTick] = useState(0);
  const [floats, setFloats] = useState([]);
  const [conn, setConn] = useState(ConnectionState.Connected);
  const [sheet, setSheet] = useState(null); // { type: 'target', p } | 'hands' | 'end'
  const [showReactions, setShowReactions] = useState(false);
  const [busy, setBusy] = useState(false);
  const roomRef = useRef(null);
  const audioBox = useRef(null);
  const leftRef = useRef(false);
  const spaceRef = useRef(null);
  const lastReact = useRef(0);
  const prevRole = useRef(null);
  const startedRef = useRef(false);
  spaceRef.current = space;

  const room = roomRef.current;
  const people = phase === 'live' ? snapshot(room, space) : [];
  const mine = people.find((p) => p.isLocal);
  const myRole = mine?.role || me?.role || 'listener';
  const speakers = sortByRole(people.filter((p) => isSpeakerRole(p.role)));
  const listeners = people.filter((p) => !isSpeakerRole(p.role));
  const hands = listeners.filter((p) => p.hand);
  const { shown: shownListeners, extra } = limitListeners(listeners);

  const addFloat = useCallback((who, emoji) => {
    const key = `${Date.now()}-${Math.random()}`;
    setFloats((f) => [...f.slice(-30), { key, id: who, emoji }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.key !== key)), 2100);
  }, []);

  // Load the Space, then join its LiveKit room.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    let theRoom = null;
    leftRef.current = false;

    (async () => {
      try {
        const info = await getSpace(id);
        if (cancelled) return;
        let sp = info?.space;
        setSpace(sp); setMe(info?.me || null);
        if (sp?.status === 'ended') { setPhase('ended'); return; }
        if (sp?.status === 'scheduled') {
          if (info?.me?.role === 'host' && location.state?.autostart && !startedRef.current) {
            startedRef.current = true;
            await startSpace(id);
            sp = { ...sp, status: 'live' };
          } else { setPhase('scheduled'); return; }
        }
        setPhase('connecting');
        const j = await joinSpace(id);
        if (cancelled) return;
        theRoom = new Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const refresh = () => { if (!cancelled) bump(); };
        theRoom
          .on(RoomEvent.ParticipantConnected, refresh).on(RoomEvent.ParticipantDisconnected, refresh)
          .on(RoomEvent.ActiveSpeakersChanged, refresh).on(RoomEvent.TrackMuted, refresh).on(RoomEvent.TrackUnmuted, refresh)
          .on(RoomEvent.LocalTrackPublished, refresh).on(RoomEvent.LocalTrackUnpublished, refresh)
          .on(RoomEvent.ParticipantMetadataChanged, refresh).on(RoomEvent.ParticipantAttributesChanged, refresh)
          .on(RoomEvent.ParticipantPermissionsChanged, refresh).on(RoomEvent.AudioPlaybackStatusChanged, refresh)
          .on(RoomEvent.ParticipantNameChanged, refresh)
          .on(RoomEvent.ConnectionStateChanged, (s) => { if (!cancelled) setConn(s); })
          .on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === 'audio' && audioBox.current) audioBox.current.appendChild(track.attach());
          })
          .on(RoomEvent.TrackUnsubscribed, (track) => { track.detach().forEach((el) => el.remove()); })
          .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
            if (topic !== REACTION_TOPIC || !participant) return;
            const emoji = parseReaction(payload);
            if (emoji) addFloat(participant.identity, emoji);
          })
          .on(RoomEvent.Disconnected, (reason) => {
            if (cancelled || leftRef.current) return;
            if (reason === DisconnectReason.ROOM_DELETED) setPhase('ended');
            else if (reason === DisconnectReason.PARTICIPANT_REMOVED) { setFailure({ kind: 'removed', message: 'The host removed you from this Space.' }); setPhase('error'); }
            else setPhase('lost');
          });
        await theRoom.connect(j.url, j.token);
        if (cancelled) { theRoom.disconnect(); return; }
        roomRef.current = theRoom;
        setConn(theRoom.state);
        setPhase('live');
        theRoom.startAudio().catch(() => {});
      } catch (err) {
        if (cancelled) return;
        const f = spacesError(err);
        if (f.kind === 'ended') { setPhase('ended'); return; }
        setFailure(f); setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      leftRef.current = true;
      const r = theRoom || roomRef.current;
      if (r) { try { r.localParticipant.setMicrophoneEnabled(false); } catch { /* closing */ } r.disconnect(); }
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, tick]);

  // Scheduled: check every 15 s whether it went live.
  useEffect(() => {
    if (phase !== 'scheduled') return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [phase]);

  // React to our own role changing live.
  useEffect(() => {
    if (phase !== 'live') return;
    const was = prevRole.current;
    prevRole.current = myRole;
    if (!was || was === myRole) return;
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    if (isSpeakerRole(myRole) && !isSpeakerRole(was)) {
      lp.setAttributes({ hand: '' }).catch(() => {});
      toast({ title: 'You can speak now', description: 'Tap the mic when you are ready.' });
    } else if (!isSpeakerRole(myRole) && isSpeakerRole(was)) {
      lp.setMicrophoneEnabled(false).catch(() => {});
      toast({ title: 'You are back to listening' });
    }
  }, [myRole, phase]);

  const leave = () => {
    leftRef.current = true;
    const r = roomRef.current;
    if (r) { try { r.localParticipant.setMicrophoneEnabled(false); } catch { /* closing */ } r.disconnect(); }
    navigate('/spaces');
  };

  const lp = roomRef.current?.localParticipant;
  const toggleMic = async () => {
    if (!lp) return;
    try { await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled); } catch { toast({ title: 'Could not use the microphone', description: 'Check your browser mic permission.', variant: 'destructive' }); }
    bump();
  };
  const toggleHand = async () => {
    if (!lp) return;
    try { await lp.setAttributes({ hand: isHandRaised(lp.attributes) ? '' : '1' }); } catch { toast({ title: 'Could not raise your hand', variant: 'destructive' }); }
    bump();
  };
  const react = async (emoji) => {
    if (!lp || Date.now() - lastReact.current < 350) return;
    lastReact.current = Date.now();
    addFloat(lp.identity, emoji);
    try { await lp.publishData(encodeReaction(emoji), { reliable: false, topic: REACTION_TOPIC }); } catch { /* best effort */ }
  };

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) toast({ title: okMsg }); setSheet(null); } catch (err) { toast({ title: spacesError(err).message, variant: 'destructive' }); } finally { setBusy(false); }
  };
  const doAction = (p, action) => {
    if (action === 'mute') return run(() => muteInSpace(id, p.id), `${p.name} muted`);
    if (action === 'remove') return run(() => removeFromSpace(id, p.id), `${p.name} removed`);
    return run(() => speakerAction(id, p.id, SPEAKER_API_ACTION[action]));
  };

  const title = space?.title || 'Space';
  const isHost = me?.role === 'host' || myRole === 'host';
  const canEnd = isHost || user?.isAdmin;
  const wrap = (children) => (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground">
      <Helmet><title>{`${title} | Spaces | The Homies`}</title></Helmet>
      <style>{CSS}</style>
      {children}
    </div>
  );

  if (authLoading) return wrap(<Notice emoji="🎙" title="Loading..." />);
  if (!user) return wrap(<Notice emoji="🎙" title="Sign in to join" body="Spaces are live audio rooms for The Homies."><Button onClick={() => onLoginRequest?.()}>Sign in</Button><Button variant="outline" onClick={() => navigate('/spaces')}>Back</Button></Notice>);
  if (phase === 'loading' || phase === 'connecting') return wrap(<Notice emoji="🎧" title={phase === 'loading' ? 'Loading Space...' : 'Joining the room...'} />);
  if (phase === 'ended') return wrap(<Notice emoji="👋" title="This Space has ended" body={space?.title}><Button onClick={() => navigate('/spaces')}>Back to Spaces</Button></Notice>);
  if (phase === 'lost') return wrap(<Notice emoji="📡" title="Connection lost" body="We could not stay connected to the room."><Button onClick={() => { setPhase('connecting'); setTick((n) => n + 1); }}>Rejoin</Button><Button variant="outline" onClick={() => navigate('/spaces')}>Leave</Button></Notice>);
  if (phase === 'error') {
    return wrap(failure?.kind === 'off'
      ? <Notice emoji="🎙" title="Spaces are coming soon" body="Live audio rooms are almost ready."><Button onClick={() => navigate('/spaces')}>Back</Button></Notice>
      : <Notice emoji={failure?.kind === 'removed' ? '🚫' : '⚠️'} title={failure?.message || 'Could not open this Space'}><Button onClick={() => navigate('/spaces')}>Back to Spaces</Button>{!['removed', 'forbidden', 'missing'].includes(failure?.kind) && <Button variant="outline" onClick={() => { setPhase('loading'); setTick((n) => n + 1); }}>Try again</Button>}</Notice>);
  }
  if (phase === 'scheduled') {
    return wrap(
      <Notice emoji="🗓" title={title} body={`Starts ${space?.scheduledFor ? new Date(space.scheduledFor).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'soon'}. This page opens the room when it goes live.`}>
        {me?.role === 'host' && <Button disabled={busy} onClick={() => run(async () => { await startSpace(id); setTick((n) => n + 1); })}>Go live now</Button>}
        <Button variant="outline" onClick={() => navigate('/spaces')}>Back</Button>
      </Notice>,
    );
  }

  const canSpeak = isSpeakerRole(myRole);
  const micOn = !!lp?.isMicrophoneEnabled;
  const handUp = isHandRaised(lp?.attributes);
  const needsAudio = room && !room.canPlaybackAudio;
  const target = sheet?.type === 'target' ? people.find((x) => x.id === sheet.p.id) || sheet.p : null;
  const targetActions = target ? actionsFor(myRole, target.role, target.isLocal) : [];

  return wrap(
    <>
      <div ref={audioBox} className="hidden" aria-hidden="true" />
      <header className="shrink-0 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />LIVE{space?.membersOnly && <Lock className="h-3 w-3 text-muted-foreground" />}</div>
            <h1 className="break-words text-lg font-bold leading-tight">{title}</h1>
            {space?.topic && <p className="break-words text-sm text-muted-foreground">{space.topic}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Headphones className="h-3.5 w-3.5" />{listeners.length} listening</span>
            {canEnd && <Button size="sm" variant="outline" className="h-8 border-red-500/50 text-red-400" onClick={() => setSheet('end')}>End</Button>}
          </div>
        </div>
        {conn !== ConnectionState.Connected && <div className="mt-2 rounded-md bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300">Reconnecting...</div>}
        {needsAudio && (
          <Button className="mt-2 w-full gap-2" onClick={() => roomRef.current?.startAudio().then(bump).catch(() => {})}><Volume2 className="h-4 w-4" />Tap to listen</Button>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Speakers</h2>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-5">
          {speakers.map((p) => <Tile key={p.id} p={p} big floats={floats} onTap={actionsFor(myRole, p.role, p.isLocal).length ? () => setSheet({ type: 'target', p }) : undefined} />)}
          {!speakers.length && <p className="col-span-full text-sm text-muted-foreground">Waiting for the host to join...</p>}
        </div>
        <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listeners{listeners.length ? ` (${listeners.length})` : ''}</h2>
        <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-6 md:grid-cols-8">
          {shownListeners.map((p) => <Tile key={p.id} p={p} floats={floats} onTap={actionsFor(myRole, p.role, p.isLocal).length ? () => setSheet({ type: 'target', p }) : undefined} />)}
          {extra > 0 && <div className="flex items-center justify-center text-sm font-semibold text-muted-foreground">+{extra}</div>}
        </div>
        {!listeners.length && <p className="text-sm text-muted-foreground">No listeners yet. Share the link!</p>}
      </main>

      {showReactions && (
        <div className="shrink-0 border-t border-border bg-background px-4 py-2">
          <div className="mx-auto flex max-w-md justify-between">
            {REACTION_EMOJIS.map((e) => <button key={e} type="button" onClick={() => react(e)} className="h-12 w-12 rounded-full text-2xl transition-transform active:scale-125">{e}</button>)}
          </div>
        </div>
      )}
      <footer className="shrink-0 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <button type="button" onClick={leave} className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white active:scale-95"><PhoneOff className="h-4 w-4" />Leave</button>
          {isMod(myRole) && (
            <button type="button" onClick={() => setSheet('hands')} className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted active:scale-95" aria-label="Raised hands">
              <Hand className="h-5 w-5" />
              {hands.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{hands.length}</span>}
            </button>
          )}
          {canSpeak ? (
            <button type="button" onClick={toggleMic} aria-label={micOn ? 'Mute' : 'Unmute'} className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${micOn ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>{micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
          ) : (
            <button type="button" onClick={toggleHand} aria-label={handUp ? 'Lower hand' : 'Raise hand'} className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${handUp ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Hand className="h-5 w-5" /></button>
          )}
          <button type="button" onClick={() => setShowReactions((v) => !v)} aria-label="Reactions" className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${showReactions ? 'bg-primary/20' : 'bg-muted'}`}><SmilePlus className="h-5 w-5" /></button>
        </div>
      </footer>

      <Sheet open={!!sheet} onOpenChange={(o) => { if (!o) setSheet(null); }}>
        <SheetContent side="bottom" className="z-[70] mx-auto max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {target && (
            <>
              <SheetHeader><SheetTitle className="flex items-center justify-center gap-3 sm:justify-start"><SpaceAvatar name={target.name} url={target.avatarUrl} size={40} />{target.name}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2">
                {targetActions.map((a) => (
                  <Button key={a} variant={a === 'remove' ? 'destructive' : 'secondary'} className="h-12 w-full justify-start text-base" disabled={busy} onClick={() => doAction(target, a)}>{ACTION_LABELS[a]}</Button>
                ))}
                {!targetActions.length && <p className="text-sm text-muted-foreground">No actions available.</p>}
              </div>
            </>
          )}
          {sheet === 'hands' && (
            <>
              <SheetHeader><SheetTitle>Raised hands</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2">
                {hands.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <SpaceAvatar name={p.name} url={p.avatarUrl} size={40} />
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <Button size="sm" disabled={busy} onClick={() => run(() => speakerAction(id, p.id, 'invite'))}>Invite to speak</Button>
                  </div>
                ))}
                {!hands.length && <p className="text-sm text-muted-foreground">Nobody has a hand up.</p>}
              </div>
            </>
          )}
          {sheet === 'end' && (
            <>
              <SheetHeader><SheetTitle>End this Space for everyone?</SheetTitle></SheetHeader>
              <p className="mt-2 text-sm text-muted-foreground">Everyone will be disconnected. This cannot be undone.</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="h-12 flex-1" onClick={() => setSheet(null)}>Keep going</Button>
                <Button variant="destructive" className="h-12 flex-1" disabled={busy} onClick={() => run(async () => { await endSpace(id); leftRef.current = true; roomRef.current?.disconnect(); navigate('/spaces'); })}>End Space</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>,
  );
}
