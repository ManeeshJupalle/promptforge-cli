import path from 'node:path';
import chalk from 'chalk';
import { discoverTests, loadSuites, TestSuiteParseError } from '../../core/config/loader.js';
import { loadProjectConfig } from '../../core/config/project.js';
import { mergeSuite, resolveDefaults } from '../../core/config/merge.js';

export async function listCommand(paths: string[]): Promise<number> {
  const cwd = process.cwd();

  // Load project config so the reported providers reflect what `run` will
  // actually execute — not just whatever's pinned in the YAML.
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
    console.log(chalk.yellow('No *.test.yaml files found.'));
    return 0;
  }

  let suites;
  try {
    suites = await loadSuites(files);
  } catch (err) {
    if (err instanceof TestSuiteParseError) {
      console.error(chalk.red(`Error in ${err.file}`));
      console.error(chalk.red(err.message));
    } else {
      console.error(chalk.red((err as Error).message));
    }
    return 1;
  }

  for (const { file, suite } of suites) {
    const rel = path.relative(cwd, file) || file;
    const merged = mergeSuite(suite, projectConfig);
    console.log(chalk.bold(rel));
    console.log(chalk.dim(`  providers: ${merged.providers.join(', ')}`));
    for (const t of merged.tests) {
      console.log(`  ${chalk.dim('·')} ${t.name} ${chalk.dim(`[${t.assert.length} assertion${t.assert.length === 1 ? '' : 's'}]`)}`);
    }
    console.log();
  }

  return 0;
}
