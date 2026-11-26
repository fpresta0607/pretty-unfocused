import { createTimeline, stagger, utils } from 'animejs';
import { module as Module } from 'modujs';

import {
  LINE_STAGGER,
  MASK_HIDDEN,
  MOVE_DURATION,
  SCRIPT_HIDDEN,
  SCRIPT_SHOWN,
  SCRIPT_WIPE_AT,
  SCRIPT_WIPE_DURATION,
} from './about.ts';
import { isFooterInView, riseProgress } from './footer-logic.ts';
import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { EASE_OUT } from './motion-tokens.ts';
import { REVEAL_FROM_SWEEP_PROGRESS, sweepProgress } from './stain-edge.ts';

const ENTER_FRACTION = 0.88;
const NATIVE_SCROLL_ENTER_FRACTION = 1;

export class Footer extends Module {
  private heading: HTMLElement | null = null;
  private readonly word = this.el.querySelector<HTMLElement>('.footer-word');
  private pendingFrame: number | undefined;
  private riseValue = '';
  private readonly smoothScrollDevice = window.matchMedia(SMOOTH_SCROLL_DEVICE_QUERY);

  private readonly scheduleUpdate = (): void => {
    if (this.pendingFrame !== undefined) {
      return;
    }
    this.pendingFrame = window.requestAnimationFrame(() => {
      this.pendingFrame = undefined;
      this.update();
    });
  };

  init(): void {
    if (isMotionEnabled(document.documentElement)) {
      this.heading = this.el.querySelector<HTMLElement>('[data-footer-group="heading"]');
      this.heading?.setAttribute('data-reveal', 'pending');
    }
    this.update();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
  }

  destroy(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
    document.documentElement.removeAttribute('data-footer-in-view');
  }

  private update(): void {
    const footerTop = this.el.getBoundingClientRect().top;
    document.documentElement.toggleAttribute('data-footer-in-view', isFooterInView(footerTop, window.innerHeight));
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.updateRise();
    this.updateHeading(footerTop);
  }

  private updateRise(): void {
    const root = document.documentElement;
    if (this.word === null) {
      return;
    }
    const distanceToPageEnd = root.scrollHeight - window.innerHeight - window.scrollY;
    const value = riseProgress(distanceToPageEnd, this.word.offsetHeight).toFixed(3);
    if (value !== this.riseValue) {
      this.riseValue = value;
      this.el.style.setProperty('--footer-rise', value);
    }
  }

  private updateHeading(footerTop: number): void {
    const heading = this.heading;
    if (heading === null) {
      return;
    }
    const isNativeScroll = !this.smoothScrollDevice.matches;
    const isStainAcross = sweepProgress(footerTop, window.innerHeight) >= REVEAL_FROM_SWEEP_PROGRESS;
    if (!isStainAcross && !isNativeScroll) {
      return;
    }
    const enterFraction = isNativeScroll ? NATIVE_SCROLL_ENTER_FRACTION : ENTER_FRACTION;
    if (heading.getBoundingClientRect().top >= window.innerHeight * enterFraction) {
      return;
    }
    this.heading = null;
    this.revealHeading(heading);
  }

  private revealHeading(heading: HTMLElement): void {
    const lines = heading.querySelectorAll<HTMLElement>('[data-footer="line"]');
    const script = heading.querySelectorAll<HTMLElement>('[data-footer="script"]');
    utils.set(lines, { translateY: MASK_HIDDEN });
    utils.set(script, { clipPath: SCRIPT_HIDDEN });
    heading.removeAttribute('data-reveal');

    createTimeline({
      defaults: { ease: EASE_OUT, duration: MOVE_DURATION },
      onComplete: () => {
        lines.forEach((line) => line.style.removeProperty('transform'));
        script.forEach((word) => word.style.removeProperty('clip-path'));
      },
    })
      .add(lines, { translateY: [MASK_HIDDEN, '0%'], delay: stagger(LINE_STAGGER) }, 0)
      .add(script, { clipPath: [SCRIPT_HIDDEN, SCRIPT_SHOWN], duration: SCRIPT_WIPE_DURATION }, SCRIPT_WIPE_AT);
  }
}
