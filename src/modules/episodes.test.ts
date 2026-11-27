// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';

import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderEpisodes } from '../render/render-episodes.ts';
import type { Episode } from '../show/show-types.ts';
import { Episodes } from './episodes.ts';
import { EPISODES_REVEAL_FROM_SWEEP_PROGRESS } from './stain-edge.ts';

let app: ModularApp | undefined;
let smallViewportHeight = 0;
const measureBox = HTMLElement.prototype.getBoundingClientRect;
const TOOLBAR_HEIGHT = 88;

const EPISODES: Episode[] = Array.from({ length: 6 }, (_, index) => ({
  id: `episode-${index}`,
  title: `Episode ${index}`,
  publishedAt: '2026-10-01T12:00:00.000Z',
  description: 'About the episode',
  thumbnail: { src: 'https://example.com/art.jpg', width: 480, height: 360 },
}));

class FakeIntersectionObserver {
  observe(): void {}

  disconnect(): void {}
}

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

function reportProgress(progress: number): void {
  window.dispatchEvent(
    new CustomEvent('episodes-progress', { detail: { target: getElement('#episodes'), progress } }),
  );
}

function readActiveDashes(): number[] {
  return Array.from(document.querySelectorAll('[data-episodes="dash"]'))
    .map((dash, index) => (dash.hasAttribute('data-active') ? index : -1))
    .filter((index) => index !== -1);
}

async function scrollPage(): Promise<void> {
  window.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function keepArrivalPlaying(section: HTMLElement): void {
  const playing: Pick<Animation, 'finished'> = { finished: new Promise(() => undefined) };
  vi.spyOn(section, 'getAnimations').mockReturnValue([playing as Animation]);
}

function settleReveal(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function mountEpisodes(): void {
  app = new ModularApp({ modules: { episodes: Episodes } });
  app.init(app);
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  smallViewportHeight = window.innerHeight;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement): DOMRect {
    return this.style.blockSize === '100svh' ? new DOMRect(0, 0, 0, smallViewportHeight) : measureBox.call(this);
  });
  document.body.innerHTML = renderEpisodes({ description: '', episodes: EPISODES, clips: [] });
});

afterEach(() => {
  app?.destroy();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.motion;
});

