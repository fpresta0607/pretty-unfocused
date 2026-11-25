import { RING_SIZE, RING_SRC, RING_SRCSET } from './ring-asset.ts';
import { TAGLINE_LINES } from './tagline-lines.ts';

function renderIntroLines(): string {
  return TAGLINE_LINES.map((line, index) => {
    const tintClass = index === TAGLINE_LINES.length - 1 ? ' intro-line--tint' : '';
    return `<span class="intro-mask"><span class="intro-line${tintClass}" data-intro="line" style="--line-index:${index}">${line}</span></span>`;
  }).join('\n        ');
}

export function renderIntro(): string {
  return `<div class="intro" aria-hidden="true" data-module-intro>
    <div class="intro-panel" data-intro="panel">
      <div class="intro-curtain"></div>
      <div class="intro-content">
        <img class="intro-ring" data-intro="ring" src="${RING_SRC}" srcset="${RING_SRCSET}" sizes="10rem" width="${RING_SIZE}" height="${RING_SIZE}" alt="" loading="lazy">
        <p class="intro-text">
        ${renderIntroLines()}
        </p>
      </div>
    </div>
  </div>`;
}
