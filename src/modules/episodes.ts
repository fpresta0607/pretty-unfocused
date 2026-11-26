import { module as Module } from 'modujs';

import {
  bottomBandHeight,
  type CardFit,
  type CardMeasurement,
  coverHideStep,
  coveringCardCount,
  fitCards,
  frontCardIndex,
  narrowedCardWidth,
  rowEndPadding,
  rowWidth,
  scrollTopForCard,
  trimToWholeWords,
  wholeCardCount,
} from './episodes-logic.ts';
import { isMotionEnabled } from './motion-state.ts';
import { EPISODES_REVEAL_FROM_SWEEP_PROGRESS, sweepProgress } from './stain-edge.ts';

const PROGRESS_EVENT = 'episodes-progress';
const PINNED_EDGE_TOLERANCE_PX = 1;
const NAVIGATION_EDGE_TOLERANCE_PX = 2;
const MIN_STATIC_DESCRIPTION_LINES = 2;
const MIN_SHORT_PHONE_DESCRIPTION_LINES = 1;
const PHONE_MAX_WIDTH_PX = 599;
const SHORT_PHONE_MAX_HEIGHT_PX = 760;
const MIN_PHONE_CARD_WIDTH_PX = 252;
const MAX_NARROWING_PASSES = 4;
const MIN_PINNED_DESCRIPTION_LINES = 2;
const MAX_DESCRIPTION_LINES = 6;
const LINE_FIT_TOLERANCE_PX = 1;
const MIN_CLEAR_ABOVE_ACTIONS_PX = 40;
const FLOOR_CLEAR_ABOVE_ACTIONS_PX = 24;
const MAX_CLEAR_ABOVE_ACTIONS_PX = 56;
const FRAME_BAND_GAP_PX = 16;
const DASHES_GAP_PX = 16;
const FRAME_BOTTOM_PIECES = '.mini-card, .frame-button, .frame-section';

interface CardRoom {
  preferredHeight: number | undefined;
  hardHeight: number | undefined;
}

function readProgress(event: Event): number | undefined {
  if (!(event instanceof CustomEvent)) {
    return undefined;
  }
  const detail: unknown = event.detail;
  if (typeof detail === 'object' && detail !== null && 'progress' in detail) {
    return typeof detail.progress === 'number' ? detail.progress : undefined;
  }
  return undefined;
}

export class Episodes extends Module {
  private cards: HTMLElement[] = [];
  private readonly fullTexts = new Map<HTMLElement, string>();
  private dashes: HTMLElement[] = [];
  private coverHide = Number.NaN;
  private endSteps = 0;
  private frontIndex = -1;
  private layoutFrame = 0;
  private scrollFrame: number | undefined;
  private frameClear = 0;
  private smallViewportHeight = 0;
  private navigation: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;
  private previousButton: HTMLButtonElement | null = null;
  private nextButton: HTMLButtonElement | null = null;

  init(): void {
    this.cards = Array.from(this.el.querySelectorAll<HTMLElement>('[data-episodes="card"]'));
    this.dashes = Array.from(this.el.querySelectorAll<HTMLElement>('[data-episodes="dash"]'));
    if (this.cards.length === 0) {
      return;
    }
    this.setUpNavigation();
    this.layoutCards();
    window.addEventListener('resize', this.handleResize);
    void document.fonts.ready.then(this.layoutCards);
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.setFront(0);
    this.setCovered(0);
    window.addEventListener(PROGRESS_EVENT, this.handleProgress);
    window.addEventListener('scroll', this.scheduleScroll, { passive: true });
    this.el.addEventListener('focusin', this.handleFocusIn);
    this.el.dataset.reveal = 'pending';
    this.handleScroll();
  }

  destroy(): void {
    window.removeEventListener(PROGRESS_EVENT, this.handleProgress);
    window.removeEventListener('scroll', this.scheduleScroll);
    window.removeEventListener('resize', this.handleResize);
    window.cancelAnimationFrame(this.layoutFrame);
    window.cancelAnimationFrame(this.scrollFrame ?? 0);
    this.el.removeEventListener('focusin', this.handleFocusIn);
    document.documentElement.style.removeProperty('--episodes-active');
    this.viewport?.removeEventListener('scroll', this.updateNavigation);
    window.removeEventListener('resize', this.updateNavigation);
  }

  private readonly handleResize = (): void => {
    window.cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = window.requestAnimationFrame(this.layoutCards);
  };

