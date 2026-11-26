import { fetchShow } from './fetch-show.ts';
import { mergePreviousShow } from './merge-previous-show.ts';
import { parseShowJson } from './parse-show-json.ts';
import { PREVIOUS_SHOW_URL } from './show-links.ts';
import type { Show } from './show-types.ts';

const USER_AGENT = 'pretty-unfocused-site-build (podcast website generator)';
const EMPTY_SHOW: Show = { description: '', episodes: [], clips: [] };

export async function fetchPreviousShow(fetchFunction: typeof fetch): Promise<Show> {
  const response = await fetchFunction(PREVIOUS_SHOW_URL, {
    headers: { 'User-Agent': USER_AGENT, 'Cache-Control': 'no-cache' },
  });
  if (response.status === 404) {
    return EMPTY_SHOW;
  }
  if (!response.ok) {
    throw new Error(`The previously published show could not be read: HTTP ${response.status}`);
  }
  try {
    return parseShowJson(await response.text());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`The previously published show is not usable: ${reason}`, { cause: error });
  }
}

export async function loadPublishedShow(fetchFunction: typeof fetch): Promise<Show> {
  const [current, previous] = await Promise.all([fetchShow(fetchFunction), fetchPreviousShow(fetchFunction)]);
  return mergePreviousShow(current, previous);
}
