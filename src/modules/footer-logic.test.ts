import { describe, expect, it } from 'vitest';

import { isFooterInView, riseProgress } from './footer-logic.ts';

const RUN = 540;
const VIEWPORT_HEIGHT = 900;
const WHEEL_STEP = 100;

describe('riseProgress', () => {
  it.each([
    ['at the page end', 0, 1],
    ['past the page end, as on a rubber-band overscroll', -40, 1],
    ['at the start of the run', RUN, 0],
    ['before the run', RUN * 3, 0],
  ])('is settled %s', (_name, distanceToPageEnd, expected) => {
    expect(riseProgress(distanceToPageEnd, RUN)).toBe(expected);
  });

  it('is half way half way through the run', () => {
    expect(riseProgress(RUN / 2, RUN)).toBeCloseTo(0.5, 5);
  });

  it('is already under way a few wheel steps before the end', () => {
    const threeStepsBeforeEnd = 3 * WHEEL_STEP;

    expect(riseProgress(threeStepsBeforeEnd, RUN)).toBeGreaterThan(0);
    expect(riseProgress(threeStepsBeforeEnd, RUN)).toBeLessThan(1);
  });

  it('only grows as the page end gets nearer', () => {
    const samples = [RUN, RUN * 0.8, RUN * 0.5, RUN * 0.2, 0].map((distance) => riseProgress(distance, RUN));

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