  private readonly layoutCards = (): void => {
    if (this.navigation !== null) {
      this.navigation.hidden = this.isPinnedLayout();
    }
    const sectionStyle = getComputedStyle(this.el);
    this.endSteps = parseFloat(sectionStyle.getPropertyValue('--end-steps')) || 0;
    this.frameClear = parseFloat(sectionStyle.getPropertyValue('--frame-clear'));
    this.smallViewportHeight = this.measureSmallViewportHeight();
    this.restoreTexts();
    this.fitCopyColumn();
    this.fitRow();
    const fit = this.fitCardsToRoom();
    this.trimTitles(fit?.titleLines);
    this.trimDescriptions();
    this.placeDashes();
    this.measureCoverSteps();
    this.updateNavigation();
  };

  private isPinnedLayout(): boolean {
    return this.viewport !== null && getComputedStyle(this.viewport).getPropertyValue('container-type') === 'size';
  }

  private fitRow(): void {
    const track = this.viewport?.querySelector<HTMLElement>('.episodes-track');
    const firstCard = this.cards[0];
    if (this.viewport === null || track === null || track === undefined || firstCard === undefined) {
      return;
    }
    this.viewport.style.removeProperty('--row-w');
    this.viewport.style.removeProperty('--row-card-w');
    track.style.removeProperty('--row-end');
    if (this.isPinnedLayout()) {
      return;
    }
    const trackStyle = getComputedStyle(track);
    const availableWidth = this.viewport.clientWidth;
    const cardWidth = firstCard.offsetWidth;
    const gap = parseFloat(trackStyle.columnGap);
    if (![availableWidth, cardWidth, gap].every(Number.isFinite) || availableWidth <= 0 || cardWidth <= 0) {
      return;
    }
    const cardCount = wholeCardCount(availableWidth, cardWidth, gap);
    this.viewport.style.setProperty('--row-card-w', `${cardWidth}px`);
    this.viewport.style.setProperty('--row-w', `${rowWidth(cardCount, cardWidth, gap)}px`);
    const minGutter = parseFloat(getComputedStyle(this.el).getPropertyValue('--gutter'));
    if (Number.isFinite(minGutter)) {
      track.style.setProperty('--row-end', `${rowEndPadding(availableWidth, cardWidth, gap, minGutter)}px`);
    }
  }

  private restoreTexts(): void {
    this.fullTexts.forEach((text, element) => {
      element.textContent = text;
    });
  }

  private trimTitles(titleLines: number | undefined): void {
    this.cards.forEach((card) => {
      const title = card.querySelector<HTMLElement>('.episode-card-title');
      if (title === null) {
        return;
      }
      title.removeAttribute('aria-label');
      const maxHeight = (titleLines ?? 0) * parseFloat(getComputedStyle(title).lineHeight);
      if (!(maxHeight > 0)) {
        return;
      }
      const fullText = this.fullTexts.get(title) ?? title.textContent ?? '';
      this.fullTexts.set(title, fullText);
      title.textContent = trimToWholeWords(fullText, (candidate) => {
        title.textContent = candidate;
        return title.offsetHeight <= maxHeight + LINE_FIT_TOLERANCE_PX;
      });
      if (title.textContent !== fullText) {
        title.setAttribute('aria-label', fullText);
      }
    });
  }

  private trimDescriptions(): void {
    this.cards.forEach((card) => {
      const description = card.querySelector<HTMLElement>('.episode-card-description');
      const lines = Number(card.style.getPropertyValue('--lines'));
      if (description === null || !(lines > 0)) {
        return;
      }
      const fullText = this.fullTexts.get(description) ?? description.textContent ?? '';
      this.fullTexts.set(description, fullText);
      const maxHeight = lines * parseFloat(getComputedStyle(description).lineHeight);
      if (!(maxHeight > 0)) {
        return;
      }
      description.style.setProperty('-webkit-line-clamp', 'none');
      description.style.setProperty('display', 'block');
      description.textContent = trimToWholeWords(fullText, (candidate) => {
        description.textContent = candidate;
        return description.scrollHeight <= maxHeight + LINE_FIT_TOLERANCE_PX;
      });
      description.style.removeProperty('-webkit-line-clamp');
      description.style.removeProperty('display');
    });
  }

  private fitCopyColumn(): void {
    this.el.style.removeProperty('--copy-w');
    const copyWidth = this.el.querySelector<HTMLElement>('.episodes-copy')?.getBoundingClientRect().width;
    if (copyWidth !== undefined && copyWidth > 0) {
      this.el.style.setProperty('--copy-w', `${Math.ceil(copyWidth)}px`);
    }
  }

