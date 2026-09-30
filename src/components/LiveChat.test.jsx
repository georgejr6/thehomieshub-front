import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LiveChat from './LiveChat';

let mockUser = null;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('@/api/homieshub', () => ({ default: { get: vi.fn().mockResolvedValue({ data: { result: { messages: [] } } }) } }));

class FakeSocket {
  static all = [];
  constructor(url) { this.url = url; this.sent = []; this.readyState = 0; FakeSocket.all.push(this); }
  send(d) { this.sent.push(JSON.parse(d)); }
  close() { this.readyState = 3; this.onclose?.(); }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(m) { this.onmessage?.({ data: JSON.stringify(m) }); }
}

beforeEach(() => {
  FakeSocket.all = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  Element.prototype.scrollIntoView = () => {};
  localStorage.clear();
});
afterEach(() => { vi.unstubAllGlobals(); mockUser = null; });

describe('LiveChat socket identity', () => {
  it('never puts a username in the URL and signs in with an auth frame', () => {
    mockUser = { _id: 'u1', username: 'spoofme' };
    localStorage.setItem('access_token', 'jwt-123');
    render(<LiveChat streamId="s1" />);
    const ws = FakeSocket.all[0];
    expect(ws.url).toContain('streamId=s1');
    expect(ws.url).not.toMatch(/username|avatarUrl|token/);
    act(() => ws.open());
    expect(ws.sent[0]).toEqual({ type: 'auth', token: 'jwt-123' });
    expect(screen.getByPlaceholderText('Connecting...')).toBeDisabled();

    act(() => ws.receive({ type: 'auth_ok', username: 'realname' }));
    const input = screen.getByPlaceholderText('Say something...');
    expect(input).not.toBeDisabled();
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.submit(input.closest('form'));
    expect(ws.sent[1]).toEqual({ type: 'chat', content: 'hi' });

    // Own messages are recognised by the name the server confirmed.
    act(() => ws.receive({ type: 'chat', id: 'm1', username: 'realname', content: 'hi' }));
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('guests stay read-only with a log-in prompt', () => {
    const onLoginRequest = vi.fn();
    render(<LiveChat streamId="s1" onLoginRequest={onLoginRequest} />);
    const ws = FakeSocket.all[0];
    act(() => ws.open());
    expect(ws.sent).toEqual([]);
    act(() => ws.receive({ type: 'system', code: 'auth_required', content: 'Sign in to chat.' }));
    expect(screen.queryByText('Sign in to chat.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Log in to chat' }));
    expect(onLoginRequest).toHaveBeenCalled();
  });

  it('shows the log-in prompt when the server refuses the token', () => {
    mockUser = { _id: 'u1', username: 'x' };
    localStorage.setItem('access_token', 'expired');
    render(<LiveChat streamId="s1" onLoginRequest={() => {}} />);
    const ws = FakeSocket.all[0];
    act(() => ws.open());
    act(() => ws.receive({ type: 'auth_error', code: 'auth_failed' }));
    expect(screen.getByText(/Couldn't sign you into chat/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in to chat' })).toBeInTheDocument();
  });
});
