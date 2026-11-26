import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import { YOUTUBE_CHANNEL_URL } from '../show/show-links.ts';
import type { Episode, Show } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { formatShortDate } from './format-date.ts';
import { renderEpisodes } from './render-episodes.ts';

function makeEpisode(index: number, overrides: Partial<Episode> = {}): Episode {
  return {
    id: `episode-${index}`,
    title: `Episode ${index}`,
    publishedAt: `2026-10-${String(30 - index).padStart(2, '0')}T12:00:00.000Z`,
    description: `Description ${index}`,
    youtubeUrl: `https://www.youtube.com/watch?v=video${index}`,
    youtubeVideoId: `video${index}`,
    spotifyUrl: `https://open.spotify.com/episode/${index}`,
    thumbnail: {
      src: `https://i.ytimg.com/vi/video${index}/hqdefault.jpg`,
      width: 480,
      height: 360,
      srcset: `https://i.ytimg.com/vi/video${index}/mqdefault.jpg 320w, https://i.ytimg.com/vi/video${index}/hqdefault.jpg 480w`,
    },
    ...overrides,
  };
}

function makeShow(episodes: Episode[]): Show {
  return { description: '', episodes, clips: [] };
}

function readCards(markup: string): string[] {
  return markup.match(/<li class="episode-card[ "][\s\S]*?<\/li>/g) ?? [];
}

