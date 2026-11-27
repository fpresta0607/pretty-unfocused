import { describe, expect, it } from 'vitest';

import { decodeEntities, toPlainLines, toPlainText } from './plain-text.ts';

describe('decodeEntities', () => {
  it.each([
    ['Tom &amp; Jerry', 'Tom & Jerry'],
    ['It&#39;s here', "It's here"],
    ['It&#x27;s here', "It's here"],
    ['&lt;3 &quot;quoted&quot;', '<3 "quoted"'],
    ['&amp;lt; stays one level decoded', '&lt; stays one level decoded'],
    ['&unknown; is kept', '&unknown; is kept'],
    ['nothing to decode', 'nothing to decode'],
  ])('decodes %j to %j', (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });
});

describe('toPlainText', () => {
  it.each([
    ['<p>Hello <b>there</b></p>', 'Hello there'],
    ['<p>One</p>\n<p>Two</p>', 'One Two'],
    ['  spaced \n\n out\ttext  ', 'spaced out text'],
    ['<p>Don&#39;t &amp; won&#39;t</p>', "Don't & won't"],
    ['&lt;3 is not a tag', '<3 is not a tag'],
    ['', ''],
  ])('turns %j into %j', (input, expected) => {
    expect(toPlainText(input)).toBe(expected);
  });
});

describe('toPlainLines', () => {
  it.each([
    ['One line\nnext line', 'One line\nnext line'],
    ['  spaced \t out \r\n  second  ', 'spaced out\nsecond'],
    ['First\n\n\n\n\nSecond', 'First\n\nSecond'],
    ['<p>Tom &amp; Jerry</p>\nbye', 'Tom & Jerry\nbye'],
    ['\n\n  \n', ''],
  ])('turns %j into %j', (input, expected) => {
    expect(toPlainLines(input)).toBe(expected);
  });
});
