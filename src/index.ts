// Public library entry. Users importing `promptforge` inside a *.test.ts file
// reach this module via Node's package self-reference, and the types below
// give them autocomplete for the test-suite shape.

import type { AssertionContext } from './core/assertions/context.js';
import type { AssertionResult } from './core/types/index.js';

export type { AssertionContext } from './core/assertions/context.js';
export type { AssertionResult, CompletionResult, Provider, TestResult } from './core/types/index.js';
export type { TestSuite, TestCase, Assertion } from './core/config/schema.js';
export type { ProjectConfig } from './core/config/project.js';

// `promptforge.config.ts` helper. Identity function for TypeScript DX.
export function defineConfig<T extends import('./core/config/project.js').ProjectConfig>(config: T): T {
  return config;
}

// Return value of a custom assertion. Either a plain boolean shortcut or a
// structured result whose `passed` flag decides pass/fail.
export type CustomAssertionReturn =
  | boolean
  | { passed: boolean; message?: string; details?: Record<string, unknown> };

export type CustomAssertionFn = (
  output: string,
  context: AssertionContext,
) => CustomAssertionReturn | Promise<CustomAssertionReturn>;

// Loose assertion shape. Keeps YAML parity (any `{type, ...}` object) and
// allows function-valued `fn` on custom assertions without forcing users
// through a discriminated-union cast.
export interface AssertionInput {
  type: string;
  [key: string]: unknown;
}

export interface TestCaseInput {
  name: string;
  vars?: Record<string, unknown>;
  mockOutput?: string;
  assert?: AssertionInput[];
}

export interface TestSuiteInput {
  prompt?: string;
  providers?: string[];
  tests: TestCaseInput[];
}

// Identity function that exists purely for TypeScript DX — users get top-level
// autocomplete on the suite shape, and custom assertion functions survive the
// runtime load because Zod's passthrough preserves them as-is.
export function defineTestSuite(suite: TestSuiteInput): TestSuiteInput {
  return suite;
}

// Unused-import guard so tsc doesn't drop these types from .d.ts.
export type _AssertionResult = AssertionResult;
