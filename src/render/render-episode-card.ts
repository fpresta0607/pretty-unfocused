import { YOUTUBE_CHANNEL_URL } from '../show/show-links.ts';
import type { Episode } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { formatShortDate } from './format-date.ts';
import { renderIcon } from './icons.ts';
import { RING_SIZE, RING_SRC, RING_SRCSET } from './ring-asset.ts';
import { renderPlayerAttributes } from './render-player-attributes.ts';

const CARD_IMAGE_SIZES = '(min-width: 900px) 28vw, 90vw';
const VIDEO_THUMBNAIL_BASE_URL = 'https://i.ytimg.com/vi';
const EXCERPT_MAX_CHARACTERS = 600;
const RING_IMAGE_SIZES = '(min-width: 900px) 20vw, 60vw';

function excerpt(description: string): string {
  if (description.length <= EXCERPT_MAX_CHARACTERS) {
    return description;
  }
  const clipped = description.slice(0, EXCERPT_MAX_CHARACTERS);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

function videoSrcset(videoId: string): string {
  const baseUrl = `${VIDEO_THUMBNAIL_BASE_URL}/${encodeURIComponent(videoId)}`;
  return `${baseUrl}/hqdefault.jpg 480w, ${baseUrl}/sddefault.jpg 640w`;
}

function renderMedia(episode: Episode): string {
  const { thumbnail } = episode;
  const srcset = episode.youtubeVideoId === undefined ? '' : ` srcset="${escapeHtml(videoSrcset(episode.youtubeVideoId))}"`;
  const image = `<img class="episode-card-image" src="${escapeHtml(thumbnail.src)}"${srcset} sizes="${CARD_IMAGE_SIZES}" width="${thumbnail.width}" height="${thumbnail.height}" alt="" loading="eager">`;
  if (episode.youtubeUrl === undefined) {
    return `<div class="episode-card-art">${image}</div>`;
  }
  return `<a class="episode-card-media" href="${escapeHtml(episode.youtubeUrl)}"${renderPlayerAttributes(episode.youtubeVideoId, episode.title)} tabindex="-1" aria-hidden="true">${image}</a>`;
}

function renderActions(episode: Episode): string {
  const title = escapeHtml(episode.title);
  const playButton =
    episode.youtubeUrl === undefined || episode.youtubeVideoId === undefined
      ? ''
      : `<a class="round-button" href="${escapeHtml(episode.youtubeUrl)}"${renderPlayerAttributes(episode.youtubeVideoId, episode.title)}>${renderIcon('play')}<span class="visually-hidden">Play ${title}</span></a>`;
  const watchPill =
    episode.youtubeUrl === undefined
      ? ''
      : `<a class="pill episode-card-watch" href="${escapeHtml(episode.youtubeUrl)}">${renderIcon('youtube', 'brand-icon')}Watch<span class="visually-hidden"> ${title} on YouTube</span></a>`;
  const listenPill =
    episode.spotifyUrl === undefined
      ? ''
      : `<a class="pill" href="${escapeHtml(episode.spotifyUrl)}">${renderIcon('spotify', 'brand-icon')}Listen<span class="visually-hidden"> to ${title} on Spotify</span></a>`;
  return `${playButton}${watchPill}${listenPill}`;
}

export function renderEpisodeCard(episode: Episode, index: number): string {
  const description = excerpt(episode.description);
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

export function renderAllEpisodesCard(episodeCount: number, index: number): string {
  return `<li class="episode-card episode-card--all" data-episodes="card" style="--card-index:${index}">
      <a class="episode-all" href="${escapeHtml(YOUTUBE_CHANNEL_URL)}">
        <span class="visually-hidden">All ${episodeCount} episodes</span>
        <span class="episode-all-panel" aria-hidden="true">
          <img class="episode-all-ring" src="${RING_SRC}" srcset="${RING_SRCSET}" sizes="${RING_IMAGE_SIZES}" width="${RING_SIZE}" height="${RING_SIZE}" alt="" loading="lazy" decoding="async">
          <span class="episode-all-count">${episodeCount}</span>
        </span>
        <span class="episode-all-title" aria-hidden="true">All episodes</span>
        <span class="episode-all-line">Every conversation, from the first to the latest.</span>
        <span class="round-button" aria-hidden="true">${renderIcon('arrow')}</span>
      </a>
    </li>`;
}
