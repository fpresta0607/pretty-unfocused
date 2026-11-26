import { describe, expect, it } from 'vitest';

import {
  bottomBandHeight,
  coverHideStep,
  coveringCardCount,
  fitCards,
  frontCardIndex,
  narrowedCardWidth,
  rowEndPadding,
  rowWidth,
  scrollTopForCard,
  stepForProgress,
  trimToWholeWords,
  wholeCardCount,
} from './episodes-logic.ts';

describe('stepForProgress', () => {
  it.each([
    [0, 9, 0.5, 0],
    [0.01, 9, 0.5, 0.0854],
    [0.25, 9, 0.5, 2.1356],
    [0.5, 9, 0.5, 4.2713],
    [8 / 8.5 / 1.005, 9, 0.5, 8],
    [1, 9, 0.5, 8],
    [0.5, 9, 0, 4.02],
    [1, 9, 0, 8],
  ])('maps progress %j of a %j-card track with %j end steps to step %j, moving as soon as the pin starts and reaching the last card half a percent before the track ends', (progress, cardCount, endSteps, expected) => {
    expect(stepForProgress(progress, cardCount, endSteps)).toBeCloseTo(expected);
  });

  it.each([-0.4, 1.7])('keeps progress %j inside the track', (progress) => {
    expect(stepForProgress(progress, 5, 0.5)).toBe(progress < 0 ? 0 : 4);
  });

  it.each([0, 1])('keeps a track of %j cards at step 0', (cardCount) => {
    expect(stepForProgress(0.8, cardCount, 0.5)).toBe(0);
  });
});

describe('frontCardIndex', () => {
  it.each([
    [0, 0],
    [0.4 / 8.5, 0],
    [0.6 / 8.5, 1],
    [1, 8],
  ])('puts the card at the front for progress %j at index %j of 9', (progress, expected) => {
    expect(frontCardIndex(progress, 9, 0.5)).toBe(expected);
  });
});

describe('coverHideStep', () => {
  it.each([
    [396, 18, 0.884],
    [300, 24, 0.852],
    [30, 10, 0],
  ])('hides a %j px card with a %j px gap once the next card leaves only a thin strip of it, at %j of a step', (cardWidth, gap, expected) => {
    expect(coverHideStep(cardWidth, gap)).toBeCloseTo(expected, 3);
  });
});

describe('coveringCardCount', () => {
  const trigger = 0.05;

  it.each([
    [0, 0],
    [0.04 / 8.5, 0],
    [0.06 / 8.5, 1],
    [1.04 / 8.5, 1],
    [1.06 / 8.5, 2],
    [1, 8],
  ])('counts the cards the next one has started to cover at progress %j: %j of 9', (progress, expected) => {
    expect(coveringCardCount(progress, 9, 0.5, trigger)).toBe(expected);
  });

  it('covers nothing when the page has no layout to measure', () => {
    expect(coveringCardCount(0.5, 9, 0.5, Number.NaN)).toBe(0);
  });
});

describe('wholeCardCount', () => {
  it.each([
    [886, 390, 24, 2],
    [713, 392, 24, 1],
    [377, 328, 16, 1],
    [1260, 516, 24, 2],
    [300, 328, 16, 1],
  ])('fits %j px of row with %j px cards and a %j px gap: %j whole cards', (available, card, gap, expected) => {
    expect(wholeCardCount(available, card, gap)).toBe(expected);
  });
});

describe('rowEndPadding', () => {
  it.each([
    [918, 404, 20, 40, 90],
    [634, 336, 20, 40, 298],
    [560, 336, 20, 16, 224],
    [1905, 688, 20, 40, 509],
    [300, 328, 16, 40, 40],
  ])('lets a %j px row of %j px cards with a %j px gap and a %j px minimum gutter end on whole cards, leaving %j px on the right', (available, card, gap, minGutter, expected) => {
    expect(rowEndPadding(available, card, gap, minGutter)).toBe(expected);
  });
});

