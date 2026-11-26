import { module as Module } from 'modujs';

import { cardDeal, dealProgress, dealRanks } from './clips-logic.ts';
import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { hasEntered, isRevealOpen, revealSectionHeading } from './section-heading-reveal.ts';

export class Clips extends Module {
  private cards: HTMLElement[] = [];
  private ranks: number[] = [];
  private heading: HTMLElement | null = null;
  private lastProgress = Number.NaN;
  private pendingFrame: number | undefined;
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
    this.centreFan();
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.cards = Array.from(this.el.querySelectorAll<HTMLElement>('[data-clips="card"]'));
    this.ranks = dealRanks(this.cards.map((card) => Number(card.style.getPropertyValue('--fan-position'))));
    this.heading = this.el.querySelector<HTMLElement>('[data-heading-group]');
    this.heading?.setAttribute('data-reveal', 'pending');
    this.update();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
  }

  destroy(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private centreFan(): void {
    const fan = this.el.querySelector<HTMLElement>('[data-clips="fan"]');
    if (fan !== null) {
      fan.scrollLeft = (fan.scrollWidth - fan.clientWidth) / 2;
    }
  }

  private update(): void {
    const progress = dealProgress(this.el.getBoundingClientRect().top, window.innerHeight);
    if (progress !== this.lastProgress) {
      this.lastProgress = progress;
      this.cards.forEach((card, index) => {
        card.style.setProperty('--deal', cardDeal(progress, this.ranks[index] ?? 0, this.cards.length).toFixed(4));
      });
    }
    const isSmoothScroll = this.smoothScrollDevice.matches;
    if (this.heading !== null && isRevealOpen(this.el, isSmoothScroll) && hasEntered(this.heading, isSmoothScroll)) {
      revealSectionHeading(this.heading);
      this.heading = null;
    }
  }
}
