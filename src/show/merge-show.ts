import { decodeEntities } from './plain-text.ts';
import type { PodcastFeed, PodcastItem } from './parse-podcast-feed.ts';
import type { YoutubeEntry, YoutubeFeed } from './parse-youtube-feed.ts';
import type { Clip, Episode, Show, Thumbnail } from './show-types.ts';

export interface ThumbnailAvailability {
  maxresVideoIds: ReadonlySet<string>;
  oardefaultVideoIds: ReadonlySet<string>;
  showArtworkUrl: string | undefined;
}

const YOUTUBE_THUMBNAIL_BASE_URL = 'https://i.ytimg.com/vi';
const SHOW_TITLE_SUFFIX_PATTERN = /\s*\|\s*Pretty Unfocused\s*$/i;
const PODCAST_ARTWORK_SIZE = 1400;
const SHOW_ARTWORK_SIZE = 640;

export function stripShowTitleSuffix(title: string): string {
  return title.replace(SHOW_TITLE_SUFFIX_PATTERN, '').trim();
}

export function normaliseTitle(title: string): string {
  return decodeEntities(stripShowTitleSuffix(title))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createVideoThumbnail(videoId: string, hasMaxresThumbnail: boolean): Thumbnail {
  const baseUrl = `${YOUTUBE_THUMBNAIL_BASE_URL}/${videoId}`;
  const srcsetEntries = [`${baseUrl}/mqdefault.jpg 320w`, `${baseUrl}/hqdefault.jpg 480w`];
  if (hasMaxresThumbnail) {
    srcsetEntries.push(`${baseUrl}/maxresdefault.jpg 1280w`);
  }
  return {
    src: `${baseUrl}/hqdefault.jpg`,
    width: 480,
    height: 360,
    srcset: srcsetEntries.join(', '),
  };
}

function createShortThumbnail(videoId: string, hasOardefaultThumbnail: boolean): Thumbnail {
  const baseUrl = `${YOUTUBE_THUMBNAIL_BASE_URL}/${videoId}`;
  if (hasOardefaultThumbnail) {
    return { src: `${baseUrl}/oardefault.jpg`, width: 1080, height: 1920 };
  }
  return { src: `${baseUrl}/hqdefault.jpg`, width: 480, height: 360 };
}

export function compareNewestFirst(left: { publishedAt: string }, right: { publishedAt: string }): number {
  return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
}

function buildPodcastEpisode(
  item: PodcastItem,
  video: YoutubeEntry | undefined,
  channelImageUrl: string | undefined,
  availability: ThumbnailAvailability,
): Episode {
  const sharedFields = {
    title: item.title,
    spotifyUrl: item.spotifyUrl,
    ...(item.number === undefined ? {} : { number: item.number }),
    ...(item.durationSeconds === undefined ? {} : { durationSeconds: item.durationSeconds }),
  };

  if (video !== undefined) {
    return {
      ...sharedFields,
      id: video.videoId,
      publishedAt: video.publishedAt,
      description: video.description === '' ? item.description : video.description,
      youtubeUrl: video.url,
      youtubeVideoId: video.videoId,
      thumbnail: createVideoThumbnail(video.videoId, availability.maxresVideoIds.has(video.videoId)),
    };
  }

  const artworkUrl = item.imageUrl ?? channelImageUrl;
  if (artworkUrl === undefined) {
    throw new Error(`Podcast feed item "${item.title}" has no image and the channel has none`);
  }
  const isShowArtwork = artworkUrl === channelImageUrl;
  const thumbnail: Thumbnail =
    isShowArtwork && availability.showArtworkUrl !== undefined
      ? { src: availability.showArtworkUrl, width: SHOW_ARTWORK_SIZE, height: SHOW_ARTWORK_SIZE }
      : { src: artworkUrl, width: PODCAST_ARTWORK_SIZE, height: PODCAST_ARTWORK_SIZE };
  return {
    ...sharedFields,
    id: item.guid,
    publishedAt: item.publishedAt,
    description: item.description,
    thumbnail,
  };
}

function buildYoutubeEpisode(video: YoutubeEntry, availability: ThumbnailAvailability): Episode {
  return {
    id: video.videoId,
    title: stripShowTitleSuffix(video.title),
    publishedAt: video.publishedAt,
    description: video.description,
    youtubeUrl: video.url,
    youtubeVideoId: video.videoId,
    thumbnail: createVideoThumbnail(video.videoId, availability.maxresVideoIds.has(video.videoId)),
  };
}

export function mergeShow(
  podcast: PodcastFeed,
  youtube: YoutubeFeed,
  availability: ThumbnailAvailability,
): Show {
  const fullVideos = youtube.entries.filter((entry) => !entry.isShort).sort(compareNewestFirst);
  const shorts = youtube.entries.filter((entry) => entry.isShort).sort(compareNewestFirst);

  const videosByTitle = new Map<string, YoutubeEntry>();
  for (const video of fullVideos) {
    const normalisedTitle = normaliseTitle(video.title);
    if (!videosByTitle.has(normalisedTitle)) {
      videosByTitle.set(normalisedTitle, video);
    }
  }

  const matchedVideoIds = new Set<string>();
  const podcastEpisodes = podcast.items.map((item) => {
    const candidate = videosByTitle.get(normaliseTitle(item.title));
    const video =
      candidate !== undefined && !matchedVideoIds.has(candidate.videoId) ? candidate : undefined;
    if (video !== undefined) {
      matchedVideoIds.add(video.videoId);
    }
    return buildPodcastEpisode(item, video, podcast.imageUrl, availability);
  });

  const youtubeEpisodes = fullVideos
    .filter((video) => !matchedVideoIds.has(video.videoId))
    .map((video) => buildYoutubeEpisode(video, availability));

  const clips: Clip[] = shorts.map((short) => ({
    id: short.videoId,
    title: short.title,
    publishedAt: short.publishedAt,
    youtubeUrl: short.url,
    youtubeVideoId: short.videoId,
    thumbnail: createShortThumbnail(short.videoId, availability.oardefaultVideoIds.has(short.videoId)),
  }));

  return {
    description: podcast.description,
    episodes: [...podcastEpisodes, ...youtubeEpisodes].sort(compareNewestFirst),
    clips,
  };
}
