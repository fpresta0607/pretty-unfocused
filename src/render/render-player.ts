import { renderIcon } from './icons.ts';

export function renderPlayer(): string {
  return `<dialog class="player" aria-label="Episode video" data-module-player>
    <div class="player-box">
      <div class="player-stage" data-player-stage></div>
      <button class="round-button player-close" type="button" aria-label="Close the video" data-player-close>${renderIcon('close')}</button>
    </div>
  </dialog>`;
}
