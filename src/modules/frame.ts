import { module as Module } from 'modujs';

import { isMotionEnabled } from './motion-state.ts';
import { pickSectionAtLine, readSurface, shouldShowMiniCard, type Surface, type VerticalSpan } from './section-logic.ts';
import { edgeHeight, edgeShape, settledEdgeShape, sweepProgress } from './stain-edge.ts';

const HERO_THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2];
const SAMPLES_ACROSS = 7;
const SAMPLES_DOWN = 3;
const PIECES = '.frame-button, .frame-mark, [data-frame="section"]';

export class Frame extends Module {
  private heroObserver: IntersectionObserver | undefined;
  private mutationObserver: MutationObserver | undefined;
  private sections: HTMLElement[] = [];
  private labels = new Map<string, string>();
  private labelWidths = new Map<string, number>();
  private pendingFrame: number | undefined;

  private readonly scheduleUpdate = (): void => {
    if (this.pendingFrame !== undefined) {
      return;
    }
    this.pendingFrame = window.requestAnimationFrame(() => {
      this.pendingFrame = undefined;
      this.refreshSections();
      this.updateSurfaces();
    });
  };

  private readonly remeasureLabels = (): void => {
    this.labelWidths = this.measureLabelWidths();
    this.scheduleUpdate();
  };

