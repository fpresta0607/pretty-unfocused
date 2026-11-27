import { module as Module } from 'modujs';

import { cardDeal, dealRanks, pinnedDealProgress, rowDealProgress } from './clips-logic.ts';
import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { hasEntered, isRevealOpen, revealSectionHeading } from './section-heading-reveal.ts';

export class Clips extends Module {
  private cards: HTMLElement[] = [];
  private ranks: number[] = [];
  private heading: HTMLElement | null = null;
  private fan: HTMLElement | null = null;
  private inner: HTMLElement | null = null;
  private dashes: HTMLElement[] = [];
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

  private readonly updateDashes = (): void => {
    if (this.fan === null) {
      return;
    }
    const travel = this.fan.scrollWidth - this.fan.clientWidth;
    const activeIndex = travel > 0 ? Math.round((this.fan.scrollLeft / travel) * (this.dashes.length - 1)) : 0;
    this.dashes.forEach((dash, index) => {
      dash.toggleAttribute('data-active', index === activeIndex);
    });
  };

  init(): void {
    this.fan = this.el.querySelector<HTMLElement>('[data-clips="fan"]');
    this.inner = this.el.querySelector<HTMLElement>('.clips-inner');
    this.dashes = Array.from(this.el.querySelectorAll<HTMLElement>('[data-clips="dash"]'));
    this.fan?.addEventListener('scroll', this.updateDashes, { passive: true });
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
    this.fan?.removeEventListener('scroll', this.updateDashes);
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private readDealProgress(): number {
    const sectionTop = this.el.getBoundingClientRect().top;
    const isFanned = this.fan !== null && getComputedStyle(this.fan).overflowX !== 'auto';
    if (isFanned && this.inner !== null && getComputedStyle(this.inner).position === 'sticky') {
      return pinnedDealProgress(sectionTop, window.innerHeight);
    }
    const stainLift = Number.parseFloat(this.el.style.getPropertyValue('--stain-lift')) || 0;
    const naturalFanTop = (this.fan?.getBoundingClientRect().top ?? window.innerHeight) + stainLift;
    return rowDealProgress(naturalFanTop, sectionTop, window.innerHeight);
  }

  private update(): void {
    const progress = this.readDealProgress();
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
