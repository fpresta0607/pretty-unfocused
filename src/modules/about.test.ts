// @vitest-environment happy-dom
import type { Timeline } from 'animejs';
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderAbout } from '../render/render-about.ts';
import type { Show } from '../show/show-types.ts';
import {
  About,
  REVEAL_FROM_SWEEP_PROGRESS,
  SCRIPT_WIPE_AT,
} from './about.ts';

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
const SAMPLE_STEP_MS = 5;
const show: Show = {
  description: 'Hosted by two besties. Cozy chaos only.',
  episodes: [],
  clips: [],
};
let app: ModularApp;
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
  Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
  window.innerHeight = VIEWPORT_HEIGHT;
  document.body.innerHTML = renderAbout(show);
  placeGroup('heading', 0, 1000);
  placeGroup('hosts', 0, 1000);
  placeGroup('copy', 0, 1200);
});

afterEach(() => {
  app.destroy();
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
