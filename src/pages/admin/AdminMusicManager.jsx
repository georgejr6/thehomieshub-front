import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Music, Plus, Trash2, Pencil, Check, X, Search,
  Play, Pause, Star, GripVertical, Save, DownloadCloud, BarChart3,
  ListMusic, Headphones, Users, Clock, User as UserIcon, Globe, ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const fmtDur = (s) => {
  const t = Math.floor(s || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
// ms → "1h 4m" / "3m 12s" / "45s"
const fmtMs = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// Small inline audio preview button shared by search results + track rows.
function PreviewButton({ url, id, playingId, setPlayingId, audioRef }) {
  const isPlaying = playingId === id;
  const toggle = () => {
    if (!url) return;
    const el = audioRef.current;
    if (isPlaying) { el.pause(); setPlayingId(null); return; }
    el.src = url;
    el.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null));
  };
  return (
    <button
      onClick={toggle}
      disabled={!url}
      className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-30 flex-shrink-0"
      title={url ? 'Preview' : 'No audio'}
    >
      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
    </button>
  );
}

function Cover({ image, className = 'w-10 h-10' }) {
  if (image) {
    return <img src={image} alt="" className={`${className} rounded object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${className} rounded bg-muted flex items-center justify-center flex-shrink-0`}>
      <Music className="w-1/2 h-1/2 text-muted-foreground" />
    </div>
  );
}

