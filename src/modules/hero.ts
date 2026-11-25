import { createTimeline, stagger, utils } from 'animejs';
import { module as Module } from 'modujs';

import { EASE_OUT, EASE_POP } from './motion-tokens.ts';
import { isMotionEnabled } from './motion-state.ts';
import { splitIntoLines } from './split-lines.ts';

const MASK_HIDDEN = '115%';
const SCRIPT_HIDDEN = '190%';
const SCRIPT_CLIPPED = 'inset(-2em -2em 0.27em -2em)';
const SCRIPT_UNCLIPPED = 'inset(-2em -2em -2em -2em)';
const cardClip = (bottomInset: string, radius: string): string =>
  `inset(0% 0% ${bottomInset} 0% round ${radius})`;
const CARD_RISE_EXTRA_DEGREES = 4;
const STICKER_TILT_DEGREES = -8;
const PILL_START_SCALE = 0.6;
const LETTERS_AT = 0;
const SCRIPT_AT = 80;
const CARD_AT = 120;
const CARD_WIPE_DURATION = 360;
const CARD_TEXT_AT = 280;
const CARD_TEXT_STAGGER = 55;
const TAGLINE_AT = 440;
const STAGGER_STEP = 60;

export class Hero extends Module {
  init(): void {
    const root = document.documentElement;
    if (!isMotionEnabled(root)) {
      return;
    }
    if (root.dataset.intro === 'pending') {
      return;
    }
    if (root.dataset.heroState === 'pending') {
      this.reveal();
    }
  }

  reveal(delay = 0): void {
    const letters = this.el.querySelectorAll('[data-hero="letter"]:not([data-held])');
    const script = this.el.querySelectorAll('[data-hero="script"]');
    const scriptMask = this.el.querySelectorAll('.hero-script');
    const lines = this.el.querySelectorAll('[data-hero="line"]');
    const card = this.el.querySelectorAll('[data-hero="card"]');
    const cardText = this.el.querySelectorAll('[data-hero="card-text"]');
    const sticker = this.el.querySelectorAll('[data-hero="sticker"]');
    const leadElement = this.el.querySelector<HTMLElement>('.hero-schedule-text');
    const leadText = leadElement === null ? undefined : splitIntoLines(leadElement);
    const leadLines = leadText?.lines ?? [];
    const pills = this.el.querySelectorAll('.hero-schedule .pill');
    const cardTiltDegrees = parseFloat(getComputedStyle(this.el).getPropertyValue('--card-tilt'));
    const cardRiseStartDegrees = cardTiltDegrees + CARD_RISE_EXTRA_DEGREES;
    const cardRadius = card[0] ? getComputedStyle(card[0]).borderTopLeftRadius : '0px';
    const cardClipped = cardClip('100%', cardRadius);
    const cardRevealed = cardClip('0%', cardRadius);

    utils.set(letters, { translateY: MASK_HIDDEN });
    utils.set(script, { translateY: SCRIPT_HIDDEN });
    utils.set(scriptMask, { clipPath: SCRIPT_CLIPPED });
    utils.set(lines, { translateY: MASK_HIDDEN });
    utils.set(leadLines, { translateY: MASK_HIDDEN });
    utils.set(card, { clipPath: cardClipped, rotate: cardRiseStartDegrees });
    utils.set(cardText, { translateY: MASK_HIDDEN });
    utils.set(sticker, { opacity: 0, scale: 0, rotate: -24 });
    utils.set(pills, { opacity: 0, scale: PILL_START_SCALE });
    card.forEach((element) => element instanceof HTMLElement && (element.dataset.revealing = ''));
    delete document.documentElement.dataset.heroState;

    createTimeline({
      defaults: { ease: EASE_OUT, duration: 420 },
      onComplete: () => {
        leadText?.restore();
        card.forEach((element) => {
          if (element instanceof HTMLElement) {
            delete element.dataset.revealing;
            element.style.removeProperty('transform');
          }
        });
        [...scriptMask, ...card].forEach(
          (element) => element instanceof HTMLElement && element.style.removeProperty('clip-path'),
        );
      },
    })
      .add(
        letters,
        { translateY: [MASK_HIDDEN, '0%'], delay: stagger(18), duration: 440 },
        delay + LETTERS_AT,
      )
      .add(script, { translateY: [SCRIPT_HIDDEN, '0%'], duration: 460 }, delay + SCRIPT_AT)
      .add(
        scriptMask,
        { clipPath: [SCRIPT_CLIPPED, SCRIPT_UNCLIPPED], duration: 160, ease: 'linear' },
        delay + SCRIPT_AT + 380,
      )
      .add(
        card,
        { clipPath: [cardClipped, cardRevealed], duration: CARD_WIPE_DURATION },
        delay + CARD_AT,
      )
      .add(
        card,
        {
          rotate: [cardRiseStartDegrees, cardTiltDegrees],
          duration: CARD_WIPE_DURATION,
          ease: EASE_POP,
        },
        delay + CARD_AT,
      )
      .add(
        cardText,
        { translateY: [MASK_HIDDEN, '0%'], delay: stagger(CARD_TEXT_STAGGER), duration: 280 },
        delay + CARD_TEXT_AT,
      )
      .add(
        lines,
        { translateY: [MASK_HIDDEN, '0%'], delay: stagger(STAGGER_STEP), duration: 280 },
        delay + TAGLINE_AT,
      )
      .add(
        leadLines,
        { translateY: [MASK_HIDDEN, '0%'], delay: stagger(STAGGER_STEP), duration: 280 },
        delay + TAGLINE_AT + STAGGER_STEP,
      )
      .add(
        pills,
        { opacity: [0, 1], scale: [PILL_START_SCALE, 1], duration: 280, ease: EASE_POP },
        delay + TAGLINE_AT + STAGGER_STEP,
      )
      .add(
        sticker,
        {
          opacity: [0, 1],
          scale: [0, 1],
          rotate: [-24, STICKER_TILT_DEGREES],
          ease: EASE_POP,
          duration: 300,
        },
        delay + TAGLINE_AT + STAGGER_STEP,
      );
  }
}
