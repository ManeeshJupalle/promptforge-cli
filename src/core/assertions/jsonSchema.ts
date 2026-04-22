import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';

// Ajv is dynamic-imported so users who never write a jsonSchema assertion
// don't pay its parse/compile cost. A single Ajv instance is reused across
// assertions in a process — schema compilation is cached by object identity
// in Ajv's internal map, but we compile per-call since schemas are inline.
type AjvInstance = {
  compile(schema: unknown): (data: unknown) => boolean;
  errors?: AjvError[] | null;
};
type AjvError = { instancePath?: string; message?: string; schemaPath?: string };

let ajvPromise: Promise<AjvInstance> | null = null;
async function getAjv(): Promise<AjvInstance> {
  if (!ajvPromise) {
    ajvPromise = (async () => {
      const mod = await import('ajv');
      const Ajv = mod.default as unknown as new (opts: Record<string, unknown>) => AjvInstance;
      return new Ajv({ allErrors: true, strict: false });
    })();
  }
  return ajvPromise;
}

export async function assertJsonSchema(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const schema = raw.schema;
  if (!schema || typeof schema !== 'object') {
    return {
      type: 'jsonSchema',
      passed: false,
      message: 'jsonSchema assertion requires a `schema` object',
    };
  }

  const parsed = extractJson(ctx.output);
  if (parsed === undefined) {
    return {
      type: 'jsonSchema',
      passed: false,
      message: 'output is not valid JSON',
      details: { received: ctx.output.slice(0, 200) },
    };
  }

  const ajv = await getAjv();
  const validate = ajv.compile(schema);
  const valid = validate(parsed);
  if (valid) {
    return { type: 'jsonSchema', passed: true };
  }

  const errs = (validate as unknown as { errors?: AjvError[] | null }).errors ?? [];
  const summary = errs
    .map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`)
    .join('; ');

  return {
    type: 'jsonSchema',
    passed: false,
    message: `schema validation failed: ${summary}`,
    details: { errors: errs, received: parsed as Record<string, unknown> },
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through — try to find an embedded JSON block
  }
  // Scan for the first *balanced* {...} or [...] block. A greedy regex
  // would gobble everything from the first `{` to the last `}`, so an
  // output like `prefix {"ok":true} separator {"ignored":false}` would
  // fail parsing even though the first object is valid JSON.
  const candidate = findFirstBalanced(trimmed);
  if (candidate !== null) {
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Returns the first balanced `{...}` or `[...]` substring, respecting JSON
// string literals (quotes and backslash escapes) so braces inside strings
// don't skew the depth counter. Returns null if no balanced block exists.
function findFirstBalanced(s: string): string | null {
  for (let i = 0; i < s.length; i++) {
    const open = s[i];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return s.slice(i, j + 1);
      }
    }
  }
  return null;
}
