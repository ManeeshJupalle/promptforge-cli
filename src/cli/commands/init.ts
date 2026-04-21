import path from 'node:path';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import chalk from 'chalk';

const PROVIDER_CHOICES = [
  { name: 'Mock (no API key required; useful for CI)', value: 'mock' },
  { name: 'Ollama (local, free)', value: 'ollama/llama3.2' },
  { name: 'Anthropic Claude', value: 'anthropic/claude-sonnet-4-6' },
  { name: 'OpenAI (GPT-4o mini)', value: 'openai/gpt-4o-mini' },
  { name: 'Google Gemini (Flash)', value: 'gemini/gemini-1.5-flash' },
];

export async function initCommand(): Promise<number> {
  const cwd = process.cwd();

  const prompts = await loadPrompts();
  if (!prompts) {
    console.error(
      chalk.red(
        'Could not load @inquirer/prompts — init requires an interactive terminal. Run from a TTY.',
      ),
    );
    return 1;
  }

  console.log();
  console.log(chalk.bold('🔥 PromptForge — project scaffolder'));
  console.log(chalk.dim('   writing into ' + cwd));
  console.log();

  const configPath = path.join(cwd, 'promptforge.config.ts');
  const configExists = (await stat(configPath).catch(() => null))?.isFile() ?? false;

  let configAction: 'skip' | 'overwrite' | 'backup' = 'overwrite';
  if (configExists) {
    configAction = (await prompts.select({
      message: 'promptforge.config.ts already exists — what should I do?',
      choices: [
        { name: 'Skip (keep existing)', value: 'skip' as const },
        { name: 'Overwrite', value: 'overwrite' as const },
        { name: 'Back up existing and create new', value: 'backup' as const },
      ],
    })) as 'skip' | 'overwrite' | 'backup';
  }

  const testDir = (await prompts.input({
    message: 'Test directory',
    default: 'prompts',
    validate: (v: string) =>
      v.trim().length === 0 ? 'required' : v.includes('..') ? 'no ".." segments' : true,
  })) as string;

  const providers = (await prompts.checkbox({
    message: 'Which providers should the generated config enable by default?',
    choices: PROVIDER_CHOICES,
    // @inquirer/prompts v7 checkbox does not support `default` — presets via
    // `checked: true` on the choice itself. Keep mock checked so the demo
    // test passes without any API keys.
    validate: (picks: readonly unknown[]) =>
      picks.length === 0 ? 'pick at least one provider' : true,
  })) as string[];

  const createExample = (await prompts.confirm({
    message: 'Create an example test that passes out of the box?',
    default: true,
  })) as boolean;

  const addGitignore = (await prompts.confirm({
    message: 'Add .promptforge/ to .gitignore?',
    default: true,
  })) as boolean;

  // -- apply ---------------------------------------------------------------

  const written: string[] = [];

  if (configAction === 'backup' && configExists) {
    const backupPath = `${configPath}.bak`;
    await rename(configPath, backupPath);
    console.log(chalk.dim(`  ↺ backed up existing config to ${path.basename(backupPath)}`));
  }
  if (configAction !== 'skip') {
    await writeFile(configPath, renderConfigFile({ testDir, providers }), 'utf8');
    written.push(path.relative(cwd, configPath));
  }

  const testDirAbs = path.join(cwd, testDir);
  await mkdir(testDirAbs, { recursive: true });

  if (createExample) {
    const exampleTestPath = path.join(testDirAbs, 'hello.test.yaml');
    const examplePromptPath = path.join(testDirAbs, 'hello.md');
    const exists = (await stat(exampleTestPath).catch(() => null))?.isFile() ?? false;
    if (!exists) {
      await writeFile(examplePromptPath, renderExamplePrompt(), 'utf8');
      await writeFile(exampleTestPath, renderExampleTest(), 'utf8');
      written.push(path.relative(cwd, examplePromptPath));
      written.push(path.relative(cwd, exampleTestPath));
    } else {
      console.log(chalk.dim(`  · ${path.relative(cwd, exampleTestPath)} already exists — skipped`));
    }
  }

  if (addGitignore) {
    const touched = await ensureGitignore(cwd);
    if (touched) written.push('.gitignore');
  }

  console.log();
  console.log(chalk.green.bold('✓ PromptForge initialized.'));
  if (written.length > 0) {
    console.log(chalk.dim('  wrote:'));
    for (const w of written) console.log(chalk.dim('    ' + w));
  }

  console.log();
  console.log(chalk.bold('Next steps'));
  console.log(`  1. ${chalk.cyan('promptforge run')}`);
  console.log(`  2. ${chalk.cyan('promptforge ui')}` + chalk.dim('   (web dashboard)'));
  if (providers.some((p) => p.startsWith('anthropic/'))) {
    console.log(chalk.dim(`     export ANTHROPIC_API_KEY=sk-ant-...`));
  }
  if (providers.some((p) => p.startsWith('openai/'))) {
    console.log(chalk.dim(`     export OPENAI_API_KEY=sk-...`));
  }
  if (providers.some((p) => p.startsWith('gemini/'))) {
    console.log(chalk.dim(`     export GOOGLE_API_KEY=...`));
  }
  if (providers.some((p) => p.startsWith('ollama/'))) {
    console.log(chalk.dim(`     ensure Ollama is running: \`ollama serve\` + \`ollama pull llama3.2\``));
  }
  console.log();

  return 0;
}