  private fitCardsToRoom(): CardFit | undefined {
    let fit = this.fitCardHeights();
    for (let pass = 0; pass < MAX_NARROWING_PASSES && fit !== undefined && this.narrowCards(fit); pass += 1) {
      fit = this.fitCardHeights();
    }
    return fit;
  }

  private narrowCards(fit: CardFit): boolean {
    const firstCard = this.cards[0];
    const hardHeight = this.availableCardHeight()?.hardHeight;
    if (this.viewport === null || firstCard === undefined || hardHeight === undefined || fit.height <= hardHeight + LINE_FIT_TOLERANCE_PX || window.innerWidth > PHONE_MAX_WIDTH_PX || this.isPinnedLayout()) {
      return false;
    }
    const cardWidth = firstCard.offsetWidth;
    const thumbRatio = parseFloat(getComputedStyle(this.el).getPropertyValue('--card-thumb'));
    const width = narrowedCardWidth(cardWidth, fit.height, hardHeight, thumbRatio, MIN_PHONE_CARD_WIDTH_PX);
    if (!(width < cardWidth)) {
      return false;
    }
    this.viewport.style.setProperty('--row-card-w', `${width}px`);
    return true;
  }

  private fitCardHeights(): CardFit | undefined {
    const track = this.viewport?.querySelector<HTMLElement>('.episodes-track');
    this.el.style.removeProperty('--card-h');
    this.cards.forEach((card) => {
      card.style.removeProperty('--lines');
      const summary = card.querySelector<HTMLElement>('.episode-card-summary');
      if (summary !== null) {
        summary.hidden = false;
      }
    });
    this.el.style.setProperty('--lines', 'none');
    track?.style.setProperty('align-items', 'flex-start');
    const fit = this.measureFit(this.availableCardHeight());
    track?.style.removeProperty('align-items');
    this.el.style.removeProperty('--lines');
    if (fit === undefined) {
      return undefined;
    }
    this.cards.forEach((card, index) => {
      const lines = fit.descriptionLines[index];
      if (lines !== undefined) {
        card.style.setProperty('--lines', String(lines));
        const summary = card.querySelector<HTMLElement>('.episode-card-summary');
        if (summary !== null) {
          summary.hidden = lines === 0;
        }
      }
    });
    this.el.style.setProperty('--card-h', `${Math.ceil(fit.height)}px`);
    return fit;
  }

  private measureFit(room: CardRoom | undefined): CardFit | undefined {
    const parts = this.cards.map((card) => ({
      card,
      summary: card.querySelector<HTMLElement>('.episode-card-summary'),
      description: card.querySelector<HTMLElement>('.episode-card-description'),
      title: card.querySelector<HTMLElement>('.episode-card-title'),
    }));
    const measurements: CardMeasurement[] = parts.map(({ card, summary, description, title }) => ({
      fixedHeight: card.offsetHeight - (summary?.offsetHeight ?? 0),
      descriptionHeight: description?.scrollHeight,
      titleHeight: title?.offsetHeight,
    }));
    const rowGap = parseFloat(getComputedStyle(this.cards[0]?.querySelector('.episode-card-body') ?? this.el).rowGap);
    const bodyGap = Number.isFinite(rowGap) ? rowGap : 0;
    const firstDescription = parts.find(({ description }) => description !== null)?.description;
    const firstTitle = parts.find(({ title }) => title !== null)?.title;
    return fitCards(measurements, {
      lineHeight: firstDescription === null || firstDescription === undefined ? Number.NaN : parseFloat(getComputedStyle(firstDescription).lineHeight),
      titleLineHeight: firstTitle === null || firstTitle === undefined ? undefined : parseFloat(getComputedStyle(firstTitle).lineHeight),
      minLines: this.minDescriptionLines(),
      maxLines: MAX_DESCRIPTION_LINES,
      summaryGap: bodyGap,
      minClearHeight: MIN_CLEAR_ABOVE_ACTIONS_PX - bodyGap,
      floorClearHeight: FLOOR_CLEAR_ABOVE_ACTIONS_PX - bodyGap,
      maxExcessHeight: MAX_CLEAR_ABOVE_ACTIONS_PX - MIN_CLEAR_ABOVE_ACTIONS_PX,
      maxHeight: room?.preferredHeight,
      hardMaxHeight: room?.hardHeight,
    });
  }

  private minDescriptionLines(): number {
    if (this.isPinnedLayout()) {
      return MIN_PINNED_DESCRIPTION_LINES;
    }
    const isShortPhone = window.innerWidth <= PHONE_MAX_WIDTH_PX && this.smallViewportHeight <= SHORT_PHONE_MAX_HEIGHT_PX;
    return isShortPhone ? MIN_SHORT_PHONE_DESCRIPTION_LINES : MIN_STATIC_DESCRIPTION_LINES;
  }

