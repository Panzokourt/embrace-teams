import type { Plugin } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Writes a public/version.json file at build time so the running client
 * can poll it and detect a new deploy.
 */
export function buildVersionPlugin(): Plugin {
  const buildId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: 'lovable-build-version',
    apply: 'build',
    config() {
      return {
        define: {
          __BUILD_ID__: JSON.stringify(buildId),
        },
      };
    },
    closeBundle() {
      try {
        const outDir = resolve(process.cwd(), 'dist');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(
          resolve(outDir, 'version.json'),
          JSON.stringify({ buildId, builtAt: new Date().toISOString() }, null, 2)
        );
      } catch (err) {
        console.warn('[buildVersionPlugin] failed to write version.json', err);
      }
    },
  };
}
