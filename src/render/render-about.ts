import type { Show } from '../show/show-types.ts';
import { buildSettledEdgePath, buildSettledRimPath, STATIC_VIEWS } from '../modules/stain-edge.ts';
import { readAboutDescription } from './about-description.ts';
import { escapeHtml } from './escape-html.ts';
import { RING_SIZE, RING_SRC, RING_SRCSET } from './ring-asset.ts';

const HOSTS = [
  { name: 'Maya', modifier: 'maya' },
  { name: 'Gia', modifier: 'gia' },
] as const;
const TOPICS = ['ADHD', 'Creativity', 'Money habits', 'Self-growth', 'The messy middle'] as const;
const HYPHENATED_WORD = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu;
const RING_IMAGE_SIZES = '(min-width: 900px) 9vw, 14vw';

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
      `<li class="about-host about-host--${modifier}" data-about="host"><span class="about-host-name">${name}</span><span class="about-host-pill label">Photo to come</span><img class="about-host-ring" src="${RING_SRC}" srcset="${RING_SRCSET}" sizes="${RING_IMAGE_SIZES}" width="${RING_SIZE}" height="${RING_SIZE}" alt="" loading="lazy" decoding="async"></li>`,
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

function renderEdgeSet(name: 'wide' | 'narrow'): string {
  const { width, height } = STATIC_VIEWS[name];
  return `<svg class="about-edge about-edge--${name}" data-stain-set="${name}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="about-edge-rim" d="${buildSettledRimPath(name === 'narrow')}"/><path class="about-edge-fill" d="${buildSettledEdgePath(name === 'narrow')}"/></svg>`;
}

function renderEdge(): string {
  return `${renderEdgeSet('wide')}${renderEdgeSet('narrow')}`;
}

export function renderAbout(show: Show): string {
  return `<section class="section section--cream about" id="about" data-section data-surface="light" data-module-about data-module-stain aria-label="About the show">
    ${renderEdge()}
    <div class="about-inner">
      ${renderHeading()}
      ${renderHosts()}
      ${renderCopy(readAboutDescription(show.description))}
    </div>
  </section>`;
}
