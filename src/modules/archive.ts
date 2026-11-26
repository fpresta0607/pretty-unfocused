import { module as Module } from 'modujs';

import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { hasEntered, isRevealOpen, revealSectionHeading } from './section-heading-reveal.ts';

const MAX_STAGGER_STEPS = 6;

export class Archive extends Module {
  private pendingRows: HTMLElement[] = [];
  private heading: HTMLElement | null = null;
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

  private readonly handleClick = (event: MouseEvent): void => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-archive="trigger"]') : null;
    if (trigger !== null) {
      trigger.setAttribute('aria-expanded', String(trigger.getAttribute('aria-expanded') !== 'true'));
    }
  };

  init(): void {
    this.el.querySelectorAll('[data-archive="trigger"]').forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
    this.el.setAttribute('data-archive-ready', '');
    this.el.addEventListener('click', this.handleClick);
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.heading = this.el.querySelector<HTMLElement>('[data-heading-group]');
    this.heading?.setAttribute('data-reveal', 'pending');
    this.pendingRows = Array.from(this.el.querySelectorAll<HTMLElement>('[data-archive="row"]'));
    this.pendingRows.forEach((row) => row.setAttribute('data-reveal', 'pending'));
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
    this.update();
  }

  destroy(): void {
    this.el.removeEventListener('click', this.handleClick);
    this.stopWatching();
  }

  private stopWatching(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private update(): void {
    const isSmoothScroll = this.smoothScrollDevice.matches;
    if (isRevealOpen(this.el, isSmoothScroll)) {
      this.revealHeading(isSmoothScroll);
      this.revealRows(isSmoothScroll);
    }
    if (this.heading === null && this.pendingRows.length === 0) {
      this.stopWatching();
    }
  }

  private revealHeading(isSmoothScroll: boolean): void {
    if (this.heading !== null && hasEntered(this.heading, isSmoothScroll)) {
      revealSectionHeading(this.heading);
      this.heading = null;
    }
  }

  private revealRows(isSmoothScroll: boolean): void {
    let stagger = 0;
    for (let row = this.pendingRows[0]; row !== undefined && hasEntered(row, isSmoothScroll); row = this.pendingRows[0]) {
      row.style.setProperty('--stagger', String(Math.min(stagger, MAX_STAGGER_STEPS)));
      row.removeAttribute('data-reveal');
      this.pendingRows.shift();
      stagger += 1;
    }
  }
}
