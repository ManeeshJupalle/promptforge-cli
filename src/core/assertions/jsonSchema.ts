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
  const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
