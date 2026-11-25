import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import type { Episode } from '../show/show-types.ts';
import { PLATFORM_LINKS } from './platform-links.ts';
import { renderFrame } from './render-frame.ts';

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About & more' },
];

describe('renderFrame', () => {
  const show = buildFixtureShow();
  const [latestEpisode] = show.episodes;
  const markup = renderFrame(show, SECTIONS);

  it('lists every section as a numbered menu link named by its label alone', () => {
    expect(markup).toContain('href="#home"');
    expect(markup).toContain('<span class="menu-link-number" aria-hidden="true">01</span>');
    expect(markup).toContain('<span class="menu-link-label">Home</span>');
    expect(markup).toContain('<span class="menu-link-number" aria-hidden="true">02</span>');
  });

  it('renders the ring mark hidden so it never shows over the hero before the page runs', () => {
    expect(markup).toMatch(/<a class="frame-mark"[^>]* data-hidden[ >]/);
  });

  it('escapes section labels', () => {
    expect(markup).toContain('About &amp; more');
  });

  it('wires the menu and Listen buttons to their panels', () => {
    expect(markup).toMatch(/aria-expanded="false" aria-controls="menu-panel"/);
    expect(markup).toMatch(/aria-expanded="false" aria-controls="listen-panel"/);
    expect(markup).toContain('id="menu-panel"');
    expect(markup).toContain('id="listen-panel"');
  });

  it('links every platform in the Listen panel', () => {
    for (const link of PLATFORM_LINKS) {
      expect(markup).toContain(`class="listen-link" href="${link.url}"`);
    }
  });

  it('shows the first section name until the page reports the current one', () => {
    expect(markup).toMatch(/data-frame="section"[^>]*>Home<\/p>/);
  });

  it('builds the mini card from the newest episode with a YouTube play link', () => {
    expect(markup).toContain('data-frame="mini"');
    expect(markup).toContain(
      `href="${latestEpisode?.youtubeUrl}" aria-label="Play ${latestEpisode?.title} on YouTube"`,
    );
    expect(markup).toContain(`>${latestEpisode?.title}</span>`);
  });

  it('links the mini card to Spotify when the newest episode is not on YouTube yet', () => {
    const podcastOnlyEpisode: Episode = {
      id: 'podcast-only',
      title: 'Monday drop',
      publishedAt: '2026-11-23T08:00:00.000Z',
      description: '',
      spotifyUrl: 'https://open.spotify.com/episode/monday-drop',
      thumbnail: { src: 'https://example.com/monday-drop.jpg', width: 640, height: 640 },
    };

    const spotifyMarkup = renderFrame({ ...show, episodes: [podcastOnlyEpisode, ...show.episodes] }, SECTIONS);

    expect(spotifyMarkup).toContain(
      'href="https://open.spotify.com/episode/monday-drop" aria-label="Play Monday drop on Spotify"',
    );
    expect(spotifyMarkup).toContain('>Monday drop</span>');
    expect(spotifyMarkup).not.toContain('on YouTube"');
  });

  it('leaves out the mini card when the newest episode has neither a YouTube nor a Spotify link', () => {
    const unlinkedEpisode: Episode = {
      id: 'unlinked',
      title: 'Nowhere yet',
      publishedAt: '2026-11-23T08:00:00.000Z',
      description: '',
      thumbnail: { src: 'https://example.com/nowhere-yet.jpg', width: 640, height: 640 },
    };

    const unlinkedMarkup = renderFrame({ ...show, episodes: [unlinkedEpisode, ...show.episodes] }, SECTIONS);

    expect(unlinkedMarkup).not.toContain('data-frame="mini"');
  });

  it('leaves out the mini card when there is no episode to play', () => {
    const emptyMarkup = renderFrame({ description: '', episodes: [], clips: [] }, SECTIONS);

    expect(emptyMarkup).not.toContain('data-frame="mini"');
  });

  it('escapes the episode title in the mini card', () => {
    if (latestEpisode === undefined) {
      throw new Error('The fixture show has no episodes');
    }
    const escapedMarkup = renderFrame(
      { ...show, episodes: [{ ...latestEpisode, title: '<b>"hi"</b>' }] },
      SECTIONS,
    );

    expect(escapedMarkup).toContain('&lt;b&gt;&quot;hi&quot;&lt;/b&gt;');
    expect(escapedMarkup).not.toContain('<b>');
  });
});
