import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OAuthCallbackPage from './OAuthCallbackPage';

const toast = vi.fn();
const navigate = vi.fn();
const setAccessToken = vi.fn(() => Promise.resolve());
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ setAccessToken }) }));
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }));

const renderAt = (qs) => render(<MemoryRouter initialEntries={[`/auth/callback?${qs}`]}><OAuthCallbackPage /></MemoryRouter>);

describe('OAuthCallbackPage', () => {
  beforeEach(() => { toast.mockClear(); navigate.mockClear(); setAccessToken.mockClear(); localStorage.clear(); });

  it.each([
    ['youtube_channel_taken', /linked to another The Homies account/],
    ['email_exists_unverified', /Sign in with your password/],
    ['youtube_no_channel', /No YouTube channel was found/],
    ['google_failed', /Please try again/],
  ])('shows a friendly toast for %s', async (code, text) => {
    renderAt(`error=${code}`);
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast.mock.calls[0][0].description).toMatch(text);
    expect(toast.mock.calls[0][0].variant).toBe('destructive');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('signs in and lands on a same-site ?return= path', async () => {
    renderAt('token=abc&return=%2Flive%3Fx%3D1');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/live?x=1'));
    expect(setAccessToken).toHaveBeenCalledWith('abc');
  });

  it.each(['//evil.com', '/\\evil.com', '/a%09b', '/a%0d%0ab', 'https://evil.com'])('ignores unsafe return %s', async (ret) => {
    renderAt(`token=abc&return=${encodeURIComponent(decodeURIComponent(ret))}`);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });
});
