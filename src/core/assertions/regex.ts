import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';

const truncate = (s: string, n = 160): string => (s.length > n ? `${s.slice(0, n)}…` : s);

export async function assertRegex(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const pattern = raw.pattern;
  if (typeof pattern !== 'string') {
    return {
      type: 'regex',
      passed: false,
      message: 'regex assertion requires a string `pattern`',
    };
  }

  const flags = typeof raw.flags === 'string' ? raw.flags : undefined;

  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch (err) {
    return {
      type: 'regex',
      passed: false,
      message: `invalid regex /${pattern}/${flags ?? ''}: ${(err as Error).message}`,
      details: { pattern, flags },
    };
  }

  const matched = re.test(ctx.output);
  return {
    type: 'regex',
    passed: matched,
    message: matched ? undefined : `expected output to match /${pattern}/${flags ?? ''}`,
    details: {
      pattern,
      flags: flags ?? '',
      received: truncate(ctx.output),
    },
  };
}
