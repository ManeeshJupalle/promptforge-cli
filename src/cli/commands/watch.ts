import path from 'node:path';
import readline from 'node:readline';
import chalk from 'chalk';
import {
  discoverTests,
  loadSuites,
  TestSuiteParseError,
} from '../../core/config/loader.js';
import { loadProjectConfig, PROJECT_CONFIG_FILENAME } from '../../core/config/project.js';
import { mergeSuite, resolveDefaults } from '../../core/config/merge.js';
import { collectRelativeImports } from '../../core/config/imports.js';
import { runSuites, type PlannedSuite, type RunSummary } from '../../core/runner/index.js';
import { CliReporter } from '../../core/reporter/cli.js';

export interface WatchOptions {
  record?: boolean;
}

export async function watchCommand(paths: string[], options: WatchOptions): Promise<number> {
  const cwd = process.cwd();
  if (!process.stdout.isTTY) {
    console.error(chalk.red('promptforge watch requires an interactive terminal (TTY).'));
    return 1;
  }

  // Fatal on startup — can't continue if the initial config is malformed.
  // Subsequent reloads (below) fall back to the last-good config rather than
  // crashing the watcher mid-session.
  let initialProject;
  try {
    initialProject = await loadProjectConfig(cwd);
  } catch (err) {
    console.error(chalk.red((err as Error).message));
    return 1;
  }
  let lastGoodProject = initialProject;

  // chokidar is dynamic-imported so `promptforge run` never pays its fs-watcher
  // startup cost.
  interface ChokidarWatcher {
    on(event: 'change' | 'add' | 'unlink', cb: (path: string) => void): void;
    add(paths: string | string[]): void;
    close(): Promise<void>;
  }
  interface ChokidarModule {
    default: { watch(paths: string | string[], opts?: unknown): ChokidarWatcher };
  }
  const chokidarMod = (await import('chokidar')) as unknown as ChokidarModule;
  const chokidar = chokidarMod.default;

  let suites: PlannedSuite[] = [];
  let lastSummary: RunSummary | null = null;
  let lastMode: RunMode = { kind: 'all' };

  const reload = async (): Promise<{ files: string[]; suites: PlannedSuite[]; project: Awaited<ReturnType<typeof loadProjectConfig>> } | null> => {
    // On reload, a broken config is reported but we fall back to the last-good
    // config so the watcher doesn't die mid-session. Test-file parse errors
    // still surface and keep the watcher alive on the previous suites.
    let project = lastGoodProject;
    try {
      project = await loadProjectConfig(cwd);
      lastGoodProject = project;
    } catch (err) {
      console.error(chalk.red(`(config reload failed — using last-good) ${(err as Error).message}`));
    }
    const defaults = resolveDefaults(project);
    const files = await discoverTests(cwd, paths, { testDir: defaults.testDir });
    try {
      const discovered = await loadSuites(files);
      const merged = discovered.map((s) => ({ file: s.file, suite: mergeSuite(s.suite, project) }));
      return { files, suites: merged, project };
    } catch (err) {
      if (err instanceof TestSuiteParseError) {
        console.error(chalk.red(`Error in ${err.file}`));
        console.error(chalk.red(err.message));
      } else {
        console.error(chalk.red((err as Error).message));
      }
      return null;
    }
  };

  const runOnce = async (toRun: PlannedSuite[], label: string): Promise<void> => {
    clearScreen();
    printWatchHeader(label);
    if (toRun.length === 0) {
      console.log(chalk.yellow('  (nothing to run)'));
      printKeyHelp();
      return;
    }
    const reporter = new CliReporter({ cwd });
    const defaults = resolveDefaults(lastGoodProject);
    const summary = await runSuites(toRun, {
      projectRoot: cwd,
      record: options.record === true,
      snapshotThreshold: defaults.snapshotThreshold,
      events: reporter.events(),
    });
    await reporter.finalReport(summary);
    lastSummary = summary;
    printKeyHelp();
  };

  const initial = await reload();
  if (!initial) return 1;
  suites = initial.suites;

  await runOnce(suites, 'Initial run');
  lastMode = { kind: 'all' };

  // Track every file we care about: test files + referenced prompt files +
  // promptforge.config.ts + the transitive TS import graph of each. Resolved
  // to absolute paths so chokidar normalizes consistently across platforms.
  //
  // Why the import graph: users write helpers (`import { fixtures } from
  // './helpers.js'`). chokidar only notifies us about files it's subscribed
  // to, so without walking the graph we'd silently ignore edits to those
  // helpers. We still can't *hot-swap* the helper's content in-process (Node
  // ESM caches modules by URL), but at least we detect the edit and warn
  // the user about the stale-content limitation.
  const buildWatchList = async (
    files: string[],
    ss: PlannedSuite[],
  ): Promise<{
    all: string[];
    helperSet: Set<string>;
    // helper absolute path → set of suite file paths that transitively import it.
    // Used by the onChange handler to figure out which suites need a re-run
    // after a helper-only edit. Without this map, helper changes would land
    // in `affected=[]` and the runner would print "(nothing to run)".
    helperOwners: Map<string, Set<string>>;
  }> => {
    const out = new Set<string>(files);
    const helpers = new Set<string>();
    const helperOwners = new Map<string, Set<string>>();
    const addOwner = (helper: string, owner: string) => {
      let set = helperOwners.get(helper);
      if (!set) {
        set = new Set<string>();
        helperOwners.set(helper, set);
      }
      set.add(owner);
    };
    for (const { file, suite } of ss) {
      if (suite.prompt) {
        const abs = path.isAbsolute(suite.prompt)
          ? suite.prompt
          : path.resolve(path.dirname(file), suite.prompt);
        out.add(abs);
      }
      if (/\.test\.ts$/i.test(file)) {
        for (const imp of await collectRelativeImports(file)) {
          if (imp !== file) {
            out.add(imp);
            helpers.add(imp);
            addOwner(imp, file);
          }
        }
      }
    }
    const configAbs = path.join(cwd, PROJECT_CONFIG_FILENAME);
    out.add(configAbs);
    // Config imports go in the helper set too — same staleness limitation.
    for (const imp of await collectRelativeImports(configAbs)) {
      if (imp !== configAbs) {
        out.add(imp);
        helpers.add(imp);
        // Config helpers are owned by the config itself — a change there
        // means a full re-run, handled separately via the configChanged path.
      }
    }
    return { all: Array.from(out), helperSet: helpers, helperOwners };
  };

  let watchBundle = await buildWatchList(initial.files, initial.suites);
  let watchList = watchBundle.all;
  let helperFiles = watchBundle.helperSet;
  let helperOwners = watchBundle.helperOwners;
  const watcher = chokidar.watch(watchList, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  });

  let pending = new Set<string>();
  let debounceTimer: NodeJS.Timeout | null = null;

  const onChange = (changedPath: string) => {
    pending.add(path.resolve(changedPath));
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const changes = new Set(pending);
      pending.clear();

      // If any change affected the config or a prompt file, we do a full
      // reload + full run. Otherwise we re-load and run only affected suites.
      const configPath = path.resolve(path.join(cwd, PROJECT_CONFIG_FILENAME));
      const configChanged = changes.has(configPath);

      // Detect edits to transitive TS helper files *before* we reload. Node's
      // ESM loader caches resolved-URL → module, so the cache-bust `?t=` we
      // append to top-level suite/config imports doesn't propagate to the
      // helpers they import. That means a fresh call to loadTsSuite()
      // still sees the *old* helper content in this process. The honest
      // behavior is to warn the user and run on stale content, then tell
      // them how to get a fresh cache (restart the watcher).
      const helperChanges = Array.from(changes).filter((p) => helperFiles.has(p));

      const next = await reload();
      if (!next) return;
      suites = next.suites;
      watchBundle = await buildWatchList(next.files, next.suites);
      watchList = watchBundle.all;
      helperFiles = watchBundle.helperSet;
      helperOwners = watchBundle.helperOwners;
      void watcher.add(watchList); // idempotent

      const affected = configChanged
        ? suites
        : resolveAffectedSuites(changes, suites, helperOwners);

      const label = configChanged
        ? 'Config changed — full re-run'
        : `Affected: ${affected.length} suite${affected.length === 1 ? '' : 's'}`;
      await runOnce(affected, label);

      if (helperChanges.length > 0) {
        console.log();
        console.log(
          chalk.yellow.bold('⚠ imported helper file(s) changed — this run used the cached previous content.'),
        );
        for (const h of helperChanges) {
          console.log(chalk.yellow(`  · ${path.relative(cwd, h)}`));
        }
        console.log(
          chalk.dim('  Quit with `q` and re-run `promptforge watch` to pick up the new content (Node caches ESM modules by URL; transitive imports can\'t be hot-swapped in-process).'),
        );
      }

      lastMode = configChanged ? { kind: 'all' } : { kind: 'affected', files: new Set(affected.map((a) => a.file)) };
    }, 200);
  };

  watcher.on('change', onChange);
  watcher.on('add', onChange);
  watcher.on('unlink', onChange);

  // Raw-mode keyboard handling — restored in every exit path.
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  const shutdown = async () => {
    try {
      if (debounceTimer) clearTimeout(debounceTimer);
      await watcher.close();
    } catch {
      // swallow — we're exiting
    }
    if (process.stdin.isTTY) {
      try { process.stdin.setRawMode(false); } catch { /* ignore */ }
    }
    process.stdin.pause();
    process.off('SIGINT', sigintHandler);
    process.off('SIGTERM', sigintHandler);
  };

  const sigintHandler = () => {
    console.log(chalk.dim('\nbye.'));
    exit();
  };

  let exitResolve!: () => void;
  const exitPromise = new Promise<void>((resolve) => {
    exitResolve = resolve;
  });

  const exit = () => {
    void shutdown().then(() => exitResolve());
  };

  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigintHandler);

  process.stdin.on('keypress', async (_str, key) => {
    if (!key) return;
    if (key.ctrl && key.name === 'c') return exit();
    if (key.name === 'q') return exit();
    if (key.name === 'a') {
      const next = await reload();
      if (next) suites = next.suites;
      await runOnce(suites, 'All tests');
      lastMode = { kind: 'all' };
      return;
    }
    if (key.name === 'f') {
      if (!lastSummary || lastSummary.failed === 0) {
        console.log(chalk.dim('  nothing failed in the last run'));
        return;
      }
      const failedSet = new Set(
        lastSummary.results.filter((r) => !r.passed).map((r) => r.file + '\t' + r.name),
      );
      const filtered = suites
        .map((s) => ({
          file: s.file,
          suite: {
            ...s.suite,
            tests: s.suite.tests.filter((t) => failedSet.has(s.file + '\t' + t.name)),
          },
        }))
        .filter((s) => s.suite.tests.length > 0);
      await runOnce(filtered, 'Failed tests only');
      lastMode = { kind: 'failed' };
      return;
    }
    if (key.name === 'return') {
      // Re-run whatever ran last.
      if (lastMode.kind === 'all') await runOnce(suites, 'Re-run (all)');
      else if (lastMode.kind === 'failed' && lastSummary) {
        process.stdin.emit('keypress', 'f', { name: 'f' });
      } else if (lastMode.kind === 'affected') {
        const affectedSuites = suites.filter((s) => lastMode.kind === 'affected' && lastMode.files.has(s.file));
        await runOnce(affectedSuites, 'Re-run (affected)');
      } else if (lastMode.kind === 'pattern') {
        const needle = lastMode.pattern.toLowerCase();
        const filtered = suites
          .map((s) => ({
            file: s.file,
            suite: {
              ...s.suite,
              tests: s.suite.tests.filter((t) => t.name.toLowerCase().includes(needle)),
            },
          }))
          .filter((s) => s.suite.tests.length > 0);
        await runOnce(filtered, `Re-run (pattern: ${lastMode.pattern})`);
      }
      return;
    }
    if (key.name === 'p') {
      // Pattern prompt — switch stdin out of raw mode briefly so the
      // readline question can read a line. Restore after.
      process.stdout.write(chalk.cyan('\n  pattern> '));
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      const pattern = await readLineOnce();
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      const filtered = suites
        .map((s) => ({
          file: s.file,
          suite: {
            ...s.suite,
            tests: s.suite.tests.filter((t) => t.name.toLowerCase().includes(pattern.toLowerCase())),
          },
        }))
        .filter((s) => s.suite.tests.length > 0);
      await runOnce(filtered, `Pattern: ${pattern}`);
      // Record the filter so that `↵` can honor its documented "re-run
      // whatever ran last" contract. Without this the next `↵` would fall
      // back to the previous mode (all / affected / failed) and the pattern
      // would be silently dropped.
      lastMode = { kind: 'pattern', pattern };
      return;
    }
  });

  await exitPromise;
  return 0;
}

