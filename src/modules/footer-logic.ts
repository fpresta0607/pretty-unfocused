import { EASE_SCRUB } from './motion-tokens.ts';

export const RISE_RANGE_WORD_HEIGHTS = 1.25;
export const IN_VIEW_FROM_FRACTION = 0.85;

export function riseProgress(distanceToPageEnd: number, wordHeight: number): number {
  const linear = 1 - distanceToPageEnd / (RISE_RANGE_WORD_HEIGHTS * wordHeight);
  return EASE_SCRUB(Math.min(Math.max(linear, 0), 1));
}

export function isFooterInView(footerTop: number, viewportHeight: number): boolean {
  return footerTop < viewportHeight * IN_VIEW_FROM_FRACTION;
}
