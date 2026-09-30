/* eslint-disable no-script-url */ // the tests feed unsafe urls on purpose
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Embed, { EmbedPlaceholder, embedImageUrl } from './Embed';

vi.mock('./ChatMarkdown', () => ({ default: ({ text }) => <span>{text}</span>, roleColor: () => '#fff' }));

const ctx = {};

describe('Embed', () => {
  it('renders a direct image link as a zoomable image without a referrer', () => {
    const onOpenImage = vi.fn();
    const { container } = render(<Embed e={{ type: 'image', url: 'https://i.imgur.com/a.png', thumbnail: { url: 'https://i.imgur.com/a.png' } }} ctx={ctx} onOpenImage={onOpenImage} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://i.imgur.com/a.png');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.click(screen.getByRole('button', { name: 'Open image' }));
    expect(onOpenImage).toHaveBeenCalledWith('https://i.imgur.com/a.png');
  });

  it('plays Tenor/Giphy/mp4 gifs as looping muted video with the still as poster', () => {
    const { container } = render(<Embed e={{ type: 'gifv', url: 'https://tenor.com/view/x', video: { url: 'https://media.tenor.com/x.mp4' }, thumbnail: { url: 'https://media.tenor.com/x.png' } }} ctx={ctx} />);
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://media.tenor.com/x.mp4');
    expect(video).toHaveAttribute('poster', 'https://media.tenor.com/x.png');
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
  });

  it('falls back to the still when a gif has no usable video url', () => {
    const { container } = render(<Embed e={{ type: 'gifv', video: { url: 'javascript:alert(1)' }, thumbnail: { url: 'https://media.giphy.com/media/x/giphy.gif' } }} ctx={ctx} />);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://media.giphy.com/media/x/giphy.gif');
  });

  it('renders a link card with site, title link, description and thumbnail', () => {
    const { container } = render(<Embed e={{ type: 'link', url: 'https://example.com/post', title: 'A post', description: 'About things', provider: { name: 'Example' }, thumbnail: { url: 'https://example.com/og.jpg' } }} ctx={ctx} />);
    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'A post' })).toHaveAttribute('href', 'https://example.com/post');
    expect(screen.getByText('About things')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/og.jpg');
  });

  it('renders video links as a big thumbnail that opens the link', () => {
    render(<Embed e={{ type: 'video', url: 'https://youtube.com/watch?v=1', title: 'Clip', provider: { name: 'YouTube' }, thumbnail: { url: 'https://i.ytimg.com/vi/1/hq.jpg' } }} ctx={ctx} />);
    expect(screen.getByRole('link', { name: 'Play Clip' })).toHaveAttribute('href', 'https://youtube.com/watch?v=1');
  });

  it('never renders unsafe urls', () => {
    const { container } = render(<Embed e={{ type: 'image', thumbnail: { url: 'javascript:alert(1)' } }} ctx={ctx} />);
    expect(container).toBeEmptyDOMElement();
    expect(embedImageUrl({ type: 'rich', image: { url: 'data:image/png;base64,xx' } })).toBeNull();
  });

  it('hides media that fails to load', () => {
    const { container } = render(<Embed e={{ type: 'image', thumbnail: { url: 'https://gone.example/a.png' } }} ctx={ctx} />);
    const img = container.querySelector('img');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('has a placeholder for previews on their way', () => {
    render(<EmbedPlaceholder />);
    expect(screen.getByTestId('embed-placeholder')).toBeInTheDocument();
  });
});
