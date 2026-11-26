import { escapeHtml } from './escape-html.ts';

export type PlayerShape = 'wide' | 'vertical';

export function renderPlayerAttributes(videoId: string | undefined, title: string, shape: PlayerShape = 'wide'): string {
  if (videoId === undefined) {
    return '';
  }
  const shapeAttribute = shape === 'vertical' ? ' data-player-shape="vertical"' : '';
  return ` data-player="${escapeHtml(videoId)}" data-player-title="${escapeHtml(title)}"${shapeAttribute}`;
}
