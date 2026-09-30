import { describe, expect, it, vi } from 'vitest';
import { upsertMessage } from './useChat';

vi.mock('@/api/homieshub', () => ({ default: {} }));
vi.mock('@/lib/chatSocket', () => ({ ChatSocket: class {} }));
vi.mock('@/lib/desktopNotify', () => ({ desktopNotify: () => {} }));

const embed = { type: 'link', url: 'https://example.com', title: 'Example' };

describe('upsertMessage (live link previews)', () => {
  it('applies a message.updated preview to the rendered message', () => {
    const list = [{ id: 'a', content: 'https://example.com', embeds: [] }];
    const next = upsertMessage(list, { id: 'a', content: 'https://example.com', embeds: [embed] });
    expect(next[0].embeds).toEqual([embed]);
  });

  it('keeps a preview when the send ack arrives after it', () => {
    const list = [{ id: 'a', content: 'https://example.com', embeds: [embed] }];
    const next = upsertMessage(list, { id: 'a', content: 'https://example.com', embeds: [] });
    expect(next[0].embeds).toEqual([embed]);
  });

  it('keeps a preview over the optimistic copy (matched by nonce)', () => {
    const list = [{ id: 'n1', nonce: 'n1', pending: true, content: 'https://example.com', embeds: [embed] }];
    const next = upsertMessage(list, { id: 'a', nonce: 'n1', content: 'https://example.com' });
    expect(next[0]).toMatchObject({ id: 'a', embeds: [embed], pending: false });
  });

  it('lets message.updated clear a preview (edit removed the link)', () => {
    const list = [{ id: 'a', content: 'x', editedAt: 't1', embeds: [embed] }];
    const next = upsertMessage(list, { id: 'a', content: 'x', editedAt: 't1', embeds: [] }, { authoritative: true });
    expect(next[0].embeds).toEqual([]);
  });

  it('lets a newer edit drop the preview', () => {
    const list = [{ id: 'a', content: 'https://example.com', embeds: [embed] }];
    const next = upsertMessage(list, { id: 'a', content: 'no link now', embeds: [], editedAt: '2026-09-30T00:00:00Z' });
    expect(next[0].embeds).toEqual([]);
  });
});
