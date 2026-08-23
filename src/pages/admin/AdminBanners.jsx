import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Loader2, Eye, EyeOff, Radio, Sparkles, Info, CheckCircle2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';
import { formatDistanceToNow } from 'date-fns';

const STYLES = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-blue-400' },
  { value: 'success', label: 'Success', icon: CheckCircle2, color: 'text-emerald-400' },
  { value: 'warning', label: 'Warning', icon: TriangleAlert, color: 'text-amber-400' },
  { value: 'live', label: 'Live', icon: Radio, color: 'text-red-400' },
  { value: 'promo', label: 'Promo', icon: Sparkles, color: 'text-indigo-400' },
];

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'free', label: 'Free users only' },
  { value: 'paid', label: 'Paid members only' },
];

function styleMeta(style) {
  return STYLES.find((s) => s.value === style) || STYLES[0];
}

function BannerRow({ banner, onToggleActive, onDelete, busy }) {
  const meta = styleMeta(banner.style);
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={`mt-0.5 p-1.5 rounded-full bg-white/5 ${meta.color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate">{banner.title}</p>
          <Badge variant="secondary" className="text-[10px] capitalize">{banner.style}</Badge>
          <Badge variant="outline" className="text-[10px] capitalize">{banner.audience}</Badge>
          {!banner.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Paused</Badge>}
        </div>
        {banner.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{banner.body}</p>}
        {banner.ctaLabel && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            CTA: {banner.ctaLabel} → {banner.ctaUrl}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          Created {formatDistanceToNow(new Date(banner.createdAt), { addSuffix: true })}
          {banner.startAt ? ` · starts ${new Date(banner.startAt).toLocaleDateString()}` : ''}
          {banner.endAt ? ` · ends ${new Date(banner.endAt).toLocaleDateString()}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onToggleActive(banner)}
          title={banner.isActive ? 'Pause' : 'Activate'}
        >
          {banner.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onDelete(banner)}
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </Button>
      </div>
    </div>
  );
}

const AdminBanners = () => {
  const { toast } = useToast();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [style, setStyle] = useState('info');
  const [audience, setAudience] = useState('all');
  const [endAt, setEndAt] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/admin/banners');
      setBanners(res.data?.result?.banners || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const activeBanner = banners.find((b) => b.isActive);

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      // Only one banner shows in the app at a time (most-recently-created
      // active one) -- pausing the current one first avoids the confusing
      // "I made a new banner but the old one still shows" report.
      if (activeBanner) {
        await api.patch(`/admin/banners/${activeBanner._id}`, { isActive: false }).catch(() => {});
      }
      await api.post('/admin/banners', {
        title: title.trim(),
        body: body.trim() || undefined,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        style,
        audience,
        endAt: endAt || undefined,
      });
      toast({ title: 'Banner created', description: 'It will show at the top of the feed now.' });
      setTitle(''); setBody(''); setCtaLabel(''); setCtaUrl(''); setStyle('info'); setAudience('all'); setEndAt('');
      loadData();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (banner) => {
    setBusyId(banner._id);
    try {
      await api.patch(`/admin/banners/${banner._id}`, { isActive: !banner.isActive });
      loadData();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (banner) => {
    if (!window.confirm(`Delete "${banner.title}"? This can't be undone.`)) return;
    setBusyId(banner._id);
    try {
      await api.delete(`/admin/banners/${banner._id}`);
      loadData();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const meta = styleMeta(style);
  const PreviewIcon = meta.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Announcement Banner
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Shows at the top of every user's feed, above the stories row. Only one banner is live at a time — creating a new one pauses whichever is currently active.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Banner</CardTitle>
          <CardDescription>Livestream alerts, feature announcements, promos — anything you want every user (or a segment) to see the moment they open the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Style</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Audience</label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 🔴 Going live in 10 minutes" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Body (optional)</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="A sentence or two of detail." rows={2} maxLength={300} className="resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Button label (optional)</label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. Watch now" maxLength={40} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Button link (optional)</label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https:// or thehomieshubmobile://..." />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Auto-expire (optional)</label>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="max-w-xs" />
            <p className="text-[10px] text-muted-foreground mt-1">Leave blank to keep showing until you pause or delete it.</p>
          </div>

          {(title || body) && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
              <div className="flex items-start gap-2.5">
                <PreviewIcon className={`w-4 h-4 mt-0.5 ${meta.color}`} />
                <div>
                  <p className="text-sm font-bold">{title || 'Banner title'}</p>
                  {body && <p className="text-xs text-muted-foreground">{body}</p>}
                  {ctaLabel && <p className="text-xs font-bold text-primary mt-1">{ctaLabel} →</p>}
                </div>
              </div>
            </div>
          )}

          <Button onClick={create} disabled={!title.trim() || creating} className="w-full">
            {creating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
              : <><Plus className="w-4 h-4 mr-2" /> Create & Go Live</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">All Banners</CardTitle>
            <CardDescription className="mt-0.5">{banners.length} total.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No banners yet.</p>
          ) : (
            banners.map((b) => (
              <BannerRow key={b._id} banner={b} onToggleActive={toggleActive} onDelete={remove} busy={busyId === b._id} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBanners;
