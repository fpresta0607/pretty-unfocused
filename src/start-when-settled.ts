import { HERO_SETTLED_EVENT, isMotionEnabled } from './modules/motion-state.ts';

const INPUT_EVENTS = ['keydown', 'pointerdown', 'scroll', 'touchstart', 'wheel'] as const;
const IDLE_TIMEOUT_MS = 1000;
const FALLBACK_DELAY_MS = 6000;

function runWhenIdle(task: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
  } else {
    window.setTimeout(task, 0);
  }
}

// The sections below the first screen fit their cards and edges with forced layouts, so they start once the hero has settled,
// or at the first sign of the visitor reaching for the page, whichever comes first.
export function startWhenSettled(start: () => void): void {
  if (window.location.hash !== '') {
    start();
    return;
  }
  if (!isMotionEnabled(document.documentElement)) {
    runWhenIdle(start);
    return;
  }
  const stop = (): void => {
    window.removeEventListener(HERO_SETTLED_EVENT, handleHeroSettled);
    INPUT_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleInput));
    window.clearTimeout(fallbackTimeout);
  };
  const handleInput = (): void => {
    stop();
    start();
  };
  const handleHeroSettled = (): void => {
    stop();
    runWhenIdle(start);
  };

  window.addEventListener(HERO_SETTLED_EVENT, handleHeroSettled);
  INPUT_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleInput, { passive: true }));
  const fallbackTimeout = window.setTimeout(handleHeroSettled, FALLBACK_DELAY_MS);
}
