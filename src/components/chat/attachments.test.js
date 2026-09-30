import { describe, expect, it } from 'vitest';
import { MAX_FILES, dragHasFiles, fileKind, formatBytes, renamePasted, validateFiles } from './attachments';

const file = (name, size, type) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const MB = 1024 * 1024;

describe('validateFiles', () => {
  it('accepts images, gifs, videos and documents under the cap', () => {
    const list = [file('a.png', MB, 'image/png'), file('b.gif', MB, 'image/gif'), file('c.mp4', 5 * MB, 'video/mp4'), file('d.pdf', 10, 'application/pdf')];
    expect(validateFiles(list)).toEqual({ accepted: list, error: null });
  });

  it('rejects files over the size cap with a friendly message and keeps the rest', () => {
    const ok = file('ok.png', MB, 'image/png');
    const { accepted, error } = validateFiles([file('huge.mov', 30 * MB, 'video/quicktime'), ok]);
    expect(accepted).toEqual([ok]);
    expect(error).toMatch(/huge\.mov is 30 MB — files can be up to 20 MB/);
  });

  it('honours the server cap, and null means no cap', () => {
    const big = file('big.mp4', 50 * MB, 'video/mp4');
    expect(validateFiles([big], { maxBytes: 100 * MB }).accepted).toEqual([big]);
    expect(validateFiles([big], { maxBytes: null }).accepted).toEqual([big]);
    expect(validateFiles([big], { maxBytes: undefined }).accepted).toEqual([]);
  });

  it('blocks types the server refuses to host', () => {
    for (const f of [file('x.svg', 10, 'image/svg+xml'), file('page.html', 10, 'text/html'), file('run.exe', 10, ''), file('a.JS', 10, '')]) {
      const r = validateFiles([f]);
      expect(r.accepted).toEqual([]);
      expect(r.error).toMatch(/isn't allowed/);
    }
  });

  it('rejects dropped folders', () => {
    expect(validateFiles([file('My Folder', 0, '')]).error).toMatch(/folder/);
  });

  it('caps the tray at 10 files including those already attached', () => {
    const list = Array.from({ length: 4 }, (_, i) => file(`${i}.png`, 10, 'image/png'));
    const r = validateFiles(list, { current: MAX_FILES - 2 });
    expect(r.accepted).toHaveLength(2);
    expect(r.error).toMatch(/up to 10 files/);
  });
});

describe('helpers', () => {
  it('renames clipboard screenshots uniquely and leaves real names alone', () => {
    const at = new Date('2026-09-30T12:34:56Z');
    const a = renamePasted(file('image.png', 10, 'image/png'), at);
    const b = renamePasted(file('image.png', 10, 'image/png'), at);
    expect(a.name).toMatch(/^screenshot-20260930-123456(-\d+)?\.png$/);
    expect(a.name).not.toBe(b.name);
    expect(a.type).toBe('image/png');
    const named = file('holiday.jpg', 10, 'image/jpeg');
    expect(renamePasted(named)).toBe(named);
  });

  it('classifies and formats', () => {
    expect(fileKind({ type: 'image/gif' })).toBe('image');
    expect(fileKind({ type: 'video/webm' })).toBe('video');
    expect(fileKind({ type: '' })).toBe('file');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * MB)).toBe('1.5 MB');
  });

  it('only treats desktop file drags as uploads', () => {
    expect(dragHasFiles({ dataTransfer: { types: ['Files'] } })).toBe(true);
    expect(dragHasFiles({ dataTransfer: { types: ['text/plain', 'text/uri-list'] } })).toBe(false);
    expect(dragHasFiles({})).toBe(false);
  });
});
