import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Loader2, Film, ImagePlus, X, Plus, Pencil, Trash2,
  GripVertical, Check, Tag, FolderOpen, Camera, Play, EyeOff, Eye, Megaphone,
  Music, Search, RefreshCw, Pause, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import MuxPlayer from '@mux/mux-player-react';
import api from '@/api/homieshub';

// ── BackdropEditor ────────────────────────────────────────────────────────────
const fmt = (s) => { const t = Math.floor(s); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; };

function useDebounced(value, delay = 150) {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef(null);
  const set = (v) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), delay);
  };
  return [debounced, set];
}

const FramePicker = ({ muxPlaybackId, onAdd, addLabel = 'Add', accentClass = 'bg-blue-500 hover:bg-blue-400 text-black' }) => {
  const [seconds, setSeconds] = useState(0);
  const [previewSec, schedulePreview] = useDebounced(0);
  const handle = (v) => { setSeconds(v); schedulePreview(v); };
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-[54px] rounded-md overflow-hidden border border-[#333] flex-shrink-0 bg-[#111]">
        <img key={previewSec}
          src={`https://image.mux.com/${muxPlaybackId}/thumbnail.png?time=${previewSec}&width=320`}
          alt="frame preview" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <input type="range" min="0" max="3600" step="1" value={seconds}
          onChange={e => handle(Number(e.target.value))}
          className="w-full cursor-pointer accent-blue-500" />
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-mono tabular-nums w-10">{fmt(seconds)}</span>
          <input type="number" min="0" max="3600" value={seconds}
            onChange={e => handle(Math.max(0, Math.min(3600, Number(e.target.value) || 0)))}
            className="w-16 bg-[#1a1a1a] border border-[#333] text-white text-xs rounded px-2 py-1 text-center focus:outline-none focus:border-blue-500" />
          <span className="text-gray-600 text-[10px]">sec</span>
        </div>
      </div>
      <Button type="button" onClick={() => onAdd(Math.round(seconds))}
        className={`text-xs font-semibold h-8 px-3 flex-shrink-0 ${accentClass}`}>
        <Camera className="w-3.5 h-3.5 mr-1.5" />{addLabel}
      </Button>
    </div>
  );
};

