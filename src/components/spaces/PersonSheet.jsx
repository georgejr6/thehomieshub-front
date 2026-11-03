import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, DollarSign } from 'lucide-react';
import { getPerson, giftPoints, isStripeUrl, personError, safeHandleUrl, tipPerson } from '@/lib/spaces';
import SpaceAvatar from '@/components/spaces/SpaceAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfileEditSheet from '@/components/spaces/ProfileEditSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';

const POINT_PRESETS = [50, 100, 500];
const TIP_PRESETS = [3, 5, 10];
const HANDLES = [['cashapp', 'Cash App', '$'], ['instagram', 'Instagram', '@'], ['youtube', 'YouTube', '@'], ['tiktok', 'TikTok', '@'], ['x', 'X', '@']];

function Amounts({ presets, value, onPick, custom, onCustom, fmt, placeholder }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {presets.map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)}
          className={`h-10 min-w-16 rounded-full px-4 text-sm font-semibold ${value === v && !custom ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{fmt(v)}</button>
      ))}
      <Input inputMode="decimal" value={custom} onChange={(e) => onCustom(e.target.value.replace(/[^0-9.]/g, ''))} placeholder={placeholder} className="h-10 w-28" />
    </div>
  );
}

// Tap an avatar (live or replay). Shows who they are, any host controls
// (children), and Send points / Tip $ when the server says they can get them.
export default function PersonSheet({ spaceId, person, signedIn, onClose, children }) {
  const open = !!person;
  const [info, setInfo] = useState(null);
  const [pts, setPts] = useState(100);
  const [ptsCustom, setPtsCustom] = useState('');
  const [tip, setTip] = useState(5);
  const [tipCustom, setTipCustom] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setInfo(null); setErr(null); setPtsCustom(''); setTipCustom('');
    if (!person?.id || !signedIn) return undefined;
    let stop = false;
    getPerson(spaceId, person.id).then((r) => { if (!stop) setInfo(r); }).catch(() => { /* just no gift/tip buttons */ });
    return () => { stop = true; };
  }, [spaceId, person?.id, signedIn]);

  const points = ptsCustom ? Math.floor(Number(ptsCustom)) : pts;
  const cents = tipCustom ? Math.round(Number(tipCustom) * 100) : tip * 100;
  const pointsOk = points >= 10 && points <= 10000;
  const tipOk = cents >= 300 && cents <= 50000;
  const self = !!info?.self;
  const prof = info?.profile || {};
  const links = prof.links || {};
  const chips = HANDLES.map(([k, label, pre]) => [k, label, pre, prof[k] && links[k] ? safeHandleUrl(k, links[k]) : null]).filter((c) => c[3]);

  const sendPoints = async () => {
    setBusy('gift'); setErr(null);
    try {
      const r = await giftPoints(spaceId, person.id, points);
      toast({ title: `Sent ${r?.points ?? points} points to ${person.name}` });
      onClose();
    } catch (e) { setErr(personError(e)); } finally { setBusy(''); }
  };
  const sendTip = async () => {
    setBusy('tip'); setErr(null);
    // Open the tab now (inside the tap) so it is not blocked; point it at Stripe after the call.
    let w = null;
    try { w = window.open('about:blank', '_blank'); if (w) w.opener = null; } catch { w = null; }
    try {
      const r = await tipPerson(spaceId, person.id, cents);
      if (!isStripeUrl(r?.url)) throw new Error('Could not open the payment page.');
      if (w) w.location.href = r.url; else window.location.assign(r.url);
      onClose();
    } catch (e) {
      if (w) { try { w.close(); } catch { /* already closed */ } }
      setErr(personError(e));
    } finally { setBusy(''); }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" overlayClassName="z-[65]" className="z-[70] mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {person && (
          <>
            <SheetHeader><SheetTitle className="flex items-center justify-center gap-3 sm:justify-start"><SpaceAvatar name={person.name} url={person.avatarUrl} size={40} />{person.name}</SheetTitle></SheetHeader>
            {info?.person?.username && <p className="text-center text-sm text-muted-foreground sm:text-left">@{info.person.username}</p>}
            {prof.bio && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{prof.bio}</p>}
            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map(([k, label, pre, href]) => (
                  <a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{label} {pre}{prof[k]}</a>
                ))}
              </div>
            )}
            {info?.profileUrl && <Link to={info.profileUrl} onClick={onClose} className="mt-3 block rounded-md border border-border py-2.5 text-center text-sm font-semibold">View profile</Link>}
            {self && <Button variant="secondary" className="mt-3 h-11 w-full" onClick={() => setEditing(true)}>Edit my Spaces profile</Button>}
            {children && <div className="mt-4 space-y-2">{children}</div>}
            {info?.canGift && !self && (
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4" />Send points</div>
                <Amounts presets={POINT_PRESETS} value={pts} onPick={(v) => { setPts(v); setPtsCustom(''); }} custom={ptsCustom} onCustom={setPtsCustom} fmt={(v) => v} placeholder="Other" />
                <Button className="mt-2 h-11 w-full" disabled={!pointsOk || !!busy} onClick={sendPoints}>{busy === 'gift' ? 'Sending...' : `Send ${pointsOk ? points : ''} points`}</Button>
                {!pointsOk && <p className="mt-1 text-xs text-muted-foreground">Pick 10 to 10,000 points.</p>}
              </div>
            )}
            {info?.canTip && !self && (
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><DollarSign className="h-4 w-4" />Tip</div>
                <Amounts presets={TIP_PRESETS} value={tip} onPick={(v) => { setTip(v); setTipCustom(''); }} custom={tipCustom} onCustom={setTipCustom} fmt={(v) => '$' + v} placeholder="Other $" />
                <Button className="mt-2 h-11 w-full" disabled={!tipOk || !!busy} onClick={sendTip}>{busy === 'tip' ? 'Opening...' : `Tip ${tipOk ? '$' + (cents / 100).toFixed(2) : ''}`}</Button>
                {!tipOk && <p className="mt-1 text-xs text-muted-foreground">Tips are $3 to $500.</p>}
              </div>
            )}
            {err && (
              <p className="mt-3 text-sm text-red-400">{err.message}{err.kind === 'points' && <> <Link to="/wallet" className="underline">Get points</Link></>}</p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
    <ProfileEditSheet open={editing} onClose={() => setEditing(false)} />
    </>
  );
}
