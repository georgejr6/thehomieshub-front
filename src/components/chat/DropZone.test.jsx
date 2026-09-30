import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import DropZone from './DropZone';

const png = () => new File(['x'], 'pic.png', { type: 'image/png' });
const filesDrag = (files = []) => ({ dataTransfer: { types: ['Files'], files, dropEffect: 'none' } });
// jsdom has no DragEvent, so set relatedTarget (where the pointer went) by hand.
const leave = (el, to) => {
  const ev = createEvent.dragLeave(el, filesDrag());
  Object.defineProperty(ev, 'relatedTarget', { value: to });
  fireEvent(el, ev);
};

function setup(props = {}) {
  const onFiles = vi.fn();
  const onRejected = vi.fn();
  render(
    <DropZone enabled label="Drop to upload to #general" disabledLabel="You can't upload files here" onFiles={onFiles} onRejected={onRejected} {...props}>
      <div data-testid="list"><p data-testid="child">hello</p></div>
    </DropZone>
  );
  return { onFiles, onRejected, zone: screen.getByTestId('chat-drop-zone') };
}

describe('DropZone', () => {
  it('shows the channel overlay while files are dragged over it', () => {
    const { zone } = setup();
    expect(screen.queryByText('Drop to upload to #general')).toBeNull();
    fireEvent.dragEnter(zone, filesDrag());
    expect(screen.getByRole('status')).toHaveTextContent('Drop to upload to #general');
  });

  it('does not flicker when the pointer crosses child elements', () => {
    const { zone } = setup();
    fireEvent.dragEnter(zone, filesDrag());
    fireEvent.dragEnter(screen.getByTestId('child'), filesDrag());
    leave(zone, screen.getByTestId('child'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    leave(screen.getByTestId('child'), document.body);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('clears the overlay when the drag leaves the window or is cancelled', () => {
    const { zone } = setup();
    fireEvent.dragEnter(zone, filesDrag());
    fireEvent.dragEnter(screen.getByTestId('child'), filesDrag());
    leave(screen.getByTestId('child'), null);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hands every dropped file to the composer', () => {
    const { zone, onFiles } = setup();
    const files = [png(), png()];
    fireEvent.dragEnter(zone, filesDrag());
    fireEvent.drop(zone, filesDrag(files));
    expect(onFiles).toHaveBeenCalledWith(files);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('refuses drops where you cannot upload', () => {
    const { zone, onFiles, onRejected } = setup({ enabled: false });
    fireEvent.dragEnter(zone, filesDrag());
    expect(screen.getByRole('status')).toHaveTextContent("You can't upload files here");
    fireEvent.drop(zone, filesDrag([png()]));
    expect(onFiles).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalled();
  });

  it('leaves dropped folders out', () => {
    const { zone, onFiles, onRejected } = setup();
    const file = png();
    const folder = new File([''], 'Pics', { type: '' });
    const items = [{ webkitGetAsEntry: () => ({ isDirectory: true }) }, { webkitGetAsEntry: () => ({ isDirectory: false }) }];
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [folder, file], items } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [folder], items: items.slice(0, 1) } });
    expect(onRejected).toHaveBeenCalledWith(expect.stringMatching(/Folders/));
  });

  it('ignores text and in-page drags', () => {
    const { zone, onFiles } = setup();
    fireEvent.dragEnter(zone, { dataTransfer: { types: ['text/plain'] } });
    fireEvent.drop(zone, { dataTransfer: { types: ['text/plain'], files: [] } });
    expect(screen.queryByRole('status')).toBeNull();
    expect(onFiles).not.toHaveBeenCalled();
  });
});
