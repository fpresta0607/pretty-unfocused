import { describe, expect, it } from 'vitest';

import { findFontPreloadFiles } from './font-preload-plugin.ts';

describe('findFontPreloadFiles', () => {
  it('keeps only the display and script faces in woff2', () => {
    const bundleFileNames = [
      'assets/italiana-latin-400-normal-AbC123.woff2',
      'assets/italiana-latin-400-normal-AbC123.woff',
      'assets/pinyon-script-latin-400-normal-Zz9_-1.woff2',
      'assets/cormorant-garamond-latin-500-normal-Qq1.woff2',
      'assets/index-Hash.js',
    ];

    expect(findFontPreloadFiles(bundleFileNames)).toEqual([
      'assets/italiana-latin-400-normal-AbC123.woff2',
      'assets/pinyon-script-latin-400-normal-Zz9_-1.woff2',
    ]);
  });

  it('returns nothing when no font was emitted', () => {
    expect(findFontPreloadFiles(['assets/index-Hash.js'])).toEqual([]);
  });
});
