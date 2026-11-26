// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderArchive } from '../render/render-archive.ts';
import type { Episode, Show } from '../show/show-types.ts';
import { Archive } from './archive.ts';
import { SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';

vi.mock('animejs', async (importOriginal) => {
  const anime = await importOriginal<typeof import('animejs')>();
  return {
    ...anime,
    createTimeline: (...parameters: Parameters<typeof anime.createTimeline>) => anime.createTimeline(...parameters).pause(),
  };
});

const VIEWPORT_HEIGHT = 800;
const EPISODE_COUNT = 5;
let app: ModularApp;
let isFinePointer = true;

function makeEpisode(index: number): Episode {
  return {
    id: `episode-${index}`,
    title: `Episode ${index}`,
    publishedAt: '2026-10-01T12:00:00.000Z',
    description: `Description ${index}`,
    youtubeUrl: `https://www.youtube.com/watch?v=video${index}`,
    youtubeVideoId: `video${index}`,
    thumbnail: { src: 'https://i.ytimg.com/vi/video/hqdefault.jpg', width: 480, height: 360 },
  };
}

const show: Show = { description: '', episodes: Array.from({ length: EPISODE_COUNT }, (_, index) => makeEpisode(index)), clips: [] };

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

function getTrigger(index: number): HTMLElement {
  const trigger = document.querySelectorAll<HTMLElement>('[data-archive="trigger"]')[index];
  if (trigger === undefined) {
    throw new Error(`The page has no row ${index}`);
  }
  return trigger;
}

function getRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-archive="row"]'));
}

function readExpanded(): (string | null)[] {
  return Array.from(document.querySelectorAll('[data-archive="trigger"]'), (trigger) => trigger.getAttribute('aria-expanded'));
}

function placeRowsFrom(firstTop: number, step: number): void {
  getRows().forEach((row, index) => {
    row.getBoundingClientRect = () => new DOMRect(0, firstTop + index * step, 100, step);
  });
}

async function scrollPage(): Promise<void> {
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function mountArchive(): void {
  app = new ModularApp({ modules: { archive: Archive } });
  app.init(app);
}

beforeEach(() => {
  isFinePointer = true;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === SMOOTH_SCROLL_DEVICE_QUERY && isFinePointer }));
  window.innerHeight = VIEWPORT_HEIGHT;
  document.body.innerHTML = renderArchive(show);
  getElement('#every-episode').getBoundingClientRect = () => new DOMRect(0, 0, 1000, 2000);
  getElement('[data-heading-group]').getBoundingClientRect = () => new DOMRect(0, 100, 100, 100);
  placeRowsFrom(VIEWPORT_HEIGHT * 2, 80);
});

afterEach(() => {
  app.destroy();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
  document.body.innerHTML = '';
});

describe('the every-episode rows', () => {
  it('closes every row once the script runs, and marks the list ready', () => {
    expect(readExpanded()).toEqual(Array(EPISODE_COUNT).fill('true'));

    mountArchive();

    expect(readExpanded()).toEqual(Array(EPISODE_COUNT).fill('false'));
    expect(getElement('#every-episode').hasAttribute('data-archive-ready')).toBe(true);
  });

  it('opens a row on a click and closes it on the next, with aria-expanded following', () => {
    mountArchive();

    getTrigger(1).click();
    expect(getTrigger(1).getAttribute('aria-expanded')).toBe('true');

    getTrigger(1).click();
    expect(getTrigger(1).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a row from a click on the words inside its button', () => {
    mountArchive();

    getElement<HTMLElement>('.archive-title').click();

    expect(getTrigger(0).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps several rows open at once and leaves the others closed', () => {
    mountArchive();

    getTrigger(0).click();
    getTrigger(2).click();
    getTrigger(4).click();

    expect(readExpanded()).toEqual(['true', 'false', 'true', 'false', 'true']);
  });

  it('keeps each panel attached to the button that controls it', () => {
    mountArchive();

    getTrigger(2).click();

    const panelId = getTrigger(2).getAttribute('aria-controls') ?? '';
    expect(document.getElementById(panelId)?.contains(getElement('[href="https://www.youtube.com/watch?v=video2"]'))).toBe(true);
  });

  it('stops listening for clicks once destroyed', () => {
    mountArchive();
    app.destroy();

    getTrigger(0).click();

    expect(getTrigger(0).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('the every-episode arrival', () => {
  it('leaves the headline and every row in place when the page has no motion', () => {
    mountArchive();

    expect(document.querySelectorAll('[data-reveal]')).toHaveLength(0);
  });

  describe('with motion', () => {
    beforeEach(() => {
      document.documentElement.dataset.motion = 'on';
    });

    it('holds the rows below the fold back, and the headline already in view too until the stain has crossed', () => {
      getElement('#every-episode').getBoundingClientRect = () => new DOMRect(0, VIEWPORT_HEIGHT * 0.9, 1000, 2000);

      mountArchive();

      expect(document.querySelectorAll('[data-reveal="pending"]')).toHaveLength(EPISODE_COUNT + 1);
    });

    it('lets the rows in view rise and keeps the ones below the line waiting', async () => {
      mountArchive();
      placeRowsFrom(VIEWPORT_HEIGHT * 0.5, 100);

      await scrollPage();

      expect(getRows().map((row) => !row.hasAttribute('data-reveal'))).toEqual([true, true, true, true, false]);
    });

    it('staggers the rows that rise together by their place in the batch', async () => {
      mountArchive();
      placeRowsFrom(100, 80);

      await scrollPage();

      expect(getRows().map((row) => row.style.getPropertyValue('--stagger'))).toEqual(['0', '1', '2', '3', '4']);
    });

    it('caps the stagger so a long list never waits long for its last rows', async () => {
      document.body.innerHTML = renderArchive({ ...show, episodes: Array.from({ length: 12 }, (_, index) => makeEpisode(index)) });
      getElement('#every-episode').getBoundingClientRect = () => new DOMRect(0, 0, 1000, 2000);
      getElement('[data-heading-group]').getBoundingClientRect = () => new DOMRect(0, 100, 100, 100);
      mountArchive();
      placeRowsFrom(0, 10);

      await scrollPage();

      expect(getRows().at(-1)?.style.getPropertyValue('--stagger')).toBe('6');
    });

    it('rises a row as it crosses into view when the page scrolls', async () => {
      mountArchive();
      placeRowsFrom(VIEWPORT_HEIGHT * 1.2, 80);
      await scrollPage();
      const isWaiting = getRows()[0]?.dataset.reveal === 'pending';

      placeRowsFrom(VIEWPORT_HEIGHT * 0.8, 80);
      await scrollPage();

      expect(isWaiting).toBe(true);
      expect(getRows()[0]?.hasAttribute('data-reveal')).toBe(false);
    });

    it('plays the headline once it is in view and the stain is across', () => {
      mountArchive();

      expect(getElement('[data-heading-group]').hasAttribute('data-reveal')).toBe(false);
    });

    it('stops watching the page once everything has played', () => {
      const removeListener = vi.spyOn(window, 'removeEventListener');
      placeRowsFrom(100, 80);

      mountArchive();

      expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
      removeListener.mockRestore();
    });
  });
});
