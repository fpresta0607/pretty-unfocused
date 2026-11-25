// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderFrame } from '../render/render-frame.ts';
import type { Show } from '../show/show-types.ts';
import { Listen } from './listen.ts';
import { Menu } from './menu.ts';

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

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

function pressEscape(): void {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
}

function preventNavigation(event: Event): void {
  event.preventDefault();
}

beforeEach(() => {
  document.body.innerHTML = `<a class="skip-link" href="#main" data-inert-on-menu>Skip to content</a>
    ${renderFrame(show, SECTIONS)}
    <main id="main" tabindex="-1" data-inert-on-menu><section id="home"><p>Hello</p></section></main>`;
  document.addEventListener('click', preventNavigation);
  app = new ModularApp({ modules: { listen: Listen, menu: Menu } });
  app.init(app);
});

afterEach(() => {
  app.destroy();
  document.removeEventListener('click', preventNavigation);
  document.body.innerHTML = '';
});

describe('the menu', () => {
  it('reports itself expanded while open and collapsed once closed', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');

    button.click();
    const expandedWhileOpen = button.getAttribute('aria-expanded');
    button.click();

    expect(expandedWhileOpen).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('moves focus into its panel when it opens', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');

    button.click();

    expect(document.activeElement).toBe(getElement('[data-menu="link"][href="#home"]'));
  });

  it('closes on Escape and returns focus to its button', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');
    button.click();

    pressEscape();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('closes when a section link in its panel is followed', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');
    button.click();

    getElement<HTMLAnchorElement>('[data-menu="link"][href="#about"]').click();

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('makes the rest of the page inert while open and live again once closed', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');
    const pageElements = Array.from(document.querySelectorAll<HTMLElement>('[data-inert-on-menu]'));

    button.click();
    const inertWhileOpen = pageElements.map((element) => element.inert);
    pressEscape();

    expect(pageElements).toEqual(expect.arrayContaining([getElement('.skip-link'), getElement('main')]));
    expect(inertWhileOpen).toEqual(pageElements.map(() => true));
    expect(pageElements.map((element) => element.inert)).toEqual(pageElements.map(() => false));
  });

  it('keeps its own button and panel usable while it makes the page inert', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');

    button.click();

    expect(button.closest('[inert]')).toBeNull();
    expect(getElement('#menu-panel').closest('[inert]')).toBeNull();
  });

  it('stays open when the visitor presses outside it, because the rest of the page is inert', () => {
    const button = getElement<HTMLButtonElement>('[data-menu="toggle"]');
    button.click();

    getElement('main').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('the Listen panel', () => {
  it('reports itself expanded while open and collapsed once closed', () => {
    const button = getElement<HTMLButtonElement>('[data-listen="toggle"]');

    button.click();
    const expandedWhileOpen = button.getAttribute('aria-expanded');
    button.click();

    expect(expandedWhileOpen).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and returns focus to its button', () => {
    const button = getElement<HTMLButtonElement>('[data-listen="toggle"]');
    button.click();

    pressEscape();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('closes when the visitor presses outside it', () => {
    const button = getElement<HTMLButtonElement>('[data-listen="toggle"]');
    button.click();

    getElement('main').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('stays open when the visitor presses inside it', () => {
    const button = getElement<HTMLButtonElement>('[data-listen="toggle"]');
    button.click();

    getElement('#listen-panel').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when a platform link in its panel is followed', () => {
    const button = getElement<HTMLButtonElement>('[data-listen="toggle"]');
    button.click();

    getElement<HTMLAnchorElement>('[data-listen="link"]').click();

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when keyboard focus leaves it', () => {
    const button = getElement<HTMLButtonElement>('[data-listen="toggle"]');
    button.click();

    getElement<HTMLElement>('main').focus();

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves the rest of the page live while open', () => {
    getElement<HTMLButtonElement>('[data-listen="toggle"]').click();

    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });
});
