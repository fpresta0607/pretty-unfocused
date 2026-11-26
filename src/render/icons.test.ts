import { describe, expect, it } from 'vitest';

import { renderIcon, renderIconSprite } from './icons.ts';

describe('renderIconSprite', () => {
  it('defines a symbol for every icon the page uses', () => {
    const sprite = renderIconSprite();

    for (const name of ['spotify', 'youtube', 'tiktok', 'menu', 'close', 'headphones', 'play', 'arrow']) {
      expect(sprite).toContain(`id="icon-${name}"`);
    }
  });

  it('is hidden from assistive tech', () => {
    expect(renderIconSprite()).toContain('aria-hidden="true"');
  });
});

describe('renderIcon', () => {
  it('references the sprite symbol and hides itself from assistive tech', () => {
    expect(renderIcon('spotify', 'brand-icon')).toBe(
      '<svg class="brand-icon" aria-hidden="true" focusable="false"><use href="#icon-spotify"/></svg>',
    );
  });
});
