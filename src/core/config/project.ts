import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stat } from 'node:fs/promises';
import { z } from 'zod';

// `.strict()` rejects unknown keys — typos like `snapshotThresold` would
// otherwise be silently dropped and the user would wonder why their
// threshold isn't applying. Nested `providers` is strict for the same
// reason. Keep this in sync with the docs' listed config fields.
export const projectConfigSchema = z
  .object({
    testDir: z.string().optional(),
    providers: z
      .object({
        defaultModels: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    snapshotThreshold: z.number().min(0).max(1).optional(),
    // Note: `concurrency` is intentionally absent. Serial execution is the only
    // supported mode today; reintroduce this field when parallel execution lands.
  })
  .strict();

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export const PROJECT_CONFIG_FILENAME = 'promptforge.config.ts';

// Monotonic counter for cache-busting — see the matching note in typescript.ts.
let configLoadCounter = 0;

// Uses the same tsx register path as the *.test.ts loader — both go through
// a single tsx hook registration per process.
let registerPromise: Promise<void> | null = null;
async function ensureTsxRegistered(): Promise<void> {
  if (!registerPromise) {
    registerPromise = (async () => {
      const api = await import('tsx/esm/api');
      api.register();
    })();
  }
  await registerPromise;
}

export async function loadProjectConfig(cwd: string): Promise<ProjectConfig | null> {
  const configPath = path.join(cwd, PROJECT_CONFIG_FILENAME);
  const exists = await stat(configPath).catch(() => null);
  if (!exists?.isFile()) return null;

  await ensureTsxRegistered();
  // Cache-bust via monotonic counter so watch-mode reloads pick up edits.
  // Node's ESM loader keys the cache on the full URL, so each unique token
  // triggers a fresh import. See the matching note in typescript.ts.
  const url = `${pathToFileURL(configPath).href}?t=${++configLoadCounter}`;
  const mod = (await import(url)) as { default?: unknown };
  if (mod.default === undefined) {
    throw new Error(
      `${PROJECT_CONFIG_FILENAME}: expected a default export (use \`export default defineConfig({...})\`)`,
    );
  }
  const result = projectConfigSchema.safeParse(mod.default);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid ${PROJECT_CONFIG_FILENAME}:\n${issues}`);
  }
  return result.data;
}
