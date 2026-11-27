import { defineConfig } from 'vite';

import { showDataPlugin } from './src/render/show-data-plugin.ts';
import { buildFixtureShow } from './src/show/build-fixture-show.ts';
import { loadPublishedShow } from './src/show/load-show.ts';
import { fontPreloadPlugin } from './src/vite-plugins/font-preload-plugin.ts';

const FIXTURES_MODE = 'fixtures';

export default defineConfig(({ mode }) => ({
  plugins: [
    showDataPlugin(mode === FIXTURES_MODE ? buildFixtureShow : () => loadPublishedShow(globalThis.fetch)),
    fontPreloadPlugin(),
  ],
}));
