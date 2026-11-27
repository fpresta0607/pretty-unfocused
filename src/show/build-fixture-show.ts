import { mergeShow } from './merge-show.ts';
import { parsePodcastFeed } from './parse-podcast-feed.ts';
import { parseYoutubeFeed } from './parse-youtube-feed.ts';
import { readFixture } from './read-fixture.ts';
import type { Show } from './show-types.ts';

const FIXTURE_SHOW_ARTWORK_URL = 'https://i.scdn.co/image/ab6765630000ba8a8a5ad1a6dbabbba0e074814c';

export function buildFixtureShow(): Show {
  return mergeShow(
    parsePodcastFeed(readFixture('podcast-feed.xml')),
    parseYoutubeFeed(readFixture('youtube-feed.xml')),
    { maxresVideoIds: new Set(), oardefaultVideoIds: new Set(), showArtworkUrl: FIXTURE_SHOW_ARTWORK_URL },
  );
}