describe('the card height', () => {
  const LINE_HEIGHT = 28.5;

  function getWithin(card: Element, selector: string): HTMLElement {
    const element = card.querySelector<HTMLElement>(selector);
    if (element === null) {
      throw new Error(`The card has no ${selector}`);
    }
    return element;
  }

  function sizeCards(descriptionLines: number[], fixedHeights: number[] = []): void {
    document.querySelectorAll<HTMLElement>('.episode-card:not(.episode-card--all)').forEach((card, index) => {
      const description = getWithin(card, '.episode-card-description');
      Object.defineProperty(card, 'offsetHeight', { value: (fixedHeights[index] ?? 400) + 200, configurable: true });
      Object.defineProperty(getWithin(card, '.episode-card-summary'), 'offsetHeight', { value: 200, configurable: true });
      Object.defineProperty(getWithin(card, '.episode-card-art'), 'offsetHeight', { value: 180, configurable: true });
      description.style.lineHeight = `${LINE_HEIGHT}px`;
      Object.defineProperty(description, 'scrollHeight', { value: (descriptionLines[index] ?? 1) * LINE_HEIGHT, configurable: true });
    });
  }

  function limitStage(availableHeight: number): void {
    const pin = getElement<HTMLElement>('.episodes-pin');
    pin.style.padding = '0';
    pin.style.rowGap = '0';
    getElement<HTMLElement>('.episodes-track').style.padding = '0';
    smallViewportHeight = availableHeight;
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(availableHeight);
  }

  function collapseToolbars(): Promise<void> {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(smallViewportHeight + TOOLBAR_HEIGHT);
    window.dispatchEvent(new Event('resize'));
    return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  function readFit(): { height: string; lines: string[] } {
    return {
      height: getElement<HTMLElement>('#episodes').style.getPropertyValue('--card-h'),
      lines: Array.from(document.querySelectorAll<HTMLElement>('.episode-card')).map((card) => card.style.getPropertyValue('--lines')),
    };
  }

  const CLEAR_ABOVE_BUTTONS = 40;
  const FLOOR_CLEAR_ABOVE_BUTTONS = 24;

  it('sizes the cards for the tallest title with the lines of the shortest description, keeping the clear gap above the buttons', () => {
    sizeCards([5, 3, 6, 4, 4, 7]);

    mountEpisodes();

    expect(readFit()).toEqual({ height: `${Math.ceil(400 + CLEAR_ABOVE_BUTTONS + 3 * LINE_HEIGHT)}px`, lines: ['3', '3', '3', '3', '3', '3', ''] });
  });

  it('gives the cards with shorter titles the extra lines their room allows', () => {
    sizeCards([5, 3, 6, 4, 4, 7], [430]);

    mountEpisodes();

    expect(readFit()).toEqual({ height: `${Math.ceil(430 + CLEAR_ABOVE_BUTTONS + 3 * LINE_HEIGHT)}px`, lines: ['3', '3', '4', '4', '4', '4', ''] });
  });

  it('keeps two lines under the tallest title on a short screen by lowering the clear gap above the buttons to 24 px, then lets the card run past the stage rather than crowd them', () => {
    sizeCards([5, 5, 5, 5, 5, 5]);
    limitStage(460);

    mountEpisodes();

    expect(readFit()).toEqual({ height: `${Math.ceil(400 + FLOOR_CLEAR_ABOVE_BUTTONS + 2 * LINE_HEIGHT)}px`, lines: ['2', '2', '2', '2', '2', '2', ''] });
  });

  it.each([
    [390, 450, '1'],
    [1024, 450, '2'],
  ])('on a %jx%j screen with no room for two lines, shows %j line(s): only a phone 760 px tall or less goes down to one', (width, height, expectedLines) => {
    sizeCards([5, 5, 5, 5, 5, 5]);
    limitStage(height);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);

    mountEpisodes();

    expect(readFit().lines[0]).toBe(expectedLines);
  });

  it('keeps a short phone at one line when its browser toolbars collapse and the visible height passes 760 px, since its small viewport height stays the same', async () => {
    sizeCards([5, 5, 5, 5, 5, 5], [620, 620, 620, 620, 620, 620]);
    limitStage(700);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    mountEpisodes();

    await collapseToolbars();

    expect(readFit().lines[0]).toBe('1');
  });

  it('fits the cards again for a resize that changes the screen size', async () => {
    sizeCards([5, 5, 5, 5, 5, 5]);
    limitStage(900);
    mountEpisodes();
    const fitted = readFit();
    sizeCards([1, 1, 1, 1, 1, 1]);

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(window.innerWidth + 1);
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(readFit()).not.toEqual(fitted);
  });

  it('keeps the fit of the cards for a resize that leaves the screen size unchanged, since nothing they depend on moved', async () => {
    sizeCards([5, 5, 5, 5, 5, 5]);
    limitStage(900);
    mountEpisodes();
    const fitted = readFit();
    sizeCards([1, 1, 1, 1, 1, 1]);

    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(readFit()).toEqual(fitted);
  });

  it.each([
    ['loading', true],
    ['loaded', false],
  ])('when the fonts are %j, fits the cards again once they are ready: %j', async (status, isFittedAgain) => {
    let finishLoading = (): void => undefined;
    const ready = new Promise<void>((resolve) => {
      finishLoading = resolve;
    });
    Object.defineProperty(document, 'fonts', { value: { status, ready }, configurable: true });
    sizeCards([5, 5, 5, 5, 5, 5]);
    limitStage(900);
    mountEpisodes();
    const fitted = readFit();
    sizeCards([1, 1, 1, 1, 1, 1]);

    finishLoading();
    await ready;
    await Promise.resolve();

    expect(JSON.stringify(readFit()) !== JSON.stringify(fitted)).toBe(isFittedAgain);
  });

  describe('above the bottom pieces of the frame', () => {
    const SCREEN_HEIGHT = 700;
    const MINI_CARD_HEIGHT = 93;
    const BAND_HEIGHT = 117;
    const GAP_TO_BAND = 16;

    function addFrame(): void {
      document.body.insertAdjacentHTML('beforeend', '<header class="frame"><aside class="mini-card"></aside></header>');
      Object.defineProperty(getElement('.frame'), 'offsetHeight', { value: SCREEN_HEIGHT });
      Object.defineProperty(getElement('.mini-card'), 'offsetTop', { value: SCREEN_HEIGHT - BAND_HEIGHT });
      Object.defineProperty(getElement('.mini-card'), 'offsetHeight', { value: MINI_CARD_HEIGHT });
    }

    const WORDS_PER_TITLE_LINE = 4;

    function sizeTitles(lines: number | number[], lineHeight = 30): void {
      document.querySelectorAll<HTMLElement>('.episode-card-title').forEach((title, index) => {
        const titleLines = typeof lines === 'number' ? lines : (lines[index] ?? 1);
        title.style.lineHeight = `${lineHeight}px`;
        title.textContent = Array.from({ length: titleLines * WORDS_PER_TITLE_LINE }, (_, word) => `word${word}`).join(' ');
        Object.defineProperty(title, 'offsetHeight', {
          get: () => Math.ceil((title.textContent?.split(' ').length ?? 0) / WORDS_PER_TITLE_LINE) * lineHeight,
        });
      });
    }

    function readSummaries(): boolean[] {
      return Array.from(document.querySelectorAll<HTMLElement>('.episode-card-summary')).map((summary) => summary.hasAttribute('hidden'));
    }

    beforeEach(() => {
      sizeCards([5, 5, 5, 5, 5, 5]);
      addFrame();
    });

    it('ends the cards a step of the spacing scale above the frame by showing one description line instead of the two it would keep with no frame', () => {
      limitStage(600);

      mountEpisodes();

      const { height, lines } = readFit();
      expect(lines[0]).toBe('1');
      expect(Number.parseFloat(height)).toBeLessThanOrEqual(600 - BAND_HEIGHT - GAP_TO_BAND);
    });

    it('drops the description when not even one line fits, and shows the card with its description hidden', () => {
      limitStage(500);

      mountEpisodes();

      expect(readFit()).toEqual({ height: `${Math.ceil(400 + FLOOR_CLEAR_ABOVE_BUTTONS)}px`, lines: ['0', '0', '0', '0', '0', '0', ''] });
      expect(readSummaries()).toEqual([true, true, true, true, true, true]);
    });

    it('cuts a long title at a whole word to fewer lines once the description is gone and the card still would not clear the frame, so no part of a hidden line is left to show', () => {
      sizeTitles(3);
      limitStage(543);

      mountEpisodes();

      const title = getElement<HTMLElement>('.episode-card-title');
      const fullTitle = Array.from({ length: 12 }, (_, word) => `word${word}`).join(' ');
      expect(title.textContent).toBe(`${fullTitle.split(' ').slice(0, 8).join(' ')}${String.fromCodePoint(0x2026)}`);
      expect(title.getAttribute('aria-label')).toBe(fullTitle);
      expect(readFit().height).toBe(`${Math.ceil(370 + CLEAR_ABOVE_BUTTONS)}px`);
    });

    it('restores the full title when the screen grows tall enough to show it', () => {
      sizeTitles(3);
      limitStage(543);
      mountEpisodes();
      limitStage(2000);

      window.dispatchEvent(new Event('resize'));

      return new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          const title = getElement<HTMLElement>('.episode-card-title');
          expect(title.textContent).toBe(Array.from({ length: 12 }, (_, word) => `word${word}`).join(' '));
          expect(title.hasAttribute('aria-label')).toBe(false);
          resolve();
        });
      });
    });

    it('gives a card with a one-line title among longer ones the description line its room allows, even though the tallest title shows none', () => {
      const SHORT_TITLE_LINE = 26;
      sizeCards([5, 5, 5, 5, 5, 5], [400, 400 + SHORT_TITLE_LINE, 400 + SHORT_TITLE_LINE, 400 + SHORT_TITLE_LINE, 400 + SHORT_TITLE_LINE, 400 + SHORT_TITLE_LINE]);
      sizeTitles([1, 2, 2, 2, 2, 2], SHORT_TITLE_LINE);
      limitStage(454 + BAND_HEIGHT + GAP_TO_BAND);
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);

      mountEpisodes();

      expect(readFit().lines).toEqual(['1', '0', '0', '0', '0', '0', '']);
      expect(getElement<HTMLElement>('.episode-card-title').hasAttribute('aria-label')).toBe(false);
    });

    it('leaves the lines and the titles alone when the screen is tall enough to clear the frame', () => {
      sizeTitles(3);
      limitStage(2000);

      mountEpisodes();

      expect(readFit().lines).toEqual(['5', '5', '5', '5', '5', '5', '']);
      expect(getElement<HTMLElement>('.episode-card-title').hasAttribute('aria-label')).toBe(false);
      expect(getElement<HTMLElement>('.episode-card-title').textContent).toBe(Array.from({ length: 12 }, (_, word) => `word${word}`).join(' '));
      expect(readSummaries()).toEqual([false, false, false, false, false, false]);
    });

    it('shows the description again when the screen grows tall enough', () => {
      limitStage(500);
      mountEpisodes();
      limitStage(2000);

      window.dispatchEvent(new Event('resize'));

      return new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          expect(readSummaries()).toEqual([false, false, false, false, false, false]);
          resolve();
        });
      });
    });

    it('measures the band from the pieces in the bottom half of the frame, ignoring the round buttons at the top on a desktop', () => {
      document.querySelector('.frame')?.insertAdjacentHTML('beforeend', '<button class="frame-button"></button>');
      Object.defineProperty(getElement('.frame-button'), 'offsetTop', { value: 24 });
      Object.defineProperty(getElement('.frame-button'), 'offsetHeight', { value: 56 });
      limitStage(600);

      mountEpisodes();

      expect(Number.parseFloat(readFit().height)).toBeLessThanOrEqual(600 - BAND_HEIGHT - GAP_TO_BAND);
    });

    describe('on a phone row', () => {
      const NATURAL_CARD_WIDTH = 343;
      const FLOOR_CARD_WIDTH = 252;
      const THUMB_RATIO = 0.5625;

      function makeCardsFollowTheirWidth(): void {
        const viewport = getElement<HTMLElement>('.episodes-viewport');
        const readWidth = (): number => Number.parseFloat(viewport.style.getPropertyValue('--row-card-w')) || NATURAL_CARD_WIDTH;
        getElement<HTMLElement>('#episodes').style.setProperty('--card-thumb', String(THUMB_RATIO));
        Object.defineProperty(getElement('.episode-card'), 'offsetWidth', { get: readWidth });
        document.querySelectorAll<HTMLElement>('.episode-card:not(.episode-card--all)').forEach((card) => {
          Object.defineProperty(card, 'offsetHeight', { get: () => 200 + 400 + (readWidth() - NATURAL_CARD_WIDTH) * THUMB_RATIO });
        });
      }

      function readRowCardWidth(): string {
        return getElement<HTMLElement>('.episodes-viewport').style.getPropertyValue('--row-card-w');
      }

      it('narrows the cards until they clear the frame when they run past it at full width', () => {
        limitStage(537);
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
        makeCardsFollowTheirWidth();

        mountEpisodes();

        const width = Number.parseFloat(readRowCardWidth());
        expect(width).toBeLessThan(NATURAL_CARD_WIDTH);
        expect(width).toBeGreaterThan(FLOOR_CARD_WIDTH);
        expect(Number.parseFloat(readFit().height)).toBeLessThanOrEqual(537 - BAND_HEIGHT - GAP_TO_BAND);
      });

      it('stops at the floor width when no narrower card would clear the frame, leaving the card running past it', () => {
        limitStage(500);
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
        makeCardsFollowTheirWidth();

        mountEpisodes();

        expect(readRowCardWidth()).toBe(`${FLOOR_CARD_WIDTH}px`);
        expect(Number.parseFloat(readFit().height)).toBeGreaterThan(500 - BAND_HEIGHT - GAP_TO_BAND);
      });

      it('keeps the narrowed width and height of the cards when the browser toolbars collapse during a scroll, since the small viewport height stays the same', async () => {
        limitStage(537);
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
        makeCardsFollowTheirWidth();
        mountEpisodes();
        const narrowed = { width: readRowCardWidth(), height: readFit().height };

        await collapseToolbars();

        expect(Number.parseFloat(narrowed.width)).toBeLessThan(NATURAL_CARD_WIDTH);
        expect({ width: readRowCardWidth(), height: readFit().height }).toEqual(narrowed);
      });

      it.each([
        ['a phone with room for the cards at full width', 360, 2000],
        ['a phone whose cards end half a pixel past the frame, which the rounding up of their height explains', 360, 556.5],
        ['a tablet, whose cards keep their width whatever the room', 700, 537],
      ])('keeps the cards at their full width on %s', (_screen, width, height) => {
        limitStage(height);
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
        makeCardsFollowTheirWidth();

        mountEpisodes();

        expect(readRowCardWidth()).toBe('');
      });
    });
  });

  it('cuts a description that overruns its lines at a whole word and ends it with an ellipsis', () => {
    const CHARACTERS_PER_LINE = 40;
    const longText = Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ');
    document.querySelectorAll<HTMLElement>('.episode-card:not(.episode-card--all)').forEach((card, index) => {
      const description = getWithin(card, '.episode-card-description');
      description.textContent = index === 0 ? longText : 'A short line';
      description.style.lineHeight = `${LINE_HEIGHT}px`;
      Object.defineProperty(description, 'scrollHeight', {
        get: () => Math.ceil((description.textContent?.length ?? 0) / CHARACTERS_PER_LINE) * LINE_HEIGHT,
      });
      Object.defineProperty(card, 'offsetHeight', { value: 600 });
      Object.defineProperty(getWithin(card, '.episode-card-summary'), 'offsetHeight', { value: 200 });
    });

    mountEpisodes();

    const trimmed = getWithin(getElement('.episode-card'), '.episode-card-description').textContent ?? '';
    const words = trimmed.slice(0, -1).split(' ');
    expect(trimmed.endsWith(String.fromCodePoint(0x2026))).toBe(true);
    expect(trimmed.length).toBeLessThanOrEqual(2 * CHARACTERS_PER_LINE);
    expect(words.every((word, index) => word === `word${index}`)).toBe(true);
    expect(getWithin(document.querySelectorAll<HTMLElement>('.episode-card')[1] as HTMLElement, '.episode-card-description').textContent).toBe('A short line');
  });

  it('restores the full description before cutting it again for a new layout', () => {
    const longText = Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ');
    const description = getWithin(getElement('.episode-card'), '.episode-card-description');
    description.textContent = longText;
    description.style.lineHeight = `${LINE_HEIGHT}px`;
    Object.defineProperty(description, 'scrollHeight', {
      get: () => Math.ceil((description.textContent?.length ?? 0) / 40) * LINE_HEIGHT,
    });
    Object.defineProperty(getElement('.episode-card'), 'offsetHeight', { value: 600 });
    Object.defineProperty(getWithin(getElement('.episode-card'), '.episode-card-summary'), 'offsetHeight', { value: 200 });
    mountEpisodes();
    const firstCut = description.textContent;

    window.dispatchEvent(new Event('resize'));

    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        expect(description.textContent).toBe(firstCut);
        resolve();
      });
    });
  });

  it('leaves the height to the content when the page has no layout', () => {
    mountEpisodes();

    expect(readFit()).toEqual({ height: '', lines: ['', '', '', '', '', '', ''] });
  });
});

