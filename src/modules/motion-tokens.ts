import { cubicBezier } from 'animejs';

export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const EASE_POP = cubicBezier(0.17, 0.67, 0.3, 1.33);
export const EASE_WIPE = cubicBezier(0.86, 0, 0.07, 1);
export const EASE_SCRUB = cubicBezier(0.45, 0, 0.55, 1);
export const EASE_LIFT = cubicBezier(0.25, 0, 0.75, 1);