  private measureCoverSteps(): void {
    const track = this.viewport?.querySelector<HTMLElement>('.episodes-track');
    const firstCard = this.cards[0];
    if (track === null || track === undefined || firstCard === undefined) {
      return;
    }
    const gap = parseFloat(getComputedStyle(track).columnGap);
    this.coverHide = coverHideStep(firstCard.offsetWidth, gap);
  }

  private availableCardHeight(): CardRoom | undefined {
    const copy = this.el.querySelector<HTMLElement>('.episodes-copy');
    const pin = this.el.querySelector<HTMLElement>('.episodes-pin');
    const track = this.viewport?.querySelector<HTMLElement>('.episodes-track');
    if (this.viewport === null || copy === null || pin === null || track === null || track === undefined) {
      return undefined;
    }
    if (this.isPinnedLayout()) {
      return { preferredHeight: this.viewport.clientHeight, hardHeight: this.viewport.clientHeight };
    }
    const pinStyle = getComputedStyle(pin);
    const trackStyle = getComputedStyle(track);
    const isStacked = this.viewport.getBoundingClientRect().top >= copy.getBoundingClientRect().bottom - 1;
    const stackedHeight = isStacked ? copy.offsetHeight + parseFloat(pinStyle.rowGap) : 0;
    const spaceAbove = parseFloat(pinStyle.paddingTop) + parseFloat(trackStyle.paddingTop) + stackedHeight;
    const spaceBelow = parseFloat(pinStyle.paddingBottom) + parseFloat(trackStyle.paddingBottom);
    const preferredHeight = this.smallViewportHeight - spaceAbove - spaceBelow;
    const bandHeight = this.frameBandHeight();
    const hardHeight = bandHeight === undefined ? Number.NaN : this.smallViewportHeight - bandHeight - FRAME_BAND_GAP_PX - spaceAbove;
    return {
      preferredHeight: Number.isFinite(preferredHeight) ? preferredHeight : undefined,
      hardHeight: Number.isFinite(hardHeight) ? hardHeight : undefined,
    };
  }

  private measureSmallViewportHeight(): number {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.blockSize = '100svh';
    this.el.append(probe);
    const { height } = probe.getBoundingClientRect();
    probe.remove();
    return height;
  }

  private frameBandHeight(): number | undefined {
    const frame = document.querySelector<HTMLElement>('.frame');
    if (frame === null) {
      return undefined;
    }
    const pieces = Array.from(frame.querySelectorAll<HTMLElement>(FRAME_BOTTOM_PIECES), (piece) => ({ top: piece.offsetTop, height: piece.offsetHeight }));
    return bottomBandHeight(frame.offsetHeight, pieces);
  }

  private placeDashes(): void {
    const dashes = this.el.querySelector<HTMLElement>('.episodes-dashes');
    const track = this.viewport?.querySelector<HTMLElement>('.episodes-track');
    const firstCard = this.cards[0];
    if (dashes === null || this.viewport === null || track === null || track === undefined || firstCard === undefined) {
      return;
    }
    dashes.style.removeProperty('--dashes-top');
    if (this.isPinnedLayout()) {
      const ring = parseFloat(getComputedStyle(firstCard).borderBottomWidth);
      const cardFaceBottom = this.viewport.offsetTop + track.offsetTop + firstCard.offsetTop + firstCard.offsetHeight - (Number.isFinite(ring) ? ring : 0);
      dashes.style.setProperty('--dashes-top', `${cardFaceBottom + DASHES_GAP_PX}px`);
    }
  }

  private setFront(index: number): void {
    if (index === this.frontIndex) {
      return;
    }
    this.frontIndex = index;
    this.dashes.forEach((dash, dashIndex) => dash.toggleAttribute('data-active', dashIndex === index));
    this.el.style.setProperty('--active', String(index));
    document.documentElement.style.setProperty('--episodes-active', String(index));
  }

  private setCovered(count: number): void {
    this.cards.forEach((card, cardIndex) => card.toggleAttribute('data-covered', cardIndex < count));
  }

