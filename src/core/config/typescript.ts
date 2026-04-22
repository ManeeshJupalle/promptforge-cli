import { pathToFileURL } from 'node:url';
import { testSuiteSchema, type TestSuite } from './schema.js';
import { TestSuiteParseError } from './yaml.js';

// tsx's ESM loader is registered lazily on first .test.ts load and left in
// place for the process lifetime — the user may have multiple TS suites.
// We dynamic-import tsx/esm/api so plain YAML runs never pay its cost.
let registerPromise: Promise<void> | null = null;
async function ensureRegistered(): Promise<void> {
  if (!registerPromise) {
    registerPromise = (async () => {
      const api = await import('tsx/esm/api');
      api.register();
    })();
  }
  await registerPromise;
}

// Monotonic counter — guarantees a unique `?t=` per call even when two
// loads happen in the same millisecond (Date.now() can collide under fast
// watch-mode edits). Wrapping at 2^53 is a theoretical concern only.
let loadCounter = 0;

export async function loadTsSuite(filePath: string): Promise<TestSuite> {
  await ensureRegistered();

  // Append a fresh query string so Node's ESM loader treats each call as a
  // distinct module — otherwise `watch` mode keeps returning the cached v1
  // after the file is edited. The overhead for single-run commands is a
  // negligible re-parse on the first and only load.
  const url = `${pathToFileURL(filePath).href}?t=${++loadCounter}`;
  let mod: { default?: unknown };
  try {
    mod = (await import(url)) as { default?: unknown };
  } catch (err) {
    throw new TestSuiteParseError(filePath, `TypeScript load error: ${(err as Error).message}`);
  }

  if (mod.default === undefined) {
    throw new TestSuiteParseError(
      filePath,
      'expected a default export from *.test.ts files (use `export default defineTestSuite({...})`)',
    );
  }

  const result = testSuiteSchema.safeParse(mod.default);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const p = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `  • ${p}: ${issue.message}`;
      })
      .join('\n');
    throw new TestSuiteParseError(filePath, `Invalid test suite:\n${issues}`);
  }

  return result.data;
}
