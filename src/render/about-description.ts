const CLOSING_SENTENCE = 'Cozy chaos only.';
const WORD_JOINER = '\u2060';
const NO_BREAK_SPACE = '\u00a0';
const SPACED_EM_DASH = /\s+\u2014/g;
const ATTACHED_EM_DASH = /(?<=\S)\u2014/g;

export function readAboutDescription(description: string): string {
  const trimmedDescription = description.trim();
  const body = trimmedDescription.endsWith(CLOSING_SENTENCE)
    ? trimmedDescription.slice(0, -CLOSING_SENTENCE.length).trimEnd()
    : trimmedDescription;
  return body.replace(SPACED_EM_DASH, `${NO_BREAK_SPACE}\u2014`).replace(ATTACHED_EM_DASH, `${WORD_JOINER}\u2014`);
}
