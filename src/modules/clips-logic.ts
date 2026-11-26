import { EASE_POP } from './motion-tokens.ts';

export const DEAL_START_FRACTION = 1;
export const DEAL_SPAN_FRACTION = 0.45;
export const DEAL_WINDOW = 0.5;

function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}

export function dealProgress(fanTop: number, viewportHeight: number): number {
  return clamp((DEAL_START_FRACTION - fanTop / viewportHeight) / DEAL_SPAN_FRACTION, 0, 1);
}

export function dealRanks(positions: readonly number[]): number[] {
  const order = positions
    .map((position, index) => ({ position, index }))
    .sort((left, right) => Math.abs(left.position) - Math.abs(right.position) || left.position - right.position);
  const ranks: number[] = [];
  order.forEach(({ index }, rank) => {
    ranks[index] = rank;
  });
  return ranks;
}

export function cardDeal(progress: number, rank: number, cardCount: number): number {
  const staggerStep = cardCount > 1 ? (1 - DEAL_WINDOW) / (cardCount - 1) : 0;
  const localProgress = clamp((progress - rank * staggerStep) / DEAL_WINDOW, 0, 1);
  return EASE_POP(localProgress);
}

const TRAILING_PUNCTUATION = /[\s!?.,:;]+$/u;

export function fitTitle(title: string, isFitting: (text: string) => boolean): string {
  if (isFitting(title)) {
    return title;
  }
  const words = title.split(' ');
  const clipped = (keptWords: number): string => `${words.slice(0, keptWords).join(' ').replace(TRAILING_PUNCTUATION, '')}…`;
  let fewest = 1;
  let most = words.length - 1;
  while (fewest < most) {
    const middle = Math.ceil((fewest + most) / 2);
    if (isFitting(clipped(middle))) {
      fewest = middle;
    } else {
      most = middle - 1;
    }
  }
  return clipped(fewest);
}
