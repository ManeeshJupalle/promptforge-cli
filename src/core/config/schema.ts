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

// `.strict()` rejects unknown keys with a clear error. Without it, Zod
// silently strips typos (`varz`, `mockOutpt`) and users wonder why their
// test runs against `undefined` vars — the whole point of validating config
// is to catch these at parse time. `assertionSchema` stays on
// `.passthrough()` because each assertion type has its own schema-specific
// fields (value, threshold, criteria, …) carried through to the runner.
export const testCaseSchema = z
  .object({
    name: z.string().min(1, 'test name cannot be empty'),
    vars: z.record(z.unknown()).optional().default({}),
    assert: z.array(assertionSchema).optional().default([]),
    // Day 1 stand-in for provider output. Lets the assertion pipeline run
    // end-to-end before the provider layer (Day 2) is wired up. Once real
    // providers exist this becomes optional — useful for assertion-only tests.
    mockOutput: z.string().optional(),
  })
  .strict();

export const testSuiteSchema = z
  .object({
    prompt: z.string().optional(),
    // No default — we need to distinguish "unset" (inherit from project
    // config) from "explicitly pinned" (overrides project config). A default
    // value here makes the merge step see every suite as explicitly pinned.
    providers: z.array(z.string()).optional(),
    tests: z.array(testCaseSchema).min(1, 'a suite must contain at least one test'),
  })
  .strict();

export type Assertion = z.infer<typeof assertionSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestSuite = z.infer<typeof testSuiteSchema>;

// Post-merge suite — providers is always a resolved, non-empty array.
export type MergedTestSuite = Omit<TestSuite, 'providers'> & { providers: string[] };
