import { readFileSync } from 'node:fs';

export function readFixture(fileName: string): string {
  return readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), 'utf8');
}
