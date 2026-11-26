import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import type { Show } from '../show/show-types.ts';
import { renderAbout } from './render-about.ts';
import { SECTION_RENDERERS } from './render-page.ts';

function readHeadingAccessibleText(markup: string): string {
  const headingMarkup = markup.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
  const [textBeforeHiddenVisual = ''] = headingMarkup.split('aria-hidden="true"');
  return textBeforeHiddenVisual
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function withDescription(description: string): Show {
  return { ...buildFixtureShow(), description };
}

describe('the about section in the page', () => {
  it('comes second, named About the show', () => {
    expect(SECTION_RENDERERS[1]).toMatchObject({ id: 'about', label: 'About the show' });
  });
});

describe('renderAbout with the fixture show', () => {
  const show = buildFixtureShow();
  const markup = renderAbout(show);

  it('is a cream section the frame reads as light, with the id the menu links to', () => {
    expect(markup).toContain('id="about"');
    expect(markup).toContain('section--cream');
    expect(markup).toMatch(/<section[^>]*id="about"[^>]*data-surface="light"/);
  });

  it('gives the h2 the accessible name Cozy chaos only.', () => {
    expect(markup.match(/<h2[\s>]/g)).toHaveLength(1);
    expect(markup).not.toMatch(/<h[13-6][\s>]/);
    expect(readHeadingAccessibleText(markup)).toBe('Cozy chaos only.');
  });

  it('sets Cozy and Chaos in masks, the script word in a wipe line, and hides them from assistive tech', () => {
    expect(markup).toMatch(
      /aria-hidden="true">\s*<span class="about-mask"><span class="about-line" data-about="line">Cozy</,
    );
    expect(markup).toContain('<span class="about-script-line"><span class="about-script" data-about="script">only.</span></span>');
  });

  it.each([
    ['Maya', 0, 'maya'],
    ['Gia', 1, 'gia'],
  ])('shows %s as a photo card with the name above the photo', (name, index, modifier) => {
    const host = markup.match(/<li class="about-host[^>]*>.*?<\/li>/g)?.[index] ?? '';

    expect(host).toContain(`about-host--${modifier}`);
    expect(host).toContain(`<span class="about-host-name" aria-hidden="true">${name}</span>`);
    expect(host.indexOf('about-host-name')).toBeLessThan(host.indexOf('about-host-photo'));
    expect(host).toContain(`src="/src/assets/host-${modifier}.webp"`);
    expect(host).toContain(
      `srcset="/src/assets/host-${modifier}-small.webp 360w, /src/assets/host-${modifier}.webp 720w"`,
    );
    expect(host).toContain('sizes="(min-width: 1200px) 260px, (min-width: 900px) 23vw, (min-width: 600px) 232px, 145px"');
    expect(host).toContain('width="720" height="864"');
    expect(host).toContain(`alt="${name}"`);
    expect(host).toContain('loading="lazy"');
    expect(host).toContain('decoding="async"');
  });

  it('renders exactly two host cards and names each host once to assistive tech', () => {
    const hosts = markup.match(/<li class="about-host[^>]*>.*?<\/li>/g) ?? [];

    expect(hosts).toHaveLength(2);
    hosts.forEach((host) => {
      expect(host.match(/aria-hidden="true"/g)).toHaveLength(1);
      expect(host.match(/alt="[^"]+"/g)).toHaveLength(1);
    });
  });

  it('leaves out the photo-to-come pill and the splash ring from the host cards', () => {
    const hosts = markup.match(/<li class="about-host[^>]*>.*?<\/li>/g) ?? [];

    hosts.forEach((host) => {
      expect(host).not.toContain('Photo to come');
      expect(host).not.toContain('about-host-pill');
      expect(host).not.toContain('about-host-ring');
      expect(host).not.toContain('splash-ring');
    });
  });

  it('does not invent a surname, a bio or a note to the client', () => {
    const text = markup.replace(/<ul class="about-hosts".*?<\/ul>/s, '').replace(/<[^>]*>/g, ' ');
    const cardNames = (markup.match(/<span class="about-host-name"[^>]*>(.*?)<\/span>/g) ?? []).map((name) =>
      name.replace(/<[^>]*>/g, ''),
    );

    expect(cardNames).toEqual(['Maya', 'Gia']);
    expect(text).not.toMatch(/Host photos and bios|yours to supply/i);
    expect(text).not.toMatch(/(Maya|Gia)\s+(?!and )[A-Z][a-z]+/);
  });

  it('renders the feed description without its closing sentence', () => {
    expect(show.description.endsWith('Cozy chaos only.')).toBe(true);
    const paragraph = markup.match(/<p class="about-description"[^>]*>(.*?)<\/p>/)?.[1] ?? '';

    expect(paragraph).toContain('Hosted by Maya and Gia');
    expect(paragraph).toContain('messy middle');
    expect(paragraph).not.toContain('Cozy chaos only');
    expect(paragraph.endsWith('with.')).toBe(true);
  });

  it.each([
    ['a single hyphenated word', 'Talking self-growth daily', 'Talking <span class="about-nowrap">self-growth</span> daily'],
    ['a chain of hyphenated words', 'a one-on-one chat', 'a <span class="about-nowrap">one-on-one</span> chat'],
    ['a hyphenated word before punctuation', 'money, self-growth, and more', 'money, <span class="about-nowrap">self-growth</span>, and more'],
    ['a lone hyphen or dash between spaces', 'this - that', 'this - that'],
    ['a plain description', 'No hyphens here', 'No hyphens here'],
  ])('keeps hyphenated words from breaking at the hyphen for %s', (_name, description, expected) => {
    const paragraph = renderAbout(withDescription(description)).match(/<p class="about-description"[^>]*>(.*?)<\/p>/)?.[1] ?? '';

    expect(paragraph).toBe(expected);
  });

  it('keeps the description text exactly as the feed gives it once the nowrap spans are removed', () => {
    const paragraph = markup.match(/<p class="about-description"[^>]*>(.*?)<\/p>/)?.[1] ?? '';

    expect(paragraph).toContain('<span class="about-nowrap">self-growth</span>');
    expect(paragraph.replace(/<\/?span[^>]*>/g, '')).toContain('self-growth,');
  });

  it('marks the headline and the host cards as the places the sweep lands', () => {
    expect(markup).toMatch(/<h2 class="about-heading"[^>]*data-stain-landing/);
    expect(markup).toMatch(/<ul class="about-hosts"[^>]*data-stain-landing/);
  });

  it('escapes the description', () => {
    const escaped = renderAbout(withDescription('Tea & <b>talk</b> "more"'));

    expect(escaped).toContain('Tea &amp; &lt;b&gt;talk&lt;/b&gt; &quot;more&quot;');
    expect(escaped).not.toContain('<b>');
  });

  it('leaves out the paragraph when the description is empty', () => {
    expect(renderAbout(withDescription(''))).not.toContain('about-description');
  });

  it('lists the five topics as plain, non-link items', () => {
    const topics = markup.match(/<li class="about-topic label"[^>]*>(.*?)<\/li>/g) ?? [];

    expect(topics.map((topic) => topic.replace(/<[^>]*>/g, ''))).toEqual([
      'ADHD',
      'Creativity',
      'Money habits',
      'Self-growth',
      'The messy middle',
    ]);
    expect(markup).not.toMatch(/class="about-topic[^"]*"[^>]*(href|tabindex)/);
  });

  it('names the landmark About the show and leaves the h2 as the section headline', () => {
    expect(markup).toMatch(/<section[^>]*aria-label="About the show"/);
    expect(markup).not.toContain('aria-labelledby');
    expect(markup).toContain('<h2 class="about-heading" id="about-heading"');
  });

  it('ships the still stain edge in the markup, hidden from assistive tech, so it is drawn without scripts', () => {
    const edges = markup.match(/<svg class="stain-edge stain-edge--(wide|narrow)"[^>]*>/g) ?? [];

    expect(edges).toHaveLength(2);
    edges.forEach((edge) => {
      expect(edge).toContain('preserveAspectRatio="none"');
      expect(edge).toContain('aria-hidden="true"');
      expect(edge).toMatch(/viewBox="0 0 \d+ \d+"/);
    });
    expect(markup.match(/<path class="stain-edge-fill" d="M-[^"]+Z[^"]*"\/>/g)).toHaveLength(2);
    expect(markup.match(/<path class="stain-edge-rim" d="M-[^"]+Z[^"]*"\/><path class="stain-edge-fill"/g)).toHaveLength(2);
    expect(markup).toContain('data-module-stain');
  });

  it('ships a wide and a narrow edge, one for each width of screen', () => {
    expect(markup).toContain('data-stain-set="wide"');
    expect(markup).toContain('data-stain-set="narrow"');
  });

  it('names three reveal groups', () => {
    expect(markup.match(/data-about-group="(heading|hosts|copy)"/g)).toHaveLength(3);
  });

  it('ties the em dash to the word before it so a line never starts with it', () => {
    const paragraph = markup.match(/<p class="about-description"[^>]*>(.*?)<\/p>/)?.[1] ?? '';

    expect(paragraph).toContain('messy middle\u2060\u2014plus');
  });
});
