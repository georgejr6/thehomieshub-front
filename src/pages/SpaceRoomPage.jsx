import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, ConnectionState, DisconnectReason, Track, ParticipantEvent } from 'livekit-client';
import { Mic, MicOff, Hand, SmilePlus, PhoneOff, Headphones, Volume2, Lock, Share2, Settings2, Check, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  REACTION_EMOJIS, REACTION_TOPIC, ACTION_LABELS, SPEAKER_API_ACTION,
  actionsFor, deriveRole, encodeReaction, endSpace, getSpace, isHandRaised, isMod, isSpeakerRole,
  joinSpace, limitListeners, muteInSpace, parseMetadata, parseReaction, removeFromSpace,
  sortByRole, speakerAction, spacesError, startSpace,
  setHandInSpace, shareSpace, savedMic, saveMic, micErrorText, guestJoinSpace, postSpeaking, postSpeakingKeepalive, isGuestIdentity, formatDuration,
} from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';
import SpaceReplay from '@/components/spaces/SpaceReplay';
import SpaceTile, { SPACES_CSS } from '@/components/spaces/SpaceTile';
import PersonSheet from '@/components/spaces/PersonSheet';
import MicMeter from '@/components/spaces/MicMeter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';

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
  const [guestLeft, setGuestLeft] = useState(null); // seconds left for a signed-out listener
  const listenUntilRef = useRef(0); // performance.now() when the guest preview ends
  const [wallKind, setWallKind] = useState('time'); // time | members
  const [mics, setMics] = useState([]);
  const [activeMic, setActiveMic] = useState(savedMic() || 'default');
  const [devTick, setDevTick] = useState(0);
  const warmedRef = useRef(false);
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
  const isGuest = !user;
  const isAdmin = !!(me?.admin || user?.isAdmin);
  const myRole = mine?.role || (me?.role === 'guest' ? 'listener' : me?.role) || 'listener';
  const modPower = isMod(myRole) || isAdmin;
  const guestPeople = people.filter((p) => isGuestIdentity(p.id));
  const crew = people.filter((p) => !isGuestIdentity(p.id));
  const speakers = sortByRole(crew.filter((p) => isSpeakerRole(p.role)));
  const listeners = crew.filter((p) => !isSpeakerRole(p.role));
  const hands = listeners.filter((p) => p.hand);
  const { shown: shownListeners, extra } = limitListeners(listeners);

  const addFloat = useCallback((who, emoji) => {
    const key = `${Date.now()}-${Math.random()}`;
    setFloats((f) => [...f.slice(-30), { key, id: who, emoji }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.key !== key)), 2100);
  }, []);

  // Load the Space, then join its LiveKit room.
  useEffect(() => {
    if (authLoading) return undefined;
    const guest = !user;
    let cancelled = false;
    let theRoom = null;
    leftRef.current = false;

    (async () => {
      try {
        const info = await getSpace(id, guest);
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
        const j = guest ? await guestJoinSpace(id) : await joinSpace(id);
        // Server clock gives seconds left; count down on the local monotonic clock.
        const secs = Number.isFinite(j?.listenSec) ? j.listenSec : (j?.listenUntil ? (new Date(j.listenUntil).getTime() - Date.now()) / 1000 : 0);
        listenUntilRef.current = guest && secs > 0 ? performance.now() + secs * 1000 : 0;
        if (cancelled) return;
        const mic = savedMic();
        theRoom = new Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { ...(mic ? { deviceId: mic } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const refresh = () => { if (!cancelled) bump(); };
        theRoom
          .on(RoomEvent.ParticipantConnected, refresh).on(RoomEvent.ParticipantDisconnected, refresh)
          .on(RoomEvent.ActiveSpeakersChanged, refresh).on(RoomEvent.TrackMuted, refresh).on(RoomEvent.TrackUnmuted, refresh)
          .on(RoomEvent.LocalTrackPublished, refresh).on(RoomEvent.LocalTrackUnpublished, refresh)
          .on(RoomEvent.ParticipantMetadataChanged, refresh).on(RoomEvent.ParticipantAttributesChanged, refresh)
          .on(RoomEvent.ParticipantPermissionsChanged, refresh).on(RoomEvent.AudioPlaybackStatusChanged, refresh)
          .on(RoomEvent.ParticipantNameChanged, refresh)
          .on(RoomEvent.MediaDevicesChanged, () => { if (!cancelled) setDevTick((n) => n + 1); })
          .on(RoomEvent.ActiveDeviceChanged, (kind, deviceId) => { if (!cancelled && kind === 'audioinput' && deviceId) { setActiveMic(deviceId); bump(); } })
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
            if (guest && listenUntilRef.current && performance.now() >= listenUntilRef.current - 3000) { setWallKind('time'); setPhase('wall'); }
            else if (reason === DisconnectReason.ROOM_DELETED) setPhase('ended');
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
        if (f.kind === 'signin' || (guest && f.kind === 'auth')) { setWallKind(spaceRef.current?.membersOnly ? 'members' : 'time'); setPhase('wall'); return; }
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
  }, [id, user?.id, authLoading, tick]);

  // Back from Stripe after a tip.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('tip') !== 'thanks') return;
    toast({ title: 'Thanks for the tip' });
    q.delete('tip');
    navigate({ pathname: location.pathname, search: q.toString() ? `?${q}` : '' }, { replace: true, state: location.state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed-out listeners get a 2 minute preview, then the sign-in wall.
  useEffect(() => {
    if (phase !== 'live' || !isGuest || !listenUntilRef.current) { setGuestLeft(null); return undefined; }
    const step = () => {
      const left = Math.max(0, Math.ceil((listenUntilRef.current - performance.now()) / 1000));
      setGuestLeft(left);
      if (left <= 0) {
        leftRef.current = true;
        const r = roomRef.current;
        if (r) { try { r.disconnect(); } catch { /* closing */ } }
        setWallKind('time');
        setPhase('wall');
      }
    };
    step();
    const t = setInterval(step, 500);
    return () => clearInterval(t);
  }, [phase, isGuest]);

  // Report when I am talking, so the replay can light up my avatar. Only while I have a mic.
  const hasMic = !isGuest && isSpeakerRole(myRole);
  useEffect(() => {
    if (phase !== 'live' || !hasMic) return undefined;
    const lp0 = roomRef.current?.localParticipant;
    if (!lp0) return undefined;
    let open = null; // start ms of the stretch I am talking in right now
    let queue = [];
    const push = (start, end) => {
      const last = queue[queue.length - 1];
      if (last && start - last.end < 400) last.end = end; else queue.push({ start, end });
    };
    const onSpeaking = (speaking) => {
      const now = Date.now();
      if (speaking && open == null) open = now;
      else if (!speaking && open != null) { push(open, now); open = null; }
    };
    // Every 10 s: send finished stretches plus the part of the current one so far.
    const flush = () => {
      const now = Date.now();
      if (open != null) { push(open, now); open = now; }
      if (!queue.length) return;
      const batch = queue.slice(0, 60);
      queue = queue.slice(60);
      postSpeaking(id, batch).catch(() => { /* silent */ });
    };
    // Leaving or closing the tab: keepalive requests survive the page going away.
    const flushNow = (closeOpen) => {
      const now = Date.now();
      if (open != null) { push(open, now); open = closeOpen ? null : now; }
      for (let n = 0; queue.length && n < 5; n += 1) { postSpeakingKeepalive(id, queue.slice(0, 60)); queue = queue.slice(60); }
      queue = [];
    };
    lp0.on(ParticipantEvent.IsSpeakingChanged, onSpeaking);
    const t = setInterval(flush, 10000);
    const onHide = () => flushNow(false);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(t);
      window.removeEventListener('pagehide', onHide);
      lp0.off(ParticipantEvent.IsSpeakingChanged, onSpeaking);
      flushNow(true); // also runs when my role drops from speaker to listener
    };
  }, [phase, hasMic, id]);

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
      setHandInSpace(id, false).catch(() => {});
      toast({ title: 'You can speak now', description: 'Tap the mic when you are ready.' });
    } else if (!isSpeakerRole(myRole) && isSpeakerRole(was)) {
      lp.setMicrophoneEnabled(false).catch(() => {});
      toast({ title: 'You are back to listening' });
    }
  }, [myRole, phase]);

  // Microphones: asked for once as soon as you can speak, so one is picked and
  // unmuting starts right away. The choice is remembered per browser.
  const loadMics = useCallback(async (ask) => {
    try {
      const list = (await Room.getLocalDevices('audioinput', ask)).filter((d) => d.deviceId);
      setMics(list);
      const cur = roomRef.current?.getActiveDevice('audioinput') || savedMic();
      const ok = cur && list.some((d) => d.deviceId === cur);
      setActiveMic(ok ? cur : (list.find((d) => d.deviceId === 'default') || list[0])?.deviceId || 'default');
      return list;
    } catch (err) {
      if (ask) toast({ title: 'Microphone blocked', description: micErrorText(err), variant: 'destructive' });
      return [];
    }
  }, []);
  useEffect(() => {
    if (phase !== 'live' || !isSpeakerRole(myRole) || warmedRef.current) return;
    warmedRef.current = true;
    loadMics(true);
  }, [phase, myRole, loadMics]);
  useEffect(() => { if (devTick) loadMics(false); }, [devTick, loadMics]);
  const pickMic = async (deviceId) => {
    const prev = activeMic;
    setActiveMic(deviceId);
    let ok = true;
    try { ok = (await roomRef.current?.switchActiveDevice('audioinput', deviceId)) !== false; } catch (err) { ok = false; toast({ title: 'Could not switch mic', description: micErrorText(err), variant: 'destructive' }); }
    if (ok) saveMic(deviceId); else setActiveMic(prev);
    bump(); // the published track object changes on a switch; re-read it for the meter
  };
  const share = async () => { if ((await shareSpace({ id, title: space?.title })) === 'copied') toast({ title: 'Link copied', description: 'Send it to anyone. It opens this Space (or its replay).' }); };

  const leave = () => {
    leftRef.current = true;
    const r = roomRef.current;
    if (r) { try { r.localParticipant.setMicrophoneEnabled(false); } catch { /* closing */ } r.disconnect(); }
    navigate('/spaces');
  };

  const lp = roomRef.current?.localParticipant;
  const toggleMic = async () => {
    if (!lp) return;
    const turningOn = !lp.isMicrophoneEnabled;
    try {
      await lp.setMicrophoneEnabled(turningOn);
      if (turningOn && !mics.length) loadMics(false);
    } catch (err) {
      // The picked mic was unplugged: fall back to the default one once.
      let fixed = false;
      if (turningOn && ['OverconstrainedError', 'NotFoundError'].includes(err?.name)) {
        try {
          saveMic('');
          await roomRef.current?.switchActiveDevice('audioinput', 'default');
          await lp.setMicrophoneEnabled(true);
          setActiveMic('default'); fixed = true;
          toast({ title: 'Switched to your default mic', description: 'The one you picked is not plugged in.' });
        } catch { /* fall through */ }
      }
      if (!fixed) toast({ title: 'Could not use the microphone', description: micErrorText(err), variant: 'destructive' });
    }
    bump();
  };
  const toggleHand = async () => {
    if (!lp) return;
    try { await setHandInSpace(id, !isHandRaised(lp.attributes)); } catch { toast({ title: 'Could not raise your hand', variant: 'destructive' }); }
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
    if (action === 'mute') return run(async () => { const r = await muteInSpace(id, p.id); if (!r?.muted) throw new Error(`${p.name}'s mic is already off`); }, `${p.name} muted`);
    if (action === 'remove') return run(() => removeFromSpace(id, p.id), `${p.name} removed`);
    return run(() => speakerAction(id, p.id, SPEAKER_API_ACTION[action]));
  };

  const title = space?.title || 'Space';
  const isHost = me?.role === 'host' || myRole === 'host';
  const canEnd = isHost || isAdmin;
  const wrap = (children) => (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground">
      <Helmet><title>{`${title} | Spaces | The Homies`}</title></Helmet>
      <style>{SPACES_CSS}</style>
      {children}
    </div>
  );

  if (authLoading) return wrap(<Notice emoji="🎙" title="Loading..." />);
  if (phase === 'loading' || phase === 'connecting') return wrap(<Notice emoji="🎧" title={phase === 'loading' ? 'Loading Space...' : 'Joining the room...'} />);
  if (phase === 'wall') return wrap(<Notice emoji="🎧" title={wallKind === 'members' ? 'Sign in to listen' : 'Sign in to keep listening'} body={wallKind === 'members' ? undefined : 'Guests can listen for 2 minutes. Sign in free to stay in the Space.'}><Button onClick={() => onLoginRequest?.({ redirect: `/spaces/${id}` })}>Sign in</Button><Button variant="outline" onClick={() => navigate('/spaces')}>Back</Button></Notice>);
  if (phase === 'ended') return wrap(<SpaceReplay id={id} space={space} signedIn={!isGuest} canDelete={me?.role === 'host' || !!user?.isAdmin} onBack={() => navigate('/spaces')} onLoginRequest={onLoginRequest} />);
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
  const targetActions = target ? actionsFor(myRole, target.role, target.isLocal, isAdmin) : [];

  return wrap(
    <>
      <div ref={audioBox} className="hidden" aria-hidden="true" />
      <header className="shrink-0 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />LIVE{space?.membersOnly && <Lock className="h-3 w-3 text-muted-foreground" />}</div>
            <h1 className="break-words text-lg font-bold leading-tight">{title}</h1>
            {space?.topic && <p className="break-words text-sm text-muted-foreground">{space.topic}</p>}
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><Circle className="h-2 w-2 fill-red-400 text-red-400" />Recording for replay</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Headphones className="h-3.5 w-3.5" />{listeners.length + guestPeople.length} listening</span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5" onClick={share} aria-label="Share"><Share2 className="h-3.5 w-3.5" />Share</Button>
              {canEnd && <Button size="sm" variant="outline" className="h-8 border-red-500/50 text-red-400" onClick={() => setSheet('end')}>End</Button>}
            </div>
          </div>
        </div>
        {isGuest && guestLeft != null && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-xs"><span>Listening as a guest · {formatDuration(guestLeft)} left</span><button type="button" className="font-semibold underline" onClick={() => onLoginRequest?.({ redirect: `/spaces/${id}` })}>Sign in</button></div>
        )}
        {conn !== ConnectionState.Connected && <div className="mt-2 rounded-md bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300">Reconnecting...</div>}
        {needsAudio && (
          <Button className="mt-2 w-full gap-2" onClick={() => roomRef.current?.startAudio().then(bump).catch(() => {})}><Volume2 className="h-4 w-4" />Tap to listen</Button>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Speakers</h2>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-5">
          {speakers.map((p) => <SpaceTile key={p.id} p={p} big floats={floats} onTap={() => (isGuest ? onLoginRequest?.({ redirect: `/spaces/${id}` }) : setSheet({ type: 'target', p }))} />)}
          {!speakers.length && <p className="col-span-full text-sm text-muted-foreground">Waiting for the host to join...</p>}
        </div>
        <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listeners{listeners.length ? ` (${listeners.length})` : ''}</h2>
        <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-6 md:grid-cols-8">
          {shownListeners.map((p) => <SpaceTile key={p.id} p={p} floats={floats} onTap={() => (isGuest ? onLoginRequest?.({ redirect: `/spaces/${id}` }) : setSheet({ type: 'target', p }))} />)}
          {extra > 0 && <div className="flex items-center justify-center text-sm font-semibold text-muted-foreground">+{extra}</div>}
          {guestPeople.length > 0 && <div className="flex items-center justify-center text-xs font-semibold text-muted-foreground">+{guestPeople.length} guest{guestPeople.length === 1 ? '' : 's'}</div>}
        </div>
        {!listeners.length && !guestPeople.length && <p className="text-sm text-muted-foreground">No listeners yet. Share the link!</p>}
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
          <button type="button" onClick={leave} aria-label="Leave" className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white active:scale-95"><PhoneOff className="h-4 w-4" /><span className="hidden min-[400px]:inline">Leave</span></button>
          {modPower && !isGuest && (
            <button type="button" onClick={() => setSheet('hands')} className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted active:scale-95" aria-label="Raised hands">
              <Hand className="h-5 w-5" />
              {hands.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{hands.length}</span>}
            </button>
          )}
          {canSpeak && !isGuest && (
            <button type="button" onClick={() => { setSheet('mic'); loadMics(true); }} aria-label="Mic settings" className="flex h-12 w-12 items-center justify-center rounded-full bg-muted active:scale-95"><Settings2 className="h-5 w-5" /></button>
          )}
          {isGuest ? (
            <Button className="h-12 flex-1 rounded-full" onClick={() => onLoginRequest?.({ redirect: `/spaces/${id}` })}>Sign in to join in</Button>
          ) : canSpeak ? (
            <button type="button" onClick={toggleMic} aria-label={micOn ? 'Mute' : 'Unmute'} className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${micOn ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>{micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
          ) : (
            <button type="button" onClick={toggleHand} aria-label={handUp ? 'Lower hand' : 'Raise hand'} className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${handUp ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Hand className="h-5 w-5" /></button>
          )}
          {!isGuest && <button type="button" onClick={() => setShowReactions((v) => !v)} aria-label="Reactions" className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${showReactions ? 'bg-primary/20' : 'bg-muted'}`}><SmilePlus className="h-5 w-5" /></button>}
        </div>
      </footer>

      <Sheet open={!!sheet && sheet.type !== 'target'} onOpenChange={(o) => { if (!o) setSheet(null); }}>
        <SheetContent side="bottom" overlayClassName="z-[65]" className="z-[70] mx-auto max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
          {sheet === 'mic' && (
            <>
              <SheetHeader><SheetTitle>Microphone</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2">
                {mics.map((d, i) => (
                  <button key={d.deviceId} type="button" onClick={() => pickMic(d.deviceId)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${activeMic === d.deviceId ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <Mic className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 break-words">{d.label || `Microphone ${i + 1}`}</span>
                    {activeMic === d.deviceId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
                {!mics.length && <p className="text-sm text-muted-foreground">No microphones yet. Allow mic access when your browser asks, or plug one in.</p>}
              </div>
              {mics.length > 0 && (() => {
                const pubTrack = lp?.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack || null;
                if (micOn && pubTrack) return <div className="mt-4"><MicMeter key={pubTrack.id} deviceId={activeMic} liveTrack={pubTrack} /></div>;
                if (pubTrack) return <p className="mt-4 text-xs text-muted-foreground">Unmute to test your mic.</p>;
                return <div className="mt-4"><MicMeter key={activeMic} deviceId={activeMic} liveTrack={null} /></div>;
              })()}
              <div className="mt-4 flex gap-2">
                <Button className="h-12 flex-1" onClick={async () => { if (!micOn) await toggleMic(); setSheet(null); }}>{micOn ? 'Done' : 'Unmute and talk'}</Button>
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
      <PersonSheet spaceId={id} signedIn={!isGuest} person={target} onClose={() => setSheet(null)}>
        {target && targetActions.map((a) => (
          <Button key={a} variant={a === 'remove' ? 'destructive' : 'secondary'} className="h-12 w-full justify-start text-base" disabled={busy} onClick={() => doAction(target, a)}>{ACTION_LABELS[a]}</Button>
        ))}
      </PersonSheet>
    </>,
  );
}
