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
