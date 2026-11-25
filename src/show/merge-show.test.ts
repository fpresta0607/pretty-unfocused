import { describe, expect, it } from 'vitest';

import { mergeShow, normaliseTitle, type ThumbnailAvailability } from './merge-show.ts';
import { parsePodcastFeed, type PodcastFeed, type PodcastItem } from './parse-podcast-feed.ts';
import { parseYoutubeFeed, type YoutubeEntry } from './parse-youtube-feed.ts';
import { readFixture } from './read-fixture.ts';

const NO_THUMBNAILS: ThumbnailAvailability = {
  maxresVideoIds: new Set(),
  oardefaultVideoIds: new Set(),
};

function createPodcastItem(overrides: Partial<PodcastItem>): PodcastItem {
  return {
    guid: 'guid',
    title: 'Episode',
    publishedAt: '2026-10-01T00:00:00.000Z',
    description: 'Podcast description',
    spotifyUrl: 'https://example.com/spotify',
    ...overrides,
  };
}

function createYoutubeEntry(overrides: Partial<YoutubeEntry>): YoutubeEntry {
  return {
    videoId: 'video',
    title: 'Episode',
    publishedAt: '2026-10-01T00:00:00.000Z',
    description: 'YouTube description',
    url: 'https://www.youtube.com/watch?v=video',
    isShort: false,
    ...overrides,
  };
}

function createPodcastFeed(items: PodcastItem[], imageUrl?: string): PodcastFeed {
  return {
    description: 'Show description',
    items,
    ...(imageUrl === undefined ? {} : { imageUrl }),
  };
}

describe('normaliseTitle', () => {
  it.each([
    ['Hagrid and Dumbledore | Pretty Unfocused', 'hagrid and dumbledore'],
    ['Hagrid and Dumbledore | Pretty Unfocused ', 'hagrid and dumbledore'],
    ['Hagrid and Dumbledore |pretty unfocused', 'hagrid and dumbledore'],
    ["Figuring out our mid 20's ", 'figuring out our mid 20s'],
    ['Figuring out our mid 20’s', 'figuring out our mid 20s'],
    ['Tom &amp; Jerry!', 'tom jerry'],
    ['  Lots   of\tspace  ', 'lots of space'],
  ])('normalises %j to %j', (title, expected) => {
    expect(normaliseTitle(title)).toBe(expected);
  });
});

describe('mergeShow with the real feed fixtures', () => {
  const podcast = parsePodcastFeed(readFixture('podcast-feed.xml'));
  const youtube = parseYoutubeFeed(readFixture('youtube-feed.xml'));
  const show = mergeShow(podcast, youtube, NO_THUMBNAILS);

  it('uses the podcast channel description as the show description', () => {
    expect(show.description).toBe(podcast.description);
  });

  it('lists episodes newest first', () => {
    expect(show.episodes.map((episode) => episode.title)).toEqual([
      'We Gobbled Up This Episode',
      'Reminiscing Highschool, Juul Addictions, and More!',
      'Hagrid and Dumbledore Have an Ultimate Girls Night',
      'The Halloween Takeover of Pete and Timmy',
      'Things That Scare Dale and Brennan as Adults',
      "Figuring out our mid 20's",
    ]);
  });

  it('merges a YouTube video and a podcast item with the same title into one episode', () => {
    const episode = show.episodes.find((candidate) => candidate.number === 20);

    expect(episode).toMatchObject({
      id: 'V_d6gE3FMCY',
      title: 'Hagrid and Dumbledore Have an Ultimate Girls Night',
      publishedAt: '2026-10-26T11:00:23.000Z',
      durationSeconds: 4529,
      youtubeUrl: 'https://www.youtube.com/watch?v=V_d6gE3FMCY',
      youtubeVideoId: 'V_d6gE3FMCY',
      spotifyUrl:
        'https://podcasters.spotify.com/pod/show/mayagia/episodes/Hagrid-and-Dumbledore-Have-an-Ultimate-Girls-Night-e3r04cc',
    });
    expect(episode?.description.startsWith('What')).toBe(true);
    expect(show.episodes.filter((candidate) => candidate.title.startsWith('Hagrid'))).toHaveLength(1);
  });

  it('keeps podcast-only episodes with Spotify links and their own artwork', () => {
    const episode = show.episodes.find((candidate) => candidate.number === 18);

    expect(episode).toMatchObject({
      id: '0d4ec82d-d3e1-4644-a08e-10fc0247b22b',
      title: 'Things That Scare Dale and Brennan as Adults',
      durationSeconds: 3801,
      thumbnail: { src: podcast.items[2]?.imageUrl, width: 1400, height: 1400 },
    });
    expect(episode?.spotifyUrl).toContain('Things-That-Scare-Dale-and-Brennan-as-Adults');
    expect(episode).not.toHaveProperty('youtubeUrl');
  });

  it('leaves YouTube-only episodes unnumbered because no feed numbers them', () => {
    const youtubeOnlyEpisodes = show.episodes.filter(
      (episode) => episode.youtubeVideoId === 'M-Q4eX8Szic' || episode.youtubeVideoId === 'fN3NtGR3Nnk',
    );

    expect(youtubeOnlyEpisodes).toHaveLength(2);
    youtubeOnlyEpisodes.forEach((episode) => expect(episode).not.toHaveProperty('number'));
  });

  it('strips the show suffix from YouTube-only titles and leaves them without a Spotify link', () => {
    const episode = show.episodes.find((candidate) => candidate.youtubeVideoId === 'fN3NtGR3Nnk');

    expect(episode?.title).toBe('We Gobbled Up This Episode');
    expect(episode).not.toHaveProperty('spotifyUrl');
  });

  it('lists Shorts as clips newest first', () => {
    expect(show.clips.map((clip) => clip.youtubeVideoId)).toEqual(['yxxXqs1vHI8', '8nJMXmxCnKM']);
    expect(show.clips[1]).toMatchObject({
      id: '8nJMXmxCnKM',
      title: 'How it be',
      publishedAt: '2026-11-19T15:46:15.000Z',
      youtubeUrl: 'https://www.youtube.com/shorts/8nJMXmxCnKM',
    });
  });
});

