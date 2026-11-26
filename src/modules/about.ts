import { createTimeline, stagger, utils } from 'animejs';
import { module as Module } from 'modujs';

import { EASE_OUT, EASE_POP } from './motion-tokens.ts';
import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { splitIntoLines } from './split-lines.ts';
import { REVEAL_FROM_SWEEP_PROGRESS, sweepProgress } from './stain-edge.ts';

const MASK_HIDDEN = '130%';
export const MOVE_DURATION = 800;
export const LINE_STAGGER = 120;
export const SCRIPT_WIPE_DURATION = 560;
export const SCRIPT_WIPE_AT = LINE_STAGGER + MOVE_DURATION / 2;
const SCRIPT_HIDDEN = 'inset(-2em 100% -2em 0px)';
const SCRIPT_SHOWN = 'inset(-2em 0% -2em 0px)';
const HOST_STAGGER = 220;
const HOST_DEAL_TURN_DEGREES = 16;
const HOST_DEAL_RISE = 0.45;
const HOST_DEAL_SHIFT = 0.14;
export const HOST_DEAL_OVERSHOOT_PX = 10;
const HOST_DEAL_PASS_DURATION = 520;
const DESCRIPTION_STAGGER = 70;
export const TOPIC_AT = 500;
export const TOPIC_STAGGER = 70;
export const TOPIC_DURATION = 400;
const TOPIC_START_SCALE = 0.6;
const ENTER_FRACTION = 0.88;
const NATIVE_SCROLL_ENTER_FRACTION = 1;
const NATIVE_SCROLL_HOSTS_ENTER_FRACTION = 1.3;

interface Deal {
  host: HTMLElement;
  tiltDegrees: number;
  direction: number;
  startDegrees: number;
  startShift: number;
  startRise: number;
}

export class About extends Module {
  private pendingGroups: HTMLElement[] = [];
  private pendingFrame: number | undefined;
  private isHeadingSettled = false;
  private readonly smoothScrollDevice = window.matchMedia(SMOOTH_SCROLL_DEVICE_QUERY);

  private readonly scheduleUpdate = (): void => {
    if (this.pendingFrame !== undefined) {
      return;
    }
    this.pendingFrame = window.requestAnimationFrame(() => {
      this.pendingFrame = window.requestAnimationFrame(() => {
        this.pendingFrame = undefined;
        this.update();
      });
    });
  };

  init(): void {
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.pendingGroups = Array.from(this.el.querySelectorAll<HTMLElement>('[data-about-group]'));
    this.pendingGroups.forEach((group) => {
      group.dataset.reveal = 'pending';
    });
    if (!this.smoothScrollDevice.matches) {
      this.holdHostsAtStartPose();
    }
    this.update();
    if (this.pendingGroups.length > 0) {
      window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
      window.addEventListener('resize', this.scheduleUpdate);
    }
  }

  destroy(): void {
    this.stopWatching();
  }