describe('rowWidth', () => {
  it('spans the whole cards and the gaps between them', () => {
    expect(rowWidth(2, 390, 24)).toBe(804);
    expect(rowWidth(1, 328, 16)).toBe(328);
  });
});

describe('narrowedCardWidth', () => {
  const THUMB_RATIO = 0.5625;
  const FLOOR_WIDTH = 252;

  it.each([
    ['a 390x701 phone, where the card already clears the frame', 358, 360, 360, 358],
    ['a 412x780 phone, where the card has room to spare', 380, 408, 422, 380],
    ['a 360x640 phone, where the card runs 42 px past the frame', 328, 341, 299, 253],
    ['a 375x553 phone, where no width brings the card above the frame', 343, 351, 212, FLOOR_WIDTH],
    ['a 320x568 phone, whose card is already narrower than the floor', 240, 330, 212, 240],
  ])('on %s, takes the card of %j px, %j px tall, to fit %j px as %j px wide, never below the floor', (_phone, cardWidth, cardHeight, hardHeight, expected) => {
    const width = narrowedCardWidth(cardWidth, cardHeight, hardHeight, THUMB_RATIO, FLOOR_WIDTH);

    expect(width).toBe(expected);
  });

  it('takes off as much width as the thumbnail ratio turns into the excess height, rounded down to a whole pixel', () => {
    const width = narrowedCardWidth(400, 380, 360, THUMB_RATIO, FLOOR_WIDTH);

    expect(width).toBe(364);
  });

  it.each([Number.NaN, 0])('leaves the card alone when the thumbnail ratio is %j', (thumbRatio) => {
    const width = narrowedCardWidth(343, 351, 212, thumbRatio, FLOOR_WIDTH);

    expect(width).toBe(343);
  });
});

describe('bottomBandHeight', () => {
  it('spans from the top of the highest piece in the bottom half of the frame to its bottom edge', () => {
    const pieces = [
      { top: 24, height: 56 },
      { top: 583, height: 93 },
      { top: 656, height: 20 },
    ];

    expect(bottomBandHeight(700, pieces)).toBe(117);
  });

  it('counts a piece by where its middle sits, so a tall panel from the top does not make a band', () => {
    expect(bottomBandHeight(700, [{ top: 0, height: 700 }])).toBeUndefined();
  });

  it.each([
    [700, []],
    [0, [{ top: 0, height: 0 }]],
  ])('has no band for a %j px frame with pieces %j', (frameHeight, pieces) => {
    expect(bottomBandHeight(frameHeight, pieces)).toBeUndefined();
  });
});

