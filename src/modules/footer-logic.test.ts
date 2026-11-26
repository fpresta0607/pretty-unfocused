import { describe, expect, it } from 'vitest';

import { isFooterInView, RISE_RANGE_WORD_HEIGHTS, riseProgress } from './footer-logic.ts';

const WORD_HEIGHT = 180;
const RANGE = RISE_RANGE_WORD_HEIGHTS * WORD_HEIGHT;
const VIEWPORT_HEIGHT = 900;

describe('riseProgress', () => {
  it.each([
    ['at the page end', 0, 1],
    ['past the page end, as on a rubber-band overscroll', -40, 1],
    ['at the start of the range', RANGE, 0],
    ['before the range', RANGE * 3, 0],
  ])('is settled %s', (_name, distanceToPageEnd, expected) => {
    expect(riseProgress(distanceToPageEnd, WORD_HEIGHT)).toBe(expected);
  });

  it('is half way half way through the range', () => {
    expect(riseProgress(RANGE / 2, WORD_HEIGHT)).toBeCloseTo(0.5, 5);
  });

  it('only grows as the page end gets nearer', () => {
    const samples = [RANGE, RANGE * 0.8, RANGE * 0.5, RANGE * 0.2, 0].map((distance) => riseProgress(distance, WORD_HEIGHT));

    expect([...samples].sort((left, right) => left - right)).toEqual(samples);
  });
});

describe('isFooterInView', () => {
  it.each([
    ['far below the screen', 2000, false],
    ['just entering', VIEWPORT_HEIGHT * 0.9, false],
    ['past the entry line', VIEWPORT_HEIGHT * 0.8, true],
    ['at the top of the screen', 0, true],
  ])('is %s', (_name, footerTop, expected) => {
    expect(isFooterInView(footerTop, VIEWPORT_HEIGHT)).toBe(expected);
  });
});
