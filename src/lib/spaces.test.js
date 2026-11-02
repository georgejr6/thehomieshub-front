import { describe, it, expect } from 'vitest';
import { deriveRole, actionsFor, parseReaction, encodeReaction, isHandRaised, limitListeners, spacesError, isMod } from './spaces';

const space = { host: { id: 'h1' }, cohostIds: ['c1'], speakerIds: ['s1'] };

describe('deriveRole', () => {
  it('host id always wins', () => {
    expect(deriveRole({ identity: 'h1', metadata: '{"role":"listener"}', space })).toBe('host');
  });
  it('prefers live metadata over stale space lists', () => {
    expect(deriveRole({ identity: 's1', metadata: '{"role":"listener"}', space })).toBe('listener');
    expect(deriveRole({ identity: 'x', metadata: '{"role":"speaker"}', space })).toBe('speaker');
  });
  it('falls back to space lists, publish permission, then listener', () => {
    expect(deriveRole({ identity: 'c1', metadata: 'not json', space })).toBe('cohost');
    expect(deriveRole({ identity: 's1', space })).toBe('speaker');
    expect(deriveRole({ identity: 'z', canPublish: true, space })).toBe('speaker');
    expect(deriveRole({ identity: 'z', space })).toBe('listener');
  });
});

describe('actionsFor', () => {
  it('listeners and self get nothing', () => {
    expect(actionsFor('listener', 'speaker')).toEqual([]);
    expect(actionsFor('host', 'listener', true)).toEqual([]);
    expect(actionsFor('cohost', 'host')).toEqual([]);
  });
  it('host can cohost speakers; cohost cannot', () => {
    expect(actionsFor('host', 'speaker')).toContain('cohost');
    expect(actionsFor('cohost', 'speaker')).not.toContain('cohost');
    expect(actionsFor('cohost', 'cohost')).toEqual([]);
    expect(actionsFor('host', 'cohost')).toContain('uncohost');
  });
  it('mods can invite listeners', () => {
    expect(actionsFor('cohost', 'listener')).toEqual(['invite', 'remove']);
    expect(isMod('cohost')).toBe(true);
  });
});

describe('reactions and hands', () => {
  it('parses allowed emoji from bytes or string', () => {
    expect(parseReaction(encodeReaction('🔥'))).toBe('🔥');
    expect(parseReaction('{"emoji":"💯"}')).toBe('💯');
  });
  it('rejects junk and unlisted emoji', () => {
    expect(parseReaction('nope')).toBeNull();
    expect(parseReaction('{"emoji":"💩"}')).toBeNull();
    expect(parseReaction(undefined)).toBeNull();
  });
  it('detects raised hands', () => {
    expect(isHandRaised({ hand: '1' })).toBe(true);
    expect(isHandRaised({ hand: '' })).toBe(false);
    expect(isHandRaised(undefined)).toBe(false);
  });
});

describe('limitListeners / spacesError', () => {
  it('caps the grid and reports the rest', () => {
    const r = limitListeners(Array.from({ length: 75 }, (_, i) => i), 60);
    expect(r.shown).toHaveLength(60);
    expect(r.extra).toBe(15);
    expect(limitListeners([1, 2]).extra).toBe(0);
  });
  it('maps 503 spaces_off and 409 already_live', () => {
    expect(spacesError({ response: { status: 503, data: { code: 'spaces_off' } } }).kind).toBe('off');
    const e = spacesError({ response: { status: 409, data: { code: 'already_live', spaceId: 'abc' } } });
    expect(e.kind).toBe('already_live');
    expect(e.spaceId).toBe('abc');
    expect(spacesError({ response: { status: 410, data: {} } }).kind).toBe('ended');
  });
});
