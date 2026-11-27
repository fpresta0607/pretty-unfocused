import { describe, expect, it } from 'vitest';

import { excerptDescription } from './excerpt-description.ts';

describe('excerptDescription', () => {
  it('keeps a description that fits whole', () => {
    expect(excerptDescription('Short and sweet.', 300)).toBe('Short and sweet.');
  });

  it('keeps a description exactly at the limit whole', () => {
    expect(excerptDescription('abcde fghij', 11)).toBe('abcde fghij');
  });

  it('cuts at the last whole word and adds an ellipsis', () => {
    expect(excerptDescription('one two three four', 14)).toBe('one two three…');
  });

  it('never ends on a half word', () => {
    expect(excerptDescription('one two threefour', 14)).toBe('one two…');
  });

  it('trims the space before the ellipsis', () => {
    expect(excerptDescription('one two  three four', 9)).toBe('one two…');
  });

  it('cuts a single long word at the limit', () => {
    expect(excerptDescription('abcdefghijklmnop', 5)).toBe('abcde…');
  });

  it('returns nothing for an empty description', () => {
    expect(excerptDescription('', 300)).toBe('');
  });
});
