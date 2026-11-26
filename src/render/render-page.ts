import type { Show } from '../show/show-types.ts';
import { renderAbout } from './render-about.ts';
import { renderEpisodes } from './render-episodes.ts';
import { renderFrame } from './render-frame.ts';
import { renderHero } from './render-hero.ts';
import { renderPlayer } from './render-player.ts';

export interface SectionRenderer {
  id: string;
  label: string;
  render: (show: Show) => string;
}

export const SECTION_RENDERERS: readonly SectionRenderer[] = [
  { id: 'home', label: 'Home', render: renderHero },
  { id: 'about', label: 'About the show', render: renderAbout },
  { id: 'episodes', label: 'Episodes', render: renderEpisodes },
];

export function renderSections(show: Show): string {
  return SECTION_RENDERERS.map((section) => section.render(show)).join('\n');
}

export function renderPageFrame(show: Show): string {
  return `${renderFrame(show, SECTION_RENDERERS)}
  ${renderPlayer()}`;
}
