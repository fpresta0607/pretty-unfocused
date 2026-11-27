// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderClips } from '../render/render-clips.ts';
import type { Clip, Show } from '../show/show-types.ts';
import { Clips } from './clips.ts';
import { cardDeal, dealRanks } from './clips-logic.ts';
import { SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { EPISODES_REVEAL_FROM_SWEEP_PROGRESS } from './stain-edge.ts';

vi.mock('animejs', async (importOriginal) => {
  const anime = await importOriginal<typeof import('animejs')>();
  return {
    ...anime,
    createTimeline: (...parameters: Parameters<typeof anime.createTimeline>) => anime.createTimeline(...parameters).pause(),
  };
});

const VIEWPORT_HEIGHT = 800;
const CLIP_COUNT = 6;
const FAN_OFFSET = 100;
const DEAL_SPAN_FRACTION = 0.45;
let app: ModularApp;
let isFinePointer = true;
let sectionTop = VIEWPORT_HEIGHT;

function makeClip(index: number): Clip {
  return {
    id: `clip-${index}`,
    title: `Clip ${index}`,
    publishedAt: '2026-11-01T12:00:00.000Z',
    youtubeUrl: `https://www.youtube.com/shorts/short${index}`,
    youtubeVideoId: `short${index}`,
    thumbnail: { src: `https://i.ytimg.com/vi/short${index}/hqdefault.jpg`, width: 480, height: 360 },
  };
}

const show: Show = { description: '', episodes: [], clips: Array.from({ length: CLIP_COUNT }, (_, index) => makeClip(index)) };

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

function readStainLift(): number {
  return Number.parseFloat(getElement<HTMLElement>('#clips').style.getPropertyValue('--stain-lift')) || 0;
}

function readDeals(): number[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-clips="card"]'), (card) => Number(card.style.getPropertyValue('--deal')));
}

function expectedDeals(progress: number): number[] {
  const ranks = dealRanks([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]);
  return ranks.map((rank) => Number(cardDeal(progress, rank, CLIP_COUNT).toFixed(4)));
}

async function scrollSectionTo(top: number, headingTop = top): Promise<void> {
  sectionTop = top;
  getElement('[data-heading-group]').getBoundingClientRect = () => new DOMRect(0, headingTop, 100, 100);
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function scrollFanTo(fanTop: number): Promise<void> {
  await scrollSectionTo(fanTop - FAN_OFFSET);
}

function mountClips(): void {
  app = new ModularApp({ modules: { clips: Clips } });
  app.init(app);
}

beforeEach(() => {
  isFinePointer = true;
  sectionTop = VIEWPORT_HEIGHT;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === SMOOTH_SCROLL_DEVICE_QUERY && isFinePointer }));
  window.innerHeight = VIEWPORT_HEIGHT;
  document.body.innerHTML = renderClips(show);
  getElement('#clips').getBoundingClientRect = () => new DOMRect(0, sectionTop, 1000, 2000);
  getElement('[data-clips="fan"]').getBoundingClientRect = () => new DOMRect(0, sectionTop + FAN_OFFSET - readStainLift(), 1000, 600);
  getElement('[data-heading-group]').getBoundingClientRect = () => new DOMRect(0, VIEWPORT_HEIGHT * 2, 100, 100);
});

afterEach(() => {
  app.destroy();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
  document.body.innerHTML = '';
});

describe('the clips fan without motion', () => {
  it('leaves every card dealt and the headline in place, writing nothing to the cards', () => {
    mountClips();

    expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(0));
    expect(document.querySelectorAll('[data-reveal]')).toHaveLength(0);
    expect(getElement<HTMLElement>('[data-clips="card"]').getAttribute('style')).not.toContain('--deal');
  });
});

