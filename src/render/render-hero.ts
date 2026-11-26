import type { Episode, Show } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { formatShortDate } from './format-date.ts';
import { renderIcon } from './icons.ts';
import { renderPlatformPills } from './platform-links.ts';
import { renderPlayerAttributes } from './render-player-attributes.ts';
import { RING_SIZE, RING_SRC, RING_SRCSET } from './ring-asset.ts';
import { TAGLINE_LINES } from './tagline-lines.ts';

const CARD_IMAGE_SIZES = '(min-width: 900px) 26vw, 80vw';

function renderTaglineLines(): string {
  return TAGLINE_LINES.map((line, index) => {
    const tintClass = index === TAGLINE_LINES.length - 1 ? ' hero-tagline-line--tint' : '';
    return `<span class="hero-tagline-mask"><span class="hero-tagline-line${tintClass}" data-hero="line">${line}</span></span>`;
  }).join('\n        ');
}

function renderLetters(letters: string): string {
  return Array.from(letters)
    .map(
      (letter) =>
        `<span class="hero-letter-mask"><span class="hero-letter" data-hero="letter">${letter}</span></span>`,
    )
    .join('');
}

function renderRingLetter(): string {
  return `<span class="hero-letter-mask hero-letter-mask--ring"><img class="hero-letter hero-ring" data-hero="letter" src="${RING_SRC}" srcset="${RING_SRCSET}" sizes="14vw" width="${RING_SIZE}" height="${RING_SIZE}" alt=""></span>`;
}

function renderTitle(): string {
  return `<div class="hero-title" data-scroll data-scroll-speed="-0.12">
      <h1 class="hero-heading">
        <span class="visually-hidden">Pretty Unfocused</span>
        <span class="hero-heading-visual" aria-hidden="true">
          <span class="hero-script"><span class="hero-script-rise" data-hero="script"><span class="hero-script-text">Pretty</span></span></span>
          <span class="hero-word">${renderLetters('UNF')}${renderRingLetter()}${renderLetters('CUSED')}</span>
        </span>
      </h1>
    </div>`;
}

function renderEpisodeCard(episode: Episode): string {
  const title = escapeHtml(episode.title);
  const { thumbnail } = episode;
  const srcset = thumbnail.srcset === undefined ? '' : ` srcset="${escapeHtml(thumbnail.srcset)}"`;
  const youtubeUrl = episode.youtubeUrl === undefined ? undefined : escapeHtml(episode.youtubeUrl);
  const spotifyUrl = episode.spotifyUrl === undefined ? undefined : escapeHtml(episode.spotifyUrl);

  const image = `<img class="hero-card-image" src="${escapeHtml(thumbnail.src)}"${srcset} sizes="${CARD_IMAGE_SIZES}" width="${thumbnail.width}" height="${thumbnail.height}" alt="">`;
  const playerAttributes = renderPlayerAttributes(episode.youtubeVideoId, episode.title);
  const media =
    youtubeUrl === undefined
      ? image
      : `<a class="hero-card-media" href="${youtubeUrl}"${playerAttributes} tabindex="-1" aria-hidden="true">${image}</a>`;

  const watchLink =
    youtubeUrl === undefined
      ? ''
      : `<a class="hero-card-watch" href="${youtubeUrl}"${playerAttributes}><span class="round-button round-button--gold" aria-hidden="true">${renderIcon('play')}</span><span class="pill">${renderIcon('youtube', 'brand-icon')}Watch<span class="visually-hidden"> ${title} on YouTube</span></span></a>`;
  const listenPill =
    spotifyUrl === undefined
      ? ''
      : `<a class="pill" href="${spotifyUrl}">${renderIcon('spotify', 'brand-icon')}Listen<span class="visually-hidden"> to ${title} on Spotify</span></a>`;

  return `<div class="hero-card-wrap" data-scroll data-scroll-speed="0.1">
      <article class="hero-card" data-hero="card" aria-labelledby="hero-episode-title">
        ${media}
        <div class="hero-card-body">
          <p class="label hero-card-meta"><span class="hero-card-mask"><span class="hero-card-rise" data-hero="card-text">Latest episode <span class="hero-card-meta-date"><span class="hero-card-meta-dot">&middot;&nbsp;</span><time datetime="${escapeHtml(episode.publishedAt)}">${formatShortDate(episode.publishedAt)}</time></span></span></span></p>
          <h2 class="hero-card-title" id="hero-episode-title"><span class="hero-card-mask"><span class="hero-card-rise" data-hero="card-text">${title}</span></span></h2>
          <div class="hero-card-mask"><div class="hero-card-actions hero-card-rise" data-hero="card-text">${watchLink}${listenPill}</div></div>
        </div>
      </article>
    </div>`;
}

export function renderHero(show: Show): string {
  const [latestEpisode] = show.episodes;
  const card = latestEpisode === undefined ? '' : renderEpisodeCard(latestEpisode);

  return `<section class="section section--wine hero" id="home" data-section data-surface="dark" data-module-hero>
    ${renderTitle()}
    ${card}
    <div class="hero-tagline">
      <p class="hero-tagline-text">
        ${renderTaglineLines()}
      </p>
      <span class="sticker hero-sticker" data-hero="sticker" aria-hidden="true">🩷✨🪩</span>
    </div>
    <div class="hero-schedule">
      <p class="hero-schedule-text">New episode every Monday morning, 6&nbsp;am CT.</p>
      <ul class="pill-list" role="list">${renderPlatformPills()}</ul>
    </div>
  </section>`;
}
