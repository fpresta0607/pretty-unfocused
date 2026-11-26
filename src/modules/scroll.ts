import { module as Module } from 'modujs';
import type LocomotiveScroll from 'locomotive-scroll';

import { isMotionEnabled } from './motion-state.ts';

export class Scroll extends Module {
  private locomotiveScroll: LocomotiveScroll | undefined;
  private isDestroyed = false;

  init(): void {
    if (!isMotionEnabled(document.documentElement)) {
      return;
    }
    if (document.readyState === 'complete') {
      void this.start();
    } else {
      window.addEventListener('load', () => void this.start(), { once: true });
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.locomotiveScroll?.destroy();
  }

  lock(): void {
    this.locomotiveScroll?.stop();
  }

  unlock(): void {
    this.locomotiveScroll?.start();
  }

  private async start(): Promise<void> {
    const { default: LocomotiveScrollConstructor } = await import('locomotive-scroll');
    if (!this.isDestroyed) {
      this.locomotiveScroll = new LocomotiveScrollConstructor();
    }
  }
}
