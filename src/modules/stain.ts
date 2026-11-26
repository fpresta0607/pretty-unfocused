import { module as Module } from 'modujs';

import { isMotionEnabled } from './motion-state.ts';
import { buildClipPath, buildEdgePath, buildRimPath, edgeShape, NARROW_VIEWPORT_PX, SWEEP_END_PROGRESS, sweepGrowth, sweepProgress, type EdgeShape } from './stain-edge.ts';

const LANDING_TOP_FRACTION = 0.25;
const LONGEST_LIFT_SHARE = 0.85;

export class Stain extends Module {
  private pendingFrame: number | undefined;
  private lift = 0;

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
    this.update();
    window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    window.addEventListener('resize', this.scheduleUpdate);
  }

  destroy(): void {
    window.removeEventListener('scroll', this.scheduleUpdate);
    window.removeEventListener('resize', this.scheduleUpdate);
    window.cancelAnimationFrame(this.pendingFrame ?? 0);
  }

  private update(): void {
    const sectionRect = this.el.getBoundingClientRect();
    const shape = edgeShape(sectionRect.top, window.innerWidth, window.innerHeight);
    this.updateLift(sectionRect.top);
    this.updateClip(sectionRect, shape);

    const set = window.innerWidth < NARROW_VIEWPORT_PX ? 'narrow' : 'wide';
    const edge = this.el.querySelector(`[data-stain-set="${set}"]`);
    if (edge === null) {
      return;
    }
    const { width, height } = edge.getBoundingClientRect();
    edge.setAttribute('viewBox', `0 0 ${width} ${height}`);
    edge.querySelector('.about-edge-rim')?.setAttribute('d', buildRimPath(shape, { width, height }));
    edge.querySelector('.about-edge-fill')?.setAttribute('d', buildEdgePath(shape, { width, height }));
  }

  private updateLift(sectionTop: number): void {
    const landings = Array.from(this.el.querySelectorAll('[data-stain-landing]'), (landing) => landing.getBoundingClientRect().top);
    if (landings.length === 0) {
      return;
    }
    const sectionTopAtSweepEnd = window.innerHeight * (1 - SWEEP_END_PROGRESS);
    const naturalOffset = Math.min(...landings) - sectionTop + this.lift;
    const landingLift = naturalOffset + sectionTopAtSweepEnd - LANDING_TOP_FRACTION * window.innerHeight;
    const fullLift = Math.min(Math.max(landingLift, 0), sectionTopAtSweepEnd * LONGEST_LIFT_SHARE);
    const isSweeping = sweepProgress(sectionTop, window.innerHeight) < 1;
    const share = isSweeping ? sweepGrowth(sectionTop, window.innerHeight) : Math.min(Math.max(sectionTop / sectionTopAtSweepEnd, 0), 1);
    this.lift = fullLift * share;
    this.el.style.setProperty('--about-lift', `${this.lift.toFixed(1)}px`);
  }

  private updateClip(sectionRect: DOMRect, shape: EdgeShape): void {
    if (sweepProgress(sectionRect.top, window.innerHeight) >= 1) {
      this.el.style.removeProperty('clip-path');
      return;
    }
    this.el.style.setProperty('clip-path', `path('${buildClipPath(shape, { width: sectionRect.width, height: sectionRect.height })}')`);
  }
}
