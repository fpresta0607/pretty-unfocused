// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HERO_SETTLED_EVENT } from './modules/motion-state.ts';
import { startWhenSettled } from './start-when-settled.ts';

const FALLBACK_DELAY_MS = 6000;
let start: ReturnType<typeof vi.fn<() => void>>;

function runIdleCallbacksAtOnce(): void {
  vi.stubGlobal('requestIdleCallback', (task: () => void) => task());
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  document.documentElement.dataset.motion = 'on';
  start = vi.fn<() => void>();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
  window.location.hash = '';
});

describe('starting the sections below the first screen', () => {
  it('waits for the hero to settle, then starts when the browser is idle', () => {
    const requestIdleCallback = vi.fn<(task: () => void) => void>();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    startWhenSettled(start);

    expect(start).not.toHaveBeenCalled();
    window.dispatchEvent(new Event(HERO_SETTLED_EVENT));
    expect(start).not.toHaveBeenCalled();
    requestIdleCallback.mock.calls[0]?.[0]();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it.each(['keydown', 'pointerdown', 'scroll', 'touchstart', 'wheel'])('starts at once on the first %j, before the hero has settled', (eventName) => {
    startWhenSettled(start);

    window.dispatchEvent(new Event(eventName));

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts only once however many inputs and settles follow', () => {
    runIdleCallbacksAtOnce();
    startWhenSettled(start);

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('wheel'));
    window.dispatchEvent(new Event(HERO_SETTLED_EVENT));
    vi.advanceTimersByTime(FALLBACK_DELAY_MS);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it.each(['on', 'off'])('starts at once when the page opens at a hash, with motion %s', (motion) => {
    document.documentElement.dataset.motion = motion;
    vi.stubGlobal('requestIdleCallback', vi.fn<(task: () => void) => void>());
    window.location.hash = '#about';

    startWhenSettled(start);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts anyway when the hero never settles', () => {
    runIdleCallbacksAtOnce();
    startWhenSettled(start);

    vi.advanceTimersByTime(FALLBACK_DELAY_MS - 1);
    expect(start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts when the browser is idle with no hero to wait for when motion is off', () => {
    document.documentElement.dataset.motion = 'off';
    runIdleCallbacksAtOnce();

    startWhenSettled(start);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts on the next timer where the browser has no idle callbacks', () => {
    document.documentElement.dataset.motion = 'off';
    vi.stubGlobal('requestIdleCallback', undefined);
    startWhenSettled(start);

    expect(start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);

    expect(start).toHaveBeenCalledTimes(1);
  });
});
