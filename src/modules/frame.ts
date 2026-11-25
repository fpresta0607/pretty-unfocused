import { module as Module } from 'modujs';

import { pickSectionAtLine, readSurface, shouldShowMiniCard } from './section-logic.ts';

const TOP_LINE_PX = 52;
const BOTTOM_LINE_FROM_END_PX = 44;
const HERO_THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2];

export class Frame extends Module {
  private heroObserver: IntersectionObserver | undefined;
  private mutationObserver: MutationObserver | undefined;
  private sections: HTMLElement[] = [];
  private labels = new Map<string, string>();
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

  init(): void {
    this.labels = this.readSectionLabels();
    this.refreshSections();
    this.updateSurfaces();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
    this.mutationObserver = new MutationObserver(this.scheduleUpdate);
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  destroy(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
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
    const miniCard = this.el.querySelector<HTMLElement>('[data-frame="mini"]');
    const mark = this.el.querySelector<HTMLElement>('.frame-mark');
    const firstSection = this.sections[0];
    if (firstSection === undefined) {
      return;
    }
    this.heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry !== undefined) {
          const isHeroAway = shouldShowMiniCard(entry.intersectionRatio);
          miniCard?.toggleAttribute('data-visible', isHeroAway);
          mark?.toggleAttribute('data-hidden', !isHeroAway);
        }
      },
      { threshold: HERO_THRESHOLDS },
    );
    this.heroObserver.observe(firstSection);
  }

  private updateSurfaces(): void {
    const spans = this.sections.map((section) => section.getBoundingClientRect());
    const topSection = this.sections[pickSectionAtLine(spans, TOP_LINE_PX) ?? -1];
    const bottomSection = this.sections[pickSectionAtLine(spans, window.innerHeight - BOTTOM_LINE_FROM_END_PX) ?? -1];
    const middleSection = this.sections[pickSectionAtLine(spans, window.innerHeight / 2) ?? -1];

    if (topSection !== undefined) {
      this.el.dataset.surfaceTop = readSurface(topSection.dataset.surface);
    }
    if (bottomSection !== undefined) {
      this.el.dataset.surfaceBottom = readSurface(bottomSection.dataset.surface);
    }
    const label = middleSection === undefined ? undefined : this.labels.get(middleSection.id);
    const sectionLabel = this.el.querySelector<HTMLElement>('[data-frame="section"]');
    if (sectionLabel !== null && label !== undefined && sectionLabel.textContent !== label) {
      sectionLabel.textContent = label;
    }
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
