import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NowPlayingPill from './NowPlayingPill';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }));
let media;
vi.mock('@/contexts/MediaContext', () => ({ useMedia: () => media }));

const audioWith = (src) => { const a = document.createElement('audio'); if (src) a.setAttribute('src', src); return { current: a }; };
const renderPill = () => render(<MemoryRouter><NowPlayingPill /></MemoryRouter>);

describe('NowPlayingPill', () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigate.mockReset();
    media = {
      currentTrack: { id: 't1', title: 'Night Drive', artist: 'Mwosa' },
      isPlaying: true, isLoading: false, togglePlay: vi.fn(),
      hasEnteredMediaMode: true, currentVideo: null, audioRef: audioWith('https://cdn/a.mp3'),
    };
  });

  it('shows title · artist and toggles play/pause', () => {
    renderPill();
    expect(screen.getByText('Night Drive · Mwosa')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pause'));
    expect(media.togglePlay).toHaveBeenCalled();
  });

  it('renders nothing when no track was loaded into the player', () => {
    media.audioRef = audioWith('');
    const { container } = renderPill();
    expect(container).toBeEmptyDOMElement();
  });

  it('title opens the song page', () => {
    renderPill();
    fireEvent.click(screen.getByText('Night Drive · Mwosa'));
    expect(navigate).toHaveBeenCalledWith('/song/t1');
  });

  it('dismiss hides it for this track only', () => {
    const { rerender } = renderPill();
    fireEvent.click(screen.getByLabelText('Hide now playing'));
    expect(screen.queryByTestId('now-playing-pill')).toBeNull();
    media = { ...media, currentTrack: { id: 't2', title: 'Next One', artist: 'Mwosa' } };
    rerender(<MemoryRouter><NowPlayingPill /></MemoryRouter>);
    expect(screen.getByText('Next One · Mwosa')).toBeInTheDocument();
  });

  it('dismissing the phone bar also hides the header pill (resize across 2xl)', () => {
    render(<MemoryRouter><NowPlayingPill variant="header" /><NowPlayingPill variant="bar" /></MemoryRouter>);
    expect(screen.getAllByTestId('now-playing-pill')).toHaveLength(2);
    fireEvent.click(screen.getAllByLabelText('Hide now playing')[1]);
    expect(screen.queryAllByTestId('now-playing-pill')).toHaveLength(0);
  });
});
