import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/tracker', () => ({ trackEvent: vi.fn() }));

import DesktopAppRow from './DesktopAppRow';

const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const setUA = (ua) => {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('');
};
const renderRow = () => render(<MemoryRouter><DesktopAppRow surface="test" /></MemoryRouter>);

afterEach(() => {
  vi.restoreAllMocks();
  delete window.homiesDesktop;
});

describe('DesktopAppRow', () => {
  it('offers the detected OS build plus the others on a desktop browser', () => {
    setUA(WIN_UA);
    renderRow();
    expect(screen.getByText('Also on desktop')).toBeInTheDocument();
    const primary = screen.getByRole('link', { name: /download for windows/i });
    expect(primary).toHaveAttribute('href', expect.stringMatching(/TheHomies-Setup\.exe$/));
    expect(screen.getByRole('link', { name: 'Mac' })).toHaveAttribute('href', expect.stringMatching(/TheHomies\.dmg$/));
    expect(screen.getByRole('link', { name: 'Linux' })).toHaveAttribute('href', expect.stringMatching(/TheHomies\.AppImage$/));
    expect(screen.getByRole('link', { name: 'All options' })).toHaveAttribute('href', '/desktop');
  });

  it('is only a quiet link to /desktop on phones', () => {
    setUA(IPHONE_UA);
    renderRow();
    expect(screen.queryByRole('link', { name: /download for/i })).toBeNull();
    expect(screen.getByRole('link', { name: /windows, mac & linux/i })).toHaveAttribute('href', '/desktop');
  });

  it('renders nothing inside The Homies desktop app', () => {
    setUA(WIN_UA);
    window.homiesDesktop = { isDesktop: true };
    const { container } = renderRow();
    expect(container).toBeEmptyDOMElement();
  });
});
