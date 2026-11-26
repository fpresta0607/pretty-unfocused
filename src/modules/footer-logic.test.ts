import { describe, expect, it } from 'vitest';

import { isFooterInView, riseProgress } from './footer-logic.ts';

const RISE_LENGTH = 540;
const VIEWPORT_HEIGHT = 900;
const WHEEL_STEP = 100;

describe('riseProgress', () => {
  it.each([
    ['at the page end', 0, 1],
    ['past the page end, as on a rubber-band overscroll', -40, 1],
    ['at the start of the rise', RISE_LENGTH, 0],
    ['before the rise', RISE_LENGTH * 3, 0],
  ])('is settled %s', (_name, distanceToPageEnd, expected) => {
    expect(riseProgress(distanceToPageEnd, RISE_LENGTH)).toBe(expected);
  });

  it('is half way half way through the rise', () => {
    expect(riseProgress(RISE_LENGTH / 2, RISE_LENGTH)).toBeCloseTo(0.5, 5);
  });

  it('is already under way a few wheel steps before the end', () => {
    const threeStepsBeforeEnd = 3 * WHEEL_STEP;

    expect(riseProgress(threeStepsBeforeEnd, RISE_LENGTH)).toBeGreaterThan(0);
    expect(riseProgress(threeStepsBeforeEnd, RISE_LENGTH)).toBeLessThan(1);
  });

  it('moves by the same amount for every equal step of scroll, so that no step looks stuck', () => {
    const progressAfterEachStep = [0, 1, 2, 3, 4].map((step) => riseProgress(RISE_LENGTH - step * WHEEL_STEP, RISE_LENGTH));
    const movedByEachStep = progressAfterEachStep.slice(1).map((progress, index) => progress - (progressAfterEachStep[index] ?? 0));

    movedByEachStep.forEach((moved) => expect(moved).toBeCloseTo(WHEEL_STEP / RISE_LENGTH, 5));
  });

  it('only grows as the page end gets nearer', () => {
    const samples = [RISE_LENGTH, RISE_LENGTH * 0.8, RISE_LENGTH * 0.5, RISE_LENGTH * 0.2, 0].map((distance) => riseProgress(distance, RISE_LENGTH));

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
