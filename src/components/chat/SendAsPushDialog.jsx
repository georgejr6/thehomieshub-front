import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, BellRing } from 'lucide-react';
import { Shell, inputCls, labelCls } from './CreateDialogs';
import {
  AUDIENCES, TITLE_MAX, BODY_MAX, emptyCampaignForm, buildAudience, buildCampaignPayload, validateCampaign,
  DAYS_MAX, useRecipientCount, draftFromChat, createCampaign, isApiMissing, isNotFound,
} from '@/lib/pushCampaigns';

// Admins: "Send as push" from a chat message's menu. The server drafts the
// notification from the message (GET /admin/push/from-chat/:id/draft); the
// admin edits it, picks who gets it (live count), confirms, and it goes out
// as an announcement campaign linked to the message (sourceMessageId).

const UNAVAILABLE = "Push campaigns aren't available on the server yet.";

export default function SendAsPushDialog({ message, onClose, onDone }) {
  const [form, setForm] = useState(() => ({ ...emptyCampaignForm(), category: 'announcement' }));
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [step, setStep] = useState('edit'); // 'edit' | 'confirm'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    let live = true;
    draftFromChat(message.id)
      .then((d) => { if (live) set({ title: d.title.slice(0, TITLE_MAX), body: d.body.slice(0, BODY_MAX), url: d.url }); })
      .catch((e) => {
        if (!live) return;
        // No draft endpoint: start from the message text so it's still usable.
        const who = message.author?.displayName || message.author?.username || 'The Homies';
        set({ title: who.slice(0, TITLE_MAX), body: String(message.content || '').slice(0, BODY_MAX) });
        if (isApiMissing(e)) setErr(UNAVAILABLE);
        else if (isNotFound(e)) setErr('That message is gone or held for review — you can still send the text below.');
      })
      .finally(() => { if (live) setLoadingDraft(false); });
    return () => { live = false; };
  }, [message.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const audience = useMemo(() => buildAudience(form), [form.audienceType, form.days, form.usernames]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = useRecipientCount(audience, 'announcement');
  const def = AUDIENCES.find((a) => a.id === form.audienceType);
  const problem = validateCampaign({ ...form, when: 'now' });

  const send = async () => {
    setBusy(true);
    setErr('');
    try {
      await createCampaign(buildCampaignPayload({ ...form, category: 'announcement', when: 'now' }, { sourceMessageId: message.id }));
      onDone?.(`Push sent${count.status === 'ready' && count.count != null ? ` to ${count.count.toLocaleString()} ${count.count === 1 ? 'person' : 'people'}` : ''}.`);
      onClose();
    } catch (e) {
      setErr(isApiMissing(e) ? UNAVAILABLE : e.response?.data?.message || "Couldn't send the push.");
      setBusy(false);
      setStep('edit');
    }
  };

  const countText = count.status === 'loading' ? 'Counting…'
    : count.status === 'ready' && count.count != null ? `${count.count.toLocaleString()} ${count.count === 1 ? 'person' : 'people'} will get this`
    : count.status === 'unavailable' ? 'Recipient count unavailable'
    : count.status === 'error' ? "Couldn't count recipients" : '';

  return (
    <Shell
      title={step === 'confirm' ? 'Send this push?' : 'Send as push'}
      onClose={busy ? () => {} : onClose}
      footer={step === 'confirm' ? <>
        <button onClick={() => setStep('edit')} disabled={busy} className="px-4 py-2 text-sm text-white hover:underline disabled:opacity-50">Back</button>
        <button onClick={send} disabled={busy} className="flex items-center gap-2 rounded bg-[#5865F2] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send now
        </button>
      </> : <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-white hover:underline">Cancel</button>
        <button onClick={() => { setErr(''); setStep('confirm'); }} disabled={loadingDraft || !!problem} title={problem || undefined}
          className="flex items-center gap-2 rounded bg-[#5865F2] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50">
          Review
        </button>
      </>}
    >
      {loadingDraft ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" /></div>
      ) : step === 'confirm' ? (
        <div className="pt-2">
          <div className="flex items-start gap-3 rounded-lg bg-[#2B2D31] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white"><BellRing className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold text-white">{form.title}</div>
              <div className="break-words text-sm text-[#B5BAC1]">{form.body}</div>
              {form.url.trim() && <div className="mt-1 truncate text-xs text-[#00A8FC]">{form.url.trim()}</div>}
            </div>
          </div>
          <p className="mt-4 text-sm text-[#DBDEE1]">
            Announcement to <span className="font-semibold text-white">{def?.label}</span>
            {def?.days ? ` (${audience.days} days)` : ''}
            {def?.usernames ? `: ${audience.usernames.map((u) => `@${u}`).join(', ')}` : ''}.
          </p>
          <p className="mt-1 text-sm text-[#B5BAC1]">{countText || 'Recipient count unavailable'}. This sends right away and can't be undone.</p>
          {err && <p className="mt-3 text-sm text-[#F23F43]">{err}</p>}
        </div>
      ) : (
        <>
          <label className={labelCls}>Title</label>
          <input maxLength={TITLE_MAX} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Notification title" className={inputCls} />
          <label className={labelCls}>Message</label>
          <textarea rows={3} maxLength={BODY_MAX} value={form.body} onChange={(e) => set({ body: e.target.value })} placeholder="What should the notification say?" className={`${inputCls} resize-none`} />
          <div className="mt-1 text-right text-xs text-[#949BA4]">{form.body.length}/{BODY_MAX}</div>
          <label className={labelCls}>Link (optional)</label>
          <input value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="Where tapping it goes" className={inputCls} />
          <label className={labelCls}>Audience</label>
          <select value={form.audienceType} onChange={(e) => set({ audienceType: e.target.value })} className={inputCls}>
            {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          {def?.days && (
            <input type="number" min={1} max={DAYS_MAX} value={form.days} onChange={(e) => set({ days: e.target.value })} aria-label="Days" className={`${inputCls} mt-2`} />
          )}
          {def?.usernames && (
            <input value={form.usernames} onChange={(e) => set({ usernames: e.target.value })} placeholder="@username1, @username2" aria-label="Usernames" className={`${inputCls} mt-2`} />
          )}
          <p className="mt-2 text-xs text-[#949BA4]">{countText}</p>
          {err && <p className="mt-3 text-sm text-[#F23F43]">{err}</p>}
        </>
      )}
    </Shell>
  );
}
