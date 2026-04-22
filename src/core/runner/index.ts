import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { MergedTestSuite, TestCase } from '../config/schema.js';
import { HARDCODED_DEFAULTS } from '../config/merge.js';
import { PROJECT_CONFIG_FILENAME } from '../config/project.js';
import type { AssertionResult, CompletionResult, TestResult } from '../types/index.js';
import { runAssertions } from '../assertions/index.js';
import type { AssertionContext } from '../assertions/index.js';
import { createProvider } from '../providers/index.js';
import { getDb } from '../storage/db.js';
import {
  finalizeRun,
  getPreviousRunId,
  getResultsForRun,
  insertResult,
  insertRun,
} from '../storage/queries.js';
import { newRunId } from '../storage/ids.js';
import { computeConfigHash } from '../storage/hash.js';
import { detectGitCommit } from '../storage/git.js';
import { findRegressions, type TestComparison } from '../compare/index.js';

export interface PlannedSuite {
  file: string;
  suite: MergedTestSuite;
}

export interface RunnerEvents {
  onStart?: (planned: PlannedSuite[]) => void;
  onSuiteStart?: (suite: PlannedSuite) => void;
  onTestStart?: (evt: { file: string; test: TestCase; provider: string }) => void;
  onTestFinish?: (result: TestResult) => void;
  onFinish?: (summary: RunSummary) => void;
}

export interface RunnerOptions {
  updateSnapshots?: boolean;
  projectRoot?: string;
  // Day 6: gate DB writes. Watch mode uses record: false so transient runs
  // don't pollute the runs table and skew regression detection.
  record?: boolean;
  // Project-resolved default threshold for snapshot cosine similarity. The
  // runner threads this into every AssertionContext so `assertSnapshot` can
  // honor `snapshotThreshold` from promptforge.config.ts.
  snapshotThreshold?: number;
  events?: RunnerEvents;
}

export interface RunSummary {
  runId: string;
  results: TestResult[];
  passed: number;
  failed: number;
  total: number;
  totalCost: number;
  durationMs: number;
  providerNames: string[];
  regressions: TestComparison[];
  previousRunId: string | null;
  recorded: boolean;
}

