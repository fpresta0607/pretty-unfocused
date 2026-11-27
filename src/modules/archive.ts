import { createTimeline, utils } from 'animejs';
import { module as Module } from 'modujs';

import { SCRIPT_WIPE_AT } from './about.ts';
import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { EASE_POP } from './motion-tokens.ts';
import { hasEntered, isRevealOpen, revealSectionHeading } from './section-heading-reveal.ts';

const MAX_STAGGER_STEPS = 6;
const STICKER_TILT_DEGREES = -8;
const STICKER_HIDDEN_ROTATION = -24;
const LANDED_ROW_FRACTION = 0.75;
const SCROLL_PASSES = 3;
const READER_INPUTS = ['keydown', 'wheel', 'touchstart', 'pointerdown'] as const;

export class Archive extends Module {
  private pendingRows: HTMLElement[] = [];
  private heading: HTMLElement | null = null;
  private sticker: HTMLElement | null = null;
  private pendingFrame: number | undefined;
  private stopScrollingAgain = (): void => undefined;
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
    if (trigger === null) {
      return;
    }
    const isOpening = trigger.getAttribute('aria-expanded') !== 'true';
    trigger.setAttribute('aria-expanded', String(isOpening));
    if (isOpening) {
      this.bringRowIntoView(trigger);
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
    this.sticker = this.el.querySelector<HTMLElement>('[data-archive="sticker"]');
    utils.set(this.sticker ?? [], { opacity: 0, scale: 0, rotate: STICKER_HIDDEN_ROTATION });
    this.pendingRows = this.smoothScrollDevice.matches ? Array.from(this.el.querySelectorAll<HTMLElement>('[data-archive="row"]')) : [];
    this.pendingRows.forEach((row) => row.setAttribute('data-reveal', 'pending'));
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
    this.update();
  }

  destroy(): void {
    this.el.removeEventListener('click', this.handleClick);
    this.stopScrollingAgain();
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

  private bringRowIntoView(trigger: Element): void {
    const panel = trigger.nextElementSibling;
    if (panel === null) {
      return;
    }
    const behavior = isMotionEnabled(document.documentElement) ? 'smooth' : 'instant';
    const scroll = (passesLeft = SCROLL_PASSES): void => {
      if (trigger.getAttribute('aria-expanded') !== 'true') {
        return;
      }
      const { scrollPaddingTop, scrollPaddingBottom } = getComputedStyle(document.documentElement);
      const { top, bottom } = trigger.getBoundingClientRect();
      const frameTop = Number.parseFloat(scrollPaddingTop) || 0;
      const overflowBelow = panel.getBoundingClientRect().bottom - (window.innerHeight - (Number.parseFloat(scrollPaddingBottom) || 0));
      let distance = 0;
      if (overflowBelow > 0) {
        distance = Math.min(overflowBelow, Math.max(bottom - frameTop, 0));
      } else if (top < frameTop) {
        distance = Math.max(top - frameTop, overflowBelow);
      }
      if (distance !== 0) {
        window.scrollBy({ top: distance, behavior });
        if (passesLeft > 1) {
          this.scrollAgainWhenScrollEnds(() => scroll(passesLeft - 1));
        }
      }
    };
    if (!(Number.parseFloat(getComputedStyle(panel).transitionDuration) > 0)) {
      scroll();
      return;
    }
    const scrollWhenOpen = (event: Event): void => {
      if (event instanceof TransitionEvent && event.propertyName === 'grid-template-rows') {
        panel.removeEventListener('transitionend', scrollWhenOpen);
        scroll();
      }
    };
    panel.addEventListener('transitionend', scrollWhenOpen);
  }

  private scrollAgainWhenScrollEnds(scrollAgain: () => void): void {
    this.stopScrollingAgain();
    const stop = (): void => {
      window.removeEventListener('scrollend', handleScrollEnd);
      READER_INPUTS.forEach((type) => window.removeEventListener(type, stop));
      this.stopScrollingAgain = () => undefined;
    };
    const handleScrollEnd = (): void => {
      stop();
      scrollAgain();
    };
    window.addEventListener('scrollend', handleScrollEnd);
    READER_INPUTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    this.stopScrollingAgain = stop;
  }

  private revealRows(): void {
    let stagger = 0;
    for (let row = this.pendingRows[0]; row !== undefined && row.getBoundingClientRect().top < window.innerHeight; row = this.pendingRows[0]) {
      if (row.getBoundingClientRect().top < window.innerHeight * LANDED_ROW_FRACTION) {
        row.setAttribute('data-landed', '');
      }
      row.style.setProperty('--stagger', String(Math.min(stagger, MAX_STAGGER_STEPS)));
      row.removeAttribute('data-reveal');
      this.pendingRows.shift();
      stagger += 1;
    }
  }
}
