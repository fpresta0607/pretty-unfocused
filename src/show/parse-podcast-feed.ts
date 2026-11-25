import { toIsoTimestamp } from './iso-timestamp.ts';
import { decodeEntities, toPlainText } from './plain-text.ts';
import {
  parseXml,
  readAttribute,
  readNode,
  readNodes,
  readRequiredText,
  readText,
  type XmlNode,
} from './xml-values.ts';

export interface PodcastItem {
  guid: string;
  title: string;
  publishedAt: string;
  description: string;
  spotifyUrl: string;
  number?: number;
  durationSeconds?: number;
  imageUrl?: string;
}

export interface PodcastFeed {
  description: string;
  imageUrl?: string;
  items: PodcastItem[];
}

const FEED_LABEL = 'Podcast feed';

export function parseDurationSeconds(duration: string): number {
  const parts = duration.trim().split(':');
  if (parts.length > 3 || !parts.every((part) => /^\d+$/.test(part))) {
    throw new Error(`${FEED_LABEL} has an invalid duration: ${duration}`);
  }
  return parts.reduce((totalSeconds, part) => totalSeconds * 60 + Number(part), 0);
}

function parseEpisodeNumber(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value.trim())) {
    return undefined;
  }
  const number = Number(value);
  return number > 0 ? number : undefined;
}

function parseItem(item: XmlNode): PodcastItem {
  const title = decodeEntities(readRequiredText(item, 'title', `${FEED_LABEL} item`)).trim();
  const label = `${FEED_LABEL} item "${title}"`;
  const durationText = readText(item, 'itunes:duration');
  const number = parseEpisodeNumber(readText(item, 'itunes:episode'));
  const imageUrl = readAttribute(readNode(item, 'itunes:image') ?? {}, 'href');

  return {
    guid: readRequiredText(item, 'guid', label).trim(),
    title,
    publishedAt: toIsoTimestamp(readRequiredText(item, 'pubDate', label), label),
    description: toPlainText(readText(item, 'description') ?? ''),
    spotifyUrl: readRequiredText(item, 'link', label).trim(),
    ...(number === undefined ? {} : { number }),
    ...(durationText === undefined ? {} : { durationSeconds: parseDurationSeconds(durationText) }),
    ...(imageUrl === undefined ? {} : { imageUrl }),
  };
}

export function parsePodcastFeed(xml: string): PodcastFeed {
  const document = parseXml(xml, ['item']);
  const channel = readNode(readNode(document, 'rss') ?? {}, 'channel');
  if (channel === undefined) {
    throw new Error(`${FEED_LABEL} has no channel`);
  }
  const items = readNodes(channel, 'item');
  if (items.length === 0) {
    throw new Error(`${FEED_LABEL} has no items`);
  }
  const imageUrl = readAttribute(readNode(channel, 'itunes:image') ?? {}, 'href');

  return {
    description: toPlainText(readText(channel, 'description') ?? ''),
    items: items.map(parseItem),
    ...(imageUrl === undefined ? {} : { imageUrl }),
  };
}
