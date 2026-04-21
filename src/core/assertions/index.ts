import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';
import { assertContains, assertNotContains } from './contains.js';
import { assertRegex } from './regex.js';
import { assertJsonSchema } from './jsonSchema.js';
import { assertSemanticSimilarity } from './semanticSimilarity.js';
import { assertLlmJudge } from './llmJudge.js';
import { assertSnapshot } from './snapshot.js';
import { assertCost, assertLatency } from './costLatency.js';
import { assertCustom } from './custom.js';

export type { AssertionContext } from './context.js';

export async function runAssertion(
  ctx: AssertionContext,
  assertion: Assertion,
): Promise<AssertionResult> {
  switch (assertion.type) {
    case 'contains':
      return assertContains(ctx, assertion);
    case 'notContains':
      return assertNotContains(ctx, assertion);
    case 'regex':
      return assertRegex(ctx, assertion);
    case 'jsonSchema':
      return assertJsonSchema(ctx, assertion);
    case 'semanticSimilarity':
      return assertSemanticSimilarity(ctx, assertion);
    case 'llmJudge':
      return assertLlmJudge(ctx, assertion);
    case 'snapshot':
      return assertSnapshot(ctx, assertion);
    case 'cost':
      return assertCost(ctx, assertion);
    case 'latency':
      return assertLatency(ctx, assertion);
    case 'custom':
      return assertCustom(ctx, assertion);
    default:
      return {
        type: assertion.type,
        passed: false,
        message: `unknown assertion type "${assertion.type}"`,
      };
  }
}

// Sequential within a test — assertions are usually cheap and a few (snapshot,
// llmJudge) are side-effectful, so determinism matters more than parallelism.
export async function runAssertions(
  ctx: AssertionContext,
  assertions: Assertion[],
): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];
  for (const a of assertions) {
    results.push(await runAssertion(ctx, a));
  }
  return results;
}
