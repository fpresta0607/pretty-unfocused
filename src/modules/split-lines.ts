export interface SplitLines {
  lines: HTMLElement[];
  restore: () => void;
}

interface MeasuredWords {
  words: string[];
  tops: number[];
}

export function groupWordsByOffset(words: string[], offsets: number[]): string[][] {
  const lineWords: string[][] = [];
  words.forEach((word, index) => {
    if (index === 0 || offsets[index] !== offsets[index - 1]) {
      lineWords.push([]);
    }
    lineWords.at(-1)?.push(word);
  });
  return lineWords;
}

function readTextNodes(element: HTMLElement): Text[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode() !== null) {
    if (walker.currentNode instanceof Text) {
      nodes.push(walker.currentNode);
    }
  }
  return nodes;
}

function measureWords(element: HTMLElement): MeasuredWords {
  const nodes = readTextNodes(element);
  const text = nodes.map((node) => node.data).join('');
  const range = document.createRange();
  const words: string[] = [];
  const tops: number[] = [];
  for (const match of text.matchAll(/[^ ]+/g)) {
    let remaining = match.index;
    const node = nodes.find((candidate) => {
      if (remaining < candidate.length) {
        return true;
      }
      remaining -= candidate.length;
      return false;
    });
    if (node === undefined) {
      continue;
    }
    range.setStart(node, remaining);
    range.setEnd(node, remaining + 1);
    words.push(match[0]);
    tops.push(Math.round(range.getBoundingClientRect().top));
  }
  return { words, tops };
}

export function splitIntoLines(element: HTMLElement): SplitLines {
  const originalHtml = element.innerHTML;
  const { words, tops } = measureWords(element);
  const lineWords = groupWordsByOffset(words, tops);

  element.textContent = '';
  const lines = lineWords.map((wordsOfLine) => {
    const mask = document.createElement('span');
    mask.className = 'text-line-mask';
    const line = document.createElement('span');
    line.className = 'text-line';
    line.textContent = wordsOfLine.join(' ');
    mask.append(line);
    element.append(mask);
    return line;
  });

  return {
    lines,
    restore: () => {
      element.innerHTML = originalHtml;
    },
  };
}
