import { describe, expect, it } from 'vitest';

import { fetchShow } from './fetch-show.ts';
import { readFixture } from './read-fixture.ts';
import { PODCAST_FEED_URL, SPOTIFY_SHOW_URL, YOUTUBE_FEED_URL } from './show-links.ts';

const SPOTIFY_ARTWORK_URL = 'https://i.scdn.co/image/ab6765630000ba8a8a5ad1a6dbabbba0e074814c';
const SPOTIFY_SHOW_PAGE = `<html><head><meta property="og:image" content="${SPOTIFY_ARTWORK_URL}"/></head></html>`;

interface FakeFetchOptions {
  spotifyResponse?: Response;
  spotifyError?: Error;
  podcastResponse?: Response;
  youtubeResponse?: Response;
  imageStatusByUrl?: ReadonlyMap<string, number>;
  onImageRequest?: (url: string, init: RequestInit | undefined) => Promise<void>;
}

function createFakeFetch(options: FakeFetchOptions = {}): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    if (url === PODCAST_FEED_URL) {
      return options.podcastResponse ?? new Response(readFixture('podcast-feed.xml'));
    }
    if (url === YOUTUBE_FEED_URL) {
      return options.youtubeResponse ?? new Response(readFixture('youtube-feed.xml'));
    }
    if (url === SPOTIFY_SHOW_URL) {
      if (options.spotifyError !== undefined) {
        throw options.spotifyError;
      }
      return options.spotifyResponse ?? new Response(SPOTIFY_SHOW_PAGE);
    }
    if (url.startsWith('https://i.ytimg.com/vi/')) {
      await options.onImageRequest?.(url, init);
      return new Response(null, { status: options.imageStatusByUrl?.get(url) ?? 404 });
    }
    throw new Error(`Unexpected request to ${url}`);
  };
}

function buildYoutubeFeed(videoIds: readonly string[]): string {
  const entries = videoIds
    .map(
      (videoId) => `<entry>
  <yt:videoId>${videoId}</yt:videoId>
  <title>Video ${videoId}</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=${videoId}"/>
  <published>2026-11-09T12:00:05+00:00</published>
</entry>`,
    )
    .join('\n');
  return `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">${entries}</feed>`;
}

