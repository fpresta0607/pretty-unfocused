// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SECTION_REACH_SCALE } from './stain-edge.ts';
import { Stain } from './stain.ts';

const VIEWPORT = { width: 1000, height: 800 };
let app: ModularApp;

function getElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

let landingOffset = 300;
let sectionTop = VIEWPORT.height;
let smallViewportHeight = VIEWPORT.height;
let isFinePointer = true;

function readLift(): number {
  return parseFloat(getElement('#about').style.getPropertyValue('--stain-lift') || '0');
}

function placeSectionTop(top: number): void {
  sectionTop = top;
  getElement('#about').getBoundingClientRect = () => new DOMRect(0, top, VIEWPORT.width, 2000);
}

async function scrollTo(top: number): Promise<void> {
  placeSectionTop(top);
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function resizeTo(innerHeight: number): Promise<void> {
  window.innerHeight = innerHeight;
  window.dispatchEvent(new Event('resize'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function walkDownThePage(step: number): Promise<{ lifts: number[]; positions: number[] }> {
  const tops = Array.from({ length: Math.round((VIEWPORT.height * 1.1) / step) + 1 }, (_, index) => VIEWPORT.height - index * step);
  const lifts: number[] = [];
  const positions: number[] = [];
  for (const top of tops) {
    await scrollTo(top);
    lifts.push(readLift());
    positions.push(getElement('[data-stain-landing]').getBoundingClientRect().top);
  }
  return { lifts, positions };
}

function readCurveHeights(): number[] {
  const path = readPath('wide') ?? '';
  const curve = path.slice(0, path.indexOf('L'));
  return (curve.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, index) => index % 2 === 1);
}

function readLowestPoint(): number {
  return Math.max(...readCurveHeights());
}

function readCrestHeight(): number {
  const heights = readCurveHeights();
  return Math.max(...heights) - Math.min(...heights);
}

function mountStain(): void {
  app = new ModularApp({ modules: { stain: Stain } });
  app.init(app);
}

function readPath(set: string): string | null {
  return getElement(`[data-stain-set="${set}"] .stain-edge-fill`).getAttribute('d');
}

beforeEach(() => {
  window.innerWidth = VIEWPORT.width;
  window.innerHeight = VIEWPORT.height;
  smallViewportHeight = VIEWPORT.height;
  isFinePointer = true;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query === '(hover: hover) and (pointer: fine)' && isFinePointer;
    },
  }));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 0, smallViewportHeight));
  document.body.innerHTML = `<section id="about" data-module-stain>
    <h2 data-stain-landing>Cozy chaos only.</h2>
    <svg data-stain-set="wide"><path class="stain-edge-rim"/><path class="stain-edge-fill"/></svg>
    <svg data-stain-set="narrow"><path class="stain-edge-rim"/><path class="stain-edge-fill"/></svg>
  </section>`;
  landingOffset = 300;
  placeSectionTop(VIEWPORT.height);
  getElement('[data-stain-landing]').getBoundingClientRect = () =>
    new DOMRect(0, sectionTop + landingOffset - readLift(), 100, 100);
  getElement('[data-stain-set="wide"]').getBoundingClientRect = () => new DOMRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  getElement('[data-stain-set="narrow"]').getBoundingClientRect = () => new DOMRect(0, 0, 400, VIEWPORT.height);
});

afterEach(() => {
  app.destroy();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
  document.body.innerHTML = '';
});

