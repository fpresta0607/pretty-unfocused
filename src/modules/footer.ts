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
import { sweepProgress } from './stain-edge.ts';

const REVEAL_FROM_SWEEP_PROGRESS = 0.1;
const EMAIL_AT = SCRIPT_WIPE_AT + 100;
const EMAIL_WIPE_DURATION = 450;
const LINKS_AT = EMAIL_AT + 100;
const LINK_STAGGER = 80;
const LINK_WIPE_DURATION = 350;

export class Footer extends Module {
  private isPending = false;
  private readonly heading = this.el.querySelector<HTMLElement>('[data-footer-group="heading"]');
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
    if (isMotionEnabled(document.documentElement) && this.smoothScrollDevice.matches) {
      this.isPending = true;
      this.el.setAttribute('data-reveal', 'pending');
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
    const root = document.documentElement;
    root.toggleAttribute('data-footer-in-view', isFooterInView(footerTop, window.innerHeight));
    if (isMotionEnabled(root)) {
      this.updateRise();
      this.updateReveal(footerTop);
    }
  }

  private updateRise(): void {
    if (this.word === null) {
      return;
    }
    const distanceToPageEnd = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    const restTop = this.word.getBoundingClientRect().top - distanceToPageEnd;
    const value = riseProgress(distanceToPageEnd, window.innerHeight - restTop).toFixed(3);
    if (value !== this.riseValue) {
      this.riseValue = value;
      this.el.style.setProperty('--footer-rise', value);
    }
  }

  private updateReveal(footerTop: number): void {
    if (!this.isPending || this.heading === null) {
      return;
    }
    if (sweepProgress(footerTop, window.innerHeight) < REVEAL_FROM_SWEEP_PROGRESS) {
      return;
    }
    this.isPending = false;
    this.reveal(this.heading);
  }

  private reveal(heading: HTMLElement): void {
    const lines = heading.querySelectorAll<HTMLElement>('[data-footer="line"]');
    const script = heading.querySelectorAll<HTMLElement>('[data-footer="script"]');
    const email = this.el.querySelectorAll<HTMLElement>('[data-footer="email"]');
    const links = this.el.querySelectorAll<HTMLElement>('[data-footer="link"]');
    const items = [...email, ...links];
    utils.set(lines, { translateY: MASK_HIDDEN });
    utils.set(script, { clipPath: SCRIPT_HIDDEN });
    utils.set(items, { clipPath: SCRIPT_HIDDEN });
    this.el.removeAttribute('data-reveal');

    createTimeline({
      defaults: { ease: EASE_OUT, duration: MOVE_DURATION },
      onComplete: () => {
        lines.forEach((line) => line.style.removeProperty('transform'));
        script.forEach((word) => word.style.removeProperty('clip-path'));
        items.forEach((item) => item.style.removeProperty('clip-path'));
      },
    })
      .add(lines, { translateY: [MASK_HIDDEN, '0%'], delay: stagger(LINE_STAGGER) }, 0)
      .add(script, { clipPath: [SCRIPT_HIDDEN, SCRIPT_SHOWN], duration: SCRIPT_WIPE_DURATION }, SCRIPT_WIPE_AT)
      .add(email, { clipPath: [SCRIPT_HIDDEN, SCRIPT_SHOWN], duration: EMAIL_WIPE_DURATION }, EMAIL_AT)
      .add(links, { clipPath: [SCRIPT_HIDDEN, SCRIPT_SHOWN], duration: LINK_WIPE_DURATION, delay: stagger(LINK_STAGGER) }, LINKS_AT);
  }
}
