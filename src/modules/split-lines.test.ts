// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { groupWordsByOffset, splitIntoLines } from './split-lines.ts';

const LINE_PITCH_PX = 28;
const COLUMN_CHARACTERS = 24;

function wrapGreedily(text: string): string[] {
  const lines: string[] = [];
  text.split(' ').forEach((word) => {
    const current = lines.at(-1);
    if (current !== undefined && current.length + 1 + word.length <= COLUMN_CHARACTERS) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else {
      lines.push(word);
    }
  });
  return lines;
}

function placeCharactersOnColumn(element: HTMLElement): string[] {
  const settledLines = wrapGreedily(element.textContent ?? '');
  vi.spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: Range) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let characterIndex = this.startOffset;
    while (walker.nextNode() !== null && walker.currentNode !== this.startContainer) {
      characterIndex += walker.currentNode.textContent?.length ?? 0;
    }
    let lineStart = 0;
    const lineIndex = settledLines.findIndex((line) => {
      lineStart += line.length + 1;
      return characterIndex < lineStart;
    });
    return new DOMRect(0, lineIndex * LINE_PITCH_PX, 10, LINE_PITCH_PX);
  });
  return settledLines;
}

describe('groupWordsByOffset', () => {
  it.each([
    [[], [], []],
    [['New'], [0], [['New']]],
    [['New', 'episode', 'every'], [0, 0, 0], [['New', 'episode', 'every']]],
    [['New', 'episode', 'every', 'Monday'], [0, 0, 24, 24], [['New', 'episode'], ['every', 'Monday']]],
    [['a', 'b', 'c'], [0, 20, 40], [['a'], ['b'], ['c']]],
  ])('groups %j at offsets %j into lines', (words, offsets, expected) => {
    expect(groupWordsByOffset(words, offsets)).toEqual(expected);
  });
});

describe('splitIntoLines', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['plain text', 'Hosted by Maya and Gia, two chronically curious besties talking about everything'],
    [
      'text with inline wrappers and punctuation after them',
      'Hosted by Maya and Gia (two chronically curious besties). We are talking ADHD, <span>self-growth</span>, and the messy middle<span>-plus</span> whatever',
    ],
  ])('splits %s into the very lines the settled layout breaks it into', (_name, html) => {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = html;
    document.body.append(paragraph);
    const settledLines = placeCharactersOnColumn(paragraph);

    const { lines } = splitIntoLines(paragraph);

    expect(lines.map((line) => line.textContent)).toEqual(settledLines);
    expect(lines).toHaveLength(settledLines.length);
  });

  it('restores the original markup', () => {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = 'Alpha <span>beta</span>, gamma delta epsilon zeta eta theta iota kappa';
    document.body.append(paragraph);
    placeCharactersOnColumn(paragraph);
    const originalHtml = paragraph.innerHTML;

    const { restore } = splitIntoLines(paragraph);
    restore();

    expect(paragraph.innerHTML).toBe(originalHtml);
  });
});
