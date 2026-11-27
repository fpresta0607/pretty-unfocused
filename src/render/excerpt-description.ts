export function excerptDescription(description: string, maxCharacters: number): string {
  if (description.length <= maxCharacters) {
    return description;
  }
  const clipped = description.slice(0, maxCharacters);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}
