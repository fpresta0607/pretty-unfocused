// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderIntro } from '../render/render-intro.ts';
import { Hero } from './hero.ts';
import { Intro } from './intro.ts';

const EXIT_WAIT_MS = 1000;
const ORIGINAL_GET_ANIMATIONS = Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations');
let app: ModularApp;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [] });
  const root = document.documentElement;
  root.dataset.motion = 'on';
  root.dataset.intro = 'pending';
  document.body.innerHTML = `${renderIntro()}
    <section id="home" data-module-hero><h1 class="hero-word"></h1></section>`;
});

afterEach(() => {
  app.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (ORIGINAL_GET_ANIMATIONS === undefined) {
    Reflect.deleteProperty(Element.prototype, 'getAnimations');
  } else {
    Object.defineProperty(Element.prototype, 'getAnimations', ORIGINAL_GET_ANIMATIONS);
  }
  const root = document.documentElement;
  delete root.dataset.motion;
  delete root.dataset.intro;
  document.body.innerHTML = '';
  sessionStorage.clear();
});

describe('the intro', () => {
  it('stays gone and does not replay the reveal when the head failsafe cleared it before the exit', async () => {
    const reveal = vi.spyOn(Hero.prototype, 'reveal').mockImplementation(() => undefined);
    app = new ModularApp({ modules: { hero: Hero, intro: Intro } });
    app.init(app);
    const wasShowingIntro = document.querySelector('.intro') !== null;

    delete document.documentElement.dataset.intro;
    await vi.advanceTimersByTimeAsync(EXIT_WAIT_MS);

    expect(wasShowingIntro).toBe(true);
    expect(document.querySelector('.intro')).toBeNull();
    expect(document.documentElement.dataset.intro).toBeUndefined();
    expect(reveal).not.toHaveBeenCalled();
  });
});
