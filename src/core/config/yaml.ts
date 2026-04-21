import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { testSuiteSchema, type TestSuite } from './schema.js';

export class TestSuiteParseError extends Error {
  constructor(public readonly file: string, message: string) {
    super(message);
    this.name = 'TestSuiteParseError';
  }
}

export async function loadYamlSuite(filePath: string): Promise<TestSuite> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (err) {
    throw new TestSuiteParseError(filePath, `Could not read file: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    // js-yaml attaches a `mark` with line+column when the error is a syntax
    // problem. Surface that so users aren't hunting for the offending line.
    const yamlErr = err as { mark?: { line?: number; column?: number }; reason?: string; message: string };
    const mark = yamlErr.mark;
    const location = mark && typeof mark.line === 'number'
      ? ` at line ${mark.line + 1}${typeof mark.column === 'number' ? `, column ${mark.column + 1}` : ''}`
      : '';
    const reason = yamlErr.reason ?? yamlErr.message;
    throw new TestSuiteParseError(filePath, `YAML syntax error${location}: ${reason}`);
  }

  const result = testSuiteSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `  • ${path}: ${issue.message}`;
      })
      .join('\n');
    throw new TestSuiteParseError(filePath, `Invalid test suite:\n${issues}`);
  }

  return result.data;
}
