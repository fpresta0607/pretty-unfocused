import { EASE_SCRUB } from './motion-tokens.ts';

export const EDGE_RISE_HEIGHT_FRACTION = 0.2;
export const NARROW_VIEWPORT_PX = 600;
export const SWEEP_END_PROGRESS = 0.5;
export const STATIC_POSE = 0.5;
export const STATIC_REACH_FRACTION = 0.92;
export const STATIC_VIEWS = {
  wide: { width: 1440, height: 180 },
  narrow: { width: 390, height: 169 },
} as const;

const OVERSCAN = 0.1;
const BASE_SAMPLE_COUNT = 96;
const REFINE_DEPTH = 6;
const REFINE_TOLERANCE_PX = 0.6;
const RANGE_SAMPLE_COUNT = 300;
const FILL_OVERLAP_PX = 2;
export const EDGE_RIM_PX = 4;
const RISE_AT_END_FRACTION = 0.56;
const RELIEF_RAMP_PROGRESS = 0.08;
const RELIEF_TAPER_START = 0.65;
const RELIEF_AT_END = 0.2;
const TILT_FADE_START = 0.55;
const TILT_FADE_SPAN = 0.35;
const STATIC_RELIEF_SHARE = 0.8;
const SPREAD_AT_START = 0.88;
const SPREAD_AT_END = 1.1;
const WIDTH_AT_START = 0.86;
const WIDTH_AT_END = 1.12;
const SMALL_DOME_HEIGHT_AT_START = 0.85;
const CURVE_PULL = 3;

interface Dome {
  centre: number;
  halfWidth: number;
  height: number;
}

interface StainSet {
  domes: readonly Dome[];
  smoothness: number;
  reliefFraction: number;
  tiltFraction: number;
  travel: number;
}

export interface EdgeShape {
  rise: number;
  relief: number;
  tilt: number;
  domes: readonly Dome[];
  smoothness: number;
  floor: number;
  peak: number;
}

export interface EdgeSize {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

const WIDE_DOMES: readonly Dome[] = [
  { centre: 0.58, halfWidth: 0.19, height: 1 },
  { centre: 0.04, halfWidth: 0.12, height: 0.5 },
  { centre: 0.97, halfWidth: 0.08, height: 0.46 },
  { centre: 0.26, halfWidth: 0.07, height: 0.36 },
  { centre: 0.8, halfWidth: 0.055, height: 0.25 },
];

const NARROW_DOMES: readonly Dome[] = [
  { centre: 0.5, halfWidth: 0.26, height: 1 },
  { centre: 0, halfWidth: 0.12, height: 0.4 },
  { centre: 0.95, halfWidth: 0.11, height: 0.3 },
];

function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}

function blendDomes(domes: readonly Dome[], smoothness: number, position: number): number {
  const total = domes.reduce((sum, dome) => {
    const offset = (position - dome.centre) / dome.halfWidth;
    return sum + Math.exp((dome.height * (1 - offset * offset)) / smoothness);
  }, 1);
  return smoothness * Math.log(total);
}

