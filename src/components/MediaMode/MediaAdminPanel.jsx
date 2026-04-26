import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Plus, Pencil, Trash2, GripVertical, Loader2, Check,
  Film, FolderOpen, Tag, Star, Eye, EyeOff,
  RefreshCw, RefreshCcw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';
import EditVideoModal from './EditVideoModal';

// ── Library Tab ───────────────────────────────────────────────────────────────
const LibraryTab = ({ categories, onCategoriesChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [syncingId, setSyncingId] = useState(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/media-library')
      .then(({ data }) => setItems(data?.result?.items || []))
      .catch(() => toast({ title: 'Failed to load library', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => {
    setEditing(null);
    load();
    onCategoriesChange();
  };

  const handleSyncMux = async (item) => {
    setSyncingId(String(item._id || item.id));
    try {
      const { data } = await api.post(`/admin/videos/${item._id || item.id}/sync-mux`, {
        _collectionType: item._collectionType,
      });
      const { muxPlaybackId } = data?.result || {};
      setItems(prev => prev.map(i =>
        String(i._id || i.id) === String(item._id || item.id)
          ? { ...i, muxPlaybackId: muxPlaybackId || i.muxPlaybackId }
          : i
      ));
      toast({ title: muxPlaybackId ? 'Mux synced — ready to play' : `Synced — status: ${data?.result?.assetStatus}` });
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleVisibility = async (item) => {
    const next = item.visibility === 'public' ? 'subscribers' : 'public';
    setItems(prev => prev.map(i => String(i._id || i.id) === String(item._id || item.id) ? { ...i, visibility: next } : i));
    try {
      await api.patch(`/admin/videos/${item._id || item.id}`, { visibility: next, _collectionType: item._collectionType });
      toast({ title: next === 'public' ? 'Set to public' : 'Set to subscribers only' });
    } catch {
      setItems(prev => prev.map(i => String(i._id || i.id) === String(item._id || item.id) ? { ...i, visibility: item.visibility } : i));
      toast({ title: 'Failed to update visibility', variant: 'destructive' });
    }
  };

  const handleToggleFeature = async (item) => {
    const next = !item.isFeatured;
    setItems(prev => prev.map(i =>
      String(i._id || i.id) === String(item._id || item.id)
        ? { ...i, isFeatured: next }
        : next ? { ...i, isFeatured: false } : i
    ));
    try {
      await api.patch(`/admin/videos/${item._id || item.id}`, { isFeatured: next, _collectionType: item._collectionType });
      toast({ title: next ? 'Set as featured' : 'Removed from featured' });
    } catch {
      setItems(prev => prev.map(i => String(i._id || i.id) === String(item._id || item.id) ? { ...i, isFeatured: item.isFeatured } : i));
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title || 'this video'}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/videos/${item._id || item.id}`, { params: { collectionType: item._collectionType } });
      setItems(prev => prev.filter(i => String(i._id || i.id) !== String(item._id || item.id)));
      toast({ title: 'Deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkSync = async () => {
    if (!user?._id) { toast({ title: 'No user ID found', variant: 'destructive' }); return; }
    setBulkSyncing(true);
    try {
      const { data } = await api.post('/admin/mux/sync', { creatorId: user._id });
      const { imported, skipped } = data?.result || {};
      toast({ title: `Mux sync complete`, description: `${imported} imported, ${skipped} skipped` });
      load();
    } catch (err) {
      toast({ title: 'Bulk sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setBulkSyncing(false);
    }
  };

  const filtered = q.trim()
    ? items.filter(v => (v.title || '').toLowerCase().includes(q.toLowerCase()))
    : items;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );

  return (
    <>
      {editing && <EditVideoModal item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={handleSaved} />}

      <div className="flex items-center gap-2 mb-4">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search videos…"
          className="bg-[#1a1a1a] border-[#333] text-white h-9 text-sm focus:border-blue-500 flex-1 max-w-xs" />
        <Button onClick={handleBulkSync} disabled={bulkSyncing}
          className="bg-[#1a1a1a] hover:bg-[#272727] text-white border border-[#333] h-9 px-3 text-xs gap-1.5 flex-shrink-0">
          {bulkSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          Sync Mux
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Film className="w-12 h-12 mb-3" /><p>No videos found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const id = String(item._id || item.id);
            const isSyncing = syncingId === id;
            const needsMuxSync = item.muxAssetId && !item.muxPlaybackId;
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#2a2a2a] p-3 transition-colors">
                {item.thumbnailUrl
                  ? <img src={item.thumbnailUrl} alt={item.title} className="w-20 h-12 object-cover rounded-lg flex-shrink-0" />
                  : <div className="w-20 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0"><Film className="w-5 h-5 text-gray-600" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{item.title || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{item._collectionType}</span>
                    {item.muxPlaybackId
                      ? <span className="text-xs text-green-600 font-mono">✓ Mux</span>
                      : item.muxAssetId
                        ? <span className="text-xs text-yellow-600 font-mono">⚠ No playback ID</span>
                        : null}
                    {item.isFeatured && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">Featured</span>}
                    {item.visibility !== 'public' && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400 border border-white/10">{item.visibility}</span>}
                    {categories
                      .filter(c => c.items.some(ci => ci.itemId === id))
                      .map(c => (
                        <span key={c._id} className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{c.name}</span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(item)} title="Edit"
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {(needsMuxSync || item.muxAssetId) && (
                    <button onClick={() => handleSyncMux(item)} disabled={isSyncing} title="Sync status from Mux"
                      className={`p-2 rounded-lg transition-colors ${needsMuxSync ? 'text-yellow-500 hover:text-yellow-300 hover:bg-yellow-500/10' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}>
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => handleToggleVisibility(item)} title={item.visibility === 'public' ? 'Make subscribers only' : 'Make public'}
                    className={`p-2 rounded-lg transition-colors ${item.visibility === 'public' ? 'text-blue-400 hover:bg-blue-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    {item.visibility === 'public' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleToggleFeature(item)} title={item.isFeatured ? 'Unfeature' : 'Set as featured'}
                    className={`p-2 rounded-lg transition-colors ${item.isFeatured ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'}`}>
                    <Star className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item)} title="Delete"
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
// isInline=true → renders directly in the page (no modal overlay)
// isInline=false (default) → renders as a fixed modal overlay
const MediaAdminPanel = ({ onClose, onCategoriesChange, isInline = false }) => {
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

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] flex-shrink-0">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Film className="w-5 h-5 text-red-500" /> Media Manager
        </h2>
        {!isInline && onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
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
    </>
  );

  if (isInline) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col min-h-[70vh]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="bg-black border border-[#222] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

export default MediaAdminPanel;
