import { describe, expect, it } from 'vitest';

import { SITE_URL } from '../show/show-links.ts';
import type { Show } from '../show/show-types.ts';
import { buildTestPage } from './build-test-page.ts';

const SHOW: Show = {
  description: 'About the show',
  episodes: [
    {
      id: 'episode',
      title: 'Episode',
      publishedAt: '2026-10-01T00:00:00.000Z',
      description: 'Episode description',
      thumbnail: { src: 'https://example.com/art.jpg', width: 1400, height: 1400 },
    },
  ],
  clips: [
    {
      id: 'clip',
      title: 'Clip',
      publishedAt: '2026-10-02T00:00:00.000Z',
      youtubeUrl: 'https://www.youtube.com/shorts/clip',
      youtubeVideoId: 'clip',
      thumbnail: { src: 'https://i.ytimg.com/vi/clip/hqdefault.jpg', width: 480, height: 360 },
    },
  ],
};

async function buildPage(): Promise<string> {
  return (await buildTestPage(SHOW)).page;
}

describe('showDataPlugin', () => {
  it('opens main with the home hero', async () => {
    const page = await buildPage();

    expect(page).toContain('<main id="main" tabindex="-1" data-inert-on-menu><section class="section section--wine hero" id="home"');
    expect(page).toContain('<title>Pretty Unfocused</title>');
  });

  it('follows the hero with the about section, named in the frame menu', async () => {
    const page = await buildPage();

    expect(page.indexOf('id="home"')).toBeLessThan(page.indexOf('id="about"'));
    expect(page).toContain('href="#about" data-menu="link"');
    expect(page).toContain('About the show');
  });

  it('puts the page frame in place of its marker, with Home first in its menu', async () => {
    const page = await buildPage();

    expect(page).toContain('<header class="frame" data-module-frame');
    expect(page).toContain('href="#home" data-menu="link"');
    expect(page).not.toContain('<!--render:frame-->');
  });

  it('adds the episodes section after the hero, with its menu link and the player', async () => {
    const page = await buildPage();

    expect(page).toContain('id="episodes"');
    expect(page.indexOf('id="home"')).toBeLessThan(page.indexOf('id="episodes"'));
    expect(page).toContain('href="#episodes" data-menu="link"');
    expect(page).toContain('<span class="menu-link-label">Episodes</span>');
    expect(page).toContain('<dialog class="player"');
  });

  it('ends main with the clips section, in the frame menu, and has no every-episode list or link to one', async () => {
    const page = await buildPage();

    expect(page.indexOf('id="episodes"')).toBeLessThan(page.indexOf('id="clips"'));
    expect(page.indexOf('id="clips"')).toBeLessThan(page.indexOf('</main>'));
    expect(page).toContain('href="#clips" data-menu="link"');
    expect(page).toContain('<span class="menu-link-label">Clips</span>');
    expect(page).not.toContain('every-episode');
    expect(page).not.toContain('Every episode');
  });

  it('closes the page with the footer after main, with its menu link and the frame label', async () => {
    const page = await buildPage();

    expect(page.indexOf('</main>')).toBeLessThan(page.indexOf('id="say-hi"'));
    expect(page.indexOf('id="episodes"')).toBeLessThan(page.indexOf('id="say-hi"'));
    expect(page).toMatch(/<footer class="section section--wine footer" id="say-hi"/);
    expect(page).toContain('href="#say-hi" data-menu="link"');
    expect(page).toContain('<span class="menu-link-label">Say hi</span>');
    expect(page).not.toContain('<!--render:footer-->');
  });

  it('names the share image, the page address and the canonical link by one absolute address', async () => {
    const page = await buildPage();

    expect(page).toContain(`<meta property="og:image" content="${SITE_URL}/og-image.jpg" />`);
    expect(page).toContain(`<meta property="og:url" content="${SITE_URL}/" />`);
    expect(page).toContain(`<link rel="canonical" href="${SITE_URL}/" />`);
    expect(page).not.toContain('%SITE_URL%');
  });

  it('writes the merged show it built as show.json beside the page', async () => {
    const { showJson } = await buildTestPage(SHOW);

    expect(JSON.parse(showJson)).toEqual(SHOW);
  });

  it('puts the intro in place of its marker', async () => {
    const page = await buildPage();

    expect(page).toContain('<div class="intro" aria-hidden="true" data-module-intro>');
    expect(page).not.toContain('<!--render:intro-->');
  });
});
