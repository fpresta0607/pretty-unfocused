const HIDDEN_STRIP_PX = 48;
const STEP_SCALE = 1.005;

export function stepForProgress(progress: number, cardCount: number, endSteps: number): number {
  if (cardCount <= 1) {
    return 0;
  }
  return Math.min(cardCount - 1, Math.max(0, progress * (cardCount - 1 + endSteps) * STEP_SCALE));
}

export function frontCardIndex(progress: number, cardCount: number, endSteps: number): number {
  return Math.round(stepForProgress(progress, cardCount, endSteps));
}

export function coverHideStep(cardWidth: number, gap: number): number {
  return Math.max(0, 1 - HIDDEN_STRIP_PX / (cardWidth + gap));
}

export function coveringCardCount(progress: number, cardCount: number, endSteps: number, triggerStep: number): number {
  const step = stepForProgress(progress, cardCount, endSteps);
  return step >= triggerStep ? Math.floor(step - triggerStep) + 1 : 0;
}

export function wholeCardCount(availableWidth: number, cardWidth: number, gap: number): number {
  return Math.max(1, Math.floor((availableWidth + gap) / (cardWidth + gap)));
}

export function rowEndPadding(availableWidth: number, cardWidth: number, gap: number, minGutter: number): number {
  const cardCount = wholeCardCount(availableWidth - minGutter, cardWidth, gap);
  return Math.max(minGutter, availableWidth - rowWidth(cardCount, cardWidth, gap));
}

export function rowWidth(cardCount: number, cardWidth: number, gap: number): number {
  return cardCount * cardWidth + (cardCount - 1) * gap;
}

export interface FramePiece {
  top: number;
  height: number;
}

export function bottomBandHeight(frameHeight: number, pieces: readonly FramePiece[]): number | undefined {
  const bottomTops = pieces.filter(({ top, height }) => top + height / 2 > frameHeight / 2).map(({ top }) => top);
  return bottomTops.length === 0 ? undefined : frameHeight - Math.min(...bottomTops);
}

export interface CardMeasurement {
  fixedHeight: number;
  descriptionHeight: number | undefined;
  titleHeight?: number | undefined;
}

export interface CardFitOptions {
  lineHeight: number;
  minLines: number;
  maxLines: number;
  minClearHeight: number;
  floorClearHeight?: number;
  maxExcessHeight: number;
  maxHeight: number | undefined;
  hardMaxHeight?: number | undefined;
  titleLineHeight?: number | undefined;
  summaryGap?: number;
}

export interface CardFit {
  height: number;
  clearHeight: number;
  descriptionLines: (number | undefined)[];
  titleLines: number | undefined;
}

const LINE_EPSILON = 1e-6;
const MAX_LINE_NUDGE_PX = 6;

export function fitCards(measurements: readonly CardMeasurement[], options: CardFitOptions): CardFit | undefined {
  const hasDescription = measurements.some(({ descriptionHeight }) => descriptionHeight !== undefined);
  if (!hasDescription || !(options.lineHeight > 0)) {
    return undefined;
  }
  const titleLines = fitTitleLines(measurements, options);
  const fit = fitWithinLines(titleLines === undefined ? measurements : cutTitles(measurements, titleLines, options), options);
  return { ...fit, titleLines };
}

function floorClearOf({ floorClearHeight, minClearHeight }: CardFitOptions): number {
  return Math.min(floorClearHeight ?? minClearHeight, minClearHeight);
}

function naturalTitleLines({ titleHeight }: CardMeasurement, titleLineHeight: number): number {
  return titleHeight === undefined ? 1 : Math.max(1, Math.round(titleHeight / titleLineHeight));
}

function cutTitles(measurements: readonly CardMeasurement[], titleLines: number, { titleLineHeight = 0 }: CardFitOptions): CardMeasurement[] {
  return measurements.map((measurement) => ({
    ...measurement,
    fixedHeight: measurement.fixedHeight - Math.max(0, naturalTitleLines(measurement, titleLineHeight) - titleLines) * titleLineHeight,
  }));
}

function fitTitleLines(measurements: readonly CardMeasurement[], options: CardFitOptions): number | undefined {
  const { hardMaxHeight, titleLineHeight, summaryGap = 0 } = options;
  if (hardMaxHeight === undefined || titleLineHeight === undefined || !(titleLineHeight > 0)) {
    return undefined;
  }
  const described = measurements.filter(({ descriptionHeight }) => descriptionHeight !== undefined);
  const tallestTitleLines = Math.max(...described.map((measurement) => naturalTitleLines(measurement, titleLineHeight)));
  const floorClear = floorClearOf(options);
  for (let titleLines = tallestTitleLines; titleLines > 1; titleLines -= 1) {
    const cardHeight = Math.max(...cutTitles(described, titleLines, options).map(({ fixedHeight }) => fixedHeight)) - summaryGap + floorClear;
    if (cardHeight <= hardMaxHeight + LINE_EPSILON) {
      return titleLines === tallestTitleLines ? undefined : titleLines;
    }
  }
  return tallestTitleLines > 1 ? 1 : undefined;
}

