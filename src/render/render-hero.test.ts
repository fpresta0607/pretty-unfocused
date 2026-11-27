import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import type { Episode, Show } from '../show/show-types.ts';
import { formatShortDate } from './format-date.ts';
import { renderHero } from './render-hero.ts';
import { resolveImageSlotWidth } from './resolve-image-slot-width.ts';

const PHONE_VIEWPORT_WIDTH = 393;
const PHONE_THUMBNAIL_RENDERED_WIDTH = 180;
const HQDEFAULT_WIDTH = 480;

function getLatestEpisode(show: Show): Episode {
  const [latestEpisode] = show.episodes;
  if (latestEpisode === undefined) {
    throw new Error('The fixture show has no episodes');
  }
  return latestEpisode;
}

function withLatestEpisode(overrides: Partial<Episode>): Show {
  const show = buildFixtureShow();
  return {
    ...show,
    episodes: [{ ...getLatestEpisode(show), ...overrides }, ...show.episodes.slice(1)],
  };
}

function withoutLatestEpisodeLink(link: 'spotifyUrl' | 'youtubeUrl' | 'youtubeVideoId'): Show {
  const show = buildFixtureShow();
  const latestEpisode = { ...getLatestEpisode(show) };
  delete latestEpisode[link];
  return { ...show, episodes: [latestEpisode, ...show.episodes.slice(1)] };
}

