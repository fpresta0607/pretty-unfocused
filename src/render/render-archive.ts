import type { Episode, Show } from '../show/show-types.ts';
import { renderArchiveRow } from './render-archive-row.ts';
import { renderSectionHeading } from './render-section-heading.ts';
import { renderStainEdge } from './render-stain-edge.ts';

function numberEpisodes(episodes: readonly Episode[]): (number | undefined)[] {
  const newestNumberedIndex = episodes.findIndex((episode) => episode.number !== undefined);
  const newestNumber = episodes[newestNumberedIndex]?.number;
  return episodes.map((episode, index) =>
    episode.number ?? (newestNumber !== undefined && index < newestNumberedIndex ? newestNumber + newestNumberedIndex - index : undefined),
  );
}

export function renderArchive(show: Show): string {
  if (show.episodes.length === 0) {
    return '';
  }
  const numbers = numberEpisodes(show.episodes);
  const rows = show.episodes.map((episode, index) => renderArchiveRow(episode, index, numbers[index]));
  return `<section class="section section--cream archive" id="every-episode" data-section data-surface="light" data-module-archive data-module-stain aria-labelledby="archive-heading">
    ${renderStainEdge()}
    <div class="archive-inner">
      ${renderSectionHeading({ id: 'archive-heading', accessibleName: 'Every episode, so far', lines: ['Every', 'episode,'], script: 'so far' })}
      <ol class="archive-list" role="list" data-archive="list">
        ${rows.join('\n        ')}
      </ol>
    </div>
  </section>`;
}
