import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import { renderPageFrame, renderSections } from './render-page.ts';

describe('renderPageFrame', () => {
  it('lists every section in the menu, in page order, from the hero to the footer', () => {
    const labels = [...renderPageFrame(buildFixtureShow()).matchAll(/<span class="menu-link-label">(.*?)<\/span>/g)].map((match) => match[1]);

    expect(labels).toEqual(['Home', 'About the show', 'Episodes', 'Clips', 'Say hi']);
  });

  it('defines each coffee-stain outline once, for every section edge and colour band to reference', () => {
    const show = buildFixtureShow();
    const markup = `${renderPageFrame(show)}${renderSections(show)}`;
    const referencedIds = new Set(Array.from(markup.matchAll(/<use class="stain-edge-(?:rim|fill)" href="#([^"]+)"/g), (match) => match[1]));

    expect(referencedIds).toEqual(new Set(['stain-edge-rim-wide', 'stain-edge-fill-wide', 'stain-edge-rim-narrow', 'stain-edge-fill-narrow']));
    for (const id of referencedIds) {
      expect(markup.match(new RegExp(`<path id="${id}" d="[^"]+"/>`, 'g'))).toHaveLength(1);
    }
  });

  it('leaves Clips out of the menu when there are no clips to show', () => {
    const show = { ...buildFixtureShow(), clips: [] };

    expect(renderSections(show)).not.toContain('id="clips"');
    expect(renderPageFrame(show)).not.toContain('href="#clips"');
    expect(renderPageFrame(show)).toContain('href="#say-hi"');
  });
});
