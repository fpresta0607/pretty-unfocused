import { describe, expect, it } from 'vitest';

import { groupWordsByOffset } from './split-lines.ts';

describe('groupWordsByOffset', () => {
  it.each([
    [[], [], []],
    [['New'], [0], [['New']]],
    [['New', 'episode', 'every'], [0, 0, 0], [['New', 'episode', 'every']]],
    [['New', 'episode', 'every', 'Monday'], [0, 0, 24, 24], [['New', 'episode'], ['every', 'Monday']]],
    [['a', 'b', 'c'], [0, 20, 40], [['a'], ['b'], ['c']]],
  ])('groups %j at offsets %j into lines', (words, offsets, expected) => {
    expect(groupWordsByOffset(words, offsets)).toEqual(expected);
  });
});
