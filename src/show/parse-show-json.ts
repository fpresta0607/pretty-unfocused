import type { Clip, Episode, Show, Thumbnail } from './show-types.ts';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value;
}

function readList(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be a list`);
  }
  return value;
}

function readString(record: JsonRecord, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`${path}.${key} must be a string`);
  }
  return value;
}

function readNumber(record: JsonRecord, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path}.${key} must be a number`);
  }
  return value;
}

function readOptionalString(record: JsonRecord, key: string, path: string): string | undefined {
  return record[key] === undefined ? undefined : readString(record, key, path);
}

function readOptionalNumber(record: JsonRecord, key: string, path: string): number | undefined {
  return record[key] === undefined ? undefined : readNumber(record, key, path);
}

function readThumbnail(value: unknown, path: string): Thumbnail {
  const record = readRecord(value, path);
  const srcset = readOptionalString(record, 'srcset', path);
  return {
    src: readString(record, 'src', path),
    width: readNumber(record, 'width', path),
    height: readNumber(record, 'height', path),
    ...(srcset === undefined ? {} : { srcset }),
  };
}

function readEpisode(value: unknown, path: string): Episode {
  const record = readRecord(value, path);
  const number = readOptionalNumber(record, 'number', path);
  const durationSeconds = readOptionalNumber(record, 'durationSeconds', path);
  const youtubeUrl = readOptionalString(record, 'youtubeUrl', path);
  const youtubeVideoId = readOptionalString(record, 'youtubeVideoId', path);
  const spotifyUrl = readOptionalString(record, 'spotifyUrl', path);
  return {
    id: readString(record, 'id', path),
    title: readString(record, 'title', path),
    publishedAt: readString(record, 'publishedAt', path),
    description: readString(record, 'description', path),
    thumbnail: readThumbnail(record['thumbnail'], `${path}.thumbnail`),
    ...(number === undefined ? {} : { number }),
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
    ...(youtubeUrl === undefined ? {} : { youtubeUrl }),
    ...(youtubeVideoId === undefined ? {} : { youtubeVideoId }),
    ...(spotifyUrl === undefined ? {} : { spotifyUrl }),
  };
}

function readClip(value: unknown, path: string): Clip {
  const record = readRecord(value, path);
  return {
    id: readString(record, 'id', path),
    title: readString(record, 'title', path),
    publishedAt: readString(record, 'publishedAt', path),
    youtubeUrl: readString(record, 'youtubeUrl', path),
    youtubeVideoId: readString(record, 'youtubeVideoId', path),
    thumbnail: readThumbnail(record['thumbnail'], `${path}.thumbnail`),
  };
}

export function parseShowJson(text: string): Show {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('The previous show is not valid JSON');
  }
  const record = readRecord(json, 'show');
  return {
    description: readString(record, 'description', 'show'),
    episodes: readList(record['episodes'], 'show.episodes').map((episode, index) => readEpisode(episode, `show.episodes[${index}]`)),
    clips: readList(record['clips'], 'show.clips').map((clip, index) => readClip(clip, `show.clips[${index}]`)),
  };
}
