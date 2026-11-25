import type { Show } from '../show/show-types.ts';
import { renderFrame } from './render-frame.ts';
import { renderHero } from './render-hero.ts';

export interface SectionRenderer {
  id: string;
  label: string;
  render: (show: Show) => string;
}

export const SECTION_RENDERERS: readonly SectionRenderer[] = [
  { id: 'home', label: 'Home', render: renderHero },
];

export function renderSections(show: Show): string {
  return SECTION_RENDERERS.map((section) => section.render(show)).join('\n');
}

export function renderPageFrame(show: Show): string {
  return renderFrame(show, SECTION_RENDERERS);
}
