import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dragHasFiles } from './attachments';

// Discord-style "drop anywhere in the channel" upload target. Wraps the
// message list + composer; a file dragged in from the desktop shows a full
// overlay and the drop goes to the composer's attachment tray (onFiles).
// Enter/leave are counted because dragleave fires every time the pointer
// crosses into a child element — a plain boolean flickers.
export default function DropZone({ enabled, label, disabledLabel, onFiles, onRejected, className, children }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  // A file dropped just outside the zone (sidebar, header) would otherwise
  // make the browser open it and leave the chat.
  useEffect(() => {
    const reset = () => { depth.current = 0; setOver(false); };
    const block = (e) => { if (dragHasFiles(e)) e.preventDefault(); };
    const dropped = (e) => { block(e); reset(); };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', dropped);
    window.addEventListener('dragend', reset);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', dropped);
      window.removeEventListener('dragend', reset);
    };
  }, []);

  const onDragEnter = (e) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setOver(true);
  };
  const onDragOver = (e) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    // Always 'copy': 'none' would cancel the drop and the "can't upload"
    // message would never show.
    e.dataTransfer.dropEffect = 'copy';
    if (!over) setOver(true);
  };
  const onDragLeave = (e) => {
    if (!dragHasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    // relatedTarget null = the drag left the window or was cancelled (Esc).
    if (!depth.current || !e.relatedTarget) { depth.current = 0; setOver(false); }
  };
  const onDrop = (e) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    if (!enabled) return onRejected?.();
    // Folders can't be uploaded (on macOS they even look like non-empty files).
    const items = Array.from(e.dataTransfer.items || []);
    const folders = new Set(items.map((it, i) => (it.webkitGetAsEntry?.()?.isDirectory ? i : -1)).filter((i) => i >= 0));
    const files = Array.from(e.dataTransfer.files || []).filter((_, i) => !folders.has(i));
    if (folders.size && !files.length) return onRejected?.("Folders can't be uploaded — drop the files inside instead.");
    if (files.length) onFiles(files);
    return undefined;
  };

  return (
    <div className={cn('relative', className)} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} data-testid="chat-drop-zone">
      {children}
      {over && (
        <div role="status" aria-live="polite" className="chat-fade-in pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-6">
          <div className={cn('flex max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-7 text-center shadow-2xl',
            enabled ? 'border-white/70 bg-[#5865F2]' : 'border-white/30 bg-[#2B2D31]')}>
            <Upload className="h-10 w-10 text-white" />
            <div className="text-lg font-semibold text-white">{enabled ? label : disabledLabel}</div>
            {enabled && <div className="text-sm text-white/80">Images, GIFs, videos and files · up to 10 at once</div>}
          </div>
        </div>
      )}
    </div>
  );
}
