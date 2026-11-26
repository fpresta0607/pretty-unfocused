// @vitest-environment happy-dom
import type { Timeline } from 'animejs';
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderAbout } from '../render/render-about.ts';
import type { Show } from '../show/show-types.ts';
import { SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { About, SCRIPT_WIPE_AT } from './about.ts';
import { REVEAL_FROM_SWEEP_PROGRESS } from './stain-edge.ts';

const timelines = vi.hoisted((): Timeline[] => []);

vi.mock('animejs', async (importOriginal) => {
  const anime = await importOriginal<typeof import('animejs')>();
  return {
    ...anime,
    createTimeline: (...parameters: Parameters<typeof anime.createTimeline>) => {
      const timeline = anime.createTimeline(...parameters).pause();
      timelines.push(timeline);
      return timeline;
    },
  };
});

const VIEWPORT_HEIGHT = 800;
const DESKTOP_WIDTH = 1024;
const SAMPLE_STEP_MS = 5;
const show: Show = {
  description: 'Hosted by two besties. Cozy chaos only.',
  episodes: [],
  clips: [],
};
let app: ModularApp;
let isFinePointer = true;
const fonts = new EventTarget();

function getGroup(name: string): HTMLElement {
  const group = document.querySelector<HTMLElement>(`[data-about-group="${name}"]`);
  if (group === null) {
    throw new Error(`The page has no ${name} group`);
  }
  return group;
}

function placeGroup(name: string, x: number, y: number): void {
  getGroup(name).getBoundingClientRect = () => new DOMRect(x, y, 100, 100);
}

async function scrollGroup(name: string, y: number): Promise<void> {
  placeGroup(name, 0, y);
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function readTranslateY(element: Element): number {
  const match = /translate(?:Y\(|\([^,]+,)(-?[\d.]+)/.exec(element instanceof HTMLElement ? element.style.transform : '');
  return match === null ? Number.NaN : Number(match[1]);
}

function playLatestTimeline(sample: (time: number) => void): void {
  const timeline = timelines.at(-1);
  if (timeline === undefined) {
    throw new Error('No reveal was started');
  }
  for (let time = 0; time < timeline.duration; time += SAMPLE_STEP_MS) {
    timeline.seek(time);
    sample(time);
  }
  timeline.seek(timeline.duration);
}

function mountAbout(): void {
  app = new ModularApp({ modules: { about: About } });
  app.init(app);
}

beforeEach(() => {
  timelines.length = 0;
  isFinePointer = true;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === SMOOTH_SCROLL_DEVICE_QUERY && isFinePointer }));
  Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
  window.innerHeight = VIEWPORT_HEIGHT;
  document.body.innerHTML = renderAbout(show);
  placeGroup('heading', 0, 1000);
  placeGroup('hosts', 0, 1000);
  placeGroup('copy', 0, 1200);
});

afterEach(() => {
  app.destroy();
  vi.unstubAllGlobals();
  window.innerWidth = DESKTOP_WIDTH;
  delete document.documentElement.dataset.motion;
  document.body.innerHTML = '';
});

describe('the about section arrival', () => {
  it('leaves everything in place when the page has no motion', () => {
    mountAbout();

    expect(document.querySelectorAll('[data-reveal]')).toHaveLength(0);
  });

  it('holds every group back until it scrolls into view', () => {
    document.documentElement.dataset.motion = 'on';

    mountAbout();

    expect(document.querySelectorAll('[data-reveal="pending"]')).toHaveLength(3);
  });

  it('plays a group as it enters the screen, and waits for the rest', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    await scrollGroup('hosts', 500);

    expect(getGroup('hosts').hasAttribute('data-reveal')).toBe(false);
    expect(getGroup('heading').dataset.reveal).toBe('pending');
    expect(getGroup('copy').dataset.reveal).toBe('pending');
  });

  it('plays each remaining group the moment its top crosses into view, and not before', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    await scrollGroup('copy', VIEWPORT_HEIGHT * 0.9);
    const isWaitingJustBelowTheLine = getGroup('copy').dataset.reveal === 'pending';
    await scrollGroup('copy', VIEWPORT_HEIGHT * 0.8);

    expect(isWaitingJustBelowTheLine).toBe(true);
    expect(getGroup('copy').hasAttribute('data-reveal')).toBe(false);
  });

  it('holds every group back, even one in full view, until the stain is most of the way across the screen, and plays it then, under the clip', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();
    const section = document.querySelector<HTMLElement>('#about');
    if (section === null) {
      throw new Error('The page has no about section');
    }

    section.getBoundingClientRect = () => new DOMRect(0, VIEWPORT_HEIGHT * (1 - 0.5 * (REVEAL_FROM_SWEEP_PROGRESS - 0.05)), 1000, 2000);
    await scrollGroup('hosts', 300);
    const isWaitingWhileTheStainSweeps = getGroup('hosts').dataset.reveal === 'pending';
    section.getBoundingClientRect = () => new DOMRect(0, VIEWPORT_HEIGHT * (1 - 0.5 * REVEAL_FROM_SWEEP_PROGRESS), 1000, 2000);
    await scrollGroup('hosts', 300);

    expect(isWaitingWhileTheStainSweeps).toBe(true);
    expect(getGroup('hosts').hasAttribute('data-reveal')).toBe(false);
  });

  function placeSectionBelowTheScreen(): void {
    const section = document.querySelector<HTMLElement>('#about');
    if (section === null) {
      throw new Error('The page has no about section');
    }
    section.getBoundingClientRect = () => new DOMRect(0, VIEWPORT_HEIGHT, 1000, 2000);
  }

  async function scrollHostsUntilDealt(): Promise<number> {
    for (let top = VIEWPORT_HEIGHT * 2; top > 0; top -= 40) {
      await scrollGroup('hosts', top);
      if (!getGroup('hosts').hasAttribute('data-reveal')) {
        return top;
      }
    }
    throw new Error('The cards were never dealt');
  }

  describe.each([
    ['a phone', 390],
    ['a tablet in portrait', 768],
    ['a tablet in landscape', 1024],
  ])('on a touch screen, %s', (_name, width) => {
    beforeEach(() => {
      isFinePointer = false;
      window.innerWidth = width;
      placeSectionBelowTheScreen();
      placeGroup('hosts', 0, VIEWPORT_HEIGHT * 2);
      document.documentElement.dataset.motion = 'on';
    });

    it('deals the cards before any of them can enter the screen, so none is ever seen before its deal', async () => {
      mountAbout();

      const topWhenDealt = await scrollHostsUntilDealt();

      expect(topWhenDealt).toBeGreaterThanOrEqual(VIEWPORT_HEIGHT);
    });

    it('deals the cards while the stain is still sweeping in, as they are below the screen then', async () => {
      mountAbout();

      await scrollGroup('hosts', VIEWPORT_HEIGHT * 1.2);

      expect(getGroup('hosts').hasAttribute('data-reveal')).toBe(false);
    });

    it('keeps the cards back until they are close to the screen', async () => {
      mountAbout();

      await scrollGroup('hosts', VIEWPORT_HEIGHT * 1.4);

      expect(getGroup('hosts').dataset.reveal).toBe('pending');
    });

    it('shows every card at its start pose from the start, so none is ever hidden while any part of it can be on the screen', () => {
      mountAbout();

      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-about="host"]'));
      expect(cards).toHaveLength(2);
      cards.forEach((card) => {
        expect(card.style.visibility).toBe('visible');
        expect(card.style.transform).toMatch(/rotate/);
      });
    });

    it('keeps the second card visible from the moment the deal starts, instead of hiding it through the pause after the first', async () => {
      mountAbout();

      await scrollGroup('hosts', VIEWPORT_HEIGHT * 1.2);

      const [first, second] = Array.from(document.querySelectorAll<HTMLElement>('[data-about="host"]'));
      expect(first?.style.visibility).toBe('visible');
      expect(second?.style.visibility).toBe('visible');
    });

    it('lets the headline finish before the copy starts, even when the copy is already in view', async () => {
      const section = document.querySelector<HTMLElement>('#about');
      if (section === null) {
        throw new Error('The page has no about section');
      }
      section.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 2000);
      mountAbout();

      await scrollGroup('heading', 300);
      await scrollGroup('copy', 300);
      const isCopyWaitingForTheHeadline = getGroup('copy').dataset.reveal === 'pending';
      playLatestTimeline(() => undefined);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await new Promise((resolve) => window.requestAnimationFrame(resolve));

      expect(isCopyWaitingForTheHeadline).toBe(true);
      expect(getGroup('copy').hasAttribute('data-reveal')).toBe(false);
    });

    it.each(['heading', 'copy'])('reveals the %s as soon as any part of it is on the screen, even while the stain is still sweeping in', async (name) => {
      mountAbout();
      if (name === 'copy') {
        await scrollGroup('heading', 300);
        playLatestTimeline(() => undefined);
      }

      await scrollGroup(name, VIEWPORT_HEIGHT * 1.05);
      const isWaitingBelowTheScreen = getGroup(name).dataset.reveal === 'pending';
      await scrollGroup(name, VIEWPORT_HEIGHT * 0.95);

      expect(isWaitingBelowTheScreen).toBe(true);
      expect(getGroup(name).hasAttribute('data-reveal')).toBe(false);
    });
  });

  it('starts the copy with the headline, not after it, on a screen with a mouse', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    await scrollGroup('heading', 300);
    await scrollGroup('copy', 300);

    expect(getGroup('copy').hasAttribute('data-reveal')).toBe(false);
  });

  it.each([
    ['a narrow screen', 599],
    ['a wide screen', DESKTOP_WIDTH],
  ])('keeps the cards on %s with a mouse back until they are in view, however close they are to the screen', async (_name, width) => {
    document.documentElement.dataset.motion = 'on';
    window.innerWidth = width;
    placeGroup('hosts', 0, VIEWPORT_HEIGHT * 2);
    mountAbout();

    await scrollGroup('hosts', VIEWPORT_HEIGHT * 1.2);
    const isWaitingBelowTheScreen = getGroup('hosts').dataset.reveal === 'pending';
    await scrollGroup('hosts', VIEWPORT_HEIGHT * 0.9);
    const isWaitingJustBelowTheLine = getGroup('hosts').dataset.reveal === 'pending';
    await scrollGroup('hosts', VIEWPORT_HEIGHT * 0.8);

    expect(isWaitingBelowTheScreen).toBe(true);
    expect(isWaitingJustBelowTheLine).toBe(true);
    expect(getGroup('hosts').hasAttribute('data-reveal')).toBe(false);
  });

  it('measures the groups in the frame after the scroll, once the stain has lifted them into view', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    placeGroup('hosts', 0, 1000);
    window.dispatchEvent(new Event('scroll'));
    window.requestAnimationFrame(() => placeGroup('hosts', 0, 300));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(getGroup('hosts').hasAttribute('data-reveal')).toBe(false);
  });

  it.each([
    ['the window is resized', window, 'resize'],
    ['the fonts finish loading', fonts, 'loadingdone'],
  ])('puts the description back as one settled block the moment %s mid-reveal', async (_name, target, eventName) => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();
    await scrollGroup('copy', 300);
    const description = document.querySelector<HTMLElement>('[data-about="description"]');
    const isSplitWhileRevealing = description?.querySelector('.text-line') !== null;

    target.dispatchEvent(new Event(eventName));

    expect(isSplitWhileRevealing).toBe(true);
    expect(description?.querySelector('.text-line')).toBeNull();
    expect(description?.textContent).toContain('Hosted by two besties.');
  });

  it('keeps the script word fully clipped, unmasked, until its handwriting wipe starts', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    await scrollGroup('heading', 300);

    const script = document.querySelector<HTMLElement>('[data-about="script"]');
    expect(script?.style.clipPath).toContain('100%');
    expect(script?.style.transform).toBe('');
    expect(script?.closest('.about-script-line')).not.toBeNull();
  });

  it('finishes the three headline lines in order, and starts the script wipe only once the lines are well under way', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();
    await scrollGroup('heading', 300);
    const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-about="line"]'));
    const script = document.querySelector<HTMLElement>('[data-about="script"]');
    const lineFinishTimes = lines.map(() => Number.POSITIVE_INFINITY);
    let scriptFinishTime = Number.POSITIVE_INFINITY;
    let scriptStartTime = Number.POSITIVE_INFINITY;

    playLatestTimeline((time) => {
      lines.forEach((line, index) => {
        if (readTranslateY(line) === 0) {
          lineFinishTimes[index] = Math.min(lineFinishTimes[index] ?? time, time);
        }
      });
      const clip = script?.style.clipPath ?? '';
      if (!clip.includes('100%')) {
        scriptStartTime = Math.min(scriptStartTime, time);
      }
      if (/inset\(\S+ 0%/.test(clip)) {
        scriptFinishTime = Math.min(scriptFinishTime, time);
      }
    });

    expect(lines.length).toBeGreaterThan(0);
    expect(lineFinishTimes).toEqual([...lineFinishTimes].sort((first, second) => first - second));
    expect(new Set(lineFinishTimes).size).toBe(lines.length);
    expect(scriptStartTime).toBeGreaterThanOrEqual(SCRIPT_WIPE_AT);
    expect(scriptFinishTime).toBeGreaterThan(Math.max(...lineFinishTimes));
    expect(scriptFinishTime).toBeLessThan(Number.POSITIVE_INFINITY);
    expect(script?.style.clipPath).toBe('');
  });

  it('deals the host cards with movement and rotation only, never fading them', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    await scrollGroup('hosts', 300);

    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-about="host"]'));
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card.style.opacity).toBe('');
      expect(card.style.transform).toMatch(/rotate/);
    });
  });

  it('keeps each card hidden until its own deal begins, so the second is dealt after the first', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();

    await scrollGroup('hosts', 300);

    const [, second] = Array.from(document.querySelectorAll<HTMLElement>('[data-about="host"]'));
    expect(second?.style.visibility).toBe('hidden');
  });

  it('overshoots each dealt card by a visible 8 to 12 px before it settles in place', async () => {
    document.documentElement.dataset.motion = 'on';
    mountAbout();
    await scrollGroup('hosts', 300);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-about="host"]'));
    const highestRises = cards.map(() => 0);

    playLatestTimeline(() => {
      cards.forEach((card, index) => {
        const translateY = readTranslateY(card);
        if (translateY < (highestRises[index] ?? 0)) {
          highestRises[index] = translateY;
        }
      });
    });

    expect(cards).toHaveLength(2);
    highestRises.forEach((rise) => {
      expect(-rise).toBeGreaterThanOrEqual(8);
      expect(-rise).toBeLessThanOrEqual(12);
    });
    cards.forEach((card) => expect(card.style.transform).toBe(''));
  });
});
