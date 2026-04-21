import chalk from 'chalk';
import { runCommand } from './run.js';
import { getDb } from '../../core/storage/db.js';
import {
  deleteMatchingSnapshots,
  listMatchingSnapshots,
} from '../../core/storage/queries.js';

export interface SnapshotOptions {
  update?: boolean;
  clear?: string;
  force?: boolean;
  filter?: string;
  provider?: string;
}

const CLEAR_WITHOUT_FORCE_THRESHOLD = 5;

export async function snapshotCommand(paths: string[], options: SnapshotOptions): Promise<number> {
  if (options.clear !== undefined) {
    return clearSnapshots(options.clear, Boolean(options.force));
  }

  if (options.update) {
    return runCommand(paths, {
      filter: options.filter,
      provider: options.provider,
      updateSnapshots: true,
    });
  }

  printHelp();
  return 0;
}

async function clearSnapshots(pattern: string, force: boolean): Promise<number> {
  if (!pattern) {
    console.error(chalk.red('--clear requires a pattern (test name, file path, or provider substring).'));
    return 1;
  }

  const cwd = process.cwd();
  const db = await getDb(cwd);
  const matching = listMatchingSnapshots(db, pattern);

  if (matching.length === 0) {
    console.log(chalk.yellow(`No snapshots match "${pattern}".`));
    return 0;
  }

  if (matching.length > CLEAR_WITHOUT_FORCE_THRESHOLD && !force) {
    console.log(
      chalk.yellow(
        `${matching.length} snapshots would be deleted — re-run with --force to confirm:`,
      ),
    );
    for (const m of matching) {
      console.log(chalk.dim(`  ${m.test_file}`));
      console.log(`    ${m.test_name} ${chalk.dim(`(${m.provider})`)}`);
    }
    return 1;
  }

  const count = deleteMatchingSnapshots(db, pattern);
  console.log(chalk.green(`Deleted ${count} snapshot${count === 1 ? '' : 's'}.`));
  return 0;
}

function printHelp(): void {
  console.log(chalk.bold('promptforge snapshot'));
  console.log();
  console.log('  --update                 Re-run tests and accept outputs as the new golden snapshots.');
  console.log('  --clear <pattern>        Delete snapshots matching <pattern> (test name, file, or provider).');
  console.log('  --force                  Required when --clear would remove more than 5 snapshots.');
  console.log();
  console.log(chalk.dim('Snapshots are stored in .promptforge/db.sqlite (table `snapshots`).'));
}
