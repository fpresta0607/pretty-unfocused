import { describe, expect, it } from 'vitest';

import { pickSectionAtLine, readSurface, shouldShowMiniCard } from './section-logic.ts';

describe('pickSectionAtLine', () => {
  const SPANS = [
    { top: 0, bottom: 800 },
    { top: 800, bottom: 2000 },
  ];

  it.each([
    [0, 0],
    [799, 0],
    [800, 1],
    [1999, 1],
    [2000, undefined],
    [-1, undefined],
  ])('picks the section under line %d', (line, expected) => {
    expect(pickSectionAtLine(SPANS, line)).toBe(expected);
  });

  it('does not switch to a section that only touches the line from below', () => {
    expect(pickSectionAtLine([{ top: 0, bottom: 800 }, { top: 800, bottom: 1600 }], 799.5)).toBe(0);
  });
});

describe('readSurface', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    [undefined, 'dark'],
    ['purple', 'dark'],
  ])('reads %j as %s', (value, expected) => {
    expect(readSurface(value)).toBe(expected);
  });
});

describe('shouldShowMiniCard', () => {
  it.each([
    [1, false],
    [0.5, false],
    [0.15, false],
    [0.14, true],
    [0, true],
  ])('with the hero %d visible, shows the card: %s', (ratio, expected) => {
    expect(shouldShowMiniCard(ratio)).toBe(expected);
  });
});
