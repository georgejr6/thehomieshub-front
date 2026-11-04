import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGuestPreview, GUEST_PREVIEW_SEC } from './guestPreview';

describe('useGuestPreview', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });

  it('walls a guest after 2 minutes and remembers it across mounts', () => {
    const { result, unmount } = renderHook(() => useGuestPreview('ls:a', true, true));
    expect(result.current.left).toBe(GUEST_PREVIEW_SEC);
    act(() => { vi.advanceTimersByTime(GUEST_PREVIEW_SEC * 1000); });
    expect(result.current.walled).toBe(true);
    unmount();
    const again = renderHook(() => useGuestPreview('ls:a', true, true));
    expect(again.result.current.walled).toBe(true); // first render, no flash
  });

  it('never walls a signed-in viewer and does not count while not playing', () => {
    const signed = renderHook(() => useGuestPreview('ls:b', false, true));
    act(() => { vi.advanceTimersByTime(300000); });
    expect(signed.result.current).toEqual({ walled: false, left: null });
    const idle = renderHook(() => useGuestPreview('ls:c', true, false));
    act(() => { vi.advanceTimersByTime(60000); });
    expect(idle.result.current.left).toBe(GUEST_PREVIEW_SEC);
  });

  it('switching broadcasts uses the new one\'s own time', () => {
    const { result, rerender } = renderHook(({ id }) => useGuestPreview(id, true, true), { initialProps: { id: 'ls:d' } });
    act(() => { vi.advanceTimersByTime(GUEST_PREVIEW_SEC * 1000); });
    expect(result.current.walled).toBe(true);
    rerender({ id: 'ls:e' });
    expect(result.current.walled).toBe(false);
    expect(result.current.left).toBe(GUEST_PREVIEW_SEC);
    rerender({ id: 'ls:d' });
    expect(result.current.walled).toBe(true);
  });
});
