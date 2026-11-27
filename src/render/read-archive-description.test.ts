import { describe, expect, it } from 'vitest';

import { readArchiveDescription } from './read-archive-description.ts';

const PROSE = 'We talk about mani pedis and everything magic, and we have a very good time doing it.';

describe('readArchiveDescription', () => {
  it('keeps the prose paragraphs whole and in order', () => {
    expect(readArchiveDescription(`${PROSE}\n\nQuestion:\nWho is your favorite character?`)).toEqual([
      PROSE,
      'Question: Who is your favorite character?',
    ]);
  });

  it.each([
    ['a line that is only a link', 'https://example.com/watch?v=1&si=abc'],
    ['a link with a label', 'TikTok: https://example.com/@show?_r=1&_t=abc'],
    ['two labelled links on one line', "Maya's - https://example.com/a & Gia's - https://example.com/b"],
    ['a label on the line above a link', 'Personal pages:\nhttps://example.com/a\nhttps://example.com/b'],
    ['a link that wrapped onto a second line', 'Spotify: https://example.com/e/1?\n_r=1&_t=abc'],
    ['a hashtag list', '#cozy #chaos #podcast'],
    ['a label with a handle', "Personal Youtube: @someone"],
  ])('leaves out %s', (_name, lines) => {
    expect(readArchiveDescription(`${PROSE}\n\n${lines}`)).toEqual([PROSE]);
  });

  it('keeps a prose line that mentions a handle', () => {
    const line = 'This was requested by @someone so thank you for getting us out of our element.';

    expect(readArchiveDescription(line)).toEqual([line]);
  });

  it('takes a link out of the middle of a prose line and keeps the words', () => {
    expect(readArchiveDescription('Please become a member of the channel https://example.com/join today')).toEqual([
      'Please become a member of the channel today',
    ]);
  });

  it('returns nothing for an empty description or one of only links', () => {
    expect(readArchiveDescription('')).toEqual([]);
    expect(readArchiveDescription('https://example.com/a\n\nhttps://example.com/b')).toEqual([]);
  });
});
