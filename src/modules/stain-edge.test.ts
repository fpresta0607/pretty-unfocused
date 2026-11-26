import { describe, expect, it } from 'vitest';

import {
  buildClipPath,
  buildEdgePath,
  buildRimPath,
  buildSettledEdgePath,
  buildSettledRimPath,
  EDGE_RIM_PX,
  edgeHeight,
  edgeProfile,
  edgeShape,
  settledEdgeShape,
  STATIC_VIEWS,
  SWEEP_END_PROGRESS,
  sweepProgress,
  type EdgeShape,
} from './stain-edge.ts';

const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 390, height: 844 };
const VIEWPORTS = [
  ['a wide screen', WIDE, 4, 5, 0.12, 0.04],
  ['a phone', NARROW, 3, 3, 0.1, 0.035],
] as const;
const MIN_TROUGH_RADIUS_PX = 15;
const EDGE_RISE_PX = 180;
const POSITIONS = Array.from({ length: 1001 }, (_, index) => index / 1000);

function sectionTopAt(progress: number, viewport: { height: number }): number {
  return viewport.height * (1 - SWEEP_END_PROGRESS * progress);
}

function shapeAt(progress: number, viewport: { width: number; height: number }): EdgeShape {
  return edgeShape(sectionTopAt(progress, viewport), viewport.width, viewport.height);
}

function edgeYs(progress: number, viewport: { width: number; height: number }): number[] {
  const shape = shapeAt(progress, viewport);
  const top = sectionTopAt(progress, viewport);
  return POSITIONS.map((position) => top - edgeHeight(position, shape));
}

function findSummits(shape: EdgeShape): number[] {
  const profile = POSITIONS.map((position) => edgeProfile(shape, position));
  return POSITIONS.filter((_, index) => {
    const here = profile[index] ?? 0;
    return index > 0 && index < profile.length - 1 && here > (profile[index - 1] ?? 0) && here >= (profile[index + 1] ?? 0);
  });
}

function findTroughRadii(shape: EdgeShape, viewport: { width: number }): number[] {
  const step = 3;
  const heights = POSITIONS.map((position) => edgeHeight(position, shape));
  const pixelsPerIndex = viewport.width / (POSITIONS.length - 1);
  return POSITIONS.flatMap((_, index) => {
    const here = heights[index] ?? 0;
    const isTrough = index > step && index < heights.length - step - 1 && here < (heights[index - 1] ?? 0) && here <= (heights[index + 1] ?? 0);
    if (!isTrough) {
      return [];
    }
    const curvature = ((heights[index + step] ?? 0) - 2 * here + (heights[index - step] ?? 0)) / (step * pixelsPerIndex) ** 2;
    return [curvature > 0 ? 1 / curvature : Number.POSITIVE_INFINITY];
  });
}

function countSubpaths(path: string): number {
  return path.split('M').length - 1;
}

describe('sweepProgress', () => {
  it.each([
    ['is zero while the section is below the screen', 1200, 0],
    ['is zero as the section top enters the bottom of the screen', 900, 0],
    ['is half done when the section top is at 75% of the screen height', 675, 0.5],
    ['is done when the section top is at 50% of the screen height', 450, 1],
    ['stays done as the section keeps rising', -400, 1],
  ])('%s', (_name, sectionTop, expected) => {
    expect(sweepProgress(sectionTop, 900)).toBeCloseTo(expected, 6);
  });
});

