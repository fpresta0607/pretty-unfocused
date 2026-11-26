import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import { TIKTOK_URL } from '../show/show-links.ts';
import type { Clip, Show } from '../show/show-types.ts';
import { renderClips } from './render-clips.ts';
import { SECTION_RENDERERS } from './render-page.ts';

function makeClip(index: number, overrides: Partial<Clip> = {}): Clip {
  return {
    id: `clip-${index}`,
    title: `Clip ${index}`,
    publishedAt: `2026-11-${String(28 - index).padStart(2, '0')}T12:00:00.000Z`,
    youtubeUrl: `https://www.youtube.com/shorts/short${index}`,
    youtubeVideoId: `short${index}`,
    thumbnail: { src: `https://i.ytimg.com/vi/short${index}/hqdefault.jpg`, width: 480, height: 360 },
    ...overrides,
  };
}

function makeShow(clips: Clip[]): Show {
  return { ...buildFixtureShow(), clips };
}

function readCards(markup: string): string[] {
  return markup.match(/<li class="clip-card"[\s\S]*?<\/li>/g) ?? [];
}

function readTitleText(card: string): string {
  const titleMarkup = card.match(/<p class="clip-card-title">(.*?)<\/p>/)?.[1] ?? '';
  return titleMarkup.replace(/<[^>]*>/g, '');
}

