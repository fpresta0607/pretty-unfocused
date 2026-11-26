import { createTimeline, utils } from 'animejs';
import { module as Module } from 'modujs';

import { SCRIPT_WIPE_AT } from './about.ts';
import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { EASE_POP } from './motion-tokens.ts';
import { hasEntered, isRevealOpen, revealSectionHeading } from './section-heading-reveal.ts';

const MAX_STAGGER_STEPS = 6;
const STICKER_TILT_DEGREES = -8;
const STICKER_HIDDEN_ROTATION = -24;
const MINI_CARD_HIDE_FROM_FRACTION = 0.85;

export class Archive extends Module {
  private pendingRows: HTMLElement[] = [];
  private heading: HTMLElement | null = null;
  private sticker: HTMLElement | null = null;
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

  private readonly updateMiniCardVisibility = (): void => {
    const { top, bottom } = this.el.getBoundingClientRect();
    const edge = window.innerHeight * MINI_CARD_HIDE_FROM_FRACTION;
    document.documentElement.toggleAttribute('data-archive-in-view', top < edge && bottom > edge);
  };

  init(): void {
    this.el.querySelectorAll('[data-archive="trigger"]').forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
    this.el.setAttribute('data-archive-ready', '');
    this.el.addEventListener('click', this.handleClick);
    window.addEventListener('scroll', this.updateMiniCardVisibility, { passive: true });
    window.addEventListener('resize', this.updateMiniCardVisibility);
    this.updateMiniCardVisibility();
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.heading = this.el.querySelector<HTMLElement>('[data-heading-group]');
    this.heading?.setAttribute('data-reveal', 'pending');
    this.sticker = this.el.querySelector<HTMLElement>('[data-archive="sticker"]');
    utils.set(this.sticker ?? [], { opacity: 0, scale: 0, rotate: STICKER_HIDDEN_ROTATION });
    this.pendingRows = Array.from(this.el.querySelectorAll<HTMLElement>('[data-archive="row"]'));
    this.pendingRows.forEach((row) => row.setAttribute('data-reveal', 'pending'));
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
    this.update();
  }

  destroy(): void {
    this.el.removeEventListener('click', this.handleClick);
    window.removeEventListener('scroll', this.updateMiniCardVisibility);
    window.removeEventListener('resize', this.updateMiniCardVisibility);
    document.documentElement.removeAttribute('data-archive-in-view');
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
      this.revealRows();
    }
    if (this.heading === null && this.pendingRows.length === 0) {
      this.stopWatching();
    }
  }

  private revealHeading(isSmoothScroll: boolean): void {
    if (this.heading !== null && hasEntered(this.heading, isSmoothScroll)) {
      revealSectionHeading(this.heading);
      this.popSticker();
      this.heading = null;
    }
  }

  private popSticker(): void {
    if (this.sticker === null) {
      return;
    }
    createTimeline().add(
      this.sticker,
      { opacity: [0, 1], scale: [0, 1], rotate: [STICKER_HIDDEN_ROTATION, STICKER_TILT_DEGREES], ease: EASE_POP, duration: 300 },
      SCRIPT_WIPE_AT,
    );
    this.sticker = null;
  }

  private revealRows(): void {
    let stagger = 0;
    for (let row = this.pendingRows[0]; row !== undefined && row.getBoundingClientRect().top < window.innerHeight; row = this.pendingRows[0]) {
      row.style.setProperty('--stagger', String(Math.min(stagger, MAX_STAGGER_STEPS)));
      row.removeAttribute('data-reveal');
      this.pendingRows.shift();
      stagger += 1;
    }
  }
}
