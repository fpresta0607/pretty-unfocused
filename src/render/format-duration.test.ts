import { describe, expect, it } from 'vitest';

import { formatDuration } from './format-duration.ts';

describe('formatDuration', () => {
  it.each([
    ['hours and zero-padded minutes', 3862, '1 h 04'],
    ['hours and two-digit minutes', 4529, '1 h 15'],
    ['an exact hour', 3600, '1 h 00'],
    ['more than two hours', 7384, '2 h 03'],
    ['minutes alone under an hour', 2280, '38 min'],
    ['the last minute before an hour', 3599, '59 min'],
    ['whole minutes only, dropping the seconds', 125, '2 min'],
    ['nothing under a minute', 30, '0 min'],
  ])('writes %s', (_behavior, seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