describe('fetchShow', () => {
  it('builds the show from both feeds and the thumbnail checks', async () => {
    const fakeFetch = createFakeFetch({
      imageStatusByUrl: new Map([
        ['https://i.ytimg.com/vi/V_d6gE3FMCY/maxresdefault.jpg', 200],
        ['https://i.ytimg.com/vi/yxxXqs1vHI8/oardefault.jpg', 200],
        ['https://i.ytimg.com/vi/8nJMXmxCnKM/oardefault.jpg', 403],
      ]),
    });

    const show = await fetchShow(fakeFetch);

    expect(show.episodes).toHaveLength(6);
    expect(show.clips).toHaveLength(2);
    const thumbnailsByVideoId = new Map(
      show.episodes.map((episode) => [episode.youtubeVideoId, episode.thumbnail]),
    );
    expect(thumbnailsByVideoId.get('V_d6gE3FMCY')?.srcset).toContain('maxresdefault.jpg 1280w');
    expect(thumbnailsByVideoId.get('M-Q4eX8Szic')?.srcset).not.toContain('maxresdefault');
    expect(show.clips.map((clip) => clip.thumbnail.src)).toEqual([
      'https://i.ytimg.com/vi/yxxXqs1vHI8/oardefault.jpg',
      'https://i.ytimg.com/vi/8nJMXmxCnKM/hqdefault.jpg',
    ]);
  });

  it('checks thumbnails with HEAD requests that identify the site', async () => {
    const imageRequests: { url: string; init: RequestInit | undefined }[] = [];
    const fakeFetch = createFakeFetch({
      onImageRequest: async (url, init) => {
        imageRequests.push({ url, init });
      },
    });

    await fetchShow(fakeFetch);

    expect(imageRequests.map((request) => request.url).sort()).toEqual([
      'https://i.ytimg.com/vi/8nJMXmxCnKM/oardefault.jpg',
      'https://i.ytimg.com/vi/M-Q4eX8Szic/maxresdefault.jpg',
      'https://i.ytimg.com/vi/V_d6gE3FMCY/maxresdefault.jpg',
      'https://i.ytimg.com/vi/fN3NtGR3Nnk/maxresdefault.jpg',
      'https://i.ytimg.com/vi/yxxXqs1vHI8/oardefault.jpg',
    ]);
    expect(imageRequests.every((request) => request.init?.method === 'HEAD')).toBe(true);
    expect(JSON.stringify(imageRequests[0]?.init?.headers)).toContain('pretty-unfocused-site');
  });

  it('gives an episode without a video the smaller show artwork published on Spotify', async () => {
    const show = await fetchShow(createFakeFetch());

    const episodesWithoutVideo = show.episodes.filter((episode) => episode.youtubeVideoId === undefined);
    expect(episodesWithoutVideo.length).toBeGreaterThan(0);
    for (const episode of episodesWithoutVideo) {
      expect(episode.thumbnail).toEqual({ src: SPOTIFY_ARTWORK_URL, width: 640, height: 640 });
    }
  });

  it.each([
    ['the Spotify page is not available', new Response('down', { status: 503 })],
    ['the Spotify page has no image', new Response('<html><head></head></html>')],
    ['the Spotify page image is on another host', new Response('<meta property="og:image" content="https://example.com/image/ab01"/>')],
  ])('keeps the feed artwork when %s', async (_label, spotifyResponse) => {
    const show = await fetchShow(createFakeFetch({ spotifyResponse }));

    const episodesWithoutVideo = show.episodes.filter((episode) => episode.youtubeVideoId === undefined);
    expect(episodesWithoutVideo.length).toBeGreaterThan(0);
    for (const episode of episodesWithoutVideo) {
      expect(episode.thumbnail.src).toContain('cloudfront.net');
      expect(episode.thumbnail.width).toBe(1400);
    }
  });

  it('keeps the feed artwork and still builds when the Spotify page cannot be reached', async () => {
    const show = await fetchShow(createFakeFetch({ spotifyError: new TypeError('fetch failed') }));

    const episodesWithoutVideo = show.episodes.filter((episode) => episode.youtubeVideoId === undefined);
    expect(episodesWithoutVideo.length).toBeGreaterThan(0);
    for (const episode of episodesWithoutVideo) {
      expect(episode.thumbnail.src).toContain('cloudfront.net');
    }
  });

  it('keeps at most 6 thumbnail checks in flight', async () => {
    const videoIds = Array.from({ length: 25 }, (_value, index) => `video${index}`);
    let inFlight = 0;
    let highestInFlight = 0;
    const fakeFetch = createFakeFetch({
      youtubeResponse: new Response(buildYoutubeFeed(videoIds)),
      onImageRequest: async () => {
        inFlight += 1;
        highestInFlight = Math.max(highestInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
      },
    });

    await fetchShow(fakeFetch);

    expect(highestInFlight).toBe(6);
  });

  it.each([
    ['podcast feed', { podcastResponse: new Response('down', { status: 503 }) }, /Podcast feed.*HTTP 503/],
    ['YouTube feed', { youtubeResponse: new Response('missing', { status: 404 }) }, /YouTube feed.*HTTP 404/],
  ])('throws an error naming the %s and the status on a non-2xx response', async (_label, options, message) => {
    await expect(fetchShow(createFakeFetch(options))).rejects.toThrow(message);
  });

  it('throws when the YouTube feed has no entries', async () => {
    const fakeFetch = createFakeFetch({ youtubeResponse: new Response(buildYoutubeFeed([])) });

    await expect(fetchShow(fakeFetch)).rejects.toThrow('YouTube feed has no entries');
  });

  it('throws when the podcast feed has no items', async () => {
    const emptyPodcast = '<rss><channel><title>Empty</title></channel></rss>';
    const fakeFetch = createFakeFetch({ podcastResponse: new Response(emptyPodcast) });

    await expect(fetchShow(fakeFetch)).rejects.toThrow('Podcast feed has no items');
  });
});
