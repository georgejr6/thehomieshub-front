import React, { useMemo, useState } from 'react';
import { Bell, Send, Clock, Loader2, Users, Megaphone, CalendarClock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AUDIENCES, CATEGORIES, TITLE_MAX, BODY_MAX, DAYS_MAX, emptyCampaignForm, buildAudience, buildCampaignPayload,
  validateCampaign, useRecipientCount, audienceLabel, campaignCounts,
} from '@/lib/pushCampaigns';

// Admin → Push Notifications, campaign mode (backend /admin/push/campaigns).
// AdminPushNotifications.jsx falls back to the old broadcast/targeted forms
// when the server doesn't have campaigns yet (404).

const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5';
const selectCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const chipCls = (on) => cn('text-xs px-3 py-1.5 rounded-full border transition-colors font-medium', on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40 hover:bg-muted hover:border-primary/40');

const fmtWhen = (d) => { try { return d ? format(new Date(d), 'MMM d, yyyy h:mm a') : '—'; } catch { return '—'; } };

export function CampaignComposer({ templates = [], onCreate }) {
  const [form, setForm] = useState(emptyCampaignForm);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const audience = useMemo(() => buildAudience(form), [form.audienceType, form.days, form.usernames]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = useRecipientCount(audience, form.category);
  const def = AUDIENCES.find((a) => a.id === form.audienceType);
  const problem = validateCampaign(form);
  const scheduled = form.when === 'schedule';

  const countText = count.status === 'loading' ? 'Counting recipients…'
    : count.status === 'ready' && count.count != null ? `${count.count.toLocaleString()} ${count.count === 1 ? 'recipient' : 'recipients'}`
    : count.status === 'unavailable' ? 'Recipient count unavailable'
    : count.status === 'error' ? "Couldn't count recipients" : '';

  const submit = async () => {
    // Re-check at send time: a scheduled time can pass while the dialog is open.
    const late = validateCampaign(form);
    if (late) { setError(late); return; }
    setSending(true);
    setError('');
    try {
      await onCreate(buildCampaignPayload(form));
      setForm(emptyCampaignForm());
      setConfirming(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't create the campaign.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Campaign</CardTitle>
        <CardDescription>Pick who gets it, send now or schedule it. Only people with the app installed and notifications on receive pushes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button key={tpl.label} type="button" onClick={() => set({ title: tpl.title, body: tpl.body })} className={chipCls(false)}>{tpl.label}</button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="pc-title" className={labelCls}>Title</label>
            <Input id="pc-title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. 🔥 New Drop on The Homies Hub" maxLength={TITLE_MAX} />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.title.length}/{TITLE_MAX}</p>
          </div>
          <div>
            <label htmlFor="pc-body" className={labelCls}>Message</label>
            <Textarea id="pc-body" value={form.body} onChange={(e) => set({ body: e.target.value })} placeholder="What do you want to tell your users?" rows={3} maxLength={BODY_MAX} className="resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.body.length}/{BODY_MAX}</p>
          </div>
          <div>
            <label htmlFor="pc-url" className={labelCls}>Link (optional)</label>
            <Input id="pc-url" value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="e.g. https://thehomies.app/chat or /song/123" />
          </div>

          <div>
            <span className={labelCls}>Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" aria-pressed={form.category === c.id} onClick={() => set({ category: c.id })} className={chipCls(form.category === c.id)}>{c.label}</button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{CATEGORIES.find((c) => c.id === form.category)?.note}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pc-audience" className={labelCls}>Audience</label>
              <select id="pc-audience" value={form.audienceType} onChange={(e) => set({ audienceType: e.target.value })} className={selectCls}>
                {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            {def?.days && (
              <div>
                <label htmlFor="pc-days" className={labelCls}>Days</label>
                <Input id="pc-days" type="number" min={1} max={DAYS_MAX} value={form.days} onChange={(e) => set({ days: e.target.value })} />
              </div>
            )}
          </div>
          {def?.usernames && (
            <div>
              <label htmlFor="pc-usernames" className={labelCls}>Usernames</label>
              <Input id="pc-usernames" value={form.usernames} onChange={(e) => set({ usernames: e.target.value })} placeholder="@username1, @username2, @username3" />
              <p className="text-[10px] text-muted-foreground mt-1">Comma-separated. Include @ or leave it out, both work.</p>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-sm font-medium" data-testid="recipient-count">
            <Users className="w-4 h-4 text-muted-foreground" /> {countText || '—'}
          </p>

          <div>
            <span className={labelCls}>When</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={!scheduled} onClick={() => set({ when: 'now' })} className={chipCls(!scheduled)}>Send now</button>
              <button type="button" aria-pressed={scheduled} onClick={() => set({ when: 'schedule' })} className={chipCls(scheduled)}>Schedule</button>
              {scheduled && (
                <Input aria-label="Send at" type="datetime-local" value={form.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} className="w-auto" />
              )}
            </div>
          </div>
        </div>

        {(form.title || form.body) && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0"><Bell className="w-5 h-5 text-primary-foreground" /></div>
              <div>
                <p className="text-sm font-semibold">{form.title || 'Notification title'}</p>
                <p className="text-xs text-muted-foreground">{form.body || 'Notification body'}</p>
              </div>
            </div>
          </div>
        )}

        {problem && (form.title || form.body) && <p className="text-xs text-muted-foreground">{problem}</p>}
        <Button onClick={() => { setError(''); setConfirming(true); }} disabled={!!problem} className="w-full">
          {scheduled ? <><CalendarClock className="w-4 h-4 mr-2" /> Review & schedule</> : <><Send className="w-4 h-4 mr-2" /> Review & send</>}
        </Button>
      </CardContent>

      <Dialog open={confirming} onOpenChange={(o) => { if (!sending) setConfirming(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scheduled ? 'Schedule this push?' : 'Send this push now?'}</DialogTitle>
            <DialogDescription>
              {CATEGORIES.find((c) => c.id === form.category)?.label} to {audienceLabel(audience)}
              {count.status === 'ready' && count.count != null ? ` — ${count.count.toLocaleString()} ${count.count === 1 ? 'recipient' : 'recipients'}` : ''}
              {scheduled ? `, on ${fmtWhen(form.scheduledAt)}` : ''}.
              {form.category === 'promo' ? ' Promo only reaches people who opted in to marketing push.' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-sm font-semibold break-words">{form.title}</p>
            <p className="text-xs text-muted-foreground break-words">{form.body}</p>
            {form.url.trim() && <p className="text-xs text-primary mt-1 truncate">{form.url.trim()}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>Back</Button>
            <Button onClick={submit} disabled={sending}>
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working…</> : scheduled ? 'Schedule' : 'Send now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const STATUS_STYLE = {
  scheduled: 'bg-amber-500/10 text-amber-600',
  draft: 'bg-muted text-muted-foreground',
  sending: 'bg-blue-500/10 text-blue-500',
  sent: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-muted text-muted-foreground',
  canceled: 'bg-muted text-muted-foreground',
  failed: 'bg-red-500/10 text-red-500',
};

export function CampaignHistory({ campaigns, loading, onRefresh, onCancel }) {
  const [cancelling, setCancelling] = useState(null);
  const cancel = async (c) => {
    if (!window.confirm(`Cancel the push "${c.title}"?`)) return;
    setCancelling(c.id || c._id);
    try { await onCancel(c.id || c._id); } finally { setCancelling(null); }
  };
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Campaigns</CardTitle>
          <CardDescription className="mt-0.5">Sent and scheduled pushes.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>Refresh</Button>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Push</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const id = c.id || c._id;
                  const n = campaignCounts(c);
                  const status = String(c.status || '').toLowerCase();
                  return (
                    <TableRow key={id}>
                      <TableCell className="max-w-[16rem]">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {c.category === 'promo' ? <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-500" /> : <Bell className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                          {c.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{c.body}</p>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{audienceLabel(c.audience)}</TableCell>
                      <TableCell><Badge variant="secondary" className={cn('text-[10px] capitalize', STATUS_STYLE[status])}>{status || '—'}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{status === 'scheduled' || status === 'draft' ? '—' : n.recipients ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{n.sent ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{n.failed ?? '—'}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtWhen(status === 'scheduled' ? c.scheduledAt : c.finishedAt || c.startedAt || c.sentAt || c.scheduledAt || c.createdAt)}</TableCell>
                      <TableCell>
                        {(status === 'scheduled' || status === 'draft') && (
                          <Button variant="ghost" size="sm" onClick={() => cancel(c)} disabled={cancelling === id} className="text-destructive">
                            {cancelling === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><XCircle className="w-3.5 h-3.5 mr-1" /> Cancel</>}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
