// Client-side checks for chat attachments (drag & drop, paste, the file
// picker). They mirror the server (routes/chat.js + utils/chat/storage.js) so
// people get a friendly message before a doomed upload: 10 files a message,
// 20 MB each unless the server says otherwise (me.uploadMaxBytes, null = no
// cap), and never files the server refuses to host (HTML/SVG/scripts/exes).

export const MAX_FILES = 10;
export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

const BLOCKED_EXT = new Set(['.html', '.htm', '.svg', '.js', '.mjs', '.exe', '.bat', '.cmd', '.msi', '.scr', '.ps1', '.sh', '.apk', '.jar', '.dll', '.vbs']);
const BLOCKED_MIME = new Set(['text/html', 'image/svg+xml', 'application/javascript', 'text/javascript', 'application/x-msdownload', 'application/x-sh']);

export const fileKind = (f) => {
  const t = f?.type || '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return 'file';
};

export const formatBytes = (n) => {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

const extOf = (name) => {
  const i = String(name || '').lastIndexOf('.');
  return i > 0 ? name.slice(i).toLowerCase() : '';
};

// Clipboard screenshots all arrive as "image.png" with the same timestamp;
// give them a real, unique name so previews and the upload tell them apart.
let pasteSeq = 0;
export function renamePasted(file, now = new Date()) {
  if (!file || !/^image\.(png|jpe?g|gif|webp)$/i.test(file.name || '')) return file;
  pasteSeq += 1;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
  const name = `screenshot-${stamp}${pasteSeq > 1 ? `-${pasteSeq}` : ''}${extOf(file.name)}`;
  try {
    return new File([file], name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file; // very old browsers: keep the original
  }
}

/**
 * Split incoming files into the ones to attach and a friendly error for the
 * rest (the first problem found; the good files are still attached).
 * @param {File[]} incoming
 * @param {{ current?: number, maxBytes?: number|null }} opts  maxBytes null = no cap
 * @returns {{ accepted: File[], error: string|null }}
 */
export function validateFiles(incoming, { current = 0, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const max = maxBytes === null ? Infinity : (maxBytes || DEFAULT_MAX_BYTES);
  const accepted = [];
  const problems = [];
  for (const f of incoming || []) {
    if (!f) continue;
    // A dropped folder shows up as a 0-byte File with no type.
    if (!f.size && !f.type) { problems.push(`${f.name || 'That item'} is a folder or empty file.`); continue; }
    if (BLOCKED_EXT.has(extOf(f.name)) || BLOCKED_MIME.has(f.type)) { problems.push(`${f.name}: that file type isn't allowed.`); continue; }
    if (f.size > max) { problems.push(`${f.name} is ${formatBytes(f.size)} — files can be up to ${Math.round(max / 1024 / 1024)} MB.`); continue; }
    accepted.push(f);
  }
  const room = Math.max(0, MAX_FILES - current);
  if (accepted.length > room) {
    problems.push(`You can attach up to ${MAX_FILES} files per message.`);
    accepted.length = room;
  }
  return { accepted, error: problems[0] || null };
}

// A drag from the desktop (not text or an element dragged within the page).
export const dragHasFiles = (e) => {
  const types = e?.dataTransfer?.types;
  if (!types) return false;
  return typeof types.includes === 'function' ? types.includes('Files') : Array.from(types).includes('Files');
};
