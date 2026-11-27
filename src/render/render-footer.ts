import { SHOW_EMAIL } from '../show/show-links.ts';
import { escapeHtml } from './escape-html.ts';
import { renderIcon } from './icons.ts';
import { PLATFORM_LINKS } from './platform-links.ts';
import { renderStainEdge } from './render-stain-edge.ts';
import { RING_SIZE, RING_SRC, RING_SRCSET } from './ring-asset.ts';

function renderHeadingLine(text: string, tintClass = ''): string {
  return `<span class="footer-mask"><span class="footer-line${tintClass}" data-footer="line">${text}</span></span>`;
}

function renderHeading(): string {
  return `<h2 class="footer-heading" id="footer-heading" data-footer-group="heading">
          <span class="visually-hidden">Come yap with us</span>
          <span class="footer-heading-visual" aria-hidden="true">
            ${renderHeadingLine('Come')}
            ${renderHeadingLine('Yap', ' footer-line--tint')}
            <span class="footer-script-line"><span class="footer-script" data-footer="script">with us</span></span>
          </span>
        </h2>`;
}

function renderPlatformList(): string {
  const links = PLATFORM_LINKS.map(
    (link) =>
      `<li data-footer="link"><a class="footer-link" href="${escapeHtml(link.url)}">${renderIcon(link.icon, 'brand-icon')}${escapeHtml(link.label)}</a></li>`,
  ).join('');
  return `<ul class="footer-links" role="list">${links}</ul>`;
}

function renderWord(): string {
  return `<div class="footer-word" aria-hidden="true">
    <span class="footer-word-text"><span>UNF</span><img class="footer-ring" src="${RING_SRC}" srcset="${RING_SRCSET}" sizes="14vw" width="${RING_SIZE}" height="${RING_SIZE}" alt="" loading="lazy" decoding="async"><span>CUSED</span></span>
  </div>`;
}

export function renderFooter(): string {
  const email = escapeHtml(SHOW_EMAIL);
  return `<footer class="section section--wine footer" id="say-hi" data-section data-surface="dark" data-module-footer data-module-stain data-inert-on-menu aria-labelledby="footer-heading">
    ${renderStainEdge()}
    <div class="footer-pin">
      <div class="footer-inner">
        <div class="footer-copy">
          ${renderHeading()}
          <a class="footer-email" data-footer="email" href="mailto:${email}">${email}</a>
        </div>
        ${renderPlatformList()}
        <p class="label footer-note"><span>New episode every Monday, 6&nbsp;am&nbsp;CT</span><span>&copy; ${new Date().getFullYear()} Pretty Unfocused</span></p>
      </div>
      ${renderWord()}
    </div>
  </footer>`;
}
