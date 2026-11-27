// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderArchive } from '../render/render-archive.ts';
import type { Show } from '../show/show-types.ts';

const LONG_LINK = `https://example.com/${'long-path-'.repeat(20)}`;
const show: Show = {
  description: '',
  clips: [],
  episodes: [
    {
      id: 'episode-1',
      title: 'Episode 1',
      publishedAt: '2026-10-01T12:00:00.000Z',
      description: `Prose with an unbreakable ${'word'.repeat(40)} in the middle ${LONG_LINK} and more words after it`,
      youtubeUrl: 'https://www.youtube.com/watch?v=video1',
      youtubeVideoId: 'video1',
      thumbnail: { src: 'https://i.ytimg.com/vi/video/hqdefault.jpg', width: 480, height: 360 },
    },
  ],
};

function getElement(selector: string): Element {
  const element = document.querySelector(selector);
  if (element === null) {
    throw new Error(`The page has no ${selector}`);
  }
  return element;
}

beforeEach(() => {
  const stylesheet = document.createElement('style');
  stylesheet.textContent = readFileSync('src/styles/archive.css', 'utf8');
  document.head.append(stylesheet);
  document.body.innerHTML = renderArchive(show);
});

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('an opened every-episode row', () => {
  it('lets its panel shrink to the row so a long word cannot push it past the gutters', () => {
    expect(getComputedStyle(getElement('.archive-panel')).gridTemplateColumns).toBe('minmax(0, 1fr)');
  });

  it('breaks a long word inside the description column', () => {
    expect(getComputedStyle(getElement('.archive-description')).overflowWrap).toBe('anywhere');
  });
});
