import { describe, expect, it, vi } from 'vitest';

import { buildFixtureShow } from './build-fixture-show.ts';
import { fetchPreviousShow, loadPublishedShow } from './load-show.ts';
import { PREVIOUS_SHOW_URL, PODCAST_FEED_URL, YOUTUBE_FEED_URL } from './show-links.ts';
import { readFixture } from './read-fixture.ts';
import type { Show } from './show-types.ts';

function makeFetch(answers: Record<string, () => Response>): typeof fetch {
  return vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : String(input);
    const answer = answers[url];
    if (answer === undefined) {
      return Promise.reject(new Error(`Unexpected request to ${url}`));
    }
    return Promise.resolve(answer());
  });
}

function makeFeedAnswers(): Record<string, () => Response> {
  return {
    [PODCAST_FEED_URL]: () => new Response(readFixture('podcast-feed.xml')),
    [YOUTUBE_FEED_URL]: () => new Response(readFixture('youtube-feed.xml')),
  };
}

function makeImageAnswers(fetchFunction: typeof fetch): typeof fetch {
  return vi.fn<typeof fetch>((input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith('https://i.ytimg.com/')) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    return fetchFunction(input, init);
  });
}

const OLD_EPISODE: Show['episodes'][number] = {
  id: 'dropped-out-of-the-feed',
  title: 'An old episode',
  publishedAt: '2020-01-06T12:00:00.000Z',
  description: 'Long ago',
  youtubeUrl: 'https://www.youtube.com/watch?v=dropped',
  youtubeVideoId: 'dropped',
  thumbnail: { src: 'https://i.ytimg.com/vi/dropped/hqdefault.jpg', width: 480, height: 360 },
};

describe('fetchPreviousShow', () => {
  it('reads the published show.json', async () => {
    const show = buildFixtureShow();
    const fetchFunction = makeFetch({ [PREVIOUS_SHOW_URL]: () => new Response(JSON.stringify(show)) });

    expect(await fetchPreviousShow(fetchFunction)).toEqual(show);
  });

  it('counts a 404, the very first build, as an empty previous show', async () => {
    const fetchFunction = makeFetch({ [PREVIOUS_SHOW_URL]: () => new Response('not found', { status: 404 }) });

    expect(await fetchPreviousShow(fetchFunction)).toEqual({ description: '', episodes: [], clips: [] });
  });

  it.each([
    ['a server error', () => new Response('boom', { status: 500 }), 'HTTP 500'],
    ['an access error', () => new Response('no', { status: 403 }), 'HTTP 403'],
    ['text that is not JSON', () => new Response('<html>maintenance</html>'), 'not valid JSON'],
    ['JSON that is not a show', () => new Response('{"episodes":"none"}'), 'show.description must be a string'],
  ])('fails loudly on %s', async (_name, answer, message) => {
    const fetchFunction = makeFetch({ [PREVIOUS_SHOW_URL]: answer });

    await expect(fetchPreviousShow(fetchFunction)).rejects.toThrow(message);
  });

  it('fails loudly when the network is down', async () => {
    const fetchFunction = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchPreviousShow(fetchFunction)).rejects.toThrow('fetch failed');
  });
});

describe('loadPublishedShow', () => {
  it('keeps an episode the new feeds no longer list', async () => {
    const answers = { ...makeFeedAnswers(), [PREVIOUS_SHOW_URL]: () => new Response(JSON.stringify({ description: 'x', episodes: [OLD_EPISODE], clips: [] })) };

    const show = await loadPublishedShow(makeImageAnswers(makeFetch(answers)));

    expect(show.episodes.map((episode) => episode.id)).toContain(OLD_EPISODE.id);
    expect(show.episodes.length).toBeGreaterThan(1);
  });

  it('builds from the feeds alone on the very first build', async () => {
    const answers = { ...makeFeedAnswers(), [PREVIOUS_SHOW_URL]: () => new Response('not found', { status: 404 }) };

    const show = await loadPublishedShow(makeImageAnswers(makeFetch(answers)));

    expect(show.episodes.map((episode) => episode.id)).not.toContain(OLD_EPISODE.id);
    expect(show.episodes.length).toBeGreaterThan(0);
  });

  it('fails the build, rather than publish a half empty page, when the previous show cannot be read', async () => {
    const answers = { ...makeFeedAnswers(), [PREVIOUS_SHOW_URL]: () => new Response('down', { status: 503 }) };

    await expect(loadPublishedShow(makeImageAnswers(makeFetch(answers)))).rejects.toThrow('HTTP 503');
  });
});
