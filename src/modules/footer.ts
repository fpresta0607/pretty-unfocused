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
import { isMotionEnabled } from './motion-state.ts';
import { EASE_OUT } from './motion-tokens.ts';
import { sweepProgress } from './stain-edge.ts';

const REVEAL_FROM_SWEEP_PROGRESS = 0.4;
const EMAIL_AT = SCRIPT_WIPE_AT + 120;
const LINKS_AT = EMAIL_AT + 260;
const LINK_STAGGER = 110;
const ITEM_DURATION = 600;
const ITEM_HIDDEN_RISE = '0.6em';

export class Footer extends Module {
  private isPending = false;
  private readonly heading = this.el.querySelector<HTMLElement>('[data-footer-group="heading"]');
  private readonly run = this.el.querySelector<HTMLElement>('.footer-run');
  private pendingFrame: number | undefined;
  private riseValue = '';

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
    if (this.run === null) {
      return;
    }
    const distanceToPageEnd = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    const value = riseProgress(distanceToPageEnd, this.run.offsetHeight).toFixed(3);
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
    utils.set(items, { opacity: 0, translateY: ITEM_HIDDEN_RISE });
    this.el.removeAttribute('data-reveal');

    createTimeline({
      defaults: { ease: EASE_OUT, duration: MOVE_DURATION },
      onComplete: () => {
        lines.forEach((line) => line.style.removeProperty('transform'));
        script.forEach((word) => word.style.removeProperty('clip-path'));
        items.forEach((item) => {
          item.style.removeProperty('opacity');
          item.style.removeProperty('transform');
        });
      },
    })
      .add(lines, { translateY: [MASK_HIDDEN, '0%'], delay: stagger(LINE_STAGGER) }, 0)
      .add(script, { clipPath: [SCRIPT_HIDDEN, SCRIPT_SHOWN], duration: SCRIPT_WIPE_DURATION }, SCRIPT_WIPE_AT)
      .add(email, { opacity: [0, 1], translateY: [ITEM_HIDDEN_RISE, '0em'], duration: ITEM_DURATION }, EMAIL_AT)
      .add(links, { opacity: [0, 1], translateY: [ITEM_HIDDEN_RISE, '0em'], duration: ITEM_DURATION, delay: stagger(LINK_STAGGER) }, LINKS_AT);
  }
}
