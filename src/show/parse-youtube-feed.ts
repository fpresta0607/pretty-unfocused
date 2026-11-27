import { toIsoTimestamp } from './iso-timestamp.ts';
import { decodeEntities, toPlainLines } from './plain-text.ts';
import {
  parseXml,
  readAttribute,
  readNode,
  readNodes,
  readRequiredText,
  readText,
  type XmlNode,
} from './xml-values.ts';

export interface YoutubeEntry {
  videoId: string;
  title: string;
  publishedAt: string;
  description: string;
  url: string;
  isShort: boolean;
}

export interface YoutubeFeed {
  entries: YoutubeEntry[];
}

const FEED_LABEL = 'YouTube feed';

function readAlternateUrl(entry: XmlNode, label: string): string {
  const alternateLink = readNodes(entry, 'link').find(
    (link) => readAttribute(link, 'rel') === 'alternate',
  );
  const href = alternateLink === undefined ? undefined : readAttribute(alternateLink, 'href');
  if (href === undefined) {
    throw new Error(`${label} has no alternate link`);
  }
  return decodeEntities(href);
}

function parseEntry(entry: XmlNode): YoutubeEntry {
  const videoId = readRequiredText(entry, 'yt:videoId', `${FEED_LABEL} entry`).trim();
  const label = `${FEED_LABEL} entry ${videoId}`;
  const url = readAlternateUrl(entry, label);
  const mediaGroup = readNode(entry, 'media:group') ?? {};

  return {
    videoId,
    title: decodeEntities(readRequiredText(entry, 'title', label)).trim(),
    publishedAt: toIsoTimestamp(readRequiredText(entry, 'published', label), label),
    description: toPlainLines(readText(mediaGroup, 'media:description') ?? ''),
    url,
    isShort: new URL(url).pathname.startsWith('/shorts/'),
  };
}

export function parseYoutubeFeed(xml: string): YoutubeFeed {
  const document = parseXml(xml, ['entry', 'link']);
  const entries = readNodes(readNode(document, 'feed') ?? {}, 'entry');
  if (entries.length === 0) {
    throw new Error(`${FEED_LABEL} has no entries`);
  }
  return { entries: entries.map(parseEntry) };
}
