import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const CLIPS_CSS = readFileSync('src/styles/clips.css', 'utf8');
const TOKENS_CSS = readFileSync('src/styles/tokens.css', 'utf8');
const WIDE_SECTION_PADDING = 40;
const FAN_POSITIONS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
const MINI_CARD_CLEARANCE = 24;
const ROOT_FONT_SIZE = 16;

interface Viewport {
  width: number;
  height: number;
}

function readDeclaration(stylesheet: string, property: string, which: 'first' | 'last'): string {
  const matches = [...stylesheet.matchAll(new RegExp(`${property}:\\s*([^;]+);`, 'g'))];
  const match = which === 'first' ? matches[0] : matches[matches.length - 1];
  if (match?.[1] === undefined) {
    throw new Error(`No ${property} in the stylesheet`);
  }
  return match[1].replace(/\s+/g, ' ').trim();
}

function readLength(expression: string, viewport: Viewport, fanWidth: number, cardWidth?: number): number {
  const lookups: Record<string, string> = {
    '--card-w': `${cardWidth ?? 0}px`,
    '--ring': readDeclaration(CLIPS_CSS, '--ring', 'first'),
    '--pad-top': readDeclaration(CLIPS_CSS, '--pad-top', 'last'),
    '--size-h2': readDeclaration(CLIPS_CSS, '--size-h2', 'last'),
    '--head-height': readDeclaration(CLIPS_CSS, '--head-height', 'last'),
    '--fan-clear': readDeclaration(CLIPS_CSS, '--fan-clear', 'last'),
    '--round-size': readDeclaration(TOKENS_CSS, '--round-size', 'first'),
    '--mini-card-height': readDeclaration(TOKENS_CSS, '--mini-card-height', 'first'),
    '--space-2': readDeclaration(TOKENS_CSS, '--space-2', 'first'),
    '--space-3': readDeclaration(TOKENS_CSS, '--space-3', 'first'),
    '--space-4': readDeclaration(TOKENS_CSS, '--space-4', 'first'),
  };
  let text = expression;
  while (text.includes('var(')) {
    text = text.replace(/var\((--[\w-]+)\)/g, (_match, name: string) => `(${lookups[name] ?? ''})`);
  }
  const tokens = text.match(/-?\d*\.?\d+[a-z]*|[a-z]+|[()+\-*/,]/g) ?? [];
  let position = 0;
  const unitSizes: Record<string, number> = { px: 1, rem: ROOT_FONT_SIZE, vw: viewport.width / 100, svh: viewport.height / 100, cqi: fanWidth / 100 };

  function parseValue(): number {
    const token = tokens[position];
    position += 1;
    if (token === '(') {
      const value = parseSum();
      position += 1;
      return value;
    }
    if (token === 'calc') {
      return parseValue();
    }
    if (token === 'min' || token === 'max' || token === 'clamp') {
      position += 1;
      const values = [parseSum()];
      while (tokens[position] === ',') {
        position += 1;
        values.push(parseSum());
      }
      position += 1;
      if (token === 'clamp') {
        return Math.min(Math.max(values[1] ?? 0, values[0] ?? 0), values[2] ?? 0);
      }
      return token === 'min' ? Math.min(...values) : Math.max(...values);
    }
    const [, amount = '', unit = ''] = /^(-?\d*\.?\d+)([a-z]*)$/.exec(token ?? '') ?? [];
    return Number(amount) * (unitSizes[unit] ?? 1);
  }

  function parseProduct(): number {
    let value = parseValue();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const isProduct = tokens[position] === '*';
      position += 1;
      const operand = parseValue();
      value = isProduct ? value * operand : value / operand;
    }
    return value;
  }

  function parseSum(): number {
    let value = parseProduct();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const isSum = tokens[position] === '+';
      position += 1;
      const operand = parseProduct();
      value = isSum ? value + operand : value - operand;
    }
    return value;
  }

  return parseSum();
}

function readLowestPoint(viewport: Viewport): { lowest: number; miniCardTop: number } {
  const fanWidth = viewport.width - 2 * WIDE_SECTION_PADDING;
  const cardWidth = readLength(readDeclaration(CLIPS_CSS, '--card-w', 'last'), viewport, fanWidth);
  const drop = readLength(readDeclaration(CLIPS_CSS, '--fan-drop', 'last'), viewport, fanWidth, cardWidth);
  const turnDegrees = Number.parseFloat(readDeclaration(CLIPS_CSS, '--fan-turn', 'last'));
  const cardHeight = (cardWidth * 16) / 9;
  const stageTop = readLength('var(--pad-top)', viewport, fanWidth);
  const fanTop = stageTop + readLength('var(--head-height) + var(--space-3) + var(--space-4)', viewport, fanWidth);
  const ring = readLength('var(--ring)', viewport, fanWidth);
  const lowestCorner = Math.max(
    ...FAN_POSITIONS.map((fanPosition) => {
      const radians = (Math.abs(fanPosition) * turnDegrees * Math.PI) / 180;
      const centre = fanTop + cardHeight / 2 + fanPosition * fanPosition * drop;
      return centre + (cardHeight / 2) * Math.cos(radians) + (cardWidth / 2) * Math.sin(radians);
    }),
  );
  const miniCardTop = viewport.height - readLength('var(--space-4) + var(--mini-card-height)', viewport, fanWidth);
  return { lowest: lowestCorner + ring, miniCardTop };
}

describe('the clip fan at 1440 px and wider', () => {
  it.each([
    [1440, 900],
    [1680, 1050],
    [1920, 1080],
    [2560, 1440],
  ])('keeps every card corner, rings included, 24 px above the mini card at %i x %i', (width, height) => {
    const { lowest, miniCardTop } = readLowestPoint({ width, height });

    expect(miniCardTop - lowest).toBeGreaterThanOrEqual(MINI_CARD_CLEARANCE);
  });

  it('sizes the cards to the room, so a taller screen gets larger cards', () => {
    const viewportShort = { width: 1920, height: 900 };
    const viewportTall = { width: 1920, height: 1080 };
    const fanWidth = 1920 - 2 * WIDE_SECTION_PADDING;
    const cardWidth = (viewport: Viewport): number => readLength(readDeclaration(CLIPS_CSS, '--card-w', 'last'), viewport, fanWidth);

    expect(cardWidth(viewportTall)).toBeGreaterThan(cardWidth(viewportShort));
  });
});
