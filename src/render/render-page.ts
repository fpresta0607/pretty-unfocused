import type { Show } from '../show/show-types.ts';
import { renderAbout } from './render-about.ts';
import { renderClips } from './render-clips.ts';
import { renderEpisodes } from './render-episodes.ts';
import { renderFooter } from './render-footer.ts';
import { renderFrame } from './render-frame.ts';
import { renderHero } from './render-hero.ts';
import { renderPlayer } from './render-player.ts';

export interface SectionRenderer {
  id: string;
  label: string;
  render: (show: Show) => string;
}

const FOOTER_SECTION: SectionRenderer = { id: 'say-hi', label: 'Say hi', render: renderFooter };

export const SECTION_RENDERERS: readonly SectionRenderer[] = [
  { id: 'home', label: 'Home', render: renderHero },
  { id: 'about', label: 'About the show', render: renderAbout },
  { id: 'episodes', label: 'Episodes', render: renderEpisodes },
  { id: 'clips', label: 'Clips', render: renderClips },
  FOOTER_SECTION,
];

export function renderSections(show: Show): string {
  return SECTION_RENDERERS.filter((section) => section !== FOOTER_SECTION)
    .map((section) => section.render(show))
    .join('\n');
}

export function renderPageFooter(show: Show): string {
  return FOOTER_SECTION.render(show);
}

export function renderPageFrame(show: Show): string {
  const presentSections = SECTION_RENDERERS.filter((section) => section.render(show) !== '');
  return `${renderFrame(show, presentSections)}
  ${renderPlayer()}`;
}