export async function runSuites(
  suites: PlannedSuite[],
  options: RunnerOptions = {},
): Promise<RunSummary> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const updateSnapshots = options.updateSnapshots ?? false;
  const record = options.record ?? true;
  const snapshotThreshold = options.snapshotThreshold ?? HARDCODED_DEFAULTS.snapshotThreshold;
  const events = options.events ?? {};

  events.onStart?.(suites);

  const start = Date.now();
  const runId = newRunId();

  const totalTests = suites.reduce(
    (sum, s) => sum + s.suite.tests.length * s.suite.providers.length,
    0,
  );

  // When not recording, skip DB open entirely — watch mode shouldn't touch
  // the DB at all, even to compute a config hash.
  const db = record ? await getDb(projectRoot) : null;
  if (db) {
    const configHash = await computeConfigHash(
      collectHashInputs(suites, projectRoot),
      projectRoot,
    );
    const gitCommit = await detectGitCommit(projectRoot);
    insertRun(db, {
      id: runId,
      startedAt: start,
      totalTests,
      gitCommit,
      configHash,
    });
  }

  const results: TestResult[] = [];
  const providerNames = new Set<string>();

  for (const planned of suites) {
    const { file, suite } = planned;
    events.onSuiteStart?.(planned);

    // PlannedSuite is always post-merge, so providers is guaranteed non-empty.
    const providers = suite.providers;
    for (const providerName of providers) providerNames.add(providerName);

    let promptTemplate = '';
    let promptError: string | undefined;
    if (suite.prompt) {
      try {
        promptTemplate = await loadPromptFile(suite.prompt, file);
      } catch (err) {
        promptError = (err as Error).message;
      }
    }

    for (const test of suite.tests) {
      for (const providerName of providers) {
        events.onTestStart?.({ file, test, provider: providerName });
        let result: TestResult;
        if (promptError) {
          result = erroredResult(file, test, providerName, promptError);
        } else {
          result = await executeTest({
            file,
            promptTemplate,
            test,
            providerName,
            suiteProviders: providers,
            projectRoot,
            updateSnapshots,
            snapshotThreshold,
          });
        }
        results.push(result);
        events.onTestFinish?.(result);
        if (db) {
          insertResult(db, {
            runId,
            testName: result.name,
            testFile: result.file,
            provider: result.provider,
            passed: result.passed,
            output: result.output,
            inputVars: result.inputVars ?? {},
            promptTokens: result.promptTokens ?? null,
            completionTokens: result.completionTokens ?? null,
            cost: result.cost,
            latencyMs: result.latencyMs,
            assertions: result.assertions,
            error: result.error ?? null,
          });
        }
      }
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const finishedAt = Date.now();

  let previousRunId: string | null = null;
  let regressions: TestComparison[] = [];
  if (db) {
    finalizeRun(db, runId, { finishedAt, passed, failed, totalCost });
    previousRunId = getPreviousRunId(db, runId);
    regressions = previousRunId
      ? findRegressions(getResultsForRun(db, previousRunId), getResultsForRun(db, runId))
      : [];
  }

  const summary: RunSummary = {
    runId,
    results,
    passed,
    failed,
    total: results.length,
    totalCost,
    durationMs: finishedAt - start,
    providerNames: Array.from(providerNames).sort(),
    regressions,
    previousRunId,
    recorded: db !== null,
  };
  events.onFinish?.(summary);
  return summary;
}

// Every file whose contents can change a run's outcome: suite files, their
// referenced prompt files, and `promptforge.config.ts` if present. Missing
// prompt files are *still* included in the list — `computeConfigHash` folds
// them in as a deterministic sentinel so the hash changes when the file
// reappears or changes content.
function collectHashInputs(suites: PlannedSuite[], projectRoot: string): string[] {
  const files = new Set<string>();
  for (const { file, suite } of suites) {
    files.add(file);
    if (suite.prompt) {
      const abs = path.isAbsolute(suite.prompt)
        ? suite.prompt
        : path.resolve(path.dirname(file), suite.prompt);
      files.add(abs);
    }
  }
  const configAbs = path.join(projectRoot, PROJECT_CONFIG_FILENAME);
  if (existsSync(configAbs)) files.add(configAbs);
  return Array.from(files);
}

async function loadPromptFile(promptPath: string, suiteFile: string): Promise<string> {
  const abs = path.isAbsolute(promptPath)
    ? promptPath
    : path.resolve(path.dirname(suiteFile), promptPath);
  try {
    return await readFile(abs, 'utf8');
  } catch (err) {
    // Day 6 — more actionable error message. Points at the exact resolved
    // path and suggests the discovery command so users can cross-check.
    throw new Error(
      `prompt file not found at ${abs} — check the \`prompt:\` field in the test suite or run \`promptforge list\` to inspect discovery. (${(err as Error).message})`,
    );
  }
}

interface ExecuteParams {
  file: string;
  promptTemplate: string;
  test: TestCase;
  providerName: string;
  suiteProviders: string[];
  projectRoot: string;
  updateSnapshots: boolean;
  snapshotThreshold: number;
}

async function executeTest(params: ExecuteParams): Promise<TestResult> {
  const {
    file,
    promptTemplate,
    test,
    providerName,
    suiteProviders,
    projectRoot,
    updateSnapshots,
    snapshotThreshold,
  } = params;

  let completion: CompletionResult | undefined;
  let error: string | undefined;
  let assertions: AssertionResult[] = [];

  const started = Date.now();
  try {
    const provider = createProvider(providerName, { mockOutput: test.mockOutput ?? '' });
    completion = await provider.complete({
      prompt: promptTemplate,
      vars: test.vars,
    });

    const ctx: AssertionContext = {
      output: completion.output,
      completion,
      testFile: file,
      testName: test.name,
      providerName,
      suiteProviders,
      projectRoot,
      snapshotOptions: { update: updateSnapshots },
      snapshotThreshold,
    };
    assertions = await runAssertions(ctx, test.assert);
  } catch (err) {
    error = (err as Error).message;
  }

  const latencyMs = completion?.latencyMs ?? Date.now() - started;
  const cost = completion?.cost ?? 0;
  const output = completion?.output ?? '';
  const passed = error === undefined && assertions.every((a) => a.passed);

  return {
    name: test.name,
    file,
    provider: providerName,
    passed,
    output,
    assertions,
    latencyMs,
    cost,
    error,
    inputVars: test.vars,
    promptTokens: completion?.usage.promptTokens,
    completionTokens: completion?.usage.completionTokens,
  };
}

function erroredResult(
  file: string,
  test: TestCase,
  providerName: string,
  message: string,
): TestResult {
  return {
    name: test.name,
    file,
    provider: providerName,
    passed: false,
    output: '',
    assertions: [],
    latencyMs: 0,
    cost: 0,
    error: message,
    inputVars: test.vars,
  };
}
