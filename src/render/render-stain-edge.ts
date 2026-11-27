import { buildSettledEdgePath, buildSettledRimPath, STATIC_VIEWS } from '../modules/stain-edge.ts';

function renderEdgeSet(name: 'wide' | 'narrow', liveAttribute: string): string {
  const { width, height } = STATIC_VIEWS[name];
  return `<svg class="stain-edge stain-edge--${name}"${liveAttribute} viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><use class="stain-edge-rim" href="#stain-edge-rim-${name}"/><use class="stain-edge-fill" href="#stain-edge-fill-${name}"/></svg>`;
}

export function renderStainEdgeDefinitions(): string {
  const paths = (['wide', 'narrow'] as const).map(
    (name) =>
      `<path id="stain-edge-rim-${name}" d="${buildSettledRimPath(name === 'narrow')}"/><path id="stain-edge-fill-${name}" d="${buildSettledEdgePath(name === 'narrow')}"/>`,
  );
  return `<svg width="0" height="0" class="icon-sprite" aria-hidden="true" focusable="false"><defs>${paths.join('')}</defs></svg>`;
}

export function renderStainEdge(): string {
  return `${renderEdgeSet('wide', ' data-stain-set="wide"')}${renderEdgeSet('narrow', ' data-stain-set="narrow"')}`;
}

export function renderStillStainEdge(): string {
  return `${renderEdgeSet('wide', '')}${renderEdgeSet('narrow', '')}`;
}
