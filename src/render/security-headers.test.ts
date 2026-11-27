import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { buildFixtureShow } from '../show/build-fixture-show.ts';
import { buildTestPage } from './build-test-page.ts';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const VERCEL_CONFIG_PATH = fileURLToPath(new URL('../../vercel.json', import.meta.url));
const INLINE_BLOCK = /<(script|style)(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/\1>/g;
const EXTERNAL_IMAGE_HOST = /(?:src|srcset)="(https:\/\/[^/"\s]+)/g;

function readHeaders(): Map<string, string> {
  const config: { headers: HeaderRule[] } = JSON.parse(readFileSync(VERCEL_CONFIG_PATH, 'utf8'));
  const rules = config.headers.filter((rule) => rule.source === '/(.*)');
  return new Map(rules.flatMap((rule) => rule.headers.map(({ key, value }) => [key, value] as const)));
}

function readDirectives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(';').map((directive) => {
      const [name = '', ...values] = directive.trim().split(/\s+/);
      return [name, values] as const;
    }),
  );
}

function hashOf(content: string): string {
  return `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`;
}

function readInlineHashes(page: string, tag: 'script' | 'style'): string[] {
  return Array.from(page.matchAll(INLINE_BLOCK))
    .filter((match) => match[1] === tag)
    .map((match) => hashOf(match[2] ?? ''));
}

function readHashes(sources: string[]): string[] {
  return sources.filter((source) => source.startsWith("'sha256-"));
}

describe('the security headers in vercel.json', () => {
  let page: string;
  let directives: Map<string, string[]>;

  beforeAll(async () => {
    page = (await buildTestPage(buildFixtureShow())).page;
    directives = readDirectives(readHeaders().get('Content-Security-Policy') ?? '');
  });

  it('allow exactly the inline script of the page shell, by its hash', () => {
    const scriptHashes = readInlineHashes(page, 'script');

    expect(scriptHashes).toHaveLength(1);
    expect(readHashes(directives.get('script-src') ?? []).sort()).toEqual(scriptHashes.sort());
  });

  it('allow exactly the inline style of the page shell, by its hash', () => {
    const styleHashes = readInlineHashes(page, 'style');

    expect(styleHashes).toHaveLength(1);
    expect(readHashes(directives.get('style-src') ?? []).sort()).toEqual(styleHashes.sort());
  });

  it.each(['default-src', 'script-src', 'style-src', 'style-src-elem'])('never allow unsafe-inline or unsafe-eval in %s', (name) => {
    expect(directives.get(name) ?? []).not.toContain("'unsafe-inline'");
    expect(directives.get(name) ?? []).not.toContain("'unsafe-eval'");
  });

  it('allow every outside host that the built page loads images from', () => {
    const imageHosts = new Set(Array.from(page.matchAll(EXTERNAL_IMAGE_HOST), (match) => match[1]));
    const allowedImageSources = directives.get('img-src') ?? [];

    expect(imageHosts.size).toBeGreaterThan(0);
    imageHosts.forEach((host) => {
      expect(allowedImageSources).toContain(host);
    });
  });

  it('allow the privacy-friendly YouTube embed frame and nothing else as a frame', () => {
    expect(directives.get('frame-src')).toEqual(['https://www.youtube-nocookie.com']);
  });

  it('close off plugins, base address changes, forms and embedding of the page', () => {
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'none'"]);
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('send the other protective headers for every path', () => {
    const headers = readHeaders();

    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('Permissions-Policy')).toContain('camera=()');
    expect(headers.get('Permissions-Policy')).toContain('geolocation=()');
  });
});