describe('the clips fan with motion', () => {
  beforeEach(() => {
    document.documentElement.dataset.motion = 'on';
  });

  it('has dealt every card by the time the section reaches the top of the screen, even with the row low in the section', async () => {
    mountClips();
    getElement('[data-clips="fan"]').getBoundingClientRect = () => new DOMRect(0, VIEWPORT_HEIGHT * 0.9, 1000, 600);

    await scrollSectionTo(0);

    expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(1));
  });

  describe('while the section is pinned', () => {
    beforeEach(() => {
      getElement<HTMLElement>('.clips-inner').style.position = 'sticky';
    });

    it('deals a swipe row fully by the time the section reaches the top, rather than over the pinned scroll', async () => {
      getElement<HTMLElement>('[data-clips="fan"]').style.overflowX = 'auto';
      mountClips();

      await scrollSectionTo(0);

      expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(1));
    });

    it('keeps the cards stacked until the section has arrived at the top of the screen', async () => {
      mountClips();

      await scrollSectionTo(VIEWPORT_HEIGHT * 0.1);

      expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(0));
    });

    it('deals the cards one by one over the pinned scroll that follows', async () => {
      mountClips();

      await scrollSectionTo(-VIEWPORT_HEIGHT * 0.15);
      const dealtAtQuarter = readDeals();
      await scrollSectionTo(-VIEWPORT_HEIGHT * 0.3);
      const dealtAtHalf = readDeals();
      await scrollSectionTo(-VIEWPORT_HEIGHT * 0.6);

      expect(dealtAtQuarter).toEqual(expectedDeals(0.25));
      expect(dealtAtHalf).toEqual(expectedDeals(0.5));
      expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(1));
    });
  });

  it('keeps the cards stacked in the middle while the fan is still below the bottom of the screen', () => {
    mountClips();

    expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(0));
  });

  it('deals every card out to its place once the fan has scrolled well into the screen', async () => {
    mountClips();

    await scrollFanTo(VIEWPORT_HEIGHT * 0.5);

    expect(readDeals()).toEqual(Array(CLIP_COUNT).fill(1));
  });

  it.each([0.1, 0.25, 0.5, 0.75])('follows the scroll position, so scroll progress %j puts every card exactly where the curve says', async (progress) => {
    mountClips();

    await scrollFanTo(VIEWPORT_HEIGHT * (1 - DEAL_SPAN_FRACTION * progress));

    expect(readDeals()).toEqual(expectedDeals(progress));
  });

  it('deals by where the fan would sit without the stain lift, so the lift does not rush the deal', async () => {
    mountClips();
    getElement<HTMLElement>('#clips').style.setProperty('--stain-lift', '300px');

    await scrollFanTo(VIEWPORT_HEIGHT * (1 - DEAL_SPAN_FRACTION * 0.5));

    expect(readDeals()).toEqual(expectedDeals(0.5));
  });

  it('deals half way for half a scroll step, and back again when the page scrolls up', async () => {
    mountClips();
    await scrollFanTo(VIEWPORT_HEIGHT * 0.85);
    const halfWay = readDeals();

    await scrollFanTo(VIEWPORT_HEIGHT * 0.5);
    const dealt = readDeals();
    await scrollFanTo(VIEWPORT_HEIGHT * 0.85);
    const afterScrollingBack = readDeals();

    expect(halfWay.some((deal) => deal > 0 && deal < 1)).toBe(true);
    expect(dealt).toEqual(Array(CLIP_COUNT).fill(1));
    expect(afterScrollingBack).toEqual(halfWay);
  });

  it('deals the middle cards before the outer ones', async () => {
    mountClips();

    await scrollFanTo(VIEWPORT_HEIGHT * 0.88);

    const [leftmost, , middleLeft, middleRight, , rightmost] = readDeals();
    expect(middleLeft).toBeGreaterThan(leftmost ?? 0);
    expect(middleRight).toBeGreaterThan(rightmost ?? 0);
  });

  it('holds the headline back until it is in view and the stain is most of the way across', async () => {
    mountClips();
    const heading = getElement<HTMLElement>('[data-heading-group]');
    const sectionAtEarlyStain = VIEWPORT_HEIGHT * (1 - 0.5 * (EPISODES_REVEAL_FROM_SWEEP_PROGRESS - 0.05));
    const sectionAtStainAcross = VIEWPORT_HEIGHT * (1 - 0.5 * EPISODES_REVEAL_FROM_SWEEP_PROGRESS);
    const isHeldBackAtFirst = heading.dataset.reveal === 'pending';

    await scrollSectionTo(sectionAtEarlyStain, 300);
    const isHeldWhileTheStainSweeps = heading.dataset.reveal === 'pending';
    await scrollSectionTo(sectionAtStainAcross, 300);

    expect(isHeldBackAtFirst).toBe(true);
    expect(isHeldWhileTheStainSweeps).toBe(true);
    expect(heading.hasAttribute('data-reveal')).toBe(false);
  });

  it('plays the headline as soon as it is in view on a touch screen, with no stain to wait for', async () => {
    isFinePointer = false;
    mountClips();

    await scrollSectionTo(VIEWPORT_HEIGHT, VIEWPORT_HEIGHT * 0.9);

    expect(getElement('[data-heading-group]').hasAttribute('data-reveal')).toBe(false);
  });
});

describe('the clips progress dashes', () => {
  function scrollFanSideways(scrollLeft: number): void {
    const fan = getElement<HTMLElement>('[data-clips="fan"]');
    Object.defineProperty(fan, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(fan, 'clientWidth', { value: 500, configurable: true });
    fan.scrollLeft = scrollLeft;
    fan.dispatchEvent(new Event('scroll'));
  }

  function activeDashIndex(): number {
    return Array.from(document.querySelectorAll('[data-clips="dash"]')).findIndex((dash) => dash.hasAttribute('data-active'));
  }

  it('lights the dash for the card the row has scrolled to, even without motion', () => {
    mountClips();
    const atStart = activeDashIndex();

    scrollFanSideways(250);
    const atMiddle = activeDashIndex();
    scrollFanSideways(500);

    expect(atStart).toBe(0);
    expect(atMiddle).toBe(3);
    expect(activeDashIndex()).toBe(CLIP_COUNT - 1);
  });
});
