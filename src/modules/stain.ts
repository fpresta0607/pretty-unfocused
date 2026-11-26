import { module as Module } from 'modujs';

import { isMotionEnabled, SMOOTH_SCROLL_DEVICE_QUERY } from './motion-state.ts';
import { buildClipPath, buildEdgePath, buildRimPath, edgeShape, NARROW_VIEWPORT_PX, SWEEP_END_PROGRESS, sweepGrowth, sweepProgress, type EdgeShape } from './stain-edge.ts';

const LANDING_TOP_FRACTION = 0.25;
const LONGEST_LIFT_SHARE = 0.85;

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
    const shape = edgeShape(sectionRect.top, window.innerWidth, this.viewportHeight);
    this.updateLift(sectionRect.top);
    this.updateClip(sectionRect, shape);
    this.el.toggleAttribute('data-stain-swept', sweepProgress(sectionRect.top, window.innerHeight) >= 1 && sectionRect.bottom > 0);

    const set = window.innerWidth < NARROW_VIEWPORT_PX ? 'narrow' : 'wide';
    const edge = this.el.querySelector(`[data-stain-set="${set}"]`);
    if (edge === null) {
      return;
    }
    const { width, height } = edge.getBoundingClientRect();
    edge.setAttribute('viewBox', `0 0 ${width} ${height}`);
    edge.querySelector('.stain-edge-rim')?.setAttribute('d', buildRimPath(shape, { width, height }));
    edge.querySelector('.stain-edge-fill')?.setAttribute('d', buildEdgePath(shape, { width, height }));
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

  private updateLift(sectionTop: number): void {
    if (!this.smoothScrollDevice.matches) {
      this.lift = 0;
      this.el.style.setProperty('--about-lift', '0px');
      return;
    }
    const landings = Array.from(this.el.querySelectorAll('[data-stain-landing]'), (landing) => landing.getBoundingClientRect().top);
    if (landings.length === 0) {
      return;
    }
    const sectionTopAtSweepEnd = this.viewportHeight * (1 - SWEEP_END_PROGRESS);
    const naturalOffset = Math.min(...landings) - sectionTop + this.lift;
    const landingLift = naturalOffset + sectionTopAtSweepEnd - LANDING_TOP_FRACTION * this.viewportHeight;
    const fullLift = Math.min(Math.max(landingLift, 0), sectionTopAtSweepEnd * LONGEST_LIFT_SHARE);
    const isSweeping = sweepProgress(sectionTop, this.viewportHeight) < 1;
    const share = isSweeping ? sweepGrowth(sectionTop, this.viewportHeight) : Math.min(Math.max(sectionTop / sectionTopAtSweepEnd, 0), 1);
    this.lift = fullLift * share;
    this.el.style.setProperty('--stain-lift', `${this.lift.toFixed(1)}px`);
  }

  private updateClip(sectionRect: DOMRect, shape: EdgeShape): void {
    if (sweepProgress(sectionRect.top, this.viewportHeight) >= 1) {
      this.el.style.removeProperty('clip-path');
      return;
    }
    this.el.style.setProperty('clip-path', `path('${buildClipPath(shape, { width: sectionRect.width, height: sectionRect.height })}')`);
  }
}
