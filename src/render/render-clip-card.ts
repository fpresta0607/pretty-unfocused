import type { Clip } from '../show/show-types.ts';
import { escapeHtml } from './escape-html.ts';
import { renderIcon } from './icons.ts';
import { renderPlayerAttributes } from './render-player-attributes.ts';

const VIDEO_THUMBNAIL_BASE_URL = 'https://i.ytimg.com/vi';
const CARD_IMAGE_SIZES = '(min-width: 900px) 16vw, 38vw';

function renderSrcset(clip: Clip): string {
  const { thumbnail } = clip;
  if (thumbnail.height > thumbnail.width) {
    return '';
  }
  const baseUrl = `${VIDEO_THUMBNAIL_BASE_URL}/${encodeURIComponent(clip.youtubeVideoId)}`;
  const srcset = `${baseUrl}/hqdefault.jpg 480w, ${baseUrl}/sddefault.jpg 640w`;
  return ` srcset="${escapeHtml(srcset)}" sizes="${CARD_IMAGE_SIZES}"`;
}

export function renderClipCard(clip: Clip, position: number, layer: number): string {
  const title = escapeHtml(clip.title);
  const { thumbnail } = clip;
  return `<li class="clip-card" data-clips="card" style="--fan-position:${position};--fan-layer:${layer}">
          <div class="clip-card-face">
            <img class="clip-card-image" src="${escapeHtml(thumbnail.src)}"${renderSrcset(clip)} width="${thumbnail.width}" height="${thumbnail.height}" alt="" loading="lazy" decoding="async">
            <p class="clip-card-title">${title}</p>
            <a class="round-button round-button--gold clip-card-play" href="${escapeHtml(clip.youtubeUrl)}"${renderPlayerAttributes(clip.youtubeVideoId, clip.title, 'vertical')}>${renderIcon('play')}<span class="visually-hidden">Play ${title}</span></a>
          </div>
        </li>`;
}
