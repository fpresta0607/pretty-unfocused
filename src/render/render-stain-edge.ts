import { buildSettledEdgePath, buildSettledRimPath, STATIC_VIEWS } from '../modules/stain-edge.ts';

function renderEdgeSet(name: 'wide' | 'narrow'): string {
  const { width, height } = STATIC_VIEWS[name];
  return `<svg class="stain-edge stain-edge--${name}" data-stain-set="${name}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="stain-edge-rim" d="${buildSettledRimPath(name === 'narrow')}"/><path class="stain-edge-fill" d="${buildSettledEdgePath(name === 'narrow')}"/></svg>`;
}

export function renderStainEdge(): string {
  return `${renderEdgeSet('wide')}${renderEdgeSet('narrow')}`;
}
