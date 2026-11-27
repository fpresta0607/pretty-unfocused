import type { Plugin } from 'vite';

import { SITE_URL } from '../show/show-links.ts';
import type { Show } from '../show/show-types.ts';
import { renderIntro } from './render-intro.ts';
import { renderPageFooter, renderPageFrame, renderSections } from './render-page.ts';

const SECTIONS_MARKER = '<!--render:sections-->';
const FOOTER_MARKER = '<!--render:footer-->';
const FRAME_MARKER = '<!--render:frame-->';
const INTRO_MARKER = '<!--render:intro-->';
const SITE_URL_TOKEN = '%SITE_URL%';
const SHOW_FILE_NAME = 'show.json';

export function showDataPlugin(loadShow: () => Show | Promise<Show>): Plugin {
  let show: Show | undefined;

  return {
    name: 'show-data',
    async buildStart() {
      show = await loadShow();
    },
    generateBundle() {
      if (show === undefined) {
        throw new Error('Show data has not been fetched');
      }
      this.emitFile({ type: 'asset', fileName: SHOW_FILE_NAME, source: JSON.stringify(show) });
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
          .replace(FOOTER_MARKER, () => renderPageFooter(loadedShow))
          .replace(FRAME_MARKER, () => renderPageFrame(loadedShow))
          .replace(INTRO_MARKER, () => renderIntro())
          .replaceAll(SITE_URL_TOKEN, SITE_URL);
      },
    },
  };
}
