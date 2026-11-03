import React, { useEffect, useState } from 'react';
import { apiErrorCode } from '@/lib/apiErrors';
import { getMyProfile, saveMyProfile } from '@/lib/spaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';

const FIELDS = [
  ['cashapp', 'Cash App', '$cashtag'],
  ['instagram', 'Instagram', 'username'],
  ['youtube', 'YouTube', 'channel name'],
  ['tiktok', 'TikTok', 'username'],
  ['x', 'X', 'username'],
];

// "Edit my Spaces profile": what people see when they tap your avatar in a Space.
export default function ProfileEditSheet({ open, onClose }) {
  const [f, setF] = useState({ bio: '', cashapp: '', instagram: '', youtube: '', tiktok: '', x: '' });
  const [orig, setOrig] = useState(null); // what the server has; null until loaded
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let stop = false;
    setErr(''); setOrig(null);
    getMyProfile().then((r) => {
      if (stop) return;
      const base = { bio: '', cashapp: '', instagram: '', youtube: '', tiktok: '', x: '' };
      const p = { ...base, ...(r?.profile || {}) };
      setF(p); setOrig(p);
    }).catch(() => { if (!stop) setErr('Could not load your profile. Close this and try again.'); });
    return () => { stop = true; };
  }, [open]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = {};
      if ((f.bio || '') !== (orig.bio || '')) body.bio = f.bio || '';
      FIELDS.forEach(([k]) => {
        const v = (f[k] || '').trim().replace(/^[@$]/, '');
        if (v !== (orig[k] || '')) body[k] = v;
      });
      if (Object.keys(body).length) await saveMyProfile(body);
      toast({ title: 'Profile saved' });
      onClose();
    } catch (ex) {
      const code = apiErrorCode(ex);
      if (code === 'bad_bio') setErr('Keep your bio under 160 characters, with no links.');
      else if (code === 'bad_handle') setErr('One of the names looks wrong. Use just the name, no links.');
      else setErr(ex?.response?.data?.message || 'Could not save. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" overlayClassName="z-[75]" className="z-[80] mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle>My Spaces profile</SheetTitle></SheetHeader>
        <form onSubmit={save} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Bio <span className="text-muted-foreground">({(f.bio || '').length}/160)</span></label>
            <textarea value={f.bio || ''} maxLength={160} rows={3} onChange={(e) => setF({ ...f, bio: e.target.value })}
              placeholder="Say something about you" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          {FIELDS.map(([k, label, ph]) => (
            <div key={k}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <Input value={f[k] || ''} maxLength={100} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} autoCapitalize="none" autoCorrect="off" />
            </div>
          ))}
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button type="submit" className="h-12 w-full" disabled={busy || !orig}>{busy ? 'Saving...' : 'Save'}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
