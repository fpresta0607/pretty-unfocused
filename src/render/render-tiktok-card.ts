import { TIKTOK_URL } from '../show/show-links.ts';
import { escapeHtml } from './escape-html.ts';
import { renderIcon } from './icons.ts';

const TIKTOK_HANDLE = '@prettyunfocusedpod';

export function renderTiktokCard(): string {
  return `<div class="clips-tiktok">
        <p class="label clips-tiktok-label">More clips</p>
        <p class="clips-tiktok-handle">${renderIcon('tiktok', 'brand-icon')}${TIKTOK_HANDLE}</p>
        <p class="clips-tiktok-line">The rest of the chaos lives on TikTok.</p>
        <a class="pill pill--solid clips-tiktok-pill" href="${escapeHtml(TIKTOK_URL)}">${renderIcon('tiktok', 'brand-icon')}TikTok</a>
      </div>`;
}
