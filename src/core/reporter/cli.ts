import path from 'node:path';
import chalk from 'chalk';
import type { RunSummary, RunnerEvents } from '../runner/index.js';
import type { AssertionResult, TestResult } from '../types/index.js';

// Dynamic imports inside methods so the plain JSON/JUnit reporters don't load
// ora/boxen. Type-only re-declarations keep tsc happy without pulling in the
// full module types up-front.
type OraFactory = (opts: { text: string; indent?: number; color?: string; spinner?: string }) => {
  start(): ReturnType<OraFactory>;
  stop(): void;
  stopAndPersist(opts?: { symbol?: string; text?: string }): void;
  text: string;
};
type BoxenFn = (
  content: string,
  opts?: {
    title?: string;
    padding?: number | { top: number; right: number; bottom: number; left: number };
    margin?: number | { top: number; right: number; bottom: number; left: number };
    borderColor?: string;
    borderStyle?: string;
    dimBorder?: boolean;
    width?: number;
  },
) => string;

export interface CliReporterOptions {
  cwd: string;
  tty?: boolean;
}

export class CliReporter {
  private readonly cwd: string;
  private readonly tty: boolean;
  private ora: OraFactory | null = null;
  private boxen: BoxenFn | null = null;
  private spinner: ReturnType<OraFactory> | null = null;
  private currentFile: string | null = null;
  private loadedHeavy: Promise<void> | null = null;

  constructor(opts: CliReporterOptions) {
    this.cwd = opts.cwd;
    this.tty = opts.tty ?? Boolean(process.stdout.isTTY);
  }

  // Lazy-load ora + boxen only when we actually need them. The plain reporter
  // path still works if imports fail (e.g. sandboxed env without them).
  private async ensureHeavy(): Promise<void> {
    if (!this.tty) return;
    if (this.loadedHeavy) return this.loadedHeavy;
    this.loadedHeavy = (async () => {
      try {
        const oraMod = await import('ora');
        this.ora = oraMod.default as unknown as OraFactory;
      } catch {
        this.ora = null;
      }
      try {
        const boxenMod = await import('boxen');
        this.boxen = boxenMod.default as unknown as BoxenFn;
      } catch {
        this.boxen = null;
      }
    })();
    return this.loadedHeavy;
  }

  events(): RunnerEvents {
    return {
      onStart: () => this.onStart(),
      onTestStart: (evt) => this.onTestStart(evt),
      onTestFinish: (result) => this.onTestFinish(result),
    };
  }

  private onStart(): void {
    // Header printed eagerly so output reads top-down even if the first
    // provider call is slow. Not part of the spinner life cycle.
    console.log();
    console.log(chalk.bold('🧪 PromptForge v0.1.0'));
    console.log();
  }

  private async onTestStart(evt: { file: string; test: { name: string }; provider: string }): Promise<void> {
    await this.ensureHeavy();
    if (evt.file !== this.currentFile) {
      this.currentFile = evt.file;
      const rel = path.relative(this.cwd, evt.file) || evt.file;
      console.log(chalk.cyan('→') + ' ' + chalk.cyan.dim(rel));
    }
    if (this.tty && this.ora) {
      this.spinner = this.ora({
        text: chalk.dim(`${evt.test.name} ${chalk.gray(`(${evt.provider})`)}`),
        indent: 2,
        color: 'cyan',
      }).start();
    }
  }

