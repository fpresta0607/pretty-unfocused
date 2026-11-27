const INTRO_SEEN_KEY = 'pu-intro-seen';

export const HERO_SETTLED_EVENT = 'hero-settled';
export const SMOOTH_SCROLL_DEVICE_QUERY = '(hover: hover) and (pointer: fine)';

export function isMotionEnabled(root: HTMLElement): boolean {
  return root.dataset.motion === 'on';
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    return;
  }
}
