const LINKS = /https?:\/\/\S*/g;
const MARKS = /https?:\/\/\S*|@[\w.]+|#\w+/g;
const URL_TAIL = /^\S*[=&]\S*$/;
const POINTS_AT_LINKS =
  /\bbelow\b|\blinked\b|\bfollow our (?:personal )?socials\b|^\W*(?:instagram|tiktok|youtube|spotify|apple)\b[^.!?]*:/i;
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

function dropSentencesPointingAtLinks(line: string): string {
  return line
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !POINTS_AT_LINKS.test(sentence))
    .join(' ');
}

function readParagraph(block: string): string {
  const lines = block.split('\n');
  return lines
    .filter((line, index) => !isLinkLine(line) && !isLabelFor(line, lines[index + 1]))
    .map((line) => line.replace(LINKS, '').replace(/\s+/g, ' ').trim())
    .map(dropSentencesPointingAtLinks)
    .join(' ')
    .trim();
}

export function readArchiveDescription(description: string): string[] {
  return description
    .split(/\n{2,}/)
    .map(readParagraph)
    .filter((paragraph) => paragraph !== '');
}
