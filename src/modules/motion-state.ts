const INTRO_SEEN_KEY = 'pu-intro-seen';

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
