import { describe, expect, it } from 'vitest';

import type { Show } from '../show/show-types.ts';
import { SECTION_RENDERERS, renderSections } from './render-page.ts';

const SHOW: Show = { description: 'About the show', episodes: [], clips: [] };

describe('SECTION_RENDERERS', () => {
  it('gives every section a unique id', () => {
    const ids = SECTION_RENDERERS.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('renderSections', () => {
  it('joins the output of every section in order', () => {
    const expected = SECTION_RENDERERS.map((section) => section.render(SHOW)).join('\n');

    expect(renderSections(SHOW)).toBe(expected);
  });
});