describe.each(VIEWPORTS)('the stain sweep on %s', (_name, viewport, fewestDomes, mostDomes, minStandout, minCrestTravel) => {
  it('starts as a small stain at the section top and has not yet reached the screen', () => {
    const ys = edgeYs(0, viewport);

    expect(Math.min(...ys)).toBeGreaterThan(viewport.height * 0.85);
  });

  it.each([0, 1, 2])('keeps the whole edge, rim included, below the bottom of the screen with the section top %j px above it', (pixelsAbove) => {
    const sectionTop = viewport.height - pixelsAbove;
    const shape = edgeShape(sectionTop, viewport.width, viewport.height);
    const ys = POSITIONS.map((position) => sectionTop - edgeHeight(position, shape));

    expect(Math.min(...ys)).toBeGreaterThanOrEqual(viewport.height);
  });

  it('has the whole screen cream, with a margin, by the time the section top is at 50% of the screen', () => {
    const ys = edgeYs(1, viewport);

    expect(Math.min(...ys)).toBeLessThan(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(-viewport.height * 0.02);
  });

  it('has its highest point leave the top of the screen before the sweep finishes', () => {
    expect(Math.min(...edgeYs(0.4, viewport))).toBeGreaterThan(0);
    expect(Math.min(...edgeYs(0.9, viewport))).toBeLessThan(0);
  });

  it('grows gently in and out, following the scrub ease', () => {
    const steps = Array.from({ length: 10 }, (_, index) => shapeAt((index + 1) / 10, viewport).rise - shapeAt(index / 10, viewport).rise);
    const fastest = Math.max(...steps);

    expect(steps[0]).toBeLessThan(fastest * 0.3);
    expect(steps[9]).toBeLessThan(fastest * 0.3);
    expect(steps[4]).toBeGreaterThan(fastest * 0.9);
  });

  it('moves the edge a similar distance with each of the first four equal scroll steps', () => {
    const meanEdgeY = (progress: number): number => {
      const ys = edgeYs(progress, viewport);
      return ys.reduce((sum, y) => sum + y, 0) / ys.length;
    };
    const distances = [0, 1, 2, 3].map((index) => meanEdgeY(index * 0.2) - meanEdgeY((index + 1) * 0.2));

    expect(Math.max(...distances) / Math.min(...distances)).toBeLessThan(2);
  });

  it('travels sideways as it climbs: the dominant crest moves at least a few percent of the width with every equal scroll step', () => {
    const crestAt = (progress: number): number => {
      const shape = shapeAt(progress, viewport);
      return POSITIONS.reduce((best, position) => (edgeHeight(position, shape) > edgeHeight(best, shape) ? position : best), 0);
    };
    const stepProgress = (0.092 * viewport.height) / (viewport.height * SWEEP_END_PROGRESS);
    const crests = [1, 2, 3, 4].map((index) => crestAt(index * stepProgress));

    crests.slice(1).forEach((crest, index) => {
      expect(crest - (crests[index] ?? 0)).toBeGreaterThanOrEqual(minCrestTravel);
    });
  });

  it('tilts the edge so one side leads early and the other catches up late, ending level', () => {
    expect(shapeAt(0.2, viewport).tilt).toBeGreaterThan(0);
    expect(shapeAt(0.7, viewport).tilt).toBeLessThan(0);
    expect(shapeAt(1, viewport).tilt).toBeCloseTo(0, 6);
  });

  it('parts its domes outward and swells them at every step, so the silhouette changes and does not only rise', () => {
    const centres = [0.1, 0.4, 0.7, 1].map((progress) => shapeAt(progress, viewport).domes.map((dome) => dome.centre));
    const widths = [0.1, 1].map((progress) => shapeAt(progress, viewport).domes.map((dome) => dome.halfWidth));

    centres.slice(1).forEach((later, step) => {
      const earlier = centres[step] ?? [];
      const [anchor = 0] = earlier;
      later.slice(1).forEach((centre, index) => {
        expect(Math.abs(centre - anchor)).toBeGreaterThan(Math.abs((earlier[index + 1] ?? 0) - anchor));
      });
    });
    widths[1]?.forEach((width, index) => expect(width).toBeGreaterThan(widths[0]?.[index] ?? Number.POSITIVE_INFINITY));
  });

  it('leaves the hero visible, covering it progressively through the first half of the rise', () => {
    const progresses = Array.from({ length: 21 }, (_, index) => index / 20);
    const coveredShares = progresses.map((progress) => {
      const ys = edgeYs(progress, viewport);
      const covered = ys.reduce((sum, y) => sum + Math.min(Math.max(viewport.height - y, 0), viewport.height), 0);
      return covered / (ys.length * viewport.height);
    });

    expect(coveredShares[5]).toBeLessThan(0.6);
    expect(coveredShares[10]).toBeLessThan(0.97);
    expect(coveredShares[0]).toBeLessThan(0.02);
    expect(coveredShares[10]).toBeGreaterThan(coveredShares[5] ?? 1);
    coveredShares.slice(1).forEach((share, index) => {
      expect(share).toBeGreaterThanOrEqual(coveredShares[index] ?? 1);
    });
  });

  it('changes its silhouette at every scroll step until it has all but covered the screen', () => {
    const progresses = Array.from({ length: 25 }, (_, index) => 0.2 + (index / 24) * 0.6);

    progresses.slice(1).forEach((progress, index) => {
      const before = shapeAt(progresses[index] ?? 0, viewport);
      const after = shapeAt(progress, viewport);
      const largestChange = Math.max(...POSITIONS.map((position) => Math.abs(edgeProfile(after, position) - edgeProfile(before, position))));
      expect(largestChange).toBeGreaterThan(0.0002);
    });
  });

  it('never has a straight line on the screen, keeping its relief while any of it is visible', () => {
    const progresses = Array.from({ length: 19 }, (_, index) => 0.35 + index / 40);

    progresses.forEach((progress) => {
      const ys = edgeYs(progress, viewport);
      const isOnScreen = Math.min(...ys) < viewport.height * 0.9 && Math.max(...ys) > viewport.height * 0.1;
      if (isOnScreen) {
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(viewport.height * 0.02);
      }
    });
  });

  it('is an irregular spill of domes of different heights, one dominant', () => {
    const shape = shapeAt(0.4, viewport);
    const summits = findSummits(shape);
    const heights = summits.map((summit) => edgeProfile(shape, summit)).sort((a, b) => b - a);

    expect(summits.length).toBeGreaterThanOrEqual(fewestDomes);
    expect(summits.length).toBeLessThanOrEqual(mostDomes);
    expect((heights[0] ?? 0) / (heights[1] ?? 1)).toBeGreaterThan(1.05);
    expect(new Set(heights.map((height) => height.toFixed(2))).size).toBe(heights.length);
  });

  it('rounds every dome off, almost flat at the top and steep on the flanks, never pointed', () => {
    const step = 0.004;
    const progresses = [0.2, 0.4, 0.6, 0.8];

    progresses.forEach((progress) => {
      const shape = shapeAt(progress, viewport);
      findSummits(shape).forEach((summit) => {
        const topSlope = (edgeProfile(shape, summit) - edgeProfile(shape, summit + step)) / step;
        const flankSlopes = Array.from({ length: 30 }, (_, index) => {
          const position = summit + (index - 15) * step;
          return Math.abs(edgeProfile(shape, position + step) - edgeProfile(shape, position)) / step;
        });
        expect(topSlope).toBeLessThan(Math.max(...flankSlopes) * 0.15);
      });
    });
  });

  it('rounds every trough between two domes into a smooth curve, never a sharp V', () => {
    const progresses = [0.2, 0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8];

    progresses.forEach((progress) => {
      const radii = findTroughRadii(shapeAt(progress, viewport), viewport);
      expect(radii.length).toBeGreaterThan(0);
      radii.forEach((radius) => expect(radius).toBeGreaterThanOrEqual(MIN_TROUGH_RADIUS_PX));
    });
  });

  it('keeps the dominant dome clearly above the smaller ones from the first frame until the edge leaves the top of the screen', () => {
    const progresses = [0.1, 0.15, 0.2, 0.3, 0.45, 0.6];

    progresses.forEach((progress) => {
      const shape = shapeAt(progress, viewport);
      const [dominant = 0, second = 0] = findSummits(shape)
        .map((summit) => edgeHeight(summit, shape))
        .sort((a, b) => b - a);
      expect(dominant - second).toBeGreaterThanOrEqual(viewport.height * minStandout);
    });
  });

  it('holds the relief of the silhouette steady while the edge rises to the top of the screen, never flattening it', () => {
    const reliefAt = (progress: number): number => {
      const heights = POSITIONS.map((position) => edgeHeight(position, shapeAt(progress, viewport)));
      return Math.max(...heights) - Math.min(...heights);
    };
    const reliefs = [0.1, 0.2, 0.4, 0.6].map(reliefAt);

    expect(Math.min(...reliefs)).toBeGreaterThan(viewport.height * 0.1);
    expect(Math.min(...reliefs)).toBeGreaterThan(Math.max(...reliefs) * 0.7);
  });

  it('clears its last wine as shallow, wide scallops that are never a half disc hanging from the top of the screen', () => {
    const findPockets = (ys: readonly number[]): { depth: number; width: number }[] => {
      const pockets: { depth: number; width: number }[] = [];
      let from = -1;
      ys.forEach((y, index) => {
        if (y > 0 && from < 0) {
          from = index;
        }
        if (from >= 0 && (y <= 0 || index === ys.length - 1)) {
          pockets.push({ depth: Math.max(...ys.slice(from, index)), width: ((index - from) / (ys.length - 1)) * viewport.width });
          from = -1;
        }
      });
      return pockets;
    };

    [0.9, 0.93, 0.96].forEach((progress) => {
      findPockets(edgeYs(progress, viewport)).forEach(({ depth, width }) => {
        expect(depth).toBeLessThan(viewport.height * 0.04);
        expect(depth / width).toBeLessThan(0.3);
      });
    });
  });

  it('stands the dominant dome well above the section top as soon as the first cream shows', () => {
    const shape = shapeAt(0.1, viewport);

    expect(edgeHeight(0.58, shape) - shape.rise).toBeGreaterThan(viewport.height * 0.1);
  });

  it('draws one smooth cream body, with no outline and no loose shapes', () => {
    const path = buildEdgePath(shapeAt(0.4, viewport), { width: viewport.width, height: viewport.height });

    expect(countSubpaths(path)).toBe(1);
    expect(path.startsWith('M-')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('draws a roast rim along the whole edge, the cream body sitting exactly the rim width below it', () => {
    const shape = shapeAt(0.4, viewport);
    const size = { width: viewport.width, height: viewport.height };
    const readYs = (path: string): number[] => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, index) => index % 2 === 1);
    const rimYs = readYs(buildRimPath(shape, size));
    const bodyYs = readYs(buildEdgePath(shape, size));

    expect(EDGE_RIM_PX).toBeGreaterThanOrEqual(3);
    expect(EDGE_RIM_PX).toBeLessThanOrEqual(5);
    expect(bodyYs).toHaveLength(rimYs.length);
    bodyYs.forEach((bodyY, index) => expect(bodyY - (rimYs[index] ?? Number.NaN)).toBeCloseTo(EDGE_RIM_PX, 1));
  });

  it('draws a clip path of the same shape that runs from the section top down to the section bottom', () => {
    const shape = shapeAt(0.4, viewport);
    const clip = buildClipPath(shape, { width: viewport.width, height: 1800 });
    const numbers = (clip.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const ys = numbers.filter((_, index) => index % 2 === 1);

    expect(countSubpaths(clip)).toBe(1);
    expect(Math.min(...ys)).toBeCloseTo(-Math.max(...POSITIONS.map((position) => edgeHeight(position, shape))), 0);
    expect(Math.max(...ys)).toBe(1800);
  });
});

describe('the domes of the phone', () => {
  it('are fewer than the domes of a wide screen', () => {
    expect(findSummits(shapeAt(0.4, NARROW)).length).toBeLessThan(findSummits(shapeAt(0.4, WIDE)).length);
  });
});

describe('buildSettledEdgePath', () => {
  function readNumbers(path: string): number[] {
    return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  }

  it.each([
    ['a wide screen', false, WIDE, STATIC_VIEWS.wide],
    ['a phone', true, NARROW, STATIC_VIEWS.narrow],
  ])('draws the same domes as the still edge the frame reads for %s', (_name, isNarrow, viewport, view) => {
    const settled = readNumbers(buildSettledEdgePath(isNarrow));
    const shape = settledEdgeShape(viewport.width, EDGE_RISE_PX);
    const scale = view.height / EDGE_RISE_PX;
    const scaled = { ...shape, rise: shape.rise * scale, relief: shape.relief * scale };
    const expected = readNumbers(buildEdgePath(scaled, view));

    expect(settled).toHaveLength(expected.length);
    settled.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index] ?? Number.NaN, 0);
    });
  });

  it('draws one body with no loose shapes', () => {
    expect(countSubpaths(buildSettledEdgePath(false))).toBe(1);
    expect(countSubpaths(buildSettledEdgePath(true))).toBe(1);
  });

  it.each([false, true])('draws a still rim under the same silhouette (phone: %s)', (isNarrow) => {
    const rim = readNumbers(buildSettledRimPath(isNarrow));
    const body = readNumbers(buildSettledEdgePath(isNarrow));

    expect(rim).toHaveLength(body.length);
    expect(countSubpaths(buildSettledRimPath(isNarrow))).toBe(1);
    expect(rim.filter((_, index) => index % 2 === 0)).toEqual(body.filter((_, index) => index % 2 === 0));
  });

  it('draws different silhouettes for a wide screen and a phone', () => {
    expect(buildSettledEdgePath(true)).not.toBe(buildSettledEdgePath(false));
  });

  it('keeps the still edge within the room under the hero', () => {
    const shape = settledEdgeShape(WIDE.width, EDGE_RISE_PX);

    expect(Math.max(...POSITIONS.map((position) => edgeHeight(position, shape)))).toBeLessThanOrEqual(EDGE_RISE_PX);
  });
});
