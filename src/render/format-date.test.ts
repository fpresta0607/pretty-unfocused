import { describe, expect, it } from 'vitest';

import { formatShortDate } from './format-date.ts';

describe('formatShortDate', () => {
  it.each([
    ['2026-11-23T12:00:11.000Z', 'Nov 23'],
    ['2026-03-01T00:00:00.000Z', 'Mar 1'],
    ['2026-12-31T23:59:59.000Z', 'Dec 31'],
    ['2026-10-27T01:00:03+00:00', 'Oct 27'],
  ])('formats %s as %s in UTC', (isoTimestamp, expected) => {
    expect(formatShortDate(isoTimestamp)).toBe(expected);
  });
});
