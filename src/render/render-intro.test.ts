import { describe, expect, it } from 'vitest';

import { renderIntro } from './render-intro.ts';

describe('renderIntro', () => {
  it('stays hidden from assistive tech', () => {
    expect(renderIntro()).toContain('class="intro" aria-hidden="true"');
  });

  it('holds the ring and the three tagline lines on one panel for the module to lift', () => {
    const markup = renderIntro();

    expect(markup).toContain('data-intro="panel"');
    expect(markup).toContain('data-intro="ring"');
    expect(markup.match(/data-intro="line"/g)).toHaveLength(3);
  });

  it('tints only the last line, like the hero tagline', () => {
    const markup = renderIntro();

    expect(markup.match(/intro-line--tint/g)).toHaveLength(1);
    expect(markup).toMatch(/intro-line intro-line--tint[^>]*>brain\./);
  });
});