  private setUpNavigation(): void {
    const navigation = this.el.querySelector<HTMLElement>('[data-episodes="nav"]');
    this.navigation = navigation;
    this.viewport = this.el.querySelector<HTMLElement>('.episodes-viewport');
    this.previousButton = this.el.querySelector<HTMLButtonElement>('[data-episodes="previous"]');
    this.nextButton = this.el.querySelector<HTMLButtonElement>('[data-episodes="next"]');
    if (navigation === null || this.viewport === null || this.previousButton === null || this.nextButton === null) {
      return;
    }
    this.previousButton.addEventListener('click', () => this.scrollByCard(-1));
    this.nextButton.addEventListener('click', () => this.scrollByCard(1));
    this.viewport.addEventListener('scroll', this.updateNavigation, { passive: true });
    window.addEventListener('resize', this.updateNavigation);
    this.updateNavigation();
  }

  private scrollByCard(direction: -1 | 1): void {
    const [firstCard, secondCard] = this.cards;
    if (this.viewport === null || firstCard === undefined) {
      return;
    }
    const cardPitch = secondCard === undefined ? firstCard.offsetWidth : secondCard.offsetLeft - firstCard.offsetLeft;
    this.viewport.scrollBy({
      left: direction * cardPitch,
      behavior: isMotionEnabled(document.documentElement) ? 'smooth' : 'instant',
    });
  }

  private readonly updateNavigation = (): void => {
    if (this.viewport === null || this.previousButton === null || this.nextButton === null) {
      return;
    }
    const maxScrollLeft = this.viewport.scrollWidth - this.viewport.clientWidth;
    this.previousButton.disabled = this.viewport.scrollLeft <= NAVIGATION_EDGE_TOLERANCE_PX;
    this.nextButton.disabled = this.viewport.scrollLeft >= maxScrollLeft - NAVIGATION_EDGE_TOLERANCE_PX;
    if (this.nextButton.disabled && document.activeElement === this.nextButton && !this.previousButton.disabled) {
      this.previousButton.focus({ preventScroll: true });
    } else if (this.previousButton.disabled && document.activeElement === this.previousButton && !this.nextButton.disabled) {
      this.nextButton.focus({ preventScroll: true });
    }
  };

  private reveal(): void {
    this.el.dataset.reveal = 'playing';
    const animations = this.el.getAnimations({ subtree: true });
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      delete this.el.dataset.reveal;
    });
  }

  private readonly handleProgress = (event: Event): void => {
    const progress = readProgress(event);
    if (progress !== undefined) {
      this.setFront(frontCardIndex(progress, this.cards.length, this.endSteps));
      this.setCovered(coveringCardCount(progress, this.cards.length, this.endSteps, this.coverHide));
    }
  };

  private readonly scheduleScroll = (): void => {
    if (this.scrollFrame !== undefined) {
      return;
    }
    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = undefined;
      this.handleScroll();
    });
  };

  private handleScroll(): void {
    this.setArrived();
    if (this.el.dataset.reveal === 'pending' && sweepProgress(this.el.getBoundingClientRect().top, window.innerHeight) >= EPISODES_REVEAL_FROM_SWEEP_PROGRESS) {
      this.reveal();
    }
    this.setPinned();
  }

  private setPinned(): void {
    const { top, bottom } = this.el.getBoundingClientRect();
    this.el.toggleAttribute('data-pinned', top <= 0 && bottom >= window.innerHeight);
  }

  private setArrived(): void {
    const dashes = this.el.querySelector('.episodes-dashes');
    if (dashes === null) {
      return;
    }
    this.el.toggleAttribute('data-arrived', dashes.getBoundingClientRect().bottom <= window.innerHeight - this.frameClear);
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || !target.matches(':focus-visible')) {
      return;
    }
    const card = target.closest<HTMLElement>('[data-episodes="card"]');
    if (card !== null) {
      window.requestAnimationFrame(() => this.bringToFront(card));
    }
  };

  private bringToFront(card: HTMLElement): void {
    const pin = this.el.querySelector('.episodes-pin');
    if (pin === null || getComputedStyle(pin).position !== 'sticky') {
      return;
    }
    const cardIndex = this.cards.indexOf(card);
    const top = scrollTopForCard({
      sectionTop: this.el.getBoundingClientRect().top + window.scrollY,
      sectionHeight: this.el.offsetHeight,
      viewportHeight: window.innerHeight,
      cardIndex,
      cardCount: this.cards.length,
      endSteps: this.endSteps,
    });
    const isPinned = Math.abs(pin.getBoundingClientRect().top) < PINNED_EDGE_TOLERANCE_PX;
    const isInPlace = cardIndex === this.cards.length - 1 ? window.scrollY >= top - PINNED_EDGE_TOLERANCE_PX : cardIndex === this.frontIndex;
    if (isPinned && isInPlace) {
      return;
    }
    window.scrollTo({ top, behavior: 'instant' });
  }
}
