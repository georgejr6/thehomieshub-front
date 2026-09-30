import { describe, expect, it } from 'vitest';
import {
  emptyCampaignForm, parseUsernames, buildAudience, validateCampaign, buildCampaignPayload, campaignCounts, audienceLabel,
} from './pushCampaigns';

const form = (patch = {}) => ({ ...emptyCampaignForm(), title: 'Hi', body: 'There', ...patch });

describe('parseUsernames', () => {
  it('splits on commas/spaces, strips @, dedupes', () => {
    expect(parseUsernames('@a, b ,,@c  a @B')).toEqual(['a', 'b', 'c']);
    expect(parseUsernames('')).toEqual([]);
  });
});

describe('buildAudience', () => {
  it('plain types carry only the type', () => {
    for (const t of ['all', 'members', 'free']) expect(buildAudience(form({ audienceType: t, days: 9, usernames: 'x' }))).toEqual({ type: t });
  });
  it('inactive / active carry whole days (min 1)', () => {
    expect(buildAudience(form({ audienceType: 'inactive', days: '14' }))).toEqual({ type: 'inactive', days: 14 });
    expect(buildAudience(form({ audienceType: 'active', days: '7.9' }))).toEqual({ type: 'active', days: 7 });
    expect(buildAudience(form({ audienceType: 'active', days: '' }))).toEqual({ type: 'active', days: 1 });
  });
  it('usernames carries the parsed list', () => {
    expect(buildAudience(form({ audienceType: 'usernames', usernames: '@mwosa, thehomies' }))).toEqual({ type: 'usernames', usernames: ['mwosa', 'thehomies'] });
  });
  it('unknown type falls back to everyone', () => expect(buildAudience(form({ audienceType: 'nope' }))).toEqual({ type: 'all' }));
});

describe('validateCampaign', () => {
  const now = new Date('2026-10-01T12:00:00Z').getTime();
  it('accepts a complete send-now form', () => expect(validateCampaign(form(), now)).toBe(''));
  it('needs title and body', () => {
    expect(validateCampaign(form({ title: '  ' }), now)).toMatch(/title/i);
    expect(validateCampaign(form({ body: '' }), now)).toMatch(/message/i);
  });
  it('needs usernames for the usernames audience', () => {
    expect(validateCampaign(form({ audienceType: 'usernames', usernames: ' , @ ' }), now)).toMatch(/username/i);
  });
  it('needs days >= 1', () => expect(validateCampaign(form({ audienceType: 'inactive', days: 0 }), now)).toMatch(/days/i));
  it('scheduled needs a future time', () => {
    expect(validateCampaign(form({ when: 'schedule', scheduledAt: '' }), now)).toMatch(/date/i);
    expect(validateCampaign(form({ when: 'schedule', scheduledAt: '2026-09-01T10:00' }), now)).toMatch(/future/i);
    expect(validateCampaign(form({ when: 'schedule', scheduledAt: '2026-11-15T10:00' }), now)).toBe('');
    expect(validateCampaign(form({ when: 'schedule', scheduledAt: '2027-01-15T10:00' }), now)).toMatch(/60 days/);
  });
  it('mirrors the server limits', () => {
    expect(validateCampaign(form({ title: 'x'.repeat(66) }), now)).toMatch(/title/i);
    expect(validateCampaign(form({ body: 'x'.repeat(241) }), now)).toMatch(/message/i);
    expect(validateCampaign(form({ audienceType: 'active', days: 366 }), now)).toMatch(/days/i);
    expect(validateCampaign(form({ audienceType: 'active', days: 365 }), now)).toBe('');
  });
  it('links: app paths and https only', () => {
    expect(validateCampaign(form({ url: '/points' }), now)).toBe('');
    expect(validateCampaign(form({ url: 'https://thehomies.app/chat' }), now)).toBe('');
    for (const bad of [['java', 'script:alert(1)'].join(''), '//evil.com', 'http://x.com', 'points']) expect(validateCampaign(form({ url: bad }), now)).toMatch(/link/i);
  });
  it('rejects unknown categories', () => expect(validateCampaign(form({ category: 'spam' }), now)).toMatch(/category/i));
});

describe('buildCampaignPayload', () => {
  it('send-now announcement to everyone: no url / scheduledAt / sourceMessageId keys', () => {
    const p = buildCampaignPayload(form({ title: ' Hello ', body: ' World ' }));
    expect(p).toEqual({ title: 'Hello', body: 'World', category: 'announcement', audience: { type: 'all' } });
  });
  it('promo, inactive 30 days, link, scheduled (ISO), source message', () => {
    const local = '2026-12-01T18:30';
    const p = buildCampaignPayload(
      form({ category: 'promo', audienceType: 'inactive', days: 30, url: ' /memberships ', when: 'schedule', scheduledAt: local }),
      { sourceMessageId: 123 },
    );
    expect(p).toEqual({
      title: 'Hi', body: 'There', category: 'promo',
      audience: { type: 'inactive', days: 30 },
      url: '/memberships',
      scheduledAt: new Date(local).toISOString(),
      sourceMessageId: '123',
    });
  });
  it('a schedule time is ignored when sending now', () => {
    expect(buildCampaignPayload(form({ when: 'now', scheduledAt: '2026-12-01T18:30' }))).not.toHaveProperty('scheduledAt');
  });
});

describe('history helpers', () => {
  it('reads counts flat or nested', () => {
    expect(campaignCounts({ recipients: 10, sent: 8, failed: 2 })).toEqual({ recipients: 10, sent: 8, failed: 2 });
    expect(campaignCounts({ counts: { targeted: 5, sent: 4, errors: 1 } })).toEqual({ recipients: 5, sent: 4, failed: 1 });
    expect(campaignCounts({ stats: { sentCount: 3 } })).toEqual({ recipients: null, sent: 3, failed: null });
  });
  it('labels audiences', () => {
    expect(audienceLabel({ type: 'inactive', days: 14 })).toBe('Inactive 14+ days');
    expect(audienceLabel({ type: 'all' })).toBe('Everyone');
    expect(audienceLabel({ type: 'usernames', usernames: ['a'] })).toBe('1 user');
    expect(audienceLabel(null)).toBe('—');
  });
});
