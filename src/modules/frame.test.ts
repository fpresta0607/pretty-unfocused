// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFrame } from '../render/render-frame.ts';
import type { Show } from '../show/show-types.ts';
import { Frame } from './frame.ts';
import { edgeHeight, settledEdgeShape } from './stain-edge.ts';

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
  getElement(`#${id}`).getBoundingClientRect = () => new DOMRect(0, top, 1000, bottom - top);
}

function placePiece(selector: string, centerX: number, centerY: number): void {
  getElement(selector).getBoundingClientRect = () => new DOMRect(centerX - 28, centerY - 28, 56, 56);
}

function readPieceSurface(selector: string): string | undefined {
  return getElement<HTMLElement>(selector).dataset.frameSurface;
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
  window.innerWidth = 1000;
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
  delete document.documentElement.dataset.motion;
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('the frame', () => {
  it('gives each piece the surface of the section under its centre when it starts', () => {
    placePiece('.frame-button--menu', 68, 52);
    placePiece('[data-frame="section"]', 120, 756);
    placeSection('home', 0, 500);
    placeSection('about', 500, 2000);

    mountFrame();

    expect(readPieceSurface('.frame-button--menu')).toBe('dark');
    expect(readPieceSurface('[data-frame="section"]')).toBe('light');
  });

  it('switches the section name at the very moment its own surface flips, never while it is over the old section', async () => {
    placePiece('[data-frame="section"]', 120, 756);
    placeSection('home', -VIEWPORT_HEIGHT, 757);
    placeSection('about', 757, 2000);
    mountFrame();
    const nameWhileOverTheHero = getElement('[data-frame="section"]').textContent;
    const surfaceWhileOverTheHero = readPieceSurface('[data-frame="section"]');

    await scrollTo(() => {
      placeSection('home', -VIEWPORT_HEIGHT, 756);
      placeSection('about', 756, 2000);
    });

    expect(surfaceWhileOverTheHero).toBe('dark');
    expect(nameWhileOverTheHero).toBe('Home');
    expect(readPieceSurface('[data-frame="section"]')).toBe('light');
    expect(getElement('[data-frame="section"]').textContent).toBe('About');
  });

  it('turns a piece light only once the section edge has reached its centre', async () => {
    placePiece('.frame-button--menu', 68, 52);
    placeSection('home', 0, VIEWPORT_HEIGHT);
    placeSection('about', VIEWPORT_HEIGHT, 2000);
    mountFrame();

    await scrollTo(() => {
      placeSection('home', -748, 53);
      placeSection('about', 53, 1200);
    });
    const surfaceJustBeforeTheEdge = readPieceSurface('.frame-button--menu');
    await scrollTo(() => {
      placeSection('home', -748, 52);
      placeSection('about', 52, 1200);
    });

    expect(surfaceJustBeforeTheEdge).toBe('dark');
    expect(readPieceSurface('.frame-button--menu')).toBe('light');
  });

  it('gives pieces on either side of a section boundary different surfaces and names the section in the middle', async () => {
    placePiece('.frame-button--menu', 68, 52);
    placePiece('[data-frame="section"]', 120, 756);
    placeSection('home', 0, VIEWPORT_HEIGHT);
    placeSection('about', VIEWPORT_HEIGHT, 2000);
    mountFrame();

    await scrollTo(() => {
      placeSection('home', -VIEWPORT_HEIGHT, 100);
      placeSection('about', 100, 1200);
    });

    expect(readPieceSurface('.frame-button--menu')).toBe('dark');
    expect(readPieceSurface('[data-frame="section"]')).toBe('light');
    expect(getElement('[data-frame="section"]').textContent).toBe('About');
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

describe('the frame with the stain edge drawn', () => {
  const PIECE_Y = 700;
  const PIECES = ['.frame-mark', '.frame-button--menu', '.frame-button--listen'];

  function placeAbout(top: number): void {
    placeSection('home', top - VIEWPORT_HEIGHT, top);
    placeSection('about', top, top + 3000);
  }

  beforeEach(() => {
    document.documentElement.dataset.motion = 'on';
    getElement('#about').setAttribute('data-module-stain', '');
    placePiece('.frame-mark', 500, PIECE_Y);
    placePiece('.frame-button--menu', 68, PIECE_Y);
    placePiece('.frame-button--listen', 932, PIECE_Y);
  });

  it('keeps every piece on the hero while the edge is still below the screen', () => {
    placeAbout(VIEWPORT_HEIGHT);

    mountFrame();

    expect(PIECES.map(readPieceSurface)).toEqual(['dark', 'dark', 'dark']);
  });

  it('turns each piece light as the edge passes over it at its own x, the leaning side and the crest first', async () => {
    placeAbout(VIEWPORT_HEIGHT);
    mountFrame();

    await scrollTo(() => placeAbout(VIEWPORT_HEIGHT - 15));
    const whileOnlyTheLeadingEdgeHasPassed = PIECES.map(readPieceSurface);
    await scrollTo(() => placeAbout(500));

    expect(whileOnlyTheLeadingEdgeHasPassed).toEqual(['light', 'light', 'dark']);
    expect(PIECES.map(readPieceSurface)).toEqual(['light', 'light', 'light']);
  });

  it('turns the pieces back to the hero surface when the page scrolls back up', async () => {
    placeAbout(500);
    mountFrame();

    await scrollTo(() => placeAbout(VIEWPORT_HEIGHT));

    expect(PIECES.map(readPieceSurface)).toEqual(['dark', 'dark', 'dark']);
  });

  it('shows the mini card and the ring mark from the moment the sweep has covered the screen, and hides them again on the way back', async () => {
    const isMiniVisible = (): boolean => getElement('[data-frame="mini"]').hasAttribute('data-visible');
    const isMarkShown = (): boolean => !getElement('.frame-mark').hasAttribute('data-hidden');
    placeAbout(VIEWPORT_HEIGHT);
    mountFrame();

    await scrollTo(() => placeAbout(VIEWPORT_HEIGHT * 0.55));
    reportHeroVisibleRatio(0);
    const whileTheSweepRuns = [isMiniVisible(), isMarkShown()];
    await scrollTo(() => placeAbout(VIEWPORT_HEIGHT * 0.5));
    const onceTheSweepIsDone = [isMiniVisible(), isMarkShown()];
    await scrollTo(() => placeAbout(VIEWPORT_HEIGHT * 0.55));

    expect(whileTheSweepRuns).toEqual([false, false]);
    expect(onceTheSweepIsDone).toEqual([true, true]);
    expect([isMiniVisible(), isMarkShown()]).toEqual([false, false]);
  });
});

describe('the frame with the settled edge of a page without motion', () => {
  const PIECE_Y = 700;

  function placeAbout(top: number): void {
    placeSection('home', top - VIEWPORT_HEIGHT, top);
    placeSection('about', top, top + 3000);
  }

  beforeEach(() => {
    getElement('#about').setAttribute('data-module-stain', '');
    placePiece('.frame-mark', 500, PIECE_Y);
    placePiece('.frame-button--menu', 68, PIECE_Y);
    placePiece('.frame-button--listen', 932, PIECE_Y);
  });

  it('keeps every piece on the hero while the tallest lobe is still below the piece', () => {
    placeAbout(PIECE_Y + 200);

    mountFrame();

    expect(['.frame-mark', '.frame-button--menu', '.frame-button--listen'].map(readPieceSurface)).toEqual([
      'dark',
      'dark',
      'dark',
    ]);
  });

  it('turns a piece light where the still lobed edge crosses it, the tallest lobe first', () => {
    placeAbout(PIECE_Y + 8);

    mountFrame();

    expect(readPieceSurface('.frame-mark')).toBe('light');
  });
});

describe('the frame pieces and the pixels under them', () => {
  const LABEL = { left: 20, top: 700, width: 300, height: 24 };
  const COLUMNS = 60;
  const ROWS = 8;
  const CLEAR_MARGIN = 0.15;
  const TOPS = Array.from({ length: 130 }, (_, index) => LABEL.top + 180 - index * 1.7);

  function placeAbout(top: number): void {
    placeSection('home', top - VIEWPORT_HEIGHT, top);
    placeSection('about', top, top + 3000);
  }

  function readCreamShare(aboutTop: number): number {
    const shape = settledEdgeShape(window.innerWidth, window.innerHeight);
    let cream = 0;
    for (let column = 0; column < COLUMNS; column += 1) {
      const x = LABEL.left + (LABEL.width * (column + 0.5)) / COLUMNS;
      const edgeY = aboutTop - edgeHeight(x / 1000, shape);
      for (let row = 0; row < ROWS; row += 1) {
        const y = LABEL.top + (LABEL.height * (row + 0.5)) / ROWS;
        cream += y >= edgeY ? 1 : 0;
      }
    }
    return cream / (COLUMNS * ROWS);
  }

  beforeEach(() => {
    getElement('#about').setAttribute('data-module-stain', '');
    getElement('[data-frame="section"]').getBoundingClientRect = () =>
      new DOMRect(LABEL.left, LABEL.top, LABEL.width, LABEL.height);
  });

  it.each(TOPS.map((top) => [top.toFixed(1), top] as const))(
    'gives the section name the colour that covers most of its box when the section top is at %s',
    (_name, top) => {
      const creamShare = readCreamShare(top);
      placeAbout(top);

      mountFrame();

      if (Math.abs(creamShare - 0.5) > CLEAR_MARGIN) {
        const expectedSurface = creamShare > 0.5 ? 'light' : 'dark';
        expect(readPieceSurface('[data-frame="section"]')).toBe(expectedSurface);
        expect(getElement('[data-frame="section"]').textContent).toBe(expectedSurface === 'light' ? 'About' : 'Home');
      }
    },
  );

  it('flips the name from the hero to the section while the box crosses the edge, once and never back', async () => {
    placeAbout(TOPS[0] ?? 0);
    mountFrame();
    const surfaces: (string | undefined)[] = [];

    for (const top of TOPS) {
      await scrollTo(() => placeAbout(top));
      surfaces.push(readPieceSurface('[data-frame="section"]'));
    }

    const firstLight = surfaces.indexOf('light');
    expect(firstLight).toBeGreaterThan(0);
    expect(surfaces.slice(0, firstLight).every((surface) => surface === 'dark')).toBe(true);
    expect(surfaces.slice(firstLight).every((surface) => surface === 'light')).toBe(true);
  });
});

describe('the section name over the pixels under its own text', () => {
  const LABEL = { left: 20, top: 700, height: 24 };
  const WIDTH_OF = { Home: 50, About: 300 };
  const TOPS = Array.from({ length: 130 }, (_, index) => LABEL.top + 180 - index * 1.7);
  const CLEAR_MARGIN = 0.25;

  function placeAbout(top: number): void {
    placeSection('home', top - VIEWPORT_HEIGHT, top);
    placeSection('about', top, top + 3000);
  }

  function readShare(aboutTop: number, width: number, isCream: boolean): number {
    const shape = settledEdgeShape(window.innerWidth, window.innerHeight);
    let matching = 0;
    for (let column = 0; column < 60; column += 1) {
      const edgeY = aboutTop - edgeHeight((LABEL.left + (width * (column + 0.5)) / 60) / 1000, shape);
      for (let row = 0; row < 8; row += 1) {
        const isBelowEdge = LABEL.top + (LABEL.height * (row + 0.5)) / 8 >= edgeY;
        matching += isBelowEdge === isCream ? 1 : 0;
      }
    }
    return matching / 480;
  }

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const width = WIDTH_OF[this.textContent === 'Home' ? 'Home' : 'About'];
      return new DOMRect(LABEL.left, LABEL.top, width, LABEL.height);
    });
    getElement('#about').setAttribute('data-module-stain', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(TOPS.map((top) => [top.toFixed(1), top] as const))(
    'shows the name whose own text lies mostly over its own colour when the section top is at %s',
    (_name, top) => {
      placeSection('home', top - VIEWPORT_HEIGHT, top);
      placeSection('about', top, top + 3000);
      const aboutShare = readShare(top, WIDTH_OF.About, true);
      const homeShare = readShare(top, WIDTH_OF.Home, false);
      placeAbout(top);

      mountFrame();

      if (Math.abs(aboutShare - homeShare) > CLEAR_MARGIN) {
        expect(getElement('[data-frame="section"]').textContent).toBe(aboutShare > homeShare ? 'About' : 'Home');
      }
    },
  );
});
