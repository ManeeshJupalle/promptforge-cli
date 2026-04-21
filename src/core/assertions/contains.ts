import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';

const truncate = (s: string, n = 160): string => (s.length > n ? `${s.slice(0, n)}…` : s);

export async function assertContains(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const value = raw.value;
  if (typeof value !== 'string') {
    return {
      type: 'contains',
      passed: false,
      message: 'contains assertion requires a string `value`',
    };
  }

  const caseSensitive = Boolean(raw.caseSensitive);
  const haystack = caseSensitive ? ctx.output : ctx.output.toLowerCase();
  const needle = caseSensitive ? value : value.toLowerCase();
  const passed = haystack.includes(needle);

  return {
    type: 'contains',
    passed,
    message: passed ? undefined : `expected output to contain "${value}"`,
    details: {
      expected: value,
      caseSensitive,
      received: truncate(ctx.output),
    },
  };
}

export async function assertNotContains(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const value = raw.value;
  if (typeof value !== 'string') {
    return {
      type: 'notContains',
      passed: false,
      message: 'notContains assertion requires a string `value`',
    };
  }

  const caseSensitive = Boolean(raw.caseSensitive);
  const haystack = caseSensitive ? ctx.output : ctx.output.toLowerCase();
  const needle = caseSensitive ? value : value.toLowerCase();
  const found = haystack.includes(needle);

  return {
    type: 'notContains',
    passed: !found,
    message: !found ? undefined : `expected output NOT to contain "${value}"`,
    details: {
      unexpected: value,
      caseSensitive,
      received: truncate(ctx.output),
    },
  };
}
