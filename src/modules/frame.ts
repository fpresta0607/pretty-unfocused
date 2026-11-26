import { module as Module } from 'modujs';

import { isMotionEnabled } from './motion-state.ts';
import { pickSectionAtLine, readSurface, shouldShowMiniCard, type Surface, type VerticalSpan } from './section-logic.ts';
import { edgeHeight, edgeShape, settledEdgeShape, sweepProgress, type EdgeShape } from './stain-edge.ts';

const HERO_THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2];
const SAMPLES_ACROSS = 7;
const SAMPLES_DOWN = 3;
const PIECES = '.frame-button, .frame-mark, [data-frame="section"]';

interface SectionEdge {
  rect: DOMRect;
  shape: EdgeShape | undefined;
}

export class Frame extends Module {
  private heroObserver: IntersectionObserver | undefined;
  private mutationObserver: MutationObserver | undefined;
  private sections: HTMLElement[] = [];
  private labels = new Map<string, string>();
  private labelWidths = new Map<string, number>();
  private edgeRise = 0;
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

  private readonly remeasure = (): void => {
    this.labelWidths = this.measureLabelWidths();
    this.edgeRise = this.measureEdgeRise();
    this.scheduleUpdate();
  };

  init(): void {
    this.labels = this.readSectionLabels();
    this.labelWidths = this.measureLabelWidths();
    this.edgeRise = this.measureEdgeRise();
    this.refreshSections();
    this.updateSurfaces();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.remeasure);
    void document.fonts.ready.then(this.remeasure);
    this.mutationObserver = new MutationObserver(this.scheduleUpdate);
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  destroy(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.remeasure);
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
    const edges = this.readEdges();
    this.el.querySelectorAll<HTMLElement>(PIECES).forEach((piece) => {
      const isLabel = piece.matches('[data-frame="section"]');
      const box = piece.getBoundingClientRect();
      const samplesByWidth = new Map<number, readonly (HTMLElement | undefined)[]>();
      const samplesFor = (candidate: HTMLElement): readonly (HTMLElement | undefined)[] => {
        const width = isLabel ? this.labelWidthFor(candidate, box) : box.width;
        const samples = samplesByWidth.get(width) ?? this.sectionsUnder(edges, box, width);
        samplesByWidth.set(width, samples);
        return samples;
      };
      const section = this.sectionUnder(edges, box, samplesFor);
      if (section === undefined) {
        return;
      }
      piece.dataset.frameSurface = this.surfaceOf(samplesFor(section), readSurface(section.dataset.surface));
      const label = isLabel ? this.labels.get(section.id) : undefined;
      if (label !== undefined && piece.textContent !== label) {
        piece.textContent = label;
      }
      if (isLabel) {
        this.colourLabelLetters(piece, edges);
      }
    });
  }

  private colourLabelLetters(label: HTMLElement, edges: readonly SectionEdge[]): void {
    if (label.firstElementChild === null) {
      label.replaceChildren(
        ...Array.from(label.textContent ?? '', (character) => {
          const letter = document.createElement('span');
          letter.dataset.frame = 'letter';
          letter.textContent = character;
          return letter;
        }),
      );
    }
    const letters = Array.from(label.querySelectorAll<HTMLElement>('[data-frame="letter"]'));
    const surfaces = letters.map((letter) => {
      const { left, top, width, height } = letter.getBoundingClientRect();
      const under = this.sectionAt(edges, left + width / 2, top + height / 2);
      return under === undefined ? undefined : readSurface(under.dataset.surface);
    });
    letters.forEach((letter, index) => {
      const surface = surfaces[index];
      if (surface !== undefined) {
        letter.dataset.frameSurface = surface;
      }
    });
  }

  private labelWidthFor(section: HTMLElement, box: DOMRect): number {
    const measured = this.labelWidths.get(section.id);
    return measured === undefined || measured === 0 ? box.width : measured;
  }

  private readEdges(): SectionEdge[] {
    const isEdgeScrubbed = isMotionEnabled(document.documentElement);
    return this.sections.map((section) => {
      const rect = section.getBoundingClientRect();
      if (!section.hasAttribute('data-module-stain')) {
        return { rect, shape: undefined };
      }
      const shape = isEdgeScrubbed
        ? edgeShape(rect.top, window.innerWidth, window.innerHeight)
        : settledEdgeShape(window.innerWidth, this.edgeRise);
      return { rect, shape };
    });
  }

  private sectionUnder(
    edges: readonly SectionEdge[],
    box: DOMRect,
    samplesFor: (section: HTMLElement) => readonly (HTMLElement | undefined)[],
  ): HTMLElement | undefined {
    const shareOf = (section: HTMLElement): number => samplesFor(section).filter((under) => under === section).length;
    let winner = this.sectionAt(edges, box.left + box.width / 2, box.top + box.height / 2);
    let winnerShare = winner === undefined ? 0 : shareOf(winner);
    for (const section of this.sections) {
      const share = shareOf(section);
      if (share > winnerShare) {
        winner = section;
        winnerShare = share;
      }
    }
    return winner;
  }

  private surfaceOf(samples: readonly (HTMLElement | undefined)[], tieBreaker: Surface): Surface {
    const counts: Record<Surface, number> = { dark: 0, light: 0 };
    samples.forEach((under) => {
      if (under !== undefined) {
        counts[readSurface(under.dataset.surface)] += 1;
      }
    });
    if (counts.dark === counts.light) {
      return tieBreaker;
    }
    return counts.dark > counts.light ? 'dark' : 'light';
  }

  private sectionsUnder(edges: readonly SectionEdge[], box: DOMRect, width: number): (HTMLElement | undefined)[] {
    const samples: (HTMLElement | undefined)[] = [];
    for (let across = 0; across < SAMPLES_ACROSS; across += 1) {
      for (let down = 0; down < SAMPLES_DOWN; down += 1) {
        samples.push(
          this.sectionAt(
            edges,
            box.left + (width * (across + 0.5)) / SAMPLES_ACROSS,
            box.top + (box.height * (down + 0.5)) / SAMPLES_DOWN,
          ),
        );
      }
    }
    return samples;
  }

  private sectionAt(edges: readonly SectionEdge[], x: number, y: number): HTMLElement | undefined {
    const tops = edges.map(({ rect, shape }) =>
      shape === undefined ? rect.top : rect.top - edgeHeight((x - rect.left) / rect.width, shape),
    );
    const spans: VerticalSpan[] = edges.map(({ rect }, index) => ({
      top: tops[index] ?? rect.top,
      bottom: tops[index + 1] ?? rect.bottom,
    }));
    const index = pickSectionAtLine(spans, y);
    return index === undefined ? undefined : this.sections[index];
  }

  private measureEdgeRise(): number {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.blockSize = 'var(--edge-rise)';
    this.el.append(probe);
    const rise = Number.parseFloat(getComputedStyle(probe).blockSize);
    probe.remove();
    return rise;
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
    probe.style.scale = 'none';
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
