import { mergeShow } from './merge-show.ts';
import { parsePodcastFeed } from './parse-podcast-feed.ts';
import { parseYoutubeFeed } from './parse-youtube-feed.ts';
import { readFixture } from './read-fixture.ts';
import type { Show } from './show-types.ts';

export function buildFixtureShow(): Show {
  return mergeShow(
    parsePodcastFeed(readFixture('podcast-feed.xml')),
    parseYoutubeFeed(readFixture('youtube-feed.xml')),
    { maxresVideoIds: new Set(), oardefaultVideoIds: new Set() },
  );
}
