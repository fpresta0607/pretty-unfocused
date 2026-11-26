import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import type { Show } from '../show/show-types.ts';
import { showDataPlugin } from './show-data-plugin.ts';

const SITE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

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
  clips: [],
};

async function buildPage(): Promise<string> {
  const result = await build({
    root: SITE_ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [showDataPlugin(() => SHOW)],
    build: { write: false },
  });
  if (Array.isArray(result) || !('output' in result)) {
    throw new Error('Expected a single build output');
  }
  const page = result.output.find((file) => file.fileName === 'index.html');
  if (page?.type !== 'asset' || typeof page.source !== 'string') {
    throw new Error('Expected the build to emit index.html');
  }
  return page.source;
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

  it('adds the in-place player to the page', async () => {
    const page = await buildPage();

    expect(page).toContain('<dialog class="player"');
  });

  it('puts the intro in place of its marker', async () => {
    const page = await buildPage();

    expect(page).toContain('<div class="intro" aria-hidden="true" data-module-intro>');
    expect(page).not.toContain('<!--render:intro-->');
  });
});
