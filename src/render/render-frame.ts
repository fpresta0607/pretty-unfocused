import type { Show } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { renderIcon, renderIconSprite } from './icons.ts';
import { PLATFORM_LINKS, renderPlatformPills } from './platform-links.ts';
import { RING_SMALL_SIZE, RING_SMALL_SRC } from './ring-asset.ts';

export interface FrameSection {
  id: string;
  label: string;
}

const MINI_IMAGE_SIZES = '96px';

function renderMenuButton(): string {
  return `<button class="round-button frame-button frame-button--menu" type="button" aria-expanded="false" aria-controls="menu-panel" data-menu="toggle">
      <span class="visually-hidden">Menu</span>
      <span class="frame-button-icon frame-button-icon--open">${renderIcon('menu')}</span>
      <span class="frame-button-icon frame-button-icon--close">${renderIcon('close')}</span>
    </button>`;
}

function renderMenuPanel(sections: readonly FrameSection[]): string {
  const links = sections
    .map((section, index) => {
      const number = String(index + 1).padStart(2, '0');
      return `<li><a class="menu-link" href="#${escapeHtml(section.id)}" data-menu="link"><span class="menu-link-number" aria-hidden="true">${number}</span><span class="menu-link-label">${escapeHtml(section.label)}</span></a></li>`;
    })
    .join('');
  return `<nav class="menu-panel" id="menu-panel" aria-label="Sections" data-menu="panel" data-lenis-prevent>
      <ul class="menu-list" role="list">${links}</ul>
      <ul class="pill-list menu-socials" role="list">${renderPlatformPills()}</ul>
    </nav>`;
}

function renderListenPanel(): string {
  const links = PLATFORM_LINKS.map(
    (link) =>
      `<li><a class="listen-link" href="${escapeHtml(link.url)}" data-listen="link">${renderIcon(link.icon, 'brand-icon')}${escapeHtml(link.label)}</a></li>`,
  ).join('');
  return `<div class="listen-panel" id="listen-panel" data-listen="panel">
      <p class="label listen-title">Listen on</p>
      <ul class="listen-list" role="list">${links}</ul>
    </div>`;
}

function renderMiniCard(show: Show): string {
  const [latestEpisode] = show.episodes;
  if (latestEpisode === undefined) {
    return '';
  }
  const playUrl = latestEpisode.youtubeUrl ?? latestEpisode.spotifyUrl;
  if (playUrl === undefined) {
    return '';
  }
  const platform = latestEpisode.youtubeUrl === undefined ? 'Spotify' : 'YouTube';
  const title = escapeHtml(latestEpisode.title);
  const { thumbnail } = latestEpisode;
  const srcset = thumbnail.srcset === undefined ? '' : ` srcset="${escapeHtml(thumbnail.srcset)}"`;
  return `<aside class="mini-card" aria-label="Latest episode" data-frame="mini" data-inert-on-menu>
      <img class="mini-card-image" src="${escapeHtml(thumbnail.src)}"${srcset} sizes="${MINI_IMAGE_SIZES}" width="${thumbnail.width}" height="${thumbnail.height}" alt="" decoding="async" fetchpriority="low">
      <a class="mini-card-link" href="${escapeHtml(playUrl)}" aria-label="Play ${title} on ${platform}">
        <span class="label mini-card-label">Latest<span class="mini-card-label-rest"> episode</span></span>
        <span class="mini-card-title">${title}</span>
      </a>
      <span class="round-button round-button--gold mini-card-play" aria-hidden="true">${renderIcon('play')}</span>
    </aside>`;
}

export function renderFrame(show: Show, sections: readonly FrameSection[]): string {
  const firstSection = sections[0];
  const firstLabel = firstSection === undefined ? '' : escapeHtml(firstSection.label);
  return `${renderIconSprite()}
  <header class="frame" data-module-frame>
    <div class="frame-corner frame-corner--menu" data-module-menu>
      ${renderMenuButton()}
      ${renderMenuPanel(sections)}
    </div>
    <a class="frame-mark" href="#main" aria-label="Pretty Unfocused, back to the top" data-inert-on-menu data-hidden><img src="${RING_SMALL_SRC}" width="${RING_SMALL_SIZE}" height="${RING_SMALL_SIZE}" alt=""></a>
    <div class="frame-corner frame-corner--listen" data-module-listen>
      <button class="round-button frame-button frame-button--listen" type="button" aria-expanded="false" aria-controls="listen-panel" data-listen="toggle">
        <span class="visually-hidden">Listen</span>
        ${renderIcon('headphones')}
      </button>
      ${renderListenPanel()}
    </div>
    <p class="label frame-section" data-frame="section" data-inert-on-menu>${firstLabel}</p>
    ${renderMiniCard(show)}
  </header>`;
}
