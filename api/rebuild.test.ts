import { describe, expect, it, vi } from 'vitest';

import { createRebuildHandler } from './rebuild.ts';

const SECRET = 'test-secret';
const HOOK_URL = 'https://hooks.example.test/deploy/abc123';

function makeRequest(headers: Record<string, string> = {}, method = 'GET'): Request {
  return new Request('https://site.example.test/api/rebuild', { method, headers });
}

function makeHookResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function makeHandler(
  environment: { CRON_SECRET: string | undefined; DEPLOY_HOOK_URL: string | undefined },
  fetchFunction: typeof fetch,
): (request: Request) => Promise<Response> {
  return createRebuildHandler(environment, fetchFunction);
}

describe('the rebuild function', () => {
  const environment = { CRON_SECRET: SECRET, DEPLOY_HOOK_URL: HOOK_URL };

  it('posts to the deploy hook for a valid cron call and returns the job state', async () => {
    const fetchFunction = vi.fn<typeof fetch>().mockResolvedValue(makeHookResponse(201, { job: { id: 'job', state: 'PENDING' } }));

    const response = await makeHandler(environment, fetchFunction)(makeRequest({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: 'PENDING' });
    expect(fetchFunction).toHaveBeenCalledExactlyOnceWith(HOOK_URL, { method: 'POST' });
  });

  it('still answers 200 when the hook accepts the build but sends no job state', async () => {
    const fetchFunction = vi.fn<typeof fetch>().mockResolvedValue(new Response('accepted', { status: 201 }));

    const response = await makeHandler(environment, fetchFunction)(makeRequest({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: null });
  });

  it.each([
    ['a wrong secret', { authorization: 'Bearer wrong-secret' }, 'GET'],
    ['a secret of the wrong length', { authorization: 'Bearer x' }, 'GET'],
    ['no authorization header', {}, 'GET'],
    ['a secret without the Bearer scheme', { authorization: SECRET }, 'GET'],
    ['a POST with the right secret', { authorization: `Bearer ${SECRET}` }, 'POST'],
  ])('answers 401 and never calls the hook for %s', async (_name, headers, method) => {
    const fetchFunction = vi.fn<typeof fetch>();

    const response = await makeHandler(environment, fetchFunction)(makeRequest(headers, method));

    expect(response.status).toBe(401);
    expect(fetchFunction).not.toHaveBeenCalled();
  });

  it.each([
    ['CRON_SECRET', { CRON_SECRET: undefined, DEPLOY_HOOK_URL: HOOK_URL }],
    ['CRON_SECRET', { CRON_SECRET: '', DEPLOY_HOOK_URL: HOOK_URL }],
    ['DEPLOY_HOOK_URL', { CRON_SECRET: SECRET, DEPLOY_HOOK_URL: undefined }],
    ['DEPLOY_HOOK_URL', { CRON_SECRET: SECRET, DEPLOY_HOOK_URL: '' }],
  ])('answers 500 naming %s when it is missing, without echoing any value', async (name, incompleteEnvironment) => {
    const fetchFunction = vi.fn<typeof fetch>();

    const response = await makeHandler(incompleteEnvironment, fetchFunction)(makeRequest({ authorization: `Bearer ${SECRET}` }));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toContain(name);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(HOOK_URL);
    expect(fetchFunction).not.toHaveBeenCalled();
  });

  it('does not reveal a missing hook address to a caller without the secret', async () => {
    const response = await makeHandler({ CRON_SECRET: SECRET, DEPLOY_HOOK_URL: undefined }, vi.fn<typeof fetch>())(makeRequest());

    expect(response.status).toBe(401);
  });

  it('answers 502 when the hook answers with an error', async () => {
    const fetchFunction = vi.fn<typeof fetch>().mockResolvedValue(makeHookResponse(404, { error: 'not found' }));

    const response = await makeHandler(environment, fetchFunction)(makeRequest({ authorization: `Bearer ${SECRET}` }));
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).toContain('404');
    expect(text).not.toContain(HOOK_URL);
  });

  it('answers 502 when the hook cannot be reached', async () => {
    const fetchFunction = vi.fn<typeof fetch>().mockRejectedValue(new TypeError(`fetch failed for ${HOOK_URL}`));

    const response = await makeHandler(environment, fetchFunction)(makeRequest({ authorization: `Bearer ${SECRET}` }));
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).not.toContain(HOOK_URL);
  });
});
