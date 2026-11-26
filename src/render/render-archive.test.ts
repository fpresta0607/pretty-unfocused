import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import type { Episode, Show } from '../show/show-types.ts';
import { formatShortDate } from './format-date.ts';
import { renderArchive } from './render-archive.ts';
import { SECTION_RENDERERS } from './render-page.ts';

function makeEpisode(index: number, overrides: Partial<Episode> = {}): Episode {
  return {
    id: `episode-${index}`,
    title: `Episode ${index}`,
    publishedAt: `2026-10-${String(30 - index).padStart(2, '0')}T12:00:00.000Z`,
    description: `Description ${index}`,
    number: 40 - index,
    durationSeconds: 4529,
    youtubeUrl: `https://www.youtube.com/watch?v=video${index}`,
    youtubeVideoId: `video${index}`,
    spotifyUrl: `https://open.spotify.com/episode/${index}`,
    thumbnail: { src: `https://i.ytimg.com/vi/video${index}/hqdefault.jpg`, width: 480, height: 360 },
    ...overrides,
  };
}

function makeShow(episodes: Episode[]): Show {
  return { description: '', episodes, clips: [] };
}

function readRows(markup: string): string[] {
  return markup.match(/<li class="archive-row"[\s\S]*?<\/li>/g) ?? [];
}

