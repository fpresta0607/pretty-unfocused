const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (
      entity: string,
      decimal: string | undefined,
      hexadecimal: string | undefined,
      name: string | undefined,
    ) => {
      if (decimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      }
      if (hexadecimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return (name !== undefined && NAMED_ENTITIES[name.toLowerCase()]) || entity;
    },
  );
}

function stripTags(markup: string): string {
  return decodeEntities(markup.replace(/<[^>]*>/g, ' '));
}

export function toPlainText(markup: string): string {
  return stripTags(markup).replace(/\s+/g, ' ').trim();
}

export function toPlainLines(markup: string): string {
  return stripTags(markup)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
