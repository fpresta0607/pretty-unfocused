import { escapeHtml } from './escape-html.ts';

export function renderPlayerAttributes(videoId: string | undefined, title: string): string {
  if (videoId === undefined) {
    return '';
  }
  return ` data-player="${escapeHtml(videoId)}" data-player-title="${escapeHtml(title)}"`;
}
