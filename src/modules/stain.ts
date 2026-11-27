import { module as Module } from 'modujs';

import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { EASE_LIFT } from './motion-tokens.ts';
import {
  buildClipPath,
  buildEdgePath,
  buildRimPath,
  edgeShape,
  NARROW_VIEWPORT_PX,
  SWEEP_END_PROGRESS,
  sweepProgress,
  waveReachFor,
  type EdgeShape,
} from './stain-edge.ts';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const LANDING_TOP_FRACTION = 0.25;
const LONGEST_LIFT_SHARE = 0.19;

export class Stain extends Module {
  private pendingFrame: number | undefined;
  private lift = 0;
  private viewportHeight = 0;
  private readonly smoothScrollDevice = window.matchMedia(SMOOTH_SCROLL_DEVICE_QUERY);

  private readonly remeasure = (): void => {
    this.viewportHeight = this.measureViewportHeight();
    this.scheduleUpdate();
  };

  private readonly scheduleUpdate = (): void => {
    if (this.pendingFrame !== undefined) {
      return;
    }
    this.pendingFrame = window.requestAnimationFrame(() => {
      this.pendingFrame = undefined;
      this.update();
    });
  };

  init(): void {
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    this.viewportHeight = this.measureViewportHeight();
    this.update();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.remeasure);
  }

  destroy(): void {
    this.el.removeAttribute('data-stain-swept');
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.remeasure);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private update(): void {
    const sectionRect = this.el.getBoundingClientRect();
    const isSmoothScrollDevice = this.smoothScrollDevice.matches;
    const reach = waveReachFor(isSmoothScrollDevice);
    const shape = edgeShape(sectionRect.top, window.innerWidth, this.viewportHeight, reach);
    this.updateLift(sectionRect.top, isSmoothScrollDevice);
    this.updateClip(sectionRect, shape, isSmoothScrollDevice);
    // On touch the page background switches only once the wave drawn at the small viewport covers the screen, so it is read at that height.
    const sweptHeight = isSmoothScrollDevice ? window.innerHeight : this.viewportHeight;
    this.el.toggleAttribute('data-stain-swept', sweepProgress(sectionRect.top, sweptHeight, reach) >= 1 && sectionRect.bottom > 0);

    const set = window.innerWidth < NARROW_VIEWPORT_PX ? 'narrow' : 'wide';
    const edge = this.el.querySelector(`[data-stain-set="${set}"]`);
    if (edge === null) {
      return;
    }
    const { width, height } = edge.getBoundingClientRect();
    edge.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.drawPath(edge, 'rim', buildRimPath(shape, { width, height }));
    this.drawPath(edge, 'fill', buildEdgePath(shape, { width, height }));
  }

  // The markup draws the settled edge with a reference to one shared outline; the live edge needs a path of its own to reshape.
  private drawPath(edge: Element, part: 'rim' | 'fill', outline: string): void {
    const className = `stain-edge-${part}`;
    let path = edge.querySelector(`.${className}`);
    if (path instanceof SVGUseElement) {
      const ownPath = document.createElementNS(SVG_NAMESPACE, 'path');
      ownPath.setAttribute('class', className);
      path.replaceWith(ownPath);
      path = ownPath;
    }
    path?.setAttribute('d', outline);
  }

  private measureViewportHeight(): number {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.blockSize = '100svh';
    this.el.append(probe);
    const { height } = probe.getBoundingClientRect();
    probe.remove();
    return height;
  }

  private updateLift(sectionTop: number, isSmoothScrollDevice: boolean): void {
    if (!isSmoothScrollDevice) {
      this.lift = 0;
      this.el.style.setProperty('--stain-lift', '0px');
      return;
    }
    const landings = Array.from(this.el.querySelectorAll('[data-stain-landing]'), (landing) => landing.getBoundingClientRect().top);
    if (landings.length === 0) {
      return;
    }
    const sectionTopAtSweepEnd = this.viewportHeight * (1 - SWEEP_END_PROGRESS);
    const naturalOffset = Math.min(...landings) - sectionTop + this.lift;
    const landingLift = naturalOffset + sectionTopAtSweepEnd - LANDING_TOP_FRACTION * this.viewportHeight;
    const fullLift = Math.min(Math.max(landingLift, 0), this.viewportHeight * LONGEST_LIFT_SHARE);
    const progressUp = sweepProgress(sectionTop, this.viewportHeight);
    const progressDown = Math.min(Math.max(sectionTop / sectionTopAtSweepEnd, 0), 1);
    this.lift = fullLift * EASE_LIFT(Math.min(progressUp, progressDown));
    this.el.style.setProperty('--stain-lift', `${this.lift.toFixed(1)}px`);
  }

  private updateClip(sectionRect: DOMRect, shape: EdgeShape, isSmoothScrollDevice: boolean): void {
    // Touch Safari stops repainting a changing clip-path on a section holding composited layers, so the edge is drawn by the svg alone.
    if (!isSmoothScrollDevice || sweepProgress(sectionRect.top, this.viewportHeight) >= 1) {
      this.el.style.removeProperty('clip-path');
      return;
    }
    this.el.style.setProperty('clip-path', `path('${buildClipPath(shape, { width: sectionRect.width, height: sectionRect.height })}')`);
  }
}
