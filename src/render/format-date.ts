const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatShortDate(isoTimestamp: string): string {
  return SHORT_DATE_FORMAT.format(new Date(isoTimestamp));
}

export function formatLongDate(isoTimestamp: string): string {
  return LONG_DATE_FORMAT.format(new Date(isoTimestamp));
}
