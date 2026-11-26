export interface SplitLines {
  lines: HTMLElement[];
  restore: () => void;
}

interface Piece {
  text: string;
  isAfterSpace: boolean;
}

interface MeasuredPieces {
  pieces: Piece[];
  tops: number[];
}

const PIECE = /[^ ]*?[-–—](?=[^ ])|[^ ]+/g;

export function groupWordsByOffset<Word>(words: Word[], offsets: number[]): Word[][] {
  const lineWords: Word[][] = [];
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

function measurePieces(element: HTMLElement): MeasuredPieces {
  const nodes = readTextNodes(element);
  const text = nodes.map((node) => node.data).join('');
  const range = document.createRange();
  const pieces: Piece[] = [];
  const tops: number[] = [];
  for (const match of text.matchAll(PIECE)) {
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
    pieces.push({ text: match[0], isAfterSpace: text[match.index - 1] === ' ' });
    tops.push(Math.round(range.getBoundingClientRect().top));
  }
  return { pieces, tops };
}

export function splitIntoLines(element: HTMLElement): SplitLines {
  const originalHtml = element.innerHTML;
  const { pieces, tops } = measurePieces(element);
  const linePieces = groupWordsByOffset(pieces, tops);

  element.textContent = '';
  const lines = linePieces.map((piecesOfLine) => {
    const mask = document.createElement('span');
    mask.className = 'text-line-mask';
    const line = document.createElement('span');
    line.className = 'text-line';
    line.textContent = piecesOfLine
      .map((piece, index) => (index > 0 && piece.isAfterSpace ? ` ${piece.text}` : piece.text))
      .join('');
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
