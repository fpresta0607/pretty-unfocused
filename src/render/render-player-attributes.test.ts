import { describe, expect, it } from 'vitest';

import { renderPlayerAttributes } from './render-player-attributes.ts';

describe('renderPlayerAttributes', () => {
  it('names the video and its title for the player', () => {
    expect(renderPlayerAttributes('abc123', 'A good one')).toBe(' data-player="abc123" data-player-title="A good one"');
  });

  it('escapes the video id and the title', () => {
    expect(renderPlayerAttributes('a"b', '<b>Tom & "Jerry"</b>')).toBe(
      ' data-player="a&quot;b" data-player-title="&lt;b&gt;Tom &amp; &quot;Jerry&quot;&lt;/b&gt;"',
    );
  });

  it('says nothing about the shape for a wide video', () => {
    expect(renderPlayerAttributes('abc123', 'Title', 'wide')).not.toContain('data-player-shape');
  });

  it('asks for the tall stage for a vertical clip', () => {
    expect(renderPlayerAttributes('abc123', 'Title', 'vertical')).toBe(
      ' data-player="abc123" data-player-title="Title" data-player-shape="vertical"',
    );
  });

  it('renders nothing without a video id', () => {
    expect(renderPlayerAttributes(undefined, 'Title', 'vertical')).toBe('');
  });
});
