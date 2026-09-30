import { beforeEach, describe, expect, it } from 'vitest';
import { shouldShowPill, pillLabel, songPath, trackKey, readDismissed, saveDismissed } from './nowPlaying';

const track = { id: 't1', title: 'Night Drive', artist: 'Mwosa' };
const base = { track, hasEnteredMediaMode: true, hasSource: true, currentVideo: null, dismissedId: '' };

describe('shouldShowPill', () => {
  it('shows for a loaded track', () => expect(shouldShowPill(base)).toBe(true));
  it('hides with no track', () => expect(shouldShowPill({ ...base, track: null })).toBe(false));
  it('hides for the catalog pre-selected track that was never loaded', () => {
    expect(shouldShowPill({ ...base, hasSource: false })).toBe(false);
    expect(shouldShowPill({ ...base, hasEnteredMediaMode: false })).toBe(false);
  });
  it('hides while a video has taken over', () => expect(shouldShowPill({ ...base, currentVideo: { id: 'v' } })).toBe(false));
  it('hides for the dismissed track, comes back for a different one', () => {
    expect(shouldShowPill({ ...base, dismissedId: 't1' })).toBe(false);
    expect(shouldShowPill({ ...base, dismissedId: 't1', track: { id: 't2', title: 'Other' } })).toBe(true);
  });
  it('matches numeric ids against the stored string', () => {
    expect(shouldShowPill({ ...base, track: { id: 42, title: 'x' }, dismissedId: '42' })).toBe(false);
  });
});

describe('labels and links', () => {
  it('formats Title · Artist', () => expect(pillLabel(track)).toBe('Night Drive · Mwosa'));
  it('drops the artist when missing', () => expect(pillLabel({ title: 'Solo' })).toBe('Solo'));
  it('falls back when untitled', () => expect(pillLabel({})).toBe('Now playing'));
  it('links to the song page', () => expect(songPath(track)).toBe('/song/t1'));
  it('no link without an id', () => expect(songPath({ title: 'x' })).toBeNull());
  it('uses _id when id is missing', () => expect(trackKey({ _id: 'abc' })).toBe('abc'));
});

describe('dismissal storage', () => {
  beforeEach(() => sessionStorage.clear());
  it('round-trips through sessionStorage', () => {
    expect(readDismissed()).toBe('');
    saveDismissed('t1');
    expect(readDismissed()).toBe('t1');
    saveDismissed('');
    expect(readDismissed()).toBe('');
  });
});
