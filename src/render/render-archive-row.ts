import type { Episode } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { formatDuration } from './format-duration.ts';
import { formatShortDate } from './format-date.ts';
import { renderIcon } from './icons.ts';
import { renderPlayerAttributes } from './render-player-attributes.ts';

function renderNumber(number: number | undefined): string {
  if (number === undefined) {
    return '';
  }
  return `<span class="archive-number" data-archive="number"><span class="visually-hidden">Episode </span>${number}</span>`;
}

function renderMeta(episode: Episode): string {
  const length =
    episode.durationSeconds === undefined
      ? ''
      : `<span class="archive-length" data-archive="length"> · ${formatDuration(episode.durationSeconds)}</span>`;
  return `<span class="archive-meta"><time datetime="${escapeHtml(episode.publishedAt)}">${formatShortDate(episode.publishedAt)}</time>${length}</span>`;
}

function renderActions(episode: Episode): string {
  const title = escapeHtml(episode.title);
  const watch =
    episode.youtubeUrl === undefined
      ? ''
      : `<a class="pill" href="${escapeHtml(episode.youtubeUrl)}"${renderPlayerAttributes(episode.youtubeVideoId, episode.title)}>${renderIcon('youtube', 'brand-icon')}Watch on YouTube<span class="visually-hidden">: ${title}</span></a>`;
  const listen =
    episode.spotifyUrl === undefined
      ? ''
      : `<a class="pill pill--solid" href="${escapeHtml(episode.spotifyUrl)}">${renderIcon('spotify', 'brand-icon')}Listen on Spotify<span class="visually-hidden">: ${title}</span></a>`;
  return `${watch}${listen}`;
}

export function renderArchiveRow(episode: Episode, index: number, number: number | undefined): string {
  const descriptionMarkup = episode.description === '' ? '' : `<p class="archive-description">${escapeHtml(episode.description)}</p>`;
  const actions = renderActions(episode);
  const actionsMarkup = actions === '' ? '' : `<div class="archive-actions">${actions}</div>`;
  return `<li class="archive-row" data-archive="row">
        <button class="archive-trigger" id="archive-trigger-${index}" type="button" aria-expanded="true" aria-controls="archive-panel-${index}" data-archive="trigger">
          ${renderNumber(number)}
          <span class="archive-title">${escapeHtml(episode.title)}</span>
          ${renderMeta(episode)}
          <span class="archive-toggle" aria-hidden="true"></span>
        </button>
        <div class="archive-panel" id="archive-panel-${index}" data-archive="panel">
          <div class="archive-panel-inner">${descriptionMarkup}${actionsMarkup}</div>
        </div>
      </li>`;
}