function fitWithinLines(measurements: readonly CardMeasurement[], options: CardFitOptions): Omit<CardFit, 'titleLines'> {
  const { lineHeight, minLines, maxLines, minClearHeight, maxExcessHeight, summaryGap = 0, hardMaxHeight = Number.POSITIVE_INFINITY } = options;
  const maxHeight = Math.min(options.maxHeight ?? Number.POSITIVE_INFINITY, hardMaxHeight);
  const floorClearHeight = floorClearOf(options);
  const naturalLines = measurements.map(({ descriptionHeight }) =>
    descriptionHeight === undefined ? undefined : Math.min(Math.max(1, Math.round(descriptionHeight / lineHeight)), maxLines),
  );
  const describedNaturalLines = naturalLines.filter((lines): lines is number => lines !== undefined);
  const describedFixedHeight = Math.max(...measurements.flatMap(({ fixedHeight, descriptionHeight }) => (descriptionHeight === undefined ? [] : [fixedHeight])));
  const plainFixedHeight = Math.min(Math.max(0, ...measurements.flatMap(({ fixedHeight, descriptionHeight }) => (descriptionHeight === undefined ? [fixedHeight] : []))), hardMaxHeight);
  const contentHeight = (fixedHeight: number, lines: number): number => (lines === 0 ? fixedHeight - summaryGap : fixedHeight + lines * lineHeight);
  const hardLines = Math.floor((hardMaxHeight - describedFixedHeight - floorClearHeight) / lineHeight + LINE_EPSILON);
  const requiredLines = Math.max(0, Math.min(minLines, hardLines));
  const missingHeight = contentHeight(describedFixedHeight, requiredLines) + minClearHeight - maxHeight;
  const clearHeight = missingHeight > 0 ? Math.max(floorClearHeight, minClearHeight - missingHeight) : minClearHeight;
  const stageLines = Math.floor((maxHeight - describedFixedHeight - clearHeight) / lineHeight + LINE_EPSILON);
  const tallestTitleLines = Math.max(requiredLines, Math.min(Math.max(requiredLines, Math.min(...describedNaturalLines)), stageLines));
  const linesWithin = (height: number): (number | undefined)[] =>
    measurements.map(({ fixedHeight }, index) => {
      const natural = naturalLines[index];
      if (natural === undefined) {
        return undefined;
      }
      const linesAtClear = (clear: number): number => Math.floor((height - fixedHeight - clear) / lineHeight + LINE_EPSILON);
      return Math.max(Math.min(1, requiredLines), Math.min(minLines, natural, linesAtClear(floorClearHeight)), Math.min(natural, linesAtClear(clearHeight)));
    });
  const nudgeToNextLine = (height: number, lines: (number | undefined)[]): number => {
    const needed = measurements.flatMap(({ fixedHeight }, index) => {
      const shown = lines[index];
      return shown === undefined || shown >= (naturalLines[index] ?? 0) ? [] : [fixedHeight + clearHeight + (shown + 1) * lineHeight - height];
    });
    return Math.min(...needed);
  };
  let fullHeight = Math.max(contentHeight(describedFixedHeight, tallestTitleLines) + clearHeight, plainFixedHeight);
  let descriptionLines = linesWithin(fullHeight);
  for (let nudge = nudgeToNextLine(fullHeight, descriptionLines); nudge > 0 && nudge <= MAX_LINE_NUDGE_PX && fullHeight + nudge <= maxHeight; nudge = nudgeToNextLine(fullHeight, descriptionLines)) {
    fullHeight += nudge;
    descriptionLines = linesWithin(fullHeight);
  }
  const commonExcess = Math.min(
    ...measurements.flatMap(({ fixedHeight }, index) => {
      const lines = descriptionLines[index];
      return lines === undefined ? [] : [fullHeight - contentHeight(fixedHeight, lines) - clearHeight];
    }),
  );
  const height = commonExcess > maxExcessHeight ? Math.max(fullHeight - commonExcess, plainFixedHeight) : fullHeight;
  return { height, clearHeight, descriptionLines };
}

export interface CardScrollPlacement {
  sectionTop: number;
  sectionHeight: number;
  viewportHeight: number;
  cardIndex: number;
  cardCount: number;
  endSteps: number;
}

export function scrollTopForCard(placement: CardScrollPlacement): number {
  const { sectionTop, sectionHeight, viewportHeight, cardIndex, cardCount, endSteps } = placement;
  const pinnedRange = Math.max(0, sectionHeight - viewportHeight);
  const isLastCard = cardIndex >= cardCount - 1;
  const progress = cardCount <= 1 ? 0 : isLastCard ? 1 : cardIndex / (cardCount - 1 + endSteps);
  return sectionTop + progress * pinnedRange;
}

const TRAILING_PUNCTUATION = /[\s,.;:!?-]+$/;
const ELLIPSIS = String.fromCodePoint(0x2026);

export function trimToWholeWords(text: string, fits: (candidate: string) => boolean): string {
  if (fits(text)) {
    return text;
  }
  const words = text.split(/\s+/).filter((word) => word !== '');
  const candidateFor = (wordCount: number): string => `${words.slice(0, wordCount).join(' ').replace(TRAILING_PUNCTUATION, '')}${ELLIPSIS}`;
  let fitting = 0;
  let overflowing = words.length;
  while (overflowing - fitting > 1) {
    const middle = Math.floor((fitting + overflowing) / 2);
    if (fits(candidateFor(middle))) {
      fitting = middle;
    } else {
      overflowing = middle;
    }
  }
  return fitting === 0 ? ELLIPSIS : candidateFor(fitting);
}