// ── WHO listened to one song ──────────────────────────────────────────────────
function SongListenersDialog({ song, isOpen, onOpenChange }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !song?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/track/music/song/${encodeURIComponent(song.id)}`, { params: { days: 90 } });
        if (!cancelled) setData(res.data?.result || null);
      } catch { if (!cancelled) toast({ title: 'Failed to load listeners', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isOpen, song?.id, toast]);

  const listeners = data?.listeners || [];
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="truncate">{song?.title || 'Song'}</DialogTitle>
          <DialogDescription>
            {data?.totals
              ? `${data.totals.plays} plays · ${fmtMs(data.totals.listenMs)} total listen · ${data.totals.playlistAdds} playlist add(s) · last 90 days`
              : 'Who listened, and for how long.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : listeners.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No listens recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {listeners.map((l, i) => (
                <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg border border-border bg-secondary/20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${l.authed ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {l.authed ? <UserIcon className="w-4 h-4 text-green-500" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{l.authed ? `@${l.username || 'member'}` : 'Anonymous'}</span>
                      {!l.authed && <span className="font-mono text-xs text-muted-foreground">{l.ip}</span>}
                      {l.addedToPlaylist ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">＋ playlist</span> : null}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Headphones className="w-3 h-3" /> {l.plays} play(s)</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtMs(l.listenMs)}</span>
                      <span>{fmtTime(l.lastPlayed)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Per-song listening leaderboard ────────────────────────────────────────────
function SongAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [songs, setSongs] = useState([]);
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const { data } = await api.get('/track/music/songs', { params: { days: d } });
      setSongs(data?.result?.songs || []);
    } catch { toast({ title: 'Failed to load song analytics', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(days); }, [days, load]);

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b">
        <p className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Listening — last {days} days</p>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${days === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-accent'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : songs.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 text-sm">No plays recorded in this window yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2.5 px-4">#</th>
                <th className="text-left font-semibold py-2.5 px-2">Song</th>
                <th className="text-right font-semibold py-2.5 px-3">Plays</th>
                <th className="text-right font-semibold py-2.5 px-3">Listeners</th>
                <th className="text-right font-semibold py-2.5 px-3">Total time</th>
                <th className="text-right font-semibold py-2.5 px-3">Avg</th>
                <th className="text-right font-semibold py-2.5 px-4">＋Playlist</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s, i) => (
                <tr key={s._id} onClick={() => { setTarget({ id: s._id, title: s.title }); setOpen(true); }}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer">
                  <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 px-2 font-medium max-w-[260px] truncate">{s.title || <span className="text-muted-foreground font-mono text-xs">{s._id}</span>}</td>
                  <td className="py-2.5 px-3 text-right">{s.plays}</td>
                  <td className="py-2.5 px-3 text-right">
                    {s.listeners}{s.members > 0 && <span className="text-muted-foreground text-xs"> ({s.members} member)</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtMs(s.listenMs)}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtMs(s.avgListenMs)}</td>
                  <td className="py-2.5 px-4 text-right">{s.playlistAdds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SongListenersDialog song={target} isOpen={open} onOpenChange={(o) => { setOpen(o); if (!o) setTarget(null); }} />
    </div>
  );
}

// ── Songs bought / licensed ───────────────────────────────────────────────────
function SongSales() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ licenses: [], byTrack: [], totals: { count: 0, revenueCents: 0 } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/music/licenses');
        if (!cancelled) setData(res.data?.result || { licenses: [], byTrack: [], totals: { count: 0, revenueCents: 0 } });
      } catch { if (!cancelled) toast({ title: 'Failed to load sales', variant: 'destructive' }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const money = (c) => `$${((c || 0) / 100).toFixed(2)}`;
  const { licenses, byTrack, totals } = data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total revenue</p>
          <p className="text-2xl font-bold mt-1">{money(totals.revenueCents)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Licenses sold</p>
          <p className="text-2xl font-bold mt-1">{totals.count}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Songs sold</p>
          <p className="text-2xl font-bold mt-1">{byTrack.length}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <p className="text-sm font-semibold p-4 border-b flex items-center gap-2"><Headphones className="w-4 h-4 text-primary" /> Recent licenses</p>
        {loading ? (
          <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : licenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-14 text-sm">No songs bought or licensed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold py-2.5 px-4">Buyer</th>
                  <th className="text-left font-semibold py-2.5 px-2">Song</th>
                  <th className="text-left font-semibold py-2.5 px-3">License</th>
                  <th className="text-right font-semibold py-2.5 px-3">Amount</th>
                  <th className="text-left font-semibold py-2.5 px-3">DIGITVL</th>
                  <th className="text-right font-semibold py-2.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-4 font-medium">{l.buyer}{l.buyerEmail && <span className="block text-[11px] text-muted-foreground">{l.buyerEmail}</span>}</td>
                    <td className="py-2.5 px-2 max-w-[220px] truncate">{l.trackTitle || l.trackId}</td>
                    <td className="py-2.5 px-3">{l.tierLabel || l.licenseType}</td>
                    <td className="py-2.5 px-3 text-right">{money(l.amountCents)}</td>
                    <td className="py-2.5 px-3">{l.digitvlRecorded ? <Check className="w-4 h-4 text-green-500" /> : <span className="text-xs text-muted-foreground">pending</span>}</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground">{fmtTime(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminMusicManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Top-level view + full-library import
  const [view, setView] = useState('playlists'); // 'playlists' | 'analytics'
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState(null);

  // editor working copy
  const [editName, setEditName] = useState('');
  const [editTrending, setEditTrending] = useState(false);
  const [editTracks, setEditTracks] = useState([]);
  const [dirty, setDirty] = useState(false);

  // search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // shared audio element for previews
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const selected = categories.find((c) => c._id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/music-categories');
      setCategories(data?.result?.categories || []);
    } catch {
      toast({ title: 'Failed to load music categories', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Show the most recent import run (batch date + counts).
  const loadLastImport = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/music-imports');
      setLastImport((data?.result?.imports || [])[0] || null);
    } catch { /* non-critical */ }
  }, []);
  useEffect(() => { loadLastImport(); }, [loadLastImport]);

  // Sync the ENTIRE digitvl catalog into playlists (per-genre + Fresh Drops).
  const runImport = async () => {
    if (importing) return;
    if (!confirm('Import the entire DIGITVL library into the app?\n\nThis rebuilds the per-genre playlists + a "Fresh Drops" trending playlist from every track in the catalog (including ones without cover art). Existing playlists with the same names are overwritten.')) return;
    setImporting(true);
    try {
      const { data } = await api.post('/admin/music-categories/import-digitvl');
      const r = data?.result;
      toast({
        title: 'DIGITVL library imported',
        description: r ? `${r.total} tracks · ${r.withArt} with art · ${r.withoutArt} without · ${r.categories?.length || 0} playlists` : 'Done',
      });
      await Promise.all([load(), loadLastImport()]);
    } catch (e) {
      toast({ title: 'Import failed', description: e?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  // when selecting a category, hydrate the editor
  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name || '');
    setEditTrending(!!selected.isTrending);
    setEditTracks(selected.tracks || []);
    setDirty(false);
    setResults([]);
    setQuery('');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createCategory = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/admin/music-categories', { name: newName.trim() });
      const cat = data?.result?.category;
      setNewName('');
      await load();
      if (cat?._id) setSelectedId(cat._id);
      toast({ title: 'Playlist created' });
    } catch {
      toast({ title: 'Failed to create playlist', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deleteCategory = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? This removes the playlist (not the tracks).`)) return;
    try {
      await api.delete(`/admin/music-categories/${cat._id}`);
      if (selectedId === cat._id) setSelectedId(null);
      await load();
      toast({ title: 'Playlist deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const runSearch = async (e) => {
    e?.preventDefault?.();
    setSearching(true);
    try {
      const { data } = await api.get('/admin/music-search', { params: { q: query } });
      setResults(data?.result?.tracks || []);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const addTrack = (track) => {
    if (editTracks.some((t) => t.trackId === track.trackId)) return;
    setEditTracks((prev) => [...prev, track]);
    setDirty(true);
  };

  const removeTrack = (trackId) => {
    setEditTracks((prev) => prev.filter((t) => t.trackId !== trackId));
    setDirty(true);
  };

  const moveTrack = (idx, dir) => {
    setEditTracks((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const saveCategory = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/admin/music-categories/${selected._id}`, {
        name: editName.trim(),
        isTrending: editTrending,
        tracks: editTracks,
      });
      await load();
      setDirty(false);
      toast({ title: 'Saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Music className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Music Manager</h1>
            <p className="text-sm text-muted-foreground">
              Curate playlists from the digitvl catalog and see who's listening.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button onClick={runImport} disabled={importing} variant="secondary">
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
            {importing ? 'Importing…' : 'Import entire DIGITVL library'}
          </Button>
          {lastImport && (
            <p className="text-[11px] text-muted-foreground">
              Last import {lastImport.batch}: {lastImport.total} tracks ({lastImport.withoutArt} w/o art)
            </p>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'playlists', label: 'Playlists', icon: ListMusic },
          { key: 'analytics', label: 'Song Analytics', icon: BarChart3 },
          { key: 'sales', label: 'Sales / Licenses', icon: ShoppingCart },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              view === t.key ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border hover:bg-accent'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {view === 'analytics' ? (
        <SongAnalytics />
      ) : view === 'sales' ? (
        <SongSales />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Playlists list ── */}
        <div className="bg-card border rounded-xl p-4 h-fit">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="New playlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createCategory()}
            />
            <Button onClick={createCategory} disabled={creating || !newName.trim()} size="icon">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No playlists yet. Create one above.</p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  onClick={() => setSelectedId(cat._id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedId === cat._id ? 'bg-primary/15 text-primary' : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {cat.isTrending && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                    <span className="truncate font-medium">{cat.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{cat.tracks?.length || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Editor ── */}
        {!selected ? (
          <div className="bg-card border rounded-xl flex items-center justify-center text-muted-foreground min-h-[300px]">
            Select a playlist to edit, or create a new one.
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Input value={editName} onChange={(e) => { setEditName(e.target.value); setDirty(true); }} className="max-w-xs font-semibold" />
              <button
                onClick={() => { setEditTrending((v) => !v); setDirty(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  editTrending ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' : 'text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                <Star className={`w-4 h-4 ${editTrending ? 'fill-yellow-500' : ''}`} /> Trending
              </button>
              <div className="flex-1" />
              <Button onClick={saveCategory} disabled={saving || !dirty}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteCategory(selected)} title="Delete playlist">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>

            {/* tracks in this playlist */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Tracks ({editTracks.length})</h3>
              {editTracks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">No tracks yet — search below to add some.</p>
              ) : (
                <div className="space-y-1">
                  {editTracks.map((t, idx) => (
                    <div key={t.trackId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-accent group">
                      <div className="flex flex-col">
                        <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-xs leading-none">▲</button>
                        <button onClick={() => moveTrack(idx, 1)} disabled={idx === editTracks.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-xs leading-none">▼</button>
                      </div>
                      <PreviewButton url={t.audioUrl} id={`t-${t.trackId}`} playingId={playingId} setPlayingId={setPlayingId} audioRef={audioRef} />
                      <Cover image={t.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.artist}{t.duration ? ` · ${fmtDur(t.duration)}` : ''}</p>
                      </div>
                      <button onClick={() => removeTrack(t.trackId)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* search to add */}
            <div className="border-t pt-4">
              <form onSubmit={runSearch} className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search the digitvl catalog (title or artist)…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <Button type="submit" disabled={searching} variant="secondary">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </form>

              {results.length > 0 && (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {results.map((t) => {
                    const added = editTracks.some((x) => x.trackId === t.trackId);
                    return (
                      <div key={t.trackId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-accent">
                        <PreviewButton url={t.audioUrl} id={`s-${t.trackId}`} playingId={playingId} setPlayingId={setPlayingId} audioRef={audioRef} />
                        <Cover image={t.image} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.artist}{t.duration ? ` · ${fmtDur(t.duration)}` : ''}</p>
                        </div>
                        <Button size="sm" variant={added ? 'ghost' : 'secondary'} disabled={added} onClick={() => addTrack(t)}>
                          {added ? <Check className="w-4 h-4 text-green-500" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
