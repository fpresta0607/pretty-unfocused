// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFooter } from '../render/render-footer.ts';
import { RISE_RANGE_WORD_HEIGHTS } from './footer-logic.ts';
import { Footer } from './footer.ts';
import { SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';

const VIEWPORT_HEIGHT = 800;
const WORD_HEIGHT = 200;
const RANGE = RISE_RANGE_WORD_HEIGHTS * WORD_HEIGHT;
const PAGE_HEIGHT = 5000;
let app: ModularApp;
let isFinePointer = true;

function getFooter(): HTMLElement {
  const footer = document.getElementById('say-hi');
  if (footer === null) {
    throw new Error('The page has no footer');
  }
  return footer;
}

function getHeading(): HTMLElement {
  const heading = getFooter().querySelector<HTMLElement>('[data-footer-group="heading"]');
  if (heading === null) {
    throw new Error('The footer has no heading');
  }
  return heading;
}

function getWord(): HTMLElement {
  const word = getFooter().querySelector<HTMLElement>('.footer-word');
  if (word === null) {
    throw new Error('The footer has no word');
  }
  return word;
}

function placeFooter(footerTop: number, headingTop: number): void {
  getFooter().getBoundingClientRect = () => new DOMRect(0, footerTop, 1024, VIEWPORT_HEIGHT);
  getHeading().getBoundingClientRect = () => new DOMRect(0, headingTop, 600, 300);
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
  Object.defineProperty(getWord(), 'offsetHeight', { configurable: true, value: WORD_HEIGHT });
  placeFooter(PAGE_HEIGHT, PAGE_HEIGHT);
  app = new ModularApp({ modules: { footer: Footer } });
  app.init(app);
}

beforeEach(() => {
  isFinePointer = true;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === SMOOTH_SCROLL_DEVICE_QUERY && isFinePointer }));
});

afterEach(() => {
  app.destroy();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.motion;
  document.documentElement.removeAttribute('data-footer-in-view');
});

describe('Footer with motion on', () => {
  it('holds the headline lines back until the footer arrives', () => {
    start(true);

    expect(getHeading().dataset.reveal).toBe('pending');
  });

  it('releases the headline once the stain is across and the headline is on screen', async () => {
    start(true);

    await scrollTo(PAGE_HEIGHT - VIEWPORT_HEIGHT * 2, VIEWPORT_HEIGHT * 0.3, VIEWPORT_HEIGHT * 0.5);

    expect(getHeading().dataset.reveal).toBeUndefined();
  });

  it('keeps the headline back while the stain is still sweeping in', async () => {
    start(true);

    await scrollTo(PAGE_HEIGHT - VIEWPORT_HEIGHT * 2, VIEWPORT_HEIGHT * 0.95, VIEWPORT_HEIGHT * 0.99);

    expect(getHeading().dataset.reveal).toBe('pending');
  });

  it('releases the headline on a touch screen as soon as it is on screen', async () => {
    isFinePointer = false;
    start(true);

    await scrollTo(PAGE_HEIGHT - VIEWPORT_HEIGHT * 2, VIEWPORT_HEIGHT * 0.95, VIEWPORT_HEIGHT * 0.99);

    expect(getHeading().dataset.reveal).toBeUndefined();
  });

  it.each([
    ['well before the end', PAGE_HEIGHT - VIEWPORT_HEIGHT - RANGE * 2, '0.000'],
    ['half way through its range', PAGE_HEIGHT - VIEWPORT_HEIGHT - RANGE / 2, '0.500'],
    ['at the page end', PAGE_HEIGHT - VIEWPORT_HEIGHT, '1.000'],
  ])('sets the word rise %s', async (_name, scrollY, expected) => {
    start(true);

    await scrollTo(scrollY, 0, 0);

    expect(getFooter().style.getPropertyValue('--footer-rise')).toBe(expected);
  });
});

describe('Footer with motion off', () => {
  it('leaves the headline and the word in place', async () => {
    start(false);

    await scrollTo(PAGE_HEIGHT - VIEWPORT_HEIGHT - RANGE / 2, 0, 0);

    expect(getHeading().dataset.reveal).toBeUndefined();
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

    await scrollTo(PAGE_HEIGHT - VIEWPORT_HEIGHT, 0, 0);
    expect(document.documentElement.hasAttribute('data-footer-in-view')).toBe(true);

    await scrollTo(0, PAGE_HEIGHT, PAGE_HEIGHT);
    expect(document.documentElement.hasAttribute('data-footer-in-view')).toBe(false);
  });
});