describe('the row of cards', () => {
  const EPISODES_STYLES = readFileSync('src/styles/episodes.css', 'utf8');
  const CARD_STYLES = readFileSync('src/styles/episode-card.css', 'utf8');

  beforeEach(() => {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = `${EPISODES_STYLES}
${CARD_STYLES}`;
    document.head.append(stylesheet);
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('never scrolls vertically, so a drag along it moves the page instead of cutting the cards off', () => {
    const viewport = getElement('.episodes-viewport');

    expect(getComputedStyle(viewport).overflowY).toBe('hidden');
  });

  it.each(['.episode-all', '.episode-all-panel'])('lets the All episodes card shrink %s with the card instead of hanging out past it', (selector) => {
    expect(getComputedStyle(getElement(selector)).getPropertyValue('min-block-size')).toBe('0');
  });

  it('keeps the round button of the All episodes card at its full size while the panel gives up height', () => {
    expect(getComputedStyle(getElement('.episode-all .round-button')).flexShrink).toBe('0');
  });
});

describe('the episodes section with motion on', () => {
  beforeEach(() => {
    document.documentElement.dataset.motion = 'on';
    getElement<HTMLElement>('#episodes').style.setProperty('--end-steps', '0.5');
  });

  it.each([
    [740, false],
    [700, true],
    [100, true],
  ])('with the dashes at %j px from the top of a 900 px screen with a 72 px frame clearance, shows them: %j', async (dashesBottom, isShown) => {
    getElement<HTMLElement>('#episodes').style.setProperty('--frame-clear', '72px');
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    mountEpisodes();
    await settleReveal();
    vi.spyOn(getElement<HTMLElement>('.episodes-dashes'), 'getBoundingClientRect').mockReturnValue({ bottom: dashesBottom + 100 } as DOMRect);

    await scrollPage();

    expect(getElement<HTMLElement>('#episodes').hasAttribute('data-arrived')).toBe(isShown);
  });

  it('brings the dashes in with the arrival as soon as they are clear of the frame, instead of waiting for the arrival to end', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    const section = getElement<HTMLElement>('#episodes');
    section.style.setProperty('--frame-clear', '72px');
    keepArrivalPlaying(section);
    mountEpisodes();
    vi.spyOn(getElement<HTMLElement>('.episodes-dashes'), 'getBoundingClientRect').mockReturnValue({ bottom: 100 } as DOMRect);

    await scrollPage();

    expect(section.dataset.reveal).toBe('playing');
    expect(section.hasAttribute('data-arrived')).toBe(true);
  });

  it('keeps the dashes away from the frame while the arrival plays, until they are clear of it', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    const section = getElement<HTMLElement>('#episodes');
    section.style.setProperty('--frame-clear', '72px');
    keepArrivalPlaying(section);
    mountEpisodes();
    const dashesAt = vi.spyOn(getElement<HTMLElement>('.episodes-dashes'), 'getBoundingClientRect');
    dashesAt.mockReturnValue({ bottom: 880 } as DOMRect);

    await scrollPage();

    expect(section.dataset.reveal).toBe('playing');
    expect(section.hasAttribute('data-arrived')).toBe(false);

    dashesAt.mockReturnValue({ bottom: 820 } as DOMRect);
    await scrollPage();

    expect(section.hasAttribute('data-arrived')).toBe(true);
  });

  it.each([
    [10, 2000, false],
    [0, 2000, true],
    [-1200, 2000, true],
    [-1200, 800, false],
  ])('with the section top at %j and its bottom at %j on a 900 px screen, marks the pin as holding: %j', async (top, bottom, isPinned) => {
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    const section = getElement<HTMLElement>('#episodes');
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top, bottom } as DOMRect);
    mountEpisodes();

    await scrollPage();

    expect(section.hasAttribute('data-pinned')).toBe(isPinned);
  });

  it('starts on the first card, with no colour sweep played', () => {
    mountEpisodes();

    expect(getElement<HTMLElement>('#episodes').style.getPropertyValue('--active')).toBe('0');
    expect(readActiveDashes()).toEqual([0]);
  });

  it.each([
    [0, []],
    [0.8 / 6.5, []],
    [0.9 / 6.5, [0]],
    [3 / 6.5, [0, 1, 2]],
    [1, [0, 1, 2, 3, 4, 5]],
  ])('at progress %j hides the cards %j once the next one leaves only a thin strip of them', (progress, covered) => {
    document.querySelectorAll<HTMLElement>('.episode-card').forEach((card) => Object.defineProperty(card, 'offsetWidth', { value: 300 }));
    getElement<HTMLElement>('.episodes-track').style.columnGap = '18px';
    mountEpisodes();

    reportProgress(progress);

    const marked = Array.from(document.querySelectorAll('[data-episodes="card"]'))
      .map((card, index) => (card.hasAttribute('data-covered') ? index : -1))
      .filter((index) => index !== -1);
    expect(marked).toEqual(covered);
  });

  it('holds the arrival until the stain has started to sweep, so it is already rising as the sweep completes', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    const section = getElement<HTMLElement>('#episodes');
    const sectionAt = vi.spyOn(section, 'getBoundingClientRect');
    sectionAt.mockReturnValue({ top: 900 * (1 - 0.5 * (EPISODES_REVEAL_FROM_SWEEP_PROGRESS - 0.05)) } as DOMRect);
    keepArrivalPlaying(section);
    mountEpisodes();

    expect(section.dataset.reveal).toBe('pending');

    sectionAt.mockReturnValue({ top: 900 * (1 - 0.5 * EPISODES_REVEAL_FROM_SWEEP_PROGRESS) } as DOMRect);
    await scrollPage();

    expect(section.dataset.reveal).toBe('playing');
  });

  it.each([
    [0, 0],
    [0.4 / 6.5, 0],
    [0.6 / 6.5, 1],
    [0.5, 3],
    [1, 6],
  ])('at progress %j lights dash %j and tells the colour sweep which card is in front', (progress, index) => {
    mountEpisodes();

    reportProgress(progress);

    expect(getElement<HTMLElement>('#episodes').style.getPropertyValue('--active')).toBe(String(index));
    expect(readActiveDashes()).toEqual([index]);
    expect(document.documentElement.style.getPropertyValue('--episodes-active')).toBe(String(index));
  });

  it('hands the page background back when the section is torn down', () => {
    mountEpisodes();
    reportProgress(1);

    app?.destroy();

    expect(document.documentElement.style.getPropertyValue('--episodes-active')).toBe('');
  });

  describe('when a card takes keyboard focus', () => {

    async function focusLastCardLink(): Promise<void> {
      const target = getElement<HTMLElement>('.episode-all');
      target.focus();
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }

    it('scrolls the pinned track to the very end of the pin when the last card takes focus', async () => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      mountEpisodes();
      getElement<HTMLElement>('.episodes-pin').style.position = 'sticky';
      Object.defineProperty(getElement<HTMLElement>('#episodes'), 'offsetHeight', { value: 4000 });

      await focusLastCardLink();

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 4000 - window.innerHeight, behavior: 'instant' });
    });

    it('leaves the page alone when the track is not pinned', async () => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      mountEpisodes();

      await focusLastCardLink();

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  it('ignores progress events without a number', () => {
    mountEpisodes();

    window.dispatchEvent(new CustomEvent('episodes-progress', { detail: { progress: 'half' } }));
    window.dispatchEvent(new Event('episodes-progress'));

    expect(readActiveDashes()).toEqual([0]);
  });
});

