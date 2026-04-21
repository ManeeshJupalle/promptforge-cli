import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';
import { cosineSimilarity, embed } from '../embeddings/index.js';

export async function assertSemanticSimilarity(
  ctx: AssertionContext,
  raw: Assertion,
): Promise<AssertionResult> {
  const expected = raw.expected;
  if (typeof expected !== 'string') {
    return {
      type: 'semanticSimilarity',
      passed: false,
      message: 'semanticSimilarity requires a string `expected`',
    };
  }
  const threshold = typeof raw.threshold === 'number' ? raw.threshold : 0.75;

  const [expEmb, outEmb] = await Promise.all([embed(expected), embed(ctx.output)]);
  const similarity = cosineSimilarity(expEmb, outEmb);
  const passed = similarity >= threshold;

  return {
    type: 'semanticSimilarity',
    passed,
    message: passed
      ? undefined
      : `semantic similarity ${similarity.toFixed(3)} below threshold ${threshold.toFixed(3)}`,
    details: {
      similarity,
      threshold,
      expected,
      received: ctx.output.slice(0, 200),
    },
  };
}
