import type { HtmlTagDescriptor, Plugin } from 'vite';

const PRELOADED_FONT_PATTERN = /(?:^|\/)(?:italiana|pinyon-script)-latin-400-normal-[\w-]+\.woff2$/;

export function findFontPreloadFiles(bundleFileNames: readonly string[]): string[] {
  return bundleFileNames.filter((fileName) => PRELOADED_FONT_PATTERN.test(fileName));
}

export function fontPreloadPlugin(): Plugin {
  return {
    name: 'font-preload',
    transformIndexHtml(_html, context): HtmlTagDescriptor[] {
      if (context.bundle === undefined) {
        return [];
      }
      return findFontPreloadFiles(Object.keys(context.bundle)).map((fileName) => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: `/${fileName}`,
          crossorigin: '',
        },
        injectTo: 'head',
      }));
    },
  };
}
