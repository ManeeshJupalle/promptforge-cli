import type { Database, ResultRow, RunRow, SnapshotRow, StoredAssertion } from './types.js';

// ---------- runs ----------

export interface InsertRunParams {
  id: string;
  startedAt: number;
  totalTests: number;
  gitCommit: string | null;
  configHash: string;
}

export function insertRun(db: Database, p: InsertRunParams): void {
  db.prepare(
    `INSERT INTO runs (id, started_at, total_tests, git_commit, config_hash)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(p.id, p.startedAt, p.totalTests, p.gitCommit, p.configHash);
}

export interface FinalizeRunParams {
  finishedAt: number;
  passed: number;
  failed: number;
  totalCost: number;
}

export function finalizeRun(db: Database, runId: string, p: FinalizeRunParams): void {
  db.prepare(
    `UPDATE runs SET finished_at = ?, passed = ?, failed = ?, total_cost = ? WHERE id = ?`,
  ).run(p.finishedAt, p.passed, p.failed, p.totalCost, runId);
}

export function getRun(db: Database, id: string): RunRow | null {
  const row = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(id);
  return (row as RunRow | undefined) ?? null;
}

export function listRuns(
  db: Database,
  opts: { limit?: number; offset?: number } = {},
): RunRow[] {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  return db
    .prepare(`SELECT * FROM runs ORDER BY started_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as RunRow[];
}

export function getLatestRunId(db: Database): string | null {
  const row = db
    .prepare(`SELECT id FROM runs WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT 1`)
    .get() as { id: string } | undefined;
  return row?.id ?? null;
}

export function getPreviousRunId(db: Database, currentRunId: string): string | null {
  const current = getRun(db, currentRunId);
  if (!current) return null;
  const row = db
    .prepare(
      `SELECT id FROM runs
       WHERE finished_at IS NOT NULL AND started_at < ?
       ORDER BY started_at DESC LIMIT 1`,
    )
    .get(current.started_at) as { id: string } | undefined;
  return row?.id ?? null;
}

// Resolves 'latest', 'previous', or a literal run ID to a run row.
export function resolveRunRef(db: Database, ref: string): RunRow | null {
  if (ref === 'latest') {
    const id = getLatestRunId(db);
    return id ? getRun(db, id) : null;
  }
  if (ref === 'previous') {
    const latestId = getLatestRunId(db);
    if (!latestId) return null;
    const prevId = getPreviousRunId(db, latestId);
    return prevId ? getRun(db, prevId) : null;
  }
  return getRun(db, ref);
}

// ---------- results ----------

export interface InsertResultParams {
  runId: string;
  testName: string;
  testFile: string;
  provider: string;
  passed: boolean;
  output: string;
  inputVars: Record<string, unknown>;
  promptTokens: number | null;
  completionTokens: number | null;
  cost: number;
  latencyMs: number;
  assertions: StoredAssertion[];
  error: string | null;
}

export function insertResult(db: Database, p: InsertResultParams): void {
  db.prepare(
    `INSERT INTO results
       (run_id, test_name, test_file, provider, passed, output, input_vars,
        prompt_tokens, completion_tokens, cost, latency_ms, assertions, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    p.runId,
    p.testName,
    p.testFile,
    p.provider,
    p.passed ? 1 : 0,
    p.output,
    JSON.stringify(p.inputVars),
    p.promptTokens,
    p.completionTokens,
    p.cost,
    p.latencyMs,
    JSON.stringify(p.assertions),
    p.error,
  );
}

export function getResultsForRun(db: Database, runId: string): ResultRow[] {
  return db
    .prepare(`SELECT * FROM results WHERE run_id = ? ORDER BY id ASC`)
    .all(runId) as ResultRow[];
}

// ---------- snapshots ----------

export function readSnapshotRow(
  db: Database,
  testFile: string,
  testName: string,
  provider: string,
): SnapshotRow | null {
  const row = db
    .prepare(
      `SELECT id, test_file, test_name, provider, output, embedding, created_at
       FROM snapshots WHERE test_file = ? AND test_name = ? AND provider = ?`,
    )
    .get(testFile, testName, provider);
  return (row as SnapshotRow | undefined) ?? null;
}

export function writeSnapshotRow(
  db: Database,
  row: {
    testFile: string;
    testName: string;
    provider: string;
    output: string;
    embedding: Buffer;
    createdAt: number;
  },
): void {
  db.prepare(
    `INSERT INTO snapshots (test_file, test_name, provider, output, embedding, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(test_file, test_name, provider) DO UPDATE SET
       output = excluded.output,
       embedding = excluded.embedding,
       created_at = excluded.created_at`,
  ).run(row.testFile, row.testName, row.provider, row.output, row.embedding, row.createdAt);
}

export function parseStoredAssertions(json: string | null): StoredAssertion[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as StoredAssertion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------- snapshot management (Day 6) ----------

export interface SnapshotMatch {
  id: number;
  test_file: string;
  test_name: string;
  provider: string;
}

// Case-insensitive substring match across file path, test name, and provider.
// The dashboard / CLI uses `listMatchingSnapshots` to preview what a --clear
// would remove before calling `deleteMatchingSnapshots`.
export function listMatchingSnapshots(db: Database, pattern: string): SnapshotMatch[] {
  const like = `%${pattern.toLowerCase()}%`;
  return db
    .prepare(
      `SELECT id, test_file, test_name, provider
       FROM snapshots
       WHERE LOWER(test_file) LIKE ?
          OR LOWER(test_name) LIKE ?
          OR LOWER(provider) LIKE ?
       ORDER BY test_file, test_name, provider`,
    )
    .all(like, like, like) as SnapshotMatch[];
}

export function deleteMatchingSnapshots(db: Database, pattern: string): number {
  const like = `%${pattern.toLowerCase()}%`;
  const result = db
    .prepare(
      `DELETE FROM snapshots
       WHERE LOWER(test_file) LIKE ?
          OR LOWER(test_name) LIKE ?
          OR LOWER(provider) LIKE ?`,
    )
    .run(like, like, like);
  return result.changes;
}

// ---------- dashboard aggregations (Day 5) ----------

export interface DistinctTest {
  test_file: string;
  test_name: string;
  providers: string;
}

// Distinct (file, name) tuples across all runs, with a comma-joined provider
// list. One row per logical test — the Test Explorer groups by file.
export function listDistinctTests(db: Database): DistinctTest[] {
  return db
    .prepare(
      `SELECT test_file, test_name, GROUP_CONCAT(DISTINCT provider) AS providers
       FROM results
       GROUP BY test_file, test_name
       ORDER BY test_file, test_name`,
    )
    .all() as DistinctTest[];
}

export interface TestHistoryPoint {
  run_id: string;
  started_at: number;
  passed: number;
  latency_ms: number | null;
  cost: number | null;
}

// Ordered oldest → newest so sparkline consumers can render left-to-right.
export function getTestHistory(
  db: Database,
  testFile: string,
  testName: string,
  provider: string,
  limit = 20,
): TestHistoryPoint[] {
  return db
    .prepare(
      `SELECT results.run_id, runs.started_at, results.passed, results.latency_ms, results.cost
       FROM results
       JOIN runs ON runs.id = results.run_id
       WHERE results.test_file = ? AND results.test_name = ? AND results.provider = ?
       ORDER BY runs.started_at DESC
       LIMIT ?`,
    )
    .all(testFile, testName, provider, limit)
    .reverse() as TestHistoryPoint[];
}

export interface DailyRunAggregate {
  day: string;             // 'YYYY-MM-DD'
  run_count: number;
  total_cost: number;
  passed: number;
  failed: number;
}

// SQLite doesn't have percentile functions — we aggregate cost/pass/fail here
// and compute latency quantiles server-side by fetching raw per-result
// latencies (see listDailyLatencies).
export function listDailyRunAggregates(db: Database): DailyRunAggregate[] {
  return db
    .prepare(
      `SELECT strftime('%Y-%m-%d', started_at / 1000, 'unixepoch') AS day,
              COUNT(*) AS run_count,
              COALESCE(SUM(total_cost), 0) AS total_cost,
              COALESCE(SUM(passed), 0) AS passed,
              COALESCE(SUM(failed), 0) AS failed
       FROM runs
       WHERE finished_at IS NOT NULL
       GROUP BY day
       ORDER BY day ASC`,
    )
    .all() as DailyRunAggregate[];
}

export interface LatencyPoint {
  day: string;
  latency_ms: number;
}

export function listDailyLatencies(db: Database): LatencyPoint[] {
  return db
    .prepare(
      `SELECT strftime('%Y-%m-%d', runs.started_at / 1000, 'unixepoch') AS day,
              results.latency_ms
       FROM results
       JOIN runs ON runs.id = results.run_id
       WHERE results.latency_ms IS NOT NULL`,
    )
    .all() as LatencyPoint[];
}

// Filters supported by listRunsFiltered: provider substring, status (pass/fail/any),
// date range (ISO dates, inclusive). Applied via parameterized query — no SQL
// injection risk.
export interface RunsFilter {
  limit?: number;
  offset?: number;
  provider?: string;
  status?: 'pass' | 'fail' | 'any';
  since?: number;  // epoch ms
  until?: number;  // epoch ms
}

export function listRunsFiltered(db: Database, f: RunsFilter = {}): RunRow[] {
  const limit = f.limit ?? 50;
  const offset = f.offset ?? 0;
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (f.provider) {
    // Match any run that has a result with a matching provider substring.
    clauses.push(
      `EXISTS (SELECT 1 FROM results r WHERE r.run_id = runs.id AND r.provider LIKE ?)`,
    );
    params.push(`%${f.provider}%`);
  }
  if (f.status === 'pass') {
    clauses.push(`failed = 0`);
  } else if (f.status === 'fail') {
    clauses.push(`failed > 0`);
  }
  if (typeof f.since === 'number') {
    clauses.push(`started_at >= ?`);
    params.push(f.since);
  }
  if (typeof f.until === 'number') {
    clauses.push(`started_at <= ?`);
    params.push(f.until);
  }

  const sql = `SELECT * FROM runs WHERE ${clauses.join(' AND ')} ORDER BY started_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return db.prepare(sql).all(...params) as RunRow[];
}
