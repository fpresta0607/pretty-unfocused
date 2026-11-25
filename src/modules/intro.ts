import { createTimeline, stagger } from 'animejs';
import { module as Module } from 'modujs';

import { EASE_OUT, EASE_WIPE } from './motion-tokens.ts';
import { isMotionEnabled, markIntroSeen } from './motion-state.ts';

const HOLD_AFTER_ENTRY_MS = 140;
const SKIP_GRACE_MS = 400;
const LIFT_DURATION = 520;
const PANEL_LIFT_AT = 120;
const CURTAIN_CLEAR_MARGIN_PX = 12;
const CURTAIN_SAMPLES = 120;
const LINES_OUT_AT = 0;
const LINE_OUT_DURATION = 190;
const LINE_OUT_STAGGER = 30;
const RING_FLIGHT_AT = LINES_OUT_AT + LINE_OUT_DURATION;
const FRAME_READY_AT = 680;
const RING_FLIGHT_DURATION = 520;
const LINE_LIFT = '-30%';
const LINE_MASK_OPEN = 'inset(0% 0% 0% 0%)';
const LINE_MASK_CLOSED = 'inset(0% 0% 100% 0%)';
const FAST_PLAYBACK_RATE = 2;
const SKIP_EVENTS = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;

interface RingFlight {
  element: HTMLImageElement;
  landing: HTMLImageElement;
  deltaX: number;
  deltaY: number;
  scale: number;
}

export class Intro extends Module {
  private exitTimeout: number | undefined;
  private timeline: ReturnType<typeof createTimeline> | undefined;
  private hasExited = false;

  init(): void {
    const root = document.documentElement;
    if (root.dataset.intro !== 'pending' || !isMotionEnabled(root)) {
      this.el.remove();
      return;
    }
    markIntroSeen();

    SKIP_EVENTS.forEach((eventName) => window.addEventListener(eventName, this.skip, { passive: true }));
    const entryAnimations = Array.from(
      this.el.querySelectorAll('[data-intro="ring"], [data-intro="line"]'),
    ).flatMap((element) => element.getAnimations());
    void Promise.allSettled(entryAnimations.map((animation) => animation.finished)).then(() => {
      this.exitTimeout = window.setTimeout(() => this.exit(1), HOLD_AFTER_ENTRY_MS);
    });
  }

  destroy(): void {
    this.removeSkipListeners();
    window.clearTimeout(this.exitTimeout);
    this.timeline?.pause();
  }

  private readonly skip = (): void => {
    if (performance.now() >= SKIP_GRACE_MS) {
      this.exit(FAST_PLAYBACK_RATE);
    }
  };

  private exit(playbackRate: number): void {
    if (this.hasExited) {
      return;
    }
    this.hasExited = true;
    this.removeSkipListeners();
    window.clearTimeout(this.exitTimeout);

    const root = document.documentElement;
    if (root.dataset.intro !== 'pending') {
      this.el.remove();
      return;
    }
    const panel = this.el.querySelectorAll('[data-intro="panel"]');
    const ring = this.el.querySelector<HTMLImageElement>('[data-intro="ring"]');
    const heroRing = document.querySelector<HTMLImageElement>('.hero-ring');
    const flier = ring === null || heroRing === null ? undefined : this.launchRing(ring, heroRing);
    const lines = this.el.querySelectorAll('[data-intro="line"]');
    const lineMasks = this.el.querySelectorAll('.intro-mask');

    root.dataset.intro = 'leaving';
    this.call('reveal', Math.round((PANEL_LIFT_AT + this.curtainClearsWordAt()) / playbackRate), 'hero');

    this.timeline = createTimeline({
      defaults: { ease: EASE_OUT },
      playbackRate,
      onComplete: () => this.finish(),
    })
      .add(panel, { translateY: ['0%', '-100%'], duration: LIFT_DURATION, ease: EASE_WIPE }, PANEL_LIFT_AT)
      .add(lines, { translateY: ['0%', LINE_LIFT], duration: LINE_OUT_DURATION, delay: stagger(LINE_OUT_STAGGER) }, LINES_OUT_AT)
      .add(
        lineMasks,
        { clipPath: [LINE_MASK_OPEN, LINE_MASK_CLOSED], duration: LINE_OUT_DURATION, delay: stagger(LINE_OUT_STAGGER) },
        LINES_OUT_AT,
      )
      .call(() => {
        root.dataset.frameReady = '';
      }, FRAME_READY_AT);

    if (flier !== undefined) {
      this.timeline
        .add(
          flier.element,
          {
            translateX: [0, flier.deltaX],
            translateY: [0, flier.deltaY],
            scale: [1, flier.scale],
            duration: RING_FLIGHT_DURATION,
          },
          RING_FLIGHT_AT,
        )
        .call(() => {
          flier.landing.style.removeProperty('visibility');
          delete flier.landing.dataset.held;
          flier.element.remove();
        }, RING_FLIGHT_AT + RING_FLIGHT_DURATION);
    }
  }

  private curtainClearsWordAt(): number {
    const panel = this.el.querySelector('[data-intro="panel"]');
    const word = document.querySelector('.hero-word');
    if (panel === null || word === null) {
      return LIFT_DURATION;
    }
    const wordBottom = word.getBoundingClientRect().bottom;
    const targetProgress = 1 - (wordBottom - CURTAIN_CLEAR_MARGIN_PX) / panel.getBoundingClientRect().height;
    for (let sample = 0; sample <= CURTAIN_SAMPLES; sample += 1) {
      if (EASE_WIPE(sample / CURTAIN_SAMPLES) >= targetProgress) {
        return Math.round((sample / CURTAIN_SAMPLES) * LIFT_DURATION);
      }
    }
    return LIFT_DURATION;
  }

  private launchRing(ring: HTMLImageElement, landing: HTMLImageElement): RingFlight {
    const ringRect = ring.getBoundingClientRect();
    const landingRect = landing.getBoundingClientRect();
    const element = document.createElement('img');
    element.src = ring.currentSrc;
    element.alt = '';
    element.style.cssText = `position:fixed;margin:0;pointer-events:none;left:${ringRect.left}px;top:${ringRect.top}px;width:${ringRect.width}px;height:${ringRect.height}px`;
    this.el.append(element);
    ring.style.visibility = 'hidden';
    landing.dataset.held = '';
    landing.style.visibility = 'hidden';
    return {
      element,
      landing,
      deltaX: landingRect.left + landingRect.width / 2 - (ringRect.left + ringRect.width / 2),
      deltaY: landingRect.top + landingRect.height / 2 - (ringRect.top + ringRect.height / 2),
      scale: landingRect.width / ringRect.width,
    };
  }

  private removeSkipListeners(): void {
    SKIP_EVENTS.forEach((eventName) => window.removeEventListener(eventName, this.skip));
  }

  private finish(): void {
    delete document.documentElement.dataset.intro;
    this.el.remove();
  }
}
