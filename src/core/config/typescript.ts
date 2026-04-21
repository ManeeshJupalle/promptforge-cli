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

export async function loadTsSuite(filePath: string): Promise<TestSuite> {
  await ensureRegistered();

  const url = pathToFileURL(filePath).href;
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