type RunMode =
  | { kind: 'all' }
  | { kind: 'failed' }
  | { kind: 'affected'; files: Set<string> }
  | { kind: 'pattern'; pattern: string };

function resolveAffectedSuites(
  changes: Set<string>,
  suites: PlannedSuite[],
  helperOwners: Map<string, Set<string>>,
): PlannedSuite[] {
  // Expand the change set to include every suite that transitively owns a
  // changed helper. Otherwise a `helper.ts` edit would never reach the
  // direct-file or prompt-file matchers below, `affected` would be empty,
  // and the watcher would print "(nothing to run)" — defeating the whole
  // point of registering helpers with chokidar.
  const owningSuites = new Set<string>();
  for (const changed of changes) {
    const owners = helperOwners.get(changed);
    if (owners) for (const o of owners) owningSuites.add(o);
  }

  const affected: PlannedSuite[] = [];
  for (const s of suites) {
    const suiteAbs = path.resolve(s.file);
    if (changes.has(suiteAbs) || owningSuites.has(suiteAbs) || owningSuites.has(s.file)) {
      affected.push(s);
      continue;
    }
    if (s.suite.prompt) {
      const abs = path.isAbsolute(s.suite.prompt)
        ? s.suite.prompt
        : path.resolve(path.dirname(s.file), s.suite.prompt);
      if (changes.has(abs)) affected.push(s);
    }
  }
  return affected;
}

function clearScreen(): void {
  // CSI 2J = clear, CSI H = cursor home.
  process.stdout.write('[2J[H');
}

function printWatchHeader(label: string): void {
  console.log(chalk.bold(`🧪 PromptForge watch`) + chalk.dim(`  ·  ${label}`));
  console.log();
}

function printKeyHelp(): void {
  console.log();
  console.log(
    chalk.dim(
      '  [a] all  ·  [f] only failed  ·  [p] pattern  ·  [↵] re-run  ·  [q] quit',
    ),
  );
}

// Reads a single line from stdin (non-raw mode). Used by the `p` pattern prompt.
function readLineOnce(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.once('line', (line) => {
      rl.close();
      resolve(line);
    });
  });
}
