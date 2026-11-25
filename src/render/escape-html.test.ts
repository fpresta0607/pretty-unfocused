import { describe, expect, it } from 'vitest';

import { escapeHtml } from './escape-html.ts';

describe('escapeHtml', () => {
  it.each([
    ['Tom & Jerry', 'Tom &amp; Jerry'],
    ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['say "hi"', 'say &quot;hi&quot;'],
    ["it's", 'it&#39;s'],
    ['&lt; is not double-safe', '&amp;lt; is not double-safe'],
    ['plain text', 'plain text'],
    ['', ''],
  ])('escapes %j to %j', (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });
});
