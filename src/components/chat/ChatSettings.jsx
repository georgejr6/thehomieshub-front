import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, Bell, User, Shield, Trash2, Globe, Monitor, Smartphone, Mail, Megaphone, MessagesSquare } from 'lucide-react';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  desktopSupported, desktopPermission, getDesktopPrefs, setDesktopPrefs, enableDesktopNotifications, desktopNotify,
} from '@/lib/desktopNotify';

// Gear by your name in /chat → User Settings (Discord-style):
//  - My Profile: avatar, display name, @username, bio (PATCH /profile/me)
//  - Notifications: desktop notifications (this browser), chat server mute,
//    phone push + email per event, and Homies updates & offers opt-outs
//    (PATCH /profile/me/notifications, channel push | email | marketing)
//  - Privacy & Data: discoverable posts, delete my messages
const USERNAME_RE = /^[a-z0-9_.]{2,32}$/;

function Toggle({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cn('flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50', on ? 'bg-[#23A55A]' : 'bg-[#80848E]')}>
      <span className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', on && 'translate-x-4')} />
    </button>
  );
}
function Row({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#3F4147]/60 py-3 last:border-0">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#B5BAC1]" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[#F2F3F5]">{title}</div>
        {desc && <div className="mt-0.5 text-xs text-[#949BA4]">{desc}</div>}
      </div>
      {children}
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#949BA4]">{title}</h3>
      <div className="rounded-lg bg-[#2B2D31] px-4">{children}</div>
    </div>
  );
}

const TABS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
];

