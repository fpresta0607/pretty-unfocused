import { SPOTIFY_SHOW_URL, TIKTOK_URL, YOUTUBE_CHANNEL_URL } from '../show/show-links.ts';
import { escapeHtml } from './escape-html.ts';
import { renderIcon, type IconName } from './icons.ts';

interface PlatformLink {
  icon: IconName;
  label: string;
  url: string;
}

export const PLATFORM_LINKS: readonly PlatformLink[] = [
  { icon: 'spotify', label: 'Spotify', url: SPOTIFY_SHOW_URL },
  { icon: 'youtube', label: 'YouTube', url: YOUTUBE_CHANNEL_URL },
  { icon: 'tiktok', label: 'TikTok', url: TIKTOK_URL },
];

export function renderPlatformPills(): string {
  return PLATFORM_LINKS.map((link, index) => {
    const solidClass = index === 0 ? ' pill--solid' : '';
    return `<li><a class="pill${solidClass}" href="${escapeHtml(link.url)}">${renderIcon(link.icon, 'brand-icon')}${escapeHtml(link.label)}</a></li>`;
  }).join('');
}
