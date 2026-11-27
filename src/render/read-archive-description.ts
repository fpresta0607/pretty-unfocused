const LINKS = /https?:\/\/\S*/g;
const MARKS = /https?:\/\/\S*|@[\w.]+|#\w+/g;
const URL_TAIL = /^\S*[=&]\S*$/;
const MAX_LABEL_WORDS = 6;

function countWords(line: string): number {
  return line.match(/[\p{L}\p{N}'’]+/gu)?.length ?? 0;
}

function isLinkLine(line: string): boolean {
  const markCount = line.match(MARKS)?.length ?? 0;
  return (markCount > 0 && countWords(line.replace(MARKS, '')) <= markCount * MAX_LABEL_WORDS) || URL_TAIL.test(line);
}

function isLabelFor(line: string, next: string | undefined): boolean {
  return next !== undefined && isLinkLine(next) && countWords(line) <= MAX_LABEL_WORDS;
}

function readParagraph(block: string): string {
  const lines = block.split('\n');
  return lines
    .filter((line, index) => !isLinkLine(line) && !isLabelFor(line, lines[index + 1]))
    .map((line) => line.replace(LINKS, '').replace(/\s+/g, ' ').trim())
    .join(' ')
    .trim();
}

export function readArchiveDescription(description: string): string[] {
  return description
    .split(/\n{2,}/)
    .map(readParagraph)
    .filter((paragraph) => paragraph !== '');
}
