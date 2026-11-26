// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFooter } from '../render/render-footer.ts';
import { Footer } from './footer.ts';

const VIEWPORT_HEIGHT = 800;
const RUN_HEIGHT = 480;
const WORD_HEIGHT = 200;
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
  Object.defineProperty(getPart('.footer-word'), 'offsetHeight', { configurable: true, value: WORD_HEIGHT });
  Object.defineProperty(getPart('.footer-run'), 'offsetHeight', { configurable: true, value: RUN_HEIGHT });
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
  document.documentElement.removeAttribute('data-footer-word');
});

describe('Footer with motion on', () => {
  it('holds the headline, the email and the links back until the footer arrives', () => {
    start(true);

    expect(getFooter().dataset.reveal).toBe('pending');
  });

  it('releases the footer once the stain has begun and the headline is on screen', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.85, VIEWPORT_HEIGHT * 0.95);

    expect(getFooter().dataset.reveal).toBeUndefined();
  });

  it('keeps everything back while the stain has barely begun', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.98, VIEWPORT_HEIGHT * 0.99);

    expect(getFooter().dataset.reveal).toBe('pending');
  });

  it('keeps everything back while the headline is still below the screen', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.85, VIEWPORT_HEIGHT * 1.2);

    expect(getFooter().dataset.reveal).toBe('pending');
  });

  it('starts the email and the links hidden, so that the headline arrives first', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.85, VIEWPORT_HEIGHT * 0.95);

    expect(getPart('[data-footer="email"]').style.opacity).toBe('0');
    expect(getPart('[data-footer="link"]').style.opacity).toBe('0');
  });

  it.each([
    ['well before the run', PAGE_END_SCROLL - RUN_HEIGHT * 2, '0.000'],
    ['half way through the run', PAGE_END_SCROLL - RUN_HEIGHT / 2, '0.500'],
    ['at the page end', PAGE_END_SCROLL, '1.000'],
  ])('sets the word rise %s', async (_name, scrollY, expected) => {
    start(true);

    await scrollTo(scrollY, 0, 0);

    expect(getFooter().style.getPropertyValue('--footer-rise')).toBe(expected);
  });

  it('shows the word, and so hides the frame name, only once it has begun to rise', async () => {
    start(true);

    await scrollTo(PAGE_END_SCROLL - RUN_HEIGHT * 2, 0, 0);
    expect(document.documentElement.hasAttribute('data-footer-word')).toBe(false);

    await scrollTo(PAGE_END_SCROLL - RUN_HEIGHT / 2, 0, 0);
    expect(document.documentElement.hasAttribute('data-footer-word')).toBe(true);
  });
});

describe('Footer with motion off', () => {
  it('leaves the headline and the word in place', async () => {
    start(false);

    await scrollTo(PAGE_END_SCROLL - 100, 0, 0);

    expect(getFooter().dataset.reveal).toBeUndefined();
    expect(getFooter().style.getPropertyValue('--footer-rise')).toBe('');
  });

  it('still shows the word, and hides the frame name, when the word is on screen', async () => {
    start(false);

    await scrollTo(PAGE_END_SCROLL - WORD_HEIGHT * 3, 0, 0);
    expect(document.documentElement.hasAttribute('data-footer-word')).toBe(false);

    await scrollTo(PAGE_END_SCROLL - WORD_HEIGHT / 2, 0, 0);
    expect(document.documentElement.hasAttribute('data-footer-word')).toBe(true);
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
