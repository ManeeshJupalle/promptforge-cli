import path from 'node:path';
import { stat } from 'node:fs/promises';
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

  let missingPrompts = 0;
  for (const { file, suite } of suites) {
    const rel = path.relative(cwd, file) || file;
    const merged = mergeSuite(suite, projectConfig);
    console.log(chalk.bold(rel));

    if (merged.prompt) {
      const abs = path.isAbsolute(merged.prompt)
        ? merged.prompt
        : path.resolve(path.dirname(file), merged.prompt);
      const exists = await stat(abs)
        .then((s) => s.isFile())
        .catch(() => false);
      if (exists) {
        console.log(chalk.dim(`  prompt:    ${merged.prompt}`));
      } else {
        console.log(chalk.red(`  prompt:    ${merged.prompt}  ✗ missing (${abs})`));
        missingPrompts++;
      }
    }

    console.log(chalk.dim(`  providers: ${merged.providers.join(', ')}`));
    for (const t of merged.tests) {
      console.log(`  ${chalk.dim('·')} ${t.name} ${chalk.dim(`[${t.assert.length} assertion${t.assert.length === 1 ? '' : 's'}]`)}`);
    }
    console.log();
  }

  if (missingPrompts > 0) {
    console.log(
      chalk.yellow(
        `⚠ ${missingPrompts} suite${missingPrompts === 1 ? '' : 's'} reference a prompt file that doesn't exist — \`promptforge run\` will fail on those.`,
      ),
    );
    return 1;
  }

  return 0;
}
