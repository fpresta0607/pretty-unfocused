// @vitest-environment happy-dom
import ModularApp from 'modujs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHero } from '../render/render-hero.ts';
import type { Show } from '../show/show-types.ts';
import { Hero } from './hero.ts';
import { HERO_SETTLED_EVENT } from './motion-state.ts';

const timelineParameters = vi.hoisted(() => ({ onComplete: undefined as (() => void) | undefined }));

vi.mock('animejs', async (importOriginal) => {
  const anime = await importOriginal<typeof import('animejs')>();
  return {
    ...anime,
    createTimeline: (parameters: { onComplete?: () => void }) => {
      timelineParameters.onComplete = parameters.onComplete;
      const timeline = { add: () => timeline };
      return timeline;
    },
  };
});

const show: Show = {
  description: '',
  episodes: [
    {
      id: 'episode-1',
      title: 'Episode 1',
      publishedAt: '2026-10-01T12:00:00.000Z',
      description: 'About the episode',
      thumbnail: { src: 'https://example.com/art.jpg', width: 480, height: 360 },
    },
  ],
  clips: [],
};
let app: ModularApp;

beforeEach(() => {
  timelineParameters.onComplete = undefined;
  document.documentElement.dataset.motion = 'on';
  document.documentElement.dataset.heroState = 'pending';
  document.body.innerHTML = renderHero(show);
  app = new ModularApp({ modules: { hero: Hero } });
});

afterEach(() => {
  app.destroy();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.motion;
  delete document.documentElement.dataset.heroState;
});

describe('the hero reveal', () => {
  it('tells the page the hero has settled once the reveal timeline completes, and not before', () => {
    const handleSettled = vi.fn();
    window.addEventListener(HERO_SETTLED_EVENT, handleSettled);

    app.init(app);
    expect(handleSettled).not.toHaveBeenCalled();
    timelineParameters.onComplete?.();
    window.removeEventListener(HERO_SETTLED_EVENT, handleSettled);

    expect(handleSettled).toHaveBeenCalledTimes(1);
  });
});
