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

const MAX_TRAILING_MARK_SYMBOLS = 3;
const MAX_OPENING_WORD_LENGTH = 3;
const MAX_OPENING_GROUP_LENGTH = 14;

function groupTitleWords(title: string): string[] {
  const words: string[] = [];
  const tokens = title.split(/\s+/);
  tokens.forEach((token, index) => {
    const isMark = !/[\p{L}\p{N}]/u.test(token);
    const isTrailingMark = isMark && Array.from(token).length <= MAX_TRAILING_MARK_SYMBOLS;
    const isEmojiTail = isMark && index === tokens.length - 1 && !isTrailingMark && /\p{Extended_Pictographic}/u.test(token);
    if (isEmojiTail) {
      return;
    }
    if (isTrailingMark && words.length > 0) {
      words[words.length - 1] += ` ${token}`;
    } else {
      words.push(token);
    }
  });
  return words;
}

function keepOpeningWordsTogether(words: string[]): string[] {
  const firstFullWord = words.findIndex((word) => word.length > MAX_OPENING_WORD_LENGTH);
  const opening = firstFullWord < 1 ? '' : words.slice(0, firstFullWord + 1).join(' ');
  if (opening === '' || opening.length > MAX_OPENING_GROUP_LENGTH) {
    return words;
  }
  return [opening, ...words.slice(firstFullWord + 1)];
}

function renderTitleWords(title: string): string {
  return keepOpeningWordsTogether(groupTitleWords(title))
    .map((word) => `<span class="clip-card-word">${escapeHtml(word)}</span>`)
    .join(' ');
}

export function renderClipCard(clip: Clip, position: number, layer: number): string {
  const title = escapeHtml(clip.title);
  const { thumbnail } = clip;
  return `<li class="clip-card" data-clips="card" style="--fan-position:${position};--fan-layer:${layer}">
          <div class="clip-card-face">
            <img class="clip-card-image" src="${escapeHtml(thumbnail.src)}"${renderSrcset(clip)} width="${thumbnail.width}" height="${thumbnail.height}" alt="" loading="lazy" decoding="async">
            <a class="round-button round-button--gold clip-card-play" href="${escapeHtml(clip.youtubeUrl)}"${renderPlayerAttributes(clip.youtubeVideoId, clip.title, 'vertical')}>${renderIcon('play')}<span class="visually-hidden">Play ${title}</span></a>
            <div class="clip-card-foot">
              <p class="clip-card-title">${renderTitleWords(clip.title)}</p>
            </div>
          </div>
        </li>`;
}
