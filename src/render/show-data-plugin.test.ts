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
  it('builds the shell with an empty main while no sections are registered', async () => {
    const page = await buildPage();

    expect(page).toContain('<main id="main"></main>');
    expect(page).toContain('<title>Pretty Unfocused</title>');
  });
});
