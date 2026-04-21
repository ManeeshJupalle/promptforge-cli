import { stat } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { loadYamlSuite, TestSuiteParseError } from './yaml.js';
import { loadTsSuite } from './typescript.js';
import type { TestSuite } from './schema.js';

export interface DiscoveredSuite {
  file: string;
  suite: TestSuite;
}

const DEFAULT_PATTERNS = ['**/*.test.yaml', '**/*.test.yml', '**/*.test.ts'];
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.promptforge/**'];

const isYamlTestFile = (p: string): boolean => /\.test\.ya?ml$/i.test(p);
const isTsTestFile = (p: string): boolean => /\.test\.ts$/i.test(p);
const isTestFile = (p: string): boolean => isYamlTestFile(p) || isTsTestFile(p);

export interface DiscoverOptions {
  // Project-configured test directory. Used only when the caller supplies no
  // explicit scopes — explicit paths always win so users can point discovery
  // at a different folder ad-hoc.
  testDir?: string;
}

export async function discoverTests(
  cwd: string,
  scopes: string[] = [],
  options: DiscoverOptions = {},
): Promise<string[]> {
  const found = new Set<string>();
  const roots =
    scopes.length > 0
      ? scopes
      : options.testDir
        ? [options.testDir]
        : ['.'];

  for (const scope of roots) {
    const abs = path.resolve(cwd, scope);
    let info;
    try {
      info = await stat(abs);
    } catch {
      continue;
    }

    if (info.isFile()) {
      if (isTestFile(abs)) found.add(abs);
      continue;
    }

    for (const pattern of DEFAULT_PATTERNS) {
      const matches = await glob(pattern, {
        cwd: abs,
        ignore: DEFAULT_IGNORE,
        absolute: true,
        nodir: true,
      });
      for (const m of matches) found.add(m);
    }
  }

  return Array.from(found).sort();
}

export async function loadSuites(files: string[]): Promise<DiscoveredSuite[]> {
  const suites: DiscoveredSuite[] = [];
  for (const file of files) {
    const suite = isTsTestFile(file) ? await loadTsSuite(file) : await loadYamlSuite(file);
    suites.push({ file, suite });
  }
  return suites;
}

export { TestSuiteParseError };
