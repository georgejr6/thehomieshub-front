import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Music, Plus, Trash2, Pencil, Check, X, Search,
  Play, Pause, Star, GripVertical, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const fmtDur = (s) => {
  const t = Math.floor(s || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

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

export default function AdminMusicManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

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

      <div className="flex items-center gap-3 mb-6">
        <Music className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Music Manager</h1>
          <p className="text-sm text-muted-foreground">
            Curate playlists from the digitvl catalog for the app's Music tab. Mark one playlist as Trending to feature it on the home screen.
          </p>
        </div>
      </div>

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
    </div>
  );
}
