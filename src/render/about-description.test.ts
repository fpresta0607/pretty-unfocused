import { describe, expect, it } from 'vitest';

import { readAboutDescription } from './about-description.ts';

describe('readAboutDescription', () => {
  it.each([
    ['drops the closing sentence the headline already says', 'Two besties talking. Cozy chaos only.', 'Two besties talking.'],
    ['drops it through extra whitespace', '  Two besties talking.   Cozy chaos only.  \n', 'Two besties talking.'],
    ['keeps a description that does not end with it', 'Two besties talking.', 'Two besties talking.'],
    ['keeps the sentence when it is not the last one', 'Cozy chaos only. Two besties talking.', 'Cozy chaos only. Two besties talking.'],
    ['trims whitespace around a description without it', '  Two besties talking.  ', 'Two besties talking.'],
    ['returns nothing for an empty description', '', ''],
    ['returns nothing when the closing sentence is all there is', ' Cozy chaos only. ', ''],
  ])('%s', (_behavior, description, expected) => {
    expect(readAboutDescription(description)).toBe(expected);
  });

  it.each([
    ['joins an em dash to the word before it', 'the messy middle\u2014plus more', 'the messy middle\u2060\u2014plus more'],
    ['joins every dash in the text', 'one\u2014two\u2014three', 'one\u2060\u2014two\u2060\u2014three'],
    ['ties a spaced dash to the word before it with a no-break space', 'one \u2014 two', 'one\u00a0\u2014 two'],
    ['leaves text without a dash alone', 'one two', 'one two'],
  ])('%s so a dash never starts a line', (_behavior, description, expected) => {
    expect(readAboutDescription(description)).toBe(expected);
  });
});
