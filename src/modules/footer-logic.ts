export const IN_VIEW_FROM_FRACTION = 0.85;

export function riseProgress(distanceToPageEnd: number, runLength: number): number {
  const linear = 1 - distanceToPageEnd / runLength;
  return Math.min(Math.max(linear, 0), 1);
}

export function isFooterInView(footerTop: number, viewportHeight: number): boolean {
  return footerTop < viewportHeight * IN_VIEW_FROM_FRACTION;
}
