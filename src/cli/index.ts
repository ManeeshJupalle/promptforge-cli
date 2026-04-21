import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from './commands/run.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';
import { snapshotCommand } from './commands/snapshot.js';
import { compareCommand } from './commands/compare.js';
import { uiCommand } from './commands/ui.js';
import { watchCommand } from './commands/watch.js';

const program = new Command();

program
  .name('promptforge')
  .description('Testing framework for LLM prompts')
  .version('0.1.0');

program
  .command('run [paths...]')
  .description('Discover and execute test files')
  .option('-f, --filter <pattern>', 'only run tests whose name contains <pattern>')
  .option('-p, --provider <name>', 'only run against providers matching <name>')
  .option('-r, --reporter <kind>', 'output format: cli | json | junit', 'cli')
  .option('-o, --output <path>', 'output file path (used by junit reporter)')
  .option('--no-record', "don't write this run to .promptforge/db.sqlite")
  .option('--update-snapshots', 'accept current outputs as golden snapshots during the run')
  .action(
    async (
      paths: string[],
      options: {
        filter?: string;
        provider?: string;
        reporter?: string;
        output?: string;
        record?: boolean;
        updateSnapshots?: boolean;
      },
    ) => {
      process.exitCode = await runCommand(paths ?? [], {
        filter: options.filter,
        provider: options.provider,
        reporter: (options.reporter ?? 'cli') as 'cli' | 'json' | 'junit',
        output: options.output,
        record: options.record,
        updateSnapshots: options.updateSnapshots,
      });
    },
  );

program
  .command('watch [paths...]')
  .description('Re-run tests on file change. Keys: a/f/p/↵/q.')
  .option('--record', 'record each watch iteration to .promptforge/db.sqlite (off by default)')
  .action(async (paths: string[], options: { record?: boolean }) => {
    process.exitCode = await watchCommand(paths ?? [], { record: options.record });
  });

program
  .command('list [paths...]')
  .description('List discovered test files and their cases')
  .action(async (paths: string[]) => {
    process.exitCode = await listCommand(paths ?? []);
  });

program
  .command('snapshot [paths...]')
  .description('Manage golden snapshots')
  .option('--update', 'accept current outputs as the new golden snapshots')
  .option('--clear <pattern>', 'delete snapshots whose name / file / provider contains <pattern>')
  .option('--force', 'required when --clear would delete more than 5 snapshots')
  .option('-f, --filter <pattern>', 'only touch tests whose name contains <pattern>')
  .option('-p, --provider <name>', 'only touch providers matching <name>')
  .action(
    async (
      paths: string[],
      options: {
        update?: boolean;
        clear?: string;
        force?: boolean;
        filter?: string;
        provider?: string;
      },
    ) => {
      process.exitCode = await snapshotCommand(paths ?? [], options);
    },
  );

program
  .command('compare <a> <b>')
  .description(
    'Diff two runs. <a> and <b> accept run IDs, "latest", or "previous" (e.g. `compare previous latest`).',
  )
  .action(async (a: string, b: string) => {
    process.exitCode = await compareCommand(a, b);
  });

program
  .command('ui')
  .description('Launch the web dashboard (reads .promptforge/db.sqlite in the current directory)')
  .option('-p, --port <port>', 'port to bind (default 3939)')
  .option('--no-open', 'do not launch a browser window (headless / Docker)')
  .action(async (options: { port?: string; open?: boolean }) => {
    process.exitCode = await uiCommand(options);
  });

program
  .command('init')
  .description('Scaffold a new PromptForge project in the current directory')
  .action(async () => {
    process.exitCode = await initCommand();
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red((err as Error).message ?? String(err)));
  process.exitCode = 1;
});