const BackdropEditor = ({ images, muxPlaybackId, onChange }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const fileRef = useRef();

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

  const addFrame = (t) => {
    if (!muxPlaybackId) return;
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
      const { data } = await api.post('/files/upload', fd);
      const url = data?.result?.url || data?.url;
      if (url) onChange([...images, url]);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
        <div className="rounded-lg border border-[#222] bg-[#0a0a0a] p-3 space-y-3">
          <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Pick frames from video
          </p>
          <FramePicker muxPlaybackId={muxPlaybackId} onAdd={addFrame} addLabel="Add" />
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

// ── Video Preview Modal ───────────────────────────────────────────────────────
const VideoPreviewModal = ({ item, onClose, onFullEdit, onSaved, onHide, onDelete, onAnnounce }) => {
  const { toast } = useToast();
  const playerRef = useRef(null);
  const throttleRef = useRef(0);
  const thumbInputRef = useRef();

  const [liveTime, setLiveTime] = useState(0);
  const [title, setTitle] = useState(item.title || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnailUrl || '');
  const [thumbLoading, setThumbLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcing, setAnnouncing] = useState(false);

  const handleAnnounce = async () => {
    setAnnouncing(true);
    try {
      const itemId = String(item._id || item.id);
      await api.post(`/admin/videos/${itemId}/announce`, { _collectionType: item._collectionType || 'video' });
      toast({ title: '📣 Announced on Discord!' });
      if (onAnnounce) onAnnounce();
    } catch (err) {
      toast({ title: 'Announcement failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setAnnouncing(false);
    }
  };

  const liveThumbUrl = item.muxPlaybackId
    ? `https://image.mux.com/${item.muxPlaybackId}/thumbnail.png?time=${Math.round(liveTime)}&width=320`
    : null;

  const handleTimeUpdate = (e) => {
    const now = Date.now();
    if (now - throttleRef.current < 250) return;
    throttleRef.current = now;
    setLiveTime(e.target.currentTime || 0);
  };

  const captureThumb = () => {
    if (!item.muxPlaybackId) return;
    const url = `https://image.mux.com/${item.muxPlaybackId}/thumbnail.png?time=${Math.round(liveTime)}&width=1920`;
    setThumbnailUrl(url);
    toast({ title: `Thumbnail set to ${fmt(liveTime)}` });
  };

  const handleThumbnailFile = async (file) => {
    setThumbLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'thumbnails');
      const { data } = await api.post('/files/upload', fd);
      const url = data?.result?.url || data?.url;
      if (url) setThumbnailUrl(url);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setThumbLoading(false);
      if (thumbInputRef.current) thumbInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemId = String(item._id || item.id);
      await api.patch(`/admin/videos/${itemId}`, { title, thumbnailUrl, _collectionType: item._collectionType || 'video' });
      toast({ title: 'Saved' });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: 'Save failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{item.title || 'Untitled'}</p>
            <p className="text-gray-500 text-xs mt-0.5">{item._collectionType} {item.muxPlaybackId ? '· Mux' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white ml-4 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Video player */}
          {item.muxPlaybackId ? (
            <div className="rounded-xl overflow-hidden border border-[#222] bg-black">
              <MuxPlayer
                ref={playerRef}
                playbackId={item.muxPlaybackId}
                streamType="on-demand"
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                style={{ width: '100%', aspectRatio: '16/9', display: 'block' }}
              />
            </div>
          ) : (
            <div className="rounded-xl bg-[#111] border border-[#222] aspect-video flex flex-col items-center justify-center gap-3">
              <Film className="w-10 h-10 text-gray-600" />
              <p className="text-gray-500 text-sm">No video yet</p>
            </div>
          )}

          {/* Live frame capture */}
          {item.muxPlaybackId && (
            <div className="flex items-center gap-3 bg-[#111] rounded-xl border border-[#1e1e1e] p-3">
              <div className="w-24 h-[54px] rounded-lg overflow-hidden border border-[#2a2a2a] flex-shrink-0 bg-[#0a0a0a]">
                {liveThumbUrl
                  ? <img key={Math.round(liveTime)} src={liveThumbUrl} alt="frame" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Camera className="w-4 h-4 text-gray-600" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium mb-0.5">
                  Current frame: <span className="font-mono text-[#3ea6ff]">{fmt(liveTime)}</span>
                </p>
                <p className="text-gray-600 text-[11px]">Pause at any frame then capture it as the thumbnail</p>
              </div>
              <Button type="button" onClick={captureThumb}
                className="bg-[#3ea6ff] hover:bg-[#65b8ff] text-black text-xs font-semibold h-9 px-4 flex-shrink-0">
                <Camera className="w-3.5 h-3.5 mr-1.5" />Capture
              </Button>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Video title"
              className="bg-[#1a1a1a] border-[#333] text-white h-11 text-base focus:border-blue-500" />
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300 font-medium">Thumbnail</Label>
            <p className="text-xs text-gray-500">Capture from video above or upload an image</p>
            <div className="flex gap-3 items-start">
              {thumbnailUrl ? (
                <div className="relative group w-48 h-28 rounded-lg overflow-hidden border border-[#333] flex-shrink-0">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => thumbInputRef.current.click()}
                      className="text-white text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Change</button>
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
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-[#1e1e1e] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={onFullEdit}
              className="text-gray-500 hover:text-white text-sm transition-colors flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />Full edit
            </button>
            <span className="text-gray-700">·</span>
            <button onClick={onHide}
              className="text-gray-500 hover:text-yellow-400 text-sm transition-colors flex items-center gap-1.5">
              {item.visibility === 'private'
                ? <><Eye className="w-3.5 h-3.5" />Unhide</>
                : <><EyeOff className="w-3.5 h-3.5" />Hide</>}
            </button>
            <span className="text-gray-700">·</span>
            <button onClick={onDelete}
              className="text-gray-500 hover:text-red-400 text-sm transition-colors flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />Delete
            </button>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAnnounce} disabled={announcing}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold gap-1.5">
              {announcing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              Announce
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Edit Video Modal ──────────────────────────────────────────────────────────
const EditModal = ({ item, categories, onClose, onSaved, onDelete }) => {
  const { toast } = useToast();
  const thumbInputRef = useRef();
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnailUrl || '');
  const [backdropImages, setBackdropImages] = useState(item.backdropImages || []);
  const [selectedCatIds, setSelectedCatIds] = useState(() =>
    categories.filter(c => (c.items || []).some(i => i.itemId === String(item._id || item.id))).map(c => String(c._id))
  );
  const [thumbLoading, setThumbLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcing, setAnnouncing] = useState(false);

  const handleAnnounce = async () => {
    setAnnouncing(true);
    try {
      const itemId = String(item._id || item.id);
      await api.post(`/admin/videos/${itemId}/announce`, { _collectionType: item._collectionType || 'video' });
      toast({ title: '📣 Announced on Discord!' });
    } catch (err) {
      toast({ title: 'Announcement failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setAnnouncing(false);
    }
  };

  const handleThumbnailFile = async (file) => {
    setThumbLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'thumbnails');
      const { data } = await api.post('/files/upload', fd);
      const url = data?.result?.url || data?.url;
      if (url) setThumbnailUrl(url);
    } catch (err) {
      toast({ title: 'Thumbnail upload failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setThumbLoading(false);
    }
  };

  const toggleCategory = (catId) =>
    setSelectedCatIds(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemId = String(item._id || item.id);
      const itemType = item._collectionType || 'video';

      await api.patch(`/admin/videos/${itemId}`, { title, description, thumbnailUrl, backdropImages, _collectionType: itemType });

      // sync category memberships
      await Promise.all(
        categories.map(async (cat) => {
          const catId = String(cat._id);
          const isIn = cat.items.some(i => i.itemId === itemId);
          const shouldBeIn = selectedCatIds.includes(catId);
          if (isIn === shouldBeIn) return;
          const newItems = shouldBeIn
            ? [...cat.items, { itemId, itemType }]
            : cat.items.filter(i => i.itemId !== itemId);
          await api.patch(`/admin/media-categories/${catId}`, { items: newItems });
        })
      );

      toast({ title: 'Saved' });
      onSaved();
    } catch (err) {
      toast({ title: 'Save failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-lg">Edit content</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Title <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Add a title that describes your video"
              className="bg-[#1a1a1a] border-[#333] text-white h-11 text-base focus:border-blue-500" />
          </div>
          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Description</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tell viewers about your video" rows={4}
              className="w-full rounded-md bg-[#1a1a1a] border border-[#333] text-white placeholder:text-gray-600 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500" />
          </div>
          {/* Thumbnail */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300 font-medium">Thumbnail</Label>
            <p className="text-xs text-gray-500">JPG, PNG, WebP · 16:9 recommended</p>
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
                        ${active ? 'bg-[#3ea6ff]/20 text-[#3ea6ff] border-[#3ea6ff]/40' : 'bg-[#1a1a1a] text-gray-400 border-[#333] hover:border-[#555]'}`}>
                      {active && <Check className="w-3 h-3" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Backdrop */}
          <div className="border-t border-[#1e1e1e] pt-5">
            <BackdropEditor images={backdropImages} muxPlaybackId={item.muxPlaybackId} onChange={setBackdropImages} />
          </div>
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t border-[#1e1e1e]">
          <button onClick={onDelete}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />Delete
          </button>
          <div className="flex gap-3">
            <Button onClick={handleAnnounce} disabled={announcing}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold gap-1.5">
              {announcing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              Announce
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save changes
            </Button>
          </div>
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
  const [previewing, setPreviewing] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/media-library')
      .then(({ data }) => setItems(data?.result?.items || []))
      .catch(() => toast({ title: 'Failed to load library', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const filtered = q.trim() ? items.filter(v => (v.title || '').toLowerCase().includes(q.toLowerCase())) : items;

  const handleSaved = () => { setEditing(null); setPreviewing(null); load(); onCategoriesChange(); };

  const handleAnnounce = async (item) => {
    const itemId = String(item._id || item.id);
    try {
      await api.post(`/admin/videos/${itemId}/announce`, { _collectionType: item._collectionType || 'video' });
      toast({ title: '📣 Announced on Discord!' });
    } catch (err) {
      toast({ title: 'Announcement failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  const handleHide = async (item) => {
    const itemId = String(item._id || item.id);
    const next = item.visibility === 'private' ? 'public' : 'private';
    try {
      await api.patch(`/admin/videos/${itemId}`, { visibility: next, _collectionType: item._collectionType || 'video' });
      setItems(prev => prev.map(i => String(i._id || i.id) === itemId ? { ...i, visibility: next } : i));
      if (previewing && String(previewing._id || previewing.id) === itemId) setPreviewing(p => ({ ...p, visibility: next }));
      toast({ title: next === 'private' ? 'Hidden from public feed' : 'Visible again' });
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title || 'this video'}"? This cannot be undone.`)) return;
    const itemId = String(item._id || item.id);
    try {
      await api.delete(`/admin/videos/${itemId}?collectionType=${item._collectionType || 'video'}`);
      setItems(prev => prev.filter(i => String(i._id || i.id) !== itemId));
      if (previewing && String(previewing._id || previewing.id) === itemId) setPreviewing(null);
      toast({ title: 'Deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );

  return (
    <>
      {previewing && (
        <VideoPreviewModal
          item={previewing}
          onClose={() => setPreviewing(null)}
          onFullEdit={() => { setEditing(previewing); setPreviewing(null); }}
          onSaved={handleSaved}
          onHide={() => handleHide(previewing)}
          onDelete={() => handleDelete(previewing)}
          onAnnounce={() => handleAnnounce(previewing)}
        />
      )}
      {editing && <EditModal item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={handleSaved} onDelete={() => { setEditing(null); handleDelete(editing); }} />}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-500 text-sm">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
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
            <div key={String(item._id || item.id)}
              className="flex items-center gap-4 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#2a2a2a] p-3 transition-colors group">
              {/* Thumbnail — click to preview */}
              <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setPreviewing(item)}>
                {item.thumbnailUrl
                  ? <img src={item.thumbnailUrl} alt={item.title} className="w-20 h-12 object-cover rounded-lg" />
                  : item.muxPlaybackId
                    ? <img src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.png?time=3&width=160`} alt={item.title} className="w-20 h-12 object-cover rounded-lg" />
                    : <div className="w-20 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center"><Film className="w-5 h-5 text-gray-600" /></div>}
                <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {/* Title — click to preview */}
                <p className="text-white font-medium text-sm truncate cursor-pointer hover:text-[#3ea6ff] transition-colors"
                  onClick={() => setPreviewing(item)}>{item.title || 'Untitled'}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{item._collectionType}</span>
                  {item.visibility === 'private' && (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />Hidden
                    </span>
                  )}
                  {item.muxPlaybackId && <span className="text-xs text-gray-600 font-mono">✓ Mux</span>}
                  {categories
                    .filter(c => (c.items || []).some(i => i.itemId === String(item._id || item.id)))
                    .map(c => (
                      <span key={c._id} className="text-xs bg-[#3ea6ff]/15 text-[#3ea6ff] border border-[#3ea6ff]/20 px-2 py-0.5 rounded-full">{c.name}</span>
                    ))}
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); handleAnnounce(item); }}
                  title="Announce on Discord"
                  className="p-2 rounded-lg text-gray-500 hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors">
                  <Megaphone className="w-4 h-4" />
                </button>
                <button onClick={e => { e.stopPropagation(); handleHide(item); }}
                  title={item.visibility === 'private' ? 'Unhide' : 'Hide'}
                  className="p-2 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                  {item.visibility === 'private' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={e => { e.stopPropagation(); setEditing(item); }} title="Full edit"
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(item); }} title="Delete"
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (catId) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/admin/media-categories/${catId}`, { name: editName.trim() });
      onCategoriesChange();
      setEditingId(null);
      toast({ title: 'Category renamed' });
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
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
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  const patchCat = async (cat, body, msg) => {
    try {
      await api.patch(`/admin/media-categories/${cat._id}`, body);
      onCategoriesChange();
      if (msg) toast({ title: msg });
    } catch (err) {
      toast({ title: 'Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createCategory(); }}
          placeholder="New category name (e.g. Documentaries, Comedy…)"
          className="bg-[#1a1a1a] border-[#333] text-white h-9 text-sm focus:border-blue-500 flex-1" />
        <Button onClick={createCategory} disabled={creating || !newName.trim()}
          className="bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold h-9 px-4 flex-shrink-0">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <FolderOpen className="w-12 h-12 mb-3" /><p>No categories yet. Create one above.</p>
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
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat._id); if (e.key === 'Escape') setEditingId(null); }}
                      className="bg-[#1a1a1a] border-[#333] text-white h-8 text-sm focus:border-blue-500 flex-1" autoFocus />
                    <Button onClick={() => saveEdit(cat._id)} disabled={saving} className="h-8 px-3 bg-[#3ea6ff] hover:bg-[#65b8ff] text-black text-xs font-semibold">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button onClick={() => setEditingId(null)} variant="ghost" className="h-8 px-2 text-gray-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-medium text-sm flex items-center gap-1.5">
                      {cat.name}
                      {cat.isFeatured && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-current" />STAR</span>}
                      {cat.isVisible === false && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-gray-400">Hidden</span>}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{cat.items?.length || 0} video{cat.items?.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
              {editingId !== String(cat._id) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => patchCat(cat, { isFeatured: !cat.isFeatured }, cat.isFeatured ? 'Removed as star' : '★ Now the featured category')}
                    title="Star — headline the Videos page"
                    className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${cat.isFeatured ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}>
                    <Star className={`w-4 h-4 ${cat.isFeatured ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => patchCat(cat, { isVisible: cat.isVisible === false }, cat.isVisible === false ? 'Visible in app' : 'Hidden from app')}
                    title={cat.isVisible === false ? 'Hidden — click to show' : 'Visible — click to hide'}
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                    {cat.isVisible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { setEditingId(String(cat._id)); setEditName(cat.name); }} title="Rename"
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

// ── Music: edit / rename modal ────────────────────────────────────────────────
const MusicEditModal = ({ track, onClose, onSaved }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      // A track can live in several playlists (its genre + "Fresh Drops").
      // Update its entry in every category that contains it so the rename sticks everywhere.
      for (const cat of track._categories) {
        const tracks = (cat.tracks || []).map((t) =>
          String(t.trackId) === String(track.trackId)
            ? { ...t, title: title.trim(), artist: artist.trim() }
            : t
        );
        await api.patch(`/admin/music-categories/${cat._id}`, { tracks });
      }
      toast({ title: '🎵 Music updated' });
      onSaved();
    } catch (err) {
      toast({ title: 'Save failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Music className="w-4 h-4 text-fuchsia-400" />Edit music</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-4 mb-5">
          <div className="w-16 h-16 rounded-lg bg-[#0f0f0f] flex-shrink-0 overflow-hidden flex items-center justify-center">
            {track.image ? <img src={track.image} alt="" className="w-full h-full object-cover" /> : <Music className="w-6 h-6 text-gray-600" />}
          </div>
          <div className="text-xs text-gray-500 flex-1 min-w-0">
            <p>Genre: <span className="text-gray-300">{track.genre || '—'}</span></p>
            <p className="mt-1">In playlists:</p>
            <p className="text-gray-300 truncate">{track._categories.map((c) => c.name).join(', ')}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-gray-400 text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0f0f0f] border-[#2a2a2a] text-white mt-1" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs">Artist</Label>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} className="bg-[#0f0f0f] border-[#2a2a2a] text-white mt-1" />
          </div>
        </div>
        <p className="text-[11px] text-gray-600 mt-3">Renames the track across every playlist it appears in. (A full DigitVL re-sync re-pulls the catalog's original titles.)</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}Save
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Music Library Tab ─────────────────────────────────────────────────────────
const MusicLibraryTab = () => {
  const { toast } = useToast();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('all');
  const [editing, setEditing] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/music-categories');
      setCats(data?.result?.categories || []);
    } catch {
      toast({ title: 'Failed to load music', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  // flatten all playlists into a unique track list; remember which playlists each is in
  const tracks = useMemo(() => {
    const map = new Map();
    for (const c of cats) {
      for (const t of (c.tracks || [])) {
        const id = String(t.trackId);
        if (!map.has(id)) map.set(id, { ...t, trackId: id, _categories: [] });
        map.get(id)._categories.push(c);
      }
    }
    return [...map.values()];
  }, [cats]);

  const genreOptions = useMemo(
    () => ['all', ...cats.map((c) => c.name)],
    [cats]
  );

  const filtered = useMemo(() => tracks.filter((t) => {
    const okGenre = genre === 'all' || t._categories.some((c) => c.name === genre);
    const okQ = !q.trim() || `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase());
    return okGenre && okQ;
  }), [tracks, genre, q]);

  const runSync = async () => {
    if (!window.confirm('Sync the DigitVL library into the app?\n\nRebuilds the per-genre playlists from every track in the catalog (new releases show up here).')) return;
    setSyncing(true);
    try {
      const { data } = await api.post('/admin/music-categories/import-digitvl');
      const r = data?.result;
      toast({ title: '🔄 Synced from DigitVL', description: r ? `${r.total} tracks · ${r.categories?.length || 0} playlists` : 'Done' });
      load();
    } catch (err) {
      toast({ title: 'Sync failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const togglePlay = (t) => {
    if (playingId === t.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(t.trackId);
    setTimeout(() => {
      if (audioRef.current && t.audioUrl) {
        audioRef.current.src = t.audioUrl;
        audioRef.current.play().catch(() => {});
      }
    }, 0);
  };

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search music…"
            className="bg-[#0f0f0f] border-[#1e1e1e] text-white pl-9" />
        </div>
        <select value={genre} onChange={(e) => setGenre(e.target.value)}
          className="bg-[#0f0f0f] border border-[#1e1e1e] text-white rounded-md h-10 px-3 text-sm">
          {genreOptions.map((g) => <option key={g} value={g}>{g === 'all' ? 'All categories' : g}</option>)}
        </select>
        <Button onClick={runSync} disabled={syncing} variant="outline"
          className="border-[#2a2a2a] bg-[#111] text-white hover:bg-[#1c1c1c]">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}Sync DigitVL
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">No music here</p>
          <p className="text-sm mt-1">Hit “Sync DigitVL” to pull your catalog in.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">{filtered.length} track{filtered.length === 1 ? '' : 's'}</p>
          <div className="space-y-1">
            {filtered.map((t) => (
              <div key={t.trackId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#141414] group">
                <button onClick={() => togglePlay(t)}
                  className="w-11 h-11 rounded-lg bg-[#0f0f0f] flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                  {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-gray-600" />}
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {playingId === t.trackId ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{t.title}</div>
                  <div className="text-sm text-gray-500 truncate">{t.artist || 'Unknown artist'}</div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-[45%]">
                  {t._categories.map((c) => (
                    <span key={c._id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400 border border-[#262626]">{c.name}</span>
                  ))}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditing(t)}
                  className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && <MusicEditModal track={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminMediaManager = () => {
  const [categories, setCategories] = useState([]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/media-categories');
      setCategories(data?.result?.categories || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 py-5 border-b border-[#1e1e1e] flex items-center gap-3">
        <Film className="w-5 h-5 text-red-500" />
        <h1 className="text-xl font-semibold text-white">Media Manager</h1>
        <span className="text-gray-600 text-sm">— edit videos, music, thumbnails, backdrops, and categories</span>
      </div>

      <div className="px-6 pt-6 max-w-6xl mx-auto pb-20">
        <Tabs defaultValue="library">
          <TabsList className="bg-[#0f0f0f] border border-[#1e1e1e] mb-8 p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="library" className="data-[state=active]:bg-[#272727] data-[state=active]:text-white text-gray-400 rounded-lg">
              <Film className="w-4 h-4 mr-1.5" />Videos
            </TabsTrigger>
            <TabsTrigger value="music" className="data-[state=active]:bg-[#272727] data-[state=active]:text-white text-gray-400 rounded-lg">
              <Music className="w-4 h-4 mr-1.5" />Music
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-[#272727] data-[state=active]:text-white text-gray-400 rounded-lg">
              <Tag className="w-4 h-4 mr-1.5" />Video Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <LibraryTab categories={categories} onCategoriesChange={loadCategories} />
          </TabsContent>
          <TabsContent value="music">
            <MusicLibraryTab />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTab categories={categories} onCategoriesChange={loadCategories} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminMediaManager;
