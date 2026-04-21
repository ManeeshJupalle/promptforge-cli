// Wire protocol types — mirror server responses with snake_case preserved.
// Keeping names aligned with queries.ts means no ad-hoc mapping layer.

export interface RunRow {
  id: string;
  started_at: number;
  finished_at: number | null;
  total_tests: number | null;
  passed: number | null;
  failed: number | null;
  total_cost: number | null;
  git_commit: string | null;
  config_hash: string | null;
}

export interface StoredAssertion {
  type: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ResultDTO {
  id: number;
  run_id: string;
  test_name: string;
  test_file: string;
  provider: string;
  passed: number; // 0 | 1
  output: string;
  input_vars: unknown;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost: number | null;
  latency_ms: number | null;
  assertions: StoredAssertion[];
  error: string | null;
}

export interface RunDetail {
  run: RunRow;
  results: ResultDTO[];
}

export interface TestHistoryPoint {
  run_id: string;
  started_at: number;
  passed: number;
  latency_ms: number | null;
  cost: number | null;
}

export interface TestSummary {
  test_file: string;
  test_name: string;
  provider: string;
  history: TestHistoryPoint[];
}

export interface DailyRunAggregate {
  day: string;
  run_count: number;
  total_cost: number;
  passed: number;
  failed: number;
}

export interface LatencyDay {
  day: string;
  p50: number;
  p95: number;
  count: number;
}

export interface TrendsPayload {
  byDay: DailyRunAggregate[];
  latency: LatencyDay[];
}

export type StatusChange =
  | 'regression'
  | 'improvement'
  | 'same-pass'
  | 'same-fail'
  | 'added'
  | 'removed';

export interface TestComparison {
  key: string;
  testFile: string;
  testName: string;
  provider: string;
  a: ResultDTO | null;
  b: ResultDTO | null;
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