  private onTestFinish(result: TestResult): void {
    const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
    const name = result.passed ? result.name : chalk.red(result.name);
    const metaParts: string[] = [chalk.gray(`(${result.provider})`), `${result.latencyMs}ms`];
    if (result.cost > 0) metaParts.push(`$${result.cost.toFixed(4)}`);
    const meta = chalk.dim(metaParts.join(' '));
    const line = `  ${icon} ${name} ${meta}`;

    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
      console.log(line);
    } else {
      console.log(line);
    }
  }

  async finalReport(summary: RunSummary): Promise<void> {
    await this.ensureHeavy();

    if (summary.failed > 0) {
      this.printFailSummary(summary);
    }

    if (summary.regressions.length > 0) {
      this.printRegressions(summary);
    }

    console.log();
    this.printFooter(summary);
  }

  private printFailSummary(summary: RunSummary): void {
    console.log();
    this.printDivider('FAIL SUMMARY', chalk.red);

    const byFile = new Map<string, TestResult[]>();
    for (const r of summary.results) {
      if (r.passed) continue;
      const list = byFile.get(r.file) ?? [];
      list.push(r);
      byFile.set(r.file, list);
    }

    for (const [file, rs] of byFile) {
      const rel = path.relative(this.cwd, file) || file;
      console.log();
      console.log(chalk.dim(rel));
      for (const r of rs) {
        console.log(this.renderFailureCard(r));
      }
    }
  }

  private renderFailureCard(r: TestResult): string {
    const header = chalk.red.bold(`✗ ${r.name}`) + chalk.dim(` · ${r.provider}`);
    const lines: string[] = [];
    if (r.error) {
      lines.push(chalk.red(`error: ${r.error}`));
    } else {
      const failed = r.assertions.filter((a) => !a.passed);
      for (const a of failed) {
        lines.push(chalk.red.bold(a.type) + chalk.dim(' — ') + (a.message ?? 'failed'));
        const detail = formatAssertionDetails(a);
        if (detail) lines.push(detail);
      }
    }
    const body = lines.join('\n');

    if (this.tty && this.boxen) {
      return this.boxen(body, {
        title: header,
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        margin: { top: 1, right: 0, bottom: 0, left: 2 },
        borderColor: 'red',
        borderStyle: 'round',
        dimBorder: false,
      });
    }
    // Non-TTY fallback: just indent, no box chars.
    return ['', `  ${header}`, ...body.split('\n').map((l) => `    ${l}`)].join('\n');
  }

  private printRegressions(summary: RunSummary): void {
    console.log();
    const count = summary.regressions.length;
    console.log(
      chalk.yellow.bold(
        `⚠ ${count} regression${count === 1 ? '' : 's'} since previous run:`,
      ),
    );
    for (const reg of summary.regressions) {
      console.log(`  ${chalk.red('✗')} ${reg.testName} ${chalk.dim(`(${reg.provider})`)}`);
    }
    console.log(chalk.dim(`  run \`promptforge compare previous latest\` for details`));
  }

  private printFooter(summary: RunSummary): void {
    const { passed, failed, total, durationMs, providerNames, runId, recorded } = summary;

    const testsLine = [
      failed > 0 ? chalk.red.bold(`${failed} failed`) : null,
      passed > 0 ? chalk.green.bold(`${passed} passed`) : null,
      chalk.dim(`${total} total`),
    ]
      .filter(Boolean)
      .join(chalk.dim(', '));

    const costByProvider = groupCostByProvider(summary.results);
    const costLines = costByProvider.length > 0
      ? costByProvider
          .map((c) => chalk.dim(`  ${c.provider.padEnd(24)} $${c.cost.toFixed(4)}`))
          .join('\n')
      : chalk.dim('  —');

    const lines = [
      `${chalk.bold('Tests     ')} ${testsLine}`,
      `${chalk.bold('Providers ')} ${chalk.cyan(providerNames.join(', ') || '—')}`,
      `${chalk.bold('Cost')}`,
      costLines,
      `${chalk.bold('Duration  ')} ${chalk.dim(`${(durationMs / 1000).toFixed(2)}s`)}`,
      `${chalk.bold('Run       ')} ${recorded ? chalk.cyan(runId) : chalk.dim(`${runId} (not recorded)`)}`,
    ];
    const body = lines.join('\n');

    if (this.tty && this.boxen) {
      console.log(
        this.boxen(body, {
          padding: { top: 0, right: 1, bottom: 0, left: 1 },
          borderColor: failed > 0 ? 'red' : 'gray',
          borderStyle: 'round',
        }),
      );
    } else {
      console.log(body);
    }
  }

  private printDivider(label: string, color: (s: string) => string): void {
    const width = Math.min(60, process.stdout.columns ?? 60);
    const line = '─'.repeat(width);
    console.log(color(line));
    console.log(color(label));
    console.log(color(line));
  }
}

function formatAssertionDetails(a: AssertionResult): string | null {
  const details = a.details;
  if (!details) return null;
  const out: string[] = [];

  const fields: Array<[string, unknown]> = [
    ['expected', details.expected],
    ['unexpected', details.unexpected],
    ['pattern', details.pattern],
    ['flags', details.flags],
    ['similarity', details.similarity],
    ['threshold', details.threshold],
    ['score', details.score],
    ['reasoning', details.reasoning],
    ['judgeModel', details.judgeModel],
    ['cost', details.cost],
    ['max', details.max],
    ['latencyMs', details.latencyMs],
    ['maxMs', details.maxMs],
  ];
  for (const [label, value] of fields) {
    if (value === undefined || value === null || value === '') continue;
    let rendered: string;
    if (typeof value === 'number') rendered = Number.isInteger(value) ? String(value) : value.toFixed(3);
    else if (typeof value === 'string') rendered = value;
    else rendered = JSON.stringify(value);
    out.push(chalk.dim(`  ${label.padEnd(12)} ${rendered}`));
  }
  const received = details.received;
  if (typeof received === 'string' && received.length > 0) {
    out.push(chalk.dim(`  ${'received'.padEnd(12)} ${JSON.stringify(received)}`));
  }
  return out.join('\n');
}

function groupCostByProvider(results: TestResult[]): Array<{ provider: string; cost: number }> {
  const map = new Map<string, number>();
  for (const r of results) {
    if (r.cost <= 0) continue;
    map.set(r.provider, (map.get(r.provider) ?? 0) + r.cost);
  }
  return Array.from(map.entries())
    .map(([provider, cost]) => ({ provider, cost }))
    .sort((a, b) => b.cost - a.cost);
}

// Legacy export — old call sites still pass `(summary, cwd)`. The new CliReporter
// class is preferred; this is the compat shim so nothing else had to change.
export async function reportResults(summary: RunSummary, cwd: string): Promise<void> {
  const reporter = new CliReporter({ cwd });
  await reporter.finalReport(summary);
}
