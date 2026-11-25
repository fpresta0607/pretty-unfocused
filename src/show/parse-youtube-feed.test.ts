import { describe, expect, it } from 'vitest';

import { parseYoutubeFeed } from './parse-youtube-feed.ts';
import { readFixture } from './read-fixture.ts';

function buildFeed(entryFields: string): string {
  return `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="alternate" href="https://www.youtube.com/channel/abc"/>
 <entry>
  <yt:videoId>abc123</yt:videoId>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
  <published>2026-11-09T12:00:05+00:00</published>
  ${entryFields}
 </entry>
</feed>`;
}

describe('parseYoutubeFeed with the real feed fixture', () => {
  const feed = parseYoutubeFeed(readFixture('youtube-feed.xml'));

  it('splits Shorts from full videos by the url path', () => {
    const shortIds = feed.entries.filter((entry) => entry.isShort).map((entry) => entry.videoId);
    const fullVideoIds = feed.entries.filter((entry) => !entry.isShort).map((entry) => entry.videoId);

    expect(shortIds).toEqual(['yxxXqs1vHI8', '8nJMXmxCnKM']);
    expect(fullVideoIds).toEqual(['fN3NtGR3Nnk', 'M-Q4eX8Szic', 'V_d6gE3FMCY']);
  });

  it('reads the fields of a full video', () => {
    const video = feed.entries.find((entry) => entry.videoId === 'M-Q4eX8Szic');

    expect(video).toMatchObject({
      title: 'Reminiscing Highschool, Juul Addictions, and More! | Pretty Unfocused',
      publishedAt: '2026-11-09T12:00:05.000Z',
      url: 'https://www.youtube.com/watch?v=M-Q4eX8Szic',
      isShort: false,
    });
    expect(video?.description.startsWith('Happy almost Thanksgiving Break')).toBe(true);
  });

  it('reads an empty description as an empty string', () => {
    expect(feed.entries.find((entry) => entry.videoId === '8nJMXmxCnKM')?.description).toBe('');
  });
});

describe('parseYoutubeFeed with inline feeds', () => {
  it('decodes entities in titles and descriptions', () => {
    const feed = parseYoutubeFeed(
      buildFeed(`<title>Tom &amp; Jerry&#39;s &quot;Show&quot;</title>
        <media:group><media:description>Fun &amp; games

 on two lines</media:description></media:group>`),
    );

    expect(feed.entries[0]?.title).toBe('Tom & Jerry\'s "Show"');
    expect(feed.entries[0]?.description).toBe('Fun & games on two lines');
  });

  it('throws an error naming the feed when it has no entries', () => {
    const xml = '<feed xmlns="http://www.w3.org/2005/Atom"><title>Empty</title></feed>';

    expect(() => parseYoutubeFeed(xml)).toThrow('YouTube feed has no entries');
  });

  it('throws when an entry has no alternate link', () => {
    const xml = buildFeed('<title>No link</title>').replace(/<link rel="alternate" href="[^"]*watch[^"]*"\/>/, '');

    expect(() => parseYoutubeFeed(xml)).toThrow('YouTube feed entry abc123 has no alternate link');
  });
});
