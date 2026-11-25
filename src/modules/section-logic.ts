export type Surface = 'dark' | 'light';

export const MINI_CARD_HERO_RATIO = 0.15;

export interface VerticalSpan {
  top: number;
  bottom: number;
}

export function pickSectionAtLine(spans: readonly VerticalSpan[], line: number): number | undefined {
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index];
    if (span !== undefined && span.top <= line && line < span.bottom) {
      return index;
    }
  }
  return undefined;
}

export function readSurface(value: string | undefined): Surface {
  return value === 'light' ? 'light' : 'dark';
}

export function shouldShowMiniCard(heroVisibleRatio: number): boolean {
  return heroVisibleRatio < MINI_CARD_HERO_RATIO;
}
