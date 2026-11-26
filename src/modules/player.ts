import { module as Module } from 'modujs';

const EMBED_BASE_URL = 'https://www.youtube-nocookie.com/embed/';
const POSTER_BASE_URL = 'https://i.ytimg.com/vi/';
const EMBED_PERMISSIONS = 'autoplay; encrypted-media; picture-in-picture; fullscreen';

export function buildEmbedUrl(videoId: string): string {
  return `${EMBED_BASE_URL}${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
}

const POSTER_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'] as const;

export function buildPosterUrl(videoId: string, qualityIndex = 0): string {
  return `${POSTER_BASE_URL}${encodeURIComponent(videoId)}/${POSTER_QUALITIES[qualityIndex] ?? 'hqdefault'}.jpg`;
}

export class Player extends Module {
  private dialog: HTMLDialogElement | undefined;
  private stage: HTMLElement | undefined;
  private opener: HTMLElement | undefined;

  init(): void {
    const stage = this.el.querySelector<HTMLElement>('[data-player-stage]');
    if (!(this.el instanceof HTMLDialogElement) || stage === null) {
      throw new Error('The player needs a dialog with a stage');
    }
    this.dialog = this.el;
    this.stage = stage;
    document.addEventListener('click', this.handleDocumentClick);
    this.el.addEventListener('click', this.handleDialogClick);
    this.el.addEventListener('keydown', this.handleKeydown);
    this.el.addEventListener('close', this.handleClose);
  }

  destroy(): void {
    document.removeEventListener('click', this.handleDocumentClick);
    this.el.removeEventListener('click', this.handleDialogClick);
    this.el.removeEventListener('keydown', this.handleKeydown);
    this.el.removeEventListener('close', this.handleClose);
  }

  private open(videoId: string, title: string, shape: string | undefined, opener: HTMLElement): void {
    if (this.dialog === undefined || this.stage === undefined || this.dialog.open) {
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = buildEmbedUrl(videoId);
    frame.title = title;
    frame.allow = EMBED_PERMISSIONS;
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', () => frame.setAttribute('data-loaded', ''), { once: true });
    const poster = document.createElement('img');
    poster.className = 'player-poster';
    let qualityIndex = 0;
    poster.addEventListener('error', () => {
      if (qualityIndex < POSTER_QUALITIES.length - 1) {
        qualityIndex += 1;
        poster.src = buildPosterUrl(videoId, qualityIndex);
      }
    });
    poster.src = buildPosterUrl(videoId);
    poster.alt = '';
    this.stage.replaceChildren(poster, frame);

    this.opener = opener;
    if (shape === 'vertical') {
      this.dialog.dataset.shape = shape;
    }
    opener.focus({ preventScroll: true });
    document.documentElement.dataset.playerOpen = '';
    this.call('lock', 'scroll');
    this.dialog.showModal();
    this.dialog.querySelector<HTMLElement>('[data-player-close]')?.focus();
  }

  private readonly handleDocumentClick = (event: MouseEvent): void => {
    const isPlainClick =
      event.button === 0 && !event.defaultPrevented && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
    const link = event.target instanceof Element ? event.target.closest<HTMLElement>('a[data-player]') : null;
    const videoId = link?.dataset.player;
    if (!isPlainClick || link === null || videoId === undefined || videoId === '') {
      return;
    }
    event.preventDefault();
    this.open(videoId, link.dataset.playerTitle ?? '', link.dataset.playerShape, link);
  };

  private readonly handleDialogClick = (event: MouseEvent): void => {
    const isCloseButton =
      event.target instanceof Element && event.target.closest('[data-player-close]') !== null;
    if (isCloseButton || event.target === this.dialog) {
      this.dialog?.close();
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dialog?.close();
    }
  };

  private readonly handleClose = (): void => {
    this.stage?.replaceChildren();
    delete this.dialog?.dataset.shape;
    delete document.documentElement.dataset.playerOpen;
    this.call('unlock', 'scroll');
    this.opener?.focus({ preventScroll: true });
    this.opener = undefined;
  };
}
