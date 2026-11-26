import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import { renderPageFrame, renderSections } from './render-page.ts';

describe('renderPageFrame', () => {
  it('lists every section in the menu, in page order, ending with Clips and Every episode', () => {
    const labels = [...renderPageFrame(buildFixtureShow()).matchAll(/<span class="menu-link-label">(.*?)<\/span>/g)].map((match) => match[1]);

    expect(labels).toEqual(['Home', 'About the show', 'Episodes', 'Clips', 'Every episode']);
  });

  it('leaves Clips out of the menu when there are no clips to show', () => {
    const show = { ...buildFixtureShow(), clips: [] };

    expect(renderSections(show)).not.toContain('id="clips"');
    expect(renderPageFrame(show)).not.toContain('href="#clips"');
    expect(renderPageFrame(show)).toContain('href="#every-episode"');
  });
});
