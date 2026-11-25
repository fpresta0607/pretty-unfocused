import { defineConfig } from 'vite';

import { showDataPlugin } from './src/render/show-data-plugin.ts';
import { buildFixtureShow } from './src/show/build-fixture-show.ts';
import { fetchShow } from './src/show/fetch-show.ts';

const FIXTURES_MODE = 'fixtures';

export default defineConfig(({ mode }) => ({
  plugins: [
    showDataPlugin(mode === FIXTURES_MODE ? buildFixtureShow : () => fetchShow(globalThis.fetch)),
  ],
}));
