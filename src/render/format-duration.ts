const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export function formatDuration(durationSeconds: number): string {
  if (durationSeconds >= SECONDS_PER_HOUR) {
    const hours = Math.floor(durationSeconds / SECONDS_PER_HOUR);
    const minutes = Math.floor((durationSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return `${hours} h ${String(minutes).padStart(2, '0')}`;
  }
  return `${Math.floor(durationSeconds / SECONDS_PER_MINUTE)} min`;
}
