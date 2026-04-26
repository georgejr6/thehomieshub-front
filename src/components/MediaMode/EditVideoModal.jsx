import React, { useState, useRef } from 'react';
import {
  X, Loader2, ImagePlus,
  Camera, Tag, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';

const fmt = (s) => { const t = Math.floor(s); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; };

// ── Backdrop Editor ───────────────────────────────────────────────────────────
export const BackdropEditor = ({ images, muxPlaybackId, onChange }) => {
  const { toast } = useToast();
  const [pickerSeconds, setPickerSeconds] = useState(0);
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

  const addPickedFrame = () => {
    if (!muxPlaybackId) return;
    const t = Math.round(pickerSeconds);
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
          <div className="flex items-center gap-3">
            <div className="w-24 h-[54px] rounded-md overflow-hidden border border-[#333] flex-shrink-0 bg-[#111]">
              <img src={`https://image.mux.com/${muxPlaybackId}/thumbnail.png?time=${Math.round(pickerSeconds)}&width=320`}
                alt="frame preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <input type="range" min="0" max="3600" step="1"
                value={pickerSeconds}
                onChange={e => setPickerSeconds(Number(e.target.value))}
                className="w-full cursor-pointer accent-blue-500" />
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-mono tabular-nums w-10">{fmt(pickerSeconds)}</span>
                <input type="number" min="0" max="3600" value={pickerSeconds}
                  onChange={e => setPickerSeconds(Math.max(0, Math.min(3600, Number(e.target.value) || 0)))}
                  className="w-16 bg-[#1a1a1a] border border-[#333] text-white text-xs rounded px-2 py-1 text-center focus:outline-none focus:border-blue-500" />
                <span className="text-gray-600 text-[10px]">sec</span>
              </div>
            </div>
            <Button type="button" onClick={addPickedFrame}
              className="bg-blue-500 hover:bg-blue-400 text-black text-xs font-semibold h-8 px-3 flex-shrink-0">
              <Camera className="w-3.5 h-3.5 mr-1.5" /> Add
            </Button>
          </div>
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
// item shape: { _id|id, title, description, thumbnailUrl, backdropImages, muxPlaybackId, _collectionType }
// categories: array from /admin/media-categories
// onClose: () => void
// onSaved: () => void
const EditVideoModal = ({ item, categories = [], onClose, onSaved }) => {
  const { toast } = useToast();
  const thumbInputRef = useRef();
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnailUrl || '');
  const [backdropImages, setBackdropImages] = useState(item.backdropImages || []);
  const [selectedCatIds, setSelectedCatIds] = useState(() =>
    categories
      .filter(c => c.items?.some(i => i.itemId === String(item._id || item.id)))
      .map(c => String(c._id))
  );
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

      await api.patch(`/admin/videos/${itemId}`, {
        title,
        description,
        thumbnailUrl,
        backdropImages,
        _collectionType: itemType,
      });

      if (categories.length > 0) {
        await Promise.all(
          categories.map(async (cat) => {
            const catId = String(cat._id);
            const isIn = cat.items?.some(i => i.itemId === itemId);
            const shouldBeIn = selectedCatIds.includes(catId);
            if (isIn === shouldBeIn) return;
            const newItems = shouldBeIn
              ? [...(cat.items || []), { itemId, itemType }]
              : (cat.items || []).filter(i => i.itemId !== itemId);
            await api.patch(`/admin/media-categories/${catId}`, { items: newItems });
          })
        );
      }

      toast({ title: 'Saved' });
      onSaved?.();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-white font-semibold text-lg">Edit video</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              className="bg-[#1a1a1a] border-[#333] text-white h-11 focus:border-blue-500" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-300 font-medium">Description</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full rounded-md bg-[#1a1a1a] border border-[#333] text-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500" />
          </div>

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

export default EditVideoModal;
