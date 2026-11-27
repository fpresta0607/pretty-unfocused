import { mergeShow } from './merge-show.ts';
import { parsePodcastFeed } from './parse-podcast-feed.ts';
import { parseYoutubeFeed } from './parse-youtube-feed.ts';
import { PODCAST_FEED_URL, SPOTIFY_SHOW_URL, YOUTUBE_FEED_URL } from './show-links.ts';
import type { Show } from './show-types.ts';

const USER_AGENT = 'pretty-unfocused-site-build (podcast website generator)';
const MAX_CONCURRENT_IMAGE_CHECKS = 6;
const IMAGE_BASE_URL = 'https://i.ytimg.com/vi';
const SPOTIFY_ARTWORK_PATTERN = /<meta property="og:image" content="(https:\/\/i\.scdn\.co\/image\/[0-9a-f]+)"/;

async function fetchFeedText(
  fetchFunction: typeof fetch,
  url: string,
  feedLabel: string,
): Promise<string> {
  const response = await fetchFunction(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${feedLabel} request failed with HTTP ${response.status}`);
  }
  return response.text();
}

async function findVideoIdsWithImage(
  fetchFunction: typeof fetch,
  videoIds: readonly string[],
  imageName: string,
): Promise<Set<string>> {
  const videoIdsWithImage = new Set<string>();
  const pendingVideoIds = videoIds.values();

  async function checkNextVideoIds(): Promise<void> {
    for (const videoId of pendingVideoIds) {
      const response = await fetchFunction(`${IMAGE_BASE_URL}/${videoId}/${imageName}.jpg`, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      if (response.status === 200) {
        videoIdsWithImage.add(videoId);
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENT_IMAGE_CHECKS }, checkNextVideoIds));
  return videoIdsWithImage;
}

async function findSpotifyArtworkUrl(fetchFunction: typeof fetch): Promise<string | undefined> {
  let response: Response;
  try {
    response = await fetchFunction(SPOTIFY_SHOW_URL, { headers: { 'User-Agent': USER_AGENT } });
  } catch (error) {
    console.warn(`Spotify show page could not be reached, keeping the feed artwork: ${String(error)}`);
    return undefined;
  }
  if (!response.ok) {
    console.warn(`Spotify show page answered HTTP ${response.status}, keeping the feed artwork`);
    return undefined;
  }
  return SPOTIFY_ARTWORK_PATTERN.exec(await response.text())?.[1];
}

export async function fetchShow(fetchFunction: typeof fetch): Promise<Show> {
  const [podcastXml, youtubeXml] = await Promise.all([
    fetchFeedText(fetchFunction, PODCAST_FEED_URL, 'Podcast feed'),
    fetchFeedText(fetchFunction, YOUTUBE_FEED_URL, 'YouTube feed'),
  ]);
  const podcast = parsePodcastFeed(podcastXml);
  const youtube = parseYoutubeFeed(youtubeXml);

  const fullVideoIds = youtube.entries.filter((entry) => !entry.isShort).map((entry) => entry.videoId);
  const shortIds = youtube.entries.filter((entry) => entry.isShort).map((entry) => entry.videoId);
  const maxresVideoIds = await findVideoIdsWithImage(fetchFunction, fullVideoIds, 'maxresdefault');
  const oardefaultVideoIds = await findVideoIdsWithImage(fetchFunction, shortIds, 'oardefault');

  const showArtworkUrl = await findSpotifyArtworkUrl(fetchFunction);

  return mergeShow(podcast, youtube, { maxresVideoIds, oardefaultVideoIds, showArtworkUrl });
}
