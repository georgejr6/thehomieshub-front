import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  UploadCloud, Film, ImagePlus, X, CheckCircle2,
  Loader2, Hash, ChevronDown, ChevronUp, AlertCircle, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';

// ── Image upload helper (HH S3 endpoint) ─────────────────────────────────────
async function uploadImageToS3(file, folder = 'thumbnails') {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(`/files/upload?folder=${folder}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.result?.url || res.data?.url;
}

// ── Thumbnail picker ──────────────────────────────────────────────────────────
const ThumbnailPicker = ({ preview, onFile, onClear, loading }) => {
  const ref = useRef();
  return (
    <div className="space-y-2">
      <Label className="text-sm text-zinc-300 font-medium">Thumbnail</Label>
      <p className="text-xs text-zinc-500">JPG, PNG, WebP · 16:9 recommended</p>
      <div className="flex gap-3 items-start">
        {preview ? (
          <div className="relative group w-44 h-[99px] rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
            <img src={preview} alt="Thumbnail" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => ref.current.click()} className="text-white text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Change</button>
              <button onClick={onClear} className="text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => ref.current.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) onFile(f); }}
            onDragOver={e => e.preventDefault()}
            className="w-44 h-[99px] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer flex-shrink-0"
          >
            {loading
              ? <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              : <><ImagePlus className="w-6 h-6 text-zinc-500" /><span className="text-xs text-zinc-500">Upload thumbnail</span></>}
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      </div>
    </div>
  );
};

// ── Backdrop image picker ─────────────────────────────────────────────────────
const BackdropPicker = ({ images, onChange, disabled }) => {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const url = await uploadImageToS3(file, 'backdrops');
      onChange([...images, url]);
    } catch {
      toast({ title: 'Image upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-zinc-300 font-medium">Backdrop Slideshow</Label>
      <p className="text-xs text-zinc-500">
        Images that cycle as the hero background when featured. Leave empty to auto-use video frames.
      </p>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url + i} className="relative group w-28 h-16 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
              <img src={url} alt={`Backdrop ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              <span className="absolute bottom-1 left-1.5 text-white text-[10px] bg-black/60 px-1 rounded">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        <Button
          type="button"
          onClick={() => ref.current.click()}
          disabled={uploading || disabled}
          className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs h-8 px-3"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
          Add image
        </Button>
      </div>
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
const UploadMomentModal = ({ isOpen, onOpenChange }) => {
  const { toast } = useToast();

  // phase: idle | queue | details | uploading | done
  const [phase, setPhase] = useState('idle');
  const [videoFile, setVideoFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // ── single-file fields ────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('reel');
  const [hashtags, setHashtags] = useState([]);
  const [hashInput, setHashInput] = useState('');
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [isNSFW, setIsNSFW] = useState(false);
  const [thumbPreview, setThumbPreview] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [thumbLoading, setThumbLoading] = useState(false);
  const [backdropImages, setBackdropImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [doneTitle, setDoneTitle] = useState('');

  // ── bulk-upload queue ─────────────────────────────────────────────────────
  // each item: { id, file, title, contentType, status, progress }
  const [videoQueue, setVideoQueue] = useState([]);
  const [queueUploading, setQueueUploading] = useState(false);
  const [queueDropOver, setQueueDropOver] = useState(false);

  const fileInputRef = useRef();

  const makeQueueItem = (file, idx = 0) => ({
    id: Date.now() + idx,
    file,
    title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
    contentType: 'reel',
    status: 'pending',
    progress: 0,
  });

  // Reset everything when modal closes
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setPhase('idle'); setVideoFile(null); setDragOver(false);
        setTitle(''); setDescription(''); setContentType('reel');
        setHashtags([]); setHashInput(''); setTagsExpanded(false); setIsNSFW(false);
        setThumbPreview(''); setThumbUrl(''); setThumbLoading(false);
        setBackdropImages([]); setUploadProgress(0); setDoneTitle('');
        setVideoQueue([]); setQueueUploading(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── file selection helpers ────────────────────────────────────────────────
  const pickFile = useCallback((file) => {
    if (!file?.type.startsWith('video/')) {
      toast({ title: 'Please select a video file', variant: 'destructive' }); return;
    }
    setVideoFile(file);
    const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTitle(t => t || name);
    setPhase('details');
  }, [toast]);

  const addToQueue = useCallback((files) => {
    const videos = Array.from(files).filter(f => f.type.startsWith('video/'));
    if (!videos.length) return;
    setVideoQueue(q => [...q, ...videos.map((f, i) => makeQueueItem(f, q.length + i))]);
  }, []);

  // Called from the idle drop zone — 1 file → details, 2+ → queue
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (!files.length) { toast({ title: 'Please drop video files', variant: 'destructive' }); return; }
    if (files.length === 1) {
      pickFile(files[0]);
    } else {
      setVideoQueue(files.map((f, i) => makeQueueItem(f, i)));
      setPhase('queue');
    }
  }, [pickFile, toast]);

  // Called from file input — same logic but also handles adding to existing queue
  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    if (phase === 'queue') {
      addToQueue(files);
    } else if (files.length === 1) {
      pickFile(files[0]);
    } else {
      setVideoQueue(files.map((f, i) => makeQueueItem(f, i)));
      setPhase('queue');
    }
  }, [phase, pickFile, addToQueue]);

  // ── single-file upload ────────────────────────────────────────────────────
  const handleThumbnailFile = async (file) => {
    setThumbLoading(true);
    try {
      const url = await uploadImageToS3(file, 'thumbnails');
      setThumbPreview(url); setThumbUrl(url);
    } catch {
      toast({ title: 'Thumbnail upload failed', variant: 'destructive' });
    } finally { setThumbLoading(false); }
  };

  const handleHashKey = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const tag = hashInput.trim().replace(/^#/, '');
      if (tag && !hashtags.includes(tag)) setHashtags(h => [...h, tag]);
      setHashInput('');
    } else if (e.key === 'Backspace' && !hashInput && hashtags.length) {
      setHashtags(h => h.slice(0, -1));
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setPhase('uploading'); setUploadProgress(0);
    try {
      setUploadProgress(5);
      const { data } = await api.post('/mux/uploads', {
        contentType,
        title: title.trim(),
        caption: description.trim(),
        description: description.trim(),
        hashtags,
        coverImageUrl: thumbUrl || '',
        backdropImages,
      });
      const muxUploadUrl = data?.result?.upload?.url;
      if (!muxUploadUrl) throw new Error('No upload URL returned');

      setUploadProgress(10);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(10 + Math.round((e.loaded / e.total) * 88));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Mux upload failed')));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('PUT', muxUploadUrl);
        xhr.send(videoFile);
      });

      setUploadProgress(100);
      setDoneTitle(title.trim());
      setPhase('done');
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      setPhase('details');
    }
  };

  // ── bulk queue upload ─────────────────────────────────────────────────────
  const handleQueueUpload = async () => {
    setQueueUploading(true);
    const pending = videoQueue.filter(v => v.status === 'pending' || v.status === 'failed');
    for (const item of pending) {
      const idx = videoQueue.findIndex(v => v.id === item.id);
      const updateItem = (patch) =>
        setVideoQueue(q => q.map(v => v.id === item.id ? { ...v, ...patch } : v));

      updateItem({ status: 'uploading', progress: 5 });
      try {
        const { data } = await api.post('/mux/uploads', {
          contentType: item.contentType,
          title: item.title.trim() || item.file.name,
          caption: '',
          description: '',
          hashtags: [],
          coverImageUrl: '',
          backdropImages: [],
        });
        const muxUploadUrl = data?.result?.upload?.url;
        if (!muxUploadUrl) throw new Error('No upload URL');

        updateItem({ progress: 10 });
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              updateItem({ progress: 10 + Math.round((e.loaded / e.total) * 88) });
          };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.open('PUT', muxUploadUrl);
          xhr.send(item.file);
        });

        updateItem({ status: 'done', progress: 100 });
      } catch {
        updateItem({ status: 'failed' });
      }
    }
    setQueueUploading(false);
  };

  const handleReset = () => {
    setPhase('idle'); setVideoFile(null);
    setTitle(''); setDescription(''); setHashtags([]); setHashInput('');
    setThumbPreview(''); setThumbUrl(''); setBackdropImages([]);
    setUploadProgress(0); setDoneTitle('');
    setVideoQueue([]); setQueueUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayedTags = tagsExpanded ? hashtags : hashtags.slice(0, 5);
  const queueAllDone = videoQueue.length > 0 && videoQueue.every(v => v.status === 'done');
  const queuePendingCount = videoQueue.filter(v => v.status === 'pending' || v.status === 'failed').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-white text-lg">
            <Film className="w-5 h-5 text-zinc-400" />
            Upload Video
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">

          {/* ── IDLE: drop zone ── */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current.click()}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-64 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none",
                  dragOver ? "border-white/50 bg-white/5" : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
                )}
              >
                <UploadCloud className={cn("w-14 h-14 mb-4 transition-colors", dragOver ? "text-white" : "text-zinc-600")} />
                <p className="text-white text-lg font-semibold mb-1">Drag & drop videos here</p>
                <p className="text-zinc-500 text-sm mb-1">Drop multiple files to bulk upload</p>
                <p className="text-zinc-600 text-xs mb-5">MP4, MOV, AVI, MKV, WebM</p>
                <Button className="bg-white text-black hover:bg-white/90 font-semibold px-6">Select files</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden"
                onChange={handleFileInput} />
            </div>
          )}

          {/* ── QUEUE: bulk upload list ── */}
          {phase === 'queue' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  {videoQueue.length} video{videoQueue.length !== 1 ? 's' : ''} queued
                  {queueAllDone && <span className="text-green-500 ml-2">· all done</span>}
                </p>
                {!queueUploading && !queueAllDone && (
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add more
                  </button>
                )}
              </div>

              {/* File list */}
              <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                {videoQueue.map((item) => (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
                    {/* Row 1: icon + filename + size + remove */}
                    <div className="flex items-center gap-2">
                      {item.status === 'pending' && <Film className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                      {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />}
                      {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {item.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-xs text-zinc-500 truncate flex-1">{item.file.name} · {(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                      {!queueUploading && item.status !== 'done' && (
                        <button
                          onClick={() => setVideoQueue(q => q.filter(v => v.id !== item.id))}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Editable title (hidden once done) */}
                    {item.status !== 'done' && (
                      <Input
                        value={item.title}
                        onChange={e => setVideoQueue(q => q.map(v => v.id === item.id ? { ...v, title: e.target.value } : v))}
                        disabled={item.status === 'uploading'}
                        placeholder="Video title"
                        className="bg-zinc-800 border-zinc-700 text-white text-sm h-8 focus:border-zinc-500"
                      />
                    )}

                    {/* Content type (hidden once done) */}
                    {item.status !== 'done' && (
                      <div className="flex gap-1.5">
                        {['reel', 'video'].map(t => (
                          <button key={t} type="button"
                            disabled={item.status === 'uploading'}
                            onClick={() => setVideoQueue(q => q.map(v => v.id === item.id ? { ...v, contentType: t } : v))}
                            className={cn(
                              "flex-1 py-1 rounded-md text-xs font-medium border transition-colors",
                              item.contentType === t
                                ? "bg-white text-black border-white"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 disabled:opacity-50"
                            )}>
                            {t === 'reel' ? 'Reel (short)' : 'Video (long)'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Progress bar while uploading */}
                    {item.status === 'uploading' && (
                      <div className="space-y-1">
                        <div className="w-full bg-zinc-800 rounded-full h-1">
                          <div className="h-1 rounded-full bg-white transition-all duration-200" style={{ width: `${item.progress}%` }} />
                        </div>
                        <p className="text-xs text-zinc-500 text-right">{item.progress}%</p>
                      </div>
                    )}

                    {item.status === 'done' && (
                      <p className="text-xs text-green-500">"{item.title}" uploaded — processing on Mux</p>
                    )}
                    {item.status === 'failed' && (
                      <p className="text-xs text-red-400">Upload failed — will retry when you click Upload</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Drop zone to add more (only shown before uploading starts) */}
              {!queueUploading && !queueAllDone && (
                <div
                  onDrop={e => { e.preventDefault(); setQueueDropOver(false); addToQueue(e.dataTransfer.files); }}
                  onDragOver={e => { e.preventDefault(); setQueueDropOver(true); }}
                  onDragLeave={() => setQueueDropOver(false)}
                  onClick={() => fileInputRef.current.click()}
                  className={cn(
                    "border border-dashed rounded-xl p-3 flex items-center gap-2 cursor-pointer text-sm transition-colors",
                    queueDropOver
                      ? "border-white/40 bg-white/5 text-white"
                      : "border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  <UploadCloud className="w-4 h-4 flex-shrink-0" />
                  Drop more videos here or click to add
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden"
                onChange={handleFileInput} />
            </div>
          )}

          {/* ── DETAILS: single-file form ── */}
          {phase === 'details' && (
            <div className="flex flex-col lg:flex-row gap-8">

              {/* Left: form */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* File info */}
                <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <Film className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1">{videoFile?.name}</span>
                  <span className="whitespace-nowrap text-xs">{videoFile ? (videoFile.size / (1024 * 1024)).toFixed(1) + ' MB' : ''}</span>
                  <button onClick={handleReset} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
                </div>

                {/* Content type */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300 font-medium">Type</Label>
                  <div className="flex gap-2">
                    {['reel', 'video'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setContentType(t)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
                          contentType === t ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                        )}>
                        {t === 'reel' ? 'Reel (short)' : 'Video (long)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300 font-medium">Title <span className="text-red-500">*</span></Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Give your video a title"
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-11 focus:border-zinc-400" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300 font-medium">Description</Label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Tell viewers what this is about" rows={3}
                    className="w-full rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-zinc-400" />
                </div>

                {/* Thumbnail */}
                <ThumbnailPicker
                  preview={thumbPreview}
                  onFile={handleThumbnailFile}
                  onClear={() => { setThumbPreview(''); setThumbUrl(''); }}
                  loading={thumbLoading}
                />

                {/* Backdrop slideshow */}
                <BackdropPicker
                  images={backdropImages}
                  onChange={setBackdropImages}
                  disabled={false}
                />

                {/* Hashtags */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300 font-medium">Hashtags</Label>
                  <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 focus-within:border-zinc-400">
                    <Hash className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <input
                      value={hashInput}
                      onChange={e => setHashInput(e.target.value)}
                      onKeyDown={handleHashKey}
                      placeholder="Add tags (Enter or comma)"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
                    />
                  </div>
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {displayedTags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full border border-zinc-700">
                          #{tag}
                          <button onClick={() => setHashtags(h => h.filter(t => t !== tag))}
                            className="hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {hashtags.length > 5 && (
                        <button onClick={() => setTagsExpanded(v => !v)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5">
                          {tagsExpanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />+{hashtags.length - 5} more</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* NSFW */}
                <div className="flex items-center justify-between border border-zinc-800 rounded-lg p-3 bg-zinc-900">
                  <div>
                    <p className="text-sm text-white font-medium">NSFW Content</p>
                    <p className="text-xs text-zinc-500">Mark this as 18+ content</p>
                  </div>
                  <Switch checked={isNSFW} onCheckedChange={setIsNSFW} />
                </div>
              </div>

              {/* Right: preview panel */}
              <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                  {thumbPreview
                    ? <img src={thumbPreview} alt="Preview" className="w-full aspect-video object-cover" />
                    : <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
                        <Film className="w-10 h-10 text-zinc-700" />
                      </div>}
                  <div className="p-3 space-y-1">
                    <p className="text-white text-sm font-medium truncate">{title || 'Untitled'}</p>
                    <p className="text-zinc-500 text-xs capitalize">{contentType}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      <span className="text-xs text-zinc-500">Mux processes after upload</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2 text-xs text-zinc-500">
                  <p className="flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />Video sent to Mux — takes 1-3 min to process.</p>
                  <p className="flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />Auto-publishes when ready. Appears in The Homies section of Media Mode.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── UPLOADING: single-file progress ── */}
          {phase === 'uploading' && (
            <div className="py-12 space-y-6">
              <div className="flex items-center gap-3 text-zinc-400">
                <Film className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm truncate">{videoFile?.name}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">
                    {uploadProgress < 10 ? 'Creating upload…' : uploadProgress < 98 ? 'Uploading to Mux…' : 'Finalising…'}
                  </span>
                  <span className="text-white font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-white transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── DONE: single-file success ── */}
          {phase === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h2 className="text-2xl font-bold text-white">Upload complete!</h2>
              <p className="text-zinc-400 max-w-sm">
                <span className="text-white font-medium">"{doneTitle}"</span> sent to Mux for processing.
                It will appear in The Homies section of Media Mode within a few minutes.
              </p>
              <Button onClick={handleReset} className="bg-white text-black hover:bg-white/90 font-semibold mt-2">
                Upload another
              </Button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {phase === 'details' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <Button variant="ghost" onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!title.trim()}
              className="bg-white text-black hover:bg-white/90 font-semibold px-8 disabled:opacity-40">
              Upload
            </Button>
          </div>
        )}

        {phase === 'queue' && !queueAllDone && (
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-zinc-800">
            <Button variant="ghost" onClick={handleReset} disabled={queueUploading}
              className="text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40">
              Clear all
            </Button>
            <Button
              onClick={handleQueueUpload}
              disabled={queueUploading || queuePendingCount === 0}
              className="bg-white text-black hover:bg-white/90 font-semibold px-8 disabled:opacity-40"
            >
              {queueUploading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</>
                : `Upload ${queuePendingCount} video${queuePendingCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}

        {phase === 'queue' && queueAllDone && (
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-zinc-800">
            <Button variant="ghost" onClick={handleReset}
              className="text-zinc-400 hover:text-white hover:bg-white/10">
              Upload more
            </Button>
            <Button onClick={() => onOpenChange(false)}
              className="bg-white text-black hover:bg-white/90 font-semibold px-8">
              Done
            </Button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex justify-end px-6 py-4 border-t border-zinc-800">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white hover:bg-white/10">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadMomentModal;
