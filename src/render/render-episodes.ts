import type { Show } from '../show/show-types.ts';
import { renderIcon } from './icons.ts';
import { renderAllEpisodesCard, renderEpisodeCard } from './render-episode-card.ts';
import { renderStainEdge, renderStillStainEdge } from './render-stain-edge.ts';

const LATEST_EPISODE_COUNT = 8;

function renderHeading(): string {
  return `<div class="episodes-copy" data-stain-landing>
      <h2 class="episodes-heading" id="episodes-heading">
        <span class="visually-hidden">Every Monday, a new one</span>
        <span class="episodes-heading-visual" aria-hidden="true">
          <span class="episodes-line-mask"><span class="episodes-line" style="--line:0">Every</span></span>
          <span class="episodes-line-mask"><span class="episodes-line" style="--line:1">Monday<span class="episodes-comma">,</span></span></span>
          <span class="episodes-line-mask episodes-line-mask--script"><span class="episodes-line episodes-script" style="--line:2">a new one</span></span>
        </span>
      </h2>
      <div class="episodes-lead-row">
        <p class="episodes-lead"><span class="episodes-line-mask"><span class="episodes-line" style="--line:3">Watch on YouTube, listen on Spotify.</span></span></p>
        ${renderNavigation()}
      </div>
    </div>`;
}

function renderNavigation(): string {
  return `<div class="episodes-nav" data-episodes="nav" hidden>
      <button class="round-button episodes-nav-button episodes-nav-button--previous" type="button" data-episodes="previous" aria-label="Previous episodes" disabled>${renderIcon('arrow')}</button>
      <button class="round-button episodes-nav-button" type="button" data-episodes="next" aria-label="Next episodes">${renderIcon('arrow')}</button>
    </div>`;
}

function renderSweeps(cardCount: number): string {
  const bands = Array.from({ length: cardCount - 1 }, (_, index) => `<div class="episodes-sweep" style="--sweep-index:${index + 1}">${renderStillStainEdge()}</div>`);
  return `<div class="episodes-sweeps" aria-hidden="true">${bands.join('')}</div>`;
}

function renderTrack(show: Show): string {
  const latestEpisodes = show.episodes.slice(0, LATEST_EPISODE_COUNT);
  const cards = [
    ...latestEpisodes.map((episode, index) => renderEpisodeCard(episode, index)),
    renderAllEpisodesCard(show.episodes.length, latestEpisodes.length),
  ];
  const dashes = cards.map(() => '<span class="episodes-dash" data-episodes="dash"></span>').join('');
  return `<div class="episodes-viewport" data-stain-landing>
      <ul class="episodes-track" role="list">
        ${cards.join('\n        ')}
      </ul>
    </div>
    <div class="episodes-dashes" style="--line:4" aria-hidden="true">${dashes}</div>`;
}

export function renderEpisodes(show: Show): string {
  if (show.episodes.length === 0) {
    return '';
  }
  const cardCount = Math.min(show.episodes.length, LATEST_EPISODE_COUNT) + 1;

  return `<section class="section episodes" id="episodes" data-section data-surface="dark" aria-labelledby="episodes-heading" style="--card-count:${cardCount}" data-module-episodes data-module-stain data-scroll data-scroll-offset="100%,100%" data-scroll-ignore-fold data-scroll-css-progress data-scroll-event-progress="episodes-progress">
    ${renderStainEdge()}
    <div class="episodes-pin">
      ${renderSweeps(cardCount)}
      ${renderHeading()}
      ${renderTrack(show)}
    </div>
  </section>`;
}
