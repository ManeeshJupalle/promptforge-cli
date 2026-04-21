import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';

// Both executors read directly from CompletionResult produced by the provider —
// no re-measurement. That keeps the assertion and provider layers aligned on
// the same numbers users see in the reporter.

export async function assertCost(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const max = raw.max;
  if (typeof max !== 'number') {
    return {
      type: 'cost',
      passed: false,
      message: 'cost assertion requires numeric `max` (USD)',
    };
  }
  const cost = ctx.completion.cost;
  const passed = cost <= max;
  return {
    type: 'cost',
    passed,
    message: passed ? undefined : `cost $${cost.toFixed(6)} exceeds budget $${max.toFixed(6)}`,
    details: { cost, max },
  };
}

export async function assertLatency(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const maxMs = raw.maxMs;
  if (typeof maxMs !== 'number') {
    return {
      type: 'latency',
      passed: false,
      message: 'latency assertion requires numeric `maxMs`',
    };
  }
  const latencyMs = ctx.completion.latencyMs;
  const passed = latencyMs <= maxMs;
  return {
    type: 'latency',
    passed,
    message: passed ? undefined : `latency ${latencyMs}ms exceeds budget ${maxMs}ms`,
    details: { latencyMs, maxMs },
  };
}
