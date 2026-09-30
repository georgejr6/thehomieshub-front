import { describe, expect, it } from 'vitest';
import { apiErrorCode, isBannedError, isBlockedError, safeAppealUrl } from './apiErrors';

const err = (status, data) => ({ response: { status, data } });

describe('apiErrorCode', () => {
  it('reads the top-level code (banGate), the envelope error code and legacy strings', () => {
    expect(apiErrorCode(err(403, { code: 'banned', error: 'account_banned', appealUrl: 'https://www.thehomies.app/appeal' }))).toBe('banned');
    expect(apiErrorCode(err(403, { status: false, error: { code: 'blocked' } }))).toBe('blocked');
    expect(apiErrorCode(err(403, { error: 'account_banned' }))).toBe('banned');
    expect(apiErrorCode(err(402, { error: 'membership_required' }))).toBe('membership_required');
    expect(apiErrorCode({})).toBeNull();
  });

  it('classifies banned and blocked 403s only', () => {
    expect(isBannedError(err(403, { code: 'banned' }))).toBe(true);
    expect(isBannedError(err(400, { code: 'banned' }))).toBe(false);
    expect(isBlockedError(err(403, { error: { code: 'blocked' } }))).toBe(true);
    expect(isBlockedError(err(403, { code: 'banned' }))).toBe(false);
  });
});

describe('safeAppealUrl', () => {
  it('keeps our appeal page and refuses foreign links', () => {
    expect(safeAppealUrl('https://www.thehomies.app/appeal')).toBe('/appeal');
    expect(safeAppealUrl('/appeal?x=1')).toBe('/appeal?x=1');
    expect(safeAppealUrl('https://evil.example/appeal')).toBe('/appeal');
    expect(safeAppealUrl('javascript:alert(1)')).toBe('/appeal'); // eslint-disable-line no-script-url
    expect(safeAppealUrl(undefined)).toBe('/appeal');
  });
});