describe('the progress dashes', () => {
  const RING = 3;

  function placeFirstCard(top: number, height: number): void {
    Object.defineProperty(getElement<HTMLElement>('.episodes-viewport'), 'offsetTop', { value: 100 });
    Object.defineProperty(getElement<HTMLElement>('.episodes-track'), 'offsetTop', { value: 0 });
    const firstCard = getElement<HTMLElement>('.episode-card');
    firstCard.style.borderBottomWidth = `${RING}px`;
    Object.defineProperty(firstCard, 'offsetTop', { value: top });
    Object.defineProperty(firstCard, 'offsetHeight', { value: height });
  }

  it.each([
    [20, 420],
    [60, 380],
  ])('sit one step of the spacing scale under the face of the first card of the pinned track, not under its ring, wherever it ends (offset %j, height %j)', (top, height) => {
    getElement<HTMLElement>('.episodes-viewport').style.setProperty('container-type', 'size');
    placeFirstCard(top, height);

    mountEpisodes();

    expect(getElement<HTMLElement>('.episodes-dashes').style.getPropertyValue('--dashes-top')).toBe(`${100 + top + height - RING + 16}px`);
  });

  it('are left to the stylesheet while the track is a plain row', () => {
    placeFirstCard(20, 420);

    mountEpisodes();

    expect(getElement<HTMLElement>('.episodes-dashes').style.getPropertyValue('--dashes-top')).toBe('');
  });
});

