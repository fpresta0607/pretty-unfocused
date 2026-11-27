const ROOT_FONT_SIZE_PX = 16;

function resolveLength(length: string, viewportWidth: number): number {
  const difference = /^calc\((.+) - (.+)\)$/.exec(length);
  if (difference !== null) {
    return resolveLength(difference[1] ?? '', viewportWidth) - resolveLength(difference[2] ?? '', viewportWidth);
  }
  const dimension = /^(\d+(?:\.\d+)?)(px|vw|rem)$/.exec(length);
  if (dimension === null) {
    throw new Error(`Unsupported length in sizes: ${length}`);
  }
  const value = Number(dimension[1]);
  if (dimension[2] === 'vw') {
    return (value * viewportWidth) / 100;
  }
  return dimension[2] === 'rem' ? value * ROOT_FONT_SIZE_PX : value;
}

// Resolves an img sizes attribute the way a browser does for a viewport width: the first entry whose media condition matches wins.
export function resolveImageSlotWidth(sizes: string, viewportWidth: number): number {
  for (const entry of sizes.split(/,\s*/)) {
    const conditional = /^\(min-width: (\d+)px\) (.+)$/.exec(entry);
    if (conditional === null) {
      return resolveLength(entry, viewportWidth);
    }
    if (viewportWidth >= Number(conditional[1])) {
      return resolveLength(conditional[2] ?? '', viewportWidth);
    }
  }
  throw new Error(`sizes has no default length: ${sizes}`);
}
