import { createHash, timingSafeEqual } from 'node:crypto';

interface RebuildEnvironment {
  CRON_SECRET: string | undefined;
  DEPLOY_HOOK_URL: string | undefined;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function isAuthorised(request: Request, secret: string): boolean {
  if (request.method !== 'GET') {
    return false;
  }
  const header = request.headers.get('authorization');
  return header !== null && timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

function readJobState(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('job' in body)) {
    return null;
  }
  const { job } = body;
  if (typeof job !== 'object' || job === null || !('state' in job)) {
    return null;
  }
  return typeof job.state === 'string' ? job.state : null;
}

export function createRebuildHandler(
  environment: RebuildEnvironment,
  fetchFunction: typeof fetch,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const { CRON_SECRET: secret, DEPLOY_HOOK_URL: hookUrl } = environment;
    if (secret === undefined || secret === '') {
      return Response.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
    }
    if (!isAuthorised(request, secret)) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
    if (hookUrl === undefined || hookUrl === '') {
      return Response.json({ error: 'DEPLOY_HOOK_URL is not set' }, { status: 500 });
    }

    let hookResponse: Response;
    try {
      hookResponse = await fetchFunction(hookUrl, { method: 'POST' });
    } catch {
      return Response.json({ error: 'The deploy hook could not be reached' }, { status: 502 });
    }
    if (!hookResponse.ok) {
      return Response.json({ error: `The deploy hook answered HTTP ${hookResponse.status}` }, { status: 502 });
    }
    const body: unknown = await hookResponse.json().catch(() => null);
    return Response.json({ state: readJobState(body) });
  };
}

export default {
  fetch: createRebuildHandler(
    { CRON_SECRET: process.env.CRON_SECRET, DEPLOY_HOOK_URL: process.env.DEPLOY_HOOK_URL },
    globalThis.fetch,
  ),
};
