export function toIsoTimestamp(value: string, label: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`${label} has an invalid date: ${value}`);
  }
  return timestamp.toISOString();
}