function smoothStep(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function evolveDomes(domes: readonly Dome[], progress: number, travel: number): Dome[] {
  const spread = lerp(SPREAD_AT_START, SPREAD_AT_END, progress);
  const width = lerp(WIDTH_AT_START, WIDTH_AT_END, progress);
  const smallDomeHeight = lerp(SMALL_DOME_HEIGHT_AT_START, 1, progress);
  const anchor = domes[0]?.centre ?? 0.5;
  return domes.map((dome, index) => ({
    centre: anchor + (dome.centre - anchor) * spread + (index === 0 ? travel * (progress - 0.5) : 0),
    halfWidth: dome.halfWidth * width,
    height: index === 0 ? dome.height : dome.height * smallDomeHeight,
  }));
}

function blendRange(domes: readonly Dome[], smoothness: number): { floor: number; peak: number } {
  const blends = Array.from({ length: RANGE_SAMPLE_COUNT + 1 }, (_, index) => blendDomes(domes, smoothness, index / RANGE_SAMPLE_COUNT));
  return { floor: Math.min(...blends), peak: Math.max(...blends) };
}

const WIDE_SET: StainSet = { domes: WIDE_DOMES, smoothness: 0.5, reliefFraction: 0.3, tiltFraction: 0.12, travel: 0.3 };
const NARROW_SET: StainSet = { domes: NARROW_DOMES, smoothness: 0.9, reliefFraction: 0.21, tiltFraction: 0.06, travel: 0.22 };

export function edgeRise(viewportHeight: number): number {
  return viewportHeight * EDGE_RISE_HEIGHT_FRACTION;
}

function shapeFromSet(set: StainSet, evolution: number, rise: number, relief: number, tilt: number): EdgeShape {
  const domes = evolveDomes(set.domes, evolution, set.travel);
  return { rise, relief, tilt, domes, smoothness: set.smoothness, ...blendRange(domes, set.smoothness) };
}

function setFor(viewportWidth: number): StainSet {
  return viewportWidth < NARROW_VIEWPORT_PX ? NARROW_SET : WIDE_SET;
}

export function sweepProgress(sectionTop: number, viewportHeight: number): number {
  return clamp((1 - sectionTop / viewportHeight) / SWEEP_END_PROGRESS, 0, 1);
}

export function sweepGrowth(sectionTop: number, viewportHeight: number): number {
  return EASE_SCRUB(sweepProgress(sectionTop, viewportHeight));
}

let lastShape: { key: string; shape: EdgeShape } | undefined;

export function edgeShape(sectionTop: number, viewportWidth: number, viewportHeight: number): EdgeShape {
  const key = `${sectionTop}/${viewportWidth}/${viewportHeight}`;
  if (lastShape?.key === key) {
    return lastShape.shape;
  }
  const set = setFor(viewportWidth);
  const progress = sweepProgress(sectionTop, viewportHeight);
  const rise = viewportHeight * RISE_AT_END_FRACTION * sweepGrowth(sectionTop, viewportHeight);
  const taper = 1 - (1 - RELIEF_AT_END) * smoothStep((progress - RELIEF_TAPER_START) / (1 - RELIEF_TAPER_START));
  const relief = viewportHeight * set.reliefFraction * smoothStep(progress / RELIEF_RAMP_PROGRESS) * taper;
  const tiltFade = 1 - smoothStep((progress - TILT_FADE_START) / TILT_FADE_SPAN);
  const tilt = viewportHeight * set.tiltFraction * (1 - 2 * progress) * tiltFade * smoothStep(progress / RELIEF_RAMP_PROGRESS);
  const shape = shapeFromSet(set, progress, rise, relief, tilt);
  lastShape = { key, shape };
  return shape;
}

const stillSilhouettes = new Map<StainSet, EdgeShape>();

function stillShape(isNarrow: boolean, height: number): EdgeShape {
  const set = isNarrow ? NARROW_SET : WIDE_SET;
  const total = STATIC_REACH_FRACTION * height;
  const relief = total * STATIC_RELIEF_SHARE;
  const silhouette = stillSilhouettes.get(set) ?? shapeFromSet(set, STATIC_POSE, 0, 1, 0);
  stillSilhouettes.set(set, silhouette);
  return { ...silhouette, rise: total - relief, relief };
}

export function settledEdgeShape(viewportWidth: number, viewportHeight: number): EdgeShape {
  return stillShape(viewportWidth < NARROW_VIEWPORT_PX, edgeRise(viewportHeight));
}

export function edgeProfile(shape: EdgeShape, position: number): number {
  return clamp((blendDomes(shape.domes, shape.smoothness, position) - shape.floor) / (shape.peak - shape.floor), 0, 1);
}

export function edgeHeight(position: number, shape: EdgeShape): number {
  return shape.rise + shape.relief * edgeProfile(shape, position) + shape.tilt * (0.5 - position) + Math.abs(shape.tilt) / 2;
}

function refine(yAt: (x: number) => number, start: Point, end: Point, depth: number, into: Point[]): void {
  if (depth === 0) {
    return;
  }
  const x = (start.x + end.x) / 2;
  const middle = { x, y: yAt(x) };
  if (Math.abs(middle.y - (start.y + end.y) / 2) <= REFINE_TOLERANCE_PX) {
    return;
  }
  refine(yAt, start, middle, depth - 1, into);
  into.push(middle);
  refine(yAt, middle, end, depth - 1, into);
}

function samplePoints(yAt: (x: number) => number, left: number, right: number): Point[] {
  const points: Point[] = [];
  for (let index = 0; index <= BASE_SAMPLE_COUNT; index += 1) {
    const x = left + ((right - left) * index) / BASE_SAMPLE_COUNT;
    const point = { x, y: yAt(x) };
    const previous = points[points.length - 1];
    if (previous !== undefined) {
      refine(yAt, previous, point, REFINE_DEPTH, points);
    }
    points.push(point);
  }
  return points;
}

function curveThrough(points: readonly Point[]): string {
  const [first] = points;
  if (first === undefined) {
    return '';
  }
  const last = points[points.length - 1] ?? first;
  const slopeAt = (index: number): number => {
    const before = points[Math.max(index - 1, 0)] ?? first;
    const after = points[Math.min(index + 1, points.length - 1)] ?? last;
    return after.x === before.x ? 0 : (after.y - before.y) / (after.x - before.x);
  };
  const segments = points.slice(1).map((end, index) => {
    const start = points[index] ?? first;
    const reachX = (end.x - start.x) / CURVE_PULL;
    const startControl = { x: start.x + reachX, y: start.y + slopeAt(index) * reachX };
    const endControl = { x: end.x - reachX, y: end.y - slopeAt(index + 1) * reachX };
    return `C${formatNumber(startControl.x)} ${formatNumber(startControl.y)} ${formatNumber(endControl.x)} ${formatNumber(endControl.y)} ${formatNumber(end.x)} ${formatNumber(end.y)}`;
  });
  return `M${formatNumber(first.x)} ${formatNumber(first.y)}${segments.join('')}`;
}

function buildBody(shape: EdgeShape, width: number, baselineY: number, bottomY: number): string {
  const yAt = (x: number): number => baselineY - edgeHeight(x / width, shape);
  const left = -OVERSCAN * width;
  const right = (1 + OVERSCAN) * width;
  return `${curveThrough(samplePoints(yAt, left, right))}L${formatNumber(right)} ${formatNumber(bottomY)}L${formatNumber(left)} ${formatNumber(bottomY)}Z`;
}

export function buildRimPath(shape: EdgeShape, size: EdgeSize): string {
  return buildBody(shape, size.width, size.height, size.height + FILL_OVERLAP_PX);
}

export function buildEdgePath(shape: EdgeShape, size: EdgeSize): string {
  return buildBody(shape, size.width, size.height + EDGE_RIM_PX, size.height + EDGE_RIM_PX + FILL_OVERLAP_PX);
}

export function buildClipPath(shape: EdgeShape, size: EdgeSize): string {
  return buildBody(shape, size.width, 0, size.height);
}

export function buildSettledEdgePath(isNarrow: boolean): string {
  const size = isNarrow ? STATIC_VIEWS.narrow : STATIC_VIEWS.wide;
  return buildEdgePath(stillShape(isNarrow, size.height), size);
}

export function buildSettledRimPath(isNarrow: boolean): string {
  const size = isNarrow ? STATIC_VIEWS.narrow : STATIC_VIEWS.wide;
  return buildRimPath(stillShape(isNarrow, size.height), size);
}