  private stopWatching(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private update(): void {
    const isStainAcross = sweepProgress(this.el.getBoundingClientRect().top, window.innerHeight) >= REVEAL_FROM_SWEEP_PROGRESS;
    this.pendingGroups = this.pendingGroups.filter((group) => {
      const isNativeScroll = !this.smoothScrollDevice.matches;
      if (!isStainAcross && !isNativeScroll) {
        return true;
      }
      if (group.dataset.aboutGroup === 'copy' && isNativeScroll && !this.isHeadingSettled) {
        return true;
      }
      if (group.getBoundingClientRect().top >= window.innerHeight * this.enterFractionOf(group, isNativeScroll)) {
        return true;
      }
      this.reveal(group);
      return false;
    });
    if (this.pendingGroups.length === 0) {
      this.stopWatching();
    }
  }

  private enterFractionOf(group: HTMLElement, isNativeScroll: boolean): number {
    if (!isNativeScroll) {
      return ENTER_FRACTION;
    }
    return group.dataset.aboutGroup === 'hosts' ? NATIVE_SCROLL_HOSTS_ENTER_FRACTION : NATIVE_SCROLL_ENTER_FRACTION;
  }

  private reveal(group: HTMLElement): void {
    if (group.dataset.aboutGroup === 'heading') {
      this.revealHeading(group);
    } else if (group.dataset.aboutGroup === 'hosts') {
      this.revealHosts(group);
    } else {
      this.revealCopy(group);
    }
  }

  private revealHeading(group: HTMLElement): void {
    const lines = group.querySelectorAll<HTMLElement>('[data-about="line"]');
    const script = group.querySelectorAll<HTMLElement>('[data-about="script"]');
    utils.set(lines, { translateY: MASK_HIDDEN });
    utils.set(script, { clipPath: SCRIPT_HIDDEN });
    delete group.dataset.reveal;

    createTimeline({
      defaults: { ease: EASE_OUT, duration: MOVE_DURATION },
      onComplete: () => {
        lines.forEach((line) => line.style.removeProperty('transform'));
        script.forEach((word) => word.style.removeProperty('clip-path'));
        this.isHeadingSettled = true;
        if (!this.smoothScrollDevice.matches && this.pendingGroups.length > 0) {
          this.scheduleUpdate();
        }
      },
    })
      .add(lines, { translateY: [MASK_HIDDEN, '0%'], delay: stagger(LINE_STAGGER) }, 0)
      .add(script, { clipPath: [SCRIPT_HIDDEN, SCRIPT_SHOWN], duration: SCRIPT_WIPE_DURATION }, SCRIPT_WIPE_AT);
  }

  private readDeals(group: HTMLElement): Deal[] {
    return Array.from(group.querySelectorAll<HTMLElement>('[data-about="host"]')).map((host) => {
      const tiltDegrees = parseFloat(getComputedStyle(host).getPropertyValue('--tilt'));
      const direction = tiltDegrees < 0 ? -1 : 1;
      return {
        host,
        tiltDegrees,
        direction,
        startDegrees: tiltDegrees + direction * HOST_DEAL_TURN_DEGREES,
        startShift: direction * HOST_DEAL_SHIFT * host.offsetWidth,
        startRise: HOST_DEAL_RISE * host.offsetHeight,
      };
    });
  }

  private holdHostsAtStartPose(): void {
    this.pendingGroups
      .filter((group) => group.dataset.aboutGroup === 'hosts')
      .forEach((group) =>
        this.readDeals(group).forEach(({ host, startDegrees, startShift, startRise }) =>
          utils.set(host, { translateX: startShift, translateY: startRise, rotate: startDegrees, visibility: 'visible' }),
        ),
      );
  }

  private revealHosts(group: HTMLElement): void {
    const isNativeScroll = !this.smoothScrollDevice.matches;
    const deals = this.readDeals(group);
    deals.forEach(({ host, startDegrees, startShift, startRise }) =>
      utils.set(host, { translateX: startShift, translateY: startRise, rotate: startDegrees, visibility: isNativeScroll ? 'visible' : 'hidden' }),
    );
    delete group.dataset.reveal;

    const timeline = createTimeline({
      defaults: { ease: EASE_OUT, duration: MOVE_DURATION },
      onComplete: () =>
        deals.forEach(({ host }) => {
          host.style.removeProperty('transform');
          host.style.removeProperty('visibility');
        }),
    });
    deals.forEach(({ host, direction, tiltDegrees, startDegrees, startShift, startRise }, index) => {
      const settleDuration = MOVE_DURATION - HOST_DEAL_PASS_DURATION;
      if (!isNativeScroll) {
        timeline.set(host, { visibility: 'visible' }, index * HOST_STAGGER);
      }
      timeline.add(
        host,
        {
          translateX: [
            { from: startShift, to: -direction * HOST_DEAL_OVERSHOOT_PX, ease: EASE_OUT, duration: HOST_DEAL_PASS_DURATION },
            { to: 0, ease: EASE_POP, duration: settleDuration },
          ],
          translateY: [
            { from: startRise, to: -HOST_DEAL_OVERSHOOT_PX, ease: EASE_OUT, duration: HOST_DEAL_PASS_DURATION },
            { to: 0, ease: EASE_POP, duration: settleDuration },
          ],
          rotate: [startDegrees, tiltDegrees],
          ease: EASE_POP,
        },
        index * HOST_STAGGER,
      );
    });
  }

  private revealCopy(group: HTMLElement): void {
    const descriptionElement = group.querySelector<HTMLElement>('[data-about="description"]');
    const description = descriptionElement === null ? undefined : splitIntoLines(descriptionElement);
    const descriptionLines = description?.lines ?? [];
    const topics = group.querySelectorAll<HTMLElement>('[data-about="topic"]');
    utils.set(descriptionLines, { translateY: MASK_HIDDEN });
    utils.set(topics, { opacity: 0, scale: TOPIC_START_SCALE });
    delete group.dataset.reveal;

    const settleNow = (): void => {
      timeline.complete();
    };
    const timeline = createTimeline({
      defaults: { ease: EASE_OUT, duration: MOVE_DURATION },
      onComplete: () => {
        window.removeEventListener('resize', settleNow);
        document.fonts.removeEventListener('loadingdone', settleNow);
        description?.restore();
        topics.forEach((topic) => {
          topic.style.removeProperty('opacity');
          topic.style.removeProperty('transform');
        });
      },
    });
    window.addEventListener('resize', settleNow);
    document.fonts.addEventListener('loadingdone', settleNow);

    timeline
      .add(descriptionLines, { translateY: [MASK_HIDDEN, '0%'], delay: stagger(DESCRIPTION_STAGGER) }, 0)
      .add(
        topics,
        {
          opacity: [0, 1],
          scale: [TOPIC_START_SCALE, 1],
          delay: stagger(TOPIC_STAGGER),
          duration: TOPIC_DURATION,
        },
        TOPIC_AT,
      );
  }
}
