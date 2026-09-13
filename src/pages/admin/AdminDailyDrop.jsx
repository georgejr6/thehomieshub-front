import React, { useState, useEffect } from 'react';
import { ListOrdered, Loader2, Play, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ClipRow({ reel, onMove, onSave, onUnpin, busy, isFirst, isLast }) {
  const [previewSeconds, setPreviewSeconds] = useState(reel.previewSeconds ?? '');
  const dirty = String(previewSeconds) !== String(reel.previewSeconds ?? '');

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <Button variant="outline" size="icon" className="h-6 w-6" disabled={busy || isFirst} onClick={() => onMove(reel, -1)}>
          <ArrowUp className="w-3 h-3" />
        </Button>
        <span className="text-xs font-bold text-muted-foreground w-5 text-center">{reel.dropRank}</span>
        <Button variant="outline" size="icon" className="h-6 w-6" disabled={busy || isLast} onClick={() => onMove(reel, 1)}>
          <ArrowDown className="w-3 h-3" />
        </Button>
      </div>

      {reel.thumbnailUrl && (
        <img src={reel.thumbnailUrl} alt="" className="w-12 h-20 object-cover rounded-md shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{reel.title || reel.caption || '(untitled clip)'}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {reel.sourceStream?.videoId?.title && (
            <Badge variant="outline" className="text-[10px]">→ {reel.sourceStream.videoId.title}</Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{reel.creator?.username ? `@${reel.creator.username}` : 'unknown'}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Preview (s)</label>
          <Input
            type="number"
            min={1}
            className="w-16 h-8 text-sm"
            value={previewSeconds}
            onChange={(e) => setPreviewSeconds(e.target.value)}
          />
        </div>
        <Button size="sm" disabled={busy || !dirty} onClick={() => onSave(reel, { previewSeconds: Number(previewSeconds) || undefined })}>
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onUnpin(reel)} title="Remove from today's drop">
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

const AdminDailyDrop = () => {
  const { toast } = useToast();
  const [date, setDate] = useState(todayStr());
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadData = async (d = date) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/daily-drop', { params: { date: d } });
      setReels(res.data?.result?.reels || []);
    } catch (err) {
      toast({ title: 'Failed to load', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchReel = async (reel, patch) => {
    setBusyId(reel._id);
    try {
      await api.patch(`/admin/videos/${reel._id}`, { _collectionType: 'reel', ...patch });
      await loadData();
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const move = async (reel, dir) => {
    const idx = reels.findIndex(r => r._id === reel._id);
    const swapWith = reels[idx + dir];
    if (!swapWith) return;
    setBusyId(reel._id);
    try {
      await Promise.all([
        api.patch(`/admin/videos/${reel._id}`, { _collectionType: 'reel', dropRank: swapWith.dropRank }),
        api.patch(`/admin/videos/${swapWith._id}`, { _collectionType: 'reel', dropRank: reel.dropRank }),
      ]);
      await loadData();
    } catch (err) {
      toast({ title: 'Failed to reorder', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const unpin = async (reel) => {
    if (!window.confirm(`Remove "${reel.title || 'this clip'}" from today's drop? It stays in the app, just not pinned.`)) return;
    await patchReel(reel, { isDailyDrop: false });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListOrdered className="w-6 h-6 text-primary" /> Daily Clip Drop
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The clips pinned to the top of the feed for a given day, in order. Uploaded via the batch clip pipeline —
          this panel is for reordering, tweaking each clip's preview length, or unpinning one after the fact.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Clips for</CardTitle>
            <CardDescription className="mt-0.5">{reels.length} pinned clip{reels.length === 1 ? '' : 's'}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
            <Button variant="outline" size="sm" onClick={() => loadData()}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No clips pinned for this day yet — run the batch upload from the clip pipeline first.
            </p>
          ) : (
            reels.map((r, i) => (
              <ClipRow
                key={r._id}
                reel={r}
                onMove={move}
                onSave={patchReel}
                onUnpin={unpin}
                busy={busyId === r._id}
                isFirst={i === 0}
                isLast={i === reels.length - 1}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDailyDrop;
