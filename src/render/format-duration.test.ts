import { describe, expect, it } from 'vitest';

import { formatDuration } from './format-duration.ts';

describe('formatDuration', () => {
  it.each([
    [4529, '1 h 15'],
    [3600, '1 h 00'],
    [3900, '1 h 05'],
    [7384, '2 h 03'],
    [3599, '59 min'],
    [2280, '38 min'],
    [2666, '44 min'],
    [59, '0 min'],
  ])('formats %i seconds as %s', (durationSeconds, expected) => {
    expect(formatDuration(durationSeconds)).toBe(expected);
  });
});
