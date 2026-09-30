import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '@/api/homieshub';
import { CampaignComposer, CampaignHistory } from './PushCampaigns';

vi.mock('@/api/homieshub', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('CampaignComposer', () => {
  beforeEach(() => {
    api.post.mockReset();
    api.post.mockImplementation((url) => (url === '/admin/push/campaigns/preview'
      ? Promise.resolve({ data: { result: { count: 42 } } })
      : Promise.resolve({ data: { result: {} } })));
  });

  it('shows the live count, confirms, and sends the exact payload', async () => {
    const onCreate = vi.fn().mockResolvedValue();
    render(<CampaignComposer onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Drop day' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'New merch is live' } });
    fireEvent.change(screen.getByLabelText(/Link/), { target: { value: '/shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Promo' }));
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'inactive' } });
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '14' } });

    await waitFor(() => expect(screen.getByTestId('recipient-count')).toHaveTextContent('42 recipients'));
    expect(api.post).toHaveBeenCalledWith('/admin/push/campaigns/preview', { audience: { type: 'inactive', days: 14 }, category: 'promo' });

    fireEvent.click(screen.getByRole('button', { name: /Review & send/ }));
    expect(await screen.findByText('Send this push now?')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      title: 'Drop day', body: 'New merch is live', url: '/shop', category: 'promo', audience: { type: 'inactive', days: 14 },
      expectedCount: 42, // count-before-send: the server 409s if the audience moved
    }));
  });

  it('schedules with an ISO time', async () => {
    const d = new Date(Date.now() + 3 * 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const SOON = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:30`;
    const onCreate = vi.fn().mockResolvedValue();
    render(<CampaignComposer onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Later' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Body' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    fireEvent.change(screen.getByLabelText('Send at'), { target: { value: SOON } });
    fireEvent.click(screen.getByRole('button', { name: /Review & schedule/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' , hidden: false }));
    // expectedCount rides along only if the debounced preview already answered.
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Later', body: 'Body', category: 'announcement', audience: { type: 'all' },
      scheduledAt: new Date(SOON).toISOString(),
    })));
    expect(Object.keys(onCreate.mock.calls[0][0]).filter((k) => k !== 'expectedCount').sort()).toEqual(['audience', 'body', 'category', 'scheduledAt', 'title']);
  });

  it('shows "unavailable" when the preview API 404s', async () => {
    api.post.mockRejectedValue({ response: { status: 404 } });
    render(<CampaignComposer onCreate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('recipient-count')).toHaveTextContent('Recipient count unavailable'));
  });

  it('review is disabled until title and message are filled', () => {
    render(<CampaignComposer onCreate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Review & send/ })).toBeDisabled();
  });
});

describe('CampaignHistory', () => {
  it('lists campaigns and only scheduled ones can be cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onCancel = vi.fn().mockResolvedValue();
    render(<CampaignHistory
      campaigns={[
        { id: 'a', title: 'Sent one', body: 'b', status: 'sent', audience: { type: 'all' }, counts: { recipients: 10, sent: 9, failed: 1 } },
        { id: 'b', title: 'Later one', body: 'b', status: 'scheduled', audience: { type: 'members' }, scheduledAt: '2026-12-01T18:30:00Z' },
      ]}
      onRefresh={vi.fn()}
      onCancel={onCancel}
    />);
    expect(screen.getByText('Sent one')).toBeInTheDocument();
    const cancels = screen.getAllByRole('button', { name: /Cancel/ });
    expect(cancels).toHaveLength(1);
    fireEvent.click(cancels[0]);
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith('b'));
  });
});
