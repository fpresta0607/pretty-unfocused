import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SHOW_EMAIL } from '../show/show-links.ts';
import { PLATFORM_LINKS } from './platform-links.ts';
import { renderFooter } from './render-footer.ts';
import { SECTION_RENDERERS } from './render-page.ts';

function readHeadingAccessibleText(markup: string): string {
  const headingMarkup = markup.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
  const [textBeforeHiddenVisual = ''] = headingMarkup.split('aria-hidden="true"');
  return textBeforeHiddenVisual
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('the footer in the page', () => {
  it('comes last, named Say hi', () => {
    expect(SECTION_RENDERERS.at(-1)).toMatchObject({ id: 'say-hi', label: 'Say hi' });
  });
});

describe('renderFooter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-03-04T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a footer landmark on wine that the frame reads as dark, with the id the menu links to', () => {
    const markup = renderFooter();

    expect(markup).toMatch(/^<footer[^>]*id="say-hi"/);
    expect(markup).toMatch(/<footer[^>]*data-surface="dark"/);
    expect(markup).toContain('section--wine');
    expect(markup).toMatch(/<footer[^>]*aria-labelledby="footer-heading"/);
  });

  it('gives the h2 the accessible name Come yap with us and hides the drawn lines from assistive tech', () => {
    const markup = renderFooter();

    expect(markup.match(/<h2[\s>]/g)).toHaveLength(1);
    expect(readHeadingAccessibleText(markup)).toBe('Come yap with us');
    expect(markup).toContain('<span class="footer-line" data-footer="line">Come</span>');
    expect(markup).toContain('<span class="footer-line footer-line--tint" data-footer="line">Yap</span>');
    expect(markup).toContain('<span class="footer-script" data-footer="script">with us</span>');
  });

  it("links the show's public email as a mailto link", () => {
    const markup = renderFooter();

    expect(markup).toContain(`<a class="footer-email" href="mailto:${SHOW_EMAIL}">${SHOW_EMAIL}</a>`);
    expect(SHOW_EMAIL).toBe('prettyunfocused@gmail.com');
  });

  it.each(PLATFORM_LINKS)('links $label to the show page with its icon', ({ icon, label, url }) => {
    const markup = renderFooter();

    expect(markup).toMatch(
      new RegExp(`<a class="footer-link" href="${url}"><svg class="brand-icon"[^>]*><use href="#icon-${icon}"/></svg>${label}</a>`),
    );
  });

  it('shows the release time and the build year', () => {
    const markup = renderFooter();

    expect(markup).toContain('New episode every Monday, 6&nbsp;am CT');
    expect(markup).toContain('&copy; 2031 Pretty Unfocused');
  });

  it('draws UNF, the coffee ring as the O, and CUSED, hidden from assistive tech', () => {
    const markup = renderFooter();

    expect(markup).toMatch(
      /<div class="footer-word" aria-hidden="true">\s*<span class="footer-word-text"><span>UNF<\/span><img class="footer-ring"[^>]*alt=""[^>]*><span>CUSED<\/span>/,
    );
  });

  it('carries the coffee-stain hand-off, with the headline as its landing', () => {
    const markup = renderFooter();

    expect(markup).toContain('data-module-stain');
    expect(markup).toContain('data-stain-set="wide"');
    expect(markup).toContain('data-stain-set="narrow"');
    expect(markup).toMatch(/<div class="footer-copy" data-stain-landing>/);
  });
});
