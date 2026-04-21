import path from 'node:path';
import chalk from 'chalk';
import { getDb } from '../../core/storage/db.js';
import {
  RunNotFoundError,
  compareRuns,
  type RunComparison,
  type StatusChange,
  type TestComparison,
} from '../../core/compare/index.js';
import type { RunRow } from '../../core/storage/types.js';

export async function compareCommand(aRef: string, bRef: string): Promise<number> {
  const cwd = process.cwd();
  const db = await getDb(cwd);

  let comparison: RunComparison;
  try {
    comparison = compareRuns(db, aRef, bRef);
  } catch (err) {
    if (err instanceof RunNotFoundError) {
      console.error(chalk.red(`No run found for "${err.ref}".`));
      console.error(chalk.dim('Use a run ID, or "latest" / "previous".'));
      return 1;
    }
    throw err;
  }

  renderHeader(comparison);
  renderTests(comparison.tests, cwd);
  renderCounts(comparison.tests);

  return 0;
}

function renderHeader(cmp: RunComparison): void {
  console.log();
  console.log(
    chalk.bold('Compare: ') + describeRun(cmp.runA) + chalk.dim(' → ') + describeRun(cmp.runB),
  );
  console.log();
}

function describeRun(r: RunRow): string {
  const when = new Date(r.started_at).toISOString().replace('T', ' ').slice(0, 16);
  const summary = r.finished_at
    ? `${r.passed ?? 0}p/${r.failed ?? 0}f`
    : 'in-flight';
  const git = r.git_commit ? ` ${r.git_commit.slice(0, 7)}` : '';
  return `${chalk.cyan(r.id)} ${chalk.dim(when)} ${chalk.dim(summary)}${chalk.dim(git)}`;
}

function renderTests(tests: TestComparison[], cwd: string): void {
  let lastStatus: StatusChange | null = null;
  for (const t of tests) {
    if (lastStatus !== t.statusChange) {
      console.log(chalk.bold(sectionLabel(t.statusChange)));
      lastStatus = t.statusChange;
    }
    renderTest(t, cwd);
  }
}

function sectionLabel(status: StatusChange): string {
  switch (status) {
    case 'regression':
      return chalk.red.bold('Regressions');
    case 'improvement':
      return chalk.green.bold('Improvements');
    case 'same-pass':
      return chalk.dim('Unchanged (pass)');
    case 'same-fail':
      return chalk.dim('Unchanged (fail)');
    case 'added':
      return chalk.cyan('New tests');
    case 'removed':
      return chalk.magenta('Removed tests');
  }
}

function renderTest(t: TestComparison, cwd: string): void {
  const rel = t.testFile ? path.relative(cwd, t.testFile) || t.testFile : '';
  const icon = statusIcon(t.statusChange);
  console.log(`  ${icon} ${t.testName} ${chalk.dim(`(${t.provider}) ${rel}`)}`);

  if (t.statusChange === 'same-pass') return; // No need to show deltas for unchanged passes.

  if (t.costDelta !== null && Math.abs(t.costDelta) > 1e-7) {
    const sign = t.costDelta > 0 ? '+' : '';
    const text = `cost ${sign}$${t.costDelta.toFixed(6)}`;
    console.log(`      ${t.costDelta > 0 ? chalk.red(text) : chalk.green(text)}`);
  }
  if (t.latencyDelta !== null && Math.abs(t.latencyDelta) > 0) {
    const sign = t.latencyDelta > 0 ? '+' : '';
    const text = `latency ${sign}${t.latencyDelta}ms`;
    console.log(`      ${t.latencyDelta > 0 ? chalk.red(text) : chalk.green(text)}`);
  }

  if (t.outputDiff) {
    const indented = t.outputDiff
      .split('\n')
      .map((line) => `      ${colorizeDiffLine(line)}`)
      .join('\n');
    console.log(indented);
  } else if ((t.statusChange === 'regression' || t.statusChange === 'improvement') && t.b) {
    console.log(chalk.dim(`      output: ${truncate(t.b.output, 160)}`));
  }
}

function statusIcon(status: StatusChange): string {
  switch (status) {
    case 'regression':
      return chalk.red('✗');
    case 'improvement':
      return chalk.green('✓');
    case 'same-pass':
      return chalk.green.dim('✓');
    case 'same-fail':
      return chalk.red.dim('✗');
    case 'added':
      return chalk.cyan('+');
    case 'removed':
      return chalk.magenta('-');
  }
}

function colorizeDiffLine(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return chalk.dim(line);
  if (line.startsWith('+')) return chalk.green(line);
  if (line.startsWith('-')) return chalk.red(line);
  return chalk.dim(line);
}

function renderCounts(tests: TestComparison[]): void {
  const counts: Record<StatusChange, number> = {
    regression: 0,
    improvement: 0,
    'same-pass': 0,
    'same-fail': 0,
    added: 0,
    removed: 0,
  };
  for (const t of tests) counts[t.statusChange]++;

  console.log();
  const parts: string[] = [];
  if (counts.regression > 0) parts.push(chalk.red.bold(`${counts.regression} regression${counts.regression === 1 ? '' : 's'}`));
  if (counts.improvement > 0) parts.push(chalk.green.bold(`${counts.improvement} improvement${counts.improvement === 1 ? '' : 's'}`));
  if (counts.added > 0) parts.push(chalk.cyan(`${counts.added} added`));
  if (counts.removed > 0) parts.push(chalk.magenta(`${counts.removed} removed`));
  parts.push(chalk.dim(`${counts['same-pass']} unchanged pass, ${counts['same-fail']} unchanged fail`));
  console.log(chalk.bold('Delta: ') + parts.join(', '));
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
