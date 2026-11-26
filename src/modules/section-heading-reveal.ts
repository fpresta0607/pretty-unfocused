import { createTimeline, stagger, utils } from 'animejs';

import {
  LINE_STAGGER,
  MASK_HIDDEN,
  MOVE_DURATION,
  SCRIPT_HIDDEN,
  SCRIPT_SHOWN,
  SCRIPT_WIPE_AT,
  SCRIPT_WIPE_DURATION,
} from './about.ts';
import { EASE_OUT } from './motion-tokens.ts';
import { REVEAL_FROM_SWEEP_PROGRESS, sweepProgress } from './stain-edge.ts';

const ENTER_FRACTION = 0.88;
const NATIVE_SCROLL_ENTER_FRACTION = 1;

export function isRevealOpen(section: HTMLElement, isSmoothScroll: boolean): boolean {
  return !isSmoothScroll || sweepProgress(section.getBoundingClientRect().top, window.innerHeight) >= REVEAL_FROM_SWEEP_PROGRESS;
}

export function hasEntered(target: HTMLElement, isSmoothScroll: boolean): boolean {
  const enterFraction = isSmoothScroll ? ENTER_FRACTION : NATIVE_SCROLL_ENTER_FRACTION;
  return target.getBoundingClientRect().top < window.innerHeight * enterFraction;
}

export function revealSectionHeading(heading: HTMLElement): void {
  const lines = heading.querySelectorAll<HTMLElement>('[data-heading="line"]');
  const script = heading.querySelectorAll<HTMLElement>('[data-heading="script"]');
  utils.set(lines, { translateY: MASK_HIDDEN });
  utils.set(script, { clipPath: SCRIPT_HIDDEN });
  delete heading.dataset.reveal;

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
