// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startWhenNear } from './start-when-near.ts';

const SCREEN_HEIGHT = 700;
let start: ReturnType<typeof vi.fn<() => void>>;
let sectionTop = 0;

function getSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>('#episodes');
  if (section === null) {
    throw new Error('The page has no #episodes');
  }
  return section;
}

async function scrollTo(top: number): Promise<void> {
  sectionTop = top;
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

beforeEach(() => {
  start = vi.fn<() => void>();
  document.body.innerHTML =
    '<a id="jump" href="#clips">Clips</a><a id="out" href="https://example.com/">Out</a><section id="episodes"><button id="inside"></button></section>';
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(SCREEN_HEIGHT);
  vi.spyOn(getSection(), 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, sectionTop, 0, 800));
  window.location.hash = '';
  sectionTop = 3 * SCREEN_HEIGHT;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('starting a section when the visitor nears it', () => {
  it('does nothing when the page has no such section', () => {
    expect(() => startWhenNear(null, start)).not.toThrow();
    expect(start).not.toHaveBeenCalled();
  });

  it('starts at once when the section is already within a screen of the viewport', () => {
    sectionTop = 2 * SCREEN_HEIGHT;

    startWhenNear(getSection(), start);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts at once when the page opens at a hash', () => {
    window.location.hash = '#clips';

    startWhenNear(getSection(), start);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('waits while the section is further than a screen below the viewport', async () => {
    startWhenNear(getSection(), start);

    await scrollTo(2 * SCREEN_HEIGHT + 1);

    expect(start).not.toHaveBeenCalled();
  });

  it('starts when a scroll brings the section within a screen of the viewport, and only once', async () => {
    startWhenNear(getSection(), start);

    await scrollTo(2 * SCREEN_HEIGHT);
    await scrollTo(SCREEN_HEIGHT);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts when a jump carries the viewport past the section', async () => {
    startWhenNear(getSection(), start);

    await scrollTo(-5 * SCREEN_HEIGHT);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts when a link to a place on the page is clicked, since the jump skips the screens in between', () => {
    startWhenNear(getSection(), start);

    document.getElementById('out')?.click();
    expect(start).not.toHaveBeenCalled();
    document.getElementById('jump')?.click();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts when the hash changes', () => {
    startWhenNear(getSection(), start);

    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts when focus reaches inside the section', () => {
    startWhenNear(getSection(), start);

    document.getElementById('inside')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('stops listening once started', async () => {
    startWhenNear(getSection(), start);
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    document.getElementById('jump')?.click();
    await scrollTo(0);

    expect(start).toHaveBeenCalledTimes(1);
  });
});
