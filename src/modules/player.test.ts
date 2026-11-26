// @vitest-environment happy-dom
import ModularApp, { module as Module } from 'modujs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderPlayer } from '../render/render-player.ts';
import { buildEmbedUrl, buildPosterUrl, Player } from './player.ts';

let app: ModularApp;

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

function click(element: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  element.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.innerHTML = `
    <a id="play-link" href="https://www.youtube.com/watch?v=abc123" data-player="abc123" data-player-title="A good episode">Play</a>
    <a id="plain-link" href="https://example.com/">Plain</a>
    ${renderPlayer()}`;
  app = new ModularApp({ modules: { player: Player } });
  app.init(app);
});

afterEach(() => {
  app.destroy();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.playerOpen;
});

describe('buildEmbedUrl', () => {
  it('uses the privacy-enhanced embed with autoplay and no related videos', () => {
    expect(buildEmbedUrl('abc123')).toBe('https://www.youtube-nocookie.com/embed/abc123?autoplay=1&rel=0');
  });

  it('encodes the video id', () => {
    expect(buildEmbedUrl('a/b?c')).toBe('https://www.youtube-nocookie.com/embed/a%2Fb%3Fc?autoplay=1&rel=0');
  });
});

describe('buildPosterUrl', () => {
  it('points at the sharpest episode thumbnail, with the video id encoded', () => {
    expect(buildPosterUrl('abc123')).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
    expect(buildPosterUrl('a/b')).toBe('https://i.ytimg.com/vi/a%2Fb/maxresdefault.jpg');
  });

  it.each([
    [1, 'sddefault'],
    [2, 'hqdefault'],
  ])('names the fallback thumbnail at index %j %j', (qualityIndex, quality) => {
    expect(buildPosterUrl('abc123', qualityIndex)).toBe(`https://i.ytimg.com/vi/abc123/${quality}.jpg`);
  });
});

describe('the player', () => {
  it('shows the episode thumbnail under the video until the video has loaded', () => {
    click(getElement('#play-link'));

    const poster = getElement<HTMLImageElement>('dialog .player-poster');
    const frame = getElement<HTMLIFrameElement>('dialog iframe');
    expect(poster.src).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
    expect(frame.hasAttribute('data-loaded')).toBe(false);

    frame.dispatchEvent(new Event('load'));

    expect(frame.hasAttribute('data-loaded')).toBe(true);
  });

  it('falls back from maxresdefault to sddefault and then hqdefault when a thumbnail fails to load', () => {
    click(getElement('#play-link'));
    const poster = getElement<HTMLImageElement>('dialog .player-poster');

    poster.dispatchEvent(new Event('error'));
    expect(poster.src).toBe('https://i.ytimg.com/vi/abc123/sddefault.jpg');

    poster.dispatchEvent(new Event('error'));
    expect(poster.src).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');

    poster.dispatchEvent(new Event('error'));
    expect(poster.src).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
  });

  it('has no iframe and stays closed until a play link is clicked', () => {
    expect(document.querySelector('iframe')).toBeNull();
    expect(getElement<HTMLDialogElement>('dialog').open).toBe(false);
  });

  it('opens the dialog with the nocookie embed, named after the episode, on a click of a play link', () => {
    const playLink = getElement('#play-link');

    const event = click(playLink);

    const frame = getElement<HTMLIFrameElement>('dialog iframe');
    expect(event.defaultPrevented).toBe(true);
    expect(getElement<HTMLDialogElement>('dialog').open).toBe(true);
    expect(frame.src).toBe('https://www.youtube-nocookie.com/embed/abc123?autoplay=1&rel=0');
    expect(frame.title).toBe('A good episode');
    expect(document.documentElement.hasAttribute('data-player-open')).toBe(true);
  });

  it('moves focus to the close button', () => {
    click(getElement('#play-link'));

    expect(document.activeElement).toBe(getElement('[data-player-close]'));
  });

  it('closes on Escape, removes the iframe and returns focus to the play link', () => {
    const playLink = getElement<HTMLAnchorElement>('#play-link');
    click(playLink);

    getElement('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(getElement<HTMLDialogElement>('dialog').open).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.activeElement).toBe(playLink);
    expect(document.documentElement.hasAttribute('data-player-open')).toBe(false);
  });

  it('closes with the close button, removes the iframe and returns focus to the play link', () => {
    const playLink = getElement<HTMLAnchorElement>('#play-link');
    click(playLink);

    click(getElement('[data-player-close]'));

    expect(getElement<HTMLDialogElement>('dialog').open).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.activeElement).toBe(playLink);
  });

  it('closes on a click outside the video', () => {
    click(getElement('#play-link'));

    click(getElement('dialog'));

    expect(getElement<HTMLDialogElement>('dialog').open).toBe(false);
  });

  it('keeps the video open on a click inside the stage', () => {
    click(getElement('#play-link'));

    click(getElement('iframe'));

    expect(getElement<HTMLDialogElement>('dialog').open).toBe(true);
  });

  it('creates a fresh iframe each time it opens', () => {
    const playLink = getElement('#play-link');
    click(playLink);
    click(getElement('[data-player-close]'));

    click(playLink);

    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('leaves links without data-player alone', () => {
    const event = click(getElement('#plain-link'));

    expect(event.defaultPrevented).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it.each([
    ['a modified click', { ctrlKey: true }],
    ['a shifted click', { shiftKey: true }],
    ['a middle click', { button: 1 }],
  ])('leaves %s to the browser so the link opens normally', (_label, init) => {
    const event = click(getElement('#play-link'), init);

    expect(event.defaultPrevented).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('opens from a child of the play link, such as its icon', () => {
    const playLink = getElement('#play-link');
    const icon = document.createElement('span');
    playLink.append(icon);

    click(icon);

    expect(getElement<HTMLDialogElement>('dialog').open).toBe(true);
  });

  it('locks the page scroll while the video is open and unlocks it on close', () => {
    const scrollCalls: string[] = [];
    class RecordingScroll extends Module {
      lock(): void {
        scrollCalls.push('lock');
      }

      unlock(): void {
        scrollCalls.push('unlock');
      }
    }
    app.destroy();
    document.body.setAttribute('data-module-scroll', '');
    app = new ModularApp({ modules: { player: Player, scroll: RecordingScroll } });
    app.init(app);

    click(getElement('#play-link'));
    const callsWhileOpen = [...scrollCalls];
    click(getElement('[data-player-close]'));

    expect(callsWhileOpen).toEqual(['lock']);
    expect(scrollCalls).toEqual(['lock', 'unlock']);
    document.body.removeAttribute('data-module-scroll');
  });
});
