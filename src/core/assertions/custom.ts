import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';

export async function assertCustom(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  // Zod's passthrough preserves function-valued props at runtime but erases
  // them from the inferred type — hence the cast.
  const fn = (raw as unknown as { fn?: unknown }).fn;

  if (typeof fn !== 'function') {
    return {
      type: 'custom',
      passed: false,
      message:
        'custom assertions require a function `fn` — use a *.test.ts file with defineTestSuite',
    };
  }

  try {
    const result = await (fn as (
      output: string,
      context: AssertionContext,
    ) => unknown)(ctx.output, ctx);

    if (typeof result === 'boolean') {
      return {
        type: 'custom',
        passed: result,
        message: result ? undefined : 'custom assertion returned false',
      };
    }

    if (result && typeof result === 'object' && 'passed' in result) {
      const r = result as { passed: unknown; message?: unknown; details?: Record<string, unknown> };
      return {
        type: 'custom',
        passed: Boolean(r.passed),
        message: typeof r.message === 'string' ? r.message : undefined,
        details: r.details,
      };
    }

    return {
      type: 'custom',
      passed: false,
      message: `custom assertion returned ${typeof result}, expected boolean or { passed, message }`,
    };
  } catch (err) {
    return {
      type: 'custom',
      passed: false,
      message: `custom assertion threw: ${(err as Error).message}`,
    };
  }
}
