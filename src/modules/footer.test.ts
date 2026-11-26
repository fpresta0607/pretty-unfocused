// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFooter } from '../render/render-footer.ts';
import { Footer } from './footer.ts';

const VIEWPORT_HEIGHT = 800;
const WORD_REST_TOP = 560;
const RISE_LENGTH = VIEWPORT_HEIGHT - WORD_REST_TOP;
const PAGE_HEIGHT = 5000;
const PAGE_END_SCROLL = PAGE_HEIGHT - VIEWPORT_HEIGHT;
let app: ModularApp;

function getFooter(): HTMLElement {
  const footer = document.getElementById('say-hi');
  if (footer === null) {
    throw new Error('The page has no footer');
  }
  return footer;
}

function getPart(selector: string): HTMLElement {
  const part = getFooter().querySelector<HTMLElement>(selector);
  if (part === null) {
    throw new Error(`The footer has no ${selector}`);
  }
  return part;
}

function placeFooter(footerTop: number, headingTop: number): void {
  getFooter().getBoundingClientRect = () => new DOMRect(0, footerTop, 1024, VIEWPORT_HEIGHT);
  getPart('[data-footer-group="heading"]').getBoundingClientRect = () => new DOMRect(0, headingTop, 600, 300);
  const wordTop = WORD_REST_TOP + (PAGE_END_SCROLL - window.scrollY);
  getPart('.footer-word').getBoundingClientRect = () => new DOMRect(0, wordTop, 600, 120);
}

async function scrollTo(scrollY: number, footerTop: number, headingTop: number): Promise<void> {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });
  placeFooter(footerTop, headingTop);
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function start(isMotionOn: boolean): void {
  document.documentElement.dataset.motion = isMotionOn ? 'on' : 'off';
  document.body.innerHTML = renderFooter();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VIEWPORT_HEIGHT });
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: PAGE_HEIGHT });
  placeFooter(PAGE_HEIGHT, PAGE_HEIGHT);
  app = new ModularApp({ modules: { footer: Footer } });
  app.init(app);
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  app.destroy();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.motion;
  document.documentElement.removeAttribute('data-footer-in-view');
});

describe('Footer with motion on', () => {
  it('holds the headline, the email and the links back until the footer arrives', () => {
    start(true);

    expect(getFooter().dataset.reveal).toBe('pending');
  });

  it('releases the footer once the stain has reached the headline', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.6, VIEWPORT_HEIGHT * 0.7);

    expect(getFooter().dataset.reveal).toBeUndefined();
  });

  it('keeps everything back while the stain has not yet reached the headline', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.8, VIEWPORT_HEIGHT * 0.9);

    expect(getFooter().dataset.reveal).toBe('pending');
  });

  it('starts the email and the links hidden, so that the headline arrives first', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.6, VIEWPORT_HEIGHT * 0.7);

    expect(getPart('[data-footer="email"]').style.clipPath).toContain('100%');
    expect(getPart('[data-footer="link"]').style.clipPath).toContain('100%');
  });

  it.each([
    ['well before the word is on screen', PAGE_END_SCROLL - RISE_LENGTH * 2, '0.000'],
    ['as the word reaches the bottom edge', PAGE_END_SCROLL - RISE_LENGTH, '0.000'],
    ['a quarter of the way in', PAGE_END_SCROLL - RISE_LENGTH * 0.75, '0.250'],
    ['half way in', PAGE_END_SCROLL - RISE_LENGTH / 2, '0.500'],
    ['at the page end', PAGE_END_SCROLL, '1.000'],
  ])('sets the word rise %s', async (_name, scrollY, expected) => {
    start(true);

    await scrollTo(scrollY, 0, 0);

    expect(getFooter().style.getPropertyValue('--footer-rise')).toBe(expected);
  });
});

describe('Footer with motion off', () => {
  it('leaves the headline and the word in place', async () => {
    start(false);

    await scrollTo(PAGE_END_SCROLL - 100, 0, 0);

    expect(getFooter().dataset.reveal).toBeUndefined();
    expect(getFooter().style.getPropertyValue('--footer-rise')).toBe('');
  });

});

describe.each([
  ['on', true],
  ['off', false],
])('Footer with motion %s', (_name, isMotionOn) => {
  it('marks the page as showing the footer once it is in view, and clears it when it is not', async () => {
    start(isMotionOn);
    expect(document.documentElement.hasAttribute('data-footer-in-view')).toBe(false);

    await scrollTo(PAGE_END_SCROLL, 0, 0);
    expect(document.documentElement.hasAttribute('data-footer-in-view')).toBe(true);

    await scrollTo(0, PAGE_HEIGHT, PAGE_HEIGHT);
    expect(document.documentElement.hasAttribute('data-footer-in-view')).toBe(false);
  });
});