function readHeadingAccessibleText(markup: string): string {
  const headingMarkup = markup.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
  const [textBeforeHiddenVisual = ''] = headingMarkup.split('aria-hidden="true"');
  return textBeforeHiddenVisual
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('the clips section in the page', () => {
  it('comes after Episodes, named Clips', () => {
    expect(SECTION_RENDERERS.map(({ id }) => id).slice(2, 4)).toEqual(['episodes', 'clips']);
    expect(SECTION_RENDERERS[3]).toMatchObject({ id: 'clips', label: 'Clips' });
  });
});

describe('renderClips with the fixture show', () => {
  const show = buildFixtureShow();
  const markup = renderClips(show);
  const cards = readCards(markup);

  it('is a gold section the frame reads as light, handed over by the coffee stain', () => {
    expect(markup).toMatch(/<section class="section section--gold clips" id="clips" data-section data-surface="light"/);
    expect(markup).toContain('data-module-clips');
    expect(markup).toContain('data-module-stain');
    expect(markup.match(/data-stain-set="wide"/g)).toHaveLength(1);
    expect(markup.match(/class="stain-edge-rim"/g)).toHaveLength(2);
  });

  it('has one h2 named We love to overshare, with the visible words hidden from assistive tech', () => {
    expect(markup.match(/<h2[\s>]/g)).toHaveLength(1);
    expect(readHeadingAccessibleText(markup)).toBe('We love to overshare');
    expect(markup).toContain('<span class="section-heading-line" data-heading="line">We</span>');
    expect(markup).toContain('<span class="section-heading-line" data-heading="line">love to</span>');
    expect(markup).toContain('<span class="section-heading-script" data-heading="script">overshare</span>');
    expect(markup).toContain('aria-labelledby="clips-heading"');
  });

  it('lists every fixture clip as a card in a named list', () => {
    expect(markup).toContain('<ul class="clips-fan-list" role="list" aria-label="Latest clips">');
    expect(cards).toHaveLength(show.clips.length);
  });

  it('adds one progress dash per card for the phone row, the first one active and all hidden from assistive tech', () => {
    const dashes = markup.match(/<div class="clips-dashes" aria-hidden="true">([\s\S]*?)<\/div>/)?.[1] ?? '';

    expect(dashes.match(/data-clips="dash"/g)).toHaveLength(show.clips.length);
    expect(dashes.match(/data-active/g)).toHaveLength(1);
    expect(dashes.startsWith('<span class="clips-dash" data-clips="dash" data-active>')).toBe(true);
  });

  it('gives each card a Play link to its clip carrying the tall player attributes', () => {
    show.clips.forEach((clip, index) => {
      const card = cards[index] ?? '';
      expect(card).toContain(`href="${clip.youtubeUrl}"`);
      expect(card).toContain(`data-player="${clip.youtubeVideoId}"`);
      expect(card).toContain('data-player-shape="vertical"');
      expect(card).toContain(`<span class="visually-hidden">Play ${clip.title}</span>`);
      expect(readTitleText(card)).toBe(clip.title);
    });
  });

  it('shows each thumbnail lazily with its size and the ytimg srcset, hidden from assistive tech', () => {
    const card = cards[0] ?? '';

    expect(card).toContain('alt=""');
    expect(card).toContain('loading="lazy"');
    expect(card).toContain('width="480" height="360"');
    expect(card).toMatch(/srcset="https:\/\/i\.ytimg\.com\/vi\/[^/]+\/hqdefault\.jpg 480w, https:\/\/i\.ytimg\.com\/vi\/[^/]+\/sddefault\.jpg 640w"/);
  });

  it('sets up the TikTok card with its label, handle, line and a pill to the show on TikTok', () => {
    expect(markup).toContain('More clips');
    expect(markup).toContain('@prettyunfocusedpod');
    expect(markup).toContain('The rest of the chaos lives on TikTok.');
    expect(markup).toMatch(new RegExp(`<a class="pill pill--solid clips-tiktok-pill" href="${TIKTOK_URL}">`));
  });
});

describe('renderClips fan and limits', () => {
  it('deals the latest six clips, newest first, whatever else the feed holds', () => {
    const clips = Array.from({ length: 9 }, (_, index) => makeClip(index));
    const cards = readCards(renderClips(makeShow(clips)));

    expect(cards).toHaveLength(6);
    expect(cards.map(readTitleText)).toEqual([
      'Clip 0',
      'Clip 1',
      'Clip 2',
      'Clip 3',
      'Clip 4',
      'Clip 5',
    ]);
  });

  it('shows fewer cards when there are fewer clips', () => {
    expect(readCards(renderClips(makeShow([makeClip(0), makeClip(1), makeClip(2)])))).toHaveLength(3);
  });

  it.each([
    [1, ['0']],
    [2, ['-0.5', '0.5']],
    [3, ['-1', '0', '1']],
    [6, ['-2.5', '-1.5', '-0.5', '0.5', '1.5', '2.5']],
  ])('centres a fan of %j cards on zero, so each card leans away from the middle', (count, positions) => {
    const cards = readCards(renderClips(makeShow(Array.from({ length: count }, (_, index) => makeClip(index)))));

    expect(cards.map((card) => card.match(/--fan-position:(-?[\d.]+)/)?.[1])).toEqual(positions);
  });

  it('stacks each card above the one before it, so every card shows its own left edge', () => {
    const cards = readCards(renderClips(makeShow(Array.from({ length: 6 }, (_, index) => makeClip(index)))));
    const layers = cards.map((card) => Number(card.match(/--fan-layer:(\d+)/)?.[1]));

    expect(layers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('renders no section at all when there are no clips', () => {
    expect(renderClips(makeShow([]))).toBe('');
  });

  it('sets each word of a title in its own unbreakable span so a clipped title ends between words', () => {
    const card = readCards(renderClips(makeShow([makeClip(0, { title: 'Your  reminder now' })])))[0] ?? '';

    expect(card).toContain(
      '<p class="clip-card-title"><span class="clip-card-word">Your</span> <span class="clip-card-word">reminder</span> <span class="clip-card-word">now</span></p>',
    );
  });

  it.each([
    ['A new episode drop', ['A new episode', 'drop']],
    ['Join the memberships', ['Join', 'the', 'memberships']],
    ['Hi extraordinarily', ['Hi', 'extraordinarily']],
  ])('keeps the short opening words of "%s" with the first full word only while they fit a narrow card, so the first line is not a stub', (title, groups) => {
    const card = readCards(renderClips(makeShow([makeClip(0, { title })])))[0] ?? '';
    const words = [...(card.match(/<p class="clip-card-title">(.*?)<\/p>/)?.[1] ?? '').matchAll(/<span class="clip-card-word">(.*?)<\/span>/g)].map(([, word]) => word);

    expect(words).toEqual(groups);
  });

  it('keeps trailing punctuation and emoji with the word before them', () => {
    const card = readCards(renderClips(makeShow([makeClip(0, { title: 'Your reminder !!! 😎 now' })])))[0] ?? '';

    expect(card).toContain(
      '<p class="clip-card-title"><span class="clip-card-word">Your</span> <span class="clip-card-word">reminder !!! 😎</span> <span class="clip-card-word">now</span></p>',
    );
  });

  it('keeps a longer run of emoji as a word of its own', () => {
    const card = readCards(renderClips(makeShow([makeClip(0, { title: 'edition 🦃🍂🥧🪵' })])))[0] ?? '';

    expect(card).toContain('<span class="clip-card-word">edition</span> <span class="clip-card-word">🦃🍂🥧🪵</span>');
  });

  it('escapes a clip title everywhere it is written', () => {
    const card = readCards(renderClips(makeShow([makeClip(0, { title: 'Tom & <b>"Jerry"</b>' })])))[0] ?? '';

    expect(card).not.toContain('<b>');
    expect(card.match(/Tom &amp; &lt;b&gt;&quot;Jerry&quot;&lt;\/b&gt;/g)).toHaveLength(2);
    expect(card).toContain('<span class="clip-card-word">Tom &amp;</span> <span class="clip-card-word">&lt;b&gt;&quot;Jerry&quot;&lt;/b&gt;</span>');
    expect(card).toContain('data-player-title="Tom &amp; &lt;b&gt;&quot;Jerry&quot;&lt;/b&gt;"');
  });

  it('uses a true portrait thumbnail as it is, without a landscape srcset', () => {
    const portrait = makeClip(0, { thumbnail: { src: 'https://i.ytimg.com/vi/short0/oardefault.jpg', width: 1080, height: 1920 } });
    const card = readCards(renderClips(makeShow([portrait])))[0] ?? '';

    expect(card).toContain('src="https://i.ytimg.com/vi/short0/oardefault.jpg"');
    expect(card).toContain('width="1080" height="1920"');
    expect(card).not.toContain('srcset=');
  });
});