function readHeadingAccessibleText(markup: string): string {
  const headingMarkup = markup.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '';
  const [textBeforeHiddenVisual = ''] = headingMarkup.split('aria-hidden="true"');
  return textBeforeHiddenVisual
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('renderHero with the fixture show', () => {
  const show = buildFixtureShow();
  const latestEpisode = getLatestEpisode(show);
  const markup = renderHero(show);

  it('shows the newest episode title and short date', () => {
    expect(markup).toContain(latestEpisode.title);
    expect(markup).toContain(`>${formatShortDate(latestEpisode.publishedAt)}</time>`);
  });

  it('links Watch to the newest episode on YouTube', () => {
    expect(latestEpisode.youtubeUrl).toBeDefined();
    expect(markup).toContain(`class="hero-card-watch" href="${latestEpisode.youtubeUrl}"`);
  });

  it('links Listen to Spotify when the newest episode has a Spotify link', () => {
    const spotifyUrl = 'https://podcasters.spotify.com/pod/show/mayagia/episodes/newest';
    const spotifyMarkup = renderHero(withLatestEpisode({ spotifyUrl }));

    expect(spotifyMarkup).toContain(`class="pill" href="${spotifyUrl}"`);
    expect(spotifyMarkup).toContain('Listen<span');
  });

  it('sizes the thumbnail with width, height and a srcset from the show', () => {
    const { thumbnail } = latestEpisode;

    expect(markup).toContain(`width="${thumbnail.width}" height="${thumbnail.height}"`);
    expect(markup).toContain(`srcset="${thumbnail.srcset}"`);
  });

  it('loads the thumbnail at once and ahead of the other images, because it is the first thing painted', () => {
    const image = markup.match(/<img class="hero-card-image"[^>]*>/)?.[0] ?? '';

    expect(image).toContain('fetchpriority="high"');
    expect(image).not.toContain('loading=');
  });

  it('sizes the thumbnail for a 393 px phone no smaller than it renders and within the 480 px candidate', () => {
    const sizes = markup.match(/<img class="hero-card-image"[^>]*\ssizes="([^"]*)"/)?.[1] ?? '';

    const slotWidth = resolveImageSlotWidth(sizes, PHONE_VIEWPORT_WIDTH);

    expect(slotWidth).toBeGreaterThanOrEqual(PHONE_THUMBNAIL_RENDERED_WIDTH);
    expect(slotWidth).toBeLessThanOrEqual(HQDEFAULT_WIDTH);
  });

  it('gives the h1 the accessible name Pretty Unfocused', () => {
    expect(markup.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(readHeadingAccessibleText(markup)).toBe('Pretty Unfocused');
  });

  it('hides the decorative letters and the ring from assistive tech', () => {
    expect(markup).toMatch(
      /aria-hidden="true">\s*<span class="hero-script"><span class="hero-script-rise"[^>]*><span class="hero-script-text">Pretty<\/span><\/span><\/span>/,
    );
    expect(markup).toContain('class="hero-letter hero-ring"');
    expect(markup).toContain('alt=""');
  });

  it('opens the in-place player from the thumbnail and from the play disc with Watch', () => {
    const playerAttributes = `data-player="${latestEpisode.youtubeVideoId}" data-player-title="${latestEpisode.title}"`;

    expect(markup).toContain(`class="hero-card-media" href="${latestEpisode.youtubeUrl}" ${playerAttributes} tabindex="-1"`);
    expect(markup).toContain(`class="hero-card-watch" href="${latestEpisode.youtubeUrl}" ${playerAttributes}>`);
    expect(markup.match(/data-player=/g)).toHaveLength(2);
  });

  it('makes the play disc and the Watch pill one link, named after the episode', () => {
    const watchLink = markup.match(/<a class="hero-card-watch"[^>]*>.*?<\/a>/s)?.[0] ?? '';

    expect(watchLink).toContain('round-button--gold');
    expect(watchLink).toContain('Watch<span');
    expect(watchLink).toContain('on YouTube');
    expect(markup.match(/class="hero-card-watch"/g)).toHaveLength(1);
    expect(markup).not.toContain('<a class="round-button');
  });

  it('keeps the dot and the date together so a break comes before the dot', () => {
    expect(markup).toMatch(
      /Latest episode <span class="hero-card-meta-date"><span class="hero-card-meta-dot">&middot;&nbsp;<\/span><time/,
    );
  });

  it('wraps the label, title and action row in masks so they can arrive in order', () => {
    expect(markup.match(/data-hero="card-text"/g)).toHaveLength(3);
  });

  it('keeps the tagline source in sentence case so screen readers say BFF’s', () => {
    expect(markup).toContain('BFF<span class="apostrophe">&rsquo;</span>s,');
  });

  it('names the three platforms and gives each its mark', () => {
    expect(markup).toContain('>Spotify</a>');
    expect(markup).toContain('>YouTube</a>');
    expect(markup).toContain('>TikTok</a>');
    expect(markup.match(/#icon-(spotify|youtube|tiktok)/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

describe('renderHero edge cases', () => {
  it('leaves out Listen when the episode has no Spotify link', () => {
    const markup = renderHero(withoutLatestEpisodeLink('spotifyUrl'));

    expect(markup).not.toContain('Listen<span');
    expect(markup).toContain('Watch<span');
  });

  it('leaves the links plain when the episode has no video id for the player', () => {
    const markup = renderHero(withoutLatestEpisodeLink('youtubeVideoId'));

    expect(markup).not.toContain('data-player');
    expect(markup).toContain('class="hero-card-watch"');
  });

  it('leaves out Watch and the play button when the episode has no YouTube link', () => {
    const markup = renderHero(withoutLatestEpisodeLink('youtubeUrl'));

    expect(markup).not.toContain('Watch<span');
    expect(markup).not.toContain('round-button--gold');
  });

  it('escapes feed text in the title, links and thumbnail', () => {
    const markup = renderHero(
      withLatestEpisode({
        title: '<script>alert("x")</script> & more',
        youtubeUrl: 'https://example.com/watch?a=1&b="2"',
        spotifyUrl: 'https://example.com/listen?x=<y>',
        thumbnail: {
          src: 'https://example.com/a.jpg?q="1"',
          width: 480,
          height: 360,
        },
      }),
    );

    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more');
    expect(markup).toContain('href="https://example.com/watch?a=1&amp;b=&quot;2&quot;"');
    expect(markup).toContain('href="https://example.com/listen?x=&lt;y&gt;"');
    expect(markup).toContain('src="https://example.com/a.jpg?q=&quot;1&quot;"');
  });

  it('renders the hero without a card when the show has no episodes', () => {
    const markup = renderHero({ description: '', episodes: [], clips: [] });

    expect(markup).not.toContain('hero-card');
    expect(markup).toContain('id="home"');
  });
});