describe('fitCards with a hard limit on the height', () => {
  const LINE = 28.5;
  const TITLE_LINE = 30;
  const CLEAR = 32;
  const FLOOR_CLEAR = 16;
  const options = { lineHeight: LINE, minLines: 2, maxLines: 6, minClearHeight: CLEAR, floorClearHeight: FLOOR_CLEAR, maxExcessHeight: 16, maxHeight: undefined };
  const longDescriptions = [
    { fixedHeight: 300, descriptionHeight: 6 * LINE },
    { fixedHeight: 300, descriptionHeight: 5 * LINE },
  ];

  it('keeps the two minimum lines when the limit leaves room for them', () => {
    const fit = fitCards(longDescriptions, { ...options, hardMaxHeight: 300 + CLEAR + 2 * LINE });

    expect(fit?.descriptionLines).toEqual([2, 2]);
    expect(fit?.height).toBeLessThanOrEqual(300 + CLEAR + 2 * LINE);
  });

  it.each([
    [300 + FLOOR_CLEAR + LINE, 1],
    [300 + FLOOR_CLEAR + LINE + 10, 1],
    [300 + FLOOR_CLEAR + 5, 0],
    [300 + FLOOR_CLEAR, 0],
  ])('with a limit of %j px, ends the card within it by cutting the description to %j line(s) rather than keeping the two minimum', (hardMaxHeight, expectedLines) => {
    const fit = fitCards(longDescriptions, { ...options, hardMaxHeight });

    expect(fit?.descriptionLines).toEqual([expectedLines, expectedLines]);
    expect(fit?.height).toBeLessThanOrEqual(hardMaxHeight);
  });

  it('still lets the card run past the limit when even a card with no description cannot fit, since nothing else can be cut', () => {
    const fit = fitCards(longDescriptions, { ...options, hardMaxHeight: 250 });

    expect(fit?.descriptionLines).toEqual([0, 0]);
    expect(fit?.height).toBe(300 + FLOOR_CLEAR);
  });

  it('gives the cards with a shorter title the lines their room allows, even when the tallest title shows none', () => {
    const fit = fitCards(
      [
        { fixedHeight: 300, descriptionHeight: 6 * LINE },
        { fixedHeight: 300 - 2 * LINE, descriptionHeight: 6 * LINE },
      ],
      { ...options, hardMaxHeight: 300 + FLOOR_CLEAR },
    );

    expect(fit?.descriptionLines).toEqual([0, 2]);
  });

  it('does not let a card with no description pull the shared height past the limit', () => {
    const fit = fitCards([...longDescriptions, { fixedHeight: 700, descriptionHeight: undefined }], { ...options, hardMaxHeight: 450 });

    expect(fit?.height).toBeLessThanOrEqual(450);
  });

  it('leaves the fit alone when no limit is given', () => {
    const fit = fitCards(longDescriptions, options);

    expect(fit?.descriptionLines).toEqual([5, 5]);
    expect(fit?.titleLines).toBeUndefined();
  });

  describe('on a phone, where the tallest title leaves no room for a description line', () => {
    const SHORT_TITLE = 26.4;
    const phone = { ...options, minLines: 1, titleLineHeight: SHORT_TITLE };
    const oneLineTitle = { fixedHeight: 300, descriptionHeight: 6 * LINE, titleHeight: SHORT_TITLE };
    const twoLineTitle = { fixedHeight: 300 + SHORT_TITLE, descriptionHeight: 6 * LINE, titleHeight: 2 * SHORT_TITLE };

    it('gives a card with a shorter title the description line its own room allows, down to the floor of the clear gap above the buttons', () => {
      const hardMaxHeight = twoLineTitle.fixedHeight + 26;

      const fit = fitCards([oneLineTitle, twoLineTitle], { ...phone, hardMaxHeight });

      expect(fit?.descriptionLines).toEqual([1, 0]);
      expect(fit?.titleLines).toBeUndefined();
      expect(fit?.height).toBeLessThanOrEqual(hardMaxHeight);
      expect((fit?.height ?? 0) - oneLineTitle.fixedHeight - LINE).toBeGreaterThanOrEqual(FLOOR_CLEAR - 1e-6);
    });

    it('keeps the comfortable clear gap for the lines beyond the minimum, which the floor does not earn', () => {
      const hardMaxHeight = twoLineTitle.fixedHeight + FLOOR_CLEAR + LINE + 5;

      const fit = fitCards([oneLineTitle, twoLineTitle], { ...phone, hardMaxHeight });

      expect(fit?.descriptionLines).toEqual([1, 1]);
    });
  });

  describe('when the description is hidden', () => {
    const GAP = 8;
    const titled = [
      { fixedHeight: 400, descriptionHeight: 6 * LINE, titleHeight: 3 * TITLE_LINE },
      { fixedHeight: 370, descriptionHeight: 6 * LINE, titleHeight: 2 * TITLE_LINE },
    ];

    it('counts the gap that goes with the description only when a line is shown, so a title is not cut for room the hidden description leaves free', () => {
      const hardMaxHeight = 370 - GAP + FLOOR_CLEAR;

      const fit = fitCards(titled, { ...options, titleLineHeight: TITLE_LINE, summaryGap: GAP, hardMaxHeight });

      expect(fit?.titleLines).toBe(2);
      expect(fit?.descriptionLines).toEqual([0, 0]);
      expect(fit?.height).toBeCloseTo(hardMaxHeight);
    });

    it('still cuts the title when even the card without the gap would not fit', () => {
      const fit = fitCards(titled, { ...options, titleLineHeight: TITLE_LINE, summaryGap: GAP, hardMaxHeight: 370 - GAP + FLOOR_CLEAR - 1 });

      expect(fit?.titleLines).toBe(1);
    });
  });

  describe('when the description is gone and the card is still over the limit', () => {
    const titled = [
      { fixedHeight: 400, descriptionHeight: 6 * LINE, titleHeight: 3 * TITLE_LINE },
      { fixedHeight: 370, descriptionHeight: 6 * LINE, titleHeight: 2 * TITLE_LINE },
    ];
    const withTitles = { ...options, titleLineHeight: TITLE_LINE };

    it.each([
      [395, 2],
      [365, 1],
    ])('with a limit of %j px, cuts the longest titles to %j lines', (hardMaxHeight, expectedTitleLines) => {
      const fit = fitCards(titled, { ...withTitles, hardMaxHeight });

      expect(fit?.titleLines).toBe(expectedTitleLines);
      expect(fit?.descriptionLines).toEqual([0, 0]);
      expect(fit?.height).toBeLessThanOrEqual(hardMaxHeight);
    });

    it('never cuts a title under one line', () => {
      expect(fitCards(titled, { ...withTitles, hardMaxHeight: 100 })?.titleLines).toBe(1);
    });

    it('leaves the titles whole when the description alone gives the room', () => {
      expect(fitCards(titled, { ...withTitles, hardMaxHeight: 400 + FLOOR_CLEAR })?.titleLines).toBeUndefined();
    });

    it('leaves the titles whole when the page cannot tell their line height', () => {
      expect(fitCards(titled, { ...options, titleLineHeight: Number.NaN, hardMaxHeight: 100 })?.titleLines).toBeUndefined();
    });
  });
});

