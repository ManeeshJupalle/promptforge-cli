import { z } from 'zod';

// Day 1 supports: contains, notContains, regex.
// Other assertion types (jsonSchema, semanticSimilarity, llmJudge, snapshot,
// cost, latency, custom) will parse without error but surface a clear
// "not yet supported" failure at run time until Days 2–3 land.
export const assertionSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

export const testCaseSchema = z.object({
  name: z.string().min(1, 'test name cannot be empty'),
  vars: z.record(z.unknown()).optional().default({}),
  assert: z.array(assertionSchema).optional().default([]),
  // Day 1 stand-in for provider output. Lets the assertion pipeline run
  // end-to-end before the provider layer (Day 2) is wired up. Once real
  // providers exist this becomes optional — useful for assertion-only tests.
  mockOutput: z.string().optional(),
});

export const testSuiteSchema = z.object({
  prompt: z.string().optional(),
  // No default — we need to distinguish "unset" (inherit from project
  // config) from "explicitly pinned" (overrides project config). A default
  // value here makes the merge step see every suite as explicitly pinned.
  providers: z.array(z.string()).optional(),
  tests: z.array(testCaseSchema).min(1, 'a suite must contain at least one test'),
});

export type Assertion = z.infer<typeof assertionSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestSuite = z.infer<typeof testSuiteSchema>;

// Post-merge suite — providers is always a resolved, non-empty array.
export type MergedTestSuite = Omit<TestSuite, 'providers'> & { providers: string[] };
