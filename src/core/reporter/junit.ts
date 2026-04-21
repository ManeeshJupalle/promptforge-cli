import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RunSummary } from '../runner/index.js';
import type { TestResult } from '../types/index.js';

const DEFAULT_PATH = 'promptforge-results.xml';

export class JUnitReporter {
  constructor(
    private readonly outputPath: string = DEFAULT_PATH,
    private readonly cwd: string = process.cwd(),
  ) {}

  events() {
    return {};
  }

  async finalReport(summary: RunSummary): Promise<void> {
    const abs = path.isAbsolute(this.outputPath)
      ? this.outputPath
      : path.join(this.cwd, this.outputPath);
    const xml = renderJUnit(summary, this.cwd);
    await writeFile(abs, xml, 'utf8');
    // Intentionally quiet on success — CI pipelines parse the file, not
    // stdout. Still print to stderr so humans invoking interactively see it.
    process.stderr.write(`JUnit report written to ${abs}\n`);
  }
}

export function renderJUnit(summary: RunSummary, cwd: string): string {
  const byFile = new Map<string, TestResult[]>();
  for (const r of summary.results) {
    const list = byFile.get(r.file) ?? [];
    list.push(r);
    byFile.set(r.file, list);
  }

  const totalTime = (summary.durationMs / 1000).toFixed(3);
  const timestamp = new Date().toISOString();
  const chunks: string[] = [];
  chunks.push('<?xml version="1.0" encoding="UTF-8"?>');
  chunks.push(
    `<testsuites name="promptforge" tests="${summary.total}" failures="${summary.failed}" time="${totalTime}" timestamp="${timestamp}">`,
  );

  for (const [file, rs] of byFile) {
    const rel = path.relative(cwd, file) || file;
    const failed = rs.filter((r) => !r.passed).length;
    const suiteTime = (rs.reduce((sum, r) => sum + r.latencyMs, 0) / 1000).toFixed(3);
    chunks.push(
      `  <testsuite name=${attr(rel)} tests="${rs.length}" failures="${failed}" time="${suiteTime}">`,
    );
    for (const r of rs) {
      const caseTime = (r.latencyMs / 1000).toFixed(3);
      chunks.push(
        `    <testcase name=${attr(r.name)} classname=${attr(r.provider)} time="${caseTime}">`,
      );
      if (!r.passed) {
        const failedAssertions = r.assertions.filter((a) => !a.passed);
        const message =
          r.error ??
          (failedAssertions.length > 0
            ? `${failedAssertions[0].type}: ${failedAssertions[0].message ?? 'failed'}`
            : 'failed');
        const body = buildFailureBody(r);
        chunks.push(
          `      <failure message=${attr(message)} type=${attr(r.error ? 'error' : 'assertion')}>${cdata(body)}</failure>`,
        );
      }
      chunks.push(`    </testcase>`);
    }
    chunks.push(`  </testsuite>`);
  }

  chunks.push('</testsuites>');
  return chunks.join('\n') + '\n';
}

function buildFailureBody(r: TestResult): string {
  const lines: string[] = [];
  if (r.error) {
    lines.push(`Error: ${r.error}`);
  }
  for (const a of r.assertions) {
    if (a.passed) continue;
    lines.push(`[${a.type}] ${a.message ?? 'failed'}`);
    if (a.details) {
      const keys: Array<keyof typeof a.details> = [
        'expected',
        'unexpected',
        'pattern',
        'flags',
        'similarity',
        'threshold',
        'score',
        'reasoning',
        'judgeModel',
        'cost',
        'max',
        'latencyMs',
        'maxMs',
        'received',
      ];
      for (const k of keys) {
        const v = a.details[k];
        if (v === undefined || v === null || v === '') continue;
        const rendered = typeof v === 'object' ? JSON.stringify(v) : String(v);
        lines.push(`  ${String(k)}: ${rendered}`);
      }
    }
  }
  if (r.output) {
    lines.push('');
    lines.push('Output:');
    lines.push(r.output);
  }
  return lines.join('\n');
}

// XML attribute escape — returns the value already wrapped in quotes for
// convenient interpolation above.
function attr(value: string): string {
  return `"${escapeXml(value)}"`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(s: string): string {
  // Closing-bracket split protects against CDATA injection via ]]> in test output.
  return `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}
