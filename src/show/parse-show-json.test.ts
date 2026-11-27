import { describe, expect, it } from 'vitest';

import { buildFixtureShow } from './build-fixture-show.ts';
import { parseShowJson } from './parse-show-json.ts';

describe('parseShowJson', () => {
  it('reads back exactly the show that was written, optional fields and all', () => {
    const show = buildFixtureShow();

    expect(parseShowJson(JSON.stringify(show))).toEqual(show);
  });

  it('reads an empty show', () => {
    expect(parseShowJson('{"description":"","episodes":[],"clips":[]}')).toEqual({ description: '', episodes: [], clips: [] });
  });

  it.each([
    ['text that is not JSON', 'not json at all', 'not valid JSON'],
    ['a list instead of an object', '[]', 'show must be an object'],
    ['a missing description', '{"episodes":[],"clips":[]}', 'show.description must be a string'],
    ['episodes that are not a list', '{"description":"","episodes":{},"clips":[]}', 'show.episodes must be a list'],
    ['clips that are missing', '{"description":"","episodes":[]}', 'show.clips must be a list'],
    [
      'an episode without a title',
      '{"description":"","episodes":[{"id":"a","publishedAt":"x","description":"","thumbnail":{"src":"s","width":1,"height":1}}],"clips":[]}',
      'show.episodes[0].title must be a string',
    ],
    [
      'an episode thumbnail with a text width',
      '{"description":"","episodes":[{"id":"a","title":"t","publishedAt":"x","description":"","thumbnail":{"src":"s","width":"1","height":1}}],"clips":[]}',
      'show.episodes[0].thumbnail.width must be a number',
    ],
    [
      'an episode number that is text',
      '{"description":"","episodes":[{"id":"a","title":"t","publishedAt":"x","description":"","number":"7","thumbnail":{"src":"s","width":1,"height":1}}],"clips":[]}',
      'show.episodes[0].number must be a number',
    ],
    [
      'a clip without a video id',
      '{"description":"","episodes":[],"clips":[{"id":"a","title":"t","publishedAt":"x","youtubeUrl":"u","thumbnail":{"src":"s","width":1,"height":1}}]}',
      'show.clips[0].youtubeVideoId must be a string',
    ],
  ])('rejects %s', (_name, text, message) => {
    expect(() => parseShowJson(text)).toThrow(message);
  });
});
