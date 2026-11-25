import type { Show } from '../show/show-types.ts';

export interface SectionRenderer {
  id: string;
  label: string;
  render: (show: Show) => string;
}

export const SECTION_RENDERERS: readonly SectionRenderer[] = [];

export function renderSections(show: Show): string {
  return SECTION_RENDERERS.map((section) => section.render(show)).join('\n');
}
