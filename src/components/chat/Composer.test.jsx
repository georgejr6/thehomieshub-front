import React, { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Composer from './Composer';

vi.mock('./EmojiPicker', () => ({ default: () => null }));
vi.mock('./CreateDialogs', () => ({ PollDialog: () => null, EventDialog: () => null }));

const MB = 1024 * 1024;
const png = (name = 'image.png', size = 100) => {
  const f = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

function setup({ can = { send: true, attach: true }, uploadMaxBytes = 20 * MB } = {}) {
  localStorage.clear();
  const ref = createRef();
  const onError = vi.fn();
  const actions = {
    typing: vi.fn(),
    searchMembers: vi.fn().mockResolvedValue([]),
    uploadFiles: vi.fn().mockResolvedValue([{ url: 'https://cdn/x.png', type: 'image', name: 'x.png' }]),
    sendMessage: vi.fn().mockResolvedValue({ message: {} }),
  };
  render(
    <Composer
      ref={ref}
      channel={{ id: 'c1', name: 'general', type: 'text', can }}
      state={{ me: { id: 'me', uploadMaxBytes }, typing: {}, users: {} }}
      actions={actions}
      replyTo={null}
      clearReply={() => {}}
      onError={onError}
      onEditLast={() => {}}
    />
  );
  return { ref, onError, actions, input: screen.getByPlaceholderText('Message #general') };
}

const paste = (el, { files = [], text = '' } = {}) => fireEvent.paste(el, {
  clipboardData: {
    files,
    items: [],
    types: [...(files.length ? ['Files'] : []), ...(text ? ['text/plain'] : [])],
    getData: (t) => (t === 'text/plain' ? text : ''),
  },
});

describe('Composer attachments', () => {
  it('attaches a pasted screenshot with a preview and a remove button', () => {
    const { input } = setup();
    paste(input, { files: [png()] });
    const remove = screen.getByRole('button', { name: /^Remove screenshot-/ });
    expect(remove).toBeInTheDocument();
    fireEvent.click(remove);
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
  });

  it('pastes text as text even when the clipboard also has a file', () => {
    const { input } = setup();
    paste(input, { files: [png()], text: 'hello' });
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
  });

  it('takes several dropped files through the ref and reports rejects', () => {
    const { ref, onError } = setup();
    act(() => ref.current.addFiles([png('a.png'), png('b.png'), png('big.png', 25 * MB)]));
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/big\.png .*up to 20 MB/));
  });

  it('refuses files where attaching is not allowed', () => {
    const { ref, onError } = setup({ can: { send: true, attach: false } });
    act(() => ref.current.addFiles([png('a.png')]));
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/can't upload/));
  });

  it('uploads the files and sends them with the caption', async () => {
    const { ref, input, actions } = setup();
    act(() => ref.current.addFiles([png('a.png'), png('b.png')]));
    fireEvent.change(input, { target: { value: 'look at this', selectionStart: 12 } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(actions.sendMessage).toHaveBeenCalled());
    const [channelId, files] = actions.uploadFiles.mock.calls[0];
    expect(channelId).toBe('c1');
    expect(files.map((f) => f.name)).toEqual(['a.png', 'b.png']);
    expect(actions.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      channelId: 'c1', content: 'look at this', attachments: [{ url: 'https://cdn/x.png', type: 'image', name: 'x.png' }],
    }));
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
  });

  it('puts the files back when the upload fails', async () => {
    const { ref, input, actions, onError } = setup();
    actions.uploadFiles.mockRejectedValueOnce({ response: { data: { message: 'Files can be up to 20 MB.' } } });
    act(() => ref.current.addFiles([png('a.png')]));
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Files can be up to 20 MB.'));
    expect(screen.getByRole('button', { name: 'Remove a.png' })).toBeInTheDocument();
    expect(actions.sendMessage).not.toHaveBeenCalled();
  });
});
