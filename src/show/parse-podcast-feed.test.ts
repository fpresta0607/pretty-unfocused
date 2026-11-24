import { describe, expect, it } from 'vitest';

import { parseDurationSeconds, parsePodcastFeed } from './parse-podcast-feed.ts';
import { readFixture } from './read-fixture.ts';

function buildFeed(itemFields: string): string {
  return `<?xml version="1.0"?>
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">
  <channel>
    <description>Channel &amp; show</description>
    <item>
      <title>Item</title>
      <guid isPermaLink="false">guid-1</guid>
      <link>https://example.com/item</link>
      <pubDate>Mon, 19 Oct 2026 14:27:33 GMT</pubDate>
      ${itemFields}
    </item>
  </channel>
</rss>`;
}

describe('parsePodcastFeed with the real feed fixture', () => {
  const feed = parsePodcastFeed(readFixture('podcast-feed.xml'));

  it('reads every item', () => {
    expect(feed.items.map((item) => item.number)).toEqual([20, 19, 18, 1]);
  });

  it('reads the newest item fields', () => {
    const [newest] = feed.items;

    expect(newest).toEqual({
      guid: 'f55266ba-057f-4c6d-ad58-069c554a6f49',
      title: 'Hagrid and Dumbledore Have an Ultimate Girls Night',
      publishedAt: '2026-10-27T01:00:03.000Z',
      description: expect.stringMatching(/^What.s more comforting and girly than the ULTIMATE girls night/),
      spotifyUrl:
        'https://podcasters.spotify.com/pod/show/mayagia/episodes/Hagrid-and-Dumbledore-Have-an-Ultimate-Girls-Night-e3r04cc',
      number: 20,
      durationSeconds: 4529,
      imageUrl:
        'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/45860388/45860388-1794674786304-8af5265790ebe.jpg',
    });
  });

  it('strips markup from item descriptions', () => {
    const descriptions = feed.items.map((item) => item.description);

    expect(descriptions.every((description) => !/[<>]/.test(description))).toBe(true);
    expect(descriptions[1]).toContain('YEET, YEET, SKRTTT, YEET!!!');
  });

  it('trims titles that carry trailing spaces', () => {
    expect(feed.items[3]?.title).toBe("Figuring out our mid 20's");
  });

  it('reads the channel description and image', () => {
    expect(feed.description.startsWith('Hosted by Maya and Gia (two chronically curious besties).')).toBe(true);
    expect(feed.description).toContain('Cozy chaos only.');
    expect(feed.imageUrl).toBe(
      'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/45860388/45860388-1794674786304-8af5265790ebe.jpg',
    );
  });
});

describe('parsePodcastFeed with inline feeds', () => {
  it('decodes entities and strips tags in descriptions', () => {
    const feed = parsePodcastFeed(
      buildFeed('<description><![CDATA[<p>Don&#39;t miss R&amp;D</p>]]></description>'),
    );

    expect(feed.items[0]?.description).toBe("Don't miss R&D");
    expect(feed.description).toBe('Channel & show');
  });

  it.each([
    ['0', undefined],
    ['-3', undefined],
    ['2.5', undefined],
    ['abc', undefined],
    ['7', 7],
  ])('reads itunes:episode %j as %j', (episode, expected) => {
    const feed = parsePodcastFeed(buildFeed(`<itunes:episode>${episode}</itunes:episode>`));

    expect(feed.items[0]?.number).toBe(expected);
  });

  it('leaves optional fields out when the item has none', () => {
    const [item] = parsePodcastFeed(buildFeed('')).items;

    expect(item).not.toHaveProperty('number');
    expect(item).not.toHaveProperty('durationSeconds');
    expect(item).not.toHaveProperty('imageUrl');
  });

  it.each([
    ['channel', '<rss><nothing/></rss>', 'Podcast feed has no channel'],
    ['items', '<rss><channel><title>x</title></channel></rss>', 'Podcast feed has no items'],
    ['xml', '', 'Podcast feed has no channel'],
  ])('throws an error naming the feed when it has no %s', (_label, xml, message) => {
    expect(() => parsePodcastFeed(xml)).toThrow(message);
  });

  it('throws when an item has no publication date', () => {
    const xml = buildFeed('').replace(/<pubDate>.*<\/pubDate>/, '');

    expect(() => parsePodcastFeed(xml)).toThrow('Podcast feed item "Item" is missing <pubDate>');
  });

  it('throws when an item has an unreadable duration', () => {
    expect(() => parsePodcastFeed(buildFeed('<itunes:duration>soon</itunes:duration>'))).toThrow(
      'Podcast feed has an invalid duration: soon',
    );
  });
});

describe('parseDurationSeconds', () => {
  it.each([
    ['01:15:29', 4529],
    ['1:00:00', 3600],
    ['44:26', 2666],
    ['00:05', 5],
    ['3600', 3600],
    ['  90 ', 90],
  ])('turns %j into %i seconds', (duration, expected) => {
    expect(parseDurationSeconds(duration)).toBe(expected);
  });

  it.each(['', 'abc', '1:2:3:4', '1:xx', '-5'])('rejects %j', (duration) => {
    expect(() => parseDurationSeconds(duration)).toThrow('Podcast feed has an invalid duration');
  });
});
