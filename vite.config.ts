import { defineConfig, type Plugin } from 'vite';

import { renderSections } from './src/render/render-page.ts';
import { fetchShow } from './src/show/fetch-show.ts';
import type { Show } from './src/show/show-types.ts';

const SECTIONS_MARKER = '<!--render:sections-->';

function showDataPlugin(): Plugin {
  let show: Show | undefined;

  return {
    name: 'show-data',
    async buildStart() {
      show = await fetchShow(globalThis.fetch);
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (show === undefined) {
          throw new Error('Show data has not been fetched');
        }
        const loadedShow = show;
        return html.replace(SECTIONS_MARKER, () => renderSections(loadedShow));
      },
    },
  };
}

export default defineConfig({
  plugins: [showDataPlugin()],
});
