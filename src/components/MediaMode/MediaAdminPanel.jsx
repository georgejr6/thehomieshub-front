import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Plus, Pencil, Trash2, GripVertical, Loader2,
  Film, ImagePlus, ChevronDown, ChevronUp, Check,
  Camera, Video, FolderOpen, Tag,
} from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';

// ── Backdrop Editor (matches DIGITVL pattern) ─────────────────────────────────
const fmt = (s) => { const t = Math.floor(s); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; };

const BackdropEditor = ({ images, muxPlaybackId, onChange }) => {
  const { toast } = useToast();
  const [showPlayer, setShowPlayer] = useState(false);
  const [liveTime, setLiveTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const fileRef = useRef();
  const throttleRef = useRef(0);

  const handleDragEnd = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      const arr = [...images];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(dropIndex, 0, moved);
      onChange(arr);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleTimeUpdate = (e) => {
    const now = Date.now();
    if (now - throttleRef.current < 250) return;
    throttleRef.current = now;
    setLiveTime(e.target.currentTime || 0);
  };

  const captureFrame = () => {
    if (!muxPlaybackId) return;
    const t = Math.round(liveTime);
    const url = `https://image.mux.com/${muxPlaybackId}/thumbnail.png?time=${t}&width=1920`;
    if (images.includes(url)) { toast({ title: 'Frame already added' }); return; }
    onChange([...images, url]);
    toast({ title: `Frame at ${fmt(t)} added` });
  };

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'backdrops');
      const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data?.result?.url || data?.url;
      if (url) onChange([...images, url]);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const liveThumbUrl = muxPlaybackId
    ? `https://image.mux.com/${muxPlaybackId}/thumbnail.png?time=${Math.round(liveTime)}&width=320`
    : null;

  return (
    <div className="space-y-4 pt-1">
      <div>
        <Label className="text-sm text-gray-300 font-medium">Backdrop Slideshow</Label>
        <p className="text-xs text-gray-500 mt-0.5">Frames cycling as the hero background. Leave empty to auto-generate from video.</p>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2" onDragOver={e => e.preventDefault()}>
          {images.map((url, i) => (
            <div key={url + i} draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnter={() => setDropIndex(i)}
              onDragEnd={handleDragEnd}
              className={`relative group w-32 h-[72px] rounded-lg overflow-hidden border flex-shrink-0 cursor-grab
                ${dragIndex === i ? 'opacity-40 scale-95 border-[#555]' : dropIndex === i && dragIndex !== i ? 'border-blue-500 scale-105' : 'border-[#333]'}`}>
              <img src={url} alt={`Frame ${i+1}`} className="w-full h-full object-cover pointer-events-none" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              <button type="button" onMouseDown={e => e.stopPropagation()}
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/80 z-10">
                <X className="w-3 h-3 text-white" />
              </button>
              <span className="absolute bottom-1 left-1.5 text-white text-[10px] font-medium bg-black/60 px-1 rounded">{i+1}</span>
            </div>
          ))}
        </div>
      )}

      {muxPlaybackId && (
        <div className="rounded-lg border border-[#222] overflow-hidden">
          <button type="button" onClick={() => setShowPlayer(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#111] hover:bg-[#161616] transition-colors">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Video className="w-3.5 h-3.5" /> Scrub video to pick frames
            </div>
            {showPlayer ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          {showPlayer && (
            <div className="bg-[#0a0a0a] p-3 space-y-3">
              <div className="rounded-lg overflow-hidden border border-[#222]">
                <MuxPlayer playbackId={muxPlaybackId} streamType="on-demand" onTimeUpdate={handleTimeUpdate}
                  style={{ width: '100%', aspectRatio: '16/9', display: 'block' }} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-[54px] rounded-md overflow-hidden border border-[#333] flex-shrink-0 bg-[#111]">
                  {liveThumbUrl && <img src={liveThumbUrl} alt="current frame" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium tabular-nums">{fmt(liveTime)}</p>
                  <p className="text-gray-600 text-[10px]">current position</p>
                </div>
                <Button type="button" onClick={captureFrame}
                  className="bg-blue-500 hover:bg-blue-400 text-black text-xs font-semibold h-8 px-3 flex-shrink-0">
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> Add frame
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files[0]) uploadImage(e.target.files[0]); }} />
        <Button type="button" onClick={() => fileRef.current.click()} disabled={uploading}
          className="bg-[#272727] hover:bg-[#333] text-white border border-[#333] text-xs h-8 px-3">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
          Upload custom image
        </Button>
      </div>
    </div>
  );
};

// ── Edit Video Modal ──────────────────────────────────────────────────────────
const EditVideoModal = ({ item, categories, onClose, onSaved }) => {
  const { toast } = useToast();
  const thumbInputRef = useRef();
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnailUrl || '');
  const [backdropImages, setBackdropImages] = useState(item.backdropImages || []);
  const [selectedCatIds, setSelectedCatIds] = useState(() => {
    // Find which categories contain this item
    return categories
      .filter(c => c.items.some(i => i.itemId === String(item._id || item.id)))
      .map(c => String(c._id));
  });
  const [thumbLoading, setThumbLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleThumbnailFile = async (file) => {
    setThumbLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'thumbnails');
      const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data?.result?.url || data?.url;
      if (url) setThumbnailUrl(url);
    } catch (err) {
      toast({ title: 'Thumbnail upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setThumbLoading(false);
    }
  };

  const toggleCategory = (catId) => {
    setSelectedCatIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemId = String(item._id || item.id);
      const itemType = item._collectionType || 'video';

      // 1. Update video metadata
      await api.patch(`/admin/videos/${itemId}`, {
        title,
        description,
        thumbnailUrl,
        backdropImages,
        _collectionType: itemType,
      });

      // 2. Update category memberships
      // For each category: add or remove this item
      const allCatIds = categories.map(c => String(c._id));
      await Promise.all(
        allCatIds.map(async (catId) => {
          const cat = categories.find(c => String(c._id) === catId);
          if (!cat) return;
          const isIn = cat.items.some(i => i.itemId === itemId);
          const shouldBeIn = selectedCatIds.includes(catId);
          if (isIn === shouldBeIn) return; // no change

          const newItems = shouldBeIn
            ? [...cat.items, { itemId, itemType }]
            : cat.items.filter(i => i.itemId !== itemId);

          await api.patch(`/admin/media-categories/${catId}`, { items: newItems });
        })
      );

      toast({ title: 'Saved' });
      onSaved();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-lg">Edit video</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              className="bg-[#1a1a1a] border-[#333] text-white h-11 focus:border-blue-500" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Description</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full rounded-md bg-[#1a1a1a] border border-[#333] text-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500" />
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300 font-medium">Thumbnail</Label>
            <div className="flex gap-3 items-start">
              {thumbnailUrl ? (
                <div className="relative group w-48 h-28 rounded-lg overflow-hidden border border-[#333] flex-shrink-0">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => thumbInputRef.current.click()} className="text-white text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Change</button>
                    <button onClick={() => setThumbnailUrl('')} className="text-white"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => thumbInputRef.current.click()}
                  className="w-48 h-28 rounded-lg border-2 border-dashed border-[#333] hover:border-[#555] flex flex-col items-center justify-center gap-2 cursor-pointer flex-shrink-0">
                  {thumbLoading
                    ? <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                    : <><ImagePlus className="w-7 h-7 text-gray-500" /><span className="text-xs text-gray-500">Upload thumbnail</span></>}
                </button>
              )}
              <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files[0]) handleThumbnailFile(e.target.files[0]); }} />
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-300 font-medium flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Categories
              </Label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const active = selectedCatIds.includes(String(cat._id));
                  return (
                    <button key={cat._id} type="button" onClick={() => toggleCategory(String(cat._id))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${active ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-[#1a1a1a] text-gray-400 border-[#333] hover:border-[#555]'}`}>
                      {active && <Check className="w-3 h-3" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Backdrop Editor */}
          <div className="border-t border-[#1e1e1e] pt-5">
            <BackdropEditor images={backdropImages} muxPlaybackId={item.muxPlaybackId} onChange={setBackdropImages} />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1e1e1e]">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-500 hover:bg-blue-400 text-black font-semibold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Library Tab ───────────────────────────────────────────────────────────────
const LibraryTab = ({ categories, onCategoriesChange }) => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/media-library')
      .then(({ data }) => setItems(data?.result?.items || []))
      .catch(() => toast({ title: 'Failed to load library', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const filtered = q.trim()
    ? items.filter(v => (v.title || '').toLowerCase().includes(q.toLowerCase()))
    : items;

  const handleSaved = () => {
    setEditing(null);
    load();
    onCategoriesChange(); // refresh categories in context
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );

  return (
    <>
      {editing && <EditVideoModal item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={handleSaved} />}

      <div className="mb-4">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search videos…"
          className="bg-[#1a1a1a] border-[#333] text-white h-9 text-sm focus:border-blue-500 max-w-xs" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Film className="w-12 h-12 mb-3" /><p>No videos found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={String(item._id || item.id)} className="flex items-center gap-3 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#2a2a2a] p-3 transition-colors">
              {item.thumbnailUrl
                ? <img src={item.thumbnailUrl} alt={item.title} className="w-20 h-12 object-cover rounded-lg flex-shrink-0" />
                : <div className="w-20 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0"><Film className="w-5 h-5 text-gray-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{item.title || 'Untitled'}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{item._collectionType}</span>
                  {item.muxPlaybackId && <span className="text-xs text-gray-600 font-mono">✓ Mux</span>}
                  {categories
                    .filter(c => c.items.some(i => i.itemId === String(item._id || item.id)))
                    .map(c => (
                      <span key={c._id} className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{c.name}</span>
                    ))}
                </div>
              </div>
              <button onClick={() => setEditing(item)} title="Edit"
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ── Categories Tab ────────────────────────────────────────────────────────────
const CategoriesTab = ({ categories, onCategoriesChange }) => {
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const createCategory = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/admin/media-categories', { name: newName.trim() });
      setNewName('');
      onCategoriesChange();
      toast({ title: 'Category created' });
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat) => { setEditingId(String(cat._id)); setEditName(cat.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };

  const saveEdit = async (catId) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/admin/media-categories/${catId}`, { name: editName.trim() });
      onCategoriesChange();
      cancelEdit();
      toast({ title: 'Category renamed' });
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? Videos won't be deleted.`)) return;
    try {
      await api.delete(`/admin/media-categories/${cat._id}`);
      onCategoriesChange();
      toast({ title: 'Category deleted' });
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Create new */}
      <div className="flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createCategory(); }}
          placeholder="New category name…"
          className="bg-[#1a1a1a] border-[#333] text-white h-9 text-sm focus:border-blue-500 flex-1" />
        <Button onClick={createCategory} disabled={creating || !newName.trim()}
          className="bg-blue-500 hover:bg-blue-400 text-black font-semibold h-9 px-4 flex-shrink-0">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <FolderOpen className="w-12 h-12 mb-3" />
          <p>No categories yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={String(cat._id)} className="flex items-center gap-3 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] p-3">
              <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {editingId === String(cat._id) ? (
                  <div className="flex gap-2 items-center">
                    <Input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat._id); if (e.key === 'Escape') cancelEdit(); }}
                      className="bg-[#1a1a1a] border-[#333] text-white h-8 text-sm focus:border-blue-500 flex-1" autoFocus />
                    <Button onClick={() => saveEdit(cat._id)} disabled={saving} className="h-8 px-3 bg-blue-500 hover:bg-blue-400 text-black text-xs font-semibold">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button onClick={cancelEdit} variant="ghost" className="h-8 px-2 text-gray-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-medium text-sm">{cat.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{cat.items?.length || 0} item{cat.items?.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
              {editingId !== String(cat._id) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(cat)} title="Rename"
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCategory(cat)} title="Delete"
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Admin Panel ──────────────────────────────────────────────────────────
const MediaAdminPanel = ({ onClose, onCategoriesChange }) => {
  const [categories, setCategories] = useState([]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/media-categories');
      setCategories(data?.result?.categories || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleCategoriesChange = useCallback(async () => {
    await loadCategories();
    onCategoriesChange?.();
  }, [loadCategories, onCategoriesChange]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="bg-black border border-[#222] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] flex-shrink-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Film className="w-5 h-5 text-red-500" /> Media Manager
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="library" className="h-full">
            <TabsList className="bg-[#0f0f0f] border-b border-[#1e1e1e] w-full rounded-none px-6 h-auto py-2 gap-1 flex-shrink-0">
              <TabsTrigger value="library" className="data-[state=active]:bg-[#272727] data-[state=active]:text-white text-gray-400 rounded-lg">
                <Film className="w-4 h-4 mr-1.5" />Library
              </TabsTrigger>
              <TabsTrigger value="categories" className="data-[state=active]:bg-[#272727] data-[state=active]:text-white text-gray-400 rounded-lg">
                <Tag className="w-4 h-4 mr-1.5" />Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="px-6 py-5 focus:outline-none">
              <LibraryTab categories={categories} onCategoriesChange={handleCategoriesChange} />
            </TabsContent>
            <TabsContent value="categories" className="px-6 py-5 focus:outline-none">
              <CategoriesTab categories={categories} onCategoriesChange={handleCategoriesChange} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MediaAdminPanel;