function readHeadingAccessibleText(markup: string): string {
  const headingMarkup = markup.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
  const [textBeforeHiddenVisual = ''] = headingMarkup.split('aria-hidden="true"');
  return textBeforeHiddenVisual
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function omit(episode: Episode, field: 'durationSeconds' | 'number' | 'spotifyUrl' | 'youtubeUrl' | 'youtubeVideoId'): Episode {
  const copy = { ...episode };
  delete copy[field];
  return copy;
}

describe('the every-episode section in the page', () => {
  it('follows Clips and comes before the footer, named Every episode', () => {
    expect(SECTION_RENDERERS.map(({ id }) => id).slice(3)).toEqual(['clips', 'every-episode', 'say-hi']);
    expect(SECTION_RENDERERS[4]).toMatchObject({ id: 'every-episode', label: 'Every episode' });
  });
});

describe('renderArchive with the fixture show', () => {
  const show = buildFixtureShow();
  const markup = renderArchive(show);
  const rows = readRows(markup);

  it('is a cream section the frame reads as light, handed over by the coffee stain', () => {
    expect(markup).toMatch(/<section class="section section--cream archive" id="every-episode" data-section data-surface="light"/);
    expect(markup).toContain('data-module-archive');
    expect(markup).toContain('data-module-stain');
    expect(markup.match(/data-stain-set="wide"/g)).toHaveLength(1);
  });

  it('has one h2 named Every episode, so far, with the visible words hidden from assistive tech', () => {
    expect(markup.match(/<h2[\s>]/g)).toHaveLength(1);
    expect(readHeadingAccessibleText(markup)).toBe('Every episode, so far');
    expect(markup).toContain('data-heading="line">Every</span>');
    expect(markup).toContain('data-heading="line">episode,</span>');
    expect(markup).toContain('data-heading="script">so far</span>');
    expect(markup).toContain('aria-labelledby="archive-heading"');
  });

  it('lists every episode in an ordered list, newest first', () => {
    expect(markup).toContain('<ol class="archive-list" role="list"');
    expect(rows).toHaveLength(show.episodes.length);
    show.episodes.forEach((episode, index) => {
      expect(rows[index]).toContain(`<span class="archive-title">${episode.title.replace(/&/g, '&amp;').replace(/'/g, '&#39;')}</span>`);
    });
  });

  it('points each row button at a panel that exists, and starts it expanded so nothing is hidden without a script', () => {
    rows.forEach((row) => {
      const controls = row.match(/<button[^>]*aria-controls="([^"]+)"/)?.[1] ?? '';
      expect(controls).not.toBe('');
      expect(row).toContain(`<div class="archive-panel" id="${controls}"`);
      expect(row).toMatch(/<button[^>]*type="button"[^>]*aria-expanded="true"/);
    });
    const ids = markup.match(/id="archive-(?:trigger|panel)-\d+"/g) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('renderArchive rows', () => {
  it('shows the episode number only when the episode has one', () => {
    const rows = readRows(renderArchive(makeShow([makeEpisode(1, { number: 24 }), omit(makeEpisode(2), 'number')])));

    expect(rows[0]).toContain('<span class="archive-number" data-archive="number"><span class="visually-hidden">Episode </span>24</span>');
    expect(rows[1]).not.toContain('archive-number');
  });

  it('shows the date and, when known, the length', () => {
    const episode = makeEpisode(1);
    const rows = readRows(renderArchive(makeShow([episode, omit(makeEpisode(2), 'durationSeconds')])));

    expect(rows[0]).toContain(`<time datetime="${episode.publishedAt}">${formatShortDate(episode.publishedAt)}</time>`);
    expect(rows[0]).toContain('<span class="archive-length" data-archive="length"> · 1 h 15</span>');
    expect(rows[1]).toContain('<time datetime=');
    expect(rows[1]).not.toContain('archive-length');
  });

  it('offers Watch on YouTube with the player attributes only for an episode with a YouTube video', () => {
    const rows = readRows(renderArchive(makeShow([makeEpisode(1), omit(omit(makeEpisode(2), 'youtubeUrl'), 'youtubeVideoId')])));

    expect(rows[0]).toMatch(/<a class="pill archive-pill archive-pill--solid" href="https:\/\/www\.youtube\.com\/watch\?v=video1" data-player="video1" data-player-title="Episode 1">/);
    expect(rows[0]).not.toContain('data-player-shape');
    expect(rows[0]).toContain('Watch on YouTube');
    expect(rows[1]).not.toContain('Watch on YouTube');
    expect(rows[1]).not.toContain('data-player');
  });

  it('offers Listen on Spotify only for an episode with a Spotify page', () => {
    const rows = readRows(renderArchive(makeShow([makeEpisode(1), omit(makeEpisode(2), 'spotifyUrl')])));

    expect(rows[0]).toContain('href="https://open.spotify.com/episode/1"');
    expect(rows[0]).toContain('Listen on Spotify');
    expect(rows[1]).not.toContain('Listen on Spotify');
    expect(rows[1]).not.toContain('open.spotify.com');
  });

  it('escapes the title and the description', () => {
    const row = readRows(renderArchive(makeShow([makeEpisode(1, { title: 'Tom & <b>Jerry</b>', description: '<script>alert("x")</script> & more' })])))[0] ?? '';

    expect(row).not.toContain('<b>');
    expect(row).not.toContain('<script>');
    expect(row).toContain('Tom &amp; &lt;b&gt;Jerry&lt;/b&gt;');
    expect(row).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more');
  });

  it('keeps a short description whole and cuts a long one at a word', () => {
    const longDescription = `${'word '.repeat(100)}end`;
    const rows = readRows(renderArchive(makeShow([makeEpisode(1), makeEpisode(2, { description: longDescription })])));
    const shortText = rows[0]?.match(/<p class="archive-description">(.*?)<\/p>/)?.[1];
    const longText = rows[1]?.match(/<p class="archive-description">(.*?)<\/p>/)?.[1] ?? '';

    expect(shortText).toBe('Description 1');
    expect(longText.length).toBeLessThanOrEqual(301);
    expect(longText.endsWith('word…')).toBe(true);
  });

  it('leaves out the description paragraph when the episode has none', () => {
    const row = readRows(renderArchive(makeShow([makeEpisode(1, { description: '' })])))[0] ?? '';

    expect(row).not.toContain('archive-description');
    expect(row).toContain('archive-actions');
  });

  it('renders no section at all when there are no episodes', () => {
    expect(renderArchive(makeShow([]))).toBe('');
  });
});