interface Prompts {
  input: (opts: { message: string; default?: string; validate?: (v: string) => true | string }) => Promise<string>;
  confirm: (opts: { message: string; default?: boolean }) => Promise<boolean>;
  checkbox: (opts: {
    message: string;
    choices: Array<{ name: string; value: string; checked?: boolean }>;
    validate?: (picks: readonly unknown[]) => true | string;
  }) => Promise<string[]>;
  select: <T>(opts: { message: string; choices: Array<{ name: string; value: T }> }) => Promise<T>;
}

async function loadPrompts(): Promise<Prompts | null> {
  try {
    const mod = (await import('@inquirer/prompts')) as unknown as Prompts;
    return mod;
  } catch {
    return null;
  }
}

interface ConfigArgs {
  testDir: string;
  providers: string[];
}

function renderConfigFile({ testDir, providers }: ConfigArgs): string {
  const providersLiteral = providers.map((p) => `    '${p}'`).join(',\n');
  return `import { defineConfig } from 'promptforge';

export default defineConfig({
  testDir: '${testDir}',
  providers: {
    defaultModels: [
${providersLiteral},
    ],
  },
  // snapshotThreshold: 0.9, // cosine similarity required for snapshot tests to pass
});
`;
}

function renderExamplePrompt(): string {
  return `You are a friendly greeting bot.

Greet the user named {{name}} warmly in one short sentence.
`;
}

function renderExampleTest(): string {
  return `prompt: ./hello.md

# This suite inherits providers from promptforge.config.ts. To pin a
# different provider for just this file, add a \`providers:\` block below.
# \`mockOutput\` below makes the test pass with zero API keys — delete it
# to run against whatever providers promptforge.config.ts selected.

tests:
  - name: greets by name
    vars:
      name: Alice
    mockOutput: "Hello, Alice! Welcome aboard."
    assert:
      - type: contains
        value: Hello
      - type: contains
        value: Alice
      - type: notContains
        value: error
`;
}

async function ensureGitignore(cwd: string): Promise<boolean> {
  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = await readFile(gitignorePath, 'utf8').catch(() => '');
  const lines = existing.split(/\r?\n/);
  const needs: string[] = [];
  for (const entry of ['.promptforge/', 'promptforge-results.xml']) {
    if (!lines.some((l) => l.trim() === entry)) needs.push(entry);
  }
  if (needs.length === 0) return false;
  const updated = existing.replace(/\s*$/, '\n') + needs.join('\n') + '\n';
  await writeFile(gitignorePath, updated, 'utf8');
  return true;
}