describe('fitCards', () => {
  const LINE = 28.5;
  const CLEAR = 32;
  const options = { lineHeight: LINE, minLines: 2, maxLines: 6, minClearHeight: CLEAR, maxExcessHeight: 16, maxHeight: undefined };

  it('sizes the card for the tallest title with the lines of the shortest description, and keeps the clear gap', () => {
    const measurements = [
      { fixedHeight: 300, descriptionHeight: 5 * LINE },
      { fixedHeight: 335, descriptionHeight: 3 * LINE },
      { fixedHeight: 265, descriptionHeight: 6 * LINE },
    ];

    const fit = fitCards(measurements, options);

    expect(fit?.height).toBeCloseTo(335 + CLEAR + 3 * LINE);
  });

  it('gives a card with a shorter title the extra lines its room allows, never less than the clear gap above the buttons', () => {
    const measurements = [
      { fixedHeight: 300, descriptionHeight: 6 * LINE },
      { fixedHeight: 300 + 2 * LINE, descriptionHeight: 6 * LINE },
      { fixedHeight: 300 + LINE, descriptionHeight: 6 * LINE },
    ];

    const fit = fitCards(measurements, { ...options, maxHeight: 300 + 2 * LINE + CLEAR + 3 * LINE });

    expect(fit?.descriptionLines).toEqual([5, 3, 4]);
    measurements.forEach(({ fixedHeight }, index) => {
      const lines = fit?.descriptionLines[index] ?? 0;
      expect((fit?.height ?? 0) - fixedHeight - lines * LINE).toBeGreaterThanOrEqual(CLEAR - 1e-6);
    });
  });

  it('shortens the shared height by the room every card has beyond the comfortable clear gap, keeping the minimum', () => {
    const measurements = [
      { fixedHeight: 300, descriptionHeight: LINE },
      { fixedHeight: 300 + LINE, descriptionHeight: LINE },
    ];

    const fit = fitCards(measurements, { ...options, minLines: 4 });

    expect(fit?.height).toBeCloseTo(300 + LINE + CLEAR + LINE);
    expect(fit?.descriptionLines).toEqual([1, 1]);
  });

  it('leaves the height alone when the extra room is within the comfortable range', () => {
    const fit = fitCards([{ fixedHeight: 300, descriptionHeight: 6 * LINE }], { ...options, maxHeight: 300 + CLEAR + 3.5 * LINE });

    expect(fit?.height).toBeCloseTo(300 + CLEAR + 3 * LINE);
  });

  it('never gives a description more lines than it has', () => {
    const fit = fitCards([{ fixedHeight: 300, descriptionHeight: 2 * LINE }, { fixedHeight: 300 + 3 * LINE, descriptionHeight: 6 * LINE }], options);

    expect(fit?.descriptionLines[0]).toBe(2);
  });

  it('does not pad a card for lines its description does not have', () => {
    const fit = fitCards([{ fixedHeight: 400, descriptionHeight: LINE }], options);

    expect(fit?.height).toBeCloseTo(400 + CLEAR + LINE);
    expect(fit?.descriptionLines).toEqual([1]);
  });

  it('lets a card without a description set the height', () => {
    const fit = fitCards([{ fixedHeight: 400, descriptionHeight: 3 * LINE }, { fixedHeight: 700, descriptionHeight: undefined }], options);

    expect(fit?.height).toBe(700);
    expect(fit?.descriptionLines).toEqual([3, undefined]);
  });

  it('caps a long description at the most lines allowed', () => {
    expect(fitCards([{ fixedHeight: 300, descriptionHeight: 20 * LINE }], options)?.descriptionLines).toEqual([6]);
  });

  it('limits the lines to what the stage allows', () => {
    const fit = fitCards([{ fixedHeight: 300, descriptionHeight: 6 * LINE }], { ...options, maxHeight: 300 + CLEAR + 3.5 * LINE });

    expect(fit?.descriptionLines).toEqual([3]);
  });

  it.each([380, 440, 800])('never lets the tallest title fall under two lines when the stage allows only %j px', (maxHeight) => {
    const measurements = [
      { fixedHeight: 420, descriptionHeight: 4 * LINE },
      { fixedHeight: 300, descriptionHeight: 6 * LINE },
    ];

    const fit = fitCards(measurements, { ...options, maxHeight });

    expect(fit?.descriptionLines[0]).toBeGreaterThanOrEqual(2);
    expect(fit?.height).toBeGreaterThanOrEqual(420 + CLEAR + 2 * LINE - 1e-6);
  });

  it('lowers the clear gap above the buttons, down to its floor, to keep two lines when the stage is a little short', () => {
    const measurements = [{ fixedHeight: 300, descriptionHeight: 4 * LINE }];
    const maxHeight = 300 + CLEAR + 2 * LINE - 6;

    const fit = fitCards(measurements, { ...options, maxHeight, floorClearHeight: 20 });

    expect(fit?.clearHeight).toBeCloseTo(CLEAR - 6);
    expect(fit?.descriptionLines).toEqual([2]);
    expect(fit?.height).toBeCloseTo(maxHeight);
  });

  it('never lowers the clear gap under its floor, then shows what fits', () => {
    const fit = fitCards([{ fixedHeight: 300, descriptionHeight: 4 * LINE }], { ...options, maxHeight: 300 + CLEAR + LINE, floorClearHeight: 20 });

    expect(fit?.clearHeight).toBe(20);
  });

  it('keeps the full clear gap when two lines already fit', () => {
    const fit = fitCards([{ fixedHeight: 300, descriptionHeight: 4 * LINE }], { ...options, maxHeight: 800, floorClearHeight: 20 });

    expect(fit?.clearHeight).toBe(CLEAR);
  });

  it('grows the shared height by a few pixels when that gives a card one more line', () => {
    const measurements = [
      { fixedHeight: 300, descriptionHeight: 3 * LINE },
      { fixedHeight: 275.5, descriptionHeight: 6 * LINE },
    ];

    const fit = fitCards(measurements, { ...options, maxHeight: 800 });

    expect(fit?.descriptionLines).toEqual([3, 4]);
    expect(fit?.height).toBeCloseTo(300 + CLEAR + 3 * LINE + 4);
  });

  it('does not grow past the stage to gain a line', () => {
    const maxHeight = 300 + CLEAR + 3 * LINE;
    const measurements = [
      { fixedHeight: 300, descriptionHeight: 3 * LINE },
      { fixedHeight: 275.5, descriptionHeight: 6 * LINE },
    ];

    const fit = fitCards(measurements, { ...options, maxHeight });

    expect(fit?.descriptionLines).toEqual([3, 3]);
    expect(fit?.height).toBeCloseTo(maxHeight);
  });

  it.each([
    [[], 28.5],
    [[{ fixedHeight: 300, descriptionHeight: undefined }], 28.5],
    [[{ fixedHeight: 300, descriptionHeight: 57 }], 0],
    [[{ fixedHeight: 300, descriptionHeight: 57 }], Number.NaN],
  ])('has no fit for %j at a %j px line', (measurements, lineHeight) => {
    expect(fitCards(measurements, { ...options, lineHeight })).toBeUndefined();
  });
});

