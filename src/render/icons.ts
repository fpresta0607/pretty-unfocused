export type IconName =
  | 'spotify'
  | 'youtube'
  | 'tiktok'
  | 'menu'
  | 'close'
  | 'headphones'
  | 'play'
  | 'arrow';

const SPOTIFY_PATH =
  'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z';

const YOUTUBE_PATH =
  'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z';

const TIKTOK_PATH =
  'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

const ICON_SYMBOLS: Readonly<Record<IconName, string>> = {
  spotify: `<path d="${SPOTIFY_PATH}" fill="currentColor"/>`,
  youtube: `<path d="${YOUTUBE_PATH}" fill="currentColor"/>`,
  tiktok: `<path d="${TIKTOK_PATH}" fill="currentColor"/>`,
  menu: '<path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  close:
    '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  headphones:
    '<path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15v3a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2zm16 0v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  arrow:
    '<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};

export function renderIconSprite(): string {
  const symbols = Object.entries(ICON_SYMBOLS)
    .map(([name, markup]) => `<symbol id="icon-${name}" viewBox="0 0 24 24">${markup}</symbol>`)
    .join('');
  return `<svg width="0" height="0" class="icon-sprite" aria-hidden="true" focusable="false"><defs>${symbols}</defs></svg>`;
}

export function renderIcon(name: IconName, className = 'icon'): string {
  return `<svg class="${className}" aria-hidden="true" focusable="false"><use href="#icon-${name}"/></svg>`;
}
