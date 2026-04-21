import { createTwoFilesPatch } from 'diff';
import {
  getResultsForRun,
  resolveRunRef,
} from '../storage/queries.js';
import type { Database, ResultRow, RunRow } from '../storage/types.js';

export type StatusChange =
  | 'regression'   // passed in A, failed in B
  | 'improvement'  // failed in A, passed in B
  | 'same-pass'    // passed in both
  | 'same-fail'    // failed in both
  | 'added'        // only in B
  | 'removed';     // only in A

export interface TestComparison {
  key: string;
  testFile: string;
  testName: string;
  provider: string;
  a: ResultRow | null;
  b: ResultRow | null;
  statusChange: StatusChange;
  outputDiff: string | null;
  costDelta: number | null;
  latencyDelta: number | null;
}

export interface RunComparison {
  runA: RunRow;
  runB: RunRow;
  tests: TestComparison[];
}

// Thrown so the CLI can produce a clean error rather than a stack trace.
export class RunNotFoundError extends Error {
  constructor(public readonly ref: string) {
    super(`run not found: ${ref}`);
    this.name = 'RunNotFoundError';
  }
}

export function compareRuns(db: Database, aRef: string, bRef: string): RunComparison {
  const runA = resolveRunRef(db, aRef);
  if (!runA) throw new RunNotFoundError(aRef);
  const runB = resolveRunRef(db, bRef);
  if (!runB) throw new RunNotFoundError(bRef);

  const resultsA = getResultsForRun(db, runA.id);
  const resultsB = getResultsForRun(db, runB.id);

  const indexA = indexByKey(resultsA);
  const indexB = indexByKey(resultsB);

  const keys = new Set<string>([...indexA.keys(), ...indexB.keys()]);
  const tests: TestComparison[] = [];

  for (const key of keys) {
    const a = indexA.get(key) ?? null;
    const b = indexB.get(key) ?? null;
    tests.push(buildComparison(key, a, b));
  }

  // Stable ordering: regressions first (most actionable), then improvements,
  // then unchanged, then structural changes. Within each bucket, sort by
  // test file + name for readability.
  const statusOrder: Record<StatusChange, number> = {
    regression: 0,
    improvement: 1,
    'same-fail': 2,
    'same-pass': 3,
    added: 4,
    removed: 5,
  };
  tests.sort((a, b) => {
    const so = statusOrder[a.statusChange] - statusOrder[b.statusChange];
    if (so !== 0) return so;
    return a.key.localeCompare(b.key);
  });

  return { runA, runB, tests };
}

export function findRegressions(prev: ResultRow[], curr: ResultRow[]): TestComparison[] {
  const idxPrev = indexByKey(prev);
  const idxCurr = indexByKey(curr);
  const out: TestComparison[] = [];
  for (const [key, prevRow] of idxPrev) {
    const currRow = idxCurr.get(key);
    if (!currRow) continue;
    if (prevRow.passed === 1 && currRow.passed === 0) {
      out.push(buildComparison(key, prevRow, currRow));
    }
  }
  return out;
}

function buildComparison(
  key: string,
  a: ResultRow | null,
  b: ResultRow | null,
): TestComparison {
  const [testFile, testName, provider] = splitKey(key);
  const statusChange = classifyStatus(a, b);
  const outputDiff =
    a && b && a.output !== b.output
      ? createTwoFilesPatch(
          `runA:${testFile}:${testName}:${provider}`,
          `runB:${testFile}:${testName}:${provider}`,
          a.output,
          b.output,
          '',
          '',
          { context: 2 },
        )
      : null;
  return {
    key,
    testFile,
    testName,
    provider,
    a,
    b,
    statusChange,
    outputDiff,
    costDelta: a && b ? (b.cost ?? 0) - (a.cost ?? 0) : null,
    latencyDelta: a && b ? (b.latency_ms ?? 0) - (a.latency_ms ?? 0) : null,
  };
}

function classifyStatus(a: ResultRow | null, b: ResultRow | null): StatusChange {
  if (!a && b) return 'added';
  if (a && !b) return 'removed';
  if (!a || !b) return 'same-fail';
  if (a.passed === 1 && b.passed === 0) return 'regression';
  if (a.passed === 0 && b.passed === 1) return 'improvement';
  return a.passed === 1 ? 'same-pass' : 'same-fail';
}

function indexByKey(rows: ResultRow[]): Map<string, ResultRow> {
  const map = new Map<string, ResultRow>();
  for (const r of rows) {
    map.set(makeKey(r.test_file, r.test_name, r.provider), r);
  }
  return map;
}

function makeKey(testFile: string, testName: string, provider: string): string {
  return `${testFile}\t${testName}\t${provider}`;
}

function splitKey(key: string): [string, string, string] {
  const parts = key.split('\t');
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}
