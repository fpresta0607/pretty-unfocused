import type { Plugin } from 'vite';

import type { Show } from '../show/show-types.ts';
import { renderPageFrame, renderSections } from './render-page.ts';

const SECTIONS_MARKER = '<!--render:sections-->';
const FRAME_MARKER = '<!--render:frame-->';

export function showDataPlugin(loadShow: () => Show | Promise<Show>): Plugin {
  let show: Show | undefined;

  return {
    name: 'show-data',
    async buildStart() {
      show = await loadShow();
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (show === undefined) {
          throw new Error('Show data has not been fetched');
        }
        const loadedShow = show;
        return html
          .replace(SECTIONS_MARKER, () => renderSections(loadedShow))
          .replace(FRAME_MARKER, () => renderPageFrame(loadedShow));
      },
    },
  };
}