  init(): void {
    this.labels = this.readSectionLabels();
    this.labelWidths = this.measureLabelWidths();
    this.refreshSections();
    this.updateSurfaces();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.remeasureLabels);
    this.mutationObserver = new MutationObserver(this.scheduleUpdate);
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  destroy(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.remeasureLabels);
    this.mutationObserver?.disconnect();
    this.heroObserver?.disconnect();
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private refreshSections(): void {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-surface]'));
    const hasChanged =
      sections.length !== this.sections.length ||
      sections.some((section, index) => section !== this.sections[index]);
    if (!hasChanged) {
      return;
    }
    this.sections = sections;
    this.observeHero();
  }

  private observeHero(): void {
    this.heroObserver?.disconnect();
    const firstSection = this.sections[0];
    if (firstSection === undefined) {
      return;
    }
    this.heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry !== undefined && this.stainSection() === undefined) {
          this.showHeroAway(shouldShowMiniCard(entry.intersectionRatio));
        }
      },
      { threshold: HERO_THRESHOLDS },
    );
    this.heroObserver.observe(firstSection);
  }

  private stainSection(): HTMLElement | undefined {
    return isMotionEnabled(document.documentElement) ? this.sections.find((section) => section.hasAttribute('data-module-stain')) : undefined;
  }

  private showHeroAway(isHeroAway: boolean): void {
    this.el.querySelector('[data-frame="mini"]')?.toggleAttribute('data-visible', isHeroAway);
    this.el.querySelector('.frame-mark')?.toggleAttribute('data-hidden', !isHeroAway);
  }

  private updateHeroAway(): void {
    const stain = this.stainSection();
    if (stain !== undefined) {
      this.showHeroAway(sweepProgress(stain.getBoundingClientRect().top, window.innerHeight) >= 1);
    }
  }

  private updateSurfaces(): void {
    this.updateHeroAway();
    const rects = this.sections.map((section) => section.getBoundingClientRect());
    this.el.querySelectorAll<HTMLElement>(PIECES).forEach((piece) => {
      const isLabel = piece.matches('[data-frame="section"]');
      const box = piece.getBoundingClientRect();
      const widthFor = (candidate: HTMLElement): number => (isLabel ? this.labelWidthFor(candidate, box) : box.width);
      const section = this.sectionUnder(rects, box, widthFor);
      if (section === undefined) {
        return;
      }
      piece.dataset.frameSurface = this.surfaceUnder(rects, box, widthFor(section), readSurface(section.dataset.surface));
      const label = isLabel ? this.labels.get(section.id) : undefined;
      if (label !== undefined && piece.textContent !== label) {
        piece.textContent = label;
      }
    });
  }

  private labelWidthFor(section: HTMLElement, box: DOMRect): number {
    const measured = this.labelWidths.get(section.id);
    return measured === undefined || measured === 0 ? box.width : measured;
  }

  private sectionUnder(
    rects: readonly DOMRect[],
    box: DOMRect,
    widthFor: (section: HTMLElement) => number,
  ): HTMLElement | undefined {
    let winner = this.sectionAt(rects, box.left + box.width / 2, box.top + box.height / 2);
    let winnerShare = winner === undefined ? 0 : this.shareOf(rects, box, widthFor(winner), winner);
    for (const section of this.sections) {
      const share = this.shareOf(rects, box, widthFor(section), section);
      if (share > winnerShare) {
        winner = section;
        winnerShare = share;
      }
    }
    return winner;
  }

  private surfaceUnder(rects: readonly DOMRect[], box: DOMRect, width: number, tieBreaker: Surface): Surface {
    const counts: Record<Surface, number> = { dark: 0, light: 0 };
    for (let across = 0; across < SAMPLES_ACROSS; across += 1) {
      for (let down = 0; down < SAMPLES_DOWN; down += 1) {
        const under = this.sectionAt(
          rects,
          box.left + (width * (across + 0.5)) / SAMPLES_ACROSS,
          box.top + (box.height * (down + 0.5)) / SAMPLES_DOWN,
        );
        if (under !== undefined) {
          counts[readSurface(under.dataset.surface)] += 1;
        }
      }
    }
    if (counts.dark === counts.light) {
      return tieBreaker;
    }
    return counts.dark > counts.light ? 'dark' : 'light';
  }

  private shareOf(rects: readonly DOMRect[], box: DOMRect, width: number, section: HTMLElement): number {
    let covered = 0;
    for (let across = 0; across < SAMPLES_ACROSS; across += 1) {
      for (let down = 0; down < SAMPLES_DOWN; down += 1) {
        const under = this.sectionAt(
          rects,
          box.left + (width * (across + 0.5)) / SAMPLES_ACROSS,
          box.top + (box.height * (down + 0.5)) / SAMPLES_DOWN,
        );
        covered += under === section ? 1 : 0;
      }
    }
    return covered / (SAMPLES_ACROSS * SAMPLES_DOWN);
  }

  private sectionAt(rects: readonly DOMRect[], x: number, y: number): HTMLElement | undefined {
    const isEdgeScrubbed = isMotionEnabled(document.documentElement);
    const tops = rects.map((rect, index) => {
      if (this.sections[index]?.hasAttribute('data-module-stain') !== true) {
        return rect.top;
      }
      const shape = isEdgeScrubbed
        ? edgeShape(rect.top, window.innerWidth, window.innerHeight)
        : settledEdgeShape(window.innerWidth, window.innerHeight);
      return rect.top - edgeHeight((x - rect.left) / rect.width, shape);
    });
    const spans: VerticalSpan[] = rects.map((rect, index) => ({
      top: tops[index] ?? rect.top,
      bottom: tops[index + 1] ?? rect.bottom,
    }));
    const index = pickSectionAtLine(spans, y);
    return index === undefined ? undefined : this.sections[index];
  }

  private measureLabelWidths(): Map<string, number> {
    const widths = new Map<string, number>();
    const label = this.el.querySelector<HTMLElement>('[data-frame="section"]');
    if (label === null || label.parentElement === null) {
      return widths;
    }
    const probe = label.cloneNode(false);
    if (!(probe instanceof HTMLElement)) {
      return widths;
    }
    probe.style.visibility = 'hidden';
    label.parentElement.append(probe);
    this.labels.forEach((text, id) => {
      probe.textContent = text;
      widths.set(id, probe.getBoundingClientRect().width);
    });
    probe.remove();
    return widths;
  }

  private readSectionLabels(): Map<string, string> {
    const labels = new Map<string, string>();
    this.el.querySelectorAll<HTMLAnchorElement>('[data-menu="link"]').forEach((link) => {
      const label = link.querySelector('.menu-link-label')?.textContent;
      if (label !== null && label !== undefined) {
        labels.set(link.hash.slice(1), label);
      }
    });
    return labels;
  }
}
