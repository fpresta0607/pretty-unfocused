// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFrame } from '../render/render-frame.ts';
import type { Show } from '../show/show-types.ts';
import { Frame } from './frame.ts';

const VIEWPORT_HEIGHT = 800;
const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
];

const show: Show = {
  description: '',
  episodes: [
    {
      id: 'latest',
      title: 'Latest talk',
      publishedAt: '2026-11-23T08:00:00.000Z',
      description: '',
      youtubeUrl: 'https://www.youtube.com/watch?v=latest',
      thumbnail: { src: 'https://example.com/latest.jpg', width: 640, height: 360 },
    },
  ],
  clips: [],
};
let app: ModularApp;
let heroObserverCallback: IntersectionObserverCallback | undefined;
let observedElements: Element[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    heroObserverCallback = callback;
  }

  observe(element: Element): void {
    observedElements.push(element);
  }

  disconnect(): void {
    observedElements = [];
  }
}

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

function placeSection(id: string, top: number, bottom: number): void {
  getElement(`#${id}`).getBoundingClientRect = () => new DOMRect(0, top, 1200, bottom - top);
}

function reportHeroVisibleRatio(intersectionRatio: number): void {
  const [hero] = observedElements;
  if (heroObserverCallback === undefined || hero === undefined) {
    throw new Error('The frame is not observing a first section');
  }
  const entry = { target: hero, intersectionRatio, isIntersecting: intersectionRatio > 0 };
  heroObserverCallback([entry as IntersectionObserverEntry], {} as IntersectionObserver);
}

async function scrollTo(placeSections: () => void): Promise<void> {
  placeSections();
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function mountFrame(): void {
  app = new ModularApp({ modules: { frame: Frame } });
  app.init(app);
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  window.innerHeight = VIEWPORT_HEIGHT;
  heroObserverCallback = undefined;
  observedElements = [];
  document.body.innerHTML = `${renderFrame(show, SECTIONS)}
    <main id="main">
      <section id="home" data-surface="dark"></section>
      <section id="about" data-surface="light"></section>
    </main>`;
});

afterEach(() => {
  app.destroy();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('the frame', () => {
  it('takes its surfaces and section name from the sections under its edges when it starts', () => {
    placeSection('home', 0, VIEWPORT_HEIGHT / 2 + 100);
    placeSection('about', VIEWPORT_HEIGHT / 2 + 100, 2000);

    mountFrame();

    const frame = getElement<HTMLElement>('.frame');
    expect(frame.dataset.surfaceTop).toBe('dark');
    expect(frame.dataset.surfaceBottom).toBe('light');
    expect(getElement('[data-frame="section"]').textContent).toBe('Home');
  });

  it('follows the sections as the page scrolls', async () => {
    placeSection('home', 0, VIEWPORT_HEIGHT);
    placeSection('about', VIEWPORT_HEIGHT, 2000);
    mountFrame();
    const frame = getElement<HTMLElement>('.frame');
    const initialSurfaces = [frame.dataset.surfaceTop, frame.dataset.surfaceBottom];

    await scrollTo(() => {
      placeSection('home', -VIEWPORT_HEIGHT, 0);
      placeSection('about', 0, 1200);
    });

    expect(initialSurfaces).toEqual(['dark', 'dark']);
    expect(frame.dataset.surfaceTop).toBe('light');
    expect(frame.dataset.surfaceBottom).toBe('light');
    expect(getElement('[data-frame="section"]').textContent).toBe('About');
  });

  it('gives the top and bottom edges different surfaces when a section boundary sits between them', async () => {
    placeSection('home', 0, VIEWPORT_HEIGHT);
    placeSection('about', VIEWPORT_HEIGHT, 2000);
    mountFrame();
    const frame = getElement<HTMLElement>('.frame');

    await scrollTo(() => {
      placeSection('home', -VIEWPORT_HEIGHT, 100);
      placeSection('about', 100, 1200);
    });

    expect(frame.dataset.surfaceTop).toBe('dark');
    expect(frame.dataset.surfaceBottom).toBe('light');
  });

  it('watches the first section to decide when the hero has scrolled away', () => {
    mountFrame();

    expect(observedElements).toEqual([getElement('#home')]);
  });

  it('shows the mini card and the ring mark once the first section has mostly scrolled away', () => {
    mountFrame();

    reportHeroVisibleRatio(0.05);

    expect(getElement('[data-frame="mini"]').hasAttribute('data-visible')).toBe(true);
    expect(getElement('.frame-mark').hasAttribute('data-hidden')).toBe(false);
  });

  it('hides the mini card and the ring mark again when the first section comes back', () => {
    mountFrame();
    reportHeroVisibleRatio(0);

    reportHeroVisibleRatio(0.5);

    expect(getElement('[data-frame="mini"]').hasAttribute('data-visible')).toBe(false);
    expect(getElement('.frame-mark').hasAttribute('data-hidden')).toBe(true);
  });

  it('keeps the mini card and the ring mark hidden when the page has no sections yet', () => {
    document.querySelectorAll('[data-surface]').forEach((section) => section.remove());

    mountFrame();

    expect(observedElements).toEqual([]);
    expect(getElement('[data-frame="mini"]').hasAttribute('data-visible')).toBe(false);
    expect(getElement('.frame-mark').hasAttribute('data-hidden')).toBe(true);
  });
});
