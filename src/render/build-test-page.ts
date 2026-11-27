import { fileURLToPath } from 'node:url';

import { build } from 'vite';

import type { Show } from '../show/show-types.ts';
import { showDataPlugin } from './show-data-plugin.ts';

const SITE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export interface TestBuild {
  page: string;
  showJson: string;
}

function readAsset(output: readonly { type: string; fileName: string; source?: unknown }[], fileName: string): string {
  const file = output.find((candidate) => candidate.fileName === fileName);
  if (file?.type !== 'asset' || typeof file.source !== 'string') {
    throw new Error(`Expected the build to emit ${fileName}`);
  }
  return file.source;
}

export async function buildTestPage(show: Show): Promise<TestBuild> {
  const result = await build({
    root: SITE_ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [showDataPlugin(() => show)],
    build: { write: false },
  });
  if (Array.isArray(result) || !('output' in result)) {
    throw new Error('Expected a single build output');
  }
  return { page: readAsset(result.output, 'index.html'), showJson: readAsset(result.output, 'show.json') };
}