describe('the stain edge', () => {
  it('leaves the drawn edge untouched when the page has no motion', async () => {
    mountStain();

    await scrollTo(VIEWPORT.height / 2);

    expect(readPath('wide')).toBeNull();
  });

  it('swaps the reference to the shared settled outline for a path of its own before it reshapes the edge', () => {
    document.documentElement.dataset.motion = 'on';
    document.querySelector('[data-stain-set="wide"]')?.replaceChildren(
      ...['rim', 'fill'].map((part) => {
        const reference = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        reference.setAttribute('class', `stain-edge-${part}`);
        reference.setAttribute('href', `#stain-edge-${part}-wide`);
        return reference;
      }),
    );

    mountStain();

    const parts = Array.from(document.querySelectorAll('[data-stain-set="wide"] > *'));
    expect(parts.map((part) => part.tagName.toLowerCase())).toEqual(['path', 'path']);
    expect(parts.map((part) => part.getAttribute('class'))).toEqual(['stain-edge-rim', 'stain-edge-fill']);
    expect(readPath('wide')).toMatch(/^M-100\.0.*Z$/);
  });

  it('draws one closed cream shape as soon as it starts, sized to the pixels it covers', () => {
    document.documentElement.dataset.motion = 'on';

    mountStain();

    expect(readPath('wide')).toMatch(/^M-100\.0.*Z$/);
    expect(getElement('[data-stain-set="wide"]').getAttribute('viewBox')).toBe(`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`);
  });

  it('redraws the edge on every scroll step while it grows', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.9);
    const earlier = readPath('wide');
    await scrollTo(VIEWPORT.height * 0.7);

    expect(readPath('wide')).not.toBe(earlier);
  });

  it('reverses step for step when scrolling back up', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height * 0.9);
    const before = readPath('wide');

    await scrollTo(VIEWPORT.height * 0.75);
    await scrollTo(VIEWPORT.height * 0.9);

    expect(readPath('wide')).toBe(before);
  });

  it('stops changing once the sweep has covered the screen', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height * 0.4);
    const covered = readPath('wide');

    await scrollTo(0);

    expect(readPath('wide')).toBe(covered);
  });

  it('grows the lift with the sweep, from nothing at the bottom of the screen to its full amount where the sweep ends', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const tops = [VIEWPORT.height, VIEWPORT.height * 0.8, VIEWPORT.height * 0.6, VIEWPORT.height * 0.5];
    const lifts = await tops.reduce<Promise<number[]>>(async (done, top) => {
      const earlier = await done;
      await scrollTo(top);
      return [...earlier, readLift()];
    }, Promise.resolve([]));

    expect(lifts[0]).toBe(0);
    expect(lifts[1]).toBeGreaterThan(0);
    expect(lifts[2]).toBeGreaterThan(lifts[1] ?? Number.POSITIVE_INFINITY);
    expect(lifts[3]).toBeGreaterThan(lifts[2] ?? Number.POSITIVE_INFINITY);
  });

  it('lifts the content less and less as the section rises, easing to nothing at the top of the screen', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const lifts = await [VIEWPORT.height / 2, VIEWPORT.height / 4, 0, -300].reduce<Promise<number[]>>(async (done, top) => {
      const earlier = await done;
      await scrollTo(top);
      return [...earlier, readLift()];
    }, Promise.resolve([]));

    expect(lifts[1]).toBeGreaterThan(0);
    expect(lifts[1]).toBeLessThan(lifts[0] ?? 0);
    expect(lifts[2]).toBe(0);
    expect(lifts[3]).toBe(0);
  });

  it('changes the lift smoothly over the whole hand-over, with no corner at the end of the sweep or at the top of the screen', async () => {
    landingOffset = 100;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const step = 8;
    const { lifts } = await walkDownThePage(step);
    const slopes = lifts.slice(1).map((lift, index) => ((lifts[index] ?? 0) - lift) / step);
    const slopeChanges = slopes.slice(1).map((slope, index) => Math.abs(slope - (slopes[index] ?? 0)));

    expect(Math.max(...lifts)).toBeGreaterThan(100);
    expect(Math.max(...slopeChanges)).toBeLessThan(0.1);
  });

  it.each([
    ['content that is lifted to the landing line', -100],
    ['content that is held back by the limit', 100],
    ['content that sits far below the landing line', 500],
  ])('moves %s at between half and one and four fifths of the scroll speed, never stalling and never rushing', async (_name, offset) => {
    landingOffset = offset;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const step = 8;
    const { positions } = await walkDownThePage(step);
    const speeds = positions.slice(1).map((position, index) => ((positions[index] ?? 0) - position) / step);

    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(0.45);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(1.8);
  });

  it.each([
    ['sits near enough to the landing line to be lifted to it', -100, VIEWPORT.height * 0.25],
    ['sits too far below the landing line to reach it, so it is lifted as far as the limit allows', 300, VIEWPORT.height * 0.685],
  ])('puts the highest content, when it %s, where it belongs when the sweep ends', async (_name, offset, expectedTop) => {
    landingOffset = offset;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.9);
    await scrollTo(VIEWPORT.height / 2);

    expect(getElement('[data-stain-landing]').getBoundingClientRect().top).toBeCloseTo(expectedTop, 0);
  });

  it.each([
    ['content that is lifted to the landing line', 100],
    ['content that sits near the landing line already', 190],
    ['content that sits far below it', 500],
  ])('keeps %s moving up the screen on every step of the page scrolling down, never down and never still', async (_name, offset) => {
    landingOffset = offset;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const tops = Array.from({ length: 31 }, (_, index) => VIEWPORT.height * 1.1 - index * 40);
    const positions = await tops.reduce<Promise<number[]>>(async (done, top) => {
      const earlier = await done;
      await scrollTo(top);
      return [...earlier, getElement('[data-stain-landing]').getBoundingClientRect().top];
    }, Promise.resolve([]));

    positions.slice(1).forEach((position, index) => {
      expect(position).toBeLessThan((positions[index] ?? Number.NEGATIVE_INFINITY) - 1);
    });
  });

  it('shows the highest of the landing elements at the landing line, not only the headline', async () => {
    const hosts = document.createElement('ul');
    hosts.setAttribute('data-stain-landing', '');
    getElement('#about').append(hosts);
    hosts.getBoundingClientRect = () => new DOMRect(0, sectionTop - 100 - readLift(), 100, 100);
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.9);
    await scrollTo(VIEWPORT.height / 2);

    expect(hosts.getBoundingClientRect().top).toBeCloseTo(VIEWPORT.height * 0.25, 0);
  });

  it('leaves the hero pieces alone while the edge passes over them, so the stain simply covers them', async () => {
    const sticker = document.createElement('span');
    sticker.setAttribute('data-hero', 'sticker');
    document.body.append(sticker);
    sticker.getBoundingClientRect = () => new DOMRect(700, 500, 100, 40);
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.6);

    expect(sticker.attributes).toHaveLength(1);
    expect(sticker.getAttribute('style')).toBeNull();
  });

  it('clips the whole section to the cream shape while the sweep runs, and stops clipping once it has finished', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.75);
    const whileSweeping = getElement('#about').style.getPropertyValue('clip-path');
    await scrollTo(VIEWPORT.height / 2);

    expect(whileSweeping).toMatch(/^path\('M-100\.0.*Z'\)$/);
    expect(getElement('#about').style.getPropertyValue('clip-path')).toBe('');
  });

  it('draws the clip from the baseline of the section down to its bottom', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.75);

    expect(getElement('#about').style.getPropertyValue('clip-path')).toContain('2000.0');
  });

  it('leaves the section unclipped and the content where it is when the page has no motion', async () => {
    mountStain();

    await scrollTo(VIEWPORT.height * 0.75);

    expect(getElement('#about').style.getPropertyValue('clip-path')).toBe('');
    expect(getElement('#about').style.getPropertyValue('--stain-lift')).toBe('');
  });

  it('keeps the content where it belongs on a touch screen, so nothing shakes against the browser own scroll', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height * 0.7);
    const liftWithTrackpad = readLift();

    isFinePointer = false;
    const tops = [VIEWPORT.height * 0.9, VIEWPORT.height * 0.7, VIEWPORT.height / 2, VIEWPORT.height / 4];
    const lifts = await tops.reduce<Promise<number[]>>(async (done, top) => {
      const earlier = await done;
      await scrollTo(top);
      return [...earlier, readLift()];
    }, Promise.resolve([]));

    expect(liftWithTrackpad).toBeGreaterThan(0);
    expect(lifts).toEqual([0, 0, 0, 0]);
  });

  it('never clips the section on a touch screen, where the drawn edge alone shows the sweep', async () => {
    isFinePointer = false;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const tops = [VIEWPORT.height * 0.95, VIEWPORT.height * 0.75, VIEWPORT.height * 0.6, VIEWPORT.height / 2, 0];
    const clips = await tops.reduce<Promise<string[]>>(async (done, top) => {
      const earlier = await done;
      await scrollTo(top);
      return [...earlier, getElement('#about').style.getPropertyValue('clip-path')];
    }, Promise.resolve([]));

    expect(clips).toEqual(['', '', '', '', '']);
  });

  it('removes a clip left on the section when the screen turns out to be a touch screen', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height * 0.75);

    isFinePointer = false;
    await scrollTo(VIEWPORT.height * 0.7);

    expect(getElement('#about').style.getPropertyValue('clip-path')).toBe('');
  });

  it('still draws the sweep and marks it done on a touch screen', async () => {
    isFinePointer = false;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.9);
    const earlier = readPath('wide');
    await scrollTo(VIEWPORT.height * 0.7);
    const isSweptMidSweep = getElement('#about').hasAttribute('data-stain-swept');
    const later = readPath('wide');
    await scrollTo(VIEWPORT.height * 0.5 * SECTION_REACH_SCALE);

    expect(earlier).toMatch(/^M-100\.0.*Z$/);
    expect(later).toMatch(/^M-100\.0.*Z$/);
    expect(later).not.toBe(earlier);
    expect(isSweptMidSweep).toBe(false);
    expect(getElement('#about').hasAttribute('data-stain-swept')).toBe(true);
  });

  it('draws a touch screen wave low, where the wave of a mouse screen would already cover the screen above the section', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height / 2);
    const lowestPointOfTheWideWave = readLowestPoint();

    isFinePointer = false;
    await scrollTo(VIEWPORT.height / 2 + 1);
    await scrollTo(VIEWPORT.height / 2);

    expect(lowestPointOfTheWideWave).toBeLessThanOrEqual(VIEWPORT.height / 2);
    expect(getElement('#about').hasAttribute('data-stain-swept')).toBe(false);
    expect(readLowestPoint()).toBeGreaterThan(VIEWPORT.height / 2);
  });

  it('lets a touch screen wave swell as tall as the wave of a mouse screen at the same point of its sweep', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    const sweepEndTop = VIEWPORT.height * 0.5 * SECTION_REACH_SCALE;
    const progresses = [0.2, 0.4, 0.6];
    const mouseCrests: number[] = [];
    for (const progress of progresses) {
      await scrollTo(VIEWPORT.height * (1 - 0.5 * progress));
      mouseCrests.push(readCrestHeight());
    }

    isFinePointer = false;
    const touchCrests: number[] = [];
    for (const progress of progresses) {
      await scrollTo(VIEWPORT.height - progress * (VIEWPORT.height - sweepEndTop));
      touchCrests.push(readCrestHeight());
    }

    touchCrests.forEach((touchCrest, index) => {
      expect(touchCrest).toBeGreaterThanOrEqual((mouseCrests[index] ?? Number.NaN) * 0.75);
    });
  });

  it('marks a touch screen section as swept only once the wave drawn at the small viewport covers the screen above it', async () => {
    isFinePointer = false;
    document.documentElement.dataset.motion = 'on';
    mountStain();

    const tops = Array.from({ length: 81 }, (_, index) => VIEWPORT.height - index * 10);
    const states: { top: number; isSwept: boolean; lowestPoint: number }[] = [];
    for (const top of tops) {
      await scrollTo(top);
      states.push({ top, isSwept: getElement('#about').hasAttribute('data-stain-swept'), lowestPoint: readLowestPoint() });
    }

    expect(states.some(({ isSwept }) => isSwept)).toBe(true);
    states.filter(({ isSwept }) => isSwept).forEach(({ top, lowestPoint }) => {
      expect(lowestPoint).toBeLessThanOrEqual(VIEWPORT.height - top);
    });
  });

  it('reads the swept mark at the small viewport on a touch screen, not at the height the browser reports while its toolbar moves', async () => {
    isFinePointer = false;
    document.documentElement.dataset.motion = 'on';
    mountStain();
    window.innerHeight = VIEWPORT.height + 120;

    await scrollTo(VIEWPORT.height * 0.5 * SECTION_REACH_SCALE + 1);

    expect(getElement('#about').hasAttribute('data-stain-swept')).toBe(false);
  });

  it('lifts the content on a mouse or trackpad screen, where the page scrolls from the same script', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(VIEWPORT.height * 0.7);

    expect(readLift()).toBeGreaterThan(0);
  });

  it('draws the sweep to the small viewport, not to the height the browser reports while its toolbar moves', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height * 0.75);
    const beforeToolbar = readPath('wide');
    const liftBeforeToolbar = readLift();

    await resizeTo(VIEWPORT.height + 80);

    expect(readPath('wide')).toBe(beforeToolbar);
    expect(readLift()).toBe(liftBeforeToolbar);
  });

  it('measures the small viewport again when the screen is resized or turned', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(VIEWPORT.height * 0.75);
    const earlier = readPath('wide');

    smallViewportHeight = VIEWPORT.height - 200;
    await resizeTo(VIEWPORT.height - 200);

    expect(readPath('wide')).not.toBe(earlier);
  });

  it('draws the set that matches the screen, wide or narrow', () => {
    document.documentElement.dataset.motion = 'on';
    window.innerWidth = 400;

    mountStain();

    expect(readPath('narrow')).toMatch(/^M-40\.0/);
    expect(readPath('wide')).toBeNull();
  });

  it.each([
    { top: VIEWPORT.height * 0.9, isSwept: false },
    { top: VIEWPORT.height * 0.5 + 1, isSwept: false },
    { top: VIEWPORT.height * 0.5, isSwept: true },
    { top: 0, isSwept: true },
    { top: -1999, isSwept: true },
    { top: -2000, isSwept: false },
  ])('marks the section as swept only while its sweep is done and it is still on screen (top $top)', async ({ top, isSwept }) => {
    document.documentElement.dataset.motion = 'on';
    mountStain();

    await scrollTo(top);

    expect(getElement('#about').hasAttribute('data-stain-swept')).toBe(isSwept);
  });

  it('drops the swept mark when scrolling back above the sweep', async () => {
    document.documentElement.dataset.motion = 'on';
    mountStain();
    await scrollTo(0);

    await scrollTo(VIEWPORT.height * 0.8);

    expect(getElement('#about').hasAttribute('data-stain-swept')).toBe(false);
  });

  it('never marks the section when the page has no motion', async () => {
    mountStain();

    await scrollTo(0);

    expect(getElement('#about').hasAttribute('data-stain-swept')).toBe(false);
  });
});
