export interface SplitLines {
  lines: HTMLElement[];
  restore: () => void;
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

export function splitIntoLines(element: HTMLElement): SplitLines {
  const originalHtml = element.innerHTML;
  const words = (element.textContent ?? '').split(' ').filter((word) => word !== '');

  element.textContent = '';
  const wordTops = words.map((word, index) => {
    const wordElement = document.createElement('span');
    wordElement.textContent = index < words.length - 1 ? `${word} ` : word;
    element.append(wordElement);
    return wordElement.offsetTop;
  });

  const lineWords = groupWordsByOffset(words, wordTops);

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