function readHeadingAccessibleText(markup: string): string {
  const headingMarkup = markup.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
  const [textBeforeHiddenVisual = ''] = headingMarkup.split('aria-hidden="true"');
  return textBeforeHiddenVisual
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('renderEpisodes with the fixture show', () => {
  const show = buildFixtureShow();
  const markup = renderEpisodes(show);
  const cards = readCards(markup);

  it('has one hidden colour band for every card after the first', () => {
    expect(markup).toContain('<div class="episodes-sweeps" aria-hidden="true">');
    const bands = markup.match(/<div class="episodes-sweep" style="--sweep-index:(\d+)">/g) ?? [];
    expect(bands).toHaveLength(show.episodes.length);
    expect(bands[0]).toContain('--sweep-index:1');
  });

  it('draws every colour band with the shared coffee-stain edge and its roast rim, without a second live edge', () => {
    const bands = markup.match(/<div class="episodes-sweep" style="--sweep-index:\d+">[\s\S]*?<\/svg><\/div>/g) ?? [];

    expect(bands).toHaveLength(show.episodes.length);
    for (const band of bands) {
      expect(band.match(/<path class="stain-edge-rim"/g)).toHaveLength(2);
      expect(band.match(/<path class="stain-edge-fill"/g)).toHaveLength(2);
      expect(band).not.toContain('data-stain-set');
    }
    expect(markup.match(/data-stain-set="wide"/g)).toHaveLength(1);
  });

  it('puts the previous and next buttons on the same row as the line under the headline', () => {
    const row = markup.match(/<div class="episodes-lead-row">[\s\S]*?<\/div>\s*<\/div>\s*<div class="episodes-viewport"[^>]*>/)?.[0] ?? '';

    expect(row).toContain('Watch on YouTube, listen on Spotify.');
    expect(row).toContain('data-episodes="nav"');
    expect(row.indexOf('episodes-lead"')).toBeLessThan(row.indexOf('data-episodes="nav"'));
  });

  it('has previous and next buttons that stay hidden until a script shows them', () => {
    expect(markup).toContain('<div class="episodes-nav" data-episodes="nav" hidden>');
    expect(markup).toMatch(/<button[^>]*aria-label="Previous episodes" disabled>/);
    expect(markup).toMatch(/<button[^>]*aria-label="Next episodes">/);
  });

  it('is a dark section with the id the menu links to', () => {
    expect(markup).toContain('<section class="section episodes" id="episodes"');
    expect(markup).toContain('data-surface="dark"');
    expect(markup).toContain('data-module-episodes');
  });

  it('asks Locomotive Scroll for the section progress, measured over the pinned range', () => {
    expect(markup).toContain('data-scroll-offset="100%,100%"');
    expect(markup).toContain('data-scroll-css-progress');
    expect(markup).toContain('data-scroll-event-progress="episodes-progress"');
    expect(markup).toContain('data-scroll-ignore-fold');
  });

  it('has one h2 with the accessible name Every Monday, a new one', () => {
    expect(markup.match(/<h2[\s>]/g)).toHaveLength(1);
    expect(readHeadingAccessibleText(markup)).toBe('Every Monday, a new one');
    expect(markup).toContain('Watch on YouTube, listen on Spotify.');
  });

  it('sets every headline line in cream, with the script words in their own line', () => {
    expect(markup).not.toContain('episodes-line--tint');
    expect(markup).toContain('episodes-script');
  });

  it('lists a card for every episode, newest first, plus the card for every episode', () => {
    expect(cards).toHaveLength(show.episodes.length + 1);
    show.episodes.forEach((episode, index) => {
      expect(cards[index]).toContain(`<h3 class="episode-card-title">${escapeHtml(episode.title)}</h3>`);
    });
  });

  it('puts the cards in an unordered list in reading order', () => {
    expect(markup).toMatch(/<ul class="episodes-track" role="list">[\s\S]*<\/ul>/);
    expect(markup).toContain(`style="--card-count:${show.episodes.length + 1}"`);
  });

  it('shows each thumbnail whole, with its size and srcset, loaded at once', () => {
    const [latestEpisode] = show.episodes;
    const [latestCard = ''] = cards;

    expect(latestCard).toContain(`width="${latestEpisode?.thumbnail.width}" height="${latestEpisode?.thumbnail.height}"`);
    expect(latestCard).toContain(`srcset="${escapeHtml(latestEpisode?.thumbnail.srcset ?? '')}"`);
    expect(latestCard).not.toContain('sddefault');
    expect(latestCard).toContain('loading="eager"');
    expect(latestCard).not.toContain('loading="lazy"');
    expect(latestCard).toContain('alt=""');
  });

  it('gives each card its short date', () => {
    const [latestEpisode] = show.episodes;

    expect(cards[0]).toContain(`>${formatShortDate(latestEpisode?.publishedAt ?? '')}</time>`);
  });

  it('gives Play, Watch and Listen to an episode that is on both platforms', () => {
    const card = readCards(renderEpisodes(makeShow([makeEpisode(1)])))[0] ?? '';

    expect(card).toContain('href="https://www.youtube.com/watch?v=video1" data-player="video1" data-player-title="Episode 1"><svg');
    expect(card).toContain('Play Episode 1</span>');
    expect(card).toContain('Watch<span class="visually-hidden"> Episode 1 on YouTube');
    expect(card).toContain('Listen<span class="visually-hidden"> to Episode 1 on Spotify');
    expect(card).toContain('href="https://open.spotify.com/episode/1"');
  });

  it('puts the player attributes on the thumbnail link, the play button and the Watch pill', () => {
    const card = readCards(renderEpisodes(makeShow([makeEpisode(1)])))[0] ?? '';

    expect(card.match(/data-player="video1"/g)).toHaveLength(3);
    expect(card).toContain('<a class="pill episode-card-watch" href="https://www.youtube.com/watch?v=video1" data-player="video1" data-player-title="Episode 1">');
  });
});

describe('renderEpisodes limits and edge cases', () => {
  it('shows the latest eight episodes and counts all of them on the last card', () => {
    const episodes = Array.from({ length: 12 }, (_, index) => makeEpisode(index + 1));
    const cards = readCards(renderEpisodes(makeShow(episodes)));

    expect(cards).toHaveLength(9);
    expect(cards[7]).toContain('Episode 8');
    expect(cards[8]).toContain('All 12 episodes</span>');
  });

  it('links the last card to the YouTube channel', () => {
    const cards = readCards(renderEpisodes(makeShow([makeEpisode(1), makeEpisode(2)])));

    expect(cards.at(-1)).toContain('<span class="visually-hidden">All 2 episodes</span>');
    expect(cards.at(-1)).toContain('<span class="episode-all-count">2</span>');
    expect(cards.at(-1)).toContain('<span class="episode-all-title" aria-hidden="true">All episodes</span>');
    expect(cards.at(-1)).toContain('Every conversation, from the first to the latest.');
    expect(cards.at(-1)).toContain(`href="${YOUTUBE_CHANNEL_URL}"`);
  });

  it('leaves out Play and Watch when the episode has no YouTube video', () => {
    const podcastOnly = makeEpisode(1);
    delete podcastOnly.youtubeUrl;
    delete podcastOnly.youtubeVideoId;
    const card = readCards(renderEpisodes(makeShow([podcastOnly])))[0] ?? '';

    expect(card).not.toContain('data-player');
    expect(card).not.toContain('round-button');
    expect(card).not.toContain('Watch<span');
    expect(card).toContain('Listen<span');
  });

  it('shows podcast artwork whole instead of cropping it to the video shape', () => {
    const podcastOnly = makeEpisode(1, {
      thumbnail: { src: 'https://example.com/art.jpg', width: 1400, height: 1400 },
    });
    delete podcastOnly.youtubeUrl;
    delete podcastOnly.youtubeVideoId;
    const card = readCards(renderEpisodes(makeShow([podcastOnly])))[0] ?? '';

    expect(card).toContain('class="episode-card-art"');
    expect(card).toContain('width="1400" height="1400"');
    expect(card).not.toContain('srcset=');
  });

  it('leaves out Listen when the episode has no Spotify link', () => {
    const youtubeOnly = makeEpisode(1);
    delete youtubeOnly.spotifyUrl;
    const card = readCards(renderEpisodes(makeShow([youtubeOnly])))[0] ?? '';

    expect(card).not.toContain('Listen<span');
    expect(card).toContain('Watch<span');
  });

  it('escapes feed text in the title, description, links and thumbnail', () => {
    const markup = renderEpisodes(
      makeShow([
        makeEpisode(1, {
          title: '<script>alert("x")</script> & more',
          description: '<img src=x onerror=alert(1)> "quoted"',
          youtubeUrl: 'https://example.com/watch?a=1&b="2"',
          youtubeVideoId: 'a"b',
          spotifyUrl: 'https://example.com/listen?x=<y>',
          thumbnail: { src: 'https://example.com/a.jpg?q="1"', width: 480, height: 360 },
        }),
      ]),
    );

    expect(markup).not.toContain('<script>');
    expect(markup).not.toContain('<img src=x');
    expect(markup).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt; &quot;quoted&quot;');
    expect(markup).toContain('href="https://example.com/watch?a=1&amp;b=&quot;2&quot;"');
    expect(markup).toContain('data-player="a&quot;b"');
    expect(markup).toContain('href="https://example.com/listen?x=&lt;y&gt;"');
    expect(markup).toContain('src="https://example.com/a.jpg?q=&quot;1&quot;"');
  });

  it('cuts a long description at a word and marks the cut with an ellipsis', () => {
    const longDescription = 'word '.repeat(200).trim();
    const card = readCards(renderEpisodes(makeShow([makeEpisode(1, { description: longDescription })])))[0] ?? '';
    const shown = card.match(/<p class="episode-card-description">([^<]*)<\/p>/)?.[1] ?? '';

    expect(shown.length).toBeLessThanOrEqual(601);
    expect(shown.endsWith('word…')).toBe(true);
  });

  it('leaves a short description whole, without an ellipsis', () => {
    const card = readCards(renderEpisodes(makeShow([makeEpisode(1, { description: 'A short note.' })])))[0] ?? '';

    expect(card).toContain('<div class="episode-card-summary"><p class="episode-card-description">A short note.</p></div>');
  });

  it('leaves out the description paragraph when the episode has none', () => {
    const card = readCards(renderEpisodes(makeShow([makeEpisode(1, { description: '' })])))[0] ?? '';

    expect(card).not.toContain('episode-card-summary');
    expect(card).not.toContain('episode-card-description');
  });

  it('numbers the dash row as the line after the four lines of the headline, so it arrives last', () => {
    const markup = renderEpisodes(makeShow([makeEpisode(1)]));

    expect(markup).toContain('class="episodes-dashes" style="--line:4"');
    expect(markup.match(/class="episodes-line[^"]*" style="--line:[0-9]"/g)).toHaveLength(4);
  });

  it('renders no section for an empty episode list', () => {
    expect(renderEpisodes(makeShow([]))).toBe('');
  });
});
