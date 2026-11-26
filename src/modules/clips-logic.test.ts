import { describe, expect, it } from 'vitest';

import { cardDeal, dealProgress, dealRanks, fitTitle } from './clips-logic.ts';

const VIEWPORT_HEIGHT = 800;

describe('dealProgress', () => {
  it.each([
    ['is zero while the fan is still below the screen', 900, 0],
    ['is zero exactly as the fan top reaches the bottom of the screen', 800, 0],
    ['is half way half way through the first half screen', 620, 0.5],
    ['is one once the fan top is 0.55 screens down', 440, 1],
    ['stays one while the fan scrolls on up the screen', -600, 1],
  ])('%s', (_behavior, fanTop, expected) => {
    expect(dealProgress(fanTop, VIEWPORT_HEIGHT)).toBeCloseTo(expected, 10);
  });

  it('follows the scroll position, a quarter of the way for a quarter of the range', () => {
    expect(dealProgress(710, VIEWPORT_HEIGHT)).toBeCloseTo(0.25, 10);
    expect(dealProgress(530, VIEWPORT_HEIGHT)).toBeCloseTo(0.75, 10);
  });

  it('scales with the viewport height', () => {
    expect(dealProgress(775, 1000)).toBeCloseTo(dealProgress(620, 800), 10);
  });
});

describe('dealRanks', () => {
  it('deals from the centre outward, the left card before the right one at the same distance', () => {
    expect(dealRanks([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])).toEqual([4, 2, 0, 1, 3, 5]);
  });

  it('starts an odd fan with its middle card', () => {
    expect(dealRanks([-1, 0, 1])).toEqual([1, 0, 2]);
  });

  it('ranks a single card first and an empty fan as nothing', () => {
    expect(dealRanks([0])).toEqual([0]);
    expect(dealRanks([])).toEqual([]);
  });
});

describe('cardDeal', () => {
  it.each([0, 1, 2, 3, 4, 5])('keeps rank %j in the stack at the start and fully dealt at the end', (rank) => {
    expect(cardDeal(0, rank, 6)).toBe(0);
    expect(cardDeal(1, rank, 6)).toBe(1);
  });

  it('starts the first card before the last one, so the cards go out one by one', () => {
    const progress = 0.2;

    expect(cardDeal(progress, 0, 6)).toBeGreaterThan(0);
    expect(cardDeal(progress, 5, 6)).toBe(0);
    for (let rank = 1; rank < 6; rank += 1) {
      expect(cardDeal(progress, rank - 1, 6)).toBeGreaterThanOrEqual(cardDeal(progress, rank, 6));
    }
  });

  it('is only a function of the scroll position, so half a scroll deals half way', () => {
    const half = cardDeal(0.25, 0, 6);

    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1.1);
    expect(cardDeal(0.25, 0, 6)).toBe(half);
  });

  it('overshoots a little past the final fan before it settles', () => {
    const samples = Array.from({ length: 101 }, (_, step) => cardDeal(step / 100, 0, 6));

    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(Math.max(...samples)).toBeLessThan(1.15);
    expect(samples.at(-1)).toBe(1);
  });

  it('deals a lone card without waiting for a stagger', () => {
    expect(cardDeal(0, 0, 1)).toBe(0);
    expect(cardDeal(0.5, 0, 1)).toBeGreaterThan(0.99);
    expect(cardDeal(1, 0, 1)).toBe(1);
  });
});

describe('fitTitle', () => {
  const title = 'Your favorite podcast just dropped an episode!!';
  const fitsWithin = (limit: number) => (text: string) => text.length <= limit;

  it('keeps a title that already fits whole', () => {
    expect(fitTitle(title, fitsWithin(title.length))).toBe(title);
  });

  it.each([
    [30, 'Your favorite podcast just…'],
    [20, 'Your favorite…'],
    [5, 'Your…'],
  ])('ends a title that fits %i characters with an ellipsis at a whole word', (limit, expected) => {
    expect(fitTitle(title, fitsWithin(limit))).toBe(expected);
  });

  it('drops punctuation left dangling before the ellipsis', () => {
    expect(fitTitle('Help us be!! our own housewives', fitsWithin(14))).toBe('Help us be…');
  });

  it('keeps the first word when nothing shorter fits', () => {
    expect(fitTitle(title, fitsWithin(0))).toBe('Your…');
  });
});