describe('the previous and next buttons', () => {
  function readButtons(): { previous: HTMLButtonElement; next: HTMLButtonElement; scrollBy: ReturnType<typeof vi.fn> } {
    const viewport = getElement<HTMLElement>('.episodes-viewport');
    Object.defineProperty(viewport, 'scrollWidth', { value: 2000, configurable: true });
    Object.defineProperty(viewport, 'clientWidth', { value: 900, configurable: true });
    const scrollBy = vi.fn();
    viewport.scrollBy = scrollBy;
    return {
      previous: getElement<HTMLButtonElement>('[data-episodes="previous"]'),
      next: getElement<HTMLButtonElement>('[data-episodes="next"]'),
      scrollBy,
    };
  }

  it('stay hidden until the script runs, then show with the previous one disabled at the start', () => {
    const navigation = getElement<HTMLElement>('[data-episodes="nav"]');
    expect(navigation.hidden).toBe(true);

    mountEpisodes();

    expect(navigation.hidden).toBe(false);
    expect(getElement<HTMLButtonElement>('[data-episodes="previous"]').disabled).toBe(true);
  });

  it('stay out of the page while the pinned track is showing instead of the row', () => {
    getElement<HTMLElement>('.episodes-viewport').style.setProperty('container-type', 'size');

    mountEpisodes();

    expect(getElement<HTMLElement>('[data-episodes="nav"]').hidden).toBe(true);
  });

  it('scroll the row by one card at a time', () => {
    const { next, scrollBy } = readButtons();
    mountEpisodes();
    const cards = document.querySelectorAll<HTMLElement>('[data-episodes="card"]');
    Object.defineProperty(cards[0], 'offsetLeft', { value: 0 });
    Object.defineProperty(cards[1], 'offsetLeft', { value: 424 });

    next.click();

    expect(scrollBy).toHaveBeenCalledWith({ left: 424, behavior: 'instant' });
  });

  it('hand focus over without scrolling the page when one of them runs out', () => {
    const { previous, next } = readButtons();
    mountEpisodes();
    const viewport = getElement<HTMLElement>('.episodes-viewport');
    viewport.scrollLeft = 500;
    viewport.dispatchEvent(new Event('scroll'));
    next.focus();
    const focusPrevious = vi.spyOn(previous, 'focus');

    viewport.scrollLeft = 1100;
    viewport.dispatchEvent(new Event('scroll'));

    expect(focusPrevious).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('disable themselves at the ends of the row', () => {
    const { previous, next } = readButtons();
    mountEpisodes();
    const viewport = getElement<HTMLElement>('.episodes-viewport');

    viewport.scrollLeft = 500;
    viewport.dispatchEvent(new Event('scroll'));
    expect([previous.disabled, next.disabled]).toEqual([false, false]);

    viewport.scrollLeft = 1100;
    viewport.dispatchEvent(new Event('scroll'));
    expect([previous.disabled, next.disabled]).toEqual([false, true]);
  });
});

describe('the episodes section with motion off', () => {
  it('stays a plain row: no arrival, no colour sweep and no progress dashes lit', () => {
    mountEpisodes();
    reportProgress(0.5);

    const section = getElement<HTMLElement>('#episodes');
    expect(section.dataset.reveal).toBeUndefined();
    expect(section.style.getPropertyValue('--active')).toBe('');
    expect(readActiveDashes()).toEqual([]);
  });
});
