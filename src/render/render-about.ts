import type { Show } from '../show/show-types.ts';
import { readAboutDescription } from './about-description.ts';
import { escapeHtml } from './escape-html.ts';
import { HOST_PHOTO_HEIGHT, HOST_PHOTO_WIDTH, HOST_PHOTOS } from './host-photo-asset.ts';
import { renderStainEdge } from './render-stain-edge.ts';

const HOSTS = [
  { name: 'Maya', modifier: 'maya' },
  { name: 'Gia', modifier: 'gia' },
] as const;
const TOPICS = ['ADHD', 'Creativity', 'Money habits', 'Self-growth', 'The messy middle'] as const;
const HYPHENATED_WORD = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu;
const HOST_PHOTO_SIZES = '(min-width: 1200px) 260px, (min-width: 900px) 23vw, (min-width: 600px) 232px, 145px';

function renderHeadingLine(line: string): string {
  return `<span class="about-mask"><span class="about-line" data-about="line">${line}</span></span>`;
}

function renderHeading(): string {
  return `<h2 class="about-heading" id="about-heading" data-about-group="heading" data-stain-landing>
        <span class="visually-hidden">Cozy chaos only.</span>
        <span class="about-heading-visual" aria-hidden="true">
          ${renderHeadingLine('Cozy')}
          ${renderHeadingLine('Chaos')}
          <span class="about-script-line"><span class="about-script" data-about="script">only.</span></span>
        </span>
      </h2>`;
}

function renderHosts(): string {
  const cards = HOSTS.map(
    ({ name, modifier }) =>
      `<li class="about-host about-host--${modifier}" data-about="host"><span class="about-host-name" aria-hidden="true">${name}</span><img class="about-host-photo" src="${HOST_PHOTOS[modifier].src}" srcset="${HOST_PHOTOS[modifier].srcset}" sizes="${HOST_PHOTO_SIZES}" width="${HOST_PHOTO_WIDTH}" height="${HOST_PHOTO_HEIGHT}" alt="${name}" loading="lazy" decoding="async"></li>`,
  ).join('\n        ');
  return `<ul class="about-hosts" role="list" data-about-group="hosts" data-stain-landing>
        ${cards}
      </ul>`;
}

function keepHyphenatedWordsWhole(escapedText: string): string {
  return escapedText.replace(HYPHENATED_WORD, '<span class="about-nowrap">$&</span>');
}

function renderCopy(description: string): string {
  const paragraph =
    description === ''
      ? ''
      : `<p class="about-description" data-about="description">${keepHyphenatedWordsWhole(escapeHtml(description))}</p>`;
  const topics = TOPICS.map(
    (topic) => `<li class="about-topic label" data-about="topic">${topic}</li>`,
  ).join('');
  return `<div class="about-copy" data-about-group="copy">
        ${paragraph}
        <ul class="about-topics" role="list">${topics}</ul>
      </div>`;
}

export function renderAbout(show: Show): string {
  return `<section class="section section--cream about" id="about" data-section data-surface="light" data-module-about data-module-stain aria-label="About the show">
    ${renderStainEdge()}
    <div class="about-inner">
      ${renderHeading()}
      ${renderHosts()}
      ${renderCopy(readAboutDescription(show.description))}
    </div>
  </section>`;
}
