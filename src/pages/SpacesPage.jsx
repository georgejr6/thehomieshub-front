import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { Headphones, Mic, Plus, Lock, CalendarClock, Play, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import useLiveSpaces from '@/hooks/useLiveSpaces';
import { createSpace, spacesError, shareSpace, durationLabel } from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';

async function share(e, s) {
  e.preventDefault(); e.stopPropagation();
  if ((await shareSpace(s)) === 'copied') toast({ title: 'Link copied' });
}

function SpaceCard({ s, scheduled, replay }) {
  const speakers = (s.speakerIds || []).length;
  return (
    <div className="relative">
    <Link to={`/spaces/${s.id}`} className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 active:scale-[0.99]">
      <div className="flex items-center gap-2 pr-10 text-xs font-semibold">
        {replay
          ? <span className="inline-flex items-center gap-1 text-primary"><Play className="h-3.5 w-3.5" />Replay · {durationLabel(s.replay?.durationSec)}{s.endedAt ? ` · ${new Date(s.endedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</span>
          : scheduled
          ? <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{s.scheduledFor ? new Date(s.scheduledFor).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Scheduled'}</span>
          : <span className="inline-flex items-center gap-1.5 text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />LIVE</span>}
        {s.membersOnly && <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />Members</span>}
      </div>
      <h3 className="mt-1.5 break-words pr-8 text-lg font-bold leading-snug">{s.title}</h3>
      {s.topic && <p className="mt-0.5 break-words text-sm text-muted-foreground">{s.topic}</p>}
      <div className="mt-3 flex items-center gap-3">
        <SpaceAvatar name={s.host?.displayName || s.host?.username} url={s.host?.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{s.host?.displayName || s.host?.username}</div>
          <div className="text-xs text-muted-foreground">Host</div>
        </div>
        {replay && s.peakListeners > 0 && <span className="shrink-0 text-xs text-muted-foreground">{s.peakListeners} listened live</span>}
        {!scheduled && !replay && (
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Headphones className="h-3.5 w-3.5" />{s.listenerCount ?? 0} listening</span>
            {speakers > 0 && <span className="inline-flex items-center gap-1"><Mic className="h-3.5 w-3.5" />{s.speakerCount ?? speakers} speaking</span>}
          </div>
        )}
      </div>
    </Link>
    <button type="button" onClick={(e) => share(e, s)} aria-label={`Share ${s.title}`} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><Share2 className="h-4 w-4" /></button>
    </div>
  );
}

function StartSheet({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState('');
  const [membersOnly, setMembersOnly] = useState(false);
  const [record, setRecord] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    if (later && (!when || Number.isNaN(new Date(when).getTime()))) { toast({ title: 'Pick a date and time.', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const body = { title: title.trim(), membersOnly, record };
      if (topic.trim()) body.topic = topic.trim();
      if (later) body.scheduledFor = new Date(when).toISOString();
      const r = await createSpace(body);
      const id = r?.space?.id || r?.id;
      onOpenChange(false);
      if (id) navigate(`/spaces/${id}`, { state: { autostart: !later } });
    } catch (err) {
      const se = spacesError(err);
      if (se.kind === 'already_live' && se.spaceId) { onOpenChange(false); navigate(`/spaces/${se.spaceId}`); return; }
      toast({ title: se.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle>Start a Space</SheetTitle></SheetHeader>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="What is the vibe?" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Topic <span className="text-muted-foreground">(optional)</span></label>
            <Input value={topic} maxLength={140} onChange={(e) => setTopic(e.target.value)} placeholder="Say a bit more" />
          </div>
          <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
            {[[false, 'Go live now'], [true, 'Schedule']].map(([v, label]) => (
              <button key={label} type="button" onClick={() => setLater(v)}
                className={`flex-1 rounded-md py-2 transition-colors ${later === v ? 'bg-background shadow' : 'text-muted-foreground'}`}>{label}</button>
            ))}
          </div>
          {later && <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full" />}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span><span className="font-medium">Members only</span><span className="block text-muted-foreground">Only paid members can join.</span></span>
            <Switch checked={membersOnly} onCheckedChange={setMembersOnly} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span><span className="font-medium">Record for replay</span><span className="block text-muted-foreground">People can listen back after it ends. Everyone in the room sees a REC tag.</span></span>
            <Switch checked={record} onCheckedChange={setRecord} />
          </label>
          <Button type="submit" className="h-12 w-full text-base" disabled={!title.trim() || busy}>{busy ? 'Starting...' : later ? 'Schedule Space' : 'Start Space'}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function SpacesPage({ onLoginRequest }) {
  const { user } = useAuth();
  const { live, scheduled, replays, canHost, status, error, refresh } = useLiveSpaces({ enabled: !!user, intervalMs: 30000 });
  const [sheet, setSheet] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-28">
      <Helmet><title>Spaces | The Homies</title></Helmet>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Spaces</h1>
          <p className="text-sm text-muted-foreground">Live audio rooms with The Homies.</p>
        </div>
        {user && canHost && status === 'ready' && (
          <Button onClick={() => setSheet(true)} className="shrink-0 gap-1.5"><Plus className="h-4 w-4" />Start a Space</Button>
        )}
      </div>

      {!user ? (
        <div className="mt-10 text-center">
          <p className="text-muted-foreground">Sign in to listen in and join the conversation.</p>
          <Button className="mt-4" onClick={() => onLoginRequest?.()}>Sign in</Button>
        </div>
      ) : status === 'loading' ? (
        <div className="mt-6 space-y-3">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : status === 'off' ? (
        <div className="mt-12 text-center"><div className="text-5xl">🎙</div><h2 className="mt-3 text-xl font-bold">Spaces are coming soon</h2><p className="mt-1 text-sm text-muted-foreground">Live audio rooms are almost ready. Check back shortly.</p></div>
      ) : status === 'error' ? (
        <div className="mt-12 text-center"><p className="text-muted-foreground">{error?.message || 'Could not load Spaces.'}</p><Button variant="outline" className="mt-3" onClick={refresh}>Try again</Button></div>
      ) : (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live now</h2>
          {live.length ? <div className="space-y-3">{live.map((s) => <SpaceCard key={s.id} s={s} />)}</div>
            : <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No Spaces live right now.{canHost ? ' Start one!' : ''}</div>}
          {scheduled.length > 0 && (
            <>
              <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scheduled</h2>
              <div className="space-y-3">{scheduled.map((s) => <SpaceCard key={s.id} s={s} scheduled />)}</div>
            </>
          )}
          {replays.length > 0 && (
            <>
              <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Replays</h2>
              <div className="space-y-3">{replays.map((s) => <SpaceCard key={s.id} s={s} replay />)}</div>
            </>
          )}
        </>
      )}
      <StartSheet open={sheet} onOpenChange={setSheet} />
    </div>
  );
}
