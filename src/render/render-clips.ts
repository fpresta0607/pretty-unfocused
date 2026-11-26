import type { Show } from '../show/show-types.ts';
import { renderClipCard } from './render-clip-card.ts';
import { renderSectionHeading } from './render-section-heading.ts';
import { renderStainEdge } from './render-stain-edge.ts';
import { renderTiktokCard } from './render-tiktok-card.ts';

const FAN_CARD_COUNT = 6;

function renderFan(clips: Show['clips']): string {
  const cards = clips.map((clip, index) => {
    const position = index - (clips.length - 1) / 2;
    const layer = Math.round(clips.length - Math.abs(position) * 2);
    return renderClipCard(clip, position, layer);
  });
  return `<div class="clips-fan" data-clips="fan" data-stain-landing>
      <ul class="clips-fan-list" role="list" aria-label="Latest clips">
        ${cards.join('\n        ')}
      </ul>
    </div>`;
}

export function renderClips(show: Show): string {
  const clips = show.clips.slice(0, FAN_CARD_COUNT);
  if (clips.length === 0) {
    return '';
  }
  return `<section class="section section--gold clips" id="clips" data-section data-surface="light" data-module-clips data-module-stain aria-labelledby="clips-heading">
    ${renderStainEdge()}
    <div class="clips-inner">
      ${renderSectionHeading({ id: 'clips-heading', accessibleName: 'We love to overshare', lines: ['We love', 'to'], script: 'overshare' })}
      ${renderFan(clips)}
      ${renderTiktokCard()}
    </div>
  </section>`;
}