describe('mergeShow numbering', () => {
  it.each([
    ['older than', '2026-09-01T00:00:00.000Z'],
    ['newer than', '2026-11-01T00:00:00.000Z'],
  ])(
    'leaves a YouTube-only episode %s the newest numbered podcast episode unnumbered',
    (_label, publishedAt) => {
      const podcast = createPodcastFeed(
        [createPodcastItem({ title: 'Numbered', number: 20, publishedAt: '2026-10-10T00:00:00.000Z' })],
        'https://example.com/art.jpg',
      );
      const youtube = { entries: [createYoutubeEntry({ videoId: 'trailer', title: 'Trailer', publishedAt })] };

      const show = mergeShow(podcast, youtube, NO_THUMBNAILS);

      const numbers = Object.fromEntries(show.episodes.map((episode) => [episode.title, episode.number]));
      expect(numbers).toEqual({ Numbered: 20, Trailer: undefined });
      expect(show.episodes.find((episode) => episode.youtubeVideoId === 'trailer')).not.toHaveProperty('number');
    },
  );
});

describe('mergeShow matching and descriptions', () => {
  it('prefers the YouTube description and falls back to the podcast one when it is empty', () => {
    const podcast = createPodcastFeed([createPodcastItem({ title: 'Same' })], 'https://example.com/art.jpg');

    const withDescription = mergeShow(
      podcast,
      { entries: [createYoutubeEntry({ title: 'Same | Pretty Unfocused' })] },
      NO_THUMBNAILS,
    );
    const withoutDescription = mergeShow(
      podcast,
      { entries: [createYoutubeEntry({ title: 'Same | Pretty Unfocused', description: '' })] },
      NO_THUMBNAILS,
    );

    expect(withDescription.episodes[0]?.description).toBe('YouTube description');
    expect(withoutDescription.episodes[0]?.description).toBe('Podcast description');
  });

  it('matches one YouTube video to at most one podcast item', () => {
    const podcast = createPodcastFeed(
      [createPodcastItem({ guid: 'a', title: 'Twin' }), createPodcastItem({ guid: 'b', title: 'Twin' })],
      'https://example.com/art.jpg',
    );
    const youtube = { entries: [createYoutubeEntry({ title: 'Twin' })] };

    const show = mergeShow(podcast, youtube, NO_THUMBNAILS);

    expect(show.episodes.filter((episode) => episode.youtubeUrl !== undefined)).toHaveLength(1);
    expect(show.episodes).toHaveLength(2);
  });
});

describe('mergeShow thumbnails', () => {
  const podcast = createPodcastFeed([createPodcastItem({})], 'https://example.com/channel.jpg');

  it.each([
    [
      'without a maxres image',
      new Set<string>(),
      'https://i.ytimg.com/vi/vid/mqdefault.jpg 320w, https://i.ytimg.com/vi/vid/hqdefault.jpg 480w',
    ],
    [
      'with a maxres image',
      new Set(['vid']),
      'https://i.ytimg.com/vi/vid/mqdefault.jpg 320w, https://i.ytimg.com/vi/vid/hqdefault.jpg 480w, https://i.ytimg.com/vi/vid/maxresdefault.jpg 1280w',
    ],
  ])('builds a video thumbnail %s', (_label, maxresVideoIds, expectedSrcset) => {
    const youtube = { entries: [createYoutubeEntry({ videoId: 'vid', title: 'Video only' })] };

    const show = mergeShow(podcast, youtube, { ...NO_THUMBNAILS, maxresVideoIds });

    expect(show.episodes.find((episode) => episode.youtubeVideoId === 'vid')?.thumbnail).toEqual({
      src: 'https://i.ytimg.com/vi/vid/hqdefault.jpg',
      width: 480,
      height: 360,
      srcset: expectedSrcset,
    });
  });

  it.each([
    [
      'with an oardefault image',
      new Set(['short']),
      { src: 'https://i.ytimg.com/vi/short/oardefault.jpg', width: 1080, height: 1920 },
    ],
    [
      'without an oardefault image',
      new Set<string>(),
      { src: 'https://i.ytimg.com/vi/short/hqdefault.jpg', width: 480, height: 360 },
    ],
  ])('builds a Short thumbnail %s', (_label, oardefaultVideoIds, expectedThumbnail) => {
    const youtube = {
      entries: [
        createYoutubeEntry({
          videoId: 'short',
          url: 'https://www.youtube.com/shorts/short',
          isShort: true,
        }),
      ],
    };

    const show = mergeShow(podcast, youtube, { ...NO_THUMBNAILS, oardefaultVideoIds });

    expect(show.clips[0]?.thumbnail).toEqual(expectedThumbnail);
  });

  it('uses the channel image for a podcast-only episode without its own image', () => {
    const show = mergeShow(podcast, { entries: [] }, NO_THUMBNAILS);

    expect(show.episodes[0]?.thumbnail.src).toBe('https://example.com/channel.jpg');
  });

  it('throws when a podcast-only episode has no image at all', () => {
    const feedWithoutImages = createPodcastFeed([createPodcastItem({ title: 'No art' })]);

    expect(() => mergeShow(feedWithoutImages, { entries: [] }, NO_THUMBNAILS)).toThrow(
      'Podcast feed item "No art" has no image and the channel has none',
    );
  });
});