describe('scrollTopForCard', () => {
  const placement = { sectionTop: 1000, sectionHeight: 3600, viewportHeight: 900, cardCount: 9, endSteps: 0.5 };

  it.each([
    [0, 1000],
    [4, 2270.59],
    [8, 3700],
  ])('scrolls so that card %j sits at the front of the pinned track, the last one at the very end of the pin', (cardIndex, expected) => {
    expect(scrollTopForCard({ ...placement, cardIndex })).toBeCloseTo(expected, 1);
  });

  it('puts the last card at the very end of the pin when the track holds no end steps', () => {
    expect(scrollTopForCard({ ...placement, endSteps: 0, cardIndex: 8 })).toBe(3700);
    expect(scrollTopForCard({ ...placement, endSteps: 0, cardIndex: 4 })).toBeCloseTo(2350, 1);
  });

  it('stays at the pin start when the track has a single card', () => {
    expect(scrollTopForCard({ ...placement, cardCount: 1, cardIndex: 0 })).toBe(1000);
  });

  it('stays at the pin start when the section is no taller than the screen', () => {
    expect(scrollTopForCard({ ...placement, sectionHeight: 800, cardIndex: 5 })).toBe(1000);
  });
});

describe('trimToWholeWords', () => {
  const ELLIPSIS = String.fromCodePoint(0x2026);
  const fitsInTwentyCharacters = (candidate: string): boolean => candidate.length <= 20;

  it('leaves text that already fits alone', () => {
    expect(trimToWholeWords('A short line', fitsInTwentyCharacters)).toBe('A short line');
  });

  it('cuts at the last whole word that fits and ends with an ellipsis', () => {
    expect(trimToWholeWords('What a whole lot of words we have here', fitsInTwentyCharacters)).toBe(`What a whole lot of${ELLIPSIS}`);
  });

  it('drops the punctuation that would sit before the ellipsis', () => {
    expect(trimToWholeWords('One, two, three, four, five', (candidate) => candidate.length <= 12)).toBe(`One, two${ELLIPSIS}`);
  });

  it('falls back to a lone ellipsis when not even one word fits', () => {
    expect(trimToWholeWords('Extraordinarily long', (candidate) => candidate.length <= 3)).toBe(ELLIPSIS);
  });
});
