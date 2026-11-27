import { describe, expect, it } from 'vitest';

import { mergePreviousShow } from './merge-previous-show.ts';
import type { Clip, Episode, Show } from './show-types.ts';

function makeEpisode(id: string, publishedAt: string, overrides: Partial<Episode> = {}): Episode {
  return {
    id,
    title: `Episode ${id}`,
    publishedAt,
    description: `About ${id}`,
    thumbnail: { src: `https://example.test/${id}.jpg`, width: 480, height: 360 },
    ...overrides,
  };
}

function makeVideoEpisode(id: string, publishedAt: string, overrides: Partial<Episode> = {}): Episode {
  return makeEpisode(id, publishedAt, {
    youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
    youtubeVideoId: id,
    ...overrides,
  });
}

function makeClip(id: string, publishedAt: string, title = `Clip ${id}`): Clip {
  return {
    id,
    title,
    publishedAt,
    youtubeUrl: `https://www.youtube.com/shorts/${id}`,
    youtubeVideoId: id,
    thumbnail: { src: `https://example.test/${id}.jpg`, width: 1080, height: 1920 },
  };
}

function makeShow(episodes: Episode[], clips: Clip[] = [], description = 'The show'): Show {
  return { description, episodes, clips };
}

describe('mergePreviousShow', () => {
  it('keeps an episode that has dropped out of the new feeds', () => {
    const current = makeShow([makeVideoEpisode('new', '2026-11-23T12:00:00Z')]);
    const previous = makeShow([makeVideoEpisode('old', '2026-01-05T12:00:00Z')]);

    const merged = mergePreviousShow(current, previous);

    expect(merged.episodes.map((episode) => episode.id)).toEqual(['new', 'old']);
  });

  it('keeps a clip that has dropped out of the new feeds', () => {
    const current = makeShow([], [makeClip('new', '2026-11-20T12:00:00Z')]);
    const previous = makeShow([], [makeClip('old', '2026-02-02T12:00:00Z')]);

    const merged = mergePreviousShow(current, previous);

    expect(merged.clips.map((clip) => clip.id)).toEqual(['new', 'old']);
  });

  it('lets the newer copy of the same episode win, and lists it once', () => {
    const current = makeShow([makeVideoEpisode('same', '2026-11-23T12:00:00Z', { description: 'Fresh words' })]);
    const previous = makeShow([makeVideoEpisode('same', '2026-11-23T12:00:00Z', { description: 'Stale words' })]);

    const merged = mergePreviousShow(current, previous);

    expect(merged.episodes).toHaveLength(1);
    expect(merged.episodes[0]?.description).toBe('Fresh words');
  });

  it('lets the newer copy of the same clip win, and lists it once', () => {
    const current = makeShow([], [makeClip('same', '2026-11-20T12:00:00Z', 'Fresh title')]);
    const previous = makeShow([], [makeClip('same', '2026-11-20T12:00:00Z', 'Stale title')]);

    const merged = mergePreviousShow(current, previous);

    expect(merged.clips).toHaveLength(1);
    expect(merged.clips[0]?.title).toBe('Fresh title');
  });

  it('keeps the YouTube video of an episode that has dropped out of the YouTube feed but is still in the podcast feed', () => {
    const podcastOnlyNow = makeEpisode('guid-7', '2026-03-02T09:00:00Z', {
      title: 'Seven Things | Pretty Unfocused',
      spotifyUrl: 'https://open.spotify.com/episode/7',
      thumbnail: { src: 'https://example.test/art.jpg', width: 1400, height: 1400 },
    });
    const withVideoBefore = makeVideoEpisode('video7', '2026-03-02T09:05:00Z', {
      title: 'Seven Things',
      thumbnail: { src: 'https://i.ytimg.com/vi/video7/hqdefault.jpg', width: 480, height: 360 },
    });

    const merged = mergePreviousShow(makeShow([podcastOnlyNow]), makeShow([withVideoBefore]));

    expect(merged.episodes).toHaveLength(1);
    expect(merged.episodes[0]).toMatchObject({
      id: 'video7',
      spotifyUrl: 'https://open.spotify.com/episode/7',
      youtubeUrl: 'https://www.youtube.com/watch?v=video7',
      youtubeVideoId: 'video7',
      thumbnail: { src: 'https://i.ytimg.com/vi/video7/hqdefault.jpg' },
    });
  });

  it('does not list an episode twice when its video arrived after its podcast release', () => {
    const withVideoNow = makeVideoEpisode('video8', '2026-03-09T09:05:00Z', { title: 'Eight Things' });
    const podcastOnlyBefore = makeEpisode('guid-8', '2026-03-09T09:00:00Z', { title: 'Eight Things' });

    const merged = mergePreviousShow(makeShow([withVideoNow]), makeShow([podcastOnlyBefore]));

    expect(merged.episodes.map((episode) => episode.id)).toEqual(['video8']);
  });

  it('keeps two different episodes that share a title when neither is a copy of the other', () => {
    const current = makeShow([makeVideoEpisode('video-b', '2026-05-01T12:00:00Z', { title: 'Q and A' })]);
    const previous = makeShow([makeVideoEpisode('video-a', '2026-02-01T12:00:00Z', { title: 'Q and A' })]);

    const merged = mergePreviousShow(current, previous);

    expect(merged.episodes.map((episode) => episode.id)).toEqual(['video-b', 'video-a']);
  });

  it('orders everything newest first, and takes the description from the new feeds', () => {
    const current = makeShow(
      [makeVideoEpisode('b', '2026-06-01T12:00:00Z'), makeVideoEpisode('d', '2026-08-01T12:00:00Z')],
      [makeClip('y', '2026-06-02T12:00:00Z')],
      'Fresh description',
    );
    const previous = makeShow(
      [makeVideoEpisode('a', '2026-05-01T12:00:00Z'), makeVideoEpisode('c', '2026-07-01T12:00:00Z')],
      [makeClip('x', '2026-07-02T12:00:00Z')],
      'Stale description',
    );

    const merged = mergePreviousShow(current, previous);

    expect(merged.episodes.map((episode) => episode.id)).toEqual(['d', 'c', 'b', 'a']);
    expect(merged.clips.map((clip) => clip.id)).toEqual(['x', 'y']);
    expect(merged.description).toBe('Fresh description');
  });

  it('returns the new show unchanged when there was no previous show', () => {
    const current = makeShow([makeVideoEpisode('only', '2026-11-23T12:00:00Z')], [makeClip('clip', '2026-11-20T12:00:00Z')]);

    expect(mergePreviousShow(current, makeShow([], [], ''))).toEqual(current);
  });
});
