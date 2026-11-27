import type { Episode } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { excerptDescription } from './excerpt-description.ts';
import { formatShortDate } from './format-date.ts';
import { renderIcon } from './icons.ts';
import { renderPlayerAttributes } from './render-player-attributes.ts';

const CARD_IMAGE_SIZES = '(min-width: 900px) 28vw, (min-width: 600px) 50vw, calc(100vw - 4rem)';
const EXCERPT_MAX_CHARACTERS = 600;

function renderMedia(episode: Episode): string {
  const { thumbnail } = episode;
  const srcset = thumbnail.srcset === undefined ? '' : ` srcset="${escapeHtml(thumbnail.srcset)}"`;
  const image = `<img class="episode-card-image" src="${escapeHtml(thumbnail.src)}"${srcset} sizes="${CARD_IMAGE_SIZES}" width="${thumbnail.width}" height="${thumbnail.height}" alt="" loading="lazy">`;
  if (episode.youtubeUrl === undefined) {
    return `<div class="episode-card-art">${image}</div>`;
  }
  return `<a class="episode-card-media" href="${escapeHtml(episode.youtubeUrl)}"${renderPlayerAttributes(episode.youtubeVideoId, episode.title)} tabindex="-1" aria-hidden="true">${image}</a>`;
}

function renderActions(episode: Episode): string {
  const title = escapeHtml(episode.title);
  let playButton = '';
  let watchPill = '';
  if (episode.youtubeUrl !== undefined && episode.youtubeVideoId !== undefined) {
    const youtubeUrl = escapeHtml(episode.youtubeUrl);
    const playerAttributes = renderPlayerAttributes(episode.youtubeVideoId, episode.title);
    playButton = `<a class="round-button" href="${youtubeUrl}"${playerAttributes}>${renderIcon('play')}<span class="visually-hidden">Play ${title}</span></a>`;
    watchPill = `<a class="pill episode-card-watch" href="${youtubeUrl}"${playerAttributes}>${renderIcon('youtube', 'brand-icon')}Watch<span class="visually-hidden"> ${title} on YouTube</span></a>`;
  }
  const listenPill =
    episode.spotifyUrl === undefined
      ? ''
      : `<a class="pill" href="${escapeHtml(episode.spotifyUrl)}">${renderIcon('spotify', 'brand-icon')}Listen<span class="visually-hidden"> to ${title} on Spotify</span></a>`;
  return `${playButton}${watchPill}${listenPill}`;
}

export function renderEpisodeCard(episode: Episode, index: number): string {
  const description = excerptDescription(episode.description, EXCERPT_MAX_CHARACTERS);
  const descriptionMarkup =
    description === ''
      ? ''
      : `\n        <div class="episode-card-summary"><p class="episode-card-description">${escapeHtml(description)}</p></div>`;

  return `<li class="episode-card" data-episodes="card" style="--card-index:${index}">
      ${renderMedia(episode)}
      <div class="episode-card-body">
        <p class="label episode-card-date"><time datetime="${escapeHtml(episode.publishedAt)}">${formatShortDate(episode.publishedAt)}</time></p>
        <h3 class="episode-card-title">${escapeHtml(episode.title)}</h3>${descriptionMarkup}
        <div class="episode-card-actions">${renderActions(episode)}</div>
      </div>
    </li>`;
}
