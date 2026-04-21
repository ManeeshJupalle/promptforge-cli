import chalk from 'chalk';
import { discoverTests, loadSuites, TestSuiteParseError } from '../../core/config/loader.js';
import { loadProjectConfig } from '../../core/config/project.js';
import { mergeSuite, resolveDefaults } from '../../core/config/merge.js';
import { runSuites, type PlannedSuite } from '../../core/runner/index.js';
import { CliReporter } from '../../core/reporter/cli.js';
import { JsonReporter } from '../../core/reporter/json.js';
import { JUnitReporter } from '../../core/reporter/junit.js';

export type ReporterKind = 'cli' | 'json' | 'junit';

export interface RunOptions {
  filter?: string;
  provider?: string;
  updateSnapshots?: boolean;
  record?: boolean; // --no-record sets this to false
  reporter?: ReporterKind;
  output?: string;
}

interface ReporterLike {
  events(): Parameters<typeof runSuites>[1] extends infer O
    ? O extends { events?: infer E }
      ? E
      : never
    : never;
  finalReport(summary: Awaited<ReturnType<typeof runSuites>>): Promise<void>;
}

export async function runCommand(paths: string[], options: RunOptions): Promise<number> {
  const cwd = process.cwd();

  // Project config drives both discovery (testDir) and runtime defaults
  // (snapshotThreshold, provider fallback). Load it first, and treat any load
  // failure as fatal — silently running with defaults in CI is worse than
  // failing loudly. If the file doesn't exist, loadProjectConfig returns null.
  let projectConfig;
  try {
    projectConfig = await loadProjectConfig(cwd);
  } catch (err) {
    console.error(chalk.red((err as Error).message));
    return 1;
  }
  const defaults = resolveDefaults(projectConfig);

  const files = await discoverTests(cwd, paths, { testDir: defaults.testDir });
  if (files.length === 0) {
    console.log(chalk.yellow('No *.test.yaml or *.test.ts files found.'));
    console.log(chalk.dim('Create one, or run `promptforge init` to scaffold an example.'));
    return 0;
  }

  let suites: PlannedSuite[];
  try {
    const discovered = await loadSuites(files);
    suites = discovered.map((s) => ({
      file: s.file,
      suite: mergeSuite(s.suite, projectConfig),
    }));
  } catch (err) {
    if (err instanceof TestSuiteParseError) {
      console.error(chalk.red(`Error in ${err.file}`));
      console.error(chalk.red(err.message));
    } else {
      console.error(chalk.red((err as Error).message));
    }
    return 1;
  }

  const filtered = applyFilters(suites, options);
  const totalPlannedTests = filtered.reduce((sum, s) => sum + s.suite.tests.length, 0);
  if (totalPlannedTests === 0) {
    console.log(chalk.yellow('No tests matched the given filters.'));
    return 0;
  }

  const reporter = selectReporter(options.reporter ?? 'cli', options, cwd);

  const summary = await runSuites(filtered, {
    updateSnapshots: options.updateSnapshots,
    projectRoot: cwd,
    record: options.record !== false,
    snapshotThreshold: defaults.snapshotThreshold,
    events: reporter.events() as Parameters<typeof runSuites>[1] extends infer O
      ? O extends { events?: infer E }
        ? E
        : never
      : never,
  });

  await reporter.finalReport(summary);

  return summary.failed === 0 ? 0 : 1;
}

function selectReporter(kind: ReporterKind, options: RunOptions, cwd: string): ReporterLike {
  switch (kind) {
    case 'cli':
      return new CliReporter({ cwd }) as unknown as ReporterLike;
    case 'json':
      return new JsonReporter() as unknown as ReporterLike;
    case 'junit':
      return new JUnitReporter(options.output, cwd) as unknown as ReporterLike;
    default:
      throw new Error(
        `Unknown reporter: ${kind}. Valid options: cli, json, junit`,
      );
  }
}

function applyFilters(suites: PlannedSuite[], options: RunOptions): PlannedSuite[] {
  const filterLower = options.filter?.toLowerCase();
  const providerLower = options.provider?.toLowerCase();

  return suites
    .map((entry) => {
      const tests = filterLower
        ? entry.suite.tests.filter((t) => t.name.toLowerCase().includes(filterLower))
        : entry.suite.tests;

      const providers = providerLower
        ? entry.suite.providers.filter((p) => p.toLowerCase().includes(providerLower))
        : entry.suite.providers;

      return {
        file: entry.file,
        suite: { ...entry.suite, tests, providers },
      };
    })
    .filter((entry) => entry.suite.tests.length > 0 && entry.suite.providers.length > 0);
}
