import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '@/api/homieshub';
import SendAsPushDialog from './SendAsPushDialog';

vi.mock('@/api/homieshub', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('SendAsPushDialog', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockResolvedValue({ data: { result: { title: 'Mwosa in #general', body: 'Stream at 9', url: 'https://thehomies.app/chat/c1' } } });
    api.post.mockImplementation((url) => (url === '/admin/push/campaigns/preview'
      ? Promise.resolve({ data: { result: { count: 7 } } })
      : Promise.resolve({ data: { result: { id: 'camp1' } } })));
  });

  it('prefills from the draft, confirms, and creates an announcement tied to the message', async () => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(<SendAsPushDialog message={{ id: 'm9', content: 'Stream at 9' }} onClose={onClose} onDone={onDone} />);
    expect(api.get).toHaveBeenCalledWith('/admin/push/from-chat/m9/draft');
    expect(await screen.findByDisplayValue('Mwosa in #general')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('7 people will get this')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/push/campaigns', {
      title: 'Mwosa in #general', body: 'Stream at 9', url: 'https://thehomies.app/chat/c1',
      category: 'announcement', audience: { type: 'all' }, sourceMessageId: 'm9',
    }));
    expect(onDone).toHaveBeenCalledWith('Push sent to 7 people.');
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to the message text and says so when the API is missing', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    render(<SendAsPushDialog message={{ id: 'm9', content: 'Hello all', author: { username: 'mwosa' } }} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByDisplayValue('Hello all')).toBeInTheDocument();
    expect(screen.getByText("Push campaigns aren't available on the server yet.")).toBeInTheDocument();
  });
});