export default function ChatSettings({ open, onClose, state, actions, onToast, onToggleDiscoverable, onDeleteHistory, activeChannel }) {
  const { user, refreshMe } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: '', username: '', bio: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [desk, setDesk] = useState(getDesktopPrefs());
  const [perm, setPerm] = useState(desktopPermission());
  const [prefs, setPrefs] = useState({ push: {}, email: {}, marketing: {} });
  const [muteBusy, setMuteBusy] = useState(false);
  const [mutedLocal, setMutedLocal] = useState(null);
  const file = useRef(null);
  const saved = useRef(null); // prefs as the server last confirmed them (survives reopening)
  const panel = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!open || !user) return;
    setForm({ name: user.displayName || user.username || '', username: user.username || '', bio: user.bio || '', avatarUrl: user.avatarUrl || '' });
    setPrefs(saved.current || { push: user.pushNotifications || {}, email: user.emailNotifications || {}, marketing: user.marketing || {} });
    setMutedLocal(null);
    opener.current = document.activeElement;
    setTimeout(() => panel.current?.focus(), 0);
    setDesk(getDesktopPrefs());
    setPerm(desktopPermission());
    setError('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!user && (form.name !== (user.displayName || user.username || '') || form.username !== (user.username || '') || form.bio !== (user.bio || '') || form.avatarUrl !== (user.avatarUrl || ''));
  // Closing with unsaved profile edits asks first; focus goes back to the gear.
  const close = () => {
    if (dirty && !window.confirm('Discard your unsaved profile changes?')) return;
    onClose();
    setTimeout(() => opener.current?.focus?.(), 0);
  };
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  });

  if (!open || !user) return null;
  const usernameOk = USERNAME_RE.test(form.username);

  const pickAvatar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Pick an image file.');
    if (f.size > 5 * 1024 * 1024) return setError('That image is over 5 MB.');
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post('/files/upload?folder=avatars', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data?.result?.url;
      if (!url) throw new Error('no url');
      setForm((cur) => ({ ...cur, avatarUrl: url }));
    } catch {
      setError("Couldn't upload that picture.");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!usernameOk) return setError('Usernames are 2–32 characters: lowercase letters, numbers, _ or .');
    if (!form.name.trim()) return setError('Display name can’t be empty.');
    setSaving(true);
    setError('');
    try {
      await api.patch('/profile/me', { name: form.name.trim().slice(0, 32), username: form.username, bio: form.bio.slice(0, 190), avatarUrl: form.avatarUrl });
      await refreshMe();
      actions.reload();
      onToast?.('Profile saved. Everyone sees the update.');
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const setPref = async (channel, key, value) => {
    setPrefs((p) => ({ ...p, [channel]: { ...p[channel], [key]: value } }));
    try {
      const { data } = await api.patch('/profile/me/notifications', { channel, [key]: value });
      const r = data?.result || {};
      setPrefs((p) => {
        const next = { push: r.pushNotifications || p.push, email: r.emailNotifications || p.email, marketing: r.marketing || p.marketing };
        saved.current = next;
        return next;
      });
    } catch {
      setPrefs((p) => ({ ...p, [channel]: { ...p[channel], [key]: !value } }));
      onToast?.("Couldn't save that setting.");
    }
  };

  const muted = mutedLocal ?? !!state.me?.notifications?.serverMuted;
  const setServerMuted = async (value) => {
    setMutedLocal(value);
    setMuteBusy(true);
    try {
      await api.patch('/chat/notifications', { serverMuted: value });
      actions.reload();
    } catch {
      setMutedLocal(!value);
      onToast?.("Couldn't change that setting.");
    } finally {
      setMuteBusy(false);
    }
  };

  const toggleDesktop = async (value) => {
    if (!value) { setDesk(setDesktopPrefs({ enabled: false })); return; }
    const p = await enableDesktopNotifications();
    setPerm(p);
    setDesk(getDesktopPrefs());
    if (p === 'granted') {
      const shown = desktopNotify('mentions', { title: 'Desktop notifications are on', body: "You'll get these for mentions and DMs while Homies Chat is open in a tab.", force: true });
      // Some browsers (Android Chrome) grant permission but can't show page notifications.
      if (!shown) { setDesk(setDesktopPrefs({ enabled: false })); setPerm('unsupported'); }
    }
  };

  const push = prefs.push, email = prefs.email, mk = prefs.marketing;
  const onOff = (v) => v !== false; // unset = on (server defaults)

  return (
    <div className="chat-fade-in fixed inset-0 z-[120] flex items-stretch justify-center bg-black/70 sm:items-center sm:p-6" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="User settings" className="chat-pop outline-none flex h-full w-full flex-col overflow-hidden bg-[#313338] text-[#DBDEE1] shadow-2xl sm:h-[82vh] sm:max-w-3xl sm:flex-row sm:rounded-xl">
        {/* Nav: sidebar on desktop, tabs on phones */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#1F2023] bg-[#2B2D31] px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:w-52 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r sm:p-3">
          <div className="hidden px-2 pb-2 text-xs font-bold uppercase tracking-wide text-[#949BA4] sm:block">User settings</div>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={cn('flex shrink-0 items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors', tab === t.id ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]')}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <button type="button" onClick={close} aria-label="Close settings" className="ml-auto rounded-full p-1.5 text-[#B5BAC1] hover:bg-white/10 hover:text-white sm:hidden"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 [scrollbar-width:thin]">
          <button type="button" onClick={close} aria-label="Close settings" className="absolute right-4 top-4 hidden rounded-full border border-[#B5BAC1]/40 p-1.5 text-[#B5BAC1] hover:bg-white/10 hover:text-white sm:block"><X className="h-4 w-4" /></button>

          {tab === 'profile' && (
            <div className="max-w-lg">
              <h2 className="mb-4 text-xl font-bold text-white">My Profile</h2>
              <div className="mb-5 flex items-center gap-4">
                <button type="button" onClick={() => file.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#5865F2]" aria-label="Change avatar">
                  {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">{(form.name || form.username || '?')[0]?.toUpperCase()}</span>}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                  </span>
                </button>
                <div>
                  <button type="button" onClick={() => file.current?.click()} disabled={uploading} className="rounded bg-[#5865F2] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60">
                    {uploading ? 'Uploading…' : 'Change avatar'}
                  </button>
                  <p className="mt-1 text-xs text-[#949BA4]">JPG, PNG or GIF, up to 5 MB.</p>
                </div>
                <input ref={file} type="file" accept="image/*" hidden onChange={pickAvatar} />
              </div>
              <label className="mb-4 block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Display name</span>
                <input value={form.name} maxLength={32} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full rounded bg-[#1E1F22] px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#5865F2]" />
                <span className="mt-1 block text-xs text-[#949BA4]">What everyone sees in chat.</span>
              </label>
              <label className="mb-4 block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Username</span>
                <div className="mt-1.5 flex items-center rounded bg-[#1E1F22] px-3 focus-within:ring-1 focus-within:ring-[#5865F2]">
                  <span className="text-sm text-[#949BA4]">@</span>
                  <input value={form.username} maxLength={32} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className="w-full bg-transparent py-2 pl-0.5 text-sm text-white outline-none" />
                </div>
                {!usernameOk && <span className="mt-1 block text-xs text-[#F23F43]">2–32 characters: lowercase letters, numbers, _ or .</span>}
              </label>
              <label className="mb-4 block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">About me</span>
                <textarea value={form.bio} maxLength={190} rows={3} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="mt-1.5 w-full resize-none rounded bg-[#1E1F22] px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#5865F2]" />
                <span className="block text-right text-xs text-[#949BA4]">{form.bio.length}/190</span>
              </label>
              {error && <p className="mb-3 rounded bg-[#F23F43]/15 px-3 py-2 text-sm text-[#F5A3A5]">{error}</p>}
              <div className="flex items-center gap-3">
                <button type="button" onClick={saveProfile} disabled={!dirty || saving || uploading}
                  className="flex items-center gap-2 rounded bg-[#23A55A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A8B4B] disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                </button>
                {dirty && !saving && (
                  <button type="button" onClick={() => setForm({ name: user.displayName || user.username || '', username: user.username || '', bio: user.bio || '', avatarUrl: user.avatarUrl || '' })} className="text-sm text-[#B5BAC1] hover:underline">Reset</button>
                )}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="max-w-xl">
              <h2 className="mb-4 text-xl font-bold text-white">Notifications</h2>
              <Section title="Desktop (this browser)">
                <Row icon={Monitor} title="Desktop notifications"
                  desc={perm === 'unsupported' ? "This browser or device can't show desktop notifications from a web page."
                    : perm === 'denied' ? 'Blocked by your browser. Allow notifications for thehomies.app in the site settings (the lock icon by the address), then turn this on.'
                    : 'Pops up on your computer for mentions and DMs while Homies Chat is open in a tab (it can be minimized or in the background).'}>
                  <Toggle label="Desktop notifications" on={desk.enabled && perm === 'granted'} disabled={perm === 'unsupported' || perm === 'denied'} onChange={toggleDesktop} />
                </Row>
                {desk.enabled && perm === 'granted' && (
                  <>
                    <Row title="Mentions" desc="@you, @everyone / @here, and your roles.">
                      <Toggle label="Desktop mentions" on={desk.mentions} onChange={(v) => setDesk(setDesktopPrefs({ mentions: v }))} />
                    </Row>
                    <Row title="Direct messages">
                      <Toggle label="Desktop DMs" on={desk.dms} onChange={(v) => setDesk(setDesktopPrefs({ dms: v }))} />
                    </Row>
                    <div className="py-3">
                      <button type="button" onClick={() => desktopNotify('mentions', { title: 'Test notification', body: 'This is what a mention looks like.', force: true })}
                        className="rounded bg-[#4E5058] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6D6F78]">Send a test</button>
                    </div>
                  </>
                )}
              </Section>
              <Section title="Homies Chat">
                <Row icon={MessagesSquare} title="Mute the whole server" desc="No pings from any channel except when someone @s you directly.">
                  <Toggle label="Mute server" on={muted} disabled={muteBusy} onChange={setServerMuted} />
                </Row>
              </Section>
              <Section title="Phone (Homies app)">
                <Row icon={Smartphone} title="Mentions"><Toggle label="Push mentions" on={onOff(push.mentions)} onChange={(v) => setPref('push', 'mentions', v)} /></Row>
                <Row title="Direct messages"><Toggle label="Push DMs" on={onOff(push.dms)} onChange={(v) => setPref('push', 'dms', v)} /></Row>
                <Row title="Going live" desc="When the Homies go live."><Toggle label="Push live streams" on={onOff(push.liveStreams)} onChange={(v) => setPref('push', 'liveStreams', v)} /></Row>
              </Section>
              <Section title="Email">
                <Row icon={Mail} title="Direct messages" desc="Only when you haven't been on for a day."><Toggle label="Email DMs" on={onOff(email.dms)} onChange={(v) => setPref('email', 'dms', v)} /></Row>
                <Row title="Mentions"><Toggle label="Email mentions" on={onOff(email.mentions)} onChange={(v) => setPref('email', 'mentions', v)} /></Row>
              </Section>
              <Section title="Homies updates & offers">
                <Row icon={Megaphone} title="Email" desc="Member news, perks and the occasional deal."><Toggle label="Updates by email" on={onOff(mk.email)} onChange={(v) => setPref('marketing', 'email', v)} /></Row>
                <Row title="Discord DMs from The Homies Bot"><Toggle label="Updates on Discord" on={onOff(mk.discord)} onChange={(v) => setPref('marketing', 'discord', v)} /></Row>
                <Row title="Messages from @thehomies"><Toggle label="Updates in app" on={onOff(mk.dm)} onChange={(v) => setPref('marketing', 'dm', v)} /></Row>
                <Row title="Push"><Toggle label="Updates by push" on={onOff(mk.push)} onChange={(v) => setPref('marketing', 'push', v)} /></Row>
              </Section>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="max-w-xl">
              <h2 className="mb-4 text-xl font-bold text-white">Privacy & Data</h2>
              <Section title="Privacy">
                <Row icon={Globe} title="Discoverable posts" desc="Good posts in public channels can become Homies posts anyone can find. You can still choose per message.">
                  <Toggle label="Discoverable posts" on={state.me?.chatDiscoverable !== false} onChange={(v) => onToggleDiscoverable?.(v)} />
                </Row>
              </Section>
              <Section title="Your messages">
                {activeChannel?.name && (
                  <Row icon={Trash2} title={`Delete my messages in #${activeChannel.name}`}>
                    <button type="button" onClick={() => onDeleteHistory?.(activeChannel.id, activeChannel.name)} className="rounded bg-[#DA373C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A12828]">Delete</button>
                  </Row>
                )}
                <Row icon={Trash2} title="Delete all my chat messages" desc="Every message you've sent in Homies Chat. Can't be undone.">
                  <button type="button" onClick={() => onDeleteHistory?.(null)} className="rounded bg-[#DA373C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A12828]">Delete all</button>
                </Row>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
